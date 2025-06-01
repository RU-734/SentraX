import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card'; // Import shadcn/ui Card components

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
  valueClassName = 'text-2xl font-bold', // Adjusted default to text-2xl as per common stat card examples
  titleClassName = 'text-sm font-medium text-muted-foreground' // Using muted-foreground for title
}) => {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={titleClassName}>
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
        {/* Icon can be styled further if needed */}
      </CardHeader>
      <CardContent>
        {/* The prompt example has value directly in CardContent, often within a div for styling */}
        <div className={valueClassName}>
          {value}
        </div>
        {/* If there were other elements like percentage change, they'd go here */}
      </CardContent>
    </Card>
  );
};

export default StatCard;
