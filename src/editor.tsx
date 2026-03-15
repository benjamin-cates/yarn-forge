import React, { useState, useMemo } from "react";
import { make_line_parser, type RowPiece } from "./parse";
import { CrochetItem2 } from "./CrochetItem2";
import type { PhysConfig } from "./phys";
class ErrorBoundary extends React.Component<
    {
        children: React.ReactNode;
        set: (error: any) => void;
    },
    { hasError: boolean }
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error: any) {
        this.props.set(error);
    }
    render() {
        if (this.state.hasError) {
            return null;
        }
        return this.props.children;
    }
}

const defaultText = `6x(2 sc in same st)
6x(sc, 2 sc in same st)
6x(2 sc, 2 sc in same st)
24 sc
6x(3 sc, 2 sc in same st)
30 sc
30 sc
30 sc
30 sc
6x(3 sc, 2 sc together)
24xsc
6x(2 sc, 2 sc together)
6x(sc, 2 sc together)
6x(2 sc together)`;

function parseRows(text: string): RowPiece[][] {
    const parser = make_line_parser();
    return text
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
            try {
                // Each line is a row: parse as ItemList
                return parser.ItemList.tryParse(line);
            } catch (e) {
                console.log(e);
                // If parse fails, return an empty row
                return [];
            }
        });
}

const HeatmapIndex: React.FC = () => {
    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
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

const Editor: React.FC = () => {
    const [text, setText] = useState(defaultText);

    const [sidebarWidth, setSidebarWidth] = useState(420);
    const [isResizing, setIsResizing] = useState(false);

    const startResizing = React.useCallback((mouseDownEvent: React.MouseEvent) => {
        setIsResizing(true);
    }, []);

    const stopResizing = React.useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = React.useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isResizing) {
                const newWidth = mouseMoveEvent.clientX;
                console.log(newWidth);
                if (newWidth >= 320 && newWidth <= 800) {
                    setSidebarWidth(newWidth);
                }
            }
        },
        [isResizing]
    );

    React.useEffect(() => {
        window.addEventListener("mousemove", resize, { capture: true });
        window.addEventListener("mouseup", stopResizing, { capture: true });
        return () => {
            window.removeEventListener("mousemove", resize, { capture: true });
            window.removeEventListener("mouseup", stopResizing, { capture: true });
        };
    }, [resize]);

    const rows = useMemo(() => parseRows(text), [text]);
    const [iterations, setIterations] = useState(150);
    const [springConstant, setSpringConstant] = useState(0.5);
    const [orthoConstant, setOrthoConstant] = useState(0.6);
    const [repulsionStrength, setRepulsionStrength] = useState(1);
    const [repulsionRadius, setRepulsionRadius] = useState(2.3);
    const [repulsionMode, setRepulsionMode] = useState<PhysConfig["repulsionMode"]>("stochastic");
    const [lambda, setLambda] = useState(0.5);
    const [sphereColor, setSphereColor] = useState("#ffffff");
    const [lineColor, setLineColor] = useState("#ffff00");
    const [experimental, setExperimental] = useState(false);

    const stretchiness = (1 / springConstant) - 1;

    const phys = {
        iterations,
        spring_constant: springConstant,
        ortho_constant: experimental ? orthoConstant : 0.6,
        repulsionStrength,
        repulsionRadius: experimental ? repulsionRadius : 2.3,
        repulsionMode: experimental ? repulsionMode : "stochastic",
        lambda: experimental ? lambda : 0.55,
    } satisfies PhysConfig;

    return (
        <div style={{ display: 'flex', width: '100vw', height: '100vh', flexDirection: "row", userSelect: isResizing ? 'none' : 'auto' }}>
            <div style={{ width: `${sidebarWidth}px`, display: 'flex', flexDirection: 'column', background: '#222', color: '#fff', overflow: 'hidden', boxShadow: '2px 0 8px #0004', zIndex: 2 }}>
                <div style={{ padding: 16, overflowY: 'auto', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0 }}>Simulation Controls</h2>
                        <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input type="checkbox" checked={experimental} onChange={e => setExperimental(e.target.checked)} />
                            Exp.
                        </label>
                    </div>
                    <div style={{ marginBottom: 8, marginTop: 16 }}>
                        <label htmlFor="iterations-slider">Relaxation Iterations: {iterations}</label>
                        <input
                            id="iterations-slider"
                            type="range"
                            min={experimental ? 0 : 50}
                            max={experimental ? 1000 : 200}
                            value={iterations}
                            onChange={e => setIterations(Number(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    {experimental ? (
                        <>
                            <div style={{ marginBottom: 8 }}>
                                <label htmlFor="spring-constant-slider">Spring constant: {springConstant.toFixed(2)}</label>
                                <input
                                    id="spring-constant-slider"
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={springConstant}
                                    onChange={e => setSpringConstant(Number(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ marginBottom: 8 }}>
                                <label htmlFor="ortho-constant-slider">Orthogonality constant: {orthoConstant.toFixed(2)}</label>
                                <input
                                    id="ortho-constant-slider"
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={orthoConstant}
                                    onChange={(e) => setOrthoConstant(Number(e.target.value))}
                                    style={{ width: "100%" }}
                                />
                            </div>
                            <div style={{ marginBottom: 8 }}>
                                <label htmlFor="repulsion-strength-slider">Repulsion strength: {repulsionStrength.toFixed(2)}</label>
                                <input
                                    id="repulsion-strength-slider"
                                    type="range"
                                    min={0}
                                    max={3}
                                    step={0.01}
                                    value={repulsionStrength}
                                    onChange={e => setRepulsionStrength(Number(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ marginBottom: 8 }}>
                                <label htmlFor="repulsion-radius-slider">Repulsion radius: {repulsionRadius.toFixed(2)}</label>
                                <input
                                    id="repulsion-radius-slider"
                                    type="range"
                                    min={0}
                                    max={10}
                                    step={0.1}
                                    value={repulsionRadius}
                                    onChange={e => setRepulsionRadius(Number(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ marginBottom: 8 }}>
                                <label>Repulsion Mode</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                    {(["stochastic", "repulsion", "local_inflation", "grid_inflation"] as const).map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => setRepulsionMode(mode)}
                                            style={{
                                                flex: '1 1 45%',
                                                padding: '4px',
                                                fontSize: '10px',
                                                background: repulsionMode === mode ? '#555' : '#333',
                                                color: '#fff',
                                                border: '1px solid #666',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {mode.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ marginBottom: 8 }}>
                                <label htmlFor="smoothing-strength-slider">Smoothing strength (λ): {lambda.toFixed(2)}</label>
                                <input
                                    id="smoothing-strength-slider"
                                    type="range"
                                    min={0}
                                    max={0.68}
                                    step={0.01}
                                    value={lambda}
                                    onChange={e => setLambda(Number(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ marginBottom: 8 }}>
                                <label htmlFor="stretchiness-slider">Stretchiness: {stretchiness.toFixed(2)}</label>
                                <input
                                    id="stretchiness-slider"
                                    type="range"
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    value={stretchiness}
                                    onChange={e => setSpringConstant(1 / (Number(e.target.value) + 1))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ marginBottom: 8 }}>
                                <label>Stuffing</label>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                    {[
                                        { label: 'None', value: 0 },
                                        { label: 'Light', value: 1 },
                                        { label: 'Stuffed', value: 3 }
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setRepulsionStrength(opt.value)}
                                            style={{
                                                flex: 1,
                                                padding: '4px',
                                                background: repulsionStrength === opt.value ? '#555' : '#333',
                                                color: '#fff',
                                                border: '1px solid #666',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                            <label htmlFor="sphere-color-picker" style={{ display: 'block', fontSize: '14px' }}>Sphere Color</label>
                            <input
                                id="sphere-color-picker"
                                type="color"
                                value={sphereColor}
                                onChange={e => setSphereColor(e.target.value)}
                                style={{ width: '100%', height: '30px', border: 'none', padding: 0, background: 'none', cursor: 'pointer' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label htmlFor="line-color-picker" style={{ display: 'block', fontSize: '14px' }}>Line Color</label>
                            <input
                                id="line-color-picker"
                                type="color"
                                value={lineColor}
                                onChange={e => setLineColor(e.target.value)}
                                style={{ width: '100%', height: '30px', border: 'none', padding: 0, background: 'none', cursor: 'pointer' }}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ flex: 1, padding: 16, boxSizing: "border-box", background: "#222", color: "#fff", display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <h2 style={{ marginTop: 0 }}>Crochet Pattern Editor</h2>
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        style={{ width: "100%", flex: 1, background: "#111", color: "#fff", fontFamily: "monospace", fontSize: 16, border: "1px solid #444", borderRadius: 4, resize: "none" }}
                    />
                </div>
            </div>
            <div
                style={{
                    width: '4px',
                    cursor: 'col-resize',
                    background: isResizing ? '#666' : 'transparent',
                    zIndex: 3,
                    transition: 'background 0.2s'
                }}
                onMouseDown={startResizing}
                onMouseEnter={(e) => { if (!isResizing) e.currentTarget.style.background = '#444'; }}
                onMouseLeave={(e) => { if (!isResizing) e.currentTarget.style.background = 'transparent'; }}
            />
            <div style={{ width: `calc(100vw - ${sidebarWidth}px)`, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", position: 'relative' }}>
                <ErrorBoundary set={() => (<div>Something went wrong</div>)}>
                    <CrochetItem2 pattern={rows} phys={phys} sphereColor={sphereColor} lineColor={lineColor} experimental={experimental} />
                </ErrorBoundary>
                {experimental && <HeatmapIndex />}
            </div>
        </div>
    );
};

export default Editor;
