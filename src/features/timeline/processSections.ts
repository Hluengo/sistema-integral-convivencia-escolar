export const PROCESS_SECTIONS = [
  { id: 'recepcion', title: '1. Recepción y Apertura', prefix: 'chk_rec', phaseName: 'Recepción' },
  { id: 'investigacion', title: '2. Investigación', prefix: 'chk_inv', phaseName: 'Investigación' },
  { id: 'resolucion', title: '3. Análisis y Resolución', prefix: 'chk_res', phaseName: 'Resolución' },
  { id: 'impugnacion', title: '4. Apelación', prefix: 'chk_imp', phaseName: 'Apelación' },
  { id: 'seguimiento', title: '5. Seguimiento', prefix: 'chk_seg', phaseName: 'Seguimiento' },
] as const;
