'use client';

import { useState } from 'react';
import { ComprobanteForm } from '@/components/forms/comprobante-form';
import { UploadSection } from '@/components/upload/upload-section';
import { type ComprobanteFormData } from '@/shared/schemas/comprobante.schema';
import { useNuevoComprobanteTour } from '@/hooks/use-nuevo-comprobante-tour';
import { HelpCircle } from 'lucide-react';

export default function NuevoComprobantePage() {
  const [comprobanteId, setComprobanteId] = useState<string | null>(null);
  const [codigoAlfanumerico, setCodigoAlfanumerico] = useState<string | null>(null);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [formDataSaved, setFormDataSaved] = useState<ComprobanteFormData | null>(null);

  const { startTour } = useNuevoComprobanteTour(showUploadSection);

  const handleSuccess = (id: string, codigo: string, formData: ComprobanteFormData) => {
    setComprobanteId(id);
    setCodigoAlfanumerico(codigo);
    setFormDataSaved(formData);
    setShowUploadSection(true);
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Nuevo Comprobante</h1>
          <p className="text-sm text-muted-foreground">
            Valida tu comprobante con SUNAT y sube los archivos correspondientes
          </p>
        </div>

        <ComprobanteForm onSuccess={handleSuccess} />

        {showUploadSection && comprobanteId && codigoAlfanumerico && formDataSaved && (
          <UploadSection
            comprobanteId={comprobanteId}
            codigoAlfanumerico={codigoAlfanumerico}
            ruc={formDataSaved.numRuc}
            serie={formDataSaved.numeroSerie}
            numero={formDataSaved.numero}
            fechaEmision={formDataSaved.fechaEmision}
          />
        )}
      </div>

      {/* Botón flotante de ayuda */}
      <button
        id="tour-help-nuevo-btn"
        onClick={startTour}
        title="Ver tutorial"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-primary text-primary-foreground shadow-lg rounded-full px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
      >
        <HelpCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Tutorial</span>
      </button>
    </div>
  );
}
