import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronDown, ChevronRight, Circle, Search } from 'lucide-react';
import type { ExperienceTier, Question } from '../types/platform';
import { ROADMAP_TRACKS } from '../data';
import { GenerateBatchButton } from './GenerateBatchButton';

interface RoadmapsViewProps {
  questions: Question[];
  solvedIds: string[];
  experienceTier: ExperienceTier;
  onSelectQuestion: (q: Question) => void;
  onAddGeneratedQuestions: (qs: Question[]) => Promise<void>;
}

export function RoadmapsView({
  questions,
  solvedIds,
  experienceTier,
  onSelectQuestion,
  onAddGeneratedQuestions,
}: RoadmapsViewProps) {
  const [activeTrackId, setActiveTrackId] = useState<string>(ROADMAP_TRACKS[0].id);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  const solvedSet = useMemo(() => new Set(solvedIds), [solvedIds]);
  const activeTrack = ROADMAP_TRACKS.find((t) => t.id === activeTrackId) || ROADMAP_TRACKS[0];

  const groupedByTopic = useMemo(() => {
    const qLower = search.trim().toLowerCase();
    const filtered = questions.filter((q) => {
      if (!q.roadmapTracks.includes(activeTrackId)) return false;
      if (difficultyFilter !== 'All' && q.difficulty !== difficultyFilter) return false;
      if (
        qLower &&
        !q.title.toLowerCase().includes(qLower) &&
        !q.topic.toLowerCase().includes(qLower) &&
        !q.companyTags.some((c) => c.toLowerCase().includes(qLower))
      ) {
        return false;
      }
      return true;
    });

    const map = new Map<string, Question[]>();
    for (const item of filtered) {
      const list = map.get(item.topic) || [];
      list.push(item);
      map.set(item.topic, list);
    }
    return Array.from(map.entries());
  }, [questions, activeTrackId, search, difficultyFilter]);

  const trackStats = useMemo(() => {
    const allInTrack = questions.filter((q) => q.roadmapTracks.includes(activeTrackId));
    const solved = allInTrack.filter((q) => solvedSet.has(q.uniqueId)).length;
    return { total: allInTrack.length, solved };
  }, [questions, activeTrackId, solvedSet]);

  const toggleTopic = (topic: string) => {
    setExpandedTopics((prev) => ({ ...prev, [topic]: prev[topic] === false }));
  };

  return (
    <div className="space-y-6">
      {/* Track Selector Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {ROADMAP_TRACKS.map((track) => {
          const tqs = questions.filter((q) => q.roadmapTracks.includes(track.id));
          const solved = tqs.filter((q) => solvedSet.has(q.uniqueId)).length;
          const pct = tqs.length ? Math.round((solved / tqs.length) * 100) : 0;
          const isActive = activeTrackId === track.id;

          return (
            <button
              key={track.id}
              onClick={() => setActiveTrackId(track.id)}
              className={`glass-surface rounded-2xl p-5 text-left transition-all ${
                isActive ? 'border-[#2DD4BF]/50 ring-1 ring-[#2DD4BF]/30' : 'hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-base font-bold text-white">{track.id}</h2>
                <span className="font-mono text-xs text-[#2DD4BF] tabular-nums">
                  {solved}/{tqs.length}
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-slate-300">{track.subtitle}</p>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-400">{track.description}</p>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: track.accent }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter & AI Batch Generation Toolbar */}
      <div className="glass-surface flex flex-col gap-4 rounded-2xl p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter patterns, titles, companies..."
              className="w-full rounded-xl border border-white/10 bg-[#07080C]/80 py-2 pr-3 pl-9 text-xs text-white placeholder-slate-500 outline-none focus:border-[#2DD4BF]"
            />
          </div>

          <div className="flex rounded-xl border border-white/10 bg-[#07080C]/80 p-0.5 text-xs">
            {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficultyFilter(diff)}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  difficultyFilter === diff ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>

          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {trackStats.solved} / {trackStats.total} completed
          </span>
        </div>

        <GenerateBatchButton
          domain={
            activeTrack.id === 'Analytical SQL Mastery'
              ? 'Analytical SQL'
              : activeTrack.id === 'DSA Pattern Roadmap'
                ? 'Python & DSA'
                : 'PySpark & Distributed'
          }
          topic={activeTrack.id}
          roadmapTrack={activeTrack.id}
          experienceLevel={experienceTier}
          roundType={
            activeTrack.id === 'Analytical SQL Mastery'
              ? 'SQL Coding'
              : activeTrack.id === 'DSA Pattern Roadmap'
                ? 'Python & DSA Coding'
                : 'PySpark & Big Data'
          }
          onGenerated={onAddGeneratedQuestions}
        />
      </div>

      {/* NeetCode-style Pattern Groups */}
      <div className="space-y-3">
        {groupedByTopic.length === 0 ? (
          <div className="glass-surface rounded-2xl p-8 text-center text-sm text-slate-400">
            No problems matched your current search or difficulty filter.
          </div>
        ) : (
          groupedByTopic.map(([topic, items]) => {
            const isOpen = expandedTopics[topic] !== false;
            const topicSolved = items.filter((i) => solvedSet.has(i.uniqueId)).length;

            return (
              <div key={topic} className="glass-surface overflow-hidden rounded-2xl">
                <button
                  onClick={() => toggleTopic(topic)}
                  className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="font-display text-sm font-semibold text-white">{topic}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs text-slate-400 tabular-nums">
                    <span>
                      {topicSolved} / {items.length}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                    {items.map((q) => {
                      const done = solvedSet.has(q.uniqueId);
                      return (
                        <button
                          key={q.uniqueId}
                          onClick={() => onSelectQuestion(q)}
                          className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-white/[0.03]"
                        >
                          <div className="flex min-w-0 items-center gap-3 pr-4">
                            {done ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#34D399]" />
                            ) : (
                              <Circle className="h-4 w-4 shrink-0 text-slate-600" />
                            )}
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-slate-100">{q.title}</div>
                              <div className="mt-0.5 truncate text-xs text-slate-400">
                                {q.subtopic} · {q.companyTags.slice(0, 3).join(', ')}
                                {q.sourceType === 'ai_generated_practice' ? ' · AI-Generated Practice' : ''}
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-4">
                            <span className="hidden font-mono text-xs text-slate-500 sm:inline">{q.experienceLevel}</span>
                            <span
                              className={`w-14 text-right font-mono text-xs ${
                                q.difficulty === 'Hard'
                                  ? 'text-[#FB7185]'
                                  : q.difficulty === 'Medium'
                                    ? 'text-[#FBBF24]'
                                    : 'text-[#34D399]'
                              }`}
                            >
                              {q.difficulty}
                            </span>
                            <ArrowRight className="h-4 w-4 text-slate-500" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
