import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Search,
  Target,
} from 'lucide-react';
import type { ExperienceTier, Question } from '../types/platform';
import {
  getQuestionEvalType,
  getQuestionRound,
  INTERVIEW_ROUNDS,
  type InterviewRoundMeta,
} from '../data/rounds';
import { GenerateBatchButton } from './GenerateBatchButton';

interface InterviewRoundsViewProps {
  questions: Question[];
  solvedIds: string[];
  experienceTier: ExperienceTier;
  activeRoundSlug: string;
  onSelectRoundSlug: (slug: string) => void;
  onSelectQuestion: (q: Question) => void;
  onSelectTopic: (topicNameOrId: string) => void;
  onAddGeneratedQuestions: (qs: Question[]) => Promise<void>;
}

function getEvalLabel(q: Question): string {
  const t = getQuestionEvalType(q);
  if (t === 'sql') return 'SQLite + Dirty Data';
  if (t === 'python') return 'Pyodide Python 3';
  return 'Staff Design Rubric';
}

export function InterviewRoundsView({
  questions,
  solvedIds,
  experienceTier,
  activeRoundSlug,
  onSelectRoundSlug,
  onSelectQuestion,
  onSelectTopic,
  onAddGeneratedQuestions,
}: InterviewRoundsViewProps) {
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [topicFilter, setTopicFilter] = useState<string>('All');

  const solvedSet = useMemo(() => new Set(solvedIds), [solvedIds]);

  const activeRound: InterviewRoundMeta =
    INTERVIEW_ROUNDS.find((r) => r.slug === activeRoundSlug) || INTERVIEW_ROUNDS[0];

  const roundCounts = useMemo(() => {
    const map = new Map<number, { total: number; solved: number }>();
    for (const r of INTERVIEW_ROUNDS) {
      map.set(r.roundNumber, { total: 0, solved: 0 });
    }
    for (const q of questions) {
      const rNum = getQuestionRound(q);
      const entry = map.get(rNum);
      if (entry) {
        entry.total += 1;
        if (solvedSet.has(q.uniqueId)) entry.solved += 1;
      }
    }
    return map;
  }, [questions, solvedSet]);

  const roundQuestions = useMemo(
    () => questions.filter((q) => getQuestionRound(q) === activeRound.roundNumber),
    [questions, activeRound.roundNumber],
  );

  const availableTopics = useMemo(() => {
    const set = new Set<string>();
    for (const q of roundQuestions) set.add(q.topic);
    return Array.from(set);
  }, [roundQuestions]);

  const filteredQuestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return roundQuestions.filter((q) => {
      if (difficultyFilter !== 'All' && q.difficulty !== difficultyFilter) return false;
      if (topicFilter !== 'All' && q.topic !== topicFilter) return false;
      if (
        term &&
        !q.title.toLowerCase().includes(term) &&
        !q.topic.toLowerCase().includes(term) &&
        !q.subtopic.toLowerCase().includes(term) &&
        !q.companyTags.some((c) => c.toLowerCase().includes(term))
      ) {
        return false;
      }
      return true;
    });
  }, [roundQuestions, search, difficultyFilter, topicFilter]);

  const activeStats = roundCounts.get(activeRound.roundNumber) || { total: 0, solved: 0 };
  const pct = activeStats.total > 0 ? Math.round((activeStats.solved / activeStats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* 8-Round Navigation Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {INTERVIEW_ROUNDS.map((r) => {
          const stats = roundCounts.get(r.roundNumber) || { total: 0, solved: 0 };
          const rPct = stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0;
          const isSelected = r.roundNumber === activeRound.roundNumber;
          return (
            <button
              key={r.roundNumber}
              onClick={() => {
                onSelectRoundSlug(r.slug);
                setTopicFilter('All');
              }}
              className={`glass-surface rounded-2xl p-4 text-left transition-all ${
                isSelected
                  ? 'border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]'
                  : 'hover:border-[var(--border-strong)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-white">
                  Round {r.roundNumber}
                </span>
                <span className="font-mono text-xs text-slate-300 tabular-nums">
                  {stats.solved}/{stats.total}
                </span>
              </div>
              <div className="mt-1 truncate font-display text-sm font-bold text-white">
                {r.title.replace(/^Round \d+:\s*/, '')}
              </div>
              <div className="mt-1 line-clamp-1 text-xs text-slate-400">{r.subtitle}</div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
                <div
                  className="h-full rounded-full bg-[var(--accent-primary)] transition-all"
                  style={{ width: `${rPct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Round Landing Header & "How This Round Works" Guide Banner */}
      <div className="glass-surface rounded-2xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-mono font-semibold text-white">
                TIER-1 INTERVIEW LOOP · ROUND {activeRound.roundNumber} OF 8
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {activeRound.durationMins} mins typical
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-white tabular-nums">
                {activeStats.solved}/{activeStats.total} solved ({pct}%)
              </span>
            </div>
            <h1 className="mt-1.5 font-display text-2xl font-bold text-white">{activeRound.title}</h1>
            <p className="mt-1 text-sm text-slate-300">{activeRound.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onSelectTopic(activeRound.pillarTopicId)}
              className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Study Pillar Guide</span>
            </button>

            <GenerateBatchButton
              domain={
                activeRound.roundNumber === 1
                  ? 'Analytical SQL'
                  : activeRound.roundNumber === 2
                    ? 'Python & DSA'
                    : activeRound.roundNumber === 3
                      ? 'PySpark & Distributed'
                      : 'Engineering Labs'
              }
              topic={activeRound.title}
              roadmapTrack={
                activeRound.roundNumber === 1
                  ? 'Analytical SQL Mastery'
                  : activeRound.roundNumber === 2
                    ? 'DSA Pattern Roadmap'
                    : 'Data Engineering Core'
              }
              experienceLevel={experienceTier}
              roundType={activeRound.title}
              excludeTitles={questions.map((q) => q.title)}
              onGenerated={onAddGeneratedQuestions}
              compact
            />
          </div>
        </div>

        {/* How This Round Works Banner */}
        <div className="inset-surface mt-5 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Target className="h-4 w-4 text-white" />
            <span>How This Round Works</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{activeRound.howItWorks}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Interviewer Rubric Signals:</span>
            <span>{activeRound.keySignals.join(' · ')}</span>
          </div>
        </div>
      </div>

      {/* Filters & Topic Jump Bar */}
      <div className="glass-surface space-y-3 rounded-2xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${roundQuestions.length} problems in Round ${activeRound.roundNumber}...`}
              className="inset-surface w-full rounded-xl py-2 pr-3 pl-9 text-xs text-white placeholder-slate-500 outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          <div className="inset-surface flex rounded-xl p-0.5 text-xs">
            {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficultyFilter(diff)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  difficultyFilter === diff ? 'tab-active' : 'text-slate-400 hover:text-white'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Topic Filter + Direct Knowledge Hub Jump */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTopicFilter('All')}
            className={`whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
              topicFilter === 'All'
                ? 'tab-active border-transparent'
                : 'btn-secondary'
            }`}
          >
            All Topics ({roundQuestions.length})
          </button>
          {availableTopics.map((topic) => (
            <div key={topic} className="inset-surface inline-flex items-center overflow-hidden rounded-lg">
              <button
                onClick={() => setTopicFilter(topic)}
                className={`whitespace-nowrap px-2.5 py-1 text-xs font-medium transition-colors ${
                  topicFilter === topic ? 'tab-active' : 'text-slate-300 hover:text-white'
                }`}
              >
                {topic}
              </button>
              <button
                onClick={() => onSelectTopic(topic)}
                title={`Open Knowledge Hub guide for ${topic}`}
                className="border-l border-[var(--border-subtle)] px-2 py-1 text-[11px] font-semibold text-white hover:opacity-80"
              >
                Guide
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Filtered Question List */}
      <div className="glass-surface overflow-hidden rounded-2xl">
        <div className="divide-y divide-white/[0.06]">
          {filteredQuestions.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No problems matched your search or filters in Round {activeRound.roundNumber}.
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const done = solvedSet.has(q.uniqueId);
              return (
                <div
                  key={q.uniqueId}
                  className="flex flex-col gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
                >
                  <button
                    onClick={() => onSelectQuestion(q)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    {done ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white hover:underline">
                        {q.title}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                        <span>{q.subtopic || q.topic}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-[11px] text-slate-300">{getEvalLabel(q)}</span>
                        {q.askedContext && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-[11px] text-slate-300">{q.askedContext}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-3 pl-7 sm:pl-0">
                    <button
                      onClick={() => onSelectTopic(q.topic)}
                      className="btn-secondary hidden whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium md:inline-flex"
                    >
                      {q.topic}
                    </button>

                    <span className="w-14 text-right font-mono text-xs font-semibold text-slate-300">
                      {q.difficulty}
                    </span>

                    <a
                      href={`/problem/${encodeURIComponent(q.uniqueId)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in New Tab"
                      className="btn-secondary inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="hidden xl:inline">New Tab</span>
                    </a>

                    <button
                      onClick={() => onSelectQuestion(q)}
                      className="btn-primary inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs"
                    >
                      <span>Solve</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
