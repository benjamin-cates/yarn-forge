import React from 'react';
import { type PreviewConfig } from '../App';

interface StitchExampleProps {
    name: string;
    description: string;
    config: PreviewConfig;
    explanation: string;
    isActive: boolean;
    onClick: (config: PreviewConfig) => void;
}

const StitchExample: React.FC<StitchExampleProps> = ({ name, description, config, explanation, isActive, onClick }) => {
    return (
        <li
            style={{
                cursor: 'pointer',
                padding: '12px',
                borderRadius: '8px',
                background: isActive ? 'rgba(255, 255, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                border: isActive ? '1px solid #ffff00' : '1px solid transparent',
                marginBottom: '12px',
                transition: 'all 0.2s',
                boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.3)' : 'none'
            }}
            onClick={() => onClick(config)}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <code style={{ color: isActive ? '#ffff00' : '#fff', fontWeight: 'bold', fontSize: '1.1em' }}>{name}</code>
                {isActive && <span style={{ fontSize: '10px', color: '#ffff00', textTransform: 'uppercase', fontWeight: 'bold' }}>Active Preview</span>}
            </div>
            <div style={{ fontSize: '14px', color: isActive ? '#fff' : '#ccc' }}>{description}</div>

            {isActive && (
                <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', borderLeft: '3px solid #ffff00' }}>
                    <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 'bold' }}>Pattern Text</div>
                    <pre style={{ margin: 0, color: '#00ff00', fontSize: '13px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>{config.pattern.replace(/\\n/g, '\n')}</pre>
                    <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginTop: '8px', marginBottom: '4px', fontWeight: 'bold' }}>Settings Overridden</div>
                    <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '8px' }}>
                        autoJoin: <code style={{ color: config.autoJoin ? '#00ff00' : '#ff4444' }}>{String(!!config.autoJoin)}</code> |
                        autoTurn: <code style={{ color: config.autoTurn ? '#00ff00' : '#ff4444' }}>{String(!!config.autoTurn)}</code>
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginTop: '8px', marginBottom: '4px', fontWeight: 'bold' }}>What's happening?</div>
                    <div style={{ fontSize: '13px', color: '#eee', lineHeight: '1.4' }}>{explanation}</div>
                </div>
            )}

            <div style={{ fontSize: '11px', color: isActive ? '#ffff00' : '#666', fontStyle: 'italic', marginTop: '8px' }}>
                {isActive ? 'Click to clear preview' : 'Click to see pattern & 3D preview'}
            </div>
        </li>
    );
};

const docs_patterns: Record<string, PreviewConfig> = {
    basic_stitches: { pattern: "4sc\nsc#single, hdc#half_double,dc#double,tc#treble", autoJoin: false, autoTurn: false },
    shaping: { pattern: "6sc\n6inc\n6x(inc, sc)\n18sc\n6x(dec, sc)\n6dec", autoJoin: true, autoTurn: false },
    voids: { pattern: "6sc\n6x(dc, 3ch#chain)\n12x(dc, 2ch, sk)", autoJoin: true, autoTurn: false },
    join: { pattern: "6sc\n6sc, join", autoJoin: false, autoTurn: false },
    turn: { pattern: "8sc\nsc#start1, dc, 5sc, sc#end1, turn\nsc#start2, dc, 5sc, sc#end2", autoJoin: false, autoTurn: false },
    together: { pattern: "9sc\n3x(sc, (sc, dc) together)", autoJoin: true, autoTurn: false },
    in: { pattern: "6sc\n6x(2sc in next)", autoJoin: false, autoTurn: false },
    near_hook: { pattern: "ch 8, sc in hook-3", autoJoin: false, autoTurn: false },
    markers: { pattern: "3 ch, ch#red, 2ch, dc in red, 2ch", autoJoin: false, autoTurn: false }
};

export default function Docs({ activePattern, onSelectPattern }: { activePattern: string | null, onSelectPattern: (config: PreviewConfig) => void }) {
    return (
        <div style={{ padding: '20px', color: '#ccc', lineHeight: '1.6', overflowY: 'auto', height: '100%' }}>
            <section>
                <h3 style={{ color: '#fff' }}>Language Syntax</h3>
                <p>The simulator uses a custom domain-specific language to describe crochet patterns. Each line represents a row or round.</p>

                <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '12px' }}>Stitch Examples</div>
                <ul style={{ marginTop: 0, listStyle: 'none', paddingLeft: 0 }}>
                    <StitchExample
                        onClick={onSelectPattern}
                        isActive={activePattern === docs_patterns.basic_stitches.pattern}
                        name="Basic Stitches (sc, hdc, dc, tc)"
                        description="Demonstrates the varying heights of single, half-double, double, and treble crochet."
                        config={docs_patterns.basic_stitches}
                        explanation="Starting from a base of 7 single crochets, this row works one of each stitch type. Notice how the 'tc' (treble) is much taller than the 'sc' (single), creating a peaked shape."
                    />
                    <StitchExample
                        onClick={onSelectPattern}
                        isActive={activePattern === docs_patterns.shaping.pattern}
                        name="Shaping (inc, dec)"
                        description="Shows how to increase (add stitches) and decrease (remove stitches)."
                        config={docs_patterns.shaping}
                        explanation="The 'inc' works two stitches into one, widening the fabric. The 'dec' joins two stitches together at the top, narrowing it. Combined, they allow for complex 3D forms."
                    />
                    <StitchExample
                        onClick={onSelectPattern}
                        isActive={activePattern === docs_patterns.voids.pattern}
                        name="Voids (ch, sk)"
                        description="Creates gaps in the fabric using chains and skips."
                        config={docs_patterns.voids}
                        explanation="A 'ch' (chain) adds a new stitch in the current row without connecting to the previous one. A 'sk' (skip) passes over a stitch in the previous row. This creates eyelets or 'holes' in the work."
                    />
                    <StitchExample
                        onClick={onSelectPattern}
                        isActive={activePattern === docs_patterns.join.pattern}
                        name="join"
                        description="Connects the end of a row back to the start."
                        config={docs_patterns.join}
                        explanation="The 'join' command creates a connection between the last stitch of the row and the first stitch of the same row. This example uses autoJoin: true to form the ring."
                    />
                    <StitchExample
                        onClick={onSelectPattern}
                        isActive={activePattern === docs_patterns.turn.pattern}
                        name="turn"
                        description="Flips the work to go back in the opposite direction."
                        config={docs_patterns.turn}
                        explanation="Normally stitches progress in one direction. 'turn' indicates that the next row should be worked in reverse. This example uses autoTurn: true to ensure the second row reverses correctly."
                    />
                </ul>

                <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '12px', marginTop: '24px' }}>Advanced Concepts</div>
                <ul style={{ marginTop: 0, listStyle: 'none', paddingLeft: 0 }}>
                    <StitchExample
                        onClick={onSelectPattern}
                        isActive={activePattern === docs_patterns.together.pattern}
                        name="together"
                        description="Cluster stitches together into one top (like decrease)."
                        config={docs_patterns.together}
                        explanation="Unlike a standard decrease, 'together' can be used with any number of stitches to create clusters or bobbles."
                    />
                    <StitchExample
                        onClick={onSelectPattern}
                        isActive={activePattern === docs_patterns.in.pattern}
                        name="'in' fanning"
                        description="Work multiple stitches into a single base."
                        config={docs_patterns.in}
                        explanation="Directly specifies that multiple stitches should share the same base stitch. 'inc' is an alias for '2sc in next'."
                    />
                    <StitchExample
                        onClick={onSelectPattern}
                        isActive={activePattern === docs_patterns.near_hook.pattern}
                        name="Near hook markers"
                        description="Work stitches near the hook (ex. 2nd chain from hook)"
                        config={docs_patterns.near_hook}
                        explanation="This pattern shows a chain 8 then a stitch in the '3rd stitch from hook', which is encoded as 'hook-3' in Yarn Forge. This is interpreted as 'hook position minus 3 stitches'."
                    />

                    <StitchExample
                        onClick={onSelectPattern}
                        isActive={activePattern === docs_patterns.markers.pattern}
                        name="Markers (#tag)"
                        description="Tag stitches to reference them later."
                        config={docs_patterns.markers}
                        explanation="By tagging a stitch with '#red', you can work into it later using 'in red', regardless of where you are in the pattern. You can also use relative markers like 'in red+1' or 'in red-1' to work in the stitches near red. Any markers named after colors will be that color in the 3D preview."
                    />
                </ul>
            </section>

            <hr style={{ borderColor: '#444', margin: '30px 0' }} />

            <section>
                <h2 style={{ color: '#fff' }}>Camera Controls</h2>
                <p>The 3D preview can be manipulated using your mouse or touch:</p>
                <ul>
                    <li><strong>Rotate:</strong> Left-click and drag.</li>
                    <li><strong>Zoom:</strong> Use the scroll wheel.</li>
                    <li><strong>Pan:</strong> Right-click and drag, or use <code>Ctrl + Left-click</code> and drag.</li>
                </ul>
            </section>

            <hr style={{ borderColor: '#444', margin: '30px 0' }} />

            <section>
                <h2 style={{ color: '#fff' }}>Simulation Config</h2>
                <p>The physics engine relaxes the stitches into a natural shape based on these parameters:</p>

                <h3 style={{ color: '#fff' }}>Basic Settings</h3>
                <ul>
                    <li><strong>Simulation steps:</strong> How many iterations to run. More steps result in a more stable but slower simulation.</li>
                    <li><strong>Stretchiness:</strong> Controls the spring constant of the yarn. High stretchiness makes the fabric more elastic.</li>
                    <li><strong>Stuffing:</strong> Adds internal repulsion forces to simulate filling.</li>
                </ul>

                <h3 style={{ color: '#fff' }}>Experimental Settings</h3>
                <ul>
                    <li><strong>Spring Constant:</strong> The stiffness of the connections between stitches. Higher numbers mean the stitches are less able to stretch.</li>
                    <li><strong>Orthogonality:</strong> Forces stitches to try and stay perpendicular to their neighbors, helping define the fabric structure.</li>
                    <li><strong>Lambda (λ):</strong> Controls Taubin smoothing to reduce surface noise without shrinking the model.</li>
                    <li><strong>Repulsion:</strong> The strength of the force pushing stitches apart to prevent overlapping.</li>
                    <li><strong>Repulsion Radius:</strong> How close elements that will not be repulsed are.</li>
                    <li><strong>Repulsion Mode:</strong> Different algorithms for calculating repulsion. Recommended either Stochastic (fast, default) or Repulsion (accurate).</li>
                </ul>
            </section>
        </div>
    );
}
