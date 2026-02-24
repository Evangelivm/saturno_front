'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';

interface User {
  id: string;
  ruc: string;
  nombreEmpresa?: string;
  role?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      try {
        // Verificar si hay una sesión válida (la cookie se envía automáticamente)
        const response = await apiClient.get('/api/auth/me');
        setUser(response.data);
      } catch (error) {
        // No hay sesión válida
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, []);

  const login = async (ruc: string, password: string) => {
    const response = await apiClient.post('/api/auth/login', { ruc, password });
    const { user } = response.data;
    setUser(user);
    return user;
  };

  const register = async (data: { ruc: string; password: string; nombreEmpresa?: string }) => {
    const response = await apiClient.post('/api/auth/register', data);
    const { user } = response.data;
    setUser(user);
    return user;
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setUser(null);
    }
  };

  return {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };
}
