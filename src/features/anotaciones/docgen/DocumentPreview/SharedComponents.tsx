/** @license SPDX-License-Identifier: Apache-2.0 */

export interface LetterMetadataItem {
  label: string;
  value: React.ReactNode;
  span?: 1 | 2;
}

export interface LetterSignature {
  name: string | null | undefined;
  role: string;
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
  const cols = Math.min(Math.max(signatures.length, 1), 4);
  return (
    <div className="letter-signatures">
      <p className="letter-signatures-title">Firmas</p>
      <div
        className="letter-signature-grid"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
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
