'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import apiClient from '@/lib/api-client';
import { generateComprobanteFileName } from '@/lib/generate-comprobante-filename';
import { useBatchDownloadStore } from '@/lib/batch-download-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, CheckCircle, XCircle, Clock, ChevronDown, Download, Upload, RotateCcw, Search, X, FileSpreadsheet, HelpCircle, ArrowUp, ArrowDown, ArrowUpDown, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useComprobantesTour } from '@/hooks/use-comprobantes-tour';

// ─────────────────────────────────────────────────────────────────────────────
// SUNAT code maps  (Anexo del manual v2.0)
// ─────────────────────────────────────────────────────────────────────────────
const ESTADO_CP_MAP: Record<string, { label: string; color: string }> = {
  '0': { label: 'No existe',      color: 'text-gray-600 bg-gray-50' },
  '1': { label: 'Aceptado',       color: 'text-green-600 bg-green-50' },
  '2': { label: 'Anulado',        color: 'text-orange-600 bg-orange-50' },
  '3': { label: 'Autorizado',     color: 'text-blue-600 bg-blue-50' },
  '4': { label: 'No autorizado',  color: 'text-red-600 bg-red-50' },
};

const COD_COMP_MAP: Record<string, string> = {
  '01': 'Factura',
  '03': 'Boleta de Venta',
  '04': 'Liquidación de Compra',
  '07': 'Nota de Crédito',
  '08': 'Nota de Débito',
  'R1': 'Recibo por Honorarios',
  'R7': 'Nota de Créd. Recibos',
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Comprobante {
  id: string;
  numRuc: string;
  codComp: string;
  numeroSerie: string;
  numero: number;
  fechaEmision: string;
  monto: number | null;
  codigoAlfanumerico: string;
  sunatSuccess: boolean | null;
  sunatMessage: string | null;
  sunatEstadoCp: number | null;
  createdAt: string;
  facturaFileId: string | null;
  facturaFileName: string | null;
  xmlFileId: string | null;
  xmlFileName: string | null;
  guiaFileId: string | null;
  guiaFileName: string | null;
  ordenCompraFileId: string | null;
  ordenCompraFileName: string | null;
  contabilidadValidado: boolean;
  contabilidadValidadoAt: string | null;
  user?: { ruc: string };
}

interface LegacyRecord {
  id: number;
  numRuc: string | null;
  codComp: string | null;
  numeroSerie: string | null;
  numero: string | null;
  fechaEmision: string | null;
  monto: string | null;
  moneda: string | null;
  estadoCp: string | null;
  estadoRuc: string | null;
  condDomiRuc: string | null;
  factdoc: string | null;
  xmldoc: string | null;
  guiadoc: string | null;
  pedidodoc: string | null;
  fecha_ingreso_sistema: string | null;
  fecha_vencimiento: string | null;
  fecha_pago_tesoreria: string | null;
  estado_contabilidad: string | null;
  estado_tesoreria: string | null;
  tipo_facturacion: string | null;
  numero_orden_compra: string | null;
  nombre_empresa: string | null;
  observaciones_escritas: string | null;
  source: 'legacy';
}

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────
export default function ComprobantesPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';
  const router = useRouter();
  const { startTour } = useComprobantesTour(isAdmin);

  const initialLoadDone = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const abortLegacyRef = useRef<AbortController | null>(null);

  // new comprobantes
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, validados: 0, rechazados: 0, pendientes: 0 });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // legacy
  const [legacyRecords, setLegacyRecords] = useState<LegacyRecord[]>([]);
  const [loadingLegacy, setLoadingLegacy] = useState(true);
  const [legacyPage, setLegacyPage] = useState(1);
  const [legacyTotalPages, setLegacyTotalPages] = useState(1);

  // UI
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedLegacyId, setExpandedLegacyId] = useState<number | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [revalidatingId, setRevalidatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [validatingContabilidadId, setValidatingContabilidadId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const rangeDownload = useBatchDownloadStore((s) => s.range);
  const legacyBatchDownload = useBatchDownloadStore((s) => s.legacyBatch);
  const startBatchDownload = useBatchDownloadStore((s) => s.start);
  const setBatchDownloadBytes = useBatchDownloadStore((s) => s.setBytes);
  const setBatchDownloadTotalBytes = useBatchDownloadStore((s) => s.setTotalBytes);
  const finishBatchDownload = useBatchDownloadStore((s) => s.finish);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['factura', 'xml', 'guia', 'ordenCompra']);
  const [sunatStatus, setSunatStatus] = useState<'up' | 'down' | null>(null);
  const [usuarios, setUsuarios] = useState<{ ruc: string; nombreEmpresa?: string | null }[]>([]);
  const [selectedRuc, setSelectedRuc] = useState('');
  const [selectedNombre, setSelectedNombre] = useState('');
  const [batchEmpresaQuery, setBatchEmpresaQuery] = useState('');
  const [batchSugerencias, setBatchSugerencias] = useState<{ ruc: string; nombre: string }[]>([]);
  const [batchShowSugerencias, setBatchShowSugerencias] = useState(false);
  const [includeLegacy, setIncludeLegacy] = useState(false);

  // reporte
  const [showReporteDialog, setShowReporteDialog] = useState(false);
  const [reporteRuc, setReporteRuc] = useState('');
  const [reporteNombre, setReporteNombre] = useState('');
  const [reporteDesde, setReporteDesde] = useState('');
  const [reporteHasta, setReporteHasta] = useState('');
  const [generandoReporte, setGenerandoReporte] = useState(false);
  const [empresaQuery, setEmpresaQuery] = useState('');
  const [empresaSugerencias, setEmpresaSugerencias] = useState<{ ruc: string; nombre: string }[]>([]);
  const [buscandoEmpresa, setBuscandoEmpresa] = useState(false);
  const [showSugerencias, setShowSugerencias] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadRef = useRef<{ comprobanteId: string; tipo: string } | null>(null);

  const ALL_FILE_TYPES = [
    { tipo: 'factura',     label: 'Factura' },
    { tipo: 'xml',         label: 'XML' },
    { tipo: 'guia',        label: 'Guía' },
    { tipo: 'ordenCompra', label: 'Orden de Compra' },
  ];

  // ruc → empresa name lookup (admin)
  const usuariosMap = useMemo(
    () => Object.fromEntries(usuarios.map(u => [u.ruc, u.nombreEmpresa ?? u.ruc])),
    [usuarios],
  );

  // Shared grid columns for the unified table
  const gridCols = isAdmin
    ? 'md:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_auto]'
    : 'md:grid-cols-[2.5fr_1fr_1fr_1fr_1fr_auto]';

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => { fetchLegacyRecords(legacyPage, debouncedSearch); }, [legacyPage, debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchTerm); setPage(1); setLegacyPage(1); }, 200);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => { fetchComprobantes(page, debouncedSearch); }, [page, debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    if (!isAdmin) return;
    apiClient.get('/api/auth/users').then((res) => setUsuarios(res.data)).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    const fetchSunatStatus = async () => {
      try {
        const res = await apiClient.get('/api/sunat-status');
        setSunatStatus(res.data.status);
      } catch { setSunatStatus('down'); }
    };
    fetchSunatStatus();
    const interval = setInterval(fetchSunatStatus, 30_000);
    return () => clearInterval(interval);
  }, []);

  // ── Fetchers ───────────────────────────────────────────────────────────────
  const fetchComprobantes = async (pageNum: number, search: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(pageNum), limit: '30' };
      if (search) params.search = search;
      if (sortBy) { params.sortBy = sortBy; params.sortOrder = sortOrder; }
      const response = await apiClient.get('/api/comprobantes', { params, signal: abortRef.current.signal });
      const { data, totalPages: tp, stats: s } = response.data;
      setComprobantes(data);
      setTotalPages(tp);
      setStats(s);
      initialLoadDone.current = true;
    } catch (error: any) {
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') return;
      toast.error('Error al cargar comprobantes');
      console.error('Error fetching comprobantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy !== column) {
      setSortBy(column);
      setSortOrder('asc');
    } else if (sortOrder === 'asc') {
      setSortOrder('desc');
    } else {
      setSortBy(null);
      setSortOrder('desc');
    }
    setPage(1);
    setLegacyPage(1);
  };

  const SortHeader = ({ column, label }: { column: string; label: string }) => {
    const active = sortBy === column;
    const Icon = active ? (sortOrder === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <button
        type="button"
        onClick={() => handleSort(column)}
        className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors cursor-pointer ${active ? 'text-brand' : 'text-muted-foreground hover:text-foreground'}`}
      >
        {label}
        <Icon className={`h-3 w-3 ${active ? '' : 'opacity-40'}`} />
      </button>
    );
  };

  const fetchLegacyRecords = async (pageNum: number, search?: string) => {
    abortLegacyRef.current?.abort();
    abortLegacyRef.current = new AbortController();
    setLoadingLegacy(true);
    try {
      const params: Record<string, string> = { page: String(pageNum), limit: '30' };
      if (search) params.search = search;
      if (sortBy) { params.sortBy = sortBy; params.sortOrder = sortOrder; }
      const response = await apiClient.get('/api/historial-legacy', { params, signal: abortLegacyRef.current.signal });
      const { data, totalPages: tp } = response.data;
      setLegacyRecords(data);
      setLegacyTotalPages(tp);
    } catch (error: any) {
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') return;
      // silencioso: si la segunda BD no está disponible no interrumpe la página
    } finally {
      setLoadingLegacy(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
  };

  const formatLegacyMonto = (monto: string | null, moneda: string | null) => {
    if (!monto) return '—';
    const m = moneda?.toUpperCase() ?? '';
    const symbol = m === 'USD' || m.includes('DOL') ? '$' : 'S/';
    return `${symbol} ${monto}`;
  };

  const getLegacyEstadoCp = (estadoCp: string | null) =>
    estadoCp
      ? (ESTADO_CP_MAP[estadoCp] ?? { label: `Estado ${estadoCp}`, color: 'text-gray-600 bg-gray-50' })
      : { label: '—', color: 'text-gray-400 bg-transparent' };

  const getEstadoLabel = (success: boolean | null, estadoCp: number | null) => {
    if (success === null) return { label: 'Pendiente', color: 'text-amber-600 bg-amber-50' };
    if (!success) return { label: 'Rechazado', color: 'text-red-600 bg-red-50' };
    switch (estadoCp) {
      case 0: return { label: 'No existe',     color: 'text-gray-600 bg-gray-50' };
      case 1: return { label: 'Aceptado',      color: 'text-green-600 bg-green-50' };
      case 2: return { label: 'Anulado',       color: 'text-orange-600 bg-orange-50' };
      case 3: return { label: 'Autorizado',    color: 'text-blue-600 bg-blue-50' };
      case 4: return { label: 'No autorizado', color: 'text-red-600 bg-red-50' };
      default: return { label: 'Desconocido', color: 'text-gray-600 bg-gray-50' };
    }
  };

  const getFiles = (c: Comprobante) => {
    const files: { label: string; tipo: string; fileId: string; fileName: string }[] = [];
    if (c.facturaFileId && c.facturaFileName)     files.push({ label: 'Factura',          tipo: 'factura',     fileId: c.facturaFileId,     fileName: c.facturaFileName });
    if (c.xmlFileId && c.xmlFileName)             files.push({ label: 'XML',              tipo: 'xml',         fileId: c.xmlFileId,         fileName: c.xmlFileName });
    if (c.guiaFileId && c.guiaFileName)           files.push({ label: 'Guía',             tipo: 'guia',        fileId: c.guiaFileId,         fileName: c.guiaFileName });
    if (c.ordenCompraFileId && c.ordenCompraFileName) files.push({ label: 'Orden de Compra', tipo: 'ordenCompra', fileId: c.ordenCompraFileId, fileName: c.ordenCompraFileName });
    return files;
  };

  const getBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'factura':     return 'bg-blue-100 text-blue-700';
      case 'xml':         return 'bg-emerald-100 text-emerald-700';
      case 'guia':        return 'bg-purple-100 text-purple-700';
      case 'ordenCompra': return 'bg-amber-100 text-amber-700';
      default:            return 'bg-muted text-muted-foreground';
    }
  };

  // ── Upload / download handlers ─────────────────────────────────────────────
  const triggerUpload = (comprobanteId: string, tipo: string) => {
    pendingUploadRef.current = { comprobanteId, tipo };
    fileInputRef.current?.click();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const pending = pendingUploadRef.current;
    if (!file || !pending) return;

    const comprobante = comprobantes.find((c) => c.id === pending.comprobanteId);
    if (!comprobante) return;

    setUploadingKey(`${pending.comprobanteId}-${pending.tipo}`);

    const newFileName = generateComprobanteFileName({
      ruc: comprobante.numRuc,
      serie: comprobante.numeroSerie,
      numero: comprobante.numero,
      fechaEmision: formatDate(comprobante.fechaEmision),
      codigoAlfanumerico: comprobante.codigoAlfanumerico,
      tipo: pending.tipo as 'factura' | 'xml' | 'guia' | 'ordenCompra',
      originalName: file.name,
    });
    const renamedFile = new File([file], newFileName, { type: file.type });

    const formData = new FormData();
    formData.append('file', renamedFile);
    formData.append('tipoArchivo', pending.tipo);

    try {
      // axios (empaquetado por Next.js/Webpack en este proyecto) termina serializando
      // el FormData como JSON en vez de mandarlo como multipart. fetch() nativo nunca
      // pasa por esa lógica: maneja el FormData directo, con el boundary correcto.
      const res = await fetch(`${apiClient.defaults.baseURL}/api/comprobantes/${pending.comprobanteId}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || `Error ${res.status}`);

      const { fileId, fileName } = body.data;

      setComprobantes(prev => prev.map(c => {
        if (c.id !== pending.comprobanteId) return c;
        const updated = { ...c };
        if (pending.tipo === 'factura')     { updated.facturaFileId = fileId;     updated.facturaFileName = fileName; }
        else if (pending.tipo === 'xml')    { updated.xmlFileId = fileId;         updated.xmlFileName = fileName; }
        else if (pending.tipo === 'guia')   { updated.guiaFileId = fileId;        updated.guiaFileName = fileName; }
        else                               { updated.ordenCompraFileId = fileId;  updated.ordenCompraFileName = fileName; }
        return updated;
      }));

      toast.success('Archivo cargado correctamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al subir archivo');
    } finally {
      setUploadingKey(null);
      pendingUploadRef.current = null;
      e.target.value = '';
    }
  };

  const handleRevalidate = async (comprobanteId: string) => {
    setRevalidatingId(comprobanteId);
    try {
      const response = await apiClient.put(`/api/comprobantes/${comprobanteId}/revalidar`);
      const { success, message, data } = response.data;

      setComprobantes(prev => prev.map(c => {
        if (c.id !== comprobanteId) return c;
        return { ...c, sunatSuccess: success, sunatMessage: message, sunatEstadoCp: data?.estadoCp ? parseInt(data.estadoCp, 10) : null };
      }));

      toast.success(success ? 'Revalidación exitosa' : 'Revalidación completada con observaciones');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al revalidar comprobante');
    } finally {
      setRevalidatingId(null);
    }
  };

  const handleDelete = async (comprobanteId: string, codigo: string) => {
    if (!window.confirm(`¿Eliminar el comprobante ${codigo}? Esta acción no se puede deshacer.`)) return;

    setDeletingId(comprobanteId);
    try {
      await apiClient.delete(`/api/comprobantes/${comprobanteId}`);
      toast.success('Comprobante eliminado');
      fetchComprobantes(page, debouncedSearch);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar comprobante');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleContabilidad = async (comprobanteId: string) => {
    setValidatingContabilidadId(comprobanteId);
    try {
      const response = await apiClient.put(`/api/comprobantes/${comprobanteId}/contabilidad`);
      const { contabilidadValidado, contabilidadValidadoAt } = response.data;

      setComprobantes(prev => prev.map(c =>
        c.id === comprobanteId ? { ...c, contabilidadValidado, contabilidadValidadoAt } : c
      ));

      toast.success(contabilidadValidado ? 'Marcado como validado por Contabilidad' : 'Validación de Contabilidad removida');
    } catch {
      toast.error('Error al actualizar la validación de Contabilidad');
    } finally {
      setValidatingContabilidadId(null);
    }
  };

  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleDownloadFile = async (comprobanteId: string, tipo: string, fileName: string) => {
    setDownloadingKey(`${comprobanteId}-${tipo}`);
    try {
      const response = await apiClient.get(`/api/comprobantes/${comprobanteId}/download/${tipo}`, { responseType: 'blob' });
      triggerDownload(response.data, fileName);
    } catch { toast.error('Error al descargar archivo'); }
    finally { setDownloadingKey(null); }
  };

  const handlePreviewFile = (comprobanteId: string, tipo: string) => {
    window.open(`${apiClient.defaults.baseURL}/api/comprobantes/${comprobanteId}/download/${tipo}?inline=true`, '_blank');
  };

  const handleDownloadAll = async (comprobanteId: string, codigoAlfanumerico: string) => {
    setDownloadingKey(`${comprobanteId}-all`);
    try {
      const response = await apiClient.get(`/api/comprobantes/${comprobanteId}/download-all`, { responseType: 'blob' });
      triggerDownload(response.data, `comprobante-${codigoAlfanumerico}.zip`);
    } catch { toast.error('Error al descargar archivos'); }
    finally { setDownloadingKey(null); }
  };

  const toggleType = (tipo: string) =>
    setSelectedTypes(prev => prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]);

  const handleDownloadRange = async () => {
    const controller = new AbortController();
    startBatchDownload('range', controller);
    const toastId = 'download-range';

    toast.loading('Descargando comprobantes... 0.0 MB', {
      id: toastId,
      duration: Infinity,
      action: { label: 'Cancelar', onClick: () => controller.abort() },
    });

    try {
      const response = await apiClient.get('/api/comprobantes/download-range', {
        params: { from: dateFrom, to: dateTo, tipos: selectedTypes.join(','), ...(isAdmin && selectedRuc ? { ruc: selectedRuc } : {}) },
        responseType: 'blob',
        signal: controller.signal,
        onDownloadProgress: (e) => {
          setBatchDownloadBytes('range', e.loaded);
          toast.loading(`Descargando comprobantes... ${(e.loaded / 1024 / 1024).toFixed(1)} MB`, {
            id: toastId,
            duration: Infinity,
            action: { label: 'Cancelar', onClick: () => controller.abort() },
          });
        },
      });
      triggerDownload(response.data, `comprobantes-${dateFrom}-a-${dateTo}.zip`);
      toast.success('Descarga de comprobantes completa', { id: toastId, duration: 5000 });
    } catch (err) {
      if (axios.isCancel(err)) {
        toast.info('Descarga cancelada', { id: toastId, duration: 3000 });
      } else {
        toast.error('No hay archivos en ese rango de fechas', { id: toastId, duration: 5000 });
      }
    } finally {
      finishBatchDownload('range');
    }
  };

  const handleDownloadLegacyBatch = async () => {
    const controller = new AbortController();
    startBatchDownload('legacyBatch', controller);
    const toastId = 'download-legacy-batch';
    const cancelAction = { label: 'Cancelar', onClick: () => controller.abort() };

    toast.loading('Calculando tamaño del historial anterior...', { id: toastId, duration: Infinity, action: cancelAction });

    try {
      const tiposLegacy = selectedTypes.map(t => t === 'ordenCompra' ? 'pedido' : t).join(',');
      const params = { desde: dateFrom, hasta: dateTo, tipos: tiposLegacy, ...(selectedRuc ? { ruc: selectedRuc } : {}) };

      // Estimado rápido (solo lookups en memoria, sin tocar R2/Drive) para poder
      // mostrar % real en vez de un MB suelto sin referencia. Es aproximado: el
      // zip comprime un poco, así que el peso real bajará algo de este total.
      let totalBytesEstimado = 0;
      try {
        const { data: estimate } = await apiClient.get('/api/reportes/legacy-batch-size', { params, signal: controller.signal });
        totalBytesEstimado = estimate.totalBytes ?? 0;
        setBatchDownloadTotalBytes('legacyBatch', totalBytesEstimado);
      } catch (err) {
        if (axios.isCancel(err)) throw err;
        // si falla el estimado seguimos igual, solo sin %
      }

      const response = await apiClient.get('/api/reportes/legacy-batch', {
        params,
        responseType: 'blob',
        signal: controller.signal,
        onDownloadProgress: (e) => {
          setBatchDownloadBytes('legacyBatch', e.loaded);
          const mb = (e.loaded / 1024 / 1024).toFixed(1);
          const pct = totalBytesEstimado > 0 ? Math.min(100, Math.round((e.loaded / totalBytesEstimado) * 100)) : null;
          toast.loading(
            pct === null ? `Descargando historial anterior... ${mb} MB` : `Descargando historial anterior... ${pct}% (${mb} MB)`,
            { id: toastId, duration: Infinity, action: cancelAction },
          );
        },
      });
      // El zip comprime, así que el total real casi siempre queda por debajo del
      // estimado (suma de tamaños originales) — sin esto la barra se quedaría
      // pegada cerca del 90% aunque la descarga ya terminó.
      if (totalBytesEstimado > 0) setBatchDownloadBytes('legacyBatch', totalBytesEstimado);
      triggerDownload(response.data, `historial-${dateFrom}-a-${dateTo}.zip`);
      toast.success('Descarga del historial anterior completa', { id: toastId, duration: 5000 });
    } catch (err) {
      if (axios.isCancel(err)) {
        toast.info('Descarga cancelada', { id: toastId, duration: 3000 });
      } else {
        toast.error('No hay archivos del historial anterior en ese rango de fechas', { id: toastId, duration: 5000 });
      }
    } finally {
      finishBatchDownload('legacyBatch');
    }
  };

  // El total es un estimado (suma de tamaños originales antes del zip) y el zip
  // comprime, así que en la práctica no pasa de ~90% hasta que la descarga termina
  // y se fuerza a 100% explícitamente (ver handleDownloadLegacyBatch). Se topa acá
  // solo como salvaguarda por si algún batch pesara más comprimido que el estimado.
  const legacyBatchPercent = legacyBatchDownload.totalBytes > 0
    ? Math.min(100, Math.round((legacyBatchDownload.bytes / legacyBatchDownload.totalBytes) * 100))
    : null;

  // ── Initial loading state (solo la primera vez) ────────────────────────────
  if (loading && !initialLoadDone.current) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando comprobantes...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasContent = comprobantes.length > 0 || !!debouncedSearch || legacyRecords.length > 0 || loadingLegacy;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-3 sm:p-6">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* ── Header ── */}
        <div id="tour-header" className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Comprobantes</h1>
            <p className="text-sm text-muted-foreground">Gestiona y consulta todos tus comprobantes validados con SUNAT</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:shrink-0">
            {sunatStatus !== null && (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${
                sunatStatus === 'up' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <div className={`h-2 w-2 rounded-full ${sunatStatus === 'up' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                {sunatStatus === 'up' ? 'SUNAT disponible' : 'SUNAT no disponible'}
              </div>
            )}
            {isAdmin && (
              <Button id="tour-btn-reporte" onClick={() => setShowReporteDialog(true)} variant="success" size="sm" className="text-xs sm:text-sm">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Reporte</span>
              </Button>
            )}
            <Button id="tour-btn-lote" onClick={() => setShowBatchDialog(true)} variant="outline" size="sm" className="text-xs sm:text-sm">
              <Download className="h-4 w-4" />
              <span>Descarga de lote</span>
            </Button>
            <Button id="tour-btn-nuevo" onClick={() => router.push('/comprobantes/nuevo')} size="sm" className="text-xs sm:text-sm">
              <Plus className="h-4 w-4" />
              <span>Nuevo Comprobante</span>
            </Button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div id="tour-stats" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-t-2 border-t-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Comprobantes</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-success">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Validados</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.validados}</div>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-destructive">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rechazados</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                <XCircle className="h-4 w-4 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.rechazados}</div>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.pendientes}</div>
            </CardContent>
          </Card>
        </div>

        {/* ── Search ── */}
        <Card id="tour-search">
          <CardContent className="pt-4 pb-4">
            <div className="relative">
              {loading && initialLoadDone.current ? (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-brand border-t-transparent rounded-full animate-spin pointer-events-none" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              )}
              <input
                type="text"
                placeholder="Buscar por serie, RUC, código o estado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Unified table ── */}
        {!hasContent ? (

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay comprobantes registrados</h3>
              <p className="text-muted-foreground mb-4">Comienza validando tu primer comprobante con SUNAT</p>
              <Button onClick={() => router.push('/comprobantes/nuevo')}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Comprobante
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card id="tour-table">
            {/* Shared header */}
            <div className={`hidden md:grid ${gridCols} items-center gap-3 px-4 py-3 border-b bg-muted/40`}>
              <SortHeader column="numero" label="Comprobante" />
              {isAdmin && <SortHeader column="empresa" label="Empresa" />}
              <SortHeader column="estado" label="Estado" />
              <SortHeader column="monto" label="Monto" />
              <SortHeader column="fecha" label="Fecha" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Archivos</span>
              <span className="w-5" />
            </div>

            {/* ── New comprobantes ── */}
            {comprobantes.length === 0 && debouncedSearch ? (
              // Solo muestra "sin resultados" si el historial también está vacío
              (!loadingLegacy && legacyRecords.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Search className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">No se encontraron resultados</p>
                  <p className="text-xs text-muted-foreground">Prueba con otros términos de búsqueda</p>
                </div>
              ) : null
            ) : (
              comprobantes.map((comprobante) => {
                const estado = getEstadoLabel(comprobante.sunatSuccess, comprobante.sunatEstadoCp);
                const isExpanded = expandedId === comprobante.id;
                const files = getFiles(comprobante);
                const empresaNombre = comprobante.user?.ruc
                  ? (usuariosMap[comprobante.user.ruc] ?? comprobante.user.ruc)
                  : '—';

                return (
                  <div key={comprobante.id} className="border-b">
                    <button onClick={() => setExpandedId(isExpanded ? null : comprobante.id)} className="w-full text-left">
                      {/* Desktop */}
                      <div className={`hidden md:grid ${gridCols} items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-brand shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{comprobante.numeroSerie}-{comprobante.numero}</p>
                            <p className="text-xs text-muted-foreground">Código: {comprobante.codigoAlfanumerico}</p>
                          </div>
                        </div>
                        {isAdmin && (
                          <span className="text-sm text-muted-foreground truncate" title={empresaNombre}>{empresaNombre}</span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${estado.color}`}>{estado.label}</span>
                        <span className="text-sm font-medium">{formatCurrency(comprobante.monto)}</span>
                        <span className="text-sm text-muted-foreground">{formatDate(comprobante.fechaEmision)}</span>
                        <div className="flex gap-1 flex-wrap">
                          {files.map((f) => (
                            <span key={f.label} className={`text-xs font-medium px-1.5 py-0.5 rounded ${getBadgeColor(f.tipo)}`}>{f.label}</span>
                          ))}
                          {files.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                      {/* Mobile */}
                      <div className="flex md:hidden items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-4 w-4 text-brand shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{comprobante.numeroSerie}-{comprobante.numero}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estado.color}`}>{estado.label}</span>
                              <span className="text-xs text-muted-foreground">{formatCurrency(comprobante.monto)}</span>
                              {isAdmin && empresaNombre !== '—' && (
                                <span className="text-xs text-muted-foreground truncate">{empresaNombre}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {/* Accordion */}
                    {isExpanded && (
                      <div className="border-t bg-muted/20 px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Detalles</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">RUC</span>
                                <span className="font-medium">{comprobante.numRuc}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Tipo</span>
                                <span className="font-medium">{COD_COMP_MAP[comprobante.codComp] ?? comprobante.codComp}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Fecha Emisión</span>
                                <span className="font-medium">{formatDate(comprobante.fechaEmision)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Monto</span>
                                <span className="font-medium">{formatCurrency(comprobante.monto)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Registrado</span>
                                <span className="font-medium">{formatDate(comprobante.createdAt)}</span>
                              </div>
                            </div>
                            {comprobante.sunatMessage && (
                              <div className="mt-3 p-3 bg-muted rounded-md">
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-medium">Mensaje SUNAT:</span> {comprobante.sunatMessage}
                                </p>
                              </div>
                            )}
                            <div className="mt-3 flex items-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRevalidate(comprobante.id); }}
                                disabled={revalidatingId === comprobante.id}
                                className="flex items-center gap-1.5 text-xs font-medium text-brand border border-brand/30 rounded-md px-2.5 py-1 hover:bg-brand/10 active:bg-brand/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <RotateCcw className={`h-3.5 w-3.5 ${revalidatingId === comprobante.id ? 'animate-spin' : ''}`} />
                                {revalidatingId === comprobante.id ? 'Revalidando...' : 'Revalidar con SUNAT'}
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(comprobante.id, comprobante.codigoAlfanumerico); }}
                                  disabled={deletingId === comprobante.id}
                                  className="flex items-center gap-1.5 text-xs font-medium text-red-600 border border-red-300 rounded-md px-2.5 py-1 hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  {deletingId === comprobante.id ? 'Eliminando...' : 'Eliminar'}
                                </button>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Archivos</h4>
                              {files.length > 0 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDownloadAll(comprobante.id, comprobante.codigoAlfanumerico); }}
                                  disabled={downloadingKey === `${comprobante.id}-all`}
                                  className="flex items-center gap-1 text-xs font-medium text-brand border border-brand/30 rounded-md px-2.5 py-1 hover:bg-brand/10 active:bg-brand/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {downloadingKey === `${comprobante.id}-all`
                                    ? <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    : <Download className="h-3 w-3" />}
                                  {downloadingKey === `${comprobante.id}-all` ? 'Descargando...' : 'Descargar todos (.zip)'}
                                </button>
                              )}
                            </div>
                            <div className="space-y-2">
                              {files.map((file) => (
                                <div key={file.label} className="flex items-center justify-between bg-muted rounded-md px-3 py-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getBadgeColor(file.tipo)}`}>{file.label}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handlePreviewFile(comprobante.id, file.tipo); }}
                                      className="text-xs text-muted-foreground truncate hover:text-brand transition-colors text-left cursor-pointer"
                                      title="Vista previa"
                                    >
                                      {file.fileName}
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handlePreviewFile(comprobante.id, file.tipo); }}
                                      className="p-1.5 rounded-md border border-muted bg-card hover:bg-muted active:bg-muted/80 transition-colors cursor-pointer"
                                      title="Vista previa"
                                    >
                                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDownloadFile(comprobante.id, file.tipo, file.fileName); }}
                                      disabled={downloadingKey === `${comprobante.id}-${file.tipo}`}
                                      className="p-1.5 rounded-md border border-muted bg-card hover:bg-muted active:bg-muted/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Descargar archivo"
                                    >
                                      {downloadingKey === `${comprobante.id}-${file.tipo}`
                                        ? <div className="h-3.5 w-3.5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                                        : <Download className="h-3.5 w-3.5 text-muted-foreground" />}
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); triggerUpload(comprobante.id, file.tipo); }}
                                      disabled={uploadingKey === `${comprobante.id}-${file.tipo}`}
                                      className="p-1.5 rounded-md border border-muted bg-card hover:bg-muted active:bg-muted/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Reemplazar archivo"
                                    >
                                      {uploadingKey === `${comprobante.id}-${file.tipo}`
                                        ? <div className="h-3.5 w-3.5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                                        : <Upload className="h-3.5 w-3.5 text-muted-foreground" />}
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {ALL_FILE_TYPES.filter(t => !files.find(f => f.tipo === t.tipo)).map(({ tipo, label }) => (
                                <button
                                  key={tipo}
                                  onClick={(e) => { e.stopPropagation(); triggerUpload(comprobante.id, tipo); }}
                                  disabled={uploadingKey === `${comprobante.id}-${tipo}`}
                                  className="w-full flex items-center justify-center gap-1.5 border border-dashed rounded-md px-3 py-2 text-xs text-muted-foreground hover:text-brand hover:border-brand hover:bg-brand/5 active:bg-brand/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  {uploadingKey === `${comprobante.id}-${tipo}`
                                    ? <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    : <Upload className="h-3 w-3" />}
                                  {uploadingKey === `${comprobante.id}-${tipo}` ? 'Cargando...' : `Cargar ${label}`}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            {comprobante.contabilidadValidado ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-success shrink-0" />
                                <span className="text-sm font-medium text-success">
                                  Validado por Contabilidad
                                  {comprobante.contabilidadValidadoAt && (
                                    <span className="font-normal text-muted-foreground"> · {formatDate(comprobante.contabilidadValidadoAt)}</span>
                                  )}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">Pendiente de validación por Contabilidad</span>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleContabilidad(comprobante.id); }}
                            disabled={validatingContabilidadId === comprobante.id}
                            className={`flex items-center gap-1.5 text-xs font-medium rounded-md px-2.5 py-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                              comprobante.contabilidadValidado
                                ? 'text-muted-foreground border border-border hover:bg-muted'
                                : 'text-success border border-success/30 hover:bg-success/10 active:bg-success/20'
                            }`}
                          >
                            {validatingContabilidadId === comprobante.id
                              ? <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              : <CheckCircle className="h-3.5 w-3.5" />}
                            {validatingContabilidadId === comprobante.id
                              ? 'Guardando...'
                              : comprobante.contabilidadValidado ? 'Desmarcar validación' : 'Marcar validado por Contabilidad'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Pagination – new comprobantes */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/20">
                <span className="text-xs text-muted-foreground">Página {page} de {totalPages} · {stats.total} registros</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1 || loading}>Anterior</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages || loading}>Siguiente</Button>
                </div>
              </div>
            )}

            {/* ── Legacy section ── */}
            {(loadingLegacy || legacyRecords.length > 0) && (
              <div className="px-4 py-2.5 bg-amber-50/80 border-t border-amber-200 flex items-center gap-2">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Historial Sistema Anterior</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-600 border border-amber-200">Solo lectura</span>
              </div>
            )}

            {loadingLegacy && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-amber-500" />
              </div>
            )}

            {!loadingLegacy && legacyRecords.map((rec) => {
              const isExpanded = expandedLegacyId === rec.id;
              const legacyEstado = getLegacyEstadoCp(rec.estadoCp);
              const archivos = [
                rec.factdoc   && { label: 'Factura',         nombre: rec.factdoc,  tipo: 'factura' },
                rec.xmldoc    && { label: 'XML',              nombre: rec.xmldoc,   tipo: 'xml' },
                rec.guiadoc   && { label: 'Guía',             nombre: rec.guiadoc,  tipo: 'guia' },
                rec.pedidodoc && { label: 'Orden de Compra', nombre: rec.pedidodoc, tipo: 'pedido' },
              ].filter(Boolean) as { label: string; nombre: string; tipo: string }[];

              return (
                <div key={rec.id} className="border-b">
                  <button onClick={() => setExpandedLegacyId(isExpanded ? null : rec.id)} className="w-full text-left">
                    {/* Desktop */}
                    <div className={`hidden md:grid ${gridCols} items-center gap-3 px-4 py-3.5 hover:bg-amber-50/40 transition-colors`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{rec.numeroSerie}-{rec.numero}</p>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-600 border border-amber-200 shrink-0">Anterior</span>
                          </div>
                          <p className="text-xs text-muted-foreground">RUC: {rec.numRuc}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <span className="text-sm text-muted-foreground truncate" title={rec.nombre_empresa ?? ''}>
                          {rec.nombre_empresa ?? '—'}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${legacyEstado.color}`}>{legacyEstado.label}</span>
                      <span className="text-sm font-medium">{formatLegacyMonto(rec.monto, rec.moneda)}</span>
                      <span className="text-sm text-muted-foreground">{rec.fechaEmision ?? '—'}</span>
                      <div className="flex gap-1 flex-wrap">
                        {archivos.map((a) => (
                          <span key={a.label} className="text-xs font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{a.label}</span>
                        ))}
                        {archivos.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                      <ChevronDown className={`h-4 w-4 text-amber-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                    {/* Mobile */}
                    <div className="flex md:hidden items-center justify-between px-4 py-3.5 hover:bg-amber-50/40 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{rec.numeroSerie}-{rec.numero}</p>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-600 border border-amber-200 shrink-0">Anterior</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{rec.fechaEmision ?? '—'}</p>
                        </div>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-amber-400 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Accordion */}
                  {isExpanded && (
                    <div className="border-t bg-amber-50/30 px-4 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">Detalles</h4>
                          <div className="space-y-2">
                            {[
                              { label: 'RUC',                 value: rec.numRuc },
                              { label: 'Empresa',             value: rec.nombre_empresa },
                              { label: 'Tipo Comp.',          value: rec.codComp ? (COD_COMP_MAP[rec.codComp] ?? rec.codComp) : null },
                              { label: 'Fecha Emisión',       value: rec.fechaEmision },
                              { label: 'Fecha Vencimiento',   value: rec.fecha_vencimiento },
                              { label: 'Monto',               value: formatLegacyMonto(rec.monto, rec.moneda) !== '—' ? formatLegacyMonto(rec.monto, rec.moneda) : null },
                              { label: 'Estado CP',           value: rec.estadoCp ? (ESTADO_CP_MAP[rec.estadoCp]?.label ?? `Estado ${rec.estadoCp}`) : null },
                              { label: 'Estado Contabilidad', value: rec.estado_contabilidad },
                              { label: 'Estado Tesorería',    value: rec.estado_tesoreria },
                              { label: 'Tipo Facturación',    value: rec.tipo_facturacion },
                              { label: 'N° Orden de Compra',  value: rec.numero_orden_compra },
                              { label: 'Fecha Pago Tesorería',value: rec.fecha_pago_tesoreria },
                              { label: 'Ingreso al Sistema',  value: rec.fecha_ingreso_sistema },
                            ].map(({ label, value }) => value ? (
                              <div key={label} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{label}</span>
                                <span className="font-medium text-right max-w-[60%] truncate">{value}</span>
                              </div>
                            ) : null)}
                          </div>
                          {rec.observaciones_escritas && (
                            <div className="mt-3 p-3 bg-amber-100/60 rounded-md border border-amber-200">
                              <p className="text-xs text-amber-800">
                                <span className="font-semibold">Observaciones:</span> {rec.observaciones_escritas}
                              </p>
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">Archivos registrados</h4>
                          {archivos.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Sin archivos registrados</p>
                          ) : (
                            <div className="space-y-2">
                              {archivos.map((a) => (
                                <a
                                  key={a.label}
                                  href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/historial-legacy/${rec.id}/file/${a.tipo}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 bg-amber-100/40 hover:bg-amber-100 rounded-md px-3 py-2 border border-amber-200/60 hover:border-amber-300 transition-colors cursor-pointer"
                                >
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">{a.label}</span>
                                  <span className="text-xs text-muted-foreground truncate flex-1">{a.nombre}</span>
                                  <Download className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination – legacy */}
            {legacyTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t bg-amber-50/40">
                <span className="text-xs text-amber-700">Historial · Página {legacyPage} de {legacyTotalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setLegacyPage(p => p - 1)} disabled={legacyPage <= 1 || loadingLegacy}>Anterior</Button>
                  <Button variant="outline" size="sm" onClick={() => setLegacyPage(p => p + 1)} disabled={legacyPage >= legacyTotalPages || loadingLegacy}>Siguiente</Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ── Dialog: Descarga de lote ── */}
      {showBatchDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowBatchDialog(false)} />
          <div className="relative z-10 bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-md sm:mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="h-1.5 bg-primary" />
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Download className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Descarga de lote</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Archivos por rango de fecha</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBatchDialog(false)}
                  className="p-1 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 mb-5" />

              {isAdmin && (
                <div className="mb-4 relative">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Empresa</label>
                  {selectedRuc ? (
                    <div className="flex items-center justify-between border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-primary/5">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedNombre || selectedRuc}</p>
                        <p className="text-xs text-gray-500">RUC: {selectedRuc}</p>
                      </div>
                      <button onClick={() => { setSelectedRuc(''); setSelectedNombre(''); setBatchEmpresaQuery(''); }} className="text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        placeholder="Todas las empresas — buscar por nombre o RUC..."
                        value={batchEmpresaQuery}
                        onChange={(e) => {
                          const q = e.target.value;
                          setBatchEmpresaQuery(q);
                          setBatchShowSugerencias(true);
                          if (q.length < 2) { setBatchSugerencias([]); return; }
                          const lower = q.toLowerCase();
                          setBatchSugerencias(
                            usuarios
                              .filter((u) => u.ruc.includes(lower) || (u.nombreEmpresa ?? '').toLowerCase().includes(lower))
                              .slice(0, 20)
                              .map((u) => ({ ruc: u.ruc, nombre: u.nombreEmpresa ?? u.ruc }))
                          );
                        }}
                        onFocus={() => setBatchShowSugerencias(true)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                        autoComplete="off"
                      />
                      {batchShowSugerencias && batchSugerencias.length > 0 && (
                        <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {batchSugerencias.map((e) => (
                            <button
                              key={e.ruc}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-primary/5 border-b border-gray-100 dark:border-gray-700 last:border-0"
                              onClick={() => { setSelectedRuc(e.ruc); setSelectedNombre(e.nombre); setBatchEmpresaQuery(''); setBatchShowSugerencias(false); }}
                            >
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{e.nombre}</p>
                              <p className="text-xs text-gray-500">RUC: {e.ruc}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Fecha desde</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Fecha hasta</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Tipos de archivo</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedTypes(selectedTypes.length === ALL_FILE_TYPES.length ? [] : ALL_FILE_TYPES.map(t => t.tipo))}
                    className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                      selectedTypes.length === ALL_FILE_TYPES.length
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    Todos
                  </button>
                  {ALL_FILE_TYPES.map(({ tipo, label }) => {
                    const isSelected = selectedTypes.includes(tipo);
                    return (
                      <button
                        key={tipo}
                        onClick={() => toggleType(tipo)}
                        className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                          isSelected
                            ? `${getBadgeColor(tipo)} border-transparent`
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggle historial anterior */}
              <div className="mt-4 flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                <input
                  type="checkbox"
                  id="includeLegacy"
                  checked={includeLegacy}
                  onChange={(e) => setIncludeLegacy(e.target.checked)}
                  className="h-4 w-4 accent-amber-600 cursor-pointer"
                />
                <label htmlFor="includeLegacy" className="text-xs text-amber-800 dark:text-amber-300 font-medium cursor-pointer">
                  Incluir archivos del historial sistema anterior
                </label>
              </div>

              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Se descargará un archivo <span className="font-semibold text-gray-700 dark:text-gray-300">.zip</span> con los tipos seleccionados de los comprobantes dentro del rango, organizados por carpetas.
                </p>
              </div>

              {rangeDownload.downloading && (
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span>Descargando comprobantes...</span>
                    <span className="flex items-center gap-2">
                      {(rangeDownload.bytes / 1024 / 1024).toFixed(1)} MB
                      <button
                        type="button"
                        onClick={() => rangeDownload.controller?.abort()}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Cancelar descarga"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full w-full rounded-full" style={{ background: 'linear-gradient(90deg, hsl(var(--brand)/0.3) 0%, hsl(var(--brand)) 50%, hsl(var(--brand)/0.3) 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
                  </div>
                </div>
              )}

              {legacyBatchDownload.downloading && (
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between items-center text-xs text-amber-700 dark:text-amber-400">
                    <span>
                      {legacyBatchPercent === null ? 'Calculando tamaño...' : `Descargando historial anterior... ${legacyBatchPercent}%`}
                    </span>
                    <span className="flex items-center gap-2">
                      {(legacyBatchDownload.bytes / 1024 / 1024).toFixed(1)} MB
                      {legacyBatchDownload.totalBytes > 0 && ` de ~${(legacyBatchDownload.totalBytes / 1024 / 1024).toFixed(1)} MB`}
                      <button
                        type="button"
                        onClick={() => legacyBatchDownload.controller?.abort()}
                        className="text-amber-500 hover:text-red-500 transition-colors"
                        title="Cancelar descarga"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-amber-100 dark:bg-amber-900/40 rounded-full overflow-hidden">
                    {legacyBatchPercent === null ? (
                      <div className="h-full w-full rounded-full bg-amber-500" style={{ backgroundImage: 'linear-gradient(90deg, rgba(217,119,6,0.3) 0%, rgba(217,119,6,1) 50%, rgba(217,119,6,0.3) 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
                    ) : (
                      <div className="h-full rounded-full bg-amber-500 transition-all duration-300" style={{ width: `${legacyBatchPercent}%` }} />
                    )}
                  </div>
                </div>
              )}

              <div className={`flex flex-col-reverse gap-2 mt-6 ${includeLegacy ? '' : 'sm:flex-row sm:items-center sm:justify-end'}`}>
                <Button
                  variant="outline"
                  onClick={() => setShowBatchDialog(false)}
                  className={includeLegacy ? 'w-full' : 'w-full sm:w-auto'}
                >
                  Cancelar
                </Button>
                {includeLegacy && (
                  <Button
                    variant="warning"
                    disabled={!dateFrom || !dateTo || dateFrom > dateTo || selectedTypes.length === 0 || legacyBatchDownload.downloading}
                    onClick={handleDownloadLegacyBatch}
                    className="w-full"
                  >
                    {legacyBatchDownload.downloading
                      ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Download className="h-4 w-4" />}
                    {legacyBatchDownload.downloading ? 'Descargando...' : 'Historial anterior (.zip)'}
                  </Button>
                )}
                <Button
                  onClick={handleDownloadRange}
                  disabled={!dateFrom || !dateTo || dateFrom > dateTo || selectedTypes.length === 0 || rangeDownload.downloading}
                  className={includeLegacy ? 'w-full' : 'w-full sm:w-auto'}
                >
                  {rangeDownload.downloading
                    ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Download className="h-4 w-4" />}
                  {rangeDownload.downloading ? 'Descargando...' : 'Descargar (.zip)'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Dialog: Reporte Excel ── */}
      {showReporteDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setShowReporteDialog(false); setEmpresaQuery(''); setEmpresaSugerencias([]); setShowSugerencias(false); }} />
          <div className="relative z-10 bg-white text-gray-900 rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-md sm:mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="h-1.5 bg-success" />
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/10 rounded-lg">
                    <FileSpreadsheet className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Generar Reporte</h2>
                    <p className="text-sm text-muted-foreground">Historial sistema anterior</p>
                  </div>
                </div>
                <button onClick={() => setShowReporteDialog(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* RUC con autocomplete ES */}
                <div className="relative">
                  <label className="text-sm font-medium mb-1.5 block text-gray-700">Empresa</label>
                  {reporteRuc ? (
                    <div className="flex items-center justify-between border rounded-md px-3 py-2 bg-success/5 border-success/30">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{reporteNombre || reporteRuc}</p>
                        <p className="text-xs text-gray-500">RUC: {reporteRuc}</p>
                      </div>
                      <button onClick={() => { setReporteRuc(''); setReporteNombre(''); setEmpresaQuery(''); }} className="text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        placeholder="Buscar por nombre o RUC..."
                        value={empresaQuery}
                        onChange={(e) => {
                          const q = e.target.value;
                          setEmpresaQuery(q);
                          setShowSugerencias(true);
                          if (q.length < 2) { setEmpresaSugerencias([]); return; }
                          const lower = q.toLowerCase();
                          const filtrados = usuarios
                            .filter((u) =>
                              u.ruc.includes(lower) ||
                              (u.nombreEmpresa ?? '').toLowerCase().includes(lower)
                            )
                            .slice(0, 20)
                            .map((u) => ({ ruc: u.ruc, nombre: u.nombreEmpresa ?? u.ruc }));
                          setEmpresaSugerencias(filtrados);
                        }}
                        onFocus={() => setShowSugerencias(true)}
                        className="w-full border rounded-md px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                        autoComplete="off"
                      />
                      {showSugerencias && empresaSugerencias.length > 0 && (
                        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {empresaSugerencias.map((e) => (
                            <button
                              key={e.ruc}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-success/10 border-b last:border-0"
                              onClick={() => { setReporteRuc(e.ruc); setReporteNombre(e.nombre); setEmpresaQuery(''); setShowSugerencias(false); }}
                            >
                              <p className="text-sm font-medium text-gray-900 truncate">{e.nombre}</p>
                              <p className="text-xs text-gray-500">RUC: {e.ruc}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Rango de fechas */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Fecha desde</label>
                    <input
                      type="date"
                      value={reporteDesde}
                      onChange={(e) => setReporteDesde(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Fecha hasta</label>
                    <input
                      type="date"
                      value={reporteHasta}
                      onChange={(e) => setReporteHasta(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowReporteDialog(false)}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  variant="success"
                  disabled={!reporteRuc || generandoReporte}
                  onClick={async () => {
                    if (!reporteRuc) return;
                    setGenerandoReporte(true);
                    try {
                      const params = new URLSearchParams({ ruc: reporteRuc });
                      if (reporteDesde) params.set('desde', reporteDesde);
                      if (reporteHasta) params.set('hasta', reporteHasta);

                      const res = await apiClient.get(`/api/reportes/legacy?${params}`, { responseType: 'blob' });
                      const url = URL.createObjectURL(res.data);
                      const a = document.createElement('a');
                      a.href = url;
                      const hoy = new Date();
                      const dd = String(hoy.getDate()).padStart(2, '0');
                      const mm = String(hoy.getMonth() + 1).padStart(2, '0');
                      const yyyy = hoy.getFullYear();
                      const nombreSafe = (reporteNombre || reporteRuc).replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').trim().replace(/\s+/g, '_');
                      a.download = `reporte_${nombreSafe}_${dd}-${mm}-${yyyy}.xlsx`;
                      a.click();
                      URL.revokeObjectURL(url);
                      setShowReporteDialog(false);
                      toast.success('Reporte generado correctamente');
                    } catch {
                      toast.error('Error al generar el reporte');
                    } finally {
                      setGenerandoReporte(false);
                    }
                  }}
                  className="w-full sm:w-auto"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {generandoReporte ? 'Generando...' : 'Descargar Excel'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Botón flotante de ayuda ── */}
      <button
        id="tour-help-btn"
        onClick={startTour}
        title="Ver tutorial"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-brand text-brand-foreground shadow-lg rounded-full px-4 py-2.5 text-sm font-medium hover:bg-brand/90 transition-all hover:scale-105 active:scale-95"
      >
        <HelpCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Tutorial</span>
      </button>
    </div>
  );
}
