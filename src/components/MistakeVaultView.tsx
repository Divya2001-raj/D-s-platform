import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Flame,
  Lock,
  Play,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { MistakeSourceType, MistakeVaultItem, Question } from '../types/platform';
import { MISTAKE_INTERVALS } from '../lib/firestoreService';

interface MistakeVaultViewProps {
  items: MistakeVaultItem[];
  questions: Question[];
  onColdSolveQuestion: (q: Question) => void;
  onSelectTopic: (topicSlugOrName: string) => void;
  onLaunchMockInterview: () => void;
  onMarkReverified: (item: MistakeVaultItem) => void;
  onResetItem: (item: MistakeVaultItem) => void;
  onDeleteItem: (itemId: string) => void;
}

type FilterTab = 'all' | 'due' | MistakeSourceType;

const SOURCE_LABELS: Record<MistakeSourceType, string> = {
  coding_fail: 'Coding / Fuzzer Fail',
  mcq_low_score: 'MCQ <80% Mastery',
  mock_weak_area: 'Mock Weak Area',
};

function formatDueRelative(dueAt: number, now: number): string {
  const diffMs = dueAt - now;
  if (diffMs <= 0) return 'Due Now';
  const hours = Math.round(diffMs / (60 * 60 * 1000));
  if (hours < 24) return `Due in ${hours}h`;
  const days = Math.round(diffMs / (24 * 60 * 60 * 1000));
  return `Due in ${days}d`;
}

export function MistakeVaultView({
  items,
  questions,
  onColdSolveQuestion,
  onSelectTopic,
  onLaunchMockInterview,
  onMarkReverified,
  onResetItem,
  onDeleteItem,
}: MistakeVaultViewProps) {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const now = Date.now();

  const stats = useMemo(() => {
    const dueCount = items.filter((i) => !i.mastered && i.dueAt <= now).length;
    const masteredCount = items.filter((i) => i.mastered || i.intervalDays >= 21).length;
    const codingFails = items.filter((i) => i.sourceType === 'coding_fail').length;
    const mcqFails = items.filter((i) => i.sourceType === 'mcq_low_score').length;
    const mockFails = items.filter((i) => i.sourceType === 'mock_weak_area').length;
    return { dueCount, masteredCount, codingFails, mcqFails, mockFails };
  }, [items, now]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === 'due' && (item.mastered || item.dueAt > now)) return false;
      if (filter !== 'all' && filter !== 'due' && item.sourceType !== filter) return false;
      if (
        q &&
        !item.title.toLowerCase().includes(q) &&
        !item.domain.toLowerCase().includes(q) &&
        !item.reason.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [items, filter, search, now]);

  const questionMap = useMemo(() => {
    const map = new Map<string, Question>();
    for (const q of questions) map.set(q.uniqueId, q);
    return map;
  }, [questions]);

  return (
    <div className="space-y-6">
      {/* Header Hero */}
      <div className="glass-surface p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#A855F7]">
              <BrainCircuit className="h-4 w-4" />
              <span>SPACED-REPETITION MISTAKE VAULT · 1D → 3D → 7D → 21D RETENTION</span>
            </div>
            <h1 className="mt-1.5 font-display text-2xl font-bold text-white">
              Cold-Solve Remediation Queue
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Automatically captures failed coding &amp; fuzzer attempts, &lt;80% MCQ quizzes, and Mock Interview weak areas. Cold-Solve starts from a blank slate with hints &amp; solution locked until first-run pass.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="inset-surface rounded-2xl px-4 py-3 text-center">
              <div className="font-mono text-2xl font-bold text-white tabular-nums">{stats.dueCount}</div>
              <div className="text-[11px] text-slate-400">Due Today</div>
            </div>
            <div className="inset-surface rounded-2xl px-4 py-3 text-center">
              <div className="font-mono text-2xl font-bold text-white tabular-nums">{items.length}</div>
              <div className="text-[11px] text-slate-400">Tracked</div>
            </div>
            <div className="inset-surface rounded-2xl px-4 py-3 text-center">
              <div className="font-mono text-2xl font-bold text-[#22C55E] tabular-nums">{stats.masteredCount}</div>
              <div className="text-[11px] text-slate-400">Mastered (21D+)</div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-5 flex flex-col gap-3 border-t bento-divider pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all' as FilterTab, label: `All (${items.length})` },
              { id: 'due' as FilterTab, label: `Due Today (${stats.dueCount})` },
              { id: 'coding_fail' as FilterTab, label: `Coding Fails (${stats.codingFails})` },
              { id: 'mcq_low_score' as FilterTab, label: `MCQ <80% (${stats.mcqFails})` },
              { id: 'mock_weak_area' as FilterTab, label: `Mock Weak Areas (${stats.mockFails})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  filter === tab.id
                    ? 'tab-active border-transparent'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-slate-300 hover:border-[#8B5CF6]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter mistakes by title, domain, or failure note..."
            className="inset-surface w-full rounded-full px-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#8B5CF6] sm:w-72"
          />
        </div>
      </div>

      {/* Mistake Queue List */}
      {filteredItems.length === 0 ? (
        <div className="glass-surface p-10 text-center">
          <ShieldCheck className="mx-auto h-9 w-9 text-[#22C55E]" />
          <h2 className="mt-3 font-display text-lg font-bold text-white">
            {items.length === 0 ? 'Mistake Vault is Clean' : 'No Mistakes Match This Filter'}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
            {items.length === 0
              ? 'Any failing SQL/Python test or adversarial fuzz case, <80% Knowledge Hub quiz, or Mock Interview weak area is automatically logged here for 1D → 3D → 7D → 21D spaced repetition.'
              : 'Switch tabs or clear your search filter to inspect other tracked remediation items.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredItems.map((item) => {
            const linkedQ = item.questionId ? questionMap.get(item.questionId) : undefined;
            const isDue = !item.mastered && item.dueAt <= now;

            return (
              <div
                key={item.id}
                className="glass-surface glass-surface-hover flex flex-col justify-between p-5 space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-[#A855F7]">
                        {SOURCE_LABELS[item.sourceType]}
                      </span>
                      <span aria-hidden="true" className="text-slate-500">·</span>
                      <span className="text-slate-400">{item.domain}</span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold ${
                        item.mastered
                          ? 'bg-[#22C55E]/15 text-[#22C55E]'
                          : isDue
                            ? 'bg-[#EF4444]/15 text-[#EF4444]'
                            : 'inset-surface text-slate-300'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {item.mastered ? 'Mastered' : formatDueRelative(item.dueAt, now)}
                    </span>
                  </div>

                  <h2 className="font-display text-base font-bold text-white">{item.title}</h2>

                  <div className="inset-surface rounded-2xl p-3 text-xs leading-relaxed text-slate-300">
                    <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-semibold text-slate-400">
                      <AlertTriangle className="h-3 w-3 text-[#F59E0B]" />
                      <span>Captured Failure Signal ({item.failures}x)</span>
                    </div>
                    {item.reason}
                  </div>

                  {/* 1D -> 3D -> 7D -> 21D Spaced Interval Progression */}
                  <div className="flex items-center gap-2 pt-1">
                    {MISTAKE_INTERVALS.map((days, idx) => {
                      const reached = item.mastered || idx <= item.stage;
                      const current = !item.mastered && idx === item.stage;
                      return (
                        <div key={days} className="flex flex-1 items-center gap-1.5">
                          <div
                            className={`flex h-7 flex-1 items-center justify-center rounded-full font-mono text-[11px] font-bold ${
                              current
                                ? 'gradient-luminous keep-white'
                                : reached
                                  ? 'bg-[#22C55E]/20 text-[#22C55E]'
                                  : 'inset-surface text-slate-500'
                            }`}
                          >
                            {days}D
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t bento-divider pt-3">
                  {linkedQ ? (
                    <button
                      type="button"
                      onClick={() => onColdSolveQuestion(linkedQ)}
                      className="btn-luminous inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Cold-Solve Now (No Hints)</span>
                    </button>
                  ) : item.sourceType === 'mcq_low_score' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onSelectTopic(item.topicSlug || item.domain)}
                        className="btn-luminous inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Retake Concept Quiz</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onMarkReverified(item)}
                        className="pill-pass-solid inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Advance Interval</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={onLaunchMockInterview}
                        className="btn-luminous inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold"
                      >
                        <Flame className="h-3.5 w-3.5" />
                        <span>Drill in Live Mock</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onMarkReverified(item)}
                        className="pill-pass-solid inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Advance Interval</span>
                      </button>
                    </>
                  )}

                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onResetItem(item)}
                      title="Reset cadence back to 1D"
                      className="btn-secondary rounded-full p-2 text-slate-400 hover:text-white"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      title="Remove from Mistake Vault"
                      className="btn-secondary rounded-full p-2 text-slate-400 hover:text-[#EF4444]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
