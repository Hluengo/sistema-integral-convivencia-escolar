/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Annotation } from '../../../../types';

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
