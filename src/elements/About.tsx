import React from 'react';

const About: React.FC = () => {
    return (
        <div style={{ padding: '20px', color: '#ccc', lineHeight: '1.6', overflowY: 'auto', height: '100%' }}>
            <h2 style={{ color: '#fff', marginBottom: '16px' }}>About Yarn Forge</h2>

            <section style={{ marginBottom: '24px' }}>
                <p>
                    <strong>Yarn Forge</strong> is an interactive 3D crochet pattern simulator and editor.
                </p>
            </section>

            <section style={{ marginBottom: '24px' }}>
                <h3 style={{ color: '#fff', fontSize: '1.1em', marginBottom: '8px' }}>Key Features</h3>
                <ul style={{ paddingLeft: '20px' }}>
                    <li><strong>Real-time 3D Rendering:</strong> See your pattern come to life as you type.</li>
                    <li><strong>Physics-based Simulation:</strong> Stitches relax into natural shapes using a spring-mass system. Edit physics parameters to perfect models.</li>
                    <li><strong>Custom pattern generators:</strong> Build spheres, circles, and more!</li>
                </ul>
            </section>

            <section style={{ marginBottom: '24px' }}>
                <h3 style={{ color: '#fff', fontSize: '1.1em', marginBottom: '8px' }}>Open Source</h3>
                <p>
                    Yarn Forge is an open-source project. You can find the source code, report issues, or contribute on GitHub:
                </p>
                <div style={{ marginTop: '12px' }}>
                    <a
                        href="https://github.com/benjamin-cates/yarn-forge"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-block',
                            padding: '10px 20px',
                            background: '#ffff00',
                            color: '#000',
                            textDecoration: 'none',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            transition: 'opacity 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                        onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                    >
                        View on GitHub
                    </a>
                </div>
            </section>

            <footer style={{ fontSize: '0.9em', color: '#888' }}>
                <p>Co-authored by Benjamin Cates and Gemini 3.0 Flash. Released under the MIT License without copyright.</p>
            </footer>
        </div>
    );
};

export default About;
