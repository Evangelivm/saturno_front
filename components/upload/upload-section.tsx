'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileDropzone } from './file-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import apiClient from '@/lib/api-client';
import { type ComprobanteFormData } from '@/shared/schemas/comprobante.schema';
import { toast } from 'sonner';
import { X } from 'lucide-react';

interface UploadSectionProps {
  formData: ComprobanteFormData;
}

const GUIA_ACCEPT = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

const ORDEN_COMPRA_ACCEPT = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

export function UploadSection({ formData }: UploadSectionProps) {
  const router = useRouter();
  const requiereGuia = formData.tipoFactura !== 'SERVICIO_SIN_GUIA';

  const [factura, setFactura] = useState<File | null>(null);
  const [xml, setXml] = useState<File | null>(null);
  const [guia, setGuia] = useState<File[]>([]);
  const [ordenCompra, setOrdenCompra] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const removeGuiaFile = (index: number) => {
    setGuia((prev) => prev.filter((_, i) => i !== index));
  };

  const allReady = !!factura && !!xml && !!ordenCompra && (!requiereGuia || guia.length > 0);

  const handleSubmit = async () => {
    if (!allReady || submitting) return;
    setSubmitting(true);

    try {
      const body = new FormData();
      body.append('data', JSON.stringify(formData));
      body.append('factura', factura!);
      body.append('xml', xml!);
      guia.forEach((f) => body.append('guia', f));
      body.append('ordenCompra', ordenCompra!);

      // fetch() nativo, no axios: axios (empaquetado por Next.js/Webpack en este
      // proyecto) termina serializando el FormData como JSON en vez de mandarlo
      // como multipart — bug conocido de axios con ciertos bundlers.
      const res = await fetch(`${apiClient.defaults.baseURL}/api/comprobantes`, {
        method: 'POST',
        credentials: 'include',
        body,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);

      if (data.success === true) {
        toast.success('Comprobante registrado y validado con SUNAT');
      } else if (data.success === false) {
        toast.warning(data.message || 'Comprobante registrado, pero no se pudo validar con SUNAT');
      } else {
        toast.info(data.message || 'Comprobante registrado. Se validará cuando SUNAT esté disponible.');
      }
      router.push('/comprobantes');
    } catch (error: any) {
      toast.error(error.message || 'Error al registrar el comprobante');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card id="tour-upload">
      <CardHeader>
        <CardTitle>Adjuntar Archivos del Comprobante</CardTitle>
        <p className="text-sm text-muted-foreground">
          Los archivos son obligatorios y el comprobante recién se guarda cuando envías todo junto — así se evitan registros duplicados o incompletos.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FileDropzone
            label="Factura (PDF)"
            accept={{ 'application/pdf': ['.pdf'] }}
            onDrop={(files) => setFactura(files[0])}
            uploaded={!!factura}
          />

          <FileDropzone
            label="XML"
            accept={{ 'application/xml': ['.xml'], 'text/xml': ['.xml'] }}
            onDrop={(files) => setXml(files[0])}
            uploaded={!!xml}
          />

          <div className="space-y-2">
            {requiereGuia ? (
              <FileDropzone
                label={guia.length > 0 ? `Guía (${guia.length} archivo${guia.length > 1 ? 's' : ''})` : 'Guía (PDF o fotos — puedes subir varios)'}
                accept={GUIA_ACCEPT}
                maxFiles={10}
                onDrop={(files) => setGuia((prev) => [...prev, ...files])}
                uploaded={guia.length > 0}
              />
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground bg-muted/20">
                No se requiere guía para &quot;Servicio (sin guía)&quot;
              </div>
            )}
            {guia.length > 0 && (
              <ul className="space-y-1">
                {guia.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1">
                    <span className="truncate">{f.name}</span>
                    <button type="button" onClick={() => removeGuiaFile(i)} className="text-muted-foreground hover:text-red-600 shrink-0 ml-2">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {guia.length > 1 && (
              <p className="text-xs text-muted-foreground">Se unirán en un solo PDF al registrar el comprobante.</p>
            )}
          </div>

          <FileDropzone
            label="Orden de Compra"
            accept={ORDEN_COMPRA_ACCEPT}
            onDrop={(files) => setOrdenCompra(files[0])}
            uploaded={!!ordenCompra}
          />
        </div>

        <Button onClick={handleSubmit} disabled={!allReady || submitting} size="lg" className="w-full">
          {submitting ? 'Registrando...' : 'Registrar Comprobante'}
        </Button>
      </CardContent>
    </Card>
  );
}
