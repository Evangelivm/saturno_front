import { create } from 'zustand';

export type BatchDownloadKind = 'range' | 'legacyBatch';

interface DownloadState {
  downloading: boolean;
  bytes: number;
  totalBytes: number;
  controller: AbortController | null;
}

const emptyState = (): DownloadState => ({ downloading: false, bytes: 0, totalBytes: 0, controller: null });

interface BatchDownloadStore {
  range: DownloadState;
  legacyBatch: DownloadState;
  start: (kind: BatchDownloadKind, controller: AbortController) => void;
  setBytes: (kind: BatchDownloadKind, bytes: number) => void;
  setTotalBytes: (kind: BatchDownloadKind, totalBytes: number) => void;
  finish: (kind: BatchDownloadKind) => void;
}

/**
 * Estado global (no atado al ciclo de vida de ningún componente) para las
 * descargas de lote. Antes vivía en useState/useRef de ComprobantesPage: si el
 * usuario navegaba a otra página y volvía, el componente se remontaba con
 * estado reseteado aunque el fetch siguiera corriendo en segundo plano — el
 * diálogo no mostraba el progreso real y el botón dejaba de estar deshabilitado,
 * permitiendo disparar una segunda descarga encima de la que ya corría.
 */
export const useBatchDownloadStore = create<BatchDownloadStore>((set) => ({
  range: emptyState(),
  legacyBatch: emptyState(),
  start: (kind, controller) => set({ [kind]: { ...emptyState(), downloading: true, controller } }),
  setBytes: (kind, bytes) => set((s) => ({ [kind]: { ...s[kind], bytes } })),
  setTotalBytes: (kind, totalBytes) => set((s) => ({ [kind]: { ...s[kind], totalBytes } })),
  finish: (kind) => set({ [kind]: emptyState() }),
}));
