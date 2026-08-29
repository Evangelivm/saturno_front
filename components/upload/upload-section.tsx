'use client';

import { useState } from 'react';
import { FileDropzone } from './file-dropzone';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

interface UploadSectionProps {
  comprobanteId: string;
  codigoAlfanumerico: string;
  ruc: string;
  serie: string;
  numero: number;
  fechaEmision: string; // DD/MM/YYYY
}

export function UploadSection({
  comprobanteId,
  codigoAlfanumerico,
  ruc,
  serie,
  numero,
  fechaEmision,
}: UploadSectionProps) {
  const [uploads, setUploads] = useState({
    factura: false,
    xml: false,
    guia: false,
  });

  // Generar nombre de archivo según nomenclatura
  const generateFileName = (tipo: 'factura' | 'xml' | 'guia', originalName: string) => {
    const [dia, mes, año] = fechaEmision.split('/');
    const extension = originalName.split('.').pop();
    const tipoSuffix = tipo === 'factura' ? 'factura' : tipo === 'xml' ? 'XML' : 'guia';

    return `${ruc}-${serie}-${numero}-${dia}-${mes}-${año}-${codigoAlfanumerico}-${tipoSuffix}.${extension}`;
  };

  const handleUpload = async (file: File, tipo: 'factura' | 'xml' | 'guia') => {
    const newFileName = generateFileName(tipo, file.name);

    // Crear FormData con el archivo renombrado
    const formData = new FormData();
    const renamedFile = new File([file], newFileName, { type: file.type });
    formData.append('file', renamedFile);
    formData.append('tipoArchivo', tipo);

    try {
      // axios (empaquetado por Next.js/Webpack en este proyecto) termina serializando
      // el FormData como JSON en vez de mandarlo como multipart — bug conocido de
      // axios con ciertos bundlers. fetch() nativo nunca pasa por esa lógica: maneja
      // el FormData directo, con el boundary correcto siempre.
      const res = await fetch(
        `${apiClient.defaults.baseURL}/api/comprobantes/${comprobanteId}/upload`,
        {
          method: 'POST',
          credentials: 'include',
          body: formData,
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || `Error ${res.status}`);
      }

      if (data.success) {
        setUploads(prev => ({ ...prev, [tipo]: true }));
        toast.success(`${tipo.toUpperCase()} subido correctamente`);
      }
    } catch (error: any) {
      toast.error(`Error al subir ${tipo}: ${error.message}`);
    }
  };

  return (
    <Card id="tour-upload">
      <CardHeader>
        <CardTitle>Subir Archivos del Comprobante</CardTitle>
        <p className="text-sm text-muted-foreground">
          Arrastra y suelta los archivos en las zonas correspondientes
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FileDropzone
            label="Factura (PDF)"
            accept={{ 'application/pdf': ['.pdf'] }}
            onDrop={(files) => handleUpload(files[0], 'factura')}
            uploaded={uploads.factura}
          />

          <FileDropzone
            label="XML"
            accept={{ 'application/xml': ['.xml'], 'text/xml': ['.xml'] }}
            onDrop={(files) => handleUpload(files[0], 'xml')}
            uploaded={uploads.xml}
          />

          <FileDropzone
            label="Guía (PDF)"
            accept={{ 'application/pdf': ['.pdf'] }}
            onDrop={(files) => handleUpload(files[0], 'guia')}
            uploaded={uploads.guia}
          />
        </div>
      </CardContent>
    </Card>
  );
}
