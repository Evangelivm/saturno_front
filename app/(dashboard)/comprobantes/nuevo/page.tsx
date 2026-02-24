'use client';

import { useState } from 'react';
import { ComprobanteForm } from '@/components/forms/comprobante-form';
import { UploadSection } from '@/components/upload/upload-section';
import { type ComprobanteFormData } from '@/shared/schemas/comprobante.schema';

export default function NuevoComprobantePage() {
  const [comprobanteId, setComprobanteId] = useState<string | null>(null);
  const [codigoAlfanumerico, setCodigoAlfanumerico] = useState<string | null>(null);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [formDataSaved, setFormDataSaved] = useState<ComprobanteFormData | null>(null);

  const handleSuccess = (id: string, codigo: string, formData: ComprobanteFormData) => {
    setComprobanteId(id);
    setCodigoAlfanumerico(codigo);
    setFormDataSaved(formData);
    setShowUploadSection(true);
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Nuevo Comprobante</h1>
          <p className="text-muted-foreground">
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
    </div>
  );
}
