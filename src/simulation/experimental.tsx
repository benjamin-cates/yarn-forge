import React, { useMemo } from "react";
import * as THREE from "three";
import type { SimStitch } from "./phys";

interface Props {
    grid: any; // Replace with DensityGrid type
    threshold?: number; // Minimum density to show (e.g., 0.1)
    pointSize?: number;
}

export const DensityGridVisualizer: React.FC<Props> = ({
    grid,
    threshold = 0.0001,
    pointSize = 0.1,
}) => {
    const { positions, colors } = useMemo(() => {
        if (!grid) return { positions: new Float32Array(), colors: new Float32Array() };

        const posArray: number[] = [];
        const colorArray: number[] = [];
        const { resolution, values, min, cellSize } = grid;

        // We use a simple heat map color: Low (Blue) -> High (Red)
        const color = new THREE.Color();

        for (let z = 0; z < resolution; z++) {
            for (let y = 0; y < resolution; y++) {
                for (let x = 0; x < resolution; x++) {
                    const idx = x + y * resolution + z * resolution * resolution;
                    const intensity = values[idx];

                    if (intensity > threshold) {
                        // Calculate world position for this grid cell center
                        const px = min.x + (x) * cellSize.x;
                        const py = min.y + (y) * cellSize.y;
                        const pz = min.z + (z - 0.5) * cellSize.z;

                        posArray.push(px, py, pz);

                        // Map intensity to color (normalized between 0 and 1 for the gradient)
                        const normalized = Math.min(intensity / 2, 1);
                        color.setHSL(0.7 * (1 - normalized), 1, 0.5); // Blue to Red
                        colorArray.push(color.r, color.g, color.b);
                    }
                }
            }
        }

        return {
            positions: new Float32Array(posArray),
            colors: new Float32Array(colorArray),
        };
    }, [grid, threshold]);

    if (positions.length === 0) return null;

    return (
        <points>
            <bufferGeometry attach="geometry">
                <bufferAttribute
                    args={[positions, 3]}
                    attach="attributes-position"
                    count={positions.length / 3}
                    array={positions}
                    itemSize={3}
                />
                <bufferAttribute
                    args={[positions, 3]}
                    attach="attributes-color"
                    count={colors.length / 3}
                    array={colors}
                    itemSize={3}
                />
            </bufferGeometry>
            < pointsMaterial
                attach="material"
                size={pointSize}
                vertexColors
                transparent
                opacity={0.6}
                sizeAttenuation={true}
            />
        </points>
    );
};

export interface TensionData {
    belowTensions: { id: number; tension: number }[];
    prevTension?: number;
    avgTension: number;
}

export const calculateStitchTensions = (stitches: SimStitch[]): TensionData[] => {
    return stitches.map(stitch => {
        const data: TensionData = {
            belowTensions: [],
            avgTension: 1.0
        };

        if (!stitch.position) return data;

        let totalTension = 0;
        let count = 0;

        stitch.below.forEach(({ id: belowId, dist }) => {
            const belowStitch = stitches[belowId];
            if (belowStitch && belowStitch.position) {
                const actualDist = stitch.position!.distanceTo(belowStitch.position);
                const tension = actualDist / dist;
                data.belowTensions.push({ id: belowId, tension });
                totalTension += tension;
                count++;
            }
        });

        if (stitch.prev) {
            const prevStitch = stitches[stitch.prev.id];
            if (prevStitch && prevStitch.position) {
                const actualDist = stitch.position!.distanceTo(prevStitch.position);
                const tension = actualDist / stitch.prev.dist;
                data.prevTension = tension;
                totalTension += tension;
                count++;
            }
        }

        if (count > 0) {
            data.avgTension = totalTension / count;
        }

        return data;
    });
};

export const getHeatmapColor = (tension: number): string => {
    // tension around 1.0 is neutral
    // tension < 1.0 is compressed (blue)
    // tension > 1.0 is stretched (red)
    // Range: 0.5 (blue) -> 1.0 (white) -> 1.5 (red)
    const t = Math.max(0.5, Math.min(1.5, tension));
    if (t < 1.0) {
        // Blue to White
        const factor = (t - 0.5) / 0.5; // 0 to 1
        const r = Math.floor(255 * factor);
        const g = Math.floor(255 * factor);
        const b = 255;
        return `rgb(${r},${g},${b})`;
    } else {
        // White to Red
        const factor = (t - 1.0) / 0.5; // 0 to 1
        const r = 255;
        const g = Math.floor(255 * (1 - factor));
        const b = Math.floor(255 * (1 - factor));
        return `rgb(${r},${g},${b})`;
    }
};

export const HeatmapIndex: React.FC = () => {
    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(0,0,0,0.7)',
            padding: '12px',
            borderRadius: '8px',
            color: 'white',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 10,
            border: '1px solid #444',
            width: '120px'
        }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>Tension Index</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Stretched</span>
                    <span style={{ color: '#ff0000' }}>1.5+</span>
                </div>
                <div style={{
                    height: '10px',
                    width: '100%',
                    background: 'linear-gradient(to right, #0000ff, #ffffff, #ff0000)',
                    borderRadius: '2px',
                    margin: '4px 0'
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Compressed</span>
                    <span style={{ color: '#0000ff' }}>0.5-</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: '10px', color: '#aaa', marginTop: '4px' }}>
                    1.0 = Neutral
                </div>
            </div>
        </div>
    );
}
