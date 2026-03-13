import React, { useMemo } from "react";
import * as THREE from "three";
import type { RowPiece } from "./parse";

// --- Analytical Geometry Placement for Crochet Stitches ---
// This version computes stitch positions directly using parametric geometry (no physics/springs)

interface SimStitch {
    id: number;
    name: string;
    below: { id: number; dist: number }[];
    prev?: { id: number; dist: number };
    position?: THREE.Vector3;
}

const STITCH_LENGTHS: { [key: string]: number } = {
    sc: 1,
    dc: 2,
    hdc: 1.5,
    htc: 2.5,
    tc: 3,
    ch: 1,
};

const continuous_rounds_crochet = (mr_size: number, rounds: RowPiece[][]): [SimStitch[], number[]] => {
    let stitches: SimStitch[] = [];
    stitches.push({ id: 0, name: "mr", prev: { id: mr_size - 1, dist: 1 }, below: [] });
    for (let i = 0; i < mr_size - 1; i++) {
        stitches.push({ id: i + 1, name: "mr", prev: { id: i, dist: 1 }, below: [] });
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
                    stitch.below.push({ id: prev_row.shift()!, dist: STITCH_LENGTHS[stitch.name] });
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
                stitch.below.push({ id: prev_row.shift()!, dist: STITCH_LENGTHS[piece.name] });
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
            let dz = (prevCount - count) / 6;
            nextZ = z + Math.max(0, Math.min(1, dz));
        }
        let radius = count / (2 * Math.PI);
        for (let j = start; j < end; j++) {
            let ang = (2 * Math.PI * (j - start)) / count;
            stitches[j].position = new THREE.Vector3(
                radius * Math.sin(ang) + 0.1 * random(),
                radius * Math.cos(ang) + 0.1 * random(),
                nextZ + 0.1 * random()
            );
        }
        z = nextZ;
    }
}

// --- Constraint-Based Relaxation (Position-Based Dynamics) ---
function relaxStitchPositions(stitches: SimStitch[], iterations: number = 20) {
    // For each iteration, adjust positions to satisfy constraints (rest lengths)
    for (let iter = 0; iter < iterations; iter++) {
        // Copy positions to avoid bias
        const newPositions = stitches.map(s => s.position!.clone());
        // For each stitch, apply constraints to its neighbors
        stitches.forEach((stitch, i) => {
            // Below constraints
            stitch.below.forEach(({ id: belowId, dist }) => {
                let a = newPositions[i];
                let b = newPositions[belowId];
                if (!a || !b) return; // Defensive: skip if either is undefined
                let delta = b.clone().sub(a);
                let len = delta.length();
                if (len === 0) return;
                let diff = (len - dist) / 2;
                let correction = delta.clone().normalize().multiplyScalar(diff);
                // Move both points (unless mr, which is fixed)
                if (stitch.name !== "mr") newPositions[i].add(correction);
                if (stitches[belowId] && stitches[belowId].name !== "mr") newPositions[belowId].sub(correction);
            });
            // Prev constraint
            if (stitch.prev) {
                let prevId = stitch.prev.id;
                let a = newPositions[i];
                let b = newPositions[prevId];
                if (!a || !b) return; // Defensive: skip if either is undefined
                let delta = b.clone().sub(a);
                let len = delta.length();
                if (len === 0) return;
                let diff = (len - stitch.prev.dist) / 2;
                let correction = delta.clone().normalize().multiplyScalar(diff);
                if (stitch.name !== "mr") newPositions[i].add(correction);
                if (stitches[prevId] && stitches[prevId].name !== "mr") newPositions[prevId].sub(correction);
            }
        });
        // Update positions
        stitches.forEach((stitch, i) => {
            stitch.position!.copy(newPositions[i]);
        });
    }
}

// --- Main Component ---
interface CrochetItem2Props {
    iterations?: number;
}

const CrochetItem2: React.FC<CrochetItem2Props> = ({ iterations = 30 }) => {

    const [stitches, row_ids] = useMemo(() => {
        const [stitches, row_ids] = continuous_rounds_crochet(6, [
            [{ count: 6, pieces: [{ count: 2, in_name: "same st", name: "sc" }] }],
            [{ count: 6, pieces: [{ count: 1, name: "sc" }, { count: 2, in_name: "same st", name: "sc" }] }],
        ]);
        placeStitchesAnalytically(stitches, row_ids);
        relaxStitchPositions(stitches, iterations);
        return [stitches, row_ids];
    }, [iterations]);


    return (
        <>
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
                            <lineBasicMaterial color="yellow" linewidth={2} />
                        </line>
                    );
                })
            ))}
            {/* Draw lines between consecutive stitches (prev) in cyan */}
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
                        <lineBasicMaterial color="cyan" linewidth={2} />
                    </line>
                );
            })}
            {/* Draw spheres for stitches */}
            {stitches.map((stitch, id) => (
                <mesh key={id} position={stitch.position!}>
                    <sphereGeometry args={[0.1]} />
                    <meshStandardMaterial color="white" />
                </mesh>
            ))}
        </>
    );
};

export { CrochetItem2 };
