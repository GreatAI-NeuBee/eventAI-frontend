import React, { useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Float } from '@react-three/drei';
import { Group } from 'three';

interface ModelLoaderProps {
  modelPath: string;
  position?: [number, number, number];
  scale?: number | [number, number, number];
  rotation?: [number, number, number];
  enableFloat?: boolean;
  enableRotation?: boolean;
  rotationSpeed?: number;
}

// Individual model component
const Model: React.FC<ModelLoaderProps> = ({
  modelPath,
  position = [0, 0, 0],
  scale = 1,
  rotation = [0, 0, 0],
  enableFloat = true,
  enableRotation = true,
  rotationSpeed = 0.2
}) => {
  const groupRef = useRef<Group>(null);
  
  // Load the GLTF/GLB model
  const { scene } = useGLTF(modelPath);
  
  // Auto-rotation animation
  useFrame((state) => {
    if (groupRef.current && enableRotation) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * rotationSpeed) * 0.03;
    }
  });

  const ModelContent = () => (
    <group ref={groupRef} position={position} scale={scale} rotation={rotation}>
      <primitive object={scene.clone()} />
    </group>
  );

  if (enableFloat) {
    return (
      <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2}>
        <ModelContent />
      </Float>
    );
  }

  return <ModelContent />;
};

// Loading fallback component
const LoadingFallback: React.FC<{ position?: [number, number, number] }> = ({ 
  position = [0, 0, 0] 
}) => (
  <group position={position}>
    {/* Simple loading placeholder */}
    <mesh>
      <boxGeometry args={[2, 1, 2]} />
      <meshStandardMaterial color="#6366f1" wireframe />
    </mesh>
    <mesh position={[0, 1.5, 0]}>
      <sphereGeometry args={[0.2]} />
      <meshStandardMaterial color="#8b5cf6" />
    </mesh>
  </group>
);

// Error fallback component
const ErrorFallback: React.FC<{ 
  position?: [number, number, number];
  error?: string;
}> = ({ position = [0, 0, 0] }) => (
  <group position={position}>
    {/* Error placeholder */}
    <mesh>
      <boxGeometry args={[2, 1, 2]} />
      <meshStandardMaterial color="#ef4444" transparent opacity={0.5} />
    </mesh>
    <mesh position={[0, 1.5, 0]}>
      <sphereGeometry args={[0.2]} />
      <meshStandardMaterial color="#dc2626" />
    </mesh>
  </group>
);

// Main model loader with error boundary
interface ModelLoaderWithFallbackProps extends ModelLoaderProps {
  fallbackComponent?: React.ComponentType<any>;
}

const ModelLoaderWithFallback: React.FC<ModelLoaderWithFallbackProps> = ({
  fallbackComponent: FallbackComponent,
  ...props
}) => {
  return (
    <Suspense fallback={<LoadingFallback position={props.position} />}>
      <ErrorBoundary fallback={<ErrorFallback position={props.position} />}>
        <Model {...props} />
      </ErrorBoundary>
    </Suspense>
  );
};

// Simple error boundary for 3D models
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('3D Model loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Preload function for better performance
export const preloadModel = (modelPath: string) => {
  useGLTF.preload(modelPath);
};

export default ModelLoaderWithFallback;
