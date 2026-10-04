'use client';

import { useEffect, useCallback } from 'react';

// v3: el registro ahora es atómico (se guarda solo al enviar los 4 archivos
// juntos, incluida orden de compra) — cambiar la key fuerza a que quien ya
// vio versiones anteriores vea el tour de nuevo y no se pierda el cambio.
const TOUR_KEY = 'nuevo_comprobante_tour_done_v3';

export function useNuevoComprobanteTour(showUploadSection: boolean) {
  const startTour = useCallback(async () => {
    const { driver } = await import('driver.js');
    type DriveStep = NonNullable<Parameters<typeof driver>[0]>['steps'] extends (infer S)[] | undefined ? S : never;

    const uploadStep: DriveStep[] = showUploadSection && document.querySelector('#tour-upload')
      ? [
          {
            element: '#tour-upload',
            popover: {
              title: '📎 Adjuntar archivos',
              description: 'Ahora adjunta la <b>Factura PDF</b>, el <b>XML</b>, la <b>Guía de remisión</b> (puedes subir varias fotos o PDFs sueltos, se unen en uno solo) y la <b>Orden de Compra</b>. El comprobante recién se registra cuando envías todo junto — así se evitan registros duplicados o a medio subir.',
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
          element: '#tour-ocr',
          popover: {
            title: '🤖 Autocompletar con OCR',
            description: 'Novedad: arrastra o selecciona el <b>PDF de la factura</b> acá y el sistema completa el formulario por vos automáticamente. Siempre revisa los datos extraídos antes de validar — es opcional, también podés llenarlo a mano.',
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
