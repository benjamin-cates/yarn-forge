import { useState } from 'react';
import SphereGenerator from './SphereGenerator';
import CircleGenerator from './CircleGenerator';

interface ExamplesProps {
    onTransfer: (pattern: string) => void;
}

type Page = 'main' | 'sphere' | 'circle';

export default function Examples({ onTransfer }: ExamplesProps) {
    const [page, setPage] = useState<Page>('main');

    if (page === 'sphere') {
        return <SphereGenerator onTransfer={onTransfer} onBack={() => setPage('main')} />;
    }

    if (page === 'circle') {
        return <CircleGenerator onTransfer={onTransfer} onBack={() => setPage('main')} />;
    }

    return (
        <div style={{ padding: '20px', color: 'white' }}>
            <h1>Examples & Generators</h1>
            <p style={{ marginBottom: '20px', color: '#ccc' }}>Select a generator to create a pattern.</p>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '20px'
            }}>
                <ExampleCard
                    title="Sphere Generator"
                    description="Create a 3D spherical pattern with customizable row count."
                    onClick={() => setPage('sphere')}
                />
                <ExampleCard
                    title="Circle Generator"
                    description="Generate flat circular patterns with different stitch types."
                    onClick={() => setPage('circle')}
                />
            </div>
        </div>
    );
}

interface ExampleCardProps {
    title: string;
    description: string;
    onClick: () => void;
}

function ExampleCard({ title, description, onClick }: ExampleCardProps) {
    return (
        <div
            onClick={onClick}
            style={{
                background: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: '8px',
                padding: '15px',
                cursor: 'pointer',
                transition: 'transform 0.2s, background 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = '#333';
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = '#2a2a2a';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            <h3 style={{ margin: 0, color: '#007acc' }}>{title}</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#bbb' }}>{description}</p>
        </div>
    );
}
