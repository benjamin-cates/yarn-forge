import React, { useCallback } from "react";
import "../style/editor.css";


import { type Pattern } from "../parse";
import { PieceEditor, type Header } from "./PieceEditor";

interface EditorProps {
    setPatterns: React.Dispatch<React.SetStateAction<Pattern[]>>;
    patterns: Pattern[],
    sphereColor: string;
    setSphereColor: (color: string) => void;
    lineColor: string;
    setLineColor: (color: string) => void;
    totalStitches: number;
    hasChanges: boolean;
    handleRender: () => void;
    needsManualRender: boolean;
    texts: string[];
    setTexts: React.Dispatch<React.SetStateAction<string[]>>;
    headers: Header[];
    setHeaders: React.Dispatch<React.SetStateAction<Header[]>>;
}

const Editor: React.FC<EditorProps> = ({
    patterns: _patterns,
    setPatterns,
    sphereColor,
    setSphereColor,
    lineColor,
    setLineColor,
    totalStitches,
    hasChanges,
    handleRender,
    needsManualRender,
    texts,
    setTexts,
    headers,
    setHeaders,
}) => {
    const setSingleText = useCallback((text: string, id: number) => {
        setTexts(prev => {
            let next = prev.slice();
            next[id] = text;
            return next;
        });
    }, [setTexts]);
    const setSingleHeader = useCallback((header: Header, id: number) => {
        setHeaders(prev => {
            let next = prev.slice();
            next[id] = header;
            return next;
        });
    }, [setHeaders]);
    const setSinglePattern = useCallback((pattern: Pattern, id: number) => {
        setPatterns(prev => {
            let next = prev.slice();
            next[id] = pattern;
            return next;
        });
    }, [setPatterns]);
    const addNewPiece = () => {
        setHeaders(headers.concat({ name: "Piece " + (headers.length + 1), autoJoin: true, autoTurn: false }));
        setTexts(texts.concat("6 sc"));
    };

    return (
        <div className="editor-container">
            <div className="editor-top-panel">
                <div className="editor-header">
                    <h2 className="editor-title">Crochet Editor</h2>
                    <button className="add-piece-button" onClick={addNewPiece} title="Add new piece">
                        +
                    </button>
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
                {texts.map((text, i) => {
                    return <PieceEditor key={i} header={headers[i]} text={text} setHeader={setSingleHeader} setText={setSingleText} setPattern={setSinglePattern} id={i}></PieceEditor>


                })}
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
