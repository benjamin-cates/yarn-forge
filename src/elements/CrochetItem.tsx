import React, { useMemo } from "react";
import * as THREE from "three";
import { type RowPiece } from "../parse";
import { type SimStitch, build_smoothing_neighbors, taubin_smoothing, apply_dist_constraints, apply_ortho_constraints, type PhysConfig } from "../simulation/phys";
import { apply_inflation_modifier, apply_repulsion, apply_stochastic_repulsion, apply_local_inflation } from "../simulation/inflation";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { calculateStitchTensions, DensityGridVisualizer, getHeatmapColor } from "../simulation/experimental";

// --- Analytical Geometry Placement for Crochet Stitches ---
// This version computes stitch positions directly using parametric geometry (no physics/springs)

const STITCH_LENGTHS: { [key: string]: number } = {
    sc: 1,
    dc: 2,
    hdc: 1.5,
    htc: 2.5,
    tc: 3,
    ch: 0.8,
    sk: 0,
    join: 0,
};

const discrete_rounds_crochet = (rounds: RowPiece[][], options: { autoJoin: boolean, autoTurn: boolean }): [SimStitch[], number[], boolean[]] => {
    let stitches: SimStitch[] = [];

    if (rounds.length === 0) return [[], [], []];

    let row = Array.from({ length: 1000 }).fill(-1) as number[];
    let row_indices = [];
    let markings: { [key: string]: number } = {};
    let is_reversed: boolean[] = [];

    let current_reversed = false;

    for (let round of rounds) {
        if (round.length === 0) continue;
        row_indices.push(stitches.length);
        is_reversed.push(current_reversed);

        let next_row = [];
        for (let piece of round) {
            next_row.push(...add_crochet(piece, stitches, row, markings));
        }

        const containsTurn = round.some(p => p.name === "turn");
        if (options.autoTurn || containsTurn) {
            row = next_row.slice().reverse();
            console.log(row);
            current_reversed = !current_reversed;
        } else {
            row = next_row;
        }

        // Add join: connect last stitch to first stitch in this row (standard crochet behavior)
        if (options.autoJoin && next_row.length > 1) {
            let firstStitch = stitches[next_row[0]];
            // Only set prev if it doesn't already have a more specific one (like from a join stitch)
            firstStitch.prev = { id: next_row[next_row.length - 1], dist: 1 };
        }
        else {
            stitches[next_row[0]].prev = undefined;
        }
    }
    return [stitches, row_indices, is_reversed];
};

const resolve_in_name = (in_name: string, prev_row: number[], markings: { [key: string]: number }): number | undefined => {
    if (in_name === "next") return prev_row.shift();
    if (in_name === "same st" || in_name === "same") return prev_row.shift();
    if (markings[in_name] !== undefined) return markings[in_name];
    if (in_name.includes("+")) {
        const [name, offset] = in_name.split("+");
        if (markings[name.trim()] !== undefined) {
            return markings[name.trim()] + parseInt(offset);
        }
    }
    // Default to next if unknown
    let below = prev_row.shift();
    if (below == -1) return undefined;
    return below
};

const add_crochet = (piece: RowPiece, stitches: SimStitch[], prev_row: number[], markings: { [key: string]: number }): number[] => {
    let next_row: number[] = [];

    const handleMarking = (stitchId: number) => {
        if (piece.marking) {
            if (markings[piece.marking] !== undefined) {
                stitches[markings[piece.marking]].marking = undefined;
            }
            markings[piece.marking] = stitchId;
            stitches[stitchId].marking = piece.marking;
        }
    };

    if (piece.name === "ch") {
        for (let i = 0; i < piece.count; i++) {
            stitches.push({
                id: stitches.length,
                name: "ch",
                below: [],
                prev: { id: stitches.length - 1, dist: 0.8 },
            });
            next_row.push(stitches.length - 1);
        }
        if (next_row.length > 0) handleMarking(next_row[next_row.length - 1]);
        return next_row;
    }

    if (piece.name === "sk") {
        for (let i = 0; i < piece.count; i++) {
            prev_row.shift();
        }
        return next_row;
    }

    if (piece.name === "join" || piece.name === "turn") {
        let target = piece.in_name ? resolve_in_name(piece.in_name, prev_row, markings) : undefined;
        if (target !== undefined) {
            // Join is a special connection, it doesn't create a new stitch in the physical sense 
            // but connects the current work-in-progress to a previous point.
            // We can represent this by updating the 'prev' of the NEXT stitch or the LAST stitch.
            if (stitches.length > 0) {
                stitches[stitches.length - 1].prev = { id: target, dist: 0.1 };
            }
        }
        return next_row;
    }

    if (piece.pieces) {
        if (piece.together) {
            // Decrease: one stitch, multiple below
            let stitch = { name: '', id: stitches.length, below: [] } as SimStitch;
            stitch.name = piece.name || (piece.pieces[0]?.name ?? 'sc');
            stitch.prev = { id: stitches.length - 1, dist: 1 };
            for (let i = 0; i < piece.count; i++) {
                for (let j = 0; j < piece.pieces.length; j++) {
                    const belowId = prev_row.shift();
                    if (belowId == undefined) break;
                    stitch.below.push({ id: belowId, dist: STITCH_LENGTHS[stitch.name] + 0.2 });
                }
            }
            stitches.push(stitch);
            next_row.push(stitches.length - 1);
        } else if (piece.in_name) {
            let below = resolve_in_name(piece.in_name, prev_row, markings);
            if (below == undefined) return next_row;
            for (let i = 0; i < piece.count; i++) {
                for (let j = 0; j < piece.pieces.length; j++) {
                    let sub = piece.pieces[j];
                    stitches.push({
                        id: stitches.length,
                        name: sub.name || 'sc',
                        below: [{ id: below, dist: STITCH_LENGTHS[sub.name || 'sc'] }],
                        prev: { id: stitches.length - 1, dist: 1 },
                    });
                    next_row.push(stitches.length - 1);
                }
            }
        } else {
            for (let i = 0; i < piece.count; i++) {
                for (let j = 0; j < piece.pieces.length; j++) {
                    next_row.push(...add_crochet(piece.pieces[j], stitches, prev_row, markings));
                }
            }
        }
    } else if (piece.name) {
        if (piece.together) {
            // Decrease: one stitch, multiple below
            let stitch = { name: piece.name, id: stitches.length, below: [] } as SimStitch;
            stitch.prev = { id: stitches.length - 1, dist: 1 };
            for (let i = 0; i < piece.count; i++) {
                const belowId = prev_row.shift();
                if (belowId == undefined) break;
                stitch.below.push({ id: belowId, dist: STITCH_LENGTHS[piece.name] + 0.2 });
            }
            stitches.push(stitch);
            next_row.push(stitches.length - 1);
            handleMarking(stitches.length - 1);
        } else if (piece.in_name) {
            let below = resolve_in_name(piece.in_name, prev_row, markings);
            if (below == undefined) return next_row;
            for (let i = 0; i < piece.count; i++) {
                stitches.push({
                    id: stitches.length,
                    name: piece.name,
                    below: [{ id: below, dist: STITCH_LENGTHS[piece.name] }],
                    prev: { id: stitches.length - 1, dist: 1 },
                });
                next_row.push(stitches.length - 1);
                handleMarking(stitches.length - 1);
            }
        } else {
            for (let i = 0; i < piece.count; i++) {
                const belowId = prev_row.shift();
                stitches.push({
                    id: stitches.length,
                    name: piece.name,
                    below: (belowId != undefined && belowId != -1) ? [{ id: belowId, dist: STITCH_LENGTHS[piece.name] }] : [],
                    prev: { id: stitches.length - 1, dist: 1 },
                });
                next_row.push(stitches.length - 1);
                handleMarking(stitches.length - 1);
            }
        }
    }
    return next_row;
};
export function mulberry32(seed: number) {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
// --- Analytical Placement Function ---
function placeStitchesAnalytically(stitches: SimStitch[], row_ids: number[], is_reversed: boolean[], autoJoin: boolean) {
    let random = mulberry32(0);
    let z = 0;
    for (let i = 0; i < row_ids.length; i++) {
        let start = row_ids[i];
        let end = row_ids[i + 1] || stitches.length;
        let count = end - start;
        if (count === 0) continue;

        let prevCount = i === 0 ? count : row_ids[i] - row_ids[i - 1];
        let nextZ = z;

        if (autoJoin) {
            if (i > 0) {
                let dz = Math.abs(count - prevCount) / 6;
                nextZ = z + Math.max(0, Math.min(1, 1 - dz)) + 0.1;
            }
            // Circular placement
            let radius = count / (2 * Math.PI);
            for (let j = start; j < end; j++) {
                let ang = (2 * Math.PI * (j - start)) / count;
                stitches[j].position = new THREE.Vector3(
                    radius * Math.sin(ang) + 0.1 * random(),
                    nextZ + 0.1 * random(),
                    radius * Math.cos(ang) + 0.1 * random(),
                );
            }
        } else {
            if (i > 0) {
                nextZ = z + 1;
            }
            // Flat placement
            // If the row is reversed, we should place it from right to left (or vice versa)
            // to maintain continuity with the previous row's end.
            let reversed = is_reversed[i];
            console.log("row " + i + " " + reversed, start, end);
            for (let j = start; j < end; j++) {
                let step = (j - start);
                let x = reversed ? (count - 1 - step) : step;
                stitches[j].position = new THREE.Vector3(
                    x + 0.1 * random(),
                    nextZ + 0.1 * random(),
                    0.1 * random(),
                );
            }
        }
        z = nextZ;
    }
}

// --- Constraint-Based Relaxation (Position-Based Dynamics) ---
function relaxStitchPositions(
    stitches: SimStitch[],
    phys: PhysConfig,
) {
    const {
        iterations,
        spring_constant,
        ortho_constant,
        repulsionStrength,
        repulsionRadius,
        repulsionMode,
        lambda
    } = phys;

    const smoothingNeighbors = build_smoothing_neighbors(stitches);
    const newPositions: THREE.Vector3[] = stitches.map((s) => s.position!.clone());
    const scratchAfterLambda: THREE.Vector3[] = stitches.map(() => new THREE.Vector3());
    let grid: any = null;

    // For each iteration, adjust positions to satisfy constraints (rest lengths)
    for (let iter = 0; iter < iterations; iter++) {
        // Copy positions to avoid bias (reusing buffers)
        for (let i = 0; i < stitches.length; i++) {
            newPositions[i].copy(stitches[i].position!);
        }
        apply_ortho_constraints(stitches, newPositions, ortho_constant);
        // --- Surface Smoothing Constraint (Taubin smoothing: λ pass then μ pass) ---
        if (iter % 3 == 0) taubin_smoothing(newPositions, smoothingNeighbors, lambda, scratchAfterLambda);
        apply_dist_constraints(stitches, newPositions, spring_constant);
        // Update positions
        stitches.forEach((stitch, i) => {
            stitch.position!.copy(newPositions[i]);
        });

        if (iter % 3 === 0 && repulsionStrength > 0) {
            if (repulsionMode === "grid_inflation") {
                grid = apply_inflation_modifier(stitches, repulsionStrength, repulsionRadius, 32);
            } else if (repulsionMode === "stochastic") {
                apply_stochastic_repulsion(stitches, newPositions, repulsionStrength / 2, repulsionRadius, iter, 10);
                stitches.forEach((stitch, i) => {
                    stitch.position!.copy(newPositions[i]);
                });
            } else if (repulsionMode === "repulsion") {
                apply_repulsion(stitches, newPositions, repulsionStrength, repulsionRadius);
                stitches.forEach((stitch, i) => {
                    stitch.position!.copy(newPositions[i]);
                });
            } else if (repulsionMode === "local_inflation") {
                apply_local_inflation(stitches, newPositions, repulsionStrength);
                stitches.forEach((stitch, i) => {
                    stitch.position!.copy(newPositions[i]);
                });
            }
        }
    }

    // Center model by subtracting the mean position.
    let mean = stitches.map(s => s.position).filter(v => v).reduce((a, b) => a?.add(b!), new THREE.Vector3(0, 0, 0))?.divideScalar(stitches.length);
    for (const s of stitches) {
        s.position!.sub(mean!);
    }
    if (grid) {
        grid.min.sub(mean!);
        grid.max.sub(mean!);
    }
    return grid;
}

const getContrastColor = (color: string): { backgroundColor: string, textColor: string } => {
    const s = new Option().style;
    s.color = color;
    if (s.color === "") {
        return { backgroundColor: 'rgba(0,0,0,0.5)', textColor: 'white' };
    }

    // Use a temporary element to get the computed RGB color
    const temp = document.createElement('div');
    temp.style.color = color;
    temp.style.display = 'none';
    document.body.appendChild(temp);
    const computedColor = getComputedStyle(temp).color;
    document.body.removeChild(temp);

    const match = computedColor.match(/\d+/g);
    if (!match) return { backgroundColor: 'rgba(0,0,0,0.5)', textColor: 'white' };

    const [r, g, b] = match.map(Number);
    // Relative luminance formula: 0.2126 * R + 0.7152 * G + 0.0722 * B
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

    return {
        backgroundColor: computedColor,
        textColor: luminance > 0.5 ? 'black' : 'white'
    };
};

// --- Main Component ---
interface CrochetItem2Props {
    pattern: RowPiece[][],
    phys: PhysConfig,
    sphereColor?: string,
    lineColor?: string,
    experimental?: boolean,
    autoJoin: boolean,
    autoTurn: boolean,
}

export const CrochetItem: React.FC<CrochetItem2Props> = ({
    pattern,
    phys,
    sphereColor,
    lineColor,
    experimental,
    autoJoin,
    autoTurn,
}) => {
    const [stitches, grid] = useMemo(() => {
        const [stitches, row_ids, is_reversed] = discrete_rounds_crochet(pattern, { autoJoin, autoTurn });
        placeStitchesAnalytically(stitches, row_ids, is_reversed, autoJoin);
        let grid = relaxStitchPositions(stitches, phys);
        console.log(is_reversed);
        console.log(pattern);
        return [stitches, grid] as const;
    }, [pattern, phys, autoJoin, autoTurn]);

    const tensions = useMemo(() => {
        return calculateStitchTensions(stitches);
    }, [stitches]);

    return (
        <Canvas>
            <OrbitControls></OrbitControls>
            {/* Draw lines between connected stitches */}
            {stitches.map((stitch, id) => (
                stitch.below.map(({ id: belowId }) => {
                    const posA = stitch.position;
                    const posB = stitches[belowId]?.position;
                    if (!posA || !posB) return null;
                    const tension = experimental ? tensions[id].belowTensions.find((t: any) => t.id === belowId)?.tension ?? 1.0 : 1.0;
                    const color = experimental ? getHeatmapColor(tension) : lineColor;
                    return (
                        <line key={`line-${id}-${belowId}`}>
                            <bufferGeometry>
                                <bufferAttribute
                                    attach="attributes-position"
                                    args={[
                                        new Float32Array([
                                            posA.x, posA.y, posA.z,
                                            posB.x, posB.y, posB.z
                                        ]),
                                        3
                                    ]}
                                />
                            </bufferGeometry>
                            <lineBasicMaterial color={color} linewidth={2} />
                        </line>
                    );
                })
            ))}
            {/* Draw lines between consecutive stitches (prev) */}
            {stitches.map((stitch, id) => {
                if (!stitch.prev) return null;
                const prevId = stitch.prev.id;
                const posA = stitch.position;
                const posB = stitches[prevId]?.position;
                if (!posA || !posB) return null;
                const tension = experimental ? tensions[id].prevTension ?? 1.0 : 1.0;
                const color = experimental ? getHeatmapColor(tension) : lineColor;
                return (
                    <line key={`line-prev-${id}-${prevId}`}>
                        <bufferGeometry>
                            <bufferAttribute
                                attach="attributes-position"
                                args={[
                                    new Float32Array([
                                        posA.x, posA.y, posA.z,
                                        posB.x, posB.y, posB.z
                                    ]),
                                    3
                                ]}
                            />
                        </bufferGeometry>
                        <lineBasicMaterial color={color} linewidth={2} />
                    </line>
                );
            })}
            {/* Draw spheres for stitches */}
            {stitches.map((stitch, id) => (
                <group key={id} position={stitch.position!}>
                    <mesh>
                        <sphereGeometry args={[0.1]} />
                        <meshBasicMaterial color={experimental ? getHeatmapColor(tensions[id].avgTension) : sphereColor} />
                    </mesh>
                    {stitch.marking && (() => {
                        const colors = getContrastColor(stitch.marking);
                        return (
                            <Html distanceFactor={10}>
                                <div style={{
                                    color: colors.textColor,
                                    background: colors.backgroundColor,
                                    opacity: "0.6",
                                    padding: '2px 4px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    pointerEvents: 'none',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                }}>
                                    {stitch.marking}
                                </div>
                            </Html>
                        );
                    })()}
                </group>
            ))}
            {experimental && <DensityGridVisualizer grid={grid}></DensityGridVisualizer>}
        </Canvas>
    );
};
