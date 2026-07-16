const MAX_STR = 10000;

export const sanitize = (s) => {
  if (typeof s !== 'string') {
    return '';
  }
  return s.slice(0, MAX_STR).replace(/[\x00-\x1F\x7F-\x9F]/g, '');
};

export const requireStr = (obj, key, max = 200) => {
  const v = sanitize(obj[key]);
  if (!v) {
    throw new Error(`Campo requerido faltante: ${key}`);
  }
  return v.slice(0, max);
};

export const optStr = (obj, key, max = MAX_STR) => sanitize(obj[key]).slice(0, max);

export const optArr = (obj, key) => (Array.isArray(obj[key]) ? obj[key] : []);

export function sanitizeForAI(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return (
    text
      .replace(/\[INST\]|\[\/INST\]|<<SYS>>|<<\/SYS>>/gi, '')
      .replace(/<\|im_start\|>|<\|im_end\|>/gi, '')
      .replace(/<\|system\|>|<\|user\|>|<\|assistant\|>/gi, '')
      .replace(
        /^(ignore|olvida|disregard|anula).{0,50}(instrucciones|instructions|reglas|rules|sistema|system)/gim,
        ''
      )
      .replace(
        /(eres|you are|act as|actúa como|actuá como).{0,30}(un|a|el|la|un(a)?\s+abogado|lawyer|juez|judge)/gim,
        ''
      )
      .replace(/\n{3,}/g, '\n\n')
      .slice(0, MAX_STR)
  );
}
