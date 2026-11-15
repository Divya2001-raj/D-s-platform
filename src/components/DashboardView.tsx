import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Code2,
  ExternalLink,
  Flame,
  Gauge,
  Layers,
  Lock,
  Mic,
  MoreVertical,
  Settings,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type {
  AppRoute,
  ExperienceTier,
  MistakeVaultItem,
  Question,
  SM2Item,
  UserProfile,
  UserProgress,
} from '../types/platform';
import { getQuestionRound, INTERVIEW_ROUNDS, ROADMAP_TRACKS } from '../data';
import { useTheme } from '../lib/themeContext';
import { BrandMark } from './BrandMark';

interface DashboardViewProps {
  profile: UserProfile;
  progress: UserProgress;
  questions: Question[];
  mistakeVault: MistakeVaultItem[];
  onChangeExperienceTier: (tier: ExperienceTier) => void;
  onNavigate: (route: AppRoute) => void;
  onSelectRound: (roundSlug: string) => void;
  onSelectQuestion: (q: Question) => void;
  onColdSolveQuestion: (q: Question) => void;
  onSelectTopic: (topicNameOrId: string) => void;
  onRateSM2: (item: SM2Item, quality: number) => void;
}

const DOMAIN_FILTER_PILLS = ['All', 'SQL', 'PySpark', 'Modeling', 'Streaming', 'Iceberg', 'FinOps'] as const;
type DomainPillFilter = (typeof DOMAIN_FILTER_PILLS)[number];

export function DashboardView({
  profile,
  progress,
  questions,
  mistakeVault,
  onChangeExperienceTier,
  onNavigate,
  onSelectRound,
  onSelectQuestion,
  onColdSolveQuestion,
  onSelectTopic,
  onRateSM2,
}: DashboardViewProps) {
  const { isDark } = useTheme();
  const [selectedRoundIdx, setSelectedRoundIdx] = useState(0);
  const [showAllRounds, setShowAllRounds] = useState(false);
  const [roundMenuOpen, setRoundMenuOpen] = useState(false);
  const [readinessMenuOpen, setReadinessMenuOpen] = useState(false);
  const [activeDomainPill, setActiveDomainPill] = useState<DomainPillFilter>('All');

  const stats = useMemo(() => {
    const solvedSet = new Set(progress.solvedIds);
    const sqlQs = questions.filter((q) => q.domain === 'Analytical SQL');
    const pyQs = questions.filter((q) => q.domain === 'Python & DSA');
    const deQs = questions.filter((q) => q.domain === 'PySpark & Distributed' || q.domain === 'Engineering Labs');

    const sqlSolved = sqlQs.filter((q) => solvedSet.has(q.uniqueId)).length;
    const pySolved = pyQs.filter((q) => solvedSet.has(q.uniqueId)).length;
    const deSolved = deQs.filter((q) => solvedSet.has(q.uniqueId)).length;

    const pct = (done: number, total: number) => (total === 0 ? 0 : Math.min(100, Math.round((done / total) * 100)));

    const earnedXp = questions
      .filter((q) => solvedSet.has(q.uniqueId))
      .reduce((acc, q) => acc + (q.xpReward || (q.difficulty === 'Hard' ? 400 : q.difficulty === 'Medium' ? 250 : 150)), 0);

    const radarData = [
      { axis: 'Analytical SQL', score: Math.max(28, pct(sqlSolved, sqlQs.length)) },
      { axis: 'Python & DSA', score: Math.max(24, pct(pySolved, pyQs.length)) },
      { axis: 'PySpark & Skew', score: Math.max(22, pct(deSolved, deQs.length)) },
      { axis: 'Lakehouse', score: Math.min(100, 34 + progress.completedTopics.length * 14) },
      { axis: 'System Design', score: Math.min(100, 30 + progress.completedTopics.length * 12) },
      { axis: 'Data Modeling', score: Math.min(100, 36 + Math.round((sqlSolved + deSolved) * 2)) },
    ];

    const trackProgress = ROADMAP_TRACKS.map((tr) => {
      const tqs = questions.filter((q) => q.roadmapTracks.includes(tr.id));
      const solved = tqs.filter((q) => solvedSet.has(q.uniqueId)).length;
      return {
        name: tr.id.replace(' Roadmap', '').replace(' Mastery', ''),
        solved,
        remaining: Math.max(0, tqs.length - solved),
        total: tqs.length,
      };
    });

    const overallEstimate = Math.round(radarData.reduce((acc, r) => acc + r.score, 0) / radarData.length);
    const sqlPyPct = Math.max(18, Math.min(100, pct(sqlSolved + deSolved, Math.max(1, sqlQs.length + deQs.length))));
    const weeklyPct = Math.min(100, Math.max(15, Math.round(((progress.solvedIds.length + progress.completedTopics.length) / 14) * 100)));
    const conceptPct = Math.min(100, Math.round((progress.completedTopics.length / 8) * 100));

    return {
      sqlSolved,
      pySolved,
      deSolved,
      sqlTotal: sqlQs.length,
      pyTotal: pyQs.length,
      deTotal: deQs.length,
      earnedXp,
      radarData,
      trackProgress,
      overallEstimate,
      sqlPyPct,
      weeklyPct,
      conceptPct,
    };
  }, [questions, progress]);

  const dueMistakes = useMemo(() => {
    const now = Date.now();
    return mistakeVault.filter((m) => !m.mastered && m.dueAt <= now);
  }, [mistakeVault]);

  const dueQueue = useMemo(() => {
    const now = Date.now();
    return progress.sm2Queue.filter((item) => item.nextReviewAt <= now).slice(0, 4);
  }, [progress.sm2Queue]);

  const recommendedNext = useMemo(() => {
    const solvedSet = new Set(progress.solvedIds);
    const basePool = questions.filter((q) => !solvedSet.has(q.uniqueId) && q.experienceLevel === profile.experienceTier);
    const pool = basePool.length > 0 ? basePool : questions;
    if (activeDomainPill === 'All') return pool.slice(0, 6);
    const needle = activeDomainPill.toLowerCase();
    const matched = pool.filter((q) =>
      `${q.title} ${q.domain} ${q.topic} ${q.subtopic} ${q.roundType}`.toLowerCase().includes(needle),
    );
    return (matched.length > 0 ? matched : pool).slice(0, 6);
  }, [questions, progress.solvedIds, profile.experienceTier, activeDomainPill]);

  const dailyQuest = useMemo(() => {
    const solvedSet = new Set(progress.solvedIds);
    const unsolved = questions.filter((q) => !solvedSet.has(q.uniqueId));
    const pool = unsolved.length > 0 ? unsolved : questions;
    if (pool.length === 0) return null;
    const daySeed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, '')) || 1;
    return pool[daySeed % pool.length];
  }, [questions, progress.solvedIds]);

  const visibleRounds = showAllRounds ? INTERVIEW_ROUNDS : INTERVIEW_ROUNDS.slice(0, 4);
  const topDueMistake = dueMistakes[0] || mistakeVault[0] || null;
  const topDueLinkedQuestion = topDueMistake?.questionId
    ? questions.find((q) => q.uniqueId === topDueMistake.questionId) || null
    : null;

  // Radial gauge stroke math for Card 01 (BTS Borahae circular progress ring)
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const gaugeOffset = circumference - (stats.sqlPyPct / 100) * circumference;

  const progressStrips = [
    {
      id: 'weekly',
      title: 'Weekly Prep Sprint',
      subtitle: `${progress.solvedIds.length} solved · ${profile.dailyStreak}d streak`,
      pct: stats.weeklyPct,
      icon: Code2,
      onClick: () => (recommendedNext[0] ? onSelectQuestion(recommendedNext[0]) : onNavigate('sql-arena')),
      titleAttr: 'Launch Next Recommended Problem',
    },
    {
      id: 'concepts',
      title: 'Concept Pillars & MCQs',
      subtitle: `${progress.completedTopics.length}/8 core pillars mastered`,
      pct: stats.conceptPct,
      icon: BookOpen,
      onClick: () => onSelectTopic('spark-aqe-skew-tuning'),
      titleAttr: 'Review Spark & Lakehouse Concepts',
    },
    {
      id: 'quest',
      title: 'Quest Map Progress',
      subtitle: `${stats.earnedXp.toLocaleString()} XP · ${profile.experienceTier}`,
      pct: Math.min(100, Math.max(12, Math.round((stats.earnedXp / 5000) * 100))),
      icon: Settings,
      onClick: () => onNavigate('quest-roadmap'),
      titleAttr: 'Open 8-Stage Quest Roadmap',
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* BENTO ROW 1: Profile & KPI Hero + Choose Your Round + Readiness Hero & Segmented Progress Strips */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        {/* Card 1: Profile & KPI Hero Card */}
        <section
          data-bento-card="profile-hero"
          className="glass-surface glass-surface-hover flex flex-col justify-between p-6 lg:col-span-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <BrandMark size={64} variant="avatar" showOnlineDot />
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full bg-[#A78BFA] shadow-[0_0_10px_rgba(167,139,250,0.85)]"
                    aria-hidden="true"
                  />
                  <span className="font-mono text-[11px] font-semibold text-[#C4B5FD]">
                    {profile.experienceTier} · Active
                  </span>
                </div>
                <h1 className="mt-0.5 font-display text-xl font-bold tracking-tight text-white">
                  D
                </h1>
                <p className="text-xs text-slate-400">Data Engineer 360 Workspace</p>
              </div>
            </div>
          </div>

          <div className="my-5 grid w-full grid-cols-2 gap-3 border-y bento-divider py-4">
            <button
              type="button"
              onClick={() => onNavigate('rounds')}
              className="group rounded-2xl bg-[var(--bg-inset)] p-3.5 text-left transition-colors hover:border hover:border-[#8B5CF6]/50"
              title="Open 8 Interview Rounds"
            >
              <div className="text-[11px] font-medium text-slate-400">Solved</div>
              <div className="mt-1 font-display text-3xl font-extrabold tracking-tight text-white tabular-nums group-hover:text-[#C4B5FD]">
                {progress.solvedIds.length}
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('quest-roadmap')}
              className="group rounded-2xl bg-[var(--bg-inset)] p-3.5 text-left transition-colors hover:border hover:border-[#8B5CF6]/50"
              title="Open Quest Roadmap XP"
            >
              <div className="text-[11px] font-medium text-slate-400">XP Earned</div>
              <div className="mt-1 font-display text-3xl font-extrabold tracking-tight text-white tabular-nums group-hover:text-[#E879F9]">
                {stats.earnedXp.toLocaleString()}
              </div>
            </button>
          </div>

          <div className="w-full space-y-2.5">
            <div className="flex items-center justify-center gap-1.5 rounded-full bg-[var(--bg-inset)] p-1">
              {(['3-4 yrs', '4-6 yrs', '6+ yrs'] as ExperienceTier[]).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => onChangeExperienceTier(tier)}
                  className={`flex-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    profile.experienceTier === tier
                      ? 'tab-active'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500">
              <span>{profile.dailyStreak}d streak</span>
              <span aria-hidden="true">·</span>
              <span>{profile.studyHours.toFixed(1)} hrs logged</span>
            </div>
          </div>
        </section>

        {/* Card 2: "Choose your round" Segmented Pill-Row Card */}
        <section
          data-bento-card="choose-round"
          className="glass-surface relative flex flex-col justify-between p-6 pb-8 lg:col-span-4"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="gradient-violet keep-white flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-white">Choose your round</h2>
                <p className="text-xs text-slate-400">Jump straight into any Tier-1 loop</p>
              </div>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoundMenuOpen((o) => !o)}
                className="rounded-full p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white"
                aria-label="Round navigation actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {roundMenuOpen && (
                <div className="glass-surface absolute right-0 top-10 z-20 w-48 rounded-2xl p-1.5 text-xs shadow-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setRoundMenuOpen(false);
                      onSelectRound(INTERVIEW_ROUNDS[selectedRoundIdx]?.slug || INTERVIEW_ROUNDS[0].slug);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-white hover:bg-white/[0.06]"
                  >
                    <span>Open Selected Round</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRoundMenuOpen(false);
                      onNavigate('practical-lab');
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  >
                    <span>Practical Pipeline Lab</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRoundMenuOpen(false);
                      onNavigate('system-design');
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  >
                    <span>System Design Studio</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            {visibleRounds.map((r, idx) => {
              const active = idx === selectedRoundIdx;
              const roundCount = questions.filter((q) => getQuestionRound(q) === r.roundNumber).length;
              return (
                <button
                  key={r.roundNumber}
                  type="button"
                  onClick={() => {
                    setSelectedRoundIdx(idx);
                    onSelectRound(r.slug);
                  }}
                  className={`flex h-11 w-full items-center justify-between rounded-full px-4 text-xs font-semibold transition-all ${
                    active
                      ? 'tab-active'
                      : 'bg-[var(--bg-inset)] text-slate-300 hover:border hover:border-[#8B5CF6]/60 hover:text-white'
                  }`}
                >
                  <span className="truncate pr-2">
                    Round {r.roundNumber} · {r.shortTitle.replace(/^R\d+\s*·\s*/, '')}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] tabular-nums opacity-90">
                    <span>{roundCount}</span>
                    {active && <Check className="h-3.5 w-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Centered Circular Borahae Gradient Chevron Button */}
          <button
            type="button"
            onClick={() => setShowAllRounds((v) => !v)}
            title={showAllRounds ? 'Show Top 4 Rounds' : 'Expand All 8 Interview Rounds'}
            className="gradient-violet keep-white absolute -bottom-5 left-1/2 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full transition-transform hover:scale-105"
          >
            {showAllRounds ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </section>

        {/* Card 3 Stack: Top KPI Readiness Hero Card + Segmented Progress & Status Strips */}
        <div className="flex flex-col gap-5 lg:col-span-4">
          {/* Top KPI & Readiness Hero Card (Top-Right Kit Geometry) */}
          <section
            data-bento-card="readiness-stat"
            className="glass-surface glass-surface-hover relative flex flex-col justify-between p-5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="gradient-violet keep-white flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                  <Gauge className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-white">Readiness Score</h2>
                  <p className="text-xs text-slate-400">Tier-1 Prep Diagnostic</p>
                </div>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setReadinessMenuOpen((o) => !o)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white"
                  aria-label="Readiness quick links"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {readinessMenuOpen && (
                  <div className="glass-surface absolute right-0 top-8 z-20 w-44 rounded-2xl p-1.5 text-xs shadow-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        setReadinessMenuOpen(false);
                        onNavigate('rounds');
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-white hover:bg-white/[0.06]"
                    >
                      <span>8 Interview Rounds</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReadinessMenuOpen(false);
                        onNavigate('job-radar');
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-slate-300 hover:bg-white/[0.06] hover:text-white"
                    >
                      <span>Live Job Radar</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full bg-[#A78BFA] shadow-[0_0_8px_rgba(167,139,250,0.85)]"
                    aria-hidden="true"
                  />
                  <span className="text-[11px] font-medium text-[#C4B5FD]">Live Estimate</span>
                </div>
                <div className="font-display text-4xl font-extrabold tracking-tight text-white tabular-nums">
                  {stats.overallEstimate}%
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('mock-interview')}
                className="btn-luminous inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-bold"
              >
                <span className="h-2 w-2 rounded-full bg-white" aria-hidden="true" />
                <span>Start Mock</span>
              </button>
            </div>
          </section>

          {/* Segmented Progress & Status Strips Card (Middle-Left Kit Geometry) */}
          <section
            data-bento-card="weekly-progress"
            className="glass-surface flex flex-1 flex-col justify-between gap-2.5 p-4"
          >
            {progressStrips.map((strip) => {
              const Icon = strip.icon;
              return (
                <button
                  key={strip.id}
                  type="button"
                  onClick={strip.onClick}
                  title={strip.titleAttr}
                  className="group flex w-full items-center justify-between gap-2.5 rounded-2xl bg-[var(--bg-inset)]/60 p-2.5 text-left transition-colors hover:bg-[var(--bg-inset)]"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <MoreVertical className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-white group-hover:text-[#C4B5FD]">
                        {strip.title}
                      </div>
                      <div className="truncate text-[11px] text-slate-400">
                        {strip.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-xl bg-[var(--bg-inset)] px-2.5 py-1.5 font-mono text-xs font-bold text-white tabular-nums border border-[var(--border-subtle)]">
                      {strip.pct}%
                    </span>
                    <span className="gradient-violet keep-white flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                </button>
              );
            })}
          </section>
        </div>
      </div>

      {/* BENTO ROW 2: Daily Quest + Capsule Action Toggles + Circular Borahae Ring Gauge + Wave Sparkline + Mistake Vault */}
      <div className="grid grid-cols-1 gap-6 pt-2 lg:grid-cols-12">
        {/* Featured Daily Tier-1 Quest & Interactive Capsule Action Toggles */}
        <section
          data-bento-card="daily-quest"
          className="glass-surface glass-surface-hover flex flex-col justify-between p-6 lg:col-span-5"
        >
          <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#C4B5FD]">
              <Flame className="h-3.5 w-3.5 text-[#D946EF]" />
              Daily Tier-1 Quest
            </span>
            <span className="text-[11px] text-slate-500">{progress.bookmarks.length} bookmarked</span>
          </div>

          {dailyQuest && (
            <div className="my-4 flex items-center gap-4">
              <div className="gradient-violet keep-white flex h-[84px] w-[84px] shrink-0 flex-col items-center justify-center rounded-2xl">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest opacity-85">
                  DAY
                </span>
                <span className="font-display text-2xl font-extrabold leading-none">
                  R{getQuestionRound(dailyQuest)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onSelectQuestion(dailyQuest)}
                className="group min-w-0 flex-1 text-left"
              >
                <h2 className="line-clamp-2 font-display text-base font-bold text-white group-hover:text-[#C4B5FD]">
                  {dailyQuest.title}
                </h2>
                <p className="mt-1 truncate text-xs text-slate-400">
                  {dailyQuest.companyTags.slice(0, 2).join(', ')} · {dailyQuest.difficulty} · +{dailyQuest.xpReward || 250} XP
                </p>
              </button>

              <button
                type="button"
                onClick={() => onSelectQuestion(dailyQuest)}
                aria-label="Launch Daily Quest"
                className="btn-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Bottom-Left Kit Style: Interactive Capsule Action Toggles */}
          <div className="space-y-2 border-t bento-divider pt-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--bg-inset)]/60 px-3.5 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-white">Practical Pipeline Lab</div>
                <div className="truncate text-[11px] text-slate-400">dbt, PySpark MERGE &amp; Schema Drift</div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('practical-lab')}
                className="btn-luminous inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[11px] font-bold"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                <span>Run 6+ Tests</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--bg-inset)]/60 px-3.5 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-white">Tier-1 &amp; Tier-2 Job Radar</div>
                <div className="truncate text-[11px] text-slate-400">Live 3+ YOE Roles &amp; ATS Resume Tailor</div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('job-radar')}
                className="btn-luminous inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[11px] font-bold"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                <span>Scan Live Jobs</span>
              </button>
            </div>
          </div>
        </section>

        {/* Dual Mini Diagnostic Cards (01 Circular Borahae Ring Gauge + 02 Glowing Borahae Wave Sparkline) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-4">
          {/* Card 01: Circular Borahae Ring Gauge Card */}
          <section
            data-bento-card="mini-sql-pyspark"
            className="glass-surface glass-surface-hover flex flex-col justify-between p-5"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-400">01</span>
              <span className="text-[11px] font-medium text-[#C4B5FD]">Ring Gauge</span>
            </div>

            <div className="my-3 flex items-center justify-center">
              <div className="relative flex h-[92px] w-[92px] items-center justify-center">
                <svg width="92" height="92" viewBox="0 0 92 92" className="-rotate-90">
                  <defs>
                    <linearGradient id="borahaeRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6D28D9" />
                      <stop offset="48%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#D946EF" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="46"
                    cy="46"
                    r={radius}
                    fill="none"
                    stroke={isDark ? '#322E3D' : '#E6E0F4'}
                    strokeWidth="8"
                  />
                  <circle
                    cx="46"
                    cy="46"
                    r={radius}
                    fill="none"
                    stroke="url(#borahaeRingGrad)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={gaugeOffset}
                  />
                </svg>
                <span className="absolute font-display text-lg font-extrabold text-white tabular-nums">
                  {stats.sqlPyPct}%
                </span>
              </div>
            </div>

            <div>
              <div className="text-sm font-bold text-white">SQL &amp; PySpark</div>
              <div className="text-[11px] text-slate-400">
                {stats.sqlSolved + stats.deSolved} / {stats.sqlTotal + stats.deTotal} cleared
              </div>
              <button
                type="button"
                onClick={() => onNavigate('sql-arena')}
                className="pill-pass-solid mt-3 w-full rounded-full py-2 text-xs font-bold"
              >
                Practise
              </button>
            </div>
          </section>

          {/* Card 02: Glowing Borahae Bezier Wave Sparkline */}
          <section
            data-bento-card="mini-system-concepts"
            className="glass-surface glass-surface-hover flex flex-col justify-between p-5"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-400">02</span>
              <span className="font-mono text-xs font-bold text-white tabular-nums">
                {progress.completedTopics.length}/8
              </span>
            </div>

            <div className="my-3 flex h-[92px] items-center justify-center">
              <svg viewBox="0 0 120 56" className="h-14 w-full overflow-visible">
                <defs>
                  <linearGradient id="borahaeWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6D28D9" />
                    <stop offset="50%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#E879F9" />
                  </linearGradient>
                </defs>
                <path
                  d="M 4 42 C 20 12, 34 44, 52 24 C 68 8, 84 36, 116 10"
                  fill="none"
                  stroke="url(#borahaeWaveGrad)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle cx="116" cy="10" r="4.5" fill="#E879F9" />
              </svg>
            </div>

            <div>
              <div className="text-sm font-bold text-white">System &amp; Concepts</div>
              <div className="text-[11px] text-slate-400">8 Deep-Dive Pillars + MCQs</div>
              <button
                type="button"
                onClick={() => onNavigate('knowledge')}
                className="pill-pass-solid mt-3 w-full rounded-full py-2 text-xs font-bold"
              >
                Review
              </button>
            </div>
          </section>
        </div>

        {/* Mistake Vault • Due Today Card */}
        <section
          data-bento-card="mistake-vault-card"
          className="glass-surface glass-surface-hover flex flex-col justify-between p-6 lg:col-span-3"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
                <BrainCircuit className="h-4 w-4 text-[#A78BFA]" />
                Mistake Vault
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold ${
                  dueMistakes.length > 0
                    ? 'bg-[#EF4444]/15 text-[#EF4444]'
                    : 'bg-[#22C55E]/15 text-[#22C55E]'
                }`}
              >
                {dueMistakes.length} Due Today
              </span>
            </div>

            {topDueMistake ? (
              <div className="inset-surface mt-3 rounded-2xl p-3">
                <div className="flex items-center justify-between font-mono text-[10px] text-[#C4B5FD]">
                  <span>{topDueMistake.domain}</span>
                  <span>{topDueMistake.intervalDays}D Stage</span>
                </div>
                <div className="mt-1 line-clamp-2 text-xs font-bold text-white">
                  {topDueMistake.title}
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">
                  {topDueMistake.reason}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                Zero pending failures. Any failing test, fuzzer crash, &lt;80% MCQ quiz, or mock gap appears here on a 1D → 3D → 7D → 21D schedule.
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {topDueLinkedQuestion ? (
              <button
                type="button"
                onClick={() => onColdSolveQuestion(topDueLinkedQuestion)}
                className="btn-luminous inline-flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-bold"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Cold-Solve Now</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('mistake-vault')}
                className="btn-primary inline-flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-bold"
              >
                <span>Open Mistake Vault</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('mistake-vault')}
              className="text-center text-[11px] font-semibold text-slate-400 hover:text-white"
            >
              View All Tracked ({mistakeVault.length})
            </button>
          </div>
        </section>
      </div>

      {/* BENTO ROW 3: Interactive Outlined Filter Pill Box + Adaptive Next Focus + SM-2 Queue */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section
          data-bento-card="filter-focus"
          className="glass-surface p-6 lg:col-span-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-white">
                Adaptive Next Focus ({profile.experienceTier})
              </h2>
              <p className="text-xs text-slate-400">Filter authentic Tier-1 prompts by domain pillar</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('jd-analyzer')}
              className="text-xs font-semibold text-[#C4B5FD] hover:underline"
            >
              Analyze Target JD →
            </button>
          </div>

          {/* Outlined Filter Pill Box (border-[#2D2936], solid #8B5CF6 when selected) */}
          <div className="mt-4 flex flex-wrap gap-2">
            {DOMAIN_FILTER_PILLS.map((pill) => {
              const active = activeDomainPill === pill;
              return (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setActiveDomainPill(pill)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? 'keep-white border-[#8B5CF6] bg-[#8B5CF6] shadow-[0_0_16px_rgba(139,92,246,0.4)]'
                      : 'border-[var(--border-subtle)] bg-transparent text-slate-300 hover:border-[#8B5CF6] hover:text-white'
                  }`}
                >
                  {pill}
                </button>
              );
            })}
          </div>

          <div className="mt-4 divide-y bento-divider">
            {recommendedNext.map((q) => (
              <div
                key={q.uniqueId}
                className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-white/[0.02]"
              >
                <button
                  type="button"
                  onClick={() => onSelectQuestion(q)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-sm font-semibold text-white hover:text-[#C4B5FD]">
                    {q.title}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-400">
                    {q.askedContext || q.domain} · {q.companyTags.slice(0, 2).join(', ')}
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectTopic(q.topic)}
                    className="btn-secondary hidden whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline-flex"
                  >
                    {q.topic}
                  </button>
                  <span className="font-mono text-xs font-semibold text-slate-300">
                    {q.difficulty}
                  </span>
                  <a
                    href={`/problem/${encodeURIComponent(q.uniqueId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in New Tab"
                    className="btn-secondary rounded-full p-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SM-2 Flash Review Queue */}
        <section
          data-bento-card="sm2-queue"
          className="glass-surface p-6 lg:col-span-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-white">SM-2 Concept Recall Deck</h2>
              <p className="text-xs text-slate-400">Rate recall confidence to tune spaced intervals</p>
            </div>
            <Sparkles className="h-4 w-4 text-[#A78BFA]" />
          </div>

          {dueQueue.length === 0 ? (
            <div className="inset-surface rounded-2xl p-4 text-xs leading-relaxed text-slate-400">
              No SM-2 recall items due right now. Open any problem workspace and click the brain icon to add custom recall cards alongside the automatic Mistake Vault.
            </div>
          ) : (
            <div className="space-y-3">
              {dueQueue.map((item) => (
                <div key={item.itemId} className="inset-surface rounded-2xl p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-medium text-white">{item.title}</div>
                    <span className="shrink-0 font-mono text-[11px] text-slate-400">EF {item.easeFactor}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{item.domain} · Rep #{item.repetitions}</div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {[
                      { label: 'Again', q: 1 },
                      { label: 'Hard', q: 3 },
                      { label: 'Good', q: 4 },
                      { label: 'Easy', q: 5 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => onRateSM2(item, btn.q)}
                        className="btn-secondary rounded-full px-3 py-1 text-xs font-medium"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* BENTO ROW 4: Recharts Skill Domain & Roadmap Analytics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="glass-surface p-6 lg:col-span-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-white">Skill Domain Coverage</h2>
              <p className="text-xs text-slate-400">Preparation balance across Tier-1 Data Engineering domains</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={stats.radarData}>
                <PolarGrid stroke={isDark ? '#2D2936' : '#E5DFEF'} />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: isDark ? '#A19DB0' : '#5E5873', fontSize: 11 }}
                />
                <Radar
                  name="Preparation"
                  dataKey="score"
                  stroke="#8B5CF6"
                  fill="#A855F7"
                  fillOpacity={0.3}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1E1B24' : '#FFFFFF',
                    borderColor: isDark ? '#2D2936' : '#E5DFEF',
                    color: isDark ? '#FFFFFF' : '#13111C',
                    borderRadius: '16px',
                    fontSize: '12px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-surface p-6 lg:col-span-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-white">Curated Roadmap Completion</h2>
              <p className="text-xs text-slate-400">Solved vs remaining problems per core track</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('roadmaps')}
              className="text-xs font-semibold text-[#C4B5FD] hover:underline"
            >
              View Tracks →
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.trackProgress} layout="vertical" margin={{ left: 16, right: 16 }}>
                <XAxis type="number" stroke={isDark ? '#A19DB0' : '#5E5873'} fontSize={11} />
                <YAxis type="category" dataKey="name" width={120} stroke={isDark ? '#FFFFFF' : '#13111C'} fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1E1B24' : '#FFFFFF',
                    borderColor: isDark ? '#2D2936' : '#E5DFEF',
                    color: isDark ? '#FFFFFF' : '#13111C',
                    borderRadius: '16px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="solved" stackId="a" fill="#8B5CF6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="remaining" stackId="a" fill={isDark ? '#322E3D' : '#E6E0F4'} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Explicit Readiness Disclaimer */}
      <div className="inset-surface flex items-center gap-2.5 rounded-2xl px-4 py-3 text-xs text-slate-400">
        <ShieldAlert className="h-4 w-4 shrink-0 text-[#A78BFA]" />
        <span>
          Readiness percentages and mock interview rubrics are estimated preparation diagnostics based on completed problems and spaced repetition history, not guarantees of hiring outcomes.
        </span>
      </div>
    </div>
  );
}
