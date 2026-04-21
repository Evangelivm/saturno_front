'use client';

import { useEffect, useCallback } from 'react';

const TOUR_KEY = 'comprobantes_tour_done';

export function useComprobantesTour(isAdmin: boolean) {
  const startTour = useCallback(async () => {
    const { driver } = await import('driver.js');
    type DriveStep = NonNullable<Parameters<typeof driver>[0]>['steps'] extends (infer S)[] | undefined ? S : never;

    const steps: DriveStep[] = [
      {
        element: '#tour-header',
        popover: {
          title: '👋 Bienvenido a Comprobantes',
          description: 'Desde aquí puedes gestionar todos tus comprobantes electrónicos validados con SUNAT. Te mostramos cómo funciona cada sección.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-stats',
        popover: {
          title: '📊 Resumen general',
          description: 'Aquí ves de un vistazo cuántos comprobantes tienes en total, cuántos fueron validados exitosamente por SUNAT y cuántos fueron rechazados.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-search',
        popover: {
          title: '🔍 Buscar comprobantes',
          description: 'Filtra la lista escribiendo el número de serie, RUC del cliente, código alfanumérico o estado (ACEPTADO, RECHAZADO, etc.).',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-table',
        popover: {
          title: '📋 Lista de comprobantes',
          description: 'Cada fila es un comprobante. Haz clic en cualquier fila para expandirla y ver todos sus detalles, archivos adjuntos (PDF, XML, guía) y opciones de descarga.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '#tour-btn-nuevo',
        popover: {
          title: '➕ Crear comprobante',
          description: 'Haz clic aquí para registrar un nuevo comprobante. Podrás subir la factura, XML, guía de remisión y orden de compra.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '#tour-btn-lote',
        popover: {
          title: '📦 Descarga de lote',
          description: 'Descarga múltiples comprobantes en un solo archivo ZIP. Puedes filtrar por rango de fechas y elegir qué tipos de archivos incluir (factura, XML, guía, orden de compra).',
          side: 'bottom',
          align: 'end',
        },
      },
      ...(isAdmin && document.querySelector('#tour-btn-reporte')
        ? [
            {
              element: '#tour-btn-reporte',
              popover: {
                title: '📊 Reporte Excel',
                description: 'Como administrador puedes generar un reporte Excel del historial del sistema anterior, filtrado por empresa y rango de fechas.',
                side: 'bottom' as const,
                align: 'end' as const,
              },
            },
          ]
        : []),
      {
        element: '#tour-help-btn',
        popover: {
          title: '❓ Ver este tutorial de nuevo',
          description: 'Puedes volver a ver este tutorial en cualquier momento haciendo clic en este botón.',
          side: 'left',
          align: 'end',
        },
      },
    ];

    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayOpacity: 0.6,
      smoothScroll: true,
      allowClose: true,
      progressText: '{{current}} de {{total}}',
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Anterior',
      doneBtnText: '¡Entendido!',
      onDestroyed: () => {
        localStorage.setItem(TOUR_KEY, 'true');
      },
      steps,
    });

    driverObj.drive();
  }, [isAdmin]);

  // Auto-lanzar solo la primera vez
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(TOUR_KEY)) return;

    const timer = setTimeout(() => {
      startTour();
    }, 800);

    return () => clearTimeout(timer);
  }, [startTour]);

  return { startTour };
}
