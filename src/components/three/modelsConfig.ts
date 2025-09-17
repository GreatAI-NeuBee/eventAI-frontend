// Configuration for custom 3D models
export interface ModelConfig {
  id: string;
  name: string;
  country: string;
  capacity: string;
  description: string;
  modelPath: string;
  position?: [number, number, number];
  scale?: number | [number, number, number];
  rotation?: [number, number, number];
  enableFloat?: boolean;
  enableRotation?: boolean;
  rotationSpeed?: number;
}

// Default stadium models configuration
export const defaultStadiumModels: ModelConfig[] = [
  {
    id: 'stadium-1',
    name: 'Stadium 1',
    country: 'Malaysia',
    capacity: '87,411',
    description: 'Southeast Asia\'s largest stadium',
    modelPath: '/models/stadiums/stadiumModel.glb',
    position: [0, 0,0],
    scale: 0.185,
    rotation: [0, 0, 0],
    enableFloat: true,
    enableRotation: true,
    rotationSpeed: 0.2
  },
];

// Utility function to get model by ID
export const getModelById = (id: string): ModelConfig | undefined => {
  return defaultStadiumModels.find(model => model.id === id);
};

// Utility function to preload all models
export const preloadAllModels = () => {
  // This will be implemented in the ModelLoader component
  return defaultStadiumModels.map(model => model.modelPath);
};

// Fallback model configuration for when custom models fail to load
export const fallbackModelConfig: ModelConfig = {
  id: 'fallback',
  name: 'Generic Stadium',
  country: 'Unknown',
  capacity: 'N/A',
  description: 'Fallback stadium model',
  modelPath: '/models/fallback/generic-stadium.glb',
  position: [0, -1, -3],
  scale: 1,
  rotation: [0, 0, 0],
  enableFloat: true,
  enableRotation: true,
  rotationSpeed: 0.2
};
