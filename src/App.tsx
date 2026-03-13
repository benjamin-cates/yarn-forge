import './App.css'
import { Canvas } from '@react-three/fiber';
import { CrochetItem2 } from './CrochetItem2';
import { OrbitControls } from '@react-three/drei'

import React, { useState } from 'react';

function App() {
  const [iterations, setIterations] = useState(30);
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, background: 'rgba(255,255,255,0.8)', padding: '8px', borderRadius: '8px' }}>
        <label htmlFor="iterations-slider">Relaxation Iterations: {iterations}</label>
        <input
          id="iterations-slider"
          type="range"
          min={1}
          max={100}
          value={iterations}
          onChange={e => setIterations(Number(e.target.value))}
          style={{ width: '200px', marginLeft: '10px' }}
        />
      </div>
      <Canvas style={{ width: '100vw', height: '100vh' }}>
        <CrochetItem2 iterations={iterations} />
        <ambientLight intensity={Math.PI / 2}></ambientLight>
        <OrbitControls
          minAzimuthAngle={-Math.PI / 2}
          maxAzimuthAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  )
}

export default App
