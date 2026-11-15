import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download, FileText, Plus, Search, Trash2 } from 'lucide-react';
import type { UserNote } from '../types/platform';

interface NotebookViewProps {
  notes: UserNote[];
  onCreateNote: (title: string, content: string, topic: string) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
}

export function NotebookView({ notes, onCreateNote, onDeleteNote }: NotebookViewProps) {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | UserNote['source']>('all');
  const [selectedId, setSelectedId] = useState<string | null>(notes[0]?.id ?? null);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('Data Engineering');
  const [content, setContent] = useState('');

  const visibleNotes = useMemo(
    () => notes.filter((n) => !n.topic?.startsWith('__')),
    [notes],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visibleNotes.filter((n) => {
      if (sourceFilter !== 'all' && n.source !== sourceFilter) return false;
      if (q && !n.title.toLowerCase().includes(q) && !n.content.toLowerCase().includes(q) && !n.topic.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [visibleNotes, search, sourceFilter]);

  const activeNote = filtered.find((n) => n.id === selectedId) || filtered[0] || null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    await onCreateNote(title.trim(), content.trim(), topic.trim() || 'General');
    setTitle('');
    setContent('');
    setShowNew(false);
  };

  const handleExportMarkdown = () => {
    const md = visibleNotes
      .map((n) => `# ${n.title}\n*Topic: ${n.topic} · Source: ${n.source} · Date: ${n.createdAt.slice(0, 10)}*\n\n${n.content}\n\n---`)
      .join('\n\n');
    const blob = new Blob([md || '# Personal Answer Notebook\n\nNo entries yet.'], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-engineer-360-notebook-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="glass-surface flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-white">Personal Answer Notebook</h1>
          <p className="text-xs text-slate-400">
            Saved AI Copilot explanations, Knowledge Hub cheat sheets, JD roadmaps, and STAR notes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowNew((s) => !s)}
            className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Note</span>
          </button>
          <button
            onClick={handleExportMarkdown}
            className="btn-secondary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5 text-white" />
            <span>Export Markdown</span>
          </button>
        </div>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="glass-surface rounded-2xl p-5 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title (e.g., Iceberg MoR vs CoW Trade-offs)"
              className="inset-surface rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--border-strong)] sm:col-span-2"
            />
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Topic tag"
              className="inset-surface rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--border-strong)]"
            />
          </div>
          <textarea
            required
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your concise Markdown answer or code snippet..."
            className="inset-surface w-full rounded-xl p-3 font-mono text-xs text-slate-200 outline-none focus:border-[var(--border-strong)]"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="btn-secondary rounded-xl px-4 py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary rounded-xl px-4 py-1.5 text-xs font-semibold"
            >
              Save Note
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="glass-surface rounded-2xl p-4 space-y-3 lg:col-span-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="inset-surface w-full rounded-xl py-2 pr-3 pl-9 text-xs text-white placeholder-slate-500 outline-none focus:border-[var(--border-strong)]"
            />
          </div>

          <div className="flex flex-wrap gap-1 text-[11px]">
            {(['all', 'ai_copilot', 'knowledge_hub', 'manual'] as const).map((src) => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`rounded-lg px-2.5 py-1 capitalize transition-colors ${
                  sourceFilter === src ? 'tab-active' : 'text-slate-400 hover:text-white'
                }`}
              >
                {src.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="divide-y divide-white/[0.06]">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No notes saved yet. Save any AI Copilot response or Knowledge Hub cheat sheet with one click.
              </p>
            ) : (
              filtered.map((n) => {
                const isSelected = activeNote?.id === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => setSelectedId(n.id)}
                    className={`flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-3 text-left transition-colors ${
                      isSelected ? 'tab-active' : 'text-slate-300 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold">{n.title}</div>
                      <div className={`mt-0.5 truncate text-[11px] ${isSelected ? 'opacity-75' : 'text-slate-400'}`}>
                        {n.topic} · {n.source.replace('_', ' ')}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="glass-surface rounded-2xl p-6 lg:col-span-8">
          {activeNote ? (
            <div>
              <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
                <div>
                  <div className="text-xs text-slate-400">
                    {activeNote.topic} · {activeNote.source.replace('_', ' ')}
                  </div>
                  <h2 className="mt-1 font-display text-lg font-bold text-white">{activeNote.title}</h2>
                </div>
                <button
                  onClick={() => onDeleteNote(activeNote.id)}
                  className="btn-secondary rounded-lg p-2 text-slate-400 hover:text-white"
                  title="Delete note"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="prose prose-invert prose-sm mt-4 max-w-none text-slate-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeNote.content}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[260px] flex-col items-center justify-center text-center text-slate-400">
              <FileText className="h-8 w-8 opacity-60" />
              <p className="mt-2 text-xs">Select or create a note to view formatted Markdown.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
