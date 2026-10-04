'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { UserPlus, Trash2, RotateCcw, Check, X, Search, Download } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';

interface UsuarioItem {
  id: string;
  ruc: string;
  nombreEmpresa?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  firstLoginAt: string | null;
  lastLoginAt: string | null;
}

function formatFechaHora(value: string | null) {
  return value ? new Date(value).toLocaleString('es-PE') : 'Nunca';
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function Actions({ u, isOwn, isLoading, confirmDeleteId, setConfirmDeleteId, handleDelete, handleResetPassword }: {
  u: UsuarioItem;
  isOwn: boolean;
  isLoading: boolean;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  handleDelete: (id: string) => void;
  handleResetPassword: (id: string) => void;
}) {
  if (isOwn) return <span className="text-xs text-muted-foreground">Cuenta propia</span>;
  if (confirmDeleteId === u.id) return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-red-600 font-medium mr-1">¿Seguro?</span>
      <button onClick={() => handleDelete(u.id)} disabled={isLoading} className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50">
        <Check className="h-4 w-4" />
      </button>
      <button onClick={() => setConfirmDeleteId(null)} className="p-1 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => handleResetPassword(u.id)} disabled={isLoading} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50" title="Resetear contraseña">
        <RotateCcw className="h-4 w-4" />
      </button>
      <button onClick={() => setConfirmDeleteId(u.id)} disabled={isLoading} className="p-1.5 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 disabled:opacity-50" title="Eliminar usuario">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function UsuariosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

  const filteredUsuarios = useMemo(() => {
    const term = search.trim().toLowerCase();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    return usuarios.filter((u) => {
      if (term && !u.ruc.toLowerCase().includes(term) && !(u.nombreEmpresa || '').toLowerCase().includes(term)) {
        return false;
      }
      if (roleFilter && u.role !== roleFilter) return false;
      if (from || to) {
        if (!u.lastLoginAt) return false;
        const lastLogin = new Date(u.lastLoginAt);
        if (from && lastLogin < from) return false;
        if (to && lastLogin > to) return false;
      }
      return true;
    });
  }, [usuarios, search, roleFilter, dateFrom, dateTo]);

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

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const response = await apiClient.get('/api/auth/users/export', {
        params: {
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(roleFilter ? { role: roleFilter } : {}),
          ...(dateFrom ? { from: dateFrom } : {}),
          ...(dateTo ? { to: dateTo } : {}),
        },
        responseType: 'blob',
      });
      const hoy = new Date();
      const fileName = `usuarios_${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${hoy.getFullYear()}.xlsx`;
      triggerDownload(response.data, fileName);
    } catch {
      toast.error('Error al descargar el Excel de usuarios');
    } finally {
      setExporting(false);
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
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 sm:py-8">
      <div className="flex items-center justify-between mb-5 sm:mb-6 gap-2 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Usuarios</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportExcel}
            disabled={exporting}
            variant="outline"
            className="flex items-center gap-2 h-8 sm:h-9 text-xs sm:text-sm px-3 sm:px-4"
          >
            <Download className="h-4 w-4" />
            <span>{exporting ? 'Descargando...' : 'Descargar Excel'}</span>
          </Button>
          <Button onClick={() => router.push('/usuarios/nuevo')} className="flex items-center gap-2 h-8 sm:h-9 text-xs sm:text-sm px-3 sm:px-4">
            <UserPlus className="h-4 w-4" />
            <span>Nuevo Usuario</span>
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por RUC o empresa..."
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">Todos los roles</option>
              <option value="ADMIN">Administrador</option>
              <option value="USUARIO">Usuario</option>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Último ingreso desde" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="Último ingreso hasta" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            El rango de fechas filtra por último ingreso. Mostrando {filteredUsuarios.length} de {usuarios.length} usuarios.
          </p>
        </CardContent>
      </Card>

      {error && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md font-medium">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {filteredUsuarios.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {usuarios.length === 0 ? 'No hay usuarios registrados' : 'Ningún usuario coincide con el filtro'}
            </p>
          ) : (
            <>
              {/* Vista desktop — tabla */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left font-medium text-muted-foreground py-3 px-2">RUC</th>
                      <th className="text-left font-medium text-muted-foreground py-3 px-2">Empresa</th>
                      <th className="text-left font-medium text-muted-foreground py-3 px-2">Rol</th>
                      <th className="text-left font-medium text-muted-foreground py-3 px-2">Estado</th>
                      <th className="text-left font-medium text-muted-foreground py-3 px-2">Fecha Creación</th>
                      <th className="text-left font-medium text-muted-foreground py-3 px-2">Primer Ingreso</th>
                      <th className="text-left font-medium text-muted-foreground py-3 px-2">Último Ingreso</th>
                      <th className="text-left font-medium text-muted-foreground py-3 px-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsuarios.map((u) => {
                      const isOwn = u.id === user?.id;
                      const isLoading = actionLoading === u.id;
                      return (
                        <tr key={u.id} className="border-b last:border-0">
                          <td className="py-3 px-2 font-mono">{u.ruc}</td>
                          <td className="py-3 px-2">{u.nombreEmpresa || '—'}</td>
                          <td className="py-3 px-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                              {u.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {u.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString('es-PE')}</td>
                          <td className="py-3 px-2 text-muted-foreground">{formatFechaHora(u.firstLoginAt)}</td>
                          <td className="py-3 px-2 text-muted-foreground">{formatFechaHora(u.lastLoginAt)}</td>
                          <td className="py-3 px-2">
                            <Actions u={u} isOwn={isOwn} isLoading={isLoading} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} handleDelete={handleDelete} handleResetPassword={handleResetPassword} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Vista móvil — tarjetas */}
              <div className="md:hidden divide-y divide-border">
                {filteredUsuarios.map((u) => {
                  const isOwn = u.id === user?.id;
                  const isLoading = actionLoading === u.id;
                  return (
                    <div key={u.id} className="py-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{u.nombreEmpresa || '—'}</p>
                          <p className="text-xs font-mono text-muted-foreground">{u.ruc}</p>
                        </div>
                        <Actions u={u} isOwn={isOwn} isLoading={isLoading} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} handleDelete={handleDelete} handleResetPassword={handleResetPassword} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                          {u.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {u.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                        <span className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString('es-PE')}</span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>Primer ingreso: {formatFechaHora(u.firstLoginAt)}</p>
                        <p>Último ingreso: {formatFechaHora(u.lastLoginAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
