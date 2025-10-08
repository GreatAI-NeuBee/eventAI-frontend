import React, { useContext } from 'react';
import { WeatherContext } from './WeatherBackground';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  intensity?: 'light' | 'medium' | 'strong';
  blur?: 'sm' | 'md' | 'lg';
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  padding = 'md',
  intensity = 'medium',
  blur = 'md',
}) => {
  const { isDarkBackground, isRainBackground } = useContext(WeatherContext);
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  // Adjust glass intensity based on background type
  const intensityClasses = isDarkBackground ? {
    // Storm - light glass on dark background
    light: 'bg-white/15 border-white/25',
    medium: 'bg-white/5 border-white/15',
    strong: 'bg-white/35 border-white/45',
  } : isRainBackground ? {
    // Rain - dark glass for better text visibility
    light: 'bg-gray-800/60 border-gray-700/70',
    medium: 'bg-gray-800/15 border-gray-700/40',
    strong: 'bg-gray-800/80 border-gray-700/90',
  } : {
    // Clear/Sunny/Cloudy - solid white background, no glass effect
    light: 'bg-white border-gray-200',
    medium: 'bg-white border-gray-200',
    strong: 'bg-white border-gray-200',
  };

  const blurClasses = (isDarkBackground || isRainBackground) ? {
    // Apply blur only for storm and rain
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
  } : {
    // No blur for clear/sunny/cloudy
    sm: '',
    md: '',
    lg: '',
  };

  const baseClasses = `
    rounded-xl 
    border 
    shadow-xl 
    transition-all 
    duration-300
  `;

  const combinedClasses = `
    ${baseClasses} 
    ${paddingClasses[padding]} 
    ${intensityClasses[intensity]} 
    ${blurClasses[blur]} 
    ${className}
  `.replace(/\s+/g, ' ').trim();

  return (
    <div className={combinedClasses}>
      {children}
    </div>
  );
};

export default GlassCard;
