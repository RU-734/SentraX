import React, { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext'; // Adjust path as necessary
import { Redirect } from 'wouter';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // You can replace this with a more sophisticated loading spinner
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading authentication status...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
