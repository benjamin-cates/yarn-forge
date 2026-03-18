import React from "react";
import type { PhysConfig } from "../simulation/phys";

interface PhysicsConfigProps {
    phys: PhysConfig;
    setPhys: (phys: PhysConfig | ((prev: PhysConfig) => PhysConfig)) => void;
    experimental: boolean;
    setExperimental: (experimental: boolean) => void;
}

export const PhysicsConfig: React.FC<PhysicsConfigProps> = ({
    phys,
    setPhys,
    experimental,
    setExperimental,
}) => {
    const updatePhys = (updates: Partial<PhysConfig>) => {
        setPhys((prev) => ({ ...prev, ...updates }));
    };

    const stretchiness = 1 / phys.spring_constant - 1;

    return (
        <div
            style={{
                position: "absolute",
                bottom: "20px",
                right: "20px",
                width: "300px",
                background: "rgba(34, 34, 34, 0.9)",
                color: "#fff",
                padding: "12px",
                borderRadius: "8px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
                zIndex: 1000,
                fontSize: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                backdropFilter: "blur(4px)",
                border: "1px solid #444",
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "14px" }}>Simulation Config</h3>
                <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                    Experimental
                    <input
                        type="checkbox"
                        checked={experimental}
                        onChange={(e) => setExperimental(e.target.checked)}
                    />
                </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", alignItems: "center", gap: "8px" }}>
                <label>Simulation steps: {phys.iterations}</label>
                <input
                    type="range"
                    min={experimental ? 0 : 50}
                    max={experimental ? 1000 : 200}
                    value={phys.iterations}
                    onChange={(e) => updatePhys({ iterations: Number(e.target.value) })}
                    style={{ width: "100%" }}
                />

                {!experimental ? (
                    <>
                        <label>Stretchiness: {stretchiness.toFixed(2)}</label>
                        <input
                            type="range"
                            min={0}
                            max={2}
                            step={0.01}
                            value={stretchiness}
                            onChange={(e) => updatePhys({ spring_constant: 1 / (Number(e.target.value) + 1) })}
                            style={{ width: "100%" }}
                        />
                        <label>Stuffing</label>
                        <div style={{ display: "flex", gap: "4px" }}>
                            {[
                                { label: "None", value: 0 },
                                { label: "Light", value: 1 },
                                { label: "Full", value: 3 },
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => updatePhys({ repulsionStrength: opt.value })}
                                    style={{
                                        flex: 1,
                                        padding: "2px 4px",
                                        fontSize: "10px",
                                        background: phys.repulsionStrength === opt.value ? "#555" : "#333",
                                        color: "#fff",
                                        border: "1px solid #666",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <label>Spring constant: {phys.spring_constant.toFixed(2)}</label>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={phys.spring_constant}
                            onChange={(e) => updatePhys({ spring_constant: Number(e.target.value) })}
                        />
                        <label>Orthogonality: {phys.ortho_constant.toFixed(2)}</label>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={phys.ortho_constant}
                            onChange={(e) => updatePhys({ ortho_constant: Number(e.target.value) })}
                        />
                        <label>Lambda (λ): {phys.lambda.toFixed(2)}</label>
                        <input
                            type="range"
                            min={0}
                            max={0.68}
                            step={0.01}
                            value={phys.lambda}
                            onChange={(e) => updatePhys({ lambda: Number(e.target.value) })}
                        />
                        <label>Repulsion: {phys.repulsionStrength.toFixed(2)}</label>
                        <input
                            type="range"
                            min={0}
                            max={3}
                            step={0.01}
                            value={phys.repulsionStrength}
                            onChange={(e) => updatePhys({ repulsionStrength: Number(e.target.value) })}
                        />
                        <label>Repulsion radius: {phys.repulsionRadius.toFixed(2)}</label>
                        <input
                            type="range"
                            min={0}
                            max={10}
                            step={0.1}
                            value={phys.repulsionRadius}
                            onChange={(e) => updatePhys({ repulsionRadius: Number(e.target.value) })}
                        />
                        <label>Repulsion Mode</label>
                        <select
                            value={phys.repulsionMode}
                            onChange={(e) => updatePhys({ repulsionMode: e.target.value as PhysConfig["repulsionMode"] })}
                            style={{ background: "#333", color: "#fff", border: "1px solid #666", borderRadius: "4px", fontSize: "10px" }}
                        >
                            <option value="stochastic">Stochastic</option>
                            <option value="repulsion">Repulsion</option>
                            <option value="local_inflation">Local Inflation</option>
                            <option value="grid_inflation">Grid Inflation</option>
                        </select>
                    </>
                )}
            </div>
        </div>
    );
};
