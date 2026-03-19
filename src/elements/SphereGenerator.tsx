import { useMemo, useState } from 'react';
import { generateSpherePattern } from '../simulation/generators';

interface SphereGeneratorProps {
    onTransfer: (pattern: string) => void;
    onBack: () => void;
}

export default function SphereGenerator({ onTransfer, onBack }: SphereGeneratorProps) {
    const [numRows, setNumRows] = useState(15);
    const pattern = useMemo(() => generateSpherePattern(numRows), [numRows]);

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
            <h2>Sphere Generator</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label>Total Rows (N):</label>
                <input
                    type="number"
                    value={numRows}
                    onChange={(e) => setNumRows(parseInt(e.target.value) || 0)}
                    style={{ padding: '5px', background: '#333', color: 'white', border: '1px solid #555' }}
                />
            </div>

            {numRows > 100 && <p style={{ color: '#ff6666' }}>Error: Pattern cannot exceed 100 rows.</p>}

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
                disabled={numRows > 100 || numRows <= 0}
                style={{
                    padding: '10px',
                    background: (numRows > 100 || numRows <= 0) ? '#444' : '#007acc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: (numRows > 100 || numRows <= 0) ? 'not-allowed' : 'pointer'
                }}
            >
                Transfer to Editor
            </button>
        </div>
    );
}
