import React from 'react';
import type { CardProps } from '../../types';

const Card: React.FC<CardProps> = ({
  title,
  children,
  className = '',
  shadow = true,
}) => {
  const shadowClass = shadow ? 'card-shadow' : '';
  const classes = `bg-white rounded-lg border border-secondary-200 ${shadowClass} ${className}`;

  return (
    <div className={classes}>
      {title && (
        <div className="px-6 py-4 border-b border-secondary-200">
          <h3 className="text-lg font-medium text-secondary-900">{title}</h3>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;