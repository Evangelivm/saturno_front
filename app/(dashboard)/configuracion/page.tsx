'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RefreshCw, Database, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

interface EsStatus {
  available: boolean;
  cluster?: { status: string; name: string };
  indices?: { comprobantes: number; legacy: number };
  message?: string;
}

interface SyncResult {
  total: number;
  indexed: number;
}

export default function ConfiguracionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [esStatus, setEsStatus] = useState<EsStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState<'all' | 'comprobantes' | 'legacy' | null>(null);
  const [lastSync, setLastSync] = useState<{ comprobantes?: SyncResult; legacy?: SyncResult } | null>(null);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const response = await apiClient.get('/api/search/status');
      setEsStatus(response.data);
    } catch {
      setEsStatus({ available: false, message: 'No se pudo conectar con el servidor' });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user?.role !== 'ADMIN') {
      router.push('/comprobantes');
      return;
    }
    fetchStatus();
  }, [user, authLoading, router, fetchStatus]);

  const handleSync = async (type: 'all' | 'comprobantes' | 'legacy') => {
    setSyncLoading(type);
    try {
      const response = await apiClient.post(`/api/search/sync/${type}`);
      const data = response.data;

      if (type === 'all') {
        setLastSync({ comprobantes: data.comprobantes, legacy: data.legacy });
        toast.success(`Sync completado: ${data.comprobantes.indexed + data.legacy.indexed} documentos indexados`);
      } else {
        setLastSync((prev) => ({ ...prev, [type]: data }));
        toast.success(`Sync completado: ${data.indexed} de ${data.total} documentos indexados`);
      }

      await fetchStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al sincronizar');
    } finally {
      setSyncLoading(null);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>

      {/* Estado de Elasticsearch */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Elasticsearch
          </CardTitle>
          <button
            onClick={fetchStatus}
            disabled={statusLoading}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50"
            title="Actualizar estado"
          >
            <RefreshCw className={`h-4 w-4 ${statusLoading ? 'animate-spin' : ''}`} />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusLoading ? (
            <p className="text-sm text-muted-foreground">Verificando conexión...</p>
          ) : esStatus ? (
            <div className="space-y-3">
              {/* Conexión */}
              <div className="flex items-center gap-2 text-sm">
                {esStatus.available ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className={esStatus.available ? 'text-green-700' : 'text-red-600'}>
                  {esStatus.available ? `Conectado — ${esStatus.cluster?.name}` : (esStatus.message || 'No disponible')}
                </span>
              </div>

              {/* Documentos indexados */}
              {esStatus.available && esStatus.indices && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted rounded-md px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-1">Comprobantes indexados</p>
                    <p className="text-xl font-semibold">{esStatus.indices.comprobantes.toLocaleString('es-PE')}</p>
                  </div>
                  <div className="bg-muted rounded-md px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-1">Historial legacy indexado</p>
                    <p className="text-xl font-semibold">{esStatus.indices.legacy.toLocaleString('es-PE')}</p>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Resultado del último sync */}
          {lastSync && (
            <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
              <p className="font-medium text-foreground">Último sync:</p>
              {lastSync.comprobantes && (
                <p>Comprobantes: {lastSync.comprobantes.indexed} / {lastSync.comprobantes.total} indexados</p>
              )}
              {lastSync.legacy && (
                <p>Legacy: {lastSync.legacy.indexed} / {lastSync.legacy.total} indexados</p>
              )}
            </div>
          )}

          {/* Botones de sync */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              onClick={() => handleSync('all')}
              disabled={syncLoading !== null || !esStatus?.available}
              className="flex items-center gap-2"
            >
              {syncLoading === 'all' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sincronizar todo
            </Button>

            <Button
              variant="outline"
              onClick={() => handleSync('comprobantes')}
              disabled={syncLoading !== null || !esStatus?.available}
              className="flex items-center gap-2"
            >
              {syncLoading === 'comprobantes' && <Loader2 className="h-4 w-4 animate-spin" />}
              Solo comprobantes
            </Button>

            <Button
              variant="outline"
              onClick={() => handleSync('legacy')}
              disabled={syncLoading !== null || !esStatus?.available}
              className="flex items-center gap-2"
            >
              {syncLoading === 'legacy' && <Loader2 className="h-4 w-4 animate-spin" />}
              Solo historial legacy
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            El sync reconstruye los índices de búsqueda desde la base de datos. Puede tardar varios minutos si hay muchos registros.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
