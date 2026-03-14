import React, { useMemo } from "react";
import * as THREE from "three";
import type { RowPiece } from "./parse";
import { type SimStitch, build_smoothing_neighbors, taubin_smoothing, apply_dist_constraints, apply_ortho_constraints, apply_inflation_modifier, type PhysConfig } from "./phys";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

// --- Analytical Geometry Placement for Crochet Stitches ---
// This version computes stitch positions directly using parametric geometry (no physics/springs)

const STITCH_LENGTHS: { [key: string]: number } = {
    sc: 1,
    dc: 2,
    hdc: 1.5,
    htc: 2.5,
    tc: 3,
    ch: 1,
};

const discrete_rounds_crochet = (mr_size: number, rounds: RowPiece[][]): [SimStitch[], number[]] => {
    let stitches: SimStitch[] = [];
    // Magic ring
    stitches.push({ id: 0, name: "mr", prev: { id: mr_size - 1, dist: 0.5 }, below: [] });
    for (let i = 0; i < mr_size - 1; i++) {
        stitches.push({ id: i + 1, name: "mr", prev: { id: i, dist: 0.5 }, below: [] });
    }
    let row = Array.from({ length: mr_size }).fill(0).map((_, i) => i);
    let row_indices = [0];
    let markings: { [key: string]: number } = {};
    for (let round of rounds) {
        row_indices.push(stitches.length);
        let next_row = [];
        for (let piece of round) {
            next_row.push(...add_crochet(piece, stitches, row, markings));
        }
        // Add join: connect last stitch to first stitch in this row
        if (next_row.length > 1) {
            let firstStitch = stitches[next_row[0]];
            firstStitch.prev = { id: next_row[next_row.length - 1], dist: 1 };
        }
        row = next_row;
    }
    return [stitches, row_indices];
};

const add_crochet = (piece: RowPiece, stitches: SimStitch[], prev_row: number[], markings: { [key: string]: number }): number[] => {
    let next_row: number[] = [];
    if (piece.marking) {
        markings[piece.marking] = stitches.length;
    }
    if (piece.pieces) {
        if (piece.together) {
            // Decrease: one stitch, multiple below
            let stitch = { name: '', id: stitches.length, below: [] } as SimStitch;
            stitch.name = piece.name || (piece.pieces[0]?.name ?? '');
            stitch.prev = { id: stitches.length - 1, dist: 1 };
            for (let i = 0; i < piece.count; i++) {
                for (let j = 0; j < piece.pieces.length; j++) {
                    stitch.below.push({ id: prev_row.shift()!, dist: STITCH_LENGTHS[stitch.name] + 0.2 });
                }
            }
            stitches.push(stitch);
            next_row.push(stitches.length - 1);
        } else if (piece.in_name?.includes("same")) {
            // Increase: multiple stitches, all reference the same below
            let below = prev_row.shift()!;
            for (let i = 0; i < piece.count; i++) {
                for (let j = 0; j < piece.pieces.length; j++) {
                    let sub = piece.pieces[j];
                    stitches.push({
                        id: stitches.length,
                        name: sub.name!,
                        below: [{ id: below, dist: STITCH_LENGTHS[sub.name!] }],
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
                stitch.below.push({ id: prev_row.shift()!, dist: STITCH_LENGTHS[piece.name] + 0.2 });
            }
            stitches.push(stitch);
            next_row.push(stitches.length - 1);
        } else if (piece.in_name?.includes("same")) {
            // Increase: multiple stitches, all reference the same below
            let below = prev_row.shift()!;
            for (let i = 0; i < piece.count; i++) {
                stitches.push({
                    id: stitches.length,
                    name: piece.name,
                    below: [{ id: below, dist: STITCH_LENGTHS[piece.name] }],
                    prev: { id: stitches.length - 1, dist: 1 },
                });
                next_row.push(stitches.length - 1);
            }
        } else {
            for (let i = 0; i < piece.count; i++) {
                stitches.push({
                    id: stitches.length,
                    name: piece.name,
                    below: [{ id: prev_row.shift()!, dist: STITCH_LENGTHS[piece.name] }],
                    prev: { id: stitches.length - 1, dist: 1 },
                });
                next_row.push(stitches.length - 1);
            }
        }
    }
    return next_row;
};
function mulberry32(seed: number) {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
// --- Analytical Placement Function ---
function placeStitchesAnalytically(stitches: SimStitch[], row_ids: number[]) {
    let random = mulberry32(0);
    // Linear z placement: interpolate between same and incremented z based on row size difference
    let z = 0;
    for (let i = 0; i < row_ids.length; i++) {
        let start = row_ids[i];
        let end = row_ids[i + 1] || stitches.length;
        let count = end - start;
        if (count === 0) continue;
        let prevCount = i === 0 ? count : row_ids[i] - row_ids[i - 1];
        let nextZ = z;
        if (i > 0) {
            let dz = Math.abs(count - prevCount) / 6;
            nextZ = z + Math.max(0, Math.min(1, 1 - dz));
        }
        let radius = count / (2 * Math.PI);
        for (let j = start; j < end; j++) {
            let ang = (2 * Math.PI * (j - start)) / count;
            stitches[j].position = new THREE.Vector3(
                radius * Math.sin(ang) + 0.1 * random(),
                nextZ + 0.1 * random(),
                radius * Math.cos(ang) + 0.1 * random(),
            );
        }
        z = nextZ;
    }
}

// --- Constraint-Based Relaxation (Position-Based Dynamics) ---
function relaxStitchPositions(
    stitches: SimStitch[],
    iterations: number,
    spring_constant: number,
    ortho_constant: number,
    repulsionStrength: number,
    lambda: number,
    mu: number,
    repulsionRadius: number,
    repulsionGridSize: number,
) {
    const smoothingNeighbors = build_smoothing_neighbors(stitches);
    const newPositions: THREE.Vector3[] = stitches.map((s) => s.position!.clone());
    const scratchAfterLambda: THREE.Vector3[] = stitches.map(() => new THREE.Vector3());

    // For each iteration, adjust positions to satisfy constraints (rest lengths)
    for (let iter = 0; iter < iterations; iter++) {
        // Copy positions to avoid bias (reusing buffers)
        for (let i = 0; i < stitches.length; i++) {
            newPositions[i].copy(stitches[i].position!);
        }
        // For each stitch, apply constraints to its neighbors
        apply_dist_constraints(stitches, newPositions, spring_constant);
        apply_ortho_constraints(stitches, newPositions, ortho_constant);
        // --- Surface Smoothing Constraint (Taubin smoothing: λ pass then μ pass) ---
        taubin_smoothing(newPositions, smoothingNeighbors, lambda, mu, scratchAfterLambda);
        //apply_repulsion(stitches, newPositions, repulsionStrength, repulsionRadius);

        // Update positions
        stitches.forEach((stitch, i) => {
            stitch.position!.copy(newPositions[i]);
        });
        if (iter % 3 == 0) apply_inflation_modifier(stitches, repulsionStrength, repulsionRadius, repulsionGridSize);
    }

    // Center model by subtracting the mean position.
    let mean = stitches.map(s => s.position).filter(v => v).reduce((a, b) => a?.clone().add(b!))?.divideScalar(stitches.length);
    for (const s of stitches) {
        s.position!.sub(mean!);
    }
}

// --- Main Component ---
interface CrochetItem2Props {
    pattern: RowPiece[][],
    phys: PhysConfig,
    sphereColor?: string,
    lineColor?: string,
}

const CrochetItem2: React.FC<CrochetItem2Props> = ({
    pattern,
    phys,
    sphereColor = "white",
    lineColor = "yellow",
}) => {
    const { iterations, spring_constant, ortho_constant, repulsionStrength, lambda, mu } = phys;

    const [stitches] = useMemo(() => {
        const [stitches, row_ids] = discrete_rounds_crochet(6, pattern);
        placeStitchesAnalytically(stitches, row_ids);
        console.log(stitches);
        relaxStitchPositions(stitches, iterations, spring_constant, ortho_constant, repulsionStrength, lambda, mu, 10, 32);
        return [stitches] as const;
    }, [iterations, spring_constant, ortho_constant, repulsionStrength, lambda, mu]);


    return (
        <Canvas>
            <OrbitControls></OrbitControls>
            {/* Draw lines between connected stitches */}
            {stitches.map((stitch, id) => (
                stitch.below.map(({ id: belowId }) => {
                    const posA = stitch.position;
                    const posB = stitches[belowId]?.position;
                    if (!posA || !posB) return null;
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
                            <lineBasicMaterial color={lineColor} linewidth={2} />
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
                        <lineBasicMaterial color={lineColor} linewidth={2} />
                    </line>
                );
            })}
            {/* Draw spheres for stitches */}
            {stitches.map((stitch, id) => (
                <mesh key={id} position={stitch.position!}>
                    <sphereGeometry args={[0.1]} />
                    <meshBasicMaterial color={sphereColor} />
                </mesh>
            ))}
        </Canvas>
    );
};

export { CrochetItem2 };
