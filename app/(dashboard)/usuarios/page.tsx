'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { UserPlus, Trash2, RotateCcw, Check, X } from 'lucide-react';
import apiClient from '@/lib/api-client';

interface UsuarioItem {
  id: string;
  ruc: string;
  nombreEmpresa?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function UsuariosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (user?.role !== 'ADMIN') {
      router.push('/comprobantes');
      return;
    }

    const fetchUsuarios = async () => {
      try {
        const response = await apiClient.get('/api/auth/users');
        setUsuarios(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al cargar usuarios');
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, [user, authLoading, router]);

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    try {
      await apiClient.delete(`/api/auth/users/${id}`);
      setUsuarios((prev) => prev.filter((u) => u.id !== id));
      setConfirmDeleteId(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar usuario');
      setConfirmDeleteId(null);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (id: string) => {
    setActionLoading(id);
    try {
      await apiClient.put(`/api/auth/users/${id}/reset-password`);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al resetear contraseña');
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <Button onClick={() => router.push('/usuarios/nuevo')} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {error && (
        <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {usuarios.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay usuarios registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground py-3 px-2">RUC</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-2">Empresa</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-2">Rol</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-2">Estado</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-2">Fecha Creación</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => {
                    const isOwn = u.id === user?.id;
                    const isLoading = actionLoading === u.id;

                    return (
                      <tr key={u.id} className="border-b last:border-0">
                        <td className="py-3 px-2 font-mono">{u.ruc}</td>
                        <td className="py-3 px-2">{u.nombreEmpresa || '—'}</td>
                        <td className="py-3 px-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              u.role === 'ADMIN'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {u.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              u.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {u.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString('es-PE')}
                        </td>
                        <td className="py-3 px-2">
                          {isOwn ? (
                            <span className="text-xs text-muted-foreground">Cuenta propia</span>
                          ) : confirmDeleteId === u.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-red-600 font-medium mr-1">¿Seguro?</span>
                              <button
                                onClick={() => handleDelete(u.id)}
                                disabled={isLoading}
                                className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="p-1 text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleResetPassword(u.id)}
                                disabled={isLoading}
                                className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50"
                                title="Resetear contraseña"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(u.id)}
                                disabled={isLoading}
                                className="p-1.5 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                                title="Eliminar usuario"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
