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
  const { isDarkBackground } = useContext(WeatherContext);
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  // Adjust glass intensity based on background darkness
  const intensityClasses = isDarkBackground ? {
    light: 'bg-white/15 border-white/25',
    medium: 'bg-white/5 border-white/15',
    strong: 'bg-white/35 border-white/45',
  } : {
    light: 'bg-white/40 border-white/50',
    medium: 'bg-white/50 border-white/60',
    strong: 'bg-white/60 border-white/70',
  };

  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
  };

  const baseClasses = `
    rounded-xl 
    border 
    shadow-xl
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
