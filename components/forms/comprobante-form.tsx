'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileDropzone } from '@/components/upload/file-dropzone';
import { ComprobanteFormSchema, type ComprobanteFormData } from '@/shared/schemas/comprobante.schema';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

interface ComprobanteFormProps {
  onSuccess: (comprobanteId: string, codigo: string, formData: ComprobanteFormData) => void;
}

export function ComprobanteForm({ onSuccess }: ComprobanteFormProps) {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [formData, setFormData] = useState<ComprobanteFormData>({
    numRuc: '',
    codComp: '01',
    numeroSerie: '',
    numero: 0,
    fechaEmision: '',
    condicionPago: 'CONTADO',
    credito: undefined,
    tipoFactura: 'VENTA',
    numeroOrden: '',
    monto: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);

  const handleExtract = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setExtracting(true);
    try {
      const ocrFormData = new FormData();
      ocrFormData.append('file', file);

      // fetch() nativo, no axios: evita el bug de serialización de FormData con
      // el bundler de este proyecto (ver comentarios en upload-section.tsx).
      const res = await fetch(`${apiClient.defaults.baseURL}/api/ocr/extract`, {
        method: 'POST',
        credentials: 'include',
        body: ocrFormData,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || `Error ${res.status}`);

      const fields = body.data ?? {};
      setFormData(prev => ({
        ...prev,
        numRuc: fields.numRuc ?? prev.numRuc,
        codComp: fields.codComp ?? prev.codComp,
        numeroSerie: fields.numeroSerie ?? prev.numeroSerie,
        numero: fields.numero ?? prev.numero,
        fechaEmision: fields.fechaEmision ?? prev.fechaEmision,
        monto: fields.monto ?? prev.monto,
      }));
      setExtracted(true);
      toast.success('Datos extraídos del PDF — revísalos antes de validar');
    } catch (error: any) {
      toast.error(error.message || 'No se pudo extraer datos del archivo');
    } finally {
      setExtracting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'numero' || name === 'monto' ? (value ? parseFloat(value) : undefined) : value,
    }));
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Validar con Zod
      const validatedData = ComprobanteFormSchema.parse(formData);

      // Enviar al backend
      const response = await apiClient.post('/api/comprobantes', validatedData);

      // El comprobante siempre queda registrado aunque la validación con SUNAT
      // falle o quede pendiente (ver comprobantes.service.ts) — "success" solo
      // describe el resultado de esa validación, no si se guardó o no.
      if (response.data.success === true) {
        toast.success('Comprobante validado exitosamente');
      } else if (response.data.success === false) {
        toast.warning(response.data.message || 'Comprobante registrado, pero no se pudo validar con SUNAT');
      } else {
        toast.info(response.data.message || 'Comprobante registrado. Se validará cuando SUNAT esté disponible.');
      }
      onSuccess(response.data.data.id, response.data.data.codigoAlfanumerico, validatedData);
    } catch (error: any) {
      if (error.errors) {
        // Errores de validación de Zod
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          if (err.path) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
      } else {
        toast.error(error.response?.data?.message || 'Error al procesar la solicitud');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card id="tour-form">
      <CardHeader>
        <CardTitle>Validar Comprobante</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isAdmin && (
            <div className="space-y-2">
              <Label>Autocompletar desde PDF (opcional)</Label>
              <FileDropzone
                label={extracting ? 'Extrayendo datos...' : 'Autocompletar con OCR'}
                accept={{ 'application/pdf': ['.pdf'] }}
                onDrop={handleExtract}
                uploaded={extracted}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numRuc">RUC</Label>
              <Input
                id="numRuc"
                name="numRuc"
                value={formData.numRuc}
                onChange={handleChange}
                maxLength={11}
                placeholder="20123456789"
              />
              {errors.numRuc && <p className="text-sm text-red-600">{errors.numRuc}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="codComp">Tipo de Comprobante</Label>
              <Select
                id="codComp"
                name="codComp"
                value={formData.codComp}
                onChange={handleChange}
              >
                <option value="01">Factura (01)</option>
                <option value="03">Boleta (03)</option>
                <option value="04">Liquidación (04)</option>
                <option value="07">Nota de Crédito (07)</option>
                <option value="08">Nota de Débito (08)</option>
                <option value="R1">Recibo por Honorarios (R1)</option>
                <option value="R7">Nota de Crédito RHE (R7)</option>
              </Select>
              {errors.codComp && <p className="text-sm text-red-600">{errors.codComp}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoFactura">Tipo de Factura</Label>
              <Select
                id="tipoFactura"
                name="tipoFactura"
                value={formData.tipoFactura}
                onChange={handleChange}
              >
                <option value="VENTA">Venta</option>
                <option value="REPARACION_RECONSTRUCCION">Reparación / Reconstrucción</option>
                <option value="TRANSPORTE">Transporte</option>
                <option value="ALQUILER">Alquiler</option>
                <option value="SERVICIO_SIN_GUIA">Servicio (sin guía)</option>
              </Select>
              {errors.tipoFactura && <p className="text-sm text-red-600">{errors.tipoFactura}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeroSerie">Serie</Label>
              <Input
                id="numeroSerie"
                name="numeroSerie"
                value={formData.numeroSerie}
                onChange={handleChange}
                maxLength={4}
                placeholder="F001"
              />
              {errors.numeroSerie && <p className="text-sm text-red-600">{errors.numeroSerie}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                name="numero"
                type="number"
                value={formData.numero || ''}
                onChange={handleChange}
                placeholder="1234"
              />
              {errors.numero && <p className="text-sm text-red-600">{errors.numero}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaEmision">Fecha de Emisión</Label>
              <Input
                id="fechaEmision"
                name="fechaEmision"
                value={formData.fechaEmision}
                onChange={handleChange}
                placeholder="DD/MM/YYYY"
              />
              {errors.fechaEmision && <p className="text-sm text-red-600">{errors.fechaEmision}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="condicionPago">Condición de Pago</Label>
              <Select
                id="condicionPago"
                name="condicionPago"
                value={formData.condicionPago}
                onChange={handleChange}
              >
                <option value="CONTADO">Contado</option>
                <option value="CREDITO">Crédito</option>
              </Select>
              {errors.condicionPago && <p className="text-sm text-red-600">{errors.condicionPago}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="credito">Crédito</Label>
              <Select
                id="credito"
                name="credito"
                value={formData.credito ?? ''}
                onChange={handleChange}
              >
                <option value="">Seleccione</option>
                <option value="7">7 días</option>
                <option value="15">15 días</option>
                <option value="30">30 días</option>
                <option value="45">45 días</option>
                <option value="90">90 días</option>
              </Select>
              {errors.credito && <p className="text-sm text-red-600">{errors.credito}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeroOrden">N° Orden de Compra/Servicio</Label>
              <Input
                id="numeroOrden"
                name="numeroOrden"
                value={formData.numeroOrden}
                onChange={handleChange}
                placeholder="OC-2025-001"
                maxLength={50}
              />
              {errors.numeroOrden && <p className="text-sm text-red-600">{errors.numeroOrden}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monto">Monto (opcional)</Label>
              <Input
                id="monto"
                name="monto"
                type="number"
                step="0.01"
                value={formData.monto || ''}
                onChange={handleChange}
                placeholder="150.00"
              />
              {errors.monto && <p className="text-sm text-red-600">{errors.monto}</p>}
            </div>
          </div>

          <Button id="tour-btn-validar" type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Validando...' : 'Validar Comprobante'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
