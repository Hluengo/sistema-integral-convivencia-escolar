/** @license SPDX-License-Identifier: Apache-2.0 */

export const maskName = (name: string, privacyMode: boolean): string => {
  if (!privacyMode) return name;
  const parts = name.split(' ');
  return parts
    .map((part, index) => {
      if (index === 0) return part.charAt(0) + '•'.repeat(Math.max(2, part.length - 1));
      if (index === 2) return part.charAt(0) + '•'.repeat(Math.max(2, part.length - 1));
      return part.charAt(0) + '.';
    })
    .join(' ');
};

export const maskRut = (rut?: string, privacyMode = true): string => {
  if (!rut) return 'N/A';
  if (!privacyMode) return rut;
  const parts = rut.split('-');
  if (parts.length < 2) return '**.***.***-*';
  const mainParts = parts[0].split('.');
  if (mainParts.length < 3) return '**.***.***-*';
  return `${mainParts[0]}.${mainParts[1]}.***-*`;
};

export interface SemaphoricStyle {
  badge: string;
  dot: string;
  text: string;
  rowBg: string;
}

export interface SemaphoricStyleCompact {
  text: string;
  label: string;
}

export const getSemaphoricStyle = (count: number): SemaphoricStyle => {
  if (count < 5) {
    return {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      text: 'text-emerald-700 font-semibold',
      rowBg: 'hover:bg-slate-50/50'
    };
  } else if (count < 10) {
    return {
      badge: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      dot: 'bg-yellow-500',
      text: 'text-yellow-700 font-semibold',
      rowBg: 'hover:bg-yellow-50/20 bg-yellow-50/5'
    };
  } else if (count < 15) {
    return {
      badge: 'bg-orange-50 text-orange-800 border-orange-200',
      dot: 'bg-orange-500',
      text: 'text-orange-700 font-semibold',
      rowBg: 'hover:bg-orange-50/20 bg-orange-50/5'
    };
  } else {
    return {
      badge: 'bg-rose-50 text-rose-800 border-rose-200',
      dot: 'bg-rose-500',
      text: 'text-rose-700 font-extrabold',
      rowBg: 'hover:bg-rose-50/20 bg-rose-50/5'
    };
  }
};

export const getSemaphoricStyleCompact = (count: number): SemaphoricStyleCompact => {
  if (count < 5) return { text: 'text-emerald-700 bg-emerald-50 border-emerald-200', label: 'Verde (Buen comportamiento)' };
  if (count < 10) return { text: 'text-yellow-700 bg-yellow-50 border-yellow-200', label: 'Amarillo (Advertencia)' };
  if (count < 15) return { text: 'text-orange-700 bg-orange-50 border-orange-200', label: 'Naranja (Compromiso)' };
  return { text: 'text-rose-700 bg-rose-50 border-rose-200', label: 'Rojo (Alerta Crítica)' };
};

export const getCurrentDateStr = (): string => {
  return new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};
