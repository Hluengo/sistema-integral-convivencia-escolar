/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Annotation } from '../../../../types';

export interface LetterMetadataItem {
  label: string;
  value: React.ReactNode;
  span?: 1 | 2;
}

export interface LetterSignature {
  name: string | null | undefined;
  role: string;
}

export function AnnotationsList({ annotations }: { annotations: Annotation[] }) {
  if (!annotations.length) {
    return (
      <p style={{ color: '#9ca3af', fontSize: '10pt', fontStyle: 'italic' }}>
        No se han seleccionado anotaciones.
      </p>
    );
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {annotations.map((ann, idx) => (
        <li
          key={ann.id}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            borderBottom: '1px dashed #e5e7eb',
            paddingBottom: '6px',
            marginBottom: '6px',
            fontSize: '10pt',
            color: '#374151',
          }}
        >
          <span
            style={{
              width: '20px',
              flexShrink: 0,
              textAlign: 'right',
              fontFamily: 'monospace',
              color: '#9ca3af',
            }}
          >
            {idx + 1}.
          </span>
          <span
            style={{
              flexShrink: 0,
              whiteSpace: 'nowrap',
              fontWeight: 500,
              color: '#6b7280',
              fontSize: '9pt',
            }}
          >
            {ann.date
              ? new Date(ann.date).toLocaleDateString('es-CL', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })
              : '—'}
          </span>
          <span style={{ color: '#374151', lineHeight: 1.4 }}>{ann.text}</span>
          <span
            style={{
              marginLeft: 'auto',
              flexShrink: 0,
              padding: '2px 6px',
              borderRadius: '9999px',
              fontWeight: 600,
              fontSize: '9pt',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background:
                ann.severity === 'Leve'
                  ? '#fef9c3'
                  : ann.severity === 'Grave'
                    ? '#ffedd5'
                    : ann.severity === 'Muy Grave'
                      ? '#fee2e2'
                      : '#ffe4e6',
              color:
                ann.severity === 'Leve'
                  ? '#a16207'
                  : ann.severity === 'Grave'
                    ? '#c2410c'
                    : ann.severity === 'Muy Grave'
                      ? '#dc2626'
                      : '#be123c',
            }}
          >
            {ann.severity}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="letter-section">
      <h3 className="letter-section-heading">
        <span className="letter-section-number">{number}</span>
        {title}
      </h3>
      <div className="letter-section-body">{children}</div>
    </div>
  );
}

export function DataRow({ label, value }: { label: string; value: string | number }) {
  return (
    <p className="letter-data-row">
      <span className="letter-data-label">{label}:</span>
      <span className="letter-data-value">{value}</span>
    </p>
  );
}

export function LetterInstitutionalHeader({
  year = '2026',
  logoSrc,
}: {
  year?: string;
  logoSrc?: string;
}) {
  return (
    <div className="letter-header">
      <img
        src={
          logoSrc ||
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%23e5e7eb' rx='8'/%3E%3Ctext x='30' y='36' text-anchor='middle' font-size='10' fill='%239ca3af' font-family='sans-serif'%3ELOGO%3C/text%3E%3C/svg%3E"
        }
        alt="Logo Colegio"
        className="letter-header-logo"
      />
      <div className="letter-header-text">
        <span className="letter-header-institution">
          Fundación Educacional Colegio Carmela Romero de Espinosa
        </span>
        <span className="letter-header-department">DIRECCIÓN DE CONVIVENCIA ESCOLAR</span>
        <span className="letter-header-year">Año {year}</span>
      </div>
    </div>
  );
}

export function LetterTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="letter-title">{children}</h2>;
}

export function LetterMetadataGrid({ items }: { items: LetterMetadataItem[] }) {
  return (
    <div className="letter-metadata-grid">
      {items.map((item, idx) => (
        <div
          key={idx}
          className={`letter-metadata-item${item.span === 2 ? ' letter-metadata-item--full' : ''}`}
        >
          <span className="letter-metadata-label">{item.label}</span>
          <span className="letter-metadata-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function LetterSignatureGrid({ signatures }: { signatures: LetterSignature[] }) {
  return (
    <div className="letter-signatures">
      <p className="letter-signatures-title">Firmas</p>
      <div className="letter-signature-grid">
        {signatures.map((sig, idx) => (
          <div key={idx} className="letter-signature-item">
            <div className="letter-signature-line">{sig.name || '_________________________'}</div>
            <p className="letter-signature-role">{sig.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
