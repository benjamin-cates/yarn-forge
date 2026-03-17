import * as THREE from "three";
import { apply_inflation_modifier, apply_local_inflation, apply_repulsion, apply_stochastic_repulsion } from "./inflation";

export interface PhysConfig {
    iterations: number;
    spring_constant: number;
    ortho_constant: number;
    repulsionStrength: number;
    repulsionRadius: number;
    repulsionMode: "stochastic" | "repulsion" | "local_inflation" | "grid_inflation";
    lambda: number;
}
export interface SimStitch {
    id: number;
    name: string;
    below: { id: number; dist: number }[];
    prev?: { id: number; dist: number };
    position?: THREE.Vector3;
    marking?: string;
}

export function relaxStitchPositions(
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

const apply_dist_constraints = (stitches: SimStitch[], newPositions: THREE.Vector3[], spring_constant: number) => {
    const delta = new THREE.Vector3();
    const correction = new THREE.Vector3();
    const STRETCH_LIMIT = 1.5;

    // For each stitch, apply constraints to its neighbors
    stitches.forEach((stitch, i) => {
        // Below constraints
        stitch.below.forEach(({ id: belowId, dist }) => {
            let a = newPositions[i];
            let b = newPositions[belowId];
            if (!a || !b) return; // Defensive: skip if either is undefined
            delta.subVectors(b, a);
            let len = delta.length();
            if (len === 0) return;
            let diff = (len - dist) / 2;

            // If stretched beyond the limit, increase the spring constant quickly

            let k = spring_constant;
            if (len > dist * STRETCH_LIMIT) {
                const overstretch = len / (dist * STRETCH_LIMIT);
                k = spring_constant * Math.min(Math.sqrt(overstretch), 3);
            }

            correction.copy(delta).multiplyScalar(Math.min((diff * k) / len, 1));
            // Move both points (unless mr, which is fixed)
            newPositions[i].add(correction);
            newPositions[belowId].sub(correction);
        });
        // Prev constraint
        if (stitch.prev) {
            let prevId = stitch.prev.id;
            let a = newPositions[i];
            let b = newPositions[prevId];
            if (!a || !b) return; // Defensive: skip if either is undefined
            delta.subVectors(b, a);
            let len = delta.length();
            if (len === 0) return;
            let diff = (len - stitch.prev.dist) / 2;

            let k = spring_constant;
            if (len > stitch.prev.dist * STRETCH_LIMIT) {
                const overstretch = len / (stitch.prev.dist * STRETCH_LIMIT);
                k = spring_constant * Math.min(Math.sqrt(overstretch), 3);
            }

            correction.copy(delta).multiplyScalar(Math.min((diff * k) / len, 1));
            newPositions[i].add(correction);
            newPositions[prevId].sub(correction);
        }
    });

}

const apply_ortho_constraints = (stitches: SimStitch[], newPositions: THREE.Vector3[], ortho_constant: number) => {
    if (ortho_constant <= 0) return;
    const prev_v = new THREE.Vector3();
    const below_v = new THREE.Vector3();

    stitches.forEach((stitch, i) => {
        if (!stitch.prev || stitch.below.length === 0) return;

        let cur = newPositions[i];
        let prevId = stitch.prev.id;
        let prev = newPositions[prevId];

        prev_v.subVectors(prev, cur);
        let prev_len = prev_v.length();
        if (prev_len < 0.0001) return;
        prev_v.divideScalar(prev_len);

        const num_below = stitch.below.length;

        stitch.below.forEach(({ id: belowId }, index) => {
            let below = newPositions[belowId];
            below_v.subVectors(below, cur);
            let below_len = below_v.length();
            if (below_len < 0.0001) return;
            below_v.divideScalar(below_len);

            // If there are multiple below stitches (decrease), they shouldn't all be at 90 degrees
            // to the same prev vector. They should be fanned out.
            // We can target an angle offset from 90 degrees.
            // Target dot product: cos(90 + offset) = -sin(offset)
            let target_dot = 0;
            if (num_below > 1) {
                // Fan out the below stitches. 
                // index 0 to num_below-1
                // normalized_index from -0.5 to 0.5
                let normalized_index = (index / (num_below - 1)) - 0.5;
                // Target an angle spread, e.g., 30 degrees total spread -> +/- 15 degrees
                let spread_angle = (60 * Math.PI / 180) * normalized_index;
                target_dot = -Math.sin(spread_angle);
            }

            let dot = prev_v.dot(below_v);
            let diff = dot - target_dot;

            // Correction: push each vector to reach the target dot product
            let correction_prev = below_v.clone().multiplyScalar(diff * ortho_constant * 0.05);
            let correction_below = prev_v.clone().multiplyScalar(diff * ortho_constant * 0.05);

            newPositions[prevId].sub(correction_prev);
            newPositions[belowId].sub(correction_below);
        });
    });
};

const build_smoothing_neighbors = (stitches: SimStitch[]): number[][] => {
    // prev/below plus reverse links
    const reverseNeighbors: number[][] = Array.from({ length: stitches.length }, () => []);
    for (let i = 0; i < stitches.length; i++) {
        const s = stitches[i];
        if (s.prev) reverseNeighbors[s.prev.id].push(i);
        for (const b of s.below) {
            if (!reverseNeighbors[b.id]) {
                console.log(s);
            }
            reverseNeighbors[b.id].push(i);
        }
    }
    return stitches.map((stitch) => {
        const set = new Set<number>();
        if (stitch.prev) set.add(stitch.prev.id);
        stitch.below.forEach(b => set.add(b.id));
        reverseNeighbors[stitch.id].forEach(id => set.add(id));
        return Array.from(set);
    });
};

const taubin_smoothing = (
    newPositions: THREE.Vector3[],
    neighbors: number[][],
    lambda: number,
    scratchAfterLambda: THREE.Vector3[],
) => {
    const avg = new THREE.Vector3();
    const kbp = 0.03;
    const mu = lambda / (lambda * kbp - 1);
    for (let i = 0; i < newPositions.length; i++) {
        if (!scratchAfterLambda[i]) scratchAfterLambda[i] = new THREE.Vector3();
        scratchAfterLambda[i].copy(newPositions[i]);
    }
    for (let i = 0; i < newPositions.length; i++) {
        const ns = neighbors[i];
        if (!ns || ns.length === 0) continue;
        avg.set(0, 0, 0);
        for (const n of ns) avg.add(newPositions[n]);
        avg.multiplyScalar(1 / ns.length);
        scratchAfterLambda[i].lerp(avg, lambda);
    }
    for (let i = 0; i < newPositions.length; i++) {
        const ns = neighbors[i];
        if (!ns || ns.length === 0) continue;
        avg.set(0, 0, 0);
        for (const n of ns) avg.add(scratchAfterLambda[n]);
        avg.multiplyScalar(1 / ns.length);
        scratchAfterLambda[i].lerp(avg, mu);
        newPositions[i].copy(scratchAfterLambda[i]);
    }
};

export {
    apply_dist_constraints,
    apply_ortho_constraints,
    build_smoothing_neighbors,
    taubin_smoothing,
};
