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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (sourceFilter !== 'all' && n.source !== sourceFilter) return false;
      if (q && !n.title.toLowerCase().includes(q) && !n.content.toLowerCase().includes(q) && !n.topic.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [notes, search, sourceFilter]);

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
    const md = notes
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
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#2DD4BF] to-[#818CF8] px-3.5 py-2 text-xs font-semibold text-[#07080C]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Note</span>
          </button>
          <button
            onClick={handleExportMarkdown}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white hover:bg-white/10"
          >
            <Download className="h-3.5 w-3.5 text-[#2DD4BF]" />
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
              className="rounded-xl border border-white/10 bg-[#07080C] px-3 py-2 text-xs text-white outline-none focus:border-[#2DD4BF] sm:col-span-2"
            />
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Topic tag"
              className="rounded-xl border border-white/10 bg-[#07080C] px-3 py-2 text-xs text-white outline-none focus:border-[#2DD4BF]"
            />
          </div>
          <textarea
            required
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your concise Markdown answer or code snippet..."
            className="w-full rounded-xl border border-white/10 bg-[#07080C] p-3 font-mono text-xs text-slate-200 outline-none focus:border-[#2DD4BF]"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="rounded-xl border border-white/10 px-4 py-1.5 text-xs text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#2DD4BF] px-4 py-1.5 text-xs font-semibold text-[#07080C]"
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
              className="w-full rounded-xl border border-white/10 bg-[#07080C] py-2 pr-3 pl-9 text-xs text-white placeholder-slate-500 outline-none focus:border-[#2DD4BF]"
            />
          </div>

          <div className="flex flex-wrap gap-1 text-[11px]">
            {(['all', 'ai_copilot', 'knowledge_hub', 'manual'] as const).map((src) => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`rounded-lg px-2.5 py-1 capitalize transition-colors ${
                  sourceFilter === src ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
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
              filtered.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSelectedId(n.id)}
                  className={`flex w-full items-start justify-between gap-2 py-3 text-left transition-colors px-2 rounded-lg ${
                    activeNote?.id === n.id ? 'bg-[#2DD4BF]/12 text-white' : 'text-slate-300 hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold">{n.title}</div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-400">
                      {n.topic} · {n.source.replace('_', ' ')}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="glass-surface rounded-2xl p-6 lg:col-span-8">
          {activeNote ? (
            <div>
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="text-xs text-[#2DD4BF]">
                    {activeNote.topic} · {activeNote.source.replace('_', ' ')}
                  </div>
                  <h2 className="mt-1 font-display text-lg font-bold text-white">{activeNote.title}</h2>
                </div>
                <button
                  onClick={() => onDeleteNote(activeNote.id)}
                  className="rounded-lg border border-white/10 p-2 text-slate-400 hover:border-[#FB7185]/40 hover:text-[#FB7185]"
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
