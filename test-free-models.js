#!/usr/bin/env node
// Test free AI model API connections
import { config } from 'dotenv';

config({ path: '.env.local' });

const tests = [
  {
    name: 'Google Gemini Flash',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GOOGLE_API_KEY
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Responde solo: "Hola, Gemini Flash funciona!"' }] }]
    })
  },
  {
    name: 'Groq Llama 3.3 70B',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'Responde solo: "Hola, Groq 70B funciona!"' }],
      max_tokens: 50
    })
  },
  {
    name: 'Groq Llama 4 Scout (Fast)',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{ role: 'user', content: 'Responde solo: "Hola, Groq Scout funciona!"' }],
      max_tokens: 50
    })
  }
];

async function testAPI(test) {
  try {
    console.log(`\n🔍 Probando ${test.name}...`);
    
    const response = await fetch(test.url, {
      method: test.method,
      headers: test.headers,
      body: test.body
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error.substring(0, 200)}`);
    }
    
    const data = await response.json();
    
    let content = '';
    if (test.name.includes('Google')) {
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta';
    } else {
      content = data.choices?.[0]?.message?.content || 'Sin respuesta';
    }
    
    console.log(`✅ ${test.name} funciona!`);
    console.log(`   Respuesta: "${content.trim()}"`);
    return true;
  } catch (error) {
    console.error(`❌ ${test.name} falló:`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Probando modelos de IA gratuitos...\n');
  
  const results = await Promise.all(tests.map(testAPI));
  
  console.log('\n📊 Resumen:');
  console.log(`✅ Exitosos: ${results.filter(r => r).length}/${tests.length}`);
  
  if (results.every(r => r)) {
    console.log('\n🎉 ¡Todos los modelos gratuitos están configurados correctamente!');
  } else {
    console.log('\n⚠️  Algunos modelos fallaron. Verifica las API keys en .env.local');
  }
}

runTests();