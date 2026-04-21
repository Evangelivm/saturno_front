'use client';

import { useEffect, useCallback } from 'react';

const TOUR_KEY = 'nuevo_comprobante_tour_done';

export function useNuevoComprobanteTour(showUploadSection: boolean) {
  const startTour = useCallback(async () => {
    const { driver } = await import('driver.js');
    type DriveStep = NonNullable<Parameters<typeof driver>[0]>['steps'] extends (infer S)[] | undefined ? S : never;

    const uploadStep: DriveStep[] = showUploadSection && document.querySelector('#tour-upload')
      ? [
          {
            element: '#tour-upload',
            popover: {
              title: '📎 Subir archivos',
              description: '¡Comprobante validado! Ahora arrastra o selecciona los archivos: la <b>Factura PDF</b>, el <b>XML</b> firmado y la <b>Guía de remisión</b> (si aplica). Cada zona acepta solo el tipo de archivo correcto.',
              side: 'top',
              align: 'start',
            },
          },
        ]
      : [];

    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayOpacity: 0.6,
      smoothScroll: true,
      allowClose: true,
      progressText: '{{current}} de {{total}}',
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Anterior',
      doneBtnText: '¡Listo!',
      onDestroyed: () => {
        localStorage.setItem(TOUR_KEY, 'true');
      },
      steps: [
        {
          element: '#tour-form',
          popover: {
            title: '📝 Registrar un comprobante',
            description: 'Completa este formulario con los datos del comprobante. El sistema lo validará automáticamente con SUNAT antes de guardarlo.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#numRuc',
          popover: {
            title: '🏢 RUC del cliente',
            description: 'Ingresa el RUC de 11 dígitos del cliente al que emitiste el comprobante (no el tuyo).',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#codComp',
          popover: {
            title: '📄 Tipo de comprobante',
            description: 'Selecciona el tipo: Factura (01), Boleta (03), Nota de Crédito (07), etc. Debe coincidir exactamente con el documento emitido.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tipoFactura',
          popover: {
            title: '🔖 Tipo de operación',
            description: 'Indica la naturaleza del servicio: Venta, Transporte, Alquiler, etc. Esto clasifica el comprobante en el sistema.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#numeroSerie',
          popover: {
            title: '🔢 Serie y número',
            description: 'La <b>serie</b> tiene 4 caracteres (ej: F001, B001). El <b>número</b> es correlativo del comprobante. Juntos identifican el documento de forma única.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#fechaEmision',
          popover: {
            title: '📅 Fecha de emisión',
            description: 'Escribe la fecha en formato <b>DD/MM/YYYY</b> tal como aparece en el comprobante físico.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#numeroOrden',
          popover: {
            title: '📋 Orden de compra',
            description: 'Campo opcional. Si el cliente te proporcionó un número de orden de compra o servicio, ingrésalo aquí para trazabilidad.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '#tour-btn-validar',
          popover: {
            title: '✅ Validar con SUNAT',
            description: 'Al hacer clic, el sistema consulta a SUNAT en tiempo real si el comprobante existe y está aceptado. Si es válido, aparecerá la sección para subir los archivos.',
            side: 'top',
            align: 'center',
          },
        },
        ...uploadStep,
        {
          element: '#tour-help-nuevo-btn',
          popover: {
            title: '❓ Ver este tutorial de nuevo',
            description: 'Puedes relanzar este tutorial en cualquier momento desde este botón.',
            side: 'left',
            align: 'end',
          },
        },
      ],
    });

    driverObj.drive();
  }, [showUploadSection]);

  // Auto-lanzar solo la primera vez
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(TOUR_KEY)) return;

    const timer = setTimeout(() => startTour(), 600);
    return () => clearTimeout(timer);
  }, [startTour]);

  return { startTour };
}
