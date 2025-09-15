
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`bg-white dark:bg-brand-secondary rounded-xl p-4 shadow-lg ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
