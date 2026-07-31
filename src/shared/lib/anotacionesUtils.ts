/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

export const maskName = (name: string, privacyMode: boolean): string => {
  if (!privacyMode) {
    return name;
  }
  const parts = name.split(' ');
  return parts
    .map((part, index) => {
      if (index === 0) {
        return part.charAt(0) + '•'.repeat(Math.max(2, part.length - 1));
      }
      if (index === 2) {
        return part.charAt(0) + '•'.repeat(Math.max(2, part.length - 1));
      }
      return `${part.charAt(0)}.`;
    })
    .join(' ');
};

export const maskRut = (rut?: string, privacyMode = true): string => {
  if (!rut) {
    return 'N/A';
  }
  if (!privacyMode) {
    return rut;
  }
  const parts = rut.split('-');
  if (parts.length < 2) {
    return '**.***.***-*';
  }
  const mainParts = parts[0].split('.');
  if (mainParts.length < 3) {
    return '**.***.***-*';
  }
  return `${mainParts[0]}.${mainParts[1]}.***-*`;
};

export interface SemaphoricStyle {
  badge: string;
  dot: string;
  text: string;
  rowBg: string;
}

export const getSemaphoricStyle = (count: number): SemaphoricStyle => {
  if (count < 5) {
    return {
      badge: 'bg-leve-50 text-leve-700 border-leve-200',
      dot: 'bg-leve-500',
      text: 'text-leve-700 font-semibold',
      rowBg: 'hover:bg-slate-50/50',
    };
  }
  if (count < 10) {
    return {
      badge: 'bg-grave-50 text-grave-700 border-grave-200',
      dot: 'bg-grave-500',
      text: 'text-grave-700 font-semibold',
      rowBg: 'hover:bg-grave-50/20 bg-grave-50/5',
    };
  }
  if (count < 15) {
    return {
      badge: 'bg-muygrave-50 text-muygrave-700 border-muygrave-200',
      dot: 'bg-muygrave-500',
      text: 'text-muygrave-700 font-semibold',
      rowBg: 'hover:bg-muygrave-50/20 bg-muygrave-50/5',
    };
  }
  return {
    badge: 'bg-gravisima-50 text-gravisima-700 border-gravisima-200',
    dot: 'bg-gravisima-500',
    text: 'text-gravisima-700 font-extrabold',
    rowBg: 'hover:bg-gravisima-50/20 bg-gravisima-50/5',
  };
};

export const TEACHERS_BY_COURSE: Record<string, string> = {
  '1° Básico A': 'CONSTANZA ESPINOZA MIRANDA',
  '1° Básico B': 'NATALIA ALBORNOZ RODRÍGUEZ',
  '2° Básico A': 'CAMILA GODOY VENEGAS',
  '2° Básico B': 'BELÉN FUENTES SALAZAR',
  '3° Básico A': 'ESPERANZA MORAGA SAINT JOUR',
  '3° Básico B': 'MARÍA OLIVIA GARCÉS',
  '4° Básico A': 'JAVIERA JOFRÉ SAN MARTÍN',
  '4° Básico B': 'CAROLINA RUÍZ RISOPATRÓN',
  '5° Básico A': 'PAMELA JARA GONZÁLEZ',
  '5° Básico B': 'VIVIANA SAAVEDRA BARRERA',
  '6° Básico A': 'SILVANA PINCHEIRA RODRÍGUEZ',
  '6° Básico B': 'ROSARIO SALINAS CAMPOS',
  '7° Básico A': 'MARCELO MUÑOZ PINO',
  '7° Básico B': 'MARÍA ISABEL MATUS RETAMAL',
  '8° Básico A': 'VANNIA RETAMAL SALGADO',
  '8° Básico B': 'PATRICIO ZAMBRANO ASENCIO',
  '1° Medio A': 'ESTER CONTRERAS ESPINOZA',
  '1° Medio B': 'MARITZA CARRASCO PALMA',
  '2° Medio A': 'PERCY ROCHA LUNA',
  '2° Medio B': 'JEREMY PÉREZ MUÑOZ',
  '3° Medio A': 'ANGELO FREIRE CONTRERAS',
  '3° Medio B': 'CAROLINA AGÜERO CÁRDENAS',
  '4° Medio A': 'VICENTE BURGOS ESTRADA',
  '4° Medio B': 'KEYLA RODRÍGUEZ SANHUEZA',
};

export const getCurrentDateStr = (): string => {
  return new Date().toLocaleDateString('es-CL', {
    timeZone: 'America/Santiago',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};
