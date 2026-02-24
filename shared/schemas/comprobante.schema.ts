import { z } from 'zod';

// Tipos de comprobante según manual SUNAT
export const TipoComprobanteEnum = z.enum(['01', '03', '04', '07', '08', 'R1', 'R7']);

// Condición de pago
export const CondicionPagoEnum = z.enum(['CONTADO', 'CREDITO']);

// Tipo de factura (solo para base de datos, no se envía a SUNAT)
export const TipoFacturaEnum = z.enum([
  'REPARACION_RECONSTRUCCION',
  'TRANSPORTE',
  'VENTA',
  'ALQUILER',
  'SERVICIO_SIN_GUIA'
]);

// Schema del formulario de comprobante
export const ComprobanteFormSchema = z.object({
  numRuc: z.string()
    .length(11, 'El RUC debe tener 11 dígitos')
    .regex(/^\d+$/, 'El RUC solo debe contener números'),

  codComp: TipoComprobanteEnum,

  numeroSerie: z.string()
    .min(1, 'Número de serie requerido')
    .max(4, 'Máximo 4 caracteres')
    .regex(/^[A-Z0-9]+$/, 'Solo letras mayúsculas y números'),

  numero: z.number()
    .int('Debe ser un número entero')
    .positive('Debe ser mayor a 0')
    .max(99999999, 'Máximo 8 dígitos'),

  fechaEmision: z.string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Formato debe ser DD/MM/YYYY'),

  condicionPago: CondicionPagoEnum,

  tipoFactura: TipoFacturaEnum,

  numeroOrden: z.string()
    .min(1, 'Número de orden requerido')
    .max(50, 'Máximo 50 caracteres'),

  monto: z.number()
    .positive('El monto debe ser mayor a 0')
    .multipleOf(0.01, 'Máximo 2 decimales')
    .optional(),
});

export type ComprobanteFormData = z.infer<typeof ComprobanteFormSchema>;

// Schema para la respuesta de SUNAT
export const SunatResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    estadoCp: z.number().optional(),
    estadoRuc: z.string().optional(),
    condDomiRuc: z.string().optional(),
    observaciones: z.array(z.string()).optional(),
  }).optional(),
  errorCode: z.string().optional(),
});

export type SunatResponse = z.infer<typeof SunatResponseSchema>;

// Schema para upload de archivos
export const FileUploadSchema = z.object({
  comprobanteId: z.string().uuid(),
  tipoArchivo: z.enum(['factura', 'xml', 'guia']),
});

export type FileUploadData = z.infer<typeof FileUploadSchema>;
