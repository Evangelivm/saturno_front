'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import apiClient from '@/lib/api-client';

export default function NuevoUsuarioPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [ruc, setRuc] = useState('');
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [role, setRole] = useState('USUARIO');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.role !== 'ADMIN') {
      router.push('/comprobantes');
    }
  }, [user, authLoading, router]);

  if (authLoading || user?.role !== 'ADMIN') {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiClient.post('/api/auth/users', {
        ruc,
        nombreEmpresa: nombreEmpresa || undefined,
        role,
      });

      router.push('/usuarios');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Crear Nuevo Usuario</CardTitle>
          <CardDescription>
            Llena los campos para registrar un nuevo usuario en el sistema
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="ruc" className="text-sm font-medium">
                RUC <span className="text-red-500">*</span>
              </label>
              <Input
                id="ruc"
                type="text"
                placeholder="20123456789"
                value={ruc}
                onChange={(e) => setRuc(e.target.value.replace(/\D/g, ''))}
                maxLength={11}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="nombreEmpresa" className="text-sm font-medium">
                Nombre de Empresa
              </label>
              <Input
                id="nombreEmpresa"
                type="text"
                placeholder="Empresa S.A.C."
                value={nombreEmpresa}
                onChange={(e) => setNombreEmpresa(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium">
                Rol
              </label>
              <Select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="USUARIO">Usuario</option>
                <option value="ADMIN">Administrador</option>
              </Select>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.push('/usuarios')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando usuario...' : 'Crear Usuario'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
