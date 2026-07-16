import { httpsPost } from './https.js';

const GROQ_MODEL = 'llama-3.3-70b-versatile';

function getApiKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error('GROQ_API_KEY no configurada');
  }
  return key;
}

export async function callGroq(messages, systemInstruction) {
  const apiKey = getApiKey();
  const body = { model: GROQ_MODEL, messages: [] };
  if (systemInstruction) {
    body.messages.push({ role: 'system', content: systemInstruction });
  }
  body.messages.push(...messages);
  const res = await httpsPost('api.groq.com', '/openai/v1/chat/completions', body, {
    Authorization: `Bearer ${apiKey}`,
  });
  if (res.status !== 200) {
    throw new Error(`Groq API error: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body?.choices?.[0]?.message?.content || '';
}
