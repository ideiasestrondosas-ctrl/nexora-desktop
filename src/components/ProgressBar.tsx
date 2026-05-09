import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  color?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  color = 'bg-nexora-blue', 
  className = '' 
}) => {
  return (
    <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 ${className}`}>
      <div 
        className={`${color} h-2.5 rounded-full transition-all duration-300 ease-in-out`} 
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      ></div>
    </div>
  );
};
