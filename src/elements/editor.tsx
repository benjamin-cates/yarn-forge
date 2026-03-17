import React, { useState, useMemo } from "react";
import { calculateInputStitches, calculateOutputStitches, type RowPiece, parseRows } from "../parse";
import { CrochetItem } from "./CrochetItem";
import type { PhysConfig } from "../simulation/phys";
import { HeatmapIndex } from "../simulation/experimental";

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

const defaultText = `6sc
6x(2 sc in same)
6x(sc, 2 sc in same)
6x(2 sc, 2 sc in same)
24 sc
6x(3 sc, 2 sc in same)
30 sc
30 sc
30 sc
30 sc
6x(3 sc, 2 sc together)
24xsc
6x(2 sc, 2 sc together)
6x(sc, 2 sc together)
6x(2 sc together)`;


const Editor: React.FC = () => {
    const [text, setText] = useState(defaultText);
    const editorRef = React.useRef<HTMLDivElement>(null);
    const overlayRef = React.useRef<HTMLDivElement>(null);

    const [sidebarWidth, setSidebarWidth] = useState(420);
    const [isResizing, setIsResizing] = useState(false);

    const startResizing = React.useCallback(() => {
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

    const { rows, errors, validation } = useMemo(() => parseRows(text), [text]);

    const finalRows = useMemo(() => {
        let currentRowLength = 1000;
        const result: RowPiece[][] = [];
        for (let i = 0; i < rows.length; i++) {
            if (errors[i]) {
                break;
            }
            if (rows[i].length === 0) {
                result.push([]);
                continue;
            }
            const required = calculateInputStitches(rows[i]);
            if (required > currentRowLength) {
                break;
            }
            result.push(rows[i]);
            currentRowLength = calculateOutputStitches(rows[i]);
        }
        return result;
    }, [rows, errors]);

    React.useEffect(() => {
        if (editorRef.current && editorRef.current.innerText !== text) {
            editorRef.current.innerText = text;
        }
    }, []);
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
    const [autoJoin, setAutoJoin] = useState(false);
    const [autoTurn, setAutoTurn] = useState(false);

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
            <div style={{ width: `${sidebarWidth}px`, display: 'flex', flexDirection: 'column', background: '#222', color: '#fff', boxShadow: '2px 0 8px #0004', zIndex: 2 }}>
                <div style={{ padding: 16, overflowY: 'auto', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0 }}>Simulation Controls</h2>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input type="checkbox" checked={autoJoin} onChange={e => setAutoJoin(e.target.checked)} />
                                Join
                            </label>
                            <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input type="checkbox" checked={autoTurn} onChange={e => setAutoTurn(e.target.checked)} />
                                Turn
                            </label>
                            <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input type="checkbox" checked={experimental} onChange={e => setExperimental(e.target.checked)} />
                                Exp.
                            </label>
                        </div>
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
                    <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                        <div
                            ref={overlayRef}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                pointerEvents: 'none',
                                whiteSpace: 'pre-wrap',
                                fontFamily: "monospace",
                                fontSize: 16,
                                lineHeight: '1.4em',
                                padding: 8,
                                color: '#fff',
                                border: '1px solid transparent',
                                zIndex: 100
                            }}
                        >
                            {text.split('\n').map((line, i) => {
                                const v = validation[i];
                                const hasValidationError = v && !v.isValid && line.trim().length > 0;
                                return (
                                    <div key={i} style={{
                                        color: errors[i] ? '#ff5555' : '#fff',
                                        minHeight: '1.4em',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        position: 'relative',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        <span>{line || ' '}</span>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            {hasValidationError && (
                                                <div style={{
                                                    background: '#ffaa00',
                                                    color: '#000',
                                                    fontSize: '11px',
                                                    padding: '0px 6px',
                                                    lineHeight: "1.2em",
                                                    borderRadius: '4px',
                                                    fontWeight: 'bold',
                                                    marginLeft: '10px',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                                    position: "absolute",
                                                    left: "calc(100% + 5px)",
                                                    zIndex: 100,
                                                }}>
                                                    Mismatch! Expected {v.inputStitches} sts in prev layer.
                                                </div>
                                            )}
                                            {v && line.trim().length > 0 && !errors[i] && (
                                                <span style={{ fontSize: '12px', color: '#888', marginLeft: '10px', flexShrink: 0 }}>
                                                    {v.outputStitches}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div
                            ref={editorRef}
                            contentEditable
                            spellCheck="false"
                            suppressContentEditableWarning
                            onScroll={(e) => {
                                if (overlayRef.current) {
                                    overlayRef.current.scrollTop = e.currentTarget.scrollTop;
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const selection = window.getSelection();
                                    if (!selection || selection.rangeCount === 0) return;
                                    const range = selection.getRangeAt(0);
                                    range.deleteContents();

                                    const textNode = document.createTextNode('\n');
                                    range.insertNode(textNode);

                                    const isAtEnd = (container: Node, offset: number) => {
                                        if (container === e.currentTarget) return offset === container.childNodes.length;
                                        let curr: Node | null = container;
                                        while (curr && curr !== e.currentTarget) {
                                            if (curr.nextSibling) return false;
                                            curr = curr.parentNode;
                                        }
                                        return offset === (container.nodeType === Node.TEXT_NODE ? container.textContent?.length : container.childNodes.length);
                                    };

                                    if (isAtEnd(range.endContainer, range.endOffset)) {
                                        const extraNode = document.createTextNode('\n');
                                        range.insertNode(extraNode);
                                    }

                                    range.setStartAfter(textNode);
                                    range.setEndAfter(textNode);
                                    selection.removeAllRanges();
                                    selection.addRange(range);

                                    const val = (e.currentTarget as HTMLDivElement).innerText;
                                    setText(val);
                                }
                            }}
                            onInput={(e) => {
                                const target = e.currentTarget;
                                const val = target.innerText;

                                // Save selection
                                const selection = window.getSelection();
                                if (!selection || selection.rangeCount === 0) {
                                    setText(val);
                                    return;
                                }

                                const range = selection.getRangeAt(0);
                                const preSelectionRange = range.cloneRange();
                                preSelectionRange.selectNodeContents(target);
                                preSelectionRange.setEnd(range.startContainer, range.startOffset);
                                const start = preSelectionRange.toString().length;

                                setText(val);

                                // Restore selection after React render
                                requestAnimationFrame(() => {
                                    if (!editorRef.current) return;
                                    const newRange = document.createRange();
                                    const selection = window.getSelection();
                                    if (!selection) return;

                                    let charCount = 0;
                                    const nodeStack: Node[] = [editorRef.current];

                                    while (nodeStack.length > 0) {
                                        const node = nodeStack.pop()!;
                                        if (node.nodeType === Node.TEXT_NODE) {
                                            const nextCharCount = charCount + node.textContent!.length;
                                            if (start <= nextCharCount) {
                                                newRange.setStart(node, start - charCount);
                                                newRange.collapse(true);
                                                selection.removeAllRanges();
                                                selection.addRange(newRange);
                                                break;
                                            }
                                            charCount = nextCharCount;
                                        } else {
                                            for (let i = node.childNodes.length - 1; i >= 0; i--) {
                                                nodeStack.push(node.childNodes[i]);
                                            }
                                        }
                                    }
                                });
                            }}
                            onPaste={(e) => {
                                e.preventDefault();
                                const text = e.clipboardData.getData('text/plain');
                                document.execCommand('insertText', false, text);
                            }}
                            style={{
                                width: "100%",
                                height: "100%",
                                background: "#111",
                                color: "transparent",
                                caretColor: "#fff",
                                fontFamily: "monospace",
                                fontSize: 16,
                                lineHeight: '1.4em',
                                border: "1px solid #444",
                                borderRadius: 4,
                                padding: 8,
                                boxSizing: 'border-box',
                                outline: 'none',
                                overflowY: 'auto',
                                whiteSpace: 'pre-wrap',
                                position: 'relative',
                                zIndex: 2
                            }}
                        >
                            {defaultText}
                        </div>
                    </div>
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
            <div style={{ width: `calc(100vw - ${sidebarWidth}px)`, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", position: 'relative', zIndex: 0 }}>
                <ErrorBoundary set={() => (<div>Something went wrong</div>)}>
                    <CrochetItem
                        pattern={finalRows}
                        phys={phys}
                        sphereColor={sphereColor}
                        lineColor={lineColor}
                        experimental={experimental}
                        autoJoin={autoJoin}
                        autoTurn={autoTurn}
                    />
                </ErrorBoundary>
                {experimental && <HeatmapIndex />}
            </div>
        </div>
    );
};

export default Editor;
