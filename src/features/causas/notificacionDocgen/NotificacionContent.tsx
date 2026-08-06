/** @license SPDX-License-Identifier: Apache-2.0 */

import { forwardRef } from 'react';
import {
  LetterInstitutionalHeader,
  LetterMetadataGrid,
  LetterSignatureGrid,
  LetterTitle,
  Section,
} from '@/src/features/anotaciones/docgen/DocumentPreview/SharedComponents';
import '@/src/features/anotaciones/docgen/letter-document.css';
import { NOTIFICATION_SECTIONS } from './defaultContent';
import type { NotificacionExpedienteData, NotificationContent } from './types';

interface NotificacionContentProps {
  id?: string;
  content: NotificationContent;
  expediente: NotificacionExpedienteData;
  apoderadoName: string;
  emittedBy: string;
  emissionDate: string;
  className?: string;
  logoSrc?: string | null;
  institutionName?: string | null;
  onLogoError?: () => void;
}

/**
 * Hoja oficial de Notificación de Inicio de Indagación en formato Carta
 * (216x279mm), reutilizando el diseño institucional de cartas
 * (letter-document.css, membrete y título compartidos). El control de
 * desbordamiento se hace visible en el generador (LetterPreviewViewport), no
 * con cortes silenciosos.
 */
const NotificacionContent = forwardRef<HTMLDivElement, NotificacionContentProps>(
  function NotificacionContent(
    {
      id = 'notificacion-preview-letter',
      content,
      expediente,
      apoderadoName,
      emittedBy,
      emissionDate,
      className = '',
      logoSrc,
      institutionName,
      onLogoError,
    },
    ref,
  ) {
    return (
      <div ref={ref} id={id} className={`letter-document letter-document--compact ${className}`}>
        {' '}
        <LetterInstitutionalHeader
          year="2026"
          logoSrc={logoSrc ?? undefined}
          institutionName={institutionName ?? undefined}
          department="ENCARGADO DE INDAGACIÓN"
          onLogoError={onLogoError}
        />
        <LetterTitle>Notificación de Inicio de Indagación</LetterTitle>
        <LetterMetadataGrid
          items={[
            { label: 'Expediente', value: expediente.expedienteId },
            { label: 'Estudiante', value: expediente.studentName },
            { label: 'Curso', value: expediente.course || 'No registrado' },
            { label: 'Fecha de apertura', value: expediente.fechaApertura || 'No registrada' },
            { label: 'Responsable del caso', value: expediente.responsable },
            { label: 'Tipo de infracción', value: expediente.tipoInfraccion },
            { label: 'Estado actual', value: expediente.estadoActual },
            { label: 'Apoderado/a', value: apoderadoName || '_________________________' },
            {
              label: 'Fecha de emisión',
              value: emissionDate || '_________________________',
              span: 2,
            },
          ]}
        />
        {NOTIFICATION_SECTIONS.map((section, index) => (
          <Section key={section.key} number={index + 1} title={section.title}>
            <p className="letter-section-body">
              {content[section.key] || '_________________________'}
            </p>
          </Section>
        ))}
        <LetterSignatureGrid
          title={null}
          signatures={[
            { name: emittedBy, role: 'Encargado de Indagación' },
            { name: '', role: 'Apoderado/a recibe y firma' },
          ]}
        />
      </div>
    );
  },
);

export default NotificacionContent;
