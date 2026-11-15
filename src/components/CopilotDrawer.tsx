import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookmarkPlus, Bot, Check, Loader2, Send, Sparkles, X } from 'lucide-react';
import type { CopilotContext, CopilotMessage } from '../types/platform';

interface CopilotDrawerProps {
  open: boolean;
  onToggle: () => void;
  context: CopilotContext;
  messages: CopilotMessage[];
  onSendUserTurn: (userMsg: string, assistantMsg: string, contextLabel: string) => void;
  onSaveToNotebook: (title: string, content: string, topic: string) => Promise<void>;
}

export function CopilotDrawer({
  open,
  onToggle,
  context,
  messages,
  onSendUserTurn,
  onSaveToNotebook,
}: CopilotDrawerProps) {
  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [pendingUserMsg, setPendingUserMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText, open]);

  const sendPrompt = async (
    promptText: string,
    mode: 'coach' | 'hint' | 'debug' | 'explain_plan' | 'solution' = 'coach',
  ) => {
    const trimmed = promptText.trim();
    if (!trimmed || loading) return;

    setInput('');
    setPendingUserMsg(trimmed);
    setStreamingText('');
    setLoading(true);

    try {
      const historyPayload = [
        ...messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: trimmed },
      ];

      const resp = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          context,
          stream: true,
          mode,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Copilot request failed');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assembled = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const chunk of parts) {
          const line = chunk.trim();
          if (!line.startsWith('data:')) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;
          const evt = JSON.parse(jsonStr) as { delta?: string; done?: boolean; error?: string };
          if (evt.error) throw new Error(evt.error);
          if (evt.delta) {
            assembled += evt.delta;
            setStreamingText(assembled);
          }
        }
      }

      onSendUserTurn(trimmed, assembled || 'No response generated.', `${context.view} · ${context.title}`);
      setPendingUserMsg('');
      setStreamingText('');
    } catch (err) {
      const errMsg = `**Copilot Error:** ${err instanceof Error ? err.message : 'Unable to reach Gemini API'}`;
      onSendUserTurn(trimmed, errMsg, `${context.view} · ${context.title}`);
      setPendingUserMsg('');
      setStreamingText('');
    } finally {
      setLoading(false);
    }
  };

  const quickChips = [
    { label: 'Give Socratic Hint', prompt: 'Give me a subtle Socratic hint for my current task without spoiling the solution.', mode: 'hint' as const },
    { label: 'Debug My Code', prompt: 'Review my current code and any error output. Point out bugs or edge cases.', mode: 'debug' as const },
    { label: 'Explain Execution Plan', prompt: 'Analyze the query execution plan / time-space complexity and potential bottlenecks.', mode: 'explain_plan' as const },
    { label: 'Show Optimal Solution', prompt: 'Provide the optimal production-grade solution and explain alternative trade-offs.', mode: 'solution' as const },
  ];

  const handleSave = async (msgId: string, content: string) => {
    await onSaveToNotebook(`Copilot: ${context.title}`, content, context.domain);
    setSavedId(msgId);
    setTimeout(() => setSavedId(null), 2000);
  };

  return (
    <>
      <button
        onClick={onToggle}
        className="fixed right-6 bottom-6 z-40 inline-flex items-center gap-2.5 rounded-2xl border border-[#A78BFA]/40 bg-[#10121A]/95 px-4 py-3 text-sm font-semibold text-white shadow-2xl shadow-[#818CF8]/20 backdrop-blur-xl transition-transform hover:scale-[1.02] hover:border-[#2DD4BF]/60"
        title="Open Gemini AI Copilot (Cmd+J)"
      >
        <Sparkles className="h-4 w-4 text-[#A78BFA]" />
        <span className="whitespace-nowrap">AI Copilot</span>
        <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-slate-400">
          ⌘J
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: '100%', opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#07080C]/95 shadow-2xl backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#A78BFA]/15 text-[#A78BFA]">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-display text-sm font-bold text-white">Staff DE Gemini Copilot</div>
                  <div className="truncate text-xs text-slate-400">
                    Context: {context.view} · {context.title}
                  </div>
                </div>
              </div>
              <button
                onClick={onToggle}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Close Copilot drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 border-b border-white/10 px-5 py-3">
              {quickChips.map((chip) => (
                <button
                  key={chip.label}
                  disabled={loading}
                  onClick={() => sendPrompt(chip.prompt, chip.mode)}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-[#A78BFA]/50 hover:text-white disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {messages.length === 0 && !pendingUserMsg && (
                <div className="rounded-xl border border-white/10 bg-[#10121A]/70 p-4 text-sm text-slate-300">
                  <p className="font-semibold text-white">Live Workspace Context Connected</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    I automatically see your active screen ({context.view}), code/SQL editor contents, schema, and latest
                    execution errors. Ask for Socratic hints, EXPLAIN plan critiques, Spark skew tuning, or architecture trade-offs.
                  </p>
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm ${
                      m.role === 'user'
                        ? 'bg-gradient-to-r from-[#2DD4BF]/20 to-[#818CF8]/20 border border-[#2DD4BF]/30 text-white'
                        : 'glass-surface text-slate-200'
                    }`}
                  >
                    {m.role === 'assistant' ? (
                      <div className="prose prose-invert prose-sm max-w-none prose-pre:rounded-xl prose-pre:bg-[#07080C] prose-pre:border prose-pre:border-white/10 prose-code:text-[#2DD4BF]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>
                  {m.role === 'assistant' && (
                    <button
                      onClick={() => handleSave(m.id, m.content)}
                      className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-[#2DD4BF]"
                    >
                      {savedId === m.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#34D399]" />
                          <span className="text-[#34D399]">Saved to Personal Answer Notebook</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="h-3.5 w-3.5" />
                          <span>Save to Personal Answer Notebook</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}

              {pendingUserMsg && (
                <div className="flex flex-col items-end">
                  <div className="max-w-[92%] rounded-2xl border border-[#2DD4BF]/30 bg-gradient-to-r from-[#2DD4BF]/20 to-[#818CF8]/20 px-4 py-3 text-sm text-white">
                    {pendingUserMsg}
                  </div>
                </div>
              )}

              {loading && (
                <div className="glass-surface max-w-[92%] rounded-2xl px-4 py-3 text-sm text-slate-200">
                  {streamingText ? (
                    <div className="prose prose-invert prose-sm max-w-none prose-pre:rounded-xl prose-pre:bg-[#07080C] prose-code:text-[#2DD4BF]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingText}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-[#A78BFA]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Analyzing workspace context...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendPrompt(input, 'coach');
              }}
              className="border-t border-white/10 p-4"
            >
              <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-[#10121A] p-2 focus-within:border-[#2DD4BF]/50">
                <textarea
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendPrompt(input, 'coach');
                    }
                  }}
                  placeholder="Ask about your query, PySpark skew, Iceberg, or interview strategy..."
                  className="w-full resize-none bg-transparent px-2 py-1 text-sm text-white placeholder-slate-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-[#2DD4BF] to-[#818CF8] text-[#07080C] transition-opacity hover:opacity-95 disabled:opacity-40"
                  aria-label="Send message to AI Copilot"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
