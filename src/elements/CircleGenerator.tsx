import { useMemo, useState } from 'react';
import { generateCirclePattern } from '../simulation/generators';

interface CircleGeneratorProps {
    onTransfer: (pattern: string) => void;
    onBack: () => void;
}

export default function CircleGenerator({ onTransfer, onBack }: CircleGeneratorProps) {
    const [radius, setRadius] = useState(5);
    const [mrSize, setMrSize] = useState(6);
    const [stitchType, setStitchType] = useState<"sc" | "hdc" | "dc" | "tc">("sc");

    const pattern = useMemo(() =>
        generateCirclePattern(radius, mrSize, stitchType),
        [radius, mrSize, stitchType]
    );

    return (
        <div style={{ padding: '20px', color: 'white', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <button
                onClick={onBack}
                style={{
                    alignSelf: 'flex-start',
                    padding: '5px 10px',
                    background: '#444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginBottom: '10px'
                }}
            >
                ← Back to Examples
            </button>
            <h2>Circle Generator</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label>Radius (Number of Rows):</label>
                    <input
                        type="number"
                        value={radius}
                        onChange={(e) => setRadius(parseInt(e.target.value) || 0)}
                        style={{ padding: '5px', background: '#333', color: 'white', border: '1px solid #555' }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label>Magic Ring Size:</label>
                    <input
                        type="number"
                        value={mrSize}
                        onChange={(e) => setMrSize(parseInt(e.target.value) || 0)}
                        style={{ padding: '5px', background: '#333', color: 'white', border: '1px solid #555' }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label>Stitch Type:</label>
                    <select
                        value={stitchType}
                        onChange={(e) => setStitchType(e.target.value as any)}
                        style={{ padding: '5px', background: '#333', color: 'white', border: '1px solid #555' }}
                    >
                        <option value="sc">sc (Single Crochet)</option>
                        <option value="hdc">hdc (Half Double Crochet)</option>
                        <option value="dc">dc (Double Crochet)</option>
                    </select>
                </div>
            </div>

            {radius > 100 && <p style={{ color: '#ff6666' }}>Error: Radius cannot exceed 100.</p>}
            {mrSize > 16 && <p style={{ color: '#ff6666' }}>Error: Magic ring size cannot exceed 16.</p>}

            <div style={{ marginTop: '10px' }}>
                <h3>Preview:</h3>
                <pre style={{
                    background: '#111',
                    padding: '10px',
                    borderRadius: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    fontSize: '12px',
                    border: '1px solid #444'
                }}>
                    {pattern}
                </pre>
            </div>

            <button
                onClick={() => onTransfer(pattern)}
                disabled={radius > 100 || radius <= 0 || mrSize > 16 || mrSize <= 0}
                style={{
                    padding: '10px',
                    background: (radius > 100 || radius <= 0 || mrSize > 16 || mrSize <= 0) ? '#444' : '#007acc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: (radius > 100 || radius <= 0 || mrSize > 16 || mrSize <= 0) ? 'not-allowed' : 'pointer'
                }}
            >
                Transfer to Editor
            </button>
        </div>
    );
}
