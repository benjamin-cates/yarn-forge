import * as THREE from "three";

export interface PhysConfig {
    iterations: number;
    spring_constant: number;
    ortho_constant: number;
    repulsionStrength: number;
    lambda: number;
    mu: number;
}
export interface SimStitch {
    id: number;
    name: string;
    below: { id: number; dist: number }[];
    prev?: { id: number; dist: number };
    position?: THREE.Vector3;
}

const apply_dist_constraints = (stitches: SimStitch[], newPositions: THREE.Vector3[], spring_constant: number) => {
    const delta = new THREE.Vector3();
    const correction = new THREE.Vector3();
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
            correction.copy(delta).multiplyScalar((diff * spring_constant) / len);
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
            correction.copy(delta).multiplyScalar((diff * spring_constant) / len);
            newPositions[i].add(correction);
            newPositions[prevId].sub(correction);
        }
    });

}

const apply_ortho_constraints = (stitches: SimStitch[], newPositions: THREE.Vector3[], ortho_constant: number) => {

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
    mu: number,
    scratchAfterLambda: THREE.Vector3[],
) => {
    const avg = new THREE.Vector3();
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

const apply_repulsion = (
    stitches: SimStitch[],
    newPositions: THREE.Vector3[],
    repulsionStrength: number,
    _repulsionRadius: number
) => {
    if (repulsionStrength <= 0) return;

    // All-pairs repulsion (O(n^2)), but allocation-free in the hot loop.
    // Note: `repulsionRadius` is ignored here by request (repel every pair).

    // Precompute direct connectivity for O(1) checks.
    const connectedTo: Set<number>[] = Array.from({ length: stitches.length }, () => new Set<number>());
    for (let i = 0; i < stitches.length; i++) {
        const s = stitches[i];
        if (s.prev) connectedTo[i].add(s.prev.id);
        for (const b of s.below) connectedTo[i].add(b.id);
    }

    const delta = new THREE.Vector3();
    const correction = new THREE.Vector3();

    for (let i = 0; i < stitches.length; i++) {
        const a = newPositions[i];
        for (let j = i + 1; j < stitches.length; j++) {
            if (connectedTo[i].has(j) || connectedTo[j].has(i)) continue;

            const b = newPositions[j];
            delta.subVectors(b, a);
            const distSq = delta.lengthSq();
            if (distSq <= 0.0001) continue;

            const dist = Math.sqrt(distSq);
            const force = repulsionStrength * 0.01 / (dist + 1);
            correction.copy(delta).multiplyScalar(force / dist);

            if (stitches[i].name !== "mr") newPositions[i].sub(correction);
            if (stitches[j].name !== "mr") newPositions[j].add(correction);
        }
    }
};

// --- Inflation via Blurred 3D Density Grid ---

interface DensityGrid {
    resolution: number;
    values: Float32Array;
    min: THREE.Vector3;
    max: THREE.Vector3;
    cellSize: THREE.Vector3;
}

const build_density_grid = (points: THREE.Vector3[], resolution: number): DensityGrid | null => {
    if (points.length === 0 || resolution <= 1) return null;

    const min = new THREE.Vector3(
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY
    );
    const max = new THREE.Vector3(
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY
    );

    // Compute bounds
    for (const p of points) {
        min.min(p);
        max.max(p);
    }

    // Add a small padding so points near the border are still inside the grid
    const padding = 0.1;
    min.addScalar(-padding);
    max.addScalar(padding);

    const size = new THREE.Vector3().subVectors(max, min);
    const cellSize = new THREE.Vector3(
        size.x / (resolution - 1),
        size.y / (resolution - 1),
        size.z / (resolution - 1)
    );

    const values = new Float32Array(resolution * resolution * resolution);

    const idx = (x: number, y: number, z: number) =>
        x + y * resolution + z * resolution * resolution;

    // Deposit point "density" into the grid using trilinear weights
    for (const p of points) {
        const local = new THREE.Vector3().subVectors(p, min);
        const gx = local.x / cellSize.x;
        const gy = local.y / cellSize.y;
        const gz = local.z / cellSize.z;

        const x0 = Math.floor(gx);
        const y0 = Math.floor(gy);
        const z0 = Math.floor(gz);

        const tx = gx - x0;
        const ty = gy - y0;
        const tz = gz - z0;

        const x1 = Math.min(x0 + 1, resolution - 1);
        const y1 = Math.min(y0 + 1, resolution - 1);
        const z1 = Math.min(z0 + 1, resolution - 1);

        const wx0 = 1 - tx;
        const wy0 = 1 - ty;
        const wz0 = 1 - tz;

        const wx1 = tx;
        const wy1 = ty;
        const wz1 = tz;

        // Distribute to 8 surrounding cells
        values[idx(x0, y0, z0)] += wx0 * wy0 * wz0;
        values[idx(x1, y0, z0)] += wx1 * wy0 * wz0;
        values[idx(x0, y1, z0)] += wx0 * wy1 * wz0;
        values[idx(x1, y1, z0)] += wx1 * wy1 * wz0;

        values[idx(x0, y0, z1)] += wx0 * wy0 * wz1;
        values[idx(x1, y0, z1)] += wx1 * wy0 * wz1;
        values[idx(x0, y1, z1)] += wx0 * wy1 * wz1;
        values[idx(x1, y1, z1)] += wx1 * wy1 * wz1;
    }

    return { resolution, values, min, max, cellSize };
};

const sliding_blur_3d = (grid: DensityGrid, radius: number = 2): void => {
    const res = grid.resolution;
    const data = grid.values;
    const temp = new Float32Array(data.length);

    const strideY = res;
    const strideZ = res * res;
    const windowSize = radius * 2 + 1;
    const invWindow = 1.0 / windowSize;

    // Helper to blur a single 1D line of data
    const blurLine = (src: Float32Array, dst: Float32Array, startIdx: number, stride: number) => {
        let sum = 0;

        // 1. Initialize window (handling boundary by clamping)
        for (let i = -radius; i <= radius; i++) {
            const pos = Math.max(0, Math.min(res - 1, i));
            sum += src[startIdx + pos * stride];
        }

        // 2. Slide the window across the line
        for (let i = 0; i < res; i++) {
            dst[startIdx + i * stride] = sum * invWindow;

            // Indices for the next step
            const leaving = Math.max(0, i - radius);
            const entering = Math.min(res - 1, i + radius + 1);

            sum += src[startIdx + entering * stride] - src[startIdx + leaving * stride];
        }
    };

    // Pass 1: X-Axis
    for (let z = 0; z < res; z++) {
        for (let y = 0; y < res; y++) {
            blurLine(data, temp, z * strideZ + y * strideY, 1);
        }
    }
    data.set(temp);

    // Pass 2: Y-Axis
    for (let z = 0; z < res; z++) {
        for (let x = 0; x < res; x++) {
            blurLine(data, temp, z * strideZ + x, strideY);
        }
    }
    data.set(temp);

    // Pass 3: Z-Axis
    for (let y = 0; y < res; y++) {
        for (let x = 0; x < res; x++) {
            blurLine(data, temp, y * strideY + x, strideZ);
        }
    }
    data.set(temp);
};

const fast_blur_3d = (grid: DensityGrid, passes: number = 3): void => {
    const res = grid.resolution;
    const data = grid.values;
    const temp = new Float32Array(data.length);

    const strideY = res;
    const strideZ = res * res;

    for (let p = 0; p < passes; p++) {
        // Pass 1: Blur X axis (Horizontal)
        for (let z = 0; z < res; z++) {
            for (let y = 0; y < res; y++) {
                const base = z * strideZ + y * strideY;
                for (let x = 0; x < res; x++) {
                    const i = base + x;
                    const prev = x > 0 ? data[i - 1] : data[i];
                    const next = x < res - 1 ? data[i + 1] : data[i];
                    temp[i] = (prev + data[i] + next) * 0.3333;
                }
            }
        }
        data.set(temp);

        // Pass 2: Blur Y axis (Vertical)
        for (let z = 0; z < res; z++) {
            for (let x = 0; x < res; x++) {
                const base = z * strideZ + x;
                for (let y = 0; y < res; y++) {
                    const i = base + y * strideY;
                    const prev = y > 0 ? data[i - strideY] : data[i];
                    const next = y < res - 1 ? data[i + strideY] : data[i];
                    temp[i] = (prev + data[i] + next) * 0.3333;
                }
            }
        }
        data.set(temp);

        // Pass 3: Blur Z axis (Depth)
        for (let y = 0; y < res; y++) {
            for (let x = 0; x < res; x++) {
                const base = y * strideY + x;
                for (let z = 0; z < res; z++) {
                    const i = base + z * strideZ;
                    const prev = z > 0 ? data[i - strideZ] : data[i];
                    const next = z < res - 1 ? data[i + strideZ] : data[i];
                    temp[i] = (prev + data[i] + next) * 0.3333;
                }
            }
        }
        data.set(temp);
    }
};

const sample_grid_trilinear = (
    grid: DensityGrid,
    gx: number,
    gy: number,
    gz: number
): number => {
    const { resolution, values } = grid;

    const idx = (x: number, y: number, z: number) =>
        x + y * resolution + z * resolution * resolution;

    const clamp = (v: number, minVal: number, maxVal: number) =>
        v < minVal ? minVal : v > maxVal ? maxVal : v;

    gx = clamp(gx, 0, resolution - 1);
    gy = clamp(gy, 0, resolution - 1);
    gz = clamp(gz, 0, resolution - 1);

    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const z0 = Math.floor(gz);

    const tx = gx - x0;
    const ty = gy - y0;
    const tz = gz - z0;

    const x1 = clamp(x0 + 1, 0, resolution - 1);
    const y1 = clamp(y0 + 1, 0, resolution - 1);
    const z1 = clamp(z0 + 1, 0, resolution - 1);

    const c000 = values[idx(x0, y0, z0)];
    const c100 = values[idx(x1, y0, z0)];
    const c010 = values[idx(x0, y1, z0)];
    const c110 = values[idx(x1, y1, z0)];

    const c001 = values[idx(x0, y0, z1)];
    const c101 = values[idx(x1, y0, z1)];
    const c011 = values[idx(x0, y1, z1)];
    const c111 = values[idx(x1, y1, z1)];

    const c00 = c000 * (1 - tx) + c100 * tx;
    const c10 = c010 * (1 - tx) + c110 * tx;
    const c01 = c001 * (1 - tx) + c101 * tx;
    const c11 = c011 * (1 - tx) + c111 * tx;

    const c0 = c00 * (1 - ty) + c10 * ty;
    const c1 = c01 * (1 - ty) + c11 * ty;

    return c0 * (1 - tz) + c1 * tz;
};

const calculate_grid_gradient = (grid: DensityGrid, worldPos: THREE.Vector3): THREE.Vector3 => {
    const { min, cellSize, resolution } = grid;
    const local = new THREE.Vector3().subVectors(worldPos, min);
    const gx = local.x / cellSize.x;
    const gy = local.y / cellSize.y;
    const gz = local.z / cellSize.z;

    const eps = 1; // one cell in grid space

    const gx1 = Math.min(gx + eps, resolution - 1);
    const gx0 = Math.max(gx - eps, 0);
    const gy1 = Math.min(gy + eps, resolution - 1);
    const gy0 = Math.max(gy - eps, 0);
    const gz1 = Math.min(gz + eps, resolution - 1);
    const gz0 = Math.max(gz - eps, 0);

    const ddx =
        (sample_grid_trilinear(grid, gx1, gy, gz) -
            sample_grid_trilinear(grid, gx0, gy, gz)) /
        ((gx1 - gx0) * cellSize.x || 1);
    const ddy =
        (sample_grid_trilinear(grid, gx, gy1, gz) -
            sample_grid_trilinear(grid, gx, gy0, gz)) /
        ((gy1 - gy0) * cellSize.y || 1);
    const ddz =
        (sample_grid_trilinear(grid, gx, gy, gz1) -
            sample_grid_trilinear(grid, gx, gy, gz0)) /
        ((gz1 - gz0) * cellSize.z || 1);

    return new THREE.Vector3(ddx, ddy, ddz);
};

const apply_inflation_modifier = (
    stitches: SimStitch[],
    inflationStrength: number,
    repulsionRadius: number,
    gridResolution: number = 32
) => {
    if (inflationStrength === 0 || stitches.length === 0) return;

    const points: THREE.Vector3[] = [];
    for (const s of stitches) {
        if (s.position) points.push(s.position);
    }
    if (points.length === 0) return;

    const grid = build_density_grid(points, gridResolution);
    if (!grid) return;

    // Diffuse / blur the density to get a soft stuffing field
    sliding_blur_3d(grid, repulsionRadius);

    // Apply forces based on the gradient of the blurred density field
    for (const s of stitches) {
        if (!s.position) continue;
        const grad = calculate_grid_gradient(grid, s.position);
        // Move away from high-density regions (outwards)
        s.position.addScaledVector(grad, inflationStrength);
    }
};

export {
    apply_dist_constraints,
    apply_ortho_constraints,
    build_smoothing_neighbors,
    taubin_smoothing,
    apply_repulsion,
    apply_inflation_modifier
};
