import React, { useMemo } from 'react';
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
import { ArrowRight, BrainCircuit, CheckCircle2, Flame, Layers, ShieldAlert, Target } from 'lucide-react';
import type { AppRoute, ExperienceTier, Question, SM2Item, UserProfile, UserProgress } from '../types/platform';
import { ROADMAP_TRACKS } from '../data';

interface DashboardViewProps {
  profile: UserProfile;
  progress: UserProgress;
  questions: Question[];
  onChangeExperienceTier: (tier: ExperienceTier) => void;
  onNavigate: (route: AppRoute) => void;
  onSelectQuestion: (q: Question) => void;
  onRateSM2: (item: SM2Item, quality: number) => void;
}

export function DashboardView({
  profile,
  progress,
  questions,
  onChangeExperienceTier,
  onNavigate,
  onSelectQuestion,
  onRateSM2,
}: DashboardViewProps) {
  const stats = useMemo(() => {
    const solvedSet = new Set(progress.solvedIds);
    const sqlQs = questions.filter((q) => q.domain === 'Analytical SQL');
    const pyQs = questions.filter((q) => q.domain === 'Python & DSA');
    const deQs = questions.filter((q) => q.domain === 'PySpark & Distributed' || q.domain === 'Engineering Labs');

    const sqlSolved = sqlQs.filter((q) => solvedSet.has(q.uniqueId)).length;
    const pySolved = pyQs.filter((q) => solvedSet.has(q.uniqueId)).length;
    const deSolved = deQs.filter((q) => solvedSet.has(q.uniqueId)).length;

    const pct = (done: number, total: number) => (total === 0 ? 0 : Math.min(100, Math.round((done / total) * 100)));

    const radarData = [
      { axis: 'Analytical SQL', score: Math.max(25, pct(sqlSolved, sqlQs.length)) },
      { axis: 'Python & DSA', score: Math.max(22, pct(pySolved, pyQs.length)) },
      { axis: 'PySpark & Skew', score: Math.max(20, pct(deSolved, deQs.length)) },
      { axis: 'Lakehouse', score: Math.min(100, 32 + progress.completedTopics.length * 14) },
      { axis: 'System Design', score: Math.min(100, 28 + progress.completedTopics.length * 12) },
      { axis: 'Data Modeling', score: Math.min(100, 35 + Math.round((sqlSolved + deSolved) * 2)) },
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

    return { sqlSolved, pySolved, deSolved, sqlTotal: sqlQs.length, pyTotal: pyQs.length, deTotal: deQs.length, radarData, trackProgress, overallEstimate };
  }, [questions, progress]);

  const dueQueue = useMemo(() => {
    const now = Date.now();
    return progress.sm2Queue.filter((item) => item.nextReviewAt <= now).slice(0, 6);
  }, [progress.sm2Queue]);

  const recommendedNext = useMemo(() => {
    const solvedSet = new Set(progress.solvedIds);
    const tierFiltered = questions.filter((q) => !solvedSet.has(q.uniqueId) && q.experienceLevel === profile.experienceTier);
    return (tierFiltered.length > 0 ? tierFiltered : questions).slice(0, 4);
  }, [questions, progress.solvedIds, profile.experienceTier]);

  return (
    <div className="space-y-6">
      {/* Hero Control Strip */}
      <div className="glass-surface rounded-2xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#2DD4BF]">
              DATA ENGINEER 360 · {profile.experienceTier} Preparation Track
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Master Every Skill. Understand Every Concept. Crack Every Round.
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Targeting {profile.targetPositions.slice(0, 2).join(' · ')} across{' '}
              {profile.targetCompanies.slice(0, 4).join(', ')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-[#07080C]/80 p-1">
              {(['3-4 yrs', '4-6 yrs', '6+ yrs'] as ExperienceTier[]).map((tier) => (
                <button
                  key={tier}
                  onClick={() => onChangeExperienceTier(tier)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                    profile.experienceTier === tier
                      ? 'bg-gradient-to-r from-[#2DD4BF] to-[#818CF8] font-semibold text-[#07080C]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>

            <button
              onClick={() => onNavigate('sql-arena')}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-white px-4 py-2 text-xs font-semibold text-[#07080C] transition-opacity hover:opacity-90"
            >
              <span>Launch Arena</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-surface glass-surface-hover rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Problems Solved</span>
            <CheckCircle2 className="h-4 w-4 text-[#34D399]" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {progress.solvedIds.length}{' '}
            <span className="text-sm font-normal text-slate-500">/ {questions.length}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            SQL {stats.sqlSolved}/{stats.sqlTotal} · Py {stats.pySolved}/{stats.pyTotal} · DE {stats.deSolved}/{stats.deTotal}
          </p>
        </div>

        <div className="glass-surface glass-surface-hover rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Preparation Streak</span>
            <Flame className="h-4 w-4 text-[#FBBF24]" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {profile.dailyStreak} <span className="text-sm font-normal text-slate-500">days</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">{profile.studyHours.toFixed(1)} total practice hrs logged</p>
        </div>

        <div className="glass-surface glass-surface-hover rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Syllabus Mastery</span>
            <Layers className="h-4 w-4 text-[#818CF8]" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {progress.completedTopics.length} <span className="text-sm font-normal text-slate-500">/ 5 pillars</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">{progress.bookmarks.length} bookmarked items</p>
        </div>

        <div className="glass-surface glass-surface-hover rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Estimated Readiness</span>
            <Target className="h-4 w-4 text-[#2DD4BF]" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {stats.overallEstimate}%
          </div>
          <p className="mt-1 text-xs text-slate-400">Practice estimate only, not an offer guarantee</p>
        </div>
      </div>

      {/* Bento Analytics Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="glass-surface rounded-2xl p-5 lg:col-span-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-white">Skill Domain Coverage</h2>
              <p className="text-xs text-slate-400">Estimated preparation balance across Tier-1 rounds</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={stats.radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Radar
                  name="Preparation"
                  dataKey="score"
                  stroke="#2DD4BF"
                  fill="#2DD4BF"
                  fillOpacity={0.22}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#10121A',
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-surface rounded-2xl p-5 lg:col-span-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-white">Curated Roadmap Completion</h2>
              <p className="text-xs text-slate-400">Solved vs remaining problems per core study track</p>
            </div>
            <button
              onClick={() => onNavigate('roadmaps')}
              className="text-xs font-medium text-[#2DD4BF] hover:underline"
            >
              View Tracks
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.trackProgress} layout="vertical" margin={{ left: 16, right: 16 }}>
                <XAxis type="number" stroke="#64748B" fontSize={11} />
                <YAxis type="category" dataKey="name" width={120} stroke="#CBD5E1" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#10121A',
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="solved" stackId="a" fill="#2DD4BF" radius={[0, 0, 0, 0]} />
                <Bar dataKey="remaining" stackId="a" fill="rgba(129,140,248,0.22)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Split: Adaptive Next Problems + SM-2 Spaced Repetition Queue */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="glass-surface rounded-2xl p-5 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-white">
                Adaptive Next Focus ({profile.experienceTier})
              </h2>
              <p className="text-xs text-slate-400">Curated problems prioritized for your experience tier</p>
            </div>
            <button
              onClick={() => onNavigate('jd-analyzer')}
              className="text-xs font-medium text-[#818CF8] hover:underline"
            >
              Analyze Target JD
            </button>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {recommendedNext.map((q) => (
              <button
                key={q.uniqueId}
                onClick={() => onSelectQuestion(q)}
                className="flex w-full items-center justify-between py-3 text-left transition-colors hover:bg-white/[0.02] px-2 rounded-lg"
              >
                <div className="min-w-0 pr-4">
                  <div className="truncate text-sm font-medium text-white">{q.title}</div>
                  <div className="mt-0.5 truncate text-xs text-slate-400">
                    {q.domain} · {q.topic} · {q.companyTags.slice(0, 2).join(', ')}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`font-mono text-xs ${
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
            ))}
          </div>
        </div>

        <div className="glass-surface rounded-2xl p-5 lg:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-white">SM-2 Spaced Repetition Queue</h2>
              <p className="text-xs text-slate-400">Rate recall confidence to schedule optimal review intervals</p>
            </div>
            <BrainCircuit className="h-4 w-4 text-[#A78BFA]" />
          </div>

          {dueQueue.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[#07080C]/60 p-4 text-xs text-slate-400">
              No reviews due right now. Solve any SQL, Python, or PySpark problem and click &ldquo;Schedule SM-2 Review&rdquo; to build your spaced repetition deck.
            </div>
          ) : (
            <div className="space-y-3">
              {dueQueue.map((item) => (
                <div key={item.itemId} className="rounded-xl border border-white/10 bg-[#07080C]/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-medium text-white">{item.title}</div>
                    <span className="shrink-0 font-mono text-[11px] text-slate-400">EF {item.easeFactor}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{item.domain} · Rep #{item.repetitions}</div>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    {[
                      { label: 'Again', q: 1, cls: 'text-[#FB7185] hover:bg-[#FB7185]/15' },
                      { label: 'Hard', q: 3, cls: 'text-[#FBBF24] hover:bg-[#FBBF24]/15' },
                      { label: 'Good', q: 4, cls: 'text-[#2DD4BF] hover:bg-[#2DD4BF]/15' },
                      { label: 'Easy', q: 5, cls: 'text-[#34D399] hover:bg-[#34D399]/15' },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        onClick={() => onRateSM2(item, btn.q)}
                        className={`rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium transition-colors ${btn.cls}`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Explicit Readiness Disclaimer */}
      <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#10121A]/60 px-4 py-3 text-xs text-slate-400">
        <ShieldAlert className="h-4 w-4 shrink-0 text-[#FBBF24]" />
        <span>
          Readiness percentages and mock interview rubrics are estimated preparation diagnostics based on completed problems and spaced repetition history, not guarantees of hiring outcomes.
        </span>
      </div>
    </div>
  );
}
