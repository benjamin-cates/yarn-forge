import React, { useState, useMemo, useEffect, useCallback } from 'react';
import './style/App.css';
import Editor from './elements/editor';
import Docs from './elements/Docs';
import Examples from './elements/Examples';
import About from './elements/About';
import { CrochetItem } from "./elements/CrochetItem";
import { PhysicsConfig } from "./elements/PhysicsConfig";
import { HeatmapIndex } from "./simulation/experimental";
import { calculateInputStitches, calculateOutputStitches, type RowPiece, parseRows } from "./parse";
import type { PhysConfig } from "./simulation/phys";

type Page = 'editor' | 'docs' | 'examples' | 'about';

function getFinalRows(rows: RowPiece[][], errors: any[]): RowPiece[][] {
  let currentRowLength = 1000;
  const result: RowPiece[][] = [];
  for (let i = 0; i < rows.length; i++) {
    if (errors[i]) {
      break;
    }
    if (rows[i].length === 0) {
      result.push([]);
      continue;
    }
    const required = calculateInputStitches(rows[i]);
    if (required > currentRowLength) {
      break;
    }
    result.push(rows[i]);
    currentRowLength = calculateOutputStitches(rows[i]);
  }
  return result;
}

export interface PreviewConfig {
  pattern: string;
  autoJoin?: boolean;
  autoTurn?: boolean;
}

class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    set: (error: any) => void;
  },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    this.props.set(error);
  }
  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export const defaultText = `6sc
6 inc
6x(sc, inc)
6x(2 sc, inc)
24 sc
6x(3 sc, inc)
6x(3 sc, dec)
24xsc
6x(2 sc, dec)
6x(sc, dec)
6 dec`;

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('editor');
  const [activePreview, setActivePreview] = useState<PreviewConfig | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);

  // Editor State
  const [text, setText] = useState(defaultText);
  const [autoJoin, setAutoJoin] = useState(true);
  const [autoTurn, setAutoTurn] = useState(false);
  const [sphereColor, setSphereColor] = useState("#ffffff");
  const [lineColor, setLineColor] = useState("#ffff00");
  const [phys, setPhys] = useState<PhysConfig>({
    iterations: 150,
    spring_constant: 0.5,
    ortho_constant: 0.6,
    repulsionStrength: 1,
    repulsionRadius: 2.3,
    repulsionMode: "stochastic",
    lambda: 0.5,
  });
  const [experimental, setExperimental] = useState(false);
  const [hasTextChanges, setHasTextChanges] = useState(false);

  // Derived State
  const { rows, errors, validation } = useMemo(() => {
    return parseRows(text)
  }, [text]);

  const totalStitches = useMemo(() => {
    return validation.reduce((acc, v) => acc + (v?.outputStitches ?? 0), 0);
  }, [validation]);

  const finalRows = useMemo(() => getFinalRows(rows, errors), [rows, errors]);

  const needsManualRender = totalStitches > 280;
  const [lastRenderedPattern, setLastRenderedPattern] = useState<RowPiece[][]>(finalRows);
  const [lastRenderedPhys, setLastRenderedPhys] = useState<PhysConfig>(phys);

  useEffect(() => {
    if (!needsManualRender) {
      console.log("App: Syncing lastRendered because !needsManualRender");
      setLastRenderedPattern(prev => (JSON.stringify(prev) === JSON.stringify(finalRows) ? prev : finalRows));
      setLastRenderedPhys(prev => (JSON.stringify(prev) === JSON.stringify(phys) ? prev : phys));
    }
  }, [finalRows, phys, needsManualRender]);

  const handleRender = useCallback((patternOverride?: RowPiece[][], physOverride?: PhysConfig) => {
    console.log("App: Manually rendering");
    const pattern = patternOverride ?? finalRows;
    const p = physOverride ?? phys;
    setLastRenderedPattern(prev => (JSON.stringify(prev) === JSON.stringify(pattern) ? prev : pattern));
    setLastRenderedPhys(prev => (JSON.stringify(prev) === JSON.stringify(p) ? prev : p));
    setHasTextChanges(false);
  }, [finalRows, phys]);

  const patternToRender = useMemo(() => {
    if (activePreview) {
      const { rows, errors } = parseRows(activePreview.pattern);
      if (errors.every((e) => !e)) {
        return rows;
      }
    }
    return needsManualRender ? (lastRenderedPattern ?? finalRows) : finalRows;
  }, [activePreview, needsManualRender, lastRenderedPattern, finalRows]);

  const physToRender = needsManualRender ? (lastRenderedPhys ?? phys) : phys;

  const hasChanges = useMemo(() => {
    if (!needsManualRender) return false;
    return hasTextChanges ||
      JSON.stringify(phys) !== JSON.stringify(lastRenderedPhys);
  }, [phys, lastRenderedPhys, needsManualRender, hasTextChanges]);

  // Resizing logic
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX;
        if (newWidth >= 320 && newWidth <= 800) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize, { capture: true });
    window.addEventListener("mouseup", stopResizing, { capture: true });
    return () => {
      window.removeEventListener("mousemove", resize, { capture: true });
      window.removeEventListener("mouseup", stopResizing, { capture: true });
    };
  }, [resize]);

  const renderSidebarContent = () => {
    switch (currentPage) {
      case 'editor':
        return <Editor
          text={text}
          setText={(t) => { setText(t); setHasTextChanges(true); }}
          autoJoin={autoJoin}
          setAutoJoin={setAutoJoin}
          autoTurn={autoTurn}
          setAutoTurn={setAutoTurn}
          sphereColor={sphereColor}
          setSphereColor={setSphereColor}
          lineColor={lineColor}
          setLineColor={setLineColor}
          totalStitches={totalStitches}
          hasChanges={hasChanges}
          handleRender={() => handleRender()}
          needsManualRender={needsManualRender}
          validation={validation}
          errors={errors}
        />;
      case 'docs':
        return (
          <Docs
            activePattern={activePreview?.pattern ?? null}
            onSelectPattern={(p) => setActivePreview((curr) => (curr?.pattern === p.pattern ? null : p))}
          />
        );
      case 'examples':
        return <Examples onTransfer={(p) => {
          const { rows, errors } = parseRows(p);
          const fr = getFinalRows(rows, errors);
          setText(p);
          setCurrentPage('editor');
          handleRender(fr, phys);
        }} />;
      case 'about':
        return <About />;
      default:
        return null;
    }
  };

  return (
    <div className="app-container" style={{ userSelect: isResizing ? 'none' : 'auto' }}>
      <main className="content" style={{ display: 'flex', flexDirection: 'row', height: '100%', overflow: 'hidden' }}>
        <div style={{ width: `${sidebarWidth}px`, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <nav className="top-nav">
            <button
              className={currentPage === 'editor' ? 'active' : ''}
              onClick={() => setCurrentPage('editor')}
            >
              Editor
            </button>
            <button
              className={currentPage === 'docs' ? 'active' : ''}
              onClick={() => setCurrentPage('docs')}
            >
              Docs
            </button>
            <button
              className={currentPage === 'examples' ? 'active' : ''}
              onClick={() => setCurrentPage('examples')}
            >
              Examples
            </button>
            <button
              className={currentPage === 'about' ? 'active' : ''}
              onClick={() => setCurrentPage('about')}
            >
              About
            </button>
          </nav>
          {renderSidebarContent()}
        </div>
        <div
          style={{
            width: '4px',
            cursor: 'col-resize',
            background: isResizing ? '#666' : 'transparent',
            zIndex: 3,
            transition: 'background 0.2s'
          }}
          onMouseDown={startResizing}
          onMouseEnter={(e) => { if (!isResizing) e.currentTarget.style.background = '#444'; }}
          onMouseLeave={(e) => { if (!isResizing) e.currentTarget.style.background = 'transparent'; }}
        />
        <div style={{ width: `calc(100vw - ${sidebarWidth}px)`, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", position: 'relative', zIndex: 0 }}>
          <ErrorBoundary set={() => (<div>Something went wrong</div>)}>
            <CrochetItem
              pattern={patternToRender}
              phys={physToRender}
              sphereColor={sphereColor}
              lineColor={lineColor}
              experimental={experimental}
              autoJoin={activePreview ? (activePreview.autoJoin ?? false) : autoJoin}
              autoTurn={activePreview ? (activePreview.autoTurn ?? false) : autoTurn}
            />
          </ErrorBoundary>
          <PhysicsConfig
            phys={phys}
            setPhys={setPhys}
            experimental={experimental}
            setExperimental={setExperimental}
          />
          {experimental && <HeatmapIndex />}
        </div>
      </main>
    </div>
  );
}

export default App;
