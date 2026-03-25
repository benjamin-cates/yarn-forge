import React, { useCallback, useEffect, useMemo } from "react";
import { defaultText } from "../App";
import { parseRows, type Pattern } from "../parse";

export interface Header {
    name: string,
    autoTurn: boolean,
    autoJoin: boolean,
}

interface PieceEditorProps {
    text: string,
    setText: (text: string, id: number) => void,
    header: Header,
    setHeader: (header: Header, id: number) => void,
    id: number
    setPattern: (pattern: Pattern, id: number) => void,
}

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

export const PieceEditor: React.FC<PieceEditorProps> = ({ text, setText, header, setHeader, id, setPattern }) => {

    const editorRef = React.useRef<HTMLDivElement>(null);
    const overlayRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerText !== text) {
            editorRef.current.innerText = text;
        }
    }, []);

    const { errors, validation, pattern } = useMemo(() => {
        return parseRows(text, header);
    }, [text, header])

    useEffect(() => {
        setPattern(pattern, id);
    }, [setPattern, JSON.stringify(pattern), id]);

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
            setText(val, id);
        }
    }, [setText]);

    const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const val = target.innerText;

        // Save selection
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            setText(val, id);
            return;
        }

        const range = selection.getRangeAt(0);
        const preSelectionRange = range.cloneRange();
        preSelectionRange.selectNodeContents(target);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        const start = preSelectionRange.toString().length;

        setText(val, id);

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
        <div className="editor-piece">
            <div className="header-panel">
                <input
                    type="text"
                    className="piece-name-input"
                    value={header.name}
                    onChange={e => setHeader({ ...header, name: e.target.value }, id)}
                />
                <button
                    className={`piece-toggle-button ${header.autoTurn ? 'active' : ''}`}
                    onClick={() => setHeader({ ...header, autoTurn: !header.autoTurn }, id)}
                >
                    Always Turn
                </button>
                <button
                    className={`piece-toggle-button ${header.autoJoin ? 'active' : ''}`}
                    onClick={() => setHeader({ ...header, autoJoin: !header.autoJoin }, id)}
                >
                    Always Join
                </button>
            </div>
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
                    onKeyDown={(e) => { handleKeyDown(e); }}
                    onInput={handleInput}
                    onPaste={handlePaste}
                    className="editor-textarea"
                >
                    {defaultText}
                </div>
            </div>
        </div>
    );
};