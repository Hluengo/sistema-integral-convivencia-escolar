/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, RefreshCw, Bot, User, BookOpen, Sparkles, Gavel, Loader2 } from 'lucide-react';
import { BoldText } from '../lib/markdownUtils';
import { useTextImprovement } from '../hooks/useTextImprovement';
import { supabase } from '../lib/supabase';

interface Message {
  role: 'user' | 'model';
  content: string;
}

const SUGGESTED_PROMPTS = [
  "¿Cuáles son los plazos fatales y pasos obligatorios según la Ley Aula Segura?",
  "¿Qué formalidades mínimas se exigen en la entrevista de descargos escolar?",
  "¿Cuáles son las etapas del debido proceso bajo la Circular 482 y Ley 21809?",
  "¿Qué multas puede aplicar la Supereduc por abandono o negligencia en el debido proceso?"
];

function renderBoldText(text: string) {
  return <BoldText text={text} />;
}

function MessageContent({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-xs leading-relaxed font-sans text-left">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        const lineKey = `line-${trimmed.length}-${trimmed.charCodeAt(0) || 0}`;

        if (trimmed.startsWith('### ')) {
          return <h4 key={lineKey} className="font-bold text-neutral-900 border-b border-neutral-150 pb-0.5 mt-2">{trimmed.substring(4)}</h4>;
        }
        if (trimmed.startsWith('## ')) {
          return <h3 key={lineKey} className="font-bold text-xs text-brand-700 mt-3 flex items-center gap-1.5">{trimmed.substring(3)}</h3>;
        }
        if (trimmed.startsWith('# ')) {
          return <h2 key={lineKey} className="font-bold text-sm text-neutral-950 mt-4 border-l-2 border-neutral-700 pl-1">{trimmed.substring(2)}</h2>;
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={lineKey} className="flex items-start gap-1 ml-3 font-medium text-neutral-600">
              <span className="text-brand-500 select-none">•</span>
              <span>{renderBoldText(trimmed.substring(2))}</span>
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={lineKey} className="flex items-start gap-1.5 ml-3 font-medium text-neutral-600">
              <span className="font-mono text-brand-700 font-bold">{numMatch[1]}.</span>
              <span>{renderBoldText(numMatch[2])}</span>
            </div>
          );
        }

        if (trimmed === '') return <div key={lineKey} className="h-1" />;

        return <p key={lineKey} className="text-neutral-700 font-medium">{renderBoldText(trimmed)}</p>;
      })}
    </div>
  );
}

export default function AiAdvisor() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: "Hola. Soy su **Asesor Legal Especializado en Convivencia Escolar y Debido Proceso Chileno**..."
    }
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { improveText: improveChatText, isImproving: isImprovingChat } = useTextImprovement();
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom only when new messages are added (not on initial mount)
  useEffect(() => {
    if (messages.length <= 1) return; // skip initial greeting mount
    scrollContainerRef.current?.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [messages]);

  const handleImproveChat = async () => {
    const improved = await improveChatText(inputMessage);
    if (improved) setInputMessage(improved);
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg = textToSend.trim();
    setInputMessage('');

    // Add user message to state using functional update
    setMessages(prev => [...prev, { role: 'user', content: userMsg } as Message]);
    setIsLoading(true);

    try {
      const currentMessages = messagesRef.current;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMessages(prev => [...prev, { role: 'model', content: '**Sesión requerida:** Su sesión ha expirado o no está autenticado. Por favor, cierre sesión e inicie sesión nuevamente para actualizar sus credenciales.' }]);
        return;
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };
      const response = await fetch('/api/advisor-chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMsg,
          history: currentMessages.slice(1, -1).map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (response.status === 401) {
        setMessages(prev => [...prev, { role: 'model', content: '**Sesión inválida:** Su token de sesión no es válido. Por favor, cierre sesión e inicie sesión nuevamente.' }]);
        return;
      }
      if (!response.ok || !contentType.includes('application/json')) {
        const body = await response.text().catch(() => '');
        const hint = body.includes('page') || contentType.includes('text/html')
          ? 'No se pudo conectar con el servidor de IA (el backend no está respondiendo). Asegúrate de ejecutar `npm run dev`, que levanta el servidor Express con los endpoints /api.'
          : `El servidor respondió con estado ${response.status}.`;
        setMessages(prev => [...prev, { role: 'model', content: `**Error de conexión con el asistente:** ${hint}` }]);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'model', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', content: `**Error de Consultoría:** ${data.error}` }]);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setMessages(prev => [...prev, { role: 'model', content: `**Error al comunicar con el asistente:** ${message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputMessage);
  };

  return (
    <div className="flex flex-col min-h-[420px] bg-white rounded-xl border border-neutral-200/80 shadow-sm overflow-hidden transition-all animate-slide-up" aria-label="Asesor legal de convivencia">
      {/* Advisor header */}
      <div className="bg-white px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-neutral-200/60">
        <div className="flex items-center gap-3 text-left">
          <div className="bg-gradient-to-br from-brand-600 to-brand-800 text-white font-bold p-2 rounded-lg flex items-center justify-center shadow-sm border border-brand-500/20">
            <Gavel className="h-4 w-4 text-brand-100" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-sans font-semibold text-xs text-neutral-900">Consultor Legal de Convivencia</h3>
            <p className="text-[9px] text-neutral-500 font-medium mt-0.25">
              Circular 482 • Ley 21809 • Aula Segura
            </p>
          </div>
        </div>
        <div className="bg-neutral-50 text-[9px] text-neutral-500 px-2 py-1 rounded-md border border-neutral-200/60 font-medium hidden sm:block">
          Vigencia 2025/2026
        </div>
      </div>

      {/* Discussion Pane */}
      <div ref={scrollContainerRef} role="log" aria-label="Historial de conversación" aria-live="polite" className="flex-1 overflow-y-auto p-4 bg-neutral-50 space-y-3">
        {messages.map((m, idx) => {
          const isModel = m.role === 'model';
          const messageKey = `msg-${m.role}-${m.content.length}-${m.content.charCodeAt(0) || 0}`;
          return (
            <div key={messageKey} className={`flex ${isModel ? 'justify-start' : 'justify-end'} text-left animate-fade-in`}>
              <div className={`max-w-[88%] flex gap-2.5 items-start ${isModel ? 'flex-row' : 'flex-row-reverse'}`}>
                {/* Avatars */}
                <div className={`p-1.5 rounded-lg shrink-0 ${isModel ? 'bg-neutral-900 text-white' : 'bg-brand-600 text-white'}`}>
                  {isModel ? <Bot className="h-3.5 w-3.5" aria-hidden="true" /> : <User className="h-3.5 w-3.5" aria-hidden="true" />}
                </div>

                <div className={`p-3 rounded-xl border ${
                  isModel 
                    ? 'bg-white border-neutral-200 text-neutral-800 rounded-tl-none shadow-xs' 
                    : 'bg-brand-50/70 text-neutral-900 border-brand-100 rounded-tr-none shadow-xs'
                }`}>
                  <span className="text-[8px] font-semibold uppercase block mb-1 text-neutral-400">
                    {isModel ? 'Asesor Legal' : 'Usted'}
                  </span>
                  <MessageContent text={m.content} />
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading bubble */}
        {isLoading && (
          <div role="status" aria-live="polite" aria-label="El asesor está respondiendo" className="flex justify-start text-left">
            <div className="max-w-[70%] flex gap-2.5 items-center">
              <div className="p-1.5 rounded-lg bg-neutral-900 text-white shrink-0">
                <Bot className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <div className="bg-white border border-neutral-200 p-3 rounded-xl rounded-tl-none flex items-center gap-2 text-xs text-neutral-400">
                <RefreshCw className="h-3 w-3 animate-spin text-brand-600" aria-hidden="true" />
                <span className="font-medium text-[11px] text-neutral-500">Analizando normativa vigente...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length === 1 && !isLoading && (
        <div className="px-4 py-4 bg-white border-t border-neutral-100 text-left">
          <span className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
            <BookOpen className="h-3 w-3 text-neutral-400" aria-hidden="true" />
            Consultas sugeridas
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {SUGGESTED_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleSendMessage(p)}
                className="text-[11px] text-neutral-700 bg-neutral-50 hover:bg-brand-50/40 font-medium border border-neutral-200 hover:border-brand-200/60 p-2.5 rounded-lg text-left transition-all leading-normal hover:scale-[1.005] hover:shadow-xs"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-neutral-200 bg-white p-3 sm:p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1 flex items-center gap-1.5 border border-neutral-200 hover:border-neutral-300 rounded-lg px-3.5 bg-white transition-all has-focus:ring-2 has-focus:ring-brand-500/30 has-focus:border-brand-400">
              <input
                type="text"
                required
                spellCheck={true}
                disabled={isLoading}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Escriba su consulta legal..."
                className="flex-1 py-2.5 text-xs font-medium text-neutral-800 placeholder-neutral-400 bg-transparent focus:outline-none"
                aria-label="Mensaje para el asesor legal"
              />
              <button
                type="button"
                onClick={handleImproveChat}
                disabled={isImprovingChat || !inputMessage.trim() || isLoading}
                title="Mejorar redacción con IA"
                aria-label="Mejorar redacción con IA"
                className="p-1.5 text-neutral-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              >
                {isImprovingChat ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              </button>
            </div>
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white rounded-lg py-2.5 px-4 text-xs font-semibold disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <span className="hidden sm:inline">Enviar</span>
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </form>
        <div className="text-[10px] text-neutral-400 text-left mt-2 font-mono">
          Las respuestas son referenciales. Consulte siempre el RIE de su sostenedor y la normativa vigente.
        </div>
      </div>
    </div>
  );
}