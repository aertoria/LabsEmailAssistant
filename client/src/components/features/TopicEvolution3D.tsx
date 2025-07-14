import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

interface ScatterPoint {
  x: number;
  y: number;
  z: number;
  keyword: string;
  frequency: number;
  color: string;
}

interface Topic3DSceneProps {
  points: ScatterPoint[];
}

function PointsCloud({ points }: { points: ScatterPoint[] }) {
  return (
    <>
      {points.map((p, idx) => (
        <mesh key={idx} position={[p.x, p.z, p.y]}>
          {/* radius scaled by frequency */}
          <sphereGeometry args={[0.3 + p.frequency * 0.1, 16, 16]} />
          <meshStandardMaterial color={p.color} />
        </mesh>
      ))}
    </>
  );
}

export default function TopicEvolution3D({ points }: Topic3DSceneProps) {
  // Compute bounds to center the cloud
  const { min, max } = useMemo(() => {
    let min = { x: Infinity, y: Infinity, z: Infinity } as any;
    let max = { x: -Infinity, y: -Infinity, z: -Infinity } as any;
    points.forEach(p => {
      min.x = Math.min(min.x, p.x);
      min.y = Math.min(min.y, p.y);
      min.z = Math.min(min.z, p.z);
      max.x = Math.max(max.x, p.x);
      max.y = Math.max(max.y, p.y);
      max.z = Math.max(max.z, p.z);
    });
    return { min, max };
  }, [points]);

  const center = {
    x: (min.x + max.x) / 2,
    y: (min.y + max.y) / 2,
    z: (min.z + max.z) / 2,
  };

  return (
    <Canvas style={{ height: '400px', width: '100%' }} camera={{ position: [0, 0, 40] }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[50, 50, 50]} />
      <PointsCloud points={points.map(p => ({ ...p, x: p.x - center.x, y: p.y - center.y, z: p.z - center.z }))} />
      <OrbitControls />
    </Canvas>
  );
} 