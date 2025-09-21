import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  textColor?: string;
  iconColor?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  size = "md", 
  showText = true,
  textColor = "text-gray-900",
}) => {
  // Size mappings
  const sizes = {
    sm: { icon: "h-6 w-6", text: "text-lg" },
    md: { icon: "h-8 w-8", text: "text-xl" },
    lg: { icon: "h-12 w-12", text: "text-3xl" }
  };

  const currentSize = sizes[size];

  return (
    <div className={`flex items-center ${className} gap-4`}>
      {/* Option 1: Use your custom logo image */}
      
      <img 
        src="/logo.png" 
        alt="Event Buddy Logo" 
        className={currentSize.icon}
      />
     
      
      {/* Option 2: Keep current Brain icon (default) */}
      {/* <Brain className={`${currentSize.icon} ${iconColor} mr-2`} /> */}
      
      {/* Company name */}
      {showText && (
        <span className={`${currentSize.text} font-bold ${textColor}`}>
          Event Buddy
        </span>
      )}
    </div>
  );
};

export default Logo;
