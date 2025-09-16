import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder, Sphere, Float } from '@react-three/drei';
import { Mesh } from 'three';

// Animated person figure (simplified human representation)
const PersonFigure: React.FC<{ position: [number, number, number]; color: string }> = ({ position, color }) => {
  const groupRef = useRef<any>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime + position[0]) * 0.1;
    }
  });

  return (
    <Float speed={1 + Math.random()} rotationIntensity={0.2} floatIntensity={0.5}>
      <group ref={groupRef} position={position}>
        {/* Head */}
        <Sphere position={[0, 1.7, 0]} args={[0.15, 12, 12]}>
          <meshStandardMaterial color={color} />
        </Sphere>
        {/* Body */}
        <Cylinder position={[0, 1, 0]} args={[0.15, 0.2, 0.8, 8]}>
          <meshStandardMaterial color={color} />
        </Cylinder>
        {/* Arms */}
        <Cylinder position={[-0.3, 1.2, 0]} args={[0.05, 0.05, 0.6, 6]} rotation={[0, 0, Math.PI / 6]}>
          <meshStandardMaterial color={color} />
        </Cylinder>
        <Cylinder position={[0.3, 1.2, 0]} args={[0.05, 0.05, 0.6, 6]} rotation={[0, 0, -Math.PI / 6]}>
          <meshStandardMaterial color={color} />
        </Cylinder>
        {/* Legs */}
        <Cylinder position={[-0.1, 0.3, 0]} args={[0.08, 0.08, 0.6, 6]}>
          <meshStandardMaterial color={color} />
        </Cylinder>
        <Cylinder position={[0.1, 0.3, 0]} args={[0.08, 0.08, 0.6, 6]}>
          <meshStandardMaterial color={color} />
        </Cylinder>
      </group>
    </Float>
  );
};

// Event venue building
const VenueBuilding: React.FC = () => {
  const buildingRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (buildingRef.current) {
      buildingRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <group position={[0, -1, -3]}>
      {/* Main building */}
      <Box ref={buildingRef} args={[3, 2, 2]} position={[0, 1, 0]}>
        <meshStandardMaterial color="#4f46e5" transparent opacity={0.8} />
      </Box>
      
      {/* Entrance */}
      <Box args={[0.8, 1.5, 0.1]} position={[0, 0.75, 1.05]}>
        <meshStandardMaterial color="#1e40af" />
      </Box>
      
      {/* Roof */}
      <Box args={[3.2, 0.2, 2.2]} position={[0, 2.1, 0]}>
        <meshStandardMaterial color="#312e81" />
      </Box>
      
      {/* Windows */}
      {Array.from({ length: 6 }, (_, i) => (
        <Box key={i} args={[0.3, 0.3, 0.05]} position={[
          -1 + (i % 3) * 1,
          1.2 + Math.floor(i / 3) * 0.6,
          1.05
        ]}>
          <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={0.3} />
        </Box>
      ))}
    </group>
  );
};

// Crowd simulation with multiple people
const CrowdSimulation: React.FC = () => {
  const people = useMemo(() => {
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
    return Array.from({ length: 25 }, (_, i) => {
      const angle = (i / 25) * Math.PI * 2;
      const radius = 2 + Math.random() * 2;
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.5;
      const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.5;
      
      return {
        id: i,
        position: [x, 0, z] as [number, number, number],
        color: colors[i % colors.length],
      };
    });
  }, []);

  return (
    <group>
      {people.map((person) => (
        <PersonFigure
          key={person.id}
          position={person.position}
          color={person.color}
        />
      ))}
    </group>
  );
};

// Flow lines showing crowd movement
const FlowLines: React.FC = () => {
  const linesRef = useRef<any>(null);

  useFrame((state) => {
    if (linesRef.current) {
      linesRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  const lines = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const startRadius = 1;
      const endRadius = 4;
      
      return {
        start: [Math.cos(angle) * startRadius, 0.5, Math.sin(angle) * startRadius],
        end: [Math.cos(angle) * endRadius, 0.5, Math.sin(angle) * endRadius],
      };
    });
  }, []);

  return (
    <group ref={linesRef}>
      {lines.map((line, i) => (
        <group key={i}>
          <Cylinder
            args={[0.02, 0.02, 
              Math.sqrt(
                Math.pow(line.end[0] - line.start[0], 2) + 
                Math.pow(line.end[1] - line.start[1], 2) + 
                Math.pow(line.end[2] - line.start[2], 2)
              ), 6]}
            position={[
              (line.start[0] + line.end[0]) / 2,
              (line.start[1] + line.end[1]) / 2,
              (line.start[2] + line.end[2]) / 2,
            ]}
            rotation={[
              0,
              Math.atan2(line.end[2] - line.start[2], line.end[0] - line.start[0]),
              0
            ]}
          >
            <meshStandardMaterial
              color="#60a5fa"
              transparent
              opacity={0.6}
              emissive="#3b82f6"
              emissiveIntensity={0.2}
            />
          </Cylinder>
          
          {/* Arrow head */}
          <Cylinder
            args={[0, 0.08, 0.15, 6]}
            position={line.end as [number, number, number]}
            rotation={[
              0,
              Math.atan2(line.end[2] - line.start[2], line.end[0] - line.start[0]),
              0
            ]}
          >
            <meshStandardMaterial color="#3b82f6" />
          </Cylinder>
        </group>
      ))}
    </group>
  );
};

// Main 3D Scene component
const Scene3D: React.FC = () => {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [6, 4, 8], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        {/* Enhanced Lighting for better visibility */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} color="#ffffff" />
        <pointLight position={[5, 5, 5]} intensity={0.8} color="#60a5fa" />
        <pointLight position={[-5, 3, -5]} intensity={0.6} color="#8b5cf6" />
        <spotLight position={[0, 10, 0]} intensity={0.5} angle={0.3} penumbra={1} color="#f59e0b" />
        
        {/* Ground plane */}
        <Box args={[12, 0.1, 12]} position={[0, -0.5, 0]}>
          <meshStandardMaterial color="#1e293b" transparent opacity={0.3} />
        </Box>
        
        {/* 3D Models representing crowd control */}
        <VenueBuilding />
        <CrowdSimulation />
        <FlowLines />
        
        {/* Floating data points representing analytics */}
        {Array.from({ length: 15 }, (_, i) => (
          <Float key={i} speed={1 + Math.random()} rotationIntensity={0.3} floatIntensity={1}>
            <Sphere
              position={[
                (Math.random() - 0.5) * 8,
                2 + Math.random() * 3,
                (Math.random() - 0.5) * 8,
              ]}
              args={[0.08, 8, 8]}
            >
              <meshStandardMaterial
                color="#22d3ee"
                transparent
                opacity={0.7}
                emissive="#0891b2"
                emissiveIntensity={0.3}
              />
            </Sphere>
          </Float>
        ))}
        
        {/* Controls */}
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.8}
          maxDistance={15}
          minDistance={5}
          maxPolarAngle={Math.PI / 1.8}
          minPolarAngle={Math.PI / 6}
        />
      </Canvas>
    </div>
  );
};

export default Scene3D;
