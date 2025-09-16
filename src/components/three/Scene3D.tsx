import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Float } from '@react-three/drei';
import { Mesh } from 'three';

// Animated sphere component
const AnimatedSphere: React.FC = () => {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.2;
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <Sphere ref={meshRef} args={[1, 100, 200]} scale={2}>
        <MeshDistortMaterial
          color="#3b82f6"
          attach="material"
          distort={0.3}
          speed={2}
          roughness={0.1}
          metalness={0.8}
        />
      </Sphere>
    </Float>
  );
};

// Floating particles component
const Particles: React.FC = () => {
  const particlesRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
      particlesRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  const particles = Array.from({ length: 50 }, (_, i) => (
    <Float key={i} speed={1 + Math.random() * 2} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere
        position={[
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
        ]}
        args={[0.05, 8, 8]}
      >
        <meshStandardMaterial
          color="#60a5fa"
          transparent
          opacity={0.6}
          emissive="#3b82f6"
          emissiveIntensity={0.2}
        />
      </Sphere>
    </Float>
  ));

  return <group ref={particlesRef}>{particles}</group>;
};

// Main 3D Scene component
const Scene3D: React.FC = () => {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 75 }}
        style={{ background: 'transparent' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#60a5fa" />
        
        {/* 3D Objects */}
        <AnimatedSphere />
        <Particles />
        
        {/* Controls */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
};

export default Scene3D;
