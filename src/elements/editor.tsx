import React, { useEffect, useCallback } from "react";
import { defaultText } from "../App";
import "../style/editor.css";

interface EditorLineProps {
    line: string;
    index: number;
    validation: any;
    hasError: boolean;
}

const EditorLine: React.FC<EditorLineProps> = ({ line, index, validation, hasError }) => {
    const hasValidationError = validation && !validation.isValid && line.trim().length > 0;
    return (
        <div className={`editor-line ${hasError ? 'error' : ''}`}>
            <span className="editor-linenumber">
                {index + 1}
            </span>
            <span className="editor-line-text">{line || ' '}</span>
            <div className="editor-validation-container">
                {hasValidationError && (
                    <div className="editor-validation-error">
                        Mismatch! Expected {validation.inputStitches} sts in prev layer.
                    </div>
                )}
                {validation && line.trim().length > 0 && !hasError && (
                    <span className="editor-stitch-count">
                        {validation.outputStitches}
                    </span>
                )}
            </div>
        </div>
    );
};

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

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        if (overlayRef.current) {
            overlayRef.current.scrollTop = e.currentTarget.scrollTop;
        }
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
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
    }, [setText]);

    const handleInput = useCallback((e: React.InputEvent<HTMLDivElement>) => {
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
    }, [setText]);

    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    }, []);

    return (
        <div className="editor-container">
            <div className="editor-top-panel">
                <div className="editor-header">
                    <h2 className="editor-title">Crochet Editor</h2>
                    <div className="editor-options">
                        <label className="editor-option-label">
                            <input type="checkbox" checked={autoJoin} onChange={e => setAutoJoin(e.target.checked)} />
                            Auto Join
                        </label>
                        <label className="editor-option-label">
                            <input type="checkbox" checked={autoTurn} onChange={e => setAutoTurn(e.target.checked)} />
                            Auto Turn
                        </label>
                    </div>
                </div>
                <div className="color-pickers">
                    <div className="color-picker-wrapper">
                        <input
                            id="sphere-color-picker"
                            className="color-picker-input"
                            type="color"
                            value={sphereColor}
                            onChange={e => setSphereColor(e.target.value)}
                        />
                    </div>
                    <div className="color-picker-wrapper">
                        <input
                            id="line-color-picker"
                            className="color-picker-input"
                            type="color"
                            value={lineColor}
                            onChange={e => setLineColor(e.target.value)}
                        />
                    </div>
                </div>
            </div>
            <div className="editor-main">
                <div className="editor-relative-wrapper">
                    <div
                        ref={overlayRef}
                        className="editor-overlay"
                    >
                        {text.split('\n').map((line, i) => (
                            <EditorLine
                                key={i}
                                line={line}
                                index={i}
                                validation={validation[i]}
                                hasError={errors[i]}
                            />
                        ))}
                    </div>
                    <div
                        ref={editorRef}
                        contentEditable
                        spellCheck="false"
                        suppressContentEditableWarning
                        onScroll={handleScroll}
                        onKeyDown={handleKeyDown}
                        onInput={handleInput}
                        onPaste={handlePaste}
                        className="editor-textarea"
                    >
                        {defaultText}
                    </div>
                </div>
                {needsManualRender && (
                    <div className="render-button-container" id="render_button">
                        <button
                            onClick={handleRender}
                            className={`render-button ${hasChanges ? 'has-changes' : ''}`}
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
