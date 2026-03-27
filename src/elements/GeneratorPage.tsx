import { useMemo, useState } from 'react';
import { generateCirclePattern, generateSpherePattern, generateConePattern } from '../simulation/generators';

type GeneratorType = 'circle' | 'sphere' | 'cone';

interface GeneratorConfig {
    title: string;
    inputs: {
        label: string;
        key: string;
        type: 'number' | 'select';
        defaultValue: any;
        options?: { label: string; value: string }[];
        max?: number;
        errorMsg?: string;
    }[];
    generate: (params: any) => string;
    isValid: (params: any) => boolean;
}

const GENERATORS: Record<GeneratorType, GeneratorConfig> = {
    circle: {
        title: 'Circle Generator',
        inputs: [
            { label: 'Radius (Number of Rows):', key: 'radius', type: 'number', defaultValue: 5, max: 100, errorMsg: 'Radius cannot exceed 100.' },
            { label: 'Magic Ring Size:', key: 'mrSize', type: 'number', defaultValue: 6, max: 16, errorMsg: 'Magic ring size cannot exceed 16.' },
            {
                label: 'Stitch Type:',
                key: 'stitchType',
                type: 'select',
                defaultValue: 'sc',
                options: [
                    { label: 'sc (Single Crochet)', value: 'sc' },
                    { label: 'hdc (Half Double Crochet)', value: 'hdc' },
                    { label: 'dc (Double Crochet)', value: 'dc' },
                    { label: 'tc (Treble Crochet)', value: 'tc' }
                ]
            }
        ],
        generate: ({ radius, mrSize, stitchType }) => generateCirclePattern(radius, mrSize, stitchType),
        isValid: ({ radius, mrSize }) => radius > 0 && radius <= 100 && mrSize > 0 && mrSize <= 16
    },
    sphere: {
        title: 'Sphere Generator',
        inputs: [
            { label: 'Total Rows (N):', key: 'numRows', type: 'number', defaultValue: 15, max: 100, errorMsg: 'Pattern cannot exceed 100 rows.' }
        ],
        generate: ({ numRows }) => generateSpherePattern(numRows),
        isValid: ({ numRows }) => numRows > 0 && numRows <= 100
    },
    cone: {
        title: 'Cone Generator',
        inputs: [
            { label: 'Radius (Number of Rows):', key: 'radius', type: 'number', defaultValue: 10, max: 100, errorMsg: 'Radius cannot exceed 100.' },
            { label: 'Interior Angle (Degrees):', key: 'interiorAngle', type: 'number', defaultValue: 30, max: 90, errorMsg: 'Interior angle must be between 5 and 90 degrees.' },
            {
                label: 'Stitch Type:',
                key: 'stitchType',
                type: 'select',
                defaultValue: 'sc',
                options: [
                    { label: 'sc (Single Crochet)', value: 'sc' },
                    { label: 'hdc (Half Double Crochet)', value: 'hdc' },
                    { label: 'dc (Double Crochet)', value: 'dc' },
                    { label: 'tc (Treble Crochet)', value: 'tc' }
                ]
            }
        ],
        generate: ({ radius, interiorAngle, stitchType }) => generateConePattern(radius, interiorAngle, stitchType),
        isValid: ({ radius, interiorAngle }) => radius > 0 && radius <= 100 && interiorAngle > 5 && interiorAngle <= 90
    }
};

interface GeneratorPageProps {
    type: GeneratorType;
    onTransfer: (pattern: string) => void;
    onBack: () => void;
}

export default function GeneratorPage({ type, onTransfer, onBack }: GeneratorPageProps) {
    const config = GENERATORS[type];
    const [params, setParams] = useState(() => {
        const initialParams: any = {};
        config.inputs.forEach(input => {
            initialParams[input.key] = input.defaultValue;
        });
        return initialParams;
    });

    const pattern = useMemo(() => config.generate(params), [config, params]);
    const valid = config.isValid(params);

    const updateParam = (key: string, value: any) => {
        setParams((prev: any) => ({ ...prev, [key]: value }));
    };

    return (
        <div style={{ padding: '20px', color: 'white', display: 'flex', flexDirection: 'column', gap: '15px', height: "100%" }}>
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
            <h2>{config.title}</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {config.inputs.map(input => (
                    <div key={input.key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label>{input.label}</label>
                        {input.type === 'number' ? (
                            <input
                                type="number"
                                value={params[input.key]}
                                onChange={(e) => updateParam(input.key, parseInt(e.target.value) || 0)}
                                style={{ padding: '5px', background: '#333', color: 'white', border: '1px solid #555' }}
                            />
                        ) : (
                            <select
                                value={params[input.key]}
                                onChange={(e) => updateParam(input.key, e.target.value)}
                                style={{ padding: '5px', background: '#333', color: 'white', border: '1px solid #555' }}
                            >
                                {input.options?.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        )}
                        {input.max && params[input.key] > input.max && (
                            <p style={{ color: '#ff6666', fontSize: '12px', margin: 0 }}>{input.errorMsg}</p>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '10px' }}>
                <h3>Preview:</h3>
                <pre style={{
                    background: '#111',
                    padding: '10px',
                    borderRadius: '4px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    fontSize: '12px',
                    border: '1px solid #444'
                }}>
                    {pattern}
                </pre>
            </div>

            <button
                onClick={() => onTransfer(pattern)}
                disabled={!valid}
                style={{
                    padding: '10px',
                    background: !valid ? '#444' : '#007acc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: !valid ? 'not-allowed' : 'pointer'
                }}
            >
                Transfer to Editor
            </button>
        </div>
    );
}
