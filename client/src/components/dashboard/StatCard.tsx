import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
  valueClassName?: string; // For specific styling of the value
  titleClassName?: string; // For specific styling of the title
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  className = '',
  valueClassName = 'text-3xl font-bold text-gray-800',
  titleClassName = 'text-sm font-medium text-gray-500 truncate'
}) => {
  return (
    <div className={`bg-white shadow-lg rounded-xl p-5 ${className}`}>
      <div className="flex items-center space-x-4">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <div className="flex-1 min-w-0">
          <p className={titleClassName}>
            {title}
          </p>
          <p className={valueClassName}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
