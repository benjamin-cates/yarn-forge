import React, { useMemo } from "react";
import { type Row } from "../parse";
import { relaxStitchPositions, type PhysConfig } from "../simulation/phys";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import { calculateStitchTensions, DensityGridVisualizer, getHeatmapColor } from "../simulation/experimental";
import { crochet, placeStitchesAnalytically } from "../simulation/crochet";
import { getLabelColors } from "../util";


interface CrochetItemProps {
    pattern: Row[],
    phys: PhysConfig,
    sphereColor?: string,
    lineColor?: string,
    experimental?: boolean,
    autoJoin: boolean,
    autoTurn: boolean,
}

export const CrochetItem: React.FC<CrochetItemProps> = ({
    pattern,
    phys,
    sphereColor,
    lineColor,
    experimental,
    autoJoin,
    autoTurn,
}) => {
    const [stitches, grid] = useMemo(() => {
        const [stitches, row_ids, is_reversed] = crochet(pattern, { autoJoin, autoTurn });
        placeStitchesAnalytically(stitches, row_ids, is_reversed, autoJoin);
        let grid = relaxStitchPositions(stitches, phys);
        return [stitches, grid] as const;
    }, [pattern, phys, autoJoin, autoTurn]);

    const tensions = useMemo(() => {
        return calculateStitchTensions(stitches);
    }, [stitches]);

    return (
        <Canvas frameloop="demand">
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
                        <Line
                            key={`line-${id}-${belowId}`}
                            points={[posA, posB]}
                            color={color}
                            lineWidth={2}
                            frustumCulled={false}
                        />
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
                    <Line
                        key={`line-prev-${id}-${prevId}`}
                        points={[posA, posB]}
                        color={color}
                        lineWidth={2}
                        frustumCulled={false}
                    />
                );
            })}
            {/* Draw spheres for stitches */}
            {stitches.map((stitch, id) => (
                <group key={id} position={stitch.position!}>
                    <mesh>
                        <sphereGeometry args={[0.1, 7, 7]} />
                        <meshBasicMaterial color={experimental ? getHeatmapColor(tensions[id].avgTension) : sphereColor} />
                    </mesh>
                    {stitch.marking && (() => {
                        const colors = getLabelColors(stitch.marking);
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
