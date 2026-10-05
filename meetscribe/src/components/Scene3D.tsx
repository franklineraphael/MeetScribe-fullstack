import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, Stars } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';

function AnimatedSphere({ position, color, speed = 1 }: { position: [number, number, number]; color: string; speed?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.15 * speed;
      ref.current.rotation.y = state.clock.elapsedTime * 0.2 * speed;
    }
  });
  return (
    <Float speed={2} rotationIntensity={0.4} floatIntensity={1.5}>
      <Sphere ref={ref} args={[1, 64, 64]} position={position} scale={1.2}>
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={0.4}
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
    </Float>
  );
}

function OrbitingRing() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.3;
      ref.current.rotation.z = state.clock.elapsedTime * 0.2;
    }
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[2.8, 0.06, 16, 100]} />
      <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.6} metalness={0.9} roughness={0.1} />
    </mesh>
  );
}

export default function Scene3D() {
  return (
    <div className="absolute inset-0 -z-10 opacity-90">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1.2} color="#a855f7" />
        <pointLight position={[-10, -5, 5]} intensity={0.8} color="#22d3ee" />
        <Stars radius={80} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
        <AnimatedSphere position={[-2.5, 0.5, 0]} color="#a855f7" speed={0.8} />
        <AnimatedSphere position={[2.2, -0.8, -1]} color="#22d3ee" speed={1.2} />
        <AnimatedSphere position={[0, 1.8, -2]} color="#ec4899" speed={0.6} />
        <OrbitingRing />
      </Canvas>
    </div>
  );
}
