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
    console.log(sidebarWidth);

    const rows = useMemo(() => parseRows(text), [text]);
    const [iterations, setIterations] = useState(30);
    const [springConstant, setSpringConstant] = useState(0.4);
    const [orthoConstant, setOrthoConstant] = useState(0.1);
    const [repulsionStrength, setRepulsionStrength] = useState(0.1);
    const [lambda, setLambda] = useState(0.5);
    const [mu, setMu] = useState(-0.53);
    const [sphereColor, setSphereColor] = useState("#ffffff");
    const [lineColor, setLineColor] = useState("#ffff00");

    const phys = {
        iterations,
        spring_constant: springConstant,
        ortho_constant: orthoConstant,
        repulsionStrength,
        lambda,
        mu,
    } satisfies PhysConfig;

    return (
        <div style={{ display: 'flex', width: '100vw', height: '100vh', flexDirection: "row", userSelect: isResizing ? 'none' : 'auto' }}>
            <div style={{ width: `${sidebarWidth}px`, display: 'flex', flexDirection: 'column', background: '#222', color: '#fff', overflow: 'hidden', boxShadow: '2px 0 8px #0004', zIndex: 2 }}>
                <div style={{ padding: 16, overflowY: 'auto', flexShrink: 0 }}>
                    <h2>Simulation Controls</h2>
                    <div style={{ marginBottom: 8 }}>
                        <label htmlFor="iterations-slider">Relaxation Iterations: {iterations}</label>
                        <input
                            id="iterations-slider"
                            type="range"
                            min={0}
                            max={1000}
                            value={iterations}
                            onChange={e => setIterations(Number(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>
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
                        <label htmlFor="smoothing-strength-slider">Smoothing strength (λ): {lambda.toFixed(2)}</label>
                        <input
                            id="smoothing-strength-slider"
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={lambda}
                            onChange={e => setLambda(Number(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                        <label htmlFor="mu-slider">Mu (μ): {mu.toFixed(2)}</label>
                        <input
                            id="mu-slider"
                            type="range"
                            min={-1}
                            max={0}
                            step={0.01}
                            value={mu}
                            onChange={e => setMu(Number(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                        <label htmlFor="sphere-color-picker">Sphere Color</label>
                        <input
                            id="sphere-color-picker"
                            type="color"
                            value={sphereColor}
                            onChange={e => setSphereColor(e.target.value)}
                            style={{ width: '100%', height: '30px', border: 'none', padding: 0, background: 'none', cursor: 'pointer' }}
                        />
                    </div>
                    <div style={{ marginBottom: 0 }}>
                        <label htmlFor="line-color-picker">Line Color</label>
                        <input
                            id="line-color-picker"
                            type="color"
                            value={lineColor}
                            onChange={e => setLineColor(e.target.value)}
                            style={{ width: '100%', height: '30px', border: 'none', padding: 0, background: 'none', cursor: 'pointer' }}
                        />
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
                    <CrochetItem2 pattern={rows} phys={phys} sphereColor={sphereColor} lineColor={lineColor} />
                </ErrorBoundary>
            </div>
        </div>
    );
};

export default Editor;
