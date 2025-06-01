import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// 1. Define Types/Interfaces
interface User {
  id: number;
  username: string;
  email: string; // Email might not always be returned by /me, adjust as needed
  role: string;
}

interface LoginCredentials {
  username?: string; // username or email for login
  email?: string;
  password?: string;
}

interface RegisterCredentials {
  username?: string;
  email?: string;
  password?: string;
}

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (credentials: RegisterCredentials) => Promise<any>; // Consider a more specific return type
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  // initialAuthCheckCompleted: boolean; // To prevent UI flicker before initial /me call
}

// 2. Create AuthContext
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Implement AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start true for initial auth check
  // const [initialAuthCheckCompleted, setInitialAuthCheckCompleted] = useState<boolean>(false);


  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch auth status:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
      // setInitialAuthCheckCompleted(true);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        setIsLoading(false);
        return data.user;
      } else {
        setIsLoading(false);
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      setIsLoading(false);
      throw error; // Re-throw to be caught by the calling component
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await response.json();
      if (response.status === 201) { // Or response.ok if backend returns 200 on register
        setIsLoading(false);
        return data; // Or data.user if backend sends it
      } else {
        setIsLoading(false);
        throw new Error(data.message || 'Registration failed');
      }
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        setUser(null);
      } else {
        // Even if logout API fails, clear user state on client for better UX
        setUser(null);
        console.error('Logout API call failed, but user cleared on client.');
        // Optionally throw an error here if strict API success is required
      }
    } catch (error) {
      setUser(null); // Ensure client-side logout on network error
      console.error('Logout request error:', error);
      // Optionally throw
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// 4. Create useAuth custom hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
