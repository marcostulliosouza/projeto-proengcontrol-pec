import React from 'react';
import type { LoadingProps } from '../../types';

const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  text,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className={`spinner ${sizeClasses[size]}`} />
      {text && (
        <p className="mt-2 text-secondary-600 text-sm">{text}</p>
      )}
    </div>
  );
};

export default Loading;