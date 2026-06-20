'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { AssistantMessage } from '@/components/chat/AssistantMessage';
import { Composer } from '@/components/chat/Composer';
import { ModeToggle, type ChatMode } from '@/components/chat/ModeToggle';
import { StarterPrompts } from '@/components/chat/StarterPrompts';
import './chat.css';

/** Valid chat modes — guards against stale/invalid localStorage values. */
const CHAT_MODES = ['agent', 'graph'] as const;

function isChatMode(value: unknown): value is ChatMode {
  return typeof value === 'string' && (CHAT_MODES as readonly string[]).includes(value);
}

/** Concatenate the text parts of a UI message. */
function messageText(m: UIMessage): string {
  return m.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

/** True while the model is searching docs but hasn't emitted answer text yet. */
function isThinking(m: UIMessage): boolean {
  return m.role === 'assistant' && messageText(m).trim() === '';
}

export default function Home() {
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  // Always render 'agent' on the server and first client paint to avoid a
  // hydration mismatch; restore the persisted value after mount.
  const [mode, setMode] = useState<ChatMode>('agent');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('chatMode');
      if (isChatMode(stored)) {
        setMode(stored);
      }
    } catch {
      // localStorage can throw when disabled/full/private mode — safe to ignore.
    }
  }, []);

  const handleModeChange = (next: ChatMode) => {
    setMode(next);
    try {
      localStorage.setItem('chatMode', next);
    } catch {
      // Persisting failed — non-fatal, mode still works for this session.
    }
  };

  const busy = status === 'submitted' || status === 'streaming';
  const empty = messages.length === 0;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  // The selected engine rides along as `mode` in the request body; the route
  // dispatches to the AI SDK agent or the LangGraph Corrective-RAG graph.
  const ask = (text: string) => sendMessage({ text }, { body: { mode } });

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead__inner">
          <div className="wordmark">
            <span className="wordmark__mark">MCP</span>
            <span className="wordmark__rest">/ docs assistant</span>
          </div>
          <ul className="creds">
            <li><b>version-correct</b> v1 · v2</li>
            <li><b>cites</b> every source</li>
            <li><b>refuses</b> when uncovered</li>
          </ul>
        </div>
      </header>

      <main className="thread" aria-live="polite">
        {empty ? (
          <section className="intro">
            <p className="intro__eyebrow">Model Context Protocol · TypeScript SDK</p>
            <h1 className="intro__title">
              Ask the docs. Get <em>version-correct</em>, cited answers — or an honest “I don’t know.”
            </h1>
            <p className="intro__sub">
              Retrieval-grounded over the v1 &amp; v2 SDK docs and the protocol spec. It tells you
              which version an answer belongs to, links the exact source, and refuses to guess.
            </p>
            <StarterPrompts onPick={ask} />
          </section>
        ) : (
          <ol className="messages">
            {messages.map((m) => (
              <li key={m.id} className={`turn turn--${m.role}`}>
                <span className="turn__role">{m.role === 'user' ? 'You' : 'Assistant'}</span>
                {m.role === 'user' ? (
                  <p className="user-message">{messageText(m)}</p>
                ) : isThinking(m) ? (
                  <p className="thinking">
                    <span className="thinking__dot" />
                    Searching the docs…
                  </p>
                ) : (
                  <AssistantMessage text={messageText(m)} />
                )}
              </li>
            ))}
            <div ref={bottomRef} />
          </ol>
        )}
      </main>

      <footer className="dock">
        <div className="dock__inner">
          <div className="dock__bar">
            <ModeToggle mode={mode} onChange={handleModeChange} disabled={busy} />
          </div>
          <Composer onSend={ask} onStop={stop} busy={busy} />
          <p className="dock__hint">
            Answers are grounded in the official docs. Not affiliated with the MCP project.
          </p>
        </div>
      </footer>
    </div>
  );
}