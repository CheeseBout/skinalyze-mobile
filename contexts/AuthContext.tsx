import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/services/authService';
import tokenService from '@/services/tokenService';
import userService from '@/services/userService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const token = await tokenService.getToken();
      
      if (token) {
        const userData = await userService.getProfile(token);
        setUser({ ...userData }); // Force new object reference
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      await tokenService.clearAll();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string, userData: User) => {
    try {
      await tokenService.saveToken(token);
      
      setUser({ ...userData }); // Force new object reference
      
      ('User logged in successfully');
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await tokenService.clearAll();
      
      setUser(null);
      
      ('User logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const token = await tokenService.getToken();
      
      if (token) {
        const userData = await userService.getProfile(token);
        // Merge with existing user to avoid overwriting with partial data
        setUser((prevUser) => ({ ...(prevUser || {}), ...userData }));  // Force new object reference
      }
    } catch (error) {
      console.error('Error refreshing user (non-blocking):', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}