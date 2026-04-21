'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ComprobanteFormSchema, type ComprobanteFormData } from '@/shared/schemas/comprobante.schema';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

interface ComprobanteFormProps {
  onSuccess: (comprobanteId: string, codigo: string, formData: ComprobanteFormData) => void;
}

export function ComprobanteForm({ onSuccess }: ComprobanteFormProps) {
  const [formData, setFormData] = useState<ComprobanteFormData>({
    numRuc: '',
    codComp: '01',
    numeroSerie: '',
    numero: 0,
    fechaEmision: '',
    condicionPago: 'CONTADO',
    tipoFactura: 'VENTA',
    numeroOrden: '',
    monto: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

      if (response.data.success) {
        toast.success('Comprobante validado exitosamente');
        onSuccess(response.data.data.id, response.data.data.codigoAlfanumerico, validatedData);
      } else {
        toast.error(response.data.message || 'Error en la validación');
      }
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

          <Button id="tour-btn-validar" type="submit" className="w-full" disabled={loading}>
            {loading ? 'Validando...' : 'Validar Comprobante'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
