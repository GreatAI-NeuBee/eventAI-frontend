import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder, Sphere, Float } from '@react-three/drei';
import ModelLoader, { preloadModel } from './ModelLoader';
import { defaultStadiumModels, type ModelConfig, fallbackModelConfig } from './modelsConfig';

// Keep existing crowd simulation and flow lines components
const PersonFigure: React.FC<{ position: [number, number, number]; color: string }> = ({ position, color }) => {
  return (
    <Float speed={1 + Math.random()} rotationIntensity={0.2} floatIntensity={0.5}>
      <group position={position}>
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

const FlowLines: React.FC = () => {
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
    <group>
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

// Stadium carousel with model support
interface Scene3DWithModelsProps {
  models?: ModelConfig[];
  useCustomModels?: boolean;
  showCarousel?: boolean;
  carouselInterval?: number;
  showCrowd?: boolean;
  showInfoBanner?: boolean;
}

const Scene3DWithModels: React.FC<Scene3DWithModelsProps> = ({
  models = defaultStadiumModels,
  useCustomModels = true,
  showCarousel = true,
  carouselInterval = 5000,
  showCrowd = true,
  showInfoBanner = true
}) => {
  const [currentModelIndex, setCurrentModelIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [modelLoadError] = useState<string | null>(null);

  // Auto-rotate through models if carousel is enabled
  useEffect(() => {
    if (!showCarousel || models.length <= 1) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      
      setTimeout(() => {
        setCurrentModelIndex((prev) => (prev + 1) % models.length);
        setIsTransitioning(false);
      }, 500);
    }, carouselInterval);

    return () => clearInterval(interval);
  }, [showCarousel, models.length, carouselInterval]);

  // Preload models for better performance
  useEffect(() => {
    if (useCustomModels) {
      models.forEach(model => {
        try {
          preloadModel(model.modelPath);
        } catch (error) {
          console.warn(`Failed to preload model: ${model.modelPath}`, error);
        }
      });
    }
  }, [models, useCustomModels]);

  const currentModel = models[currentModelIndex] || fallbackModelConfig;

  return (
    <div className="w-full h-full relative">
      {/* Model Info Overlay */}
      {showCarousel && showInfoBanner && (
        <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-70 text-white p-4 rounded-lg backdrop-blur-sm">
          <h3 className="text-lg font-bold">{currentModel.name}</h3>
          <p className="text-sm text-gray-300">{currentModel.country}</p>
          <p className="text-sm">Capacity: {currentModel.capacity}</p>
          <p className="text-xs text-gray-400 mt-1">{currentModel.description}</p>
          
          {/* Model type indicator */}
          <div className="flex items-center space-x-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${useCustomModels ? 'bg-green-500' : 'bg-blue-500'}`} />
            <span className="text-xs text-gray-400">
              {useCustomModels ? 'Custom Model' : 'Built-in Model'}
            </span>
          </div>
          
          {/* Progress indicator */}
          {models.length > 1 && (
            <div className="flex space-x-1 mt-3">
              {models.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    index === currentModelIndex ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Error indicator */}
          {modelLoadError && (
            <div className="mt-2 text-xs text-red-400">
              ⚠️ Model loading error
            </div>
          )}
        </div>
      )}

      <Canvas
        camera={{ position: [6, 4, 8], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        {/* Enhanced Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} color="#ffffff" />
        <pointLight position={[5, 5, 5]} intensity={0.8} color="#60a5fa" />
        <pointLight position={[-5, 3, -5]} intensity={0.6} color="#8b5cf6" />
        <spotLight position={[0, 10, 0]} intensity={0.5} angle={0.3} penumbra={1} color="#f59e0b" />
        
        {/* Ground plane */}
        <Box args={[12, 0.1, 12]} position={[0, -0.5, 0]}>
          <meshStandardMaterial color="#1e293b" transparent opacity={0.3} />
        </Box>
        
        {/* Custom 3D Model or Fallback */}
        <Suspense fallback={null}>
          <group key={`model-${currentModelIndex}`}>
            {useCustomModels ? (
              <group scale={isTransitioning ? 0.8 : 1}>
                <ModelLoader
                  modelPath={currentModel.modelPath}
                  position={currentModel.position}
                  scale={currentModel.scale}
                  rotation={currentModel.rotation}
                  enableFloat={currentModel.enableFloat}
                  enableRotation={currentModel.enableRotation}
                  rotationSpeed={currentModel.rotationSpeed}
                />
              </group>
            ) : (
              // Fallback to built-in geometrical models if custom models disabled
              <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2}>
                <group scale={isTransitioning ? 0.8 : 1} position={[0, -1, -3]}>
                  <Box args={[3, 2, 2]} position={[0, 1, 0]}>
                    <meshStandardMaterial color="#4f46e5" transparent opacity={0.8} />
                  </Box>
                </group>
              </Float>
            )}
          </group>
        </Suspense>
        
        {/* Crowd simulation and analytics */}
        {showCrowd && (
          <>
            <CrowdSimulation />
            <FlowLines />
            
            {/* Floating analytics particles */}
            {Array.from({ length: 12 }, (_, i) => (
              <Float key={i} speed={1 + Math.random()} rotationIntensity={0.3} floatIntensity={1}>
                <Sphere
                  position={[
                    (Math.random() - 0.5) * 10,
                    2 + Math.random() * 3,
                    (Math.random() - 0.5) * 10,
                  ]}
                  args={[0.06, 8, 8]}
                >
                  <meshStandardMaterial
                    color="#22d3ee"
                    transparent
                    opacity={0.6}
                    emissive="#0891b2"
                    emissiveIntensity={0.2}
                  />
                </Sphere>
              </Float>
            ))}
          </>
        )}
        
        {/* Controls */}
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          maxDistance={15}
          minDistance={5}
          maxPolarAngle={Math.PI / 1.8}
          minPolarAngle={Math.PI / 6}
        />
      </Canvas>
    </div>
  );
};

export default Scene3DWithModels;
