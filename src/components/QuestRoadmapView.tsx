import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Compass,
  ExternalLink,
  Flame,
  Lock,
  Play,
  Sparkles,
  Unlock,
} from 'lucide-react';
import type { ExperienceTier, Question } from '../types/platform';
import { getQuestionRound, INTERVIEW_ROUNDS } from '../data/rounds';
import { loadUserArenaState, saveUserArenaState } from '../lib/firestoreService';

interface QuestRoadmapViewProps {
  userId: string | null;
  questions: Question[];
  solvedIds: string[];
  experienceTier: ExperienceTier;
  freeRoam?: boolean;
  onToggleFreeRoam?: () => void;
  onSelectQuestion: (q: Question) => void;
  onSelectRound: (roundSlug: string) => void;
  onSelectTopic?: (topicNameOrId: string) => void;
}

interface QuestPersistedState {
  freeRoam: boolean;
}

function getXpValue(q: Question): number {
  if (q.xpReward) return q.xpReward;
  if (q.difficulty === 'Hard') return 400;
  if (q.difficulty === 'Medium') return 250;
  return 150;
}

function getRankTitle(xp: number): { rank: string; nextRankXp: number } {
  if (xp < 1000) return { rank: 'L3 Associate Data Engineer', nextRankXp: 1000 };
  if (xp < 3000) return { rank: 'L4 Data Engineer II', nextRankXp: 3000 };
  if (xp < 6500) return { rank: 'L5 Senior Data Engineer', nextRankXp: 6500 };
  if (xp < 12000) return { rank: 'L6 Staff Data Engineer', nextRankXp: 12000 };
  return { rank: 'L7 Principal Data Architect', nextRankXp: 25000 };
}

export function QuestRoadmapView({
  userId,
  questions,
  solvedIds,
  experienceTier,
  freeRoam: controlledFreeRoam,
  onToggleFreeRoam,
  onSelectQuestion,
  onSelectRound,
  onSelectTopic,
}: QuestRoadmapViewProps) {
  const [localFreeRoam, setLocalFreeRoam] = useState(false);
  const freeRoam = controlledFreeRoam !== undefined ? controlledFreeRoam : localFreeRoam;

  useEffect(() => {
    if (controlledFreeRoam !== undefined) return;
    loadUserArenaState<QuestPersistedState>(userId, '__quest_state__', { freeRoam: false })
      .then((st) => {
        if (typeof st?.freeRoam === 'boolean') setLocalFreeRoam(st.freeRoam);
      })
      .catch(() => {});
  }, [userId, controlledFreeRoam]);

  const toggleFreeRoam = async () => {
    if (onToggleFreeRoam) {
      onToggleFreeRoam();
      return;
    }
    const next = !localFreeRoam;
    setLocalFreeRoam(next);
    await saveUserArenaState(userId, '__quest_state__', { freeRoam: next });
  };

  const solvedSet = useMemo(() => new Set(solvedIds), [solvedIds]);

  const earnedXp = useMemo(
    () =>
      questions
        .filter((q) => solvedSet.has(q.uniqueId))
        .reduce((acc, q) => acc + getXpValue(q), 0),
    [questions, solvedSet],
  );

  const rankInfo = getRankTitle(earnedXp);
  const rankPct = Math.min(100, Math.round((earnedXp / rankInfo.nextRankXp) * 100));

  const stages = useMemo(() => {
    const byRound = INTERVIEW_ROUNDS.map((roundMeta) => {
      const stageQuestions = questions.filter((q) => getQuestionRound(q) === roundMeta.roundNumber);
      const solvedCount = stageQuestions.filter((q) => solvedSet.has(q.uniqueId)).length;
      const cleared = stageQuestions.length === 0 ? true : solvedCount >= Math.min(2, stageQuestions.length) || solvedCount / stageQuestions.length >= 0.5;
      return {
        meta: roundMeta,
        questions: stageQuestions,
        solvedCount,
        cleared,
      };
    });

    return byRound.map((stage, idx) => {
      const prevCleared = idx === 0 ? true : byRound[idx - 1].cleared;
      const unlocked = freeRoam || idx === 0 || prevCleared || stage.solvedCount > 0;
      return {
        ...stage,
        unlocked,
      };
    });
  }, [questions, solvedSet, freeRoam]);

  const dailyQuest = useMemo(() => {
    const unsolved = questions.filter((q) => !solvedSet.has(q.uniqueId));
    const tierPool = unsolved.filter((q) => q.experienceLevel === experienceTier);
    const pool = tierPool.length > 0 ? tierPool : unsolved.length > 0 ? unsolved : questions;
    if (pool.length === 0) return null;
    const daySeed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, '')) || 1;
    return pool[daySeed % pool.length];
  }, [questions, solvedSet, experienceTier]);

  const nextRecommendedQuest = useMemo(() => {
    for (const st of stages) {
      if (!st.unlocked) continue;
      const firstUnsolved = st.questions.find((q) => !solvedSet.has(q.uniqueId));
      if (firstUnsolved) return { stage: st.meta, question: firstUnsolved };
    }
    return questions[0] ? { stage: INTERVIEW_ROUNDS[0], question: questions[0] } : null;
  }, [stages, solvedSet, questions]);

  return (
    <div className="space-y-6">
      {/* Quest Progression Header & XP Bar */}
      <div className="glass-surface rounded-2xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Compass className="h-4 w-4 text-white" />
              <span>ORDERED TIER-1 QUEST PROGRESSION · ROUNDS 1 → 8</span>
            </div>
            <h1 className="mt-1.5 font-display text-2xl font-bold text-white">
              Data Engineer 360 Quest Roadmap
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Clear at least 2 problems (or 50%) in each Interview Round to unlock the next stage — or toggle Free Roam to jump straight to any round.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={toggleFreeRoam}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                freeRoam ? 'tab-active' : 'btn-secondary'
              }`}
            >
              {freeRoam ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              <span>{freeRoam ? 'Free Roam: All Unlocked' : 'Unlock All (Free Roam)'}</span>
            </button>

            {nextRecommendedQuest && (
              <button
                onClick={() => onSelectQuestion(nextRecommendedQuest.question)}
                className="btn-luminous inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Resume Active Quest</span>
              </button>
            )}
          </div>
        </div>

        {/* XP Progress Meter */}
        <div className="inset-surface mt-5 rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-[#A78BFA]" />
              <span className="font-display font-bold text-white">{rankInfo.rank}</span>
            </div>
            <div className="font-mono text-xs font-bold text-white tabular-nums">
              {earnedXp.toLocaleString()} XP / {rankInfo.nextRankXp.toLocaleString()} XP
            </div>
          </div>
          <div className="mt-2.5 h-3 w-full overflow-hidden rounded-full bg-[var(--bg-track)]">
            <div
              className="gradient-luminous h-full rounded-full transition-all"
              style={{ width: `${Math.max(4, rankPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Daily Tier-1 Quest Spotlight */}
      {dailyQuest && (
        <div className="glass-surface flex flex-col gap-4 rounded-2xl border-[var(--border-strong)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Flame className="h-4 w-4 text-white" />
              <span>DAILY TIER-1 QUEST CHALLENGE · +{getXpValue(dailyQuest)} XP</span>
            </div>
            <h2 className="mt-1 truncate font-display text-lg font-bold text-white">{dailyQuest.title}</h2>
            <p className="mt-0.5 truncate text-xs text-slate-400">
              {dailyQuest.askedContext || dailyQuest.sourceReference} · {dailyQuest.difficulty} · {dailyQuest.companyTags.slice(0, 3).join(', ')}
            </p>
          </div>
          <button
            onClick={() => onSelectQuestion(dailyQuest)}
            className="btn-primary inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Launch Daily Quest</span>
          </button>
        </div>
      )}

      {/* Sequential 8-Stage Quest Map */}
      <div className="space-y-4">
        {stages.map((stage) => {
          const pct = stage.questions.length
            ? Math.round((stage.solvedCount / stage.questions.length) * 100)
            : 0;
          return (
            <div
              key={stage.meta.roundNumber}
              className={`glass-surface overflow-hidden rounded-2xl ${!stage.unlocked ? 'opacity-75' : ''}`}
            >
              <div className="flex flex-col gap-3 border-b border-white/[0.08] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-white">
                      STAGE {stage.meta.roundNumber} OF 8
                    </span>
                    <span aria-hidden="true">·</span>
                    {stage.unlocked ? (
                      <span className="font-mono text-slate-300">
                        {stage.cleared ? 'Stage Cleared' : 'Unlocked'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono text-slate-400">
                        <Lock className="h-3 w-3" />
                        Clear 2 quests in Stage {stage.meta.roundNumber - 1} to unlock
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 font-display text-lg font-bold text-white">{stage.meta.title}</h3>
                  <p className="text-xs text-slate-400">{stage.meta.subtitle}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right font-mono text-xs tabular-nums">
                    <div className="font-bold text-white">
                      {stage.solvedCount} / {stage.questions.length}
                    </div>
                    <div className="text-[11px] text-slate-400">{pct}% cleared</div>
                  </div>
                  <button
                    onClick={() => onSelectRound(stage.meta.slug)}
                    className="btn-secondary inline-flex items-center gap-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium"
                  >
                    <span>Open Full Round</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* First 6 Quests per Stage as interactive stepping stones */}
              <div className="grid grid-cols-1 gap-2.5 p-4 md:grid-cols-2 xl:grid-cols-3">
                {stage.questions.slice(0, 6).map((q) => {
                  const done = solvedSet.has(q.uniqueId);
                  const xp = getXpValue(q);
                  return (
                    <div
                      key={q.uniqueId}
                      className={`inset-surface flex flex-col justify-between rounded-xl p-3.5 transition-colors ${
                        done
                          ? 'border-[var(--border-strong)]'
                          : stage.unlocked
                            ? 'hover:border-[var(--border-strong)]'
                            : 'opacity-65'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-mono font-semibold text-slate-300">+{xp} XP</span>
                          <span
                            className={`font-mono ${
                              q.difficulty === 'Hard'
                                ? 'font-bold text-white'
                                : q.difficulty === 'Medium'
                                  ? 'text-slate-300'
                                  : 'text-slate-400'
                            }`}
                          >
                            {q.difficulty}
                          </span>
                        </div>
                        <div className="mt-1.5 line-clamp-1 text-xs font-bold text-white">{q.title}</div>
                        <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                          {q.askedContext || q.companyTags.slice(0, 2).join(', ') || q.topic}
                        </div>
                        {onSelectTopic && (
                          <button
                            type="button"
                            onClick={() => onSelectTopic(q.topic)}
                            className="btn-secondary mt-1.5 inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-[10px] font-medium"
                          >
                            {q.topic}
                          </button>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5">
                        <button
                          disabled={!stage.unlocked}
                          onClick={() => onSelectQuestion(q)}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            done
                              ? 'text-white'
                              : stage.unlocked
                                ? 'text-white hover:underline'
                                : 'cursor-not-allowed text-slate-500'
                          }`}
                        >
                          {done ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Solved · Review</span>
                            </>
                          ) : stage.unlocked ? (
                            <>
                              <Play className="h-3.5 w-3.5" />
                              <span>Start Quest</span>
                            </>
                          ) : (
                            <>
                              <Lock className="h-3.5 w-3.5" />
                              <span>Locked</span>
                            </>
                          )}
                        </button>

                        {stage.unlocked && (
                          <a
                            href={`/problem/${encodeURIComponent(q.uniqueId)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in New Tab"
                            className="text-slate-400 hover:text-white"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
