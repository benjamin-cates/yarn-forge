import * as THREE from "three";

export interface SimStitch {
    id: number;
    name: string;
    below: { id: number; dist: number }[];
    prev?: { id: number; dist: number };
    position?: THREE.Vector3;
}

const apply_dist_constraints = (stitches: SimStitch[], newPositions: THREE.Vector3[], spring_constant: number) => {
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
            let correction = delta.clone().normalize().multiplyScalar(diff * spring_constant);
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
            let delta = b.clone().sub(a);
            let len = delta.length();
            if (len === 0) return;
            let diff = (len - stitch.prev.dist) / 2;
            let correction = delta.clone().normalize().multiplyScalar(diff * spring_constant);
            newPositions[i].add(correction);
            newPositions[prevId].sub(correction);
        }
    });

}

const build_smoothing_neighbors = (stitches: SimStitch[]): number[][] => {
    // prev/below plus reverse links
    const reverseNeighbors: number[][] = Array.from({ length: stitches.length }, () => []);
    for (let i = 0; i < stitches.length; i++) {
        const s = stitches[i];
        if (s.prev) reverseNeighbors[s.prev.id].push(i);
        for (const b of s.below) reverseNeighbors[b.id].push(i);
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
    mu: number = -0.53
) => {
    const afterLambda = newPositions.map(p => p.clone());
    for (let i = 0; i < newPositions.length; i++) {
        const ns = neighbors[i];
        if (!ns || ns.length === 0) continue;
        const avg = new THREE.Vector3(0, 0, 0);
        for (const n of ns) avg.add(newPositions[n]);
        avg.multiplyScalar(1 / ns.length);
        afterLambda[i].lerp(avg, lambda);
    }
    for (let i = 0; i < newPositions.length; i++) {
        const ns = neighbors[i];
        if (!ns || ns.length === 0) continue;
        const avg = new THREE.Vector3(0, 0, 0);
        for (const n of ns) avg.add(afterLambda[n]);
        avg.multiplyScalar(1 / ns.length);
        afterLambda[i].lerp(avg, mu);
        newPositions[i].copy(afterLambda[i]);
    }
};

const apply_repulsion = (
    stitches: SimStitch[],
    newPositions: THREE.Vector3[],
    repulsionStrength: number,
    repulsionRadius: number
) => {
    for (let i = 0; i < stitches.length; i++) {
        const a = newPositions[i];
        if (!a) continue;
        const connected = new Set<number>();
        if (stitches[i].prev) connected.add(stitches[i].prev!.id);
        stitches[i].below.forEach(b => connected.add(b.id));
        for (let j = i + 1; j < stitches.length; j++) {
            if (connected.has(j) || stitches[j].prev?.id === i || stitches[j].below.some(b => b.id === i)) continue;
            const b = newPositions[j];
            if (!b) continue;
            const delta = b.clone().sub(a);
            const dist = delta.length();
            if (dist < repulsionRadius && dist > 0.01) {
                const force = repulsionStrength * (repulsionRadius - dist) / repulsionRadius;
                const correction = delta.clone().normalize().multiplyScalar(force);
                if (stitches[i].name !== "mr") newPositions[i].sub(correction);
                if (stitches[j].name !== "mr") newPositions[j].add(correction);
            }
        }
    }
};

export { apply_dist_constraints, build_smoothing_neighbors, taubin_smoothing, apply_repulsion };