import { useState } from 'react';
import GeneratorPage from './GeneratorPage';

interface ExamplesProps {
    onTransfer: (pattern: string) => void;
}

type Page = 'main' | 'sphere' | 'circle' | 'cone';

export default function Examples({ onTransfer }: ExamplesProps) {
    const [page, setPage] = useState<Page>('main');

    if (page !== 'main') {
        return <GeneratorPage type={page} onTransfer={onTransfer} onBack={() => setPage('main')} />;
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
                    onClick={() => setPage('sphere')}
                    icon={<SphereIcon />}
                />
                <ExampleCard
                    title="Circle Generator"
                    onClick={() => setPage('circle')}
                    icon={<CircleIcon />}
                />
                <ExampleCard
                    title="Cone Generator"
                    onClick={() => setPage('cone')}
                    icon={<ConeIcon />}
                />
            </div>
        </div>
    );
}

interface ExampleCardProps {
    title: string;
    onClick: () => void;
    icon: React.ReactNode;
}

function ExampleCard({ title, onClick, icon }: ExampleCardProps) {
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
                alignItems: 'center',
                textAlign: 'center',
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
            <div style={{ color: '#007acc', marginTop: '10px' }}>
                {icon}
            </div>
            <h3 style={{ margin: 0, color: '#eee' }}>{title}</h3>
        </div>
    );
}

function SphereIcon() {
    return (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M 12 22 A 4 10 0 0 1 12 2"></path>
            <path d="M 2 12 A 10 4 0 0 0 22 12"></path>
        </svg>
    );
}

function CircleIcon() {
    return (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
        </svg>
    );
}

function ConeIcon() {
    return (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L3 20 m 18 0 L12 2z" />
            <ellipse cx="12" cy="20" rx="9" ry="3" />
        </svg>
    );
}
