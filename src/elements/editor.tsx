import React, { useEffect } from "react";
import { defaultText } from "../App";

interface EditorProps {
    text: string;
    setText: (text: string) => void;
    autoJoin: boolean;
    setAutoJoin: (autoJoin: boolean) => void;
    autoTurn: boolean;
    setAutoTurn: (autoTurn: boolean) => void;
    sphereColor: string;
    setSphereColor: (color: string) => void;
    lineColor: string;
    setLineColor: (color: string) => void;
    totalStitches: number;
    hasChanges: boolean;
    handleRender: () => void;
    needsManualRender: boolean;
    validation: any[];
    errors: boolean[];
}

const Editor: React.FC<EditorProps> = ({
    text,
    setText,
    autoJoin,
    setAutoJoin,
    autoTurn,
    setAutoTurn,
    sphereColor,
    setSphereColor,
    lineColor,
    setLineColor,
    totalStitches,
    hasChanges,
    handleRender,
    needsManualRender,
    validation,
    errors,
}) => {
    const editorRef = React.useRef<HTMLDivElement>(null);
    const overlayRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerText !== text) {
            editorRef.current.innerText = text;
        }
    }, []);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#222', color: '#fff', minHeight: 0 }}>
            <div style={{ padding: 16, overflowY: 'auto', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>Crochet Editor</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input type="checkbox" checked={autoJoin} onChange={e => setAutoJoin(e.target.checked)} />
                            Auto Join
                        </label>
                        <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input type="checkbox" checked={autoTurn} onChange={e => setAutoTurn(e.target.checked)} />
                            Auto Turn
                        </label>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', }}>
                    <div style={{ flex: 1 }}>
                        <input
                            id="sphere-color-picker"
                            type="color"
                            value={sphereColor}
                            onChange={e => setSphereColor(e.target.value)}
                            style={{ width: '100%', height: '30px', border: 'none', padding: 0, background: 'none', cursor: 'pointer' }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
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
            <div style={{ flex: 1, padding: 16, paddingTop: 0, boxSizing: "border-box", background: "#222", color: "#fff", display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
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
                {needsManualRender && (
                    <div style={{
                        padding: '12px 0',
                        display: 'flex',
                        justifyContent: 'center',
                        background: '#222',
                        borderTop: '1px solid #444',
                        zIndex: 101
                    }}>
                        <button
                            onClick={handleRender}
                            style={{
                                padding: '8px 24px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                backgroundColor: hasChanges ? '#4CAF50' : '#555',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (hasChanges) e.currentTarget.style.backgroundColor = '#45a049';
                            }}
                            onMouseLeave={(e) => {
                                if (hasChanges) e.currentTarget.style.backgroundColor = '#4CAF50';
                            }}
                        >
                            {hasChanges ? 'Render Changes!' : 'Up to Date'} ({totalStitches} stitches)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Editor;
