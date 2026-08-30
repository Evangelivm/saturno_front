type TipoArchivo = 'factura' | 'xml' | 'guia' | 'ordenCompra';

interface ComprobanteFileNameParams {
  ruc: string;
  serie: string;
  numero: number | string;
  fechaEmision: string; // DD/MM/YYYY
  codigoAlfanumerico: string;
  tipo: TipoArchivo;
  originalName: string;
}

const TIPO_SUFFIJO: Record<TipoArchivo, string> = {
  factura: 'factura',
  xml: 'XML',
  guia: 'guia',
  ordenCompra: 'ordenCompra',
};

export function generateComprobanteFileName({
  ruc,
  serie,
  numero,
  fechaEmision,
  codigoAlfanumerico,
  tipo,
  originalName,
}: ComprobanteFileNameParams): string {
  const [dia, mes, año] = fechaEmision.split('/');
  const extension = originalName.split('.').pop();

  return `${ruc}-${serie}-${numero}-${dia}-${mes}-${año}-${codigoAlfanumerico}-${TIPO_SUFFIJO[tipo]}.${extension}`;
}
