import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  shadow = 'md',
  border = true,
}) => {
  const baseClasses = 'bg-white rounded-lg transition-all duration-300 hover:shadow-lg border border-gray-200';
  
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };

  const borderClasses = border ? '' : 'border-0';

  const combinedClasses = `${baseClasses} ${paddingClasses[padding]} ${shadowClasses[shadow]} ${borderClasses} ${className}`;

  return (
    <div className={combinedClasses}>
      {children}
    </div>
  );
};

export default Card;
