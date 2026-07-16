/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Send, RefreshCw, Bot, User, BookOpen, Sparkles, Gavel, Loader2 } from 'lucide-react';
import { BoldText } from '../lib/markdownUtils';
import { useTextImprovement } from '../hooks/useTextImprovement';
import { supabase } from '../lib/supabase';

interface Message {
  role: 'user' | 'model';
  content: string;
}

const SUGGESTED_PROMPTS = [
  '¿Cuáles son los plazos fatales y pasos obligatorios según la Ley Aula Segura?',
  '¿Qué formalidades mínimas se exigen en la entrevista de descargos escolar?',
  '¿Cuáles son las etapas del debido proceso bajo la Circular 482 y Ley 21809?',
  '¿Qué multas puede aplicar la Supereduc por abandono o negligencia en el debido proceso?',
];

function renderBoldText(text: string) {
  return <BoldText text={text} />;
}

function MessageContent({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-left font-sans text-xs leading-relaxed">
      {lines.map((line, _idx) => {
        const trimmed = line.trim();
        const lineKey = `line-${trimmed.length}-${trimmed.charCodeAt(0) || 0}`;

        if (trimmed.startsWith('### ')) {
          return (
            <h4
              key={lineKey}
              className="mt-2 border-neutral-150 border-b pb-0.5 font-bold text-neutral-900"
            >
              {trimmed.substring(4)}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3
              key={lineKey}
              className="mt-3 flex items-center gap-1.5 font-bold text-brand-700 text-xs"
            >
              {trimmed.substring(3)}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2
              key={lineKey}
              className="mt-4 border-neutral-700 border-l-2 pl-1 font-bold text-neutral-950 text-sm"
            >
              {trimmed.substring(2)}
            </h2>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={lineKey} className="ml-3 flex items-start gap-1 font-medium text-neutral-600">
              <span className="select-none text-brand-500">•</span>
              <span>{renderBoldText(trimmed.substring(2))}</span>
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div
              key={lineKey}
              className="ml-3 flex items-start gap-1.5 font-medium text-neutral-600"
            >
              <span className="font-bold font-mono text-brand-700">{numMatch[1]}.</span>
              <span>{renderBoldText(numMatch[2])}</span>
            </div>
          );
        }

        if (trimmed === '') { return <div key={lineKey} className="h-1" />; }

        return (
          <p key={lineKey} className="font-medium text-neutral-700">
            {renderBoldText(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export default function AiAdvisor() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content:
        'Hola. Soy su **Asesor Legal Especializado en Convivencia Escolar y Debido Proceso Chileno**...',
    },
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
    if (messages.length <= 1) { return; // skip initial greeting mount
}
    scrollContainerRef.current?.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const handleImproveChat = async () => {
    const improved = await improveChatText(inputMessage);
    if (improved) { setInputMessage(improved); }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) { return; }

    const userMsg = textToSend.trim();
    setInputMessage('');

    // Add user message to state using functional update
    setMessages((prev) => [...prev, { role: 'user', content: userMsg } as Message]);
    setIsLoading(true);

    try {
      const currentMessages = messagesRef.current;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content:
              '**Sesión requerida:** Su sesión ha expirado o no está autenticado. Por favor, cierre sesión e inicie sesión nuevamente para actualizar sus credenciales.',
          },
        ]);
        return;
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      };
      const response = await fetch('/api/advisor-chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMsg,
          history: currentMessages.slice(1, -1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (response.status === 401) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content:
              '**Sesión inválida:** Su token de sesión no es válido. Por favor, cierre sesión e inicie sesión nuevamente.',
          },
        ]);
        return;
      }
      if (!response.ok || !contentType.includes('application/json')) {
        const body = await response.text().catch(() => '');
        const hint =
          body.includes('page') || contentType.includes('text/html')
            ? 'No se pudo conectar con el servidor de IA (el backend no está respondiendo). Asegúrate de ejecutar `npm run dev`, que levanta el servidor Express con los endpoints /api.'
            : `El servidor respondió con estado ${response.status}.`;
        setMessages((prev) => [
          ...prev,
          { role: 'model', content: `**Error de conexión con el asistente:** ${hint}` },
        ]);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setMessages((prev) => [...prev, { role: 'model', content: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'model', content: `**Error de Consultoría:** ${data.error}` },
        ]);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: `**Error al comunicar con el asistente:** ${message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputMessage);
  };

  return (
    <section
      className="flex min-h-[420px] animate-slide-up flex-col overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-sm transition-all"
      aria-label="Asesor legal de convivencia"
    >
      {/* Advisor header */}
      <div className="flex items-center justify-between border-neutral-200/60 border-b bg-white px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-3 text-left">
          <div className="flex items-center justify-center rounded-lg border border-brand-500/20 bg-gradient-to-br from-brand-600 to-brand-800 p-2 font-bold text-white shadow-sm">
            <Gavel className="h-4 w-4 text-brand-100" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-sans font-semibold text-neutral-900 text-xs">
              Consultor Legal de Convivencia
            </h3>
            <p className="mt-0.25 font-medium text-[9px] text-neutral-500">
              Circular 482 • Ley 21809 • Aula Segura
            </p>
          </div>
        </div>
        <div className="hidden rounded-md border border-neutral-200/60 bg-neutral-50 px-2 py-1 font-medium text-[9px] text-neutral-500 sm:block">
          Vigencia 2025/2026
        </div>
      </div>

      {/* Discussion Pane */}
      <div
        ref={scrollContainerRef}
        role="log"
        aria-label="Historial de conversación"
        aria-live="polite"
        className="flex-1 space-y-3 overflow-y-auto bg-neutral-50 p-4"
      >
        {messages.map((m, _idx) => {
          const isModel = m.role === 'model';
          const messageKey = `msg-${m.role}-${m.content.length}-${m.content.charCodeAt(0) || 0}`;
          return (
            <div
              key={messageKey}
              className={`flex ${isModel ? 'justify-start' : 'justify-end'} animate-fade-in text-left`}
            >
              <div
                className={`flex max-w-[88%] items-start gap-2.5 ${isModel ? 'flex-row' : 'flex-row-reverse'}`}
              >
                {/* Avatars */}
                <div
                  className={`shrink-0 rounded-lg p-1.5 ${isModel ? 'bg-neutral-900 text-white' : 'bg-brand-600 text-white'}`}
                >
                  {isModel ? (
                    <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <User className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </div>

                <div
                  className={`rounded-xl border p-3 ${
                    isModel
                      ? 'rounded-tl-none border-neutral-200 bg-white text-neutral-800 shadow-xs'
                      : 'rounded-tr-none border-brand-100 bg-brand-50/70 text-neutral-900 shadow-xs'
                  }`}
                >
                  <span className="mb-1 block font-semibold text-[8px] text-neutral-400 uppercase">
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
          <div
            role="status"
            aria-live="polite"
            aria-label="El asesor está respondiendo"
            className="flex justify-start text-left"
          >
            <div className="flex max-w-[70%] items-center gap-2.5">
              <div className="shrink-0 rounded-lg bg-neutral-900 p-1.5 text-white">
                <Bot className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-2 rounded-xl rounded-tl-none border border-neutral-200 bg-white p-3 text-neutral-400 text-xs">
                <RefreshCw className="h-3 w-3 animate-spin text-brand-600" aria-hidden="true" />
                <span className="font-medium text-[11px] text-neutral-500">
                  Analizando normativa vigente...
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length === 1 && !isLoading && (
        <div className="border-neutral-100 border-t bg-white px-4 py-4 text-left">
          <span className="mb-2.5 block flex items-center gap-1.5 font-semibold text-[9px] text-neutral-400 uppercase tracking-wider">
            <BookOpen className="h-3 w-3 text-neutral-400" aria-hidden="true" />
            Consultas sugeridas
          </span>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {SUGGESTED_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleSendMessage(p)}
                className="rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 text-left font-medium text-[11px] text-neutral-700 leading-normal transition-all hover:scale-[1.005] hover:border-brand-200/60 hover:bg-brand-50/40 hover:shadow-xs"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-neutral-200 border-t bg-white p-3 sm:p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 transition-all hover:border-neutral-300 has-focus:border-brand-400 has-focus:ring-2 has-focus:ring-brand-500/30">
            <input
              type="text"
              required
              spellCheck={true}
              disabled={isLoading}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Escriba su consulta legal..."
              className="flex-1 bg-transparent py-2.5 font-medium text-neutral-800 text-xs placeholder-neutral-400 focus:outline-none"
              aria-label="Mensaje para el asesor legal"
            />
            <button
              type="button"
              onClick={handleImproveChat}
              disabled={isImprovingChat || !inputMessage.trim() || isLoading}
              title="Mejorar redacción con IA"
              aria-label="Mejorar redacción con IA"
              className="shrink-0 rounded-md p-1.5 text-neutral-400 transition-all hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {isImprovingChat ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2.5 font-semibold text-white text-xs transition-all hover:scale-[1.02] hover:bg-neutral-800 active:scale-95 disabled:bg-neutral-300 disabled:opacity-50"
          >
            <span className="hidden sm:inline">Enviar</span>
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </form>
        <div className="mt-2 text-left font-mono text-[10px] text-neutral-400">
          Las respuestas son referenciales. Consulte siempre el RIE de su sostenedor y la normativa
          vigente.
        </div>
      </div>
    </section>
  );
}
