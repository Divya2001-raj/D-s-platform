import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  BookmarkPlus,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  HelpCircle,
  Layers,
  Loader2,
  Play,
  RotateCcw,
  RotateCw,
  Sparkles,
  Wrench,
  XCircle,
} from 'lucide-react';
import type { KnowledgeQuizItem, KnowledgeTopic, MistakeSourceType, Question } from '../types/platform';
import { getTopicSlug, resolveTopicBySlug, slugifyTopic } from '../data/rounds';
import { loadUserArenaState, saveUserArenaState } from '../lib/firestoreService';

interface KnowledgeHubViewProps {
  userId?: string | null;
  topics: KnowledgeTopic[];
  selectedTopicId: string;
  activeTopicSlug?: string;
  onSelectTopic: (slugOrId: string) => void;
  questions: Question[];
  completedTopics: string[];
  bookmarks: string[];
  onToggleCompleteTopic: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onSelectQuestion: (q: Question) => void;
  onCaptureMistake?: (payload: {
    id: string;
    sourceType: MistakeSourceType;
    questionId?: string;
    topicSlug?: string;
    title: string;
    domain: string;
    reason: string;
  }) => void | Promise<void>;
  onSaveToNotebook: (title: string, content: string, topic: string) => Promise<void>;
  onSaveGeneratedTopic?: (topic: KnowledgeTopic) => Promise<void>;
  onOpenPracticalLab?: () => void;
}

interface McqTopicProgress {
  answers: Record<number, number>;
  customMcqs?: KnowledgeQuizItem[];
}

function formatTimer(secs: number): string {
  const m = Math.floor(Math.max(0, secs) / 60);
  const s = Math.max(0, secs) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function KnowledgeHubView({
  userId = null,
  topics,
  selectedTopicId,
  activeTopicSlug,
  onSelectTopic,
  questions,
  completedTopics,
  bookmarks,
  onToggleCompleteTopic,
  onToggleBookmark,
  onSelectQuestion,
  onCaptureMistake,
  onSaveToNotebook,
  onSaveGeneratedTopic,
  onOpenPracticalLab,
}: KnowledgeHubViewProps) {
  const resolved = useMemo(
    () => resolveTopicBySlug(activeTopicSlug || selectedTopicId || topics[0]?.id || '', topics),
    [activeTopicSlug, selectedTopicId, topics],
  );
  const activeTopic = resolved.topic;

  const [tab, setTab] = useState<'LEARN' | 'MCQs' | 'PRACTISE' | 'INTERVIEW'>('LEARN');
  const [depth, setDepth] = useState<'Foundational' | 'Production' | 'Staff'>('Production');
  const [activeDiagramNodeId, setActiveDiagramNodeId] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [mcqProgressByTopic, setMcqProgressByTopic] = useState<Record<string, McqTopicProgress>>({});
  const [savedToast, setSavedToast] = useState(false);
  const [generatingTopic, setGeneratingTopic] = useState(false);
  const [generatingMcqs, setGeneratingMcqs] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Optional 10:00 Quiz Countdown Timer
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(600);

  // Load persisted MCQ progress + generated MCQs from Firestore / localStorage
  useEffect(() => {
    loadUserArenaState<Record<string, McqTopicProgress>>(userId, '__mcq_progress__', {})
      .then((saved) => {
        if (saved && typeof saved === 'object') {
          setMcqProgressByTopic(saved);
        }
      })
      .catch(() => {});
  }, [userId]);

  // Smooth scroll to top when switching topics cleanly
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setActiveDiagramNodeId(null);
    setFlippedCards({});
    setGenError(null);
  }, [activeTopic?.id, resolved.slug]);

  useEffect(() => {
    if (!timerEnabled) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerEnabled]);

  const persistMcqMap = async (next: Record<string, McqTopicProgress>) => {
    setMcqProgressByTopic(next);
    await saveUserArenaState(userId, '__mcq_progress__', next).catch(() => {});
  };

  const relatedQuestions = useMemo(() => {
    if (activeTopic) {
      const byId = questions.filter((q) => activeTopic.relatedQuestionIds.includes(q.uniqueId));
      if (byId.length > 0) return byId;
      const tSlug = getTopicSlug(activeTopic);
      const byTopic = questions.filter(
        (q) =>
          slugifyTopic(q.topic) === tSlug ||
          q.topic.toLowerCase().includes(activeTopic.domain.toLowerCase()),
      );
      return (byTopic.length > 0 ? byTopic : questions).slice(0, 6);
    }
    const targetSlug = resolved.slug;
    return questions.filter(
      (q) =>
        slugifyTopic(q.topic) === targetSlug ||
        slugifyTopic(q.subtopic) === targetSlug ||
        q.topic.toLowerCase().includes(resolved.displayName.toLowerCase()),
    );
  }, [activeTopic, questions, resolved.slug, resolved.displayName]);

  const activeQuiz: KnowledgeQuizItem[] = useMemo(() => {
    if (!activeTopic) return [];
    const custom = mcqProgressByTopic[activeTopic.id]?.customMcqs || [];
    return [...(activeTopic.quiz || []), ...custom];
  }, [activeTopic, mcqProgressByTopic]);

  const quizAnswers = useMemo(() => {
    if (!activeTopic) return {};
    return mcqProgressByTopic[activeTopic.id]?.answers || {};
  }, [activeTopic, mcqProgressByTopic]);

  const answeredCount = Object.keys(quizAnswers).length;
  const correctCount = activeQuiz.reduce(
    (acc, q, idx) => (quizAnswers[idx] === q.correctIndex ? acc + 1 : acc),
    0,
  );
  const masteryPct = activeQuiz.length > 0 ? Math.round((correctCount / activeQuiz.length) * 100) : 0;

  const handleAnswerMcq = async (qIdx: number, optIdx: number) => {
    if (!activeTopic) return;
    const prevTopic = mcqProgressByTopic[activeTopic.id] || { answers: {} };
    const nextAnswers = { ...prevTopic.answers, [qIdx]: optIdx };
    const nextTopic: McqTopicProgress = {
      ...prevTopic,
      answers: nextAnswers,
    };
    await persistMcqMap({ ...mcqProgressByTopic, [activeTopic.id]: nextTopic });

    const answered = Object.keys(nextAnswers).length;
    if (answered >= Math.min(3, activeQuiz.length) && activeQuiz.length > 0) {
      const correct = activeQuiz.reduce(
        (acc, q, idx) => (nextAnswers[idx] === q.correctIndex ? acc + 1 : acc),
        0,
      );
      const pct = Math.round((correct / answered) * 100);
      if (pct < 80) {
        onCaptureMistake?.({
          id: `mcq_${activeTopic.id}`,
          sourceType: 'mcq_low_score',
          topicSlug: getTopicSlug(activeTopic),
          title: activeTopic.title,
          domain: activeTopic.domain,
          reason: `Scored ${pct}% (${correct}/${answered} answered) on ${activeTopic.title} MCQs.`,
        });
      }
    }
  };

  const handleResetMcqs = async () => {
    if (!activeTopic) return;
    const prevTopic = mcqProgressByTopic[activeTopic.id] || { answers: {} };
    const nextTopic: McqTopicProgress = {
      ...prevTopic,
      answers: {},
    };
    setSecondsLeft(600);
    await persistMcqMap({ ...mcqProgressByTopic, [activeTopic.id]: nextTopic });
  };

  const handleGenerateMoreMcqs = async () => {
    if (!activeTopic) return;
    setGeneratingMcqs(true);
    setGenError(null);
    try {
      const resp = await fetch('/api/ai/generate-mcqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: activeTopic.title,
          domain: activeTopic.domain,
          existingQuestions: activeQuiz.map((q) => q.question),
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !Array.isArray(data.mcqs)) {
        throw new Error(data.error || 'Failed to generate scenario MCQs.');
      }
      const prevTopic = mcqProgressByTopic[activeTopic.id] || { answers: {} };
      const existingCustom = prevTopic.customMcqs || [];
      const nextTopic: McqTopicProgress = {
        ...prevTopic,
        customMcqs: [...existingCustom, ...data.mcqs],
      };
      await persistMcqMap({ ...mcqProgressByTopic, [activeTopic.id]: nextTopic });
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Unable to generate more MCQs right now.');
    } finally {
      setGeneratingMcqs(false);
    }
  };

  const handleGenerateGuide = async () => {
    setGeneratingTopic(true);
    setGenError(null);
    try {
      const domainGuess = relatedQuestions[0]?.domain || 'Data Engineering';
      const resp = await fetch('/api/ai/generate-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicSlug: resolved.slug,
          topicTitle: resolved.displayName,
          domain: domainGuess,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.topic) {
        throw new Error(data.error || 'Failed to generate topic guide.');
      }
      const generated: KnowledgeTopic = {
        ...data.topic,
        slug: resolved.slug,
        relatedQuestionIds: relatedQuestions.slice(0, 8).map((q) => q.uniqueId),
      };
      if (onSaveGeneratedTopic) {
        await onSaveGeneratedTopic(generated);
      }
      onSelectTopic(resolved.slug);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setGeneratingTopic(false);
    }
  };

  const renderSidebar = () => (
    <aside className="glass-surface rounded-[18px] p-4 xl:col-span-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-sm font-bold text-white">3+ YOE Core Syllabus</h2>
        <span className="font-mono text-xs text-slate-400 tabular-nums">
          {completedTopics.length}/{topics.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {topics.map((t) => {
          const active = activeTopic?.id === t.id;
          const done = completedTopics.includes(t.id);
          const topicMcqCount = (t.quiz?.length || 0) + (mcqProgressByTopic[t.id]?.customMcqs?.length || 0);
          const topicAns = mcqProgressByTopic[t.id]?.answers || {};
          const topicCorrect = [...(t.quiz || []), ...(mcqProgressByTopic[t.id]?.customMcqs || [])].reduce(
            (acc, q, idx) => (topicAns[idx] === q.correctIndex ? acc + 1 : acc),
            0,
          );
          return (
            <button
              key={t.id}
              onClick={() => onSelectTopic(getTopicSlug(t))}
              className={`flex w-full items-start justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${
                active
                  ? 'tab-active'
                  : 'border border-transparent text-slate-300 hover:bg-white/5'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-75">
                  <span className="truncate">{t.domain}</span>
                  <span>·</span>
                  <span className="font-mono tabular-nums">
                    {topicCorrect}/{topicMcqCount} MCQs
                  </span>
                </div>
                <div className="mt-0.5 text-xs font-semibold leading-snug">{t.title}</div>
              </div>
              {done && <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#10B981]" />}
            </button>
          );
        })}
      </div>
    </aside>
  );

  if (!activeTopic) {
    return (
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {renderSidebar()}

        <div className="space-y-5 xl:col-span-9">
          <div className="glass-surface rounded-[18px] p-6">
            <div className="font-mono text-xs text-slate-400">/topics/{resolved.slug}</div>
            <h1 className="mt-1.5 font-display text-2xl font-bold text-white">{resolved.displayName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
              No saved DE Concepts &amp; MCQs deep-dive exists for <strong className="text-white">{resolved.displayName}</strong> yet. Generate a complete production deep-dive module (architecture blueprint, configs, flashcards, 8 scenario MCQs with per-option rationales, and interview Q&amp;A) with Gemini.
            </p>

            {genError && (
              <div className="mt-4 rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 p-3 text-xs text-[#EF4444]">
                {genError}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={handleGenerateGuide}
                disabled={generatingTopic}
                className="btn-primary inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 text-xs disabled:opacity-60"
              >
                {generatingTopic ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>
                  {generatingTopic
                    ? 'Generating Deep-Dive + 8 Scenario MCQs...'
                    : 'Generate Deep-Dive Guide & MCQs with Gemini'}
                </span>
              </button>
            </div>
          </div>

          <div className="glass-surface rounded-[18px] p-5">
            <h2 className="mb-3 font-display text-base font-bold text-white">
              Related Hands-On Problems ({relatedQuestions.length})
            </h2>
            {relatedQuestions.length === 0 ? (
              <p className="text-xs text-slate-400">
                Click any pillar in the Core Syllabus on the left or generate the deep-dive guide above.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {relatedQuestions.map((rq) => (
                  <div key={rq.uniqueId} className="flex items-center justify-between gap-3 py-3">
                    <button
                      onClick={() => onSelectQuestion(rq)}
                      className="min-w-0 flex-1 text-left hover:underline"
                    >
                      <div className="truncate text-sm font-medium text-white">{rq.title}</div>
                      <div className="text-xs text-slate-400">
                        {rq.domain} · {rq.difficulty} · {rq.experienceLevel}
                      </div>
                    </button>
                    <a
                      href={`/problem/${encodeURIComponent(rq.uniqueId)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const s = activeTopic.sections;
  const isCompleted = completedTopics.includes(activeTopic.id);
  const isBookmarked = bookmarks.includes(activeTopic.id);
  const selectedNode =
    activeTopic.diagramNodes.find((n) => n.id === activeDiagramNodeId) || activeTopic.diagramNodes[0];

  const handleSaveCheatSheet = async () => {
    const md = `## ${activeTopic.title}\n\n**Official Reference:** ${activeTopic.officialDocRefAndVersion}\n\n### Quick Revision Cheat Sheet\n${s.quickRevisionCheatSheet}\n\n### Interview Q&A\n${s.interviewQaAndFollowups}\n\n### Terminology\n${s.terminology}`;
    await onSaveToNotebook(`Cheat Sheet: ${activeTopic.title}`, md, activeTopic.domain);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
      {/* Column 1: Core Syllabus Explorer */}
      {renderSidebar()}

      {/* Column 2: 4-Mode Interactive Concepts & MCQ Studio */}
      <div className="space-y-5 xl:col-span-6">
        <div className="glass-surface rounded-[18px] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              <span>{activeTopic.domain}</span>
              <span aria-hidden="true"> · </span>
              <span className="font-mono text-white">{activeTopic.officialDocRefAndVersion}</span>
              <span aria-hidden="true"> · </span>
              <span>{activeTopic.estimatedMinutes} min read</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleBookmark(activeTopic.id)}
                className={`btn-secondary rounded-lg p-2 ${
                  isBookmarked ? 'border-[var(--accent-primary)] text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Bookmark topic"
              >
                <Bookmark className="h-4 w-4" />
              </button>
              <button
                onClick={() => onToggleCompleteTopic(activeTopic.id)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isCompleted
                    ? 'tab-active'
                    : 'btn-secondary'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{isCompleted ? 'Completed' : 'Mark Complete'}</span>
              </button>
            </div>
          </div>

          <h1 className="mt-2 font-display text-2xl font-bold text-white">{activeTopic.title}</h1>
          <p className="mt-2 text-sm text-slate-300">{activeTopic.summary}</p>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
            <div className="inset-surface flex flex-wrap rounded-xl p-1">
              {(
                [
                  { id: 'LEARN' as const, label: 'LEARN' },
                  { id: 'MCQs' as const, label: `MCQs (${activeQuiz.length})` },
                  { id: 'PRACTISE' as const, label: 'PRACTISE' },
                  { id: 'INTERVIEW' as const, label: 'INTERVIEW' },
                ]
              ).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setTab(mode.id)}
                  className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    tab === mode.id
                      ? 'tab-active'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {tab === 'LEARN' && (
              <div className="inset-surface flex rounded-xl p-1 text-xs">
                {(['Foundational', 'Production', 'Staff'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDepth(d)}
                    className={`rounded-lg px-3 py-1 font-medium transition-colors ${
                      depth === d ? 'tab-active' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {tab === 'LEARN' && (
          <div className="space-y-4">
            {/* Interactive Architecture Diagram */}
            <div className="glass-surface rounded-[18px] p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Layers className="h-4 w-4 text-white" />
                  <span>Interactive Architecture Blueprint</span>
                </div>
                <span className="text-xs text-slate-400">Click any node to inspect internals</span>
              </div>

              <div className="inset-surface flex flex-wrap items-center gap-2 overflow-x-auto rounded-xl p-4">
                {activeTopic.diagramNodes.map((node, idx) => (
                  <React.Fragment key={node.id}>
                    <button
                      onClick={() => setActiveDiagramNodeId(node.id)}
                      className={`rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                        selectedNode?.id === node.id
                          ? 'tab-active border-transparent'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-slate-300 hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="font-mono text-[10px] opacity-75">{node.layer}</div>
                      <div className="whitespace-nowrap text-xs font-semibold">{node.label}</div>
                    </button>
                    {idx < activeTopic.diagramNodes.length - 1 && (
                      <div className="flex flex-col items-center px-1 text-slate-400">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {selectedNode && (
                <div className="inset-surface mt-3 rounded-xl px-4 py-3 text-xs text-slate-300">
                  <span className="font-semibold text-white">{selectedNode.label}:</span> {selectedNode.detail}
                </div>
              )}
            </div>

            {/* Deep-Dive Sections Filtered by Depth Toggle */}
            <div className="glass-surface divide-y divide-[var(--border-subtle)] rounded-[18px]">
              {[
                { title: 'Definition & Core Purpose', body: `${s.introAndDefinition}\n\n${s.whyItExists}`, tier: 'Foundational' },
                { title: 'Problems Solved & Principles', body: `${s.problemsSolved}\n\n${s.underlyingPrinciples}`, tier: 'Foundational' },
                { title: 'Architecture & Internal Working', body: `${s.architectureAndComponents}\n\n${s.internalWorking}\n\nExecution Flow: ${s.executionFlow}`, tier: 'Production' },
                { title: 'Production Implementation & Config', body: s.productionImplementation, code: s.codeAndConfigExamples, tier: 'Production' },
                { title: 'Step-by-Step Guide & Expected Outputs', body: `${s.stepByStepGuide}\n\nExpected Outcome: ${s.expectedOutputs}`, tier: 'Production' },
                { title: 'Best Practices & Common Mistakes', body: `Best Practices: ${s.bestPractices}\n\nCommon Mistakes: ${s.commonMistakes}`, tier: 'Production' },
                { title: 'Performance, Scalability & FinOps Cost', body: `${s.performanceScalabilityCost}\n\nTech Comparisons: ${s.techComparisons}`, tier: 'Staff' },
                { title: 'Troubleshooting & Advanced Staff Concepts', body: `Troubleshooting: ${s.troubleshooting}\n\nProduction Challenges: ${s.productionChallenges}\n\nAdvanced: ${s.advancedConcepts}`, tier: 'Staff' },
              ]
                .filter((sec) => {
                  if (depth === 'Foundational') return sec.tier === 'Foundational';
                  if (depth === 'Production') return sec.tier !== 'Staff';
                  return true;
                })
                .map((sec) => (
                  <div key={sec.title} className="p-5">
                    <h3 className="font-display text-sm font-bold text-white">{sec.title}</h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-300">{sec.body}</p>
                    {sec.code && (
                      <pre className="inset-surface mt-3 overflow-x-auto rounded-xl p-3.5 font-mono text-xs text-slate-200">
                        {sec.code}
                      </pre>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {tab === 'MCQs' && (
          <div className="space-y-4">
            {/* MCQ Mastery Bar & Controls */}
            <div className="glass-surface rounded-[18px] p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-display text-base font-bold text-white">
                    <HelpCircle className="h-4 w-4 text-white" />
                    <span>3+ YOE Scenario MCQ Bank</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Realistic production debugging &amp; trade-off scenarios with instant per-option rationales
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!timerEnabled) setSecondsLeft(600);
                      setTimerEnabled((v) => !v);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-xs tabular-nums ${
                      timerEnabled
                        ? 'tab-active border-transparent'
                        : 'btn-secondary'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>{timerEnabled ? formatTimer(secondsLeft) : 'Start 10:00 Timer'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetMcqs}
                    className="btn-secondary inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs"
                    title="Reset quiz answers"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateMoreMcqs}
                    disabled={generatingMcqs}
                    className="btn-primary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs disabled:opacity-60"
                  >
                    {generatingMcqs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    <span>Generate More MCQs (+5)</span>
                  </button>
                </div>
              </div>

              {genError && (
                <div className="rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 p-2.5 text-xs text-[#EF4444]">
                  {genError}
                </div>
              )}

              {/* Topic Mastery Progress */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between font-mono text-xs tabular-nums">
                  <span className="text-slate-300">
                    Answered: {answeredCount}/{activeQuiz.length} · Correct: {correctCount}/{activeQuiz.length}
                  </span>
                  <span className="font-bold text-white">{masteryPct}% Mastery</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent-primary)] transition-all"
                    style={{ width: `${masteryPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Scenario MCQ Cards */}
            <div className="space-y-3">
              {activeQuiz.map((q, qIdx) => {
                const chosen = quizAnswers[qIdx];
                const isAnswered = chosen !== undefined;
                const isUserCorrect = chosen === q.correctIndex;
                return (
                  <div key={qIdx} className="glass-surface rounded-[18px] p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold leading-snug text-white">
                        <span className="mr-2 font-mono text-xs text-slate-400">Q{qIdx + 1}.</span>
                        {q.question}
                      </p>
                      {isAnswered && (
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 font-mono text-[10px] font-bold ${
                            isUserCorrect
                              ? 'bg-[#10B981]/15 text-[#10B981]'
                              : 'bg-[#EF4444]/15 text-[#EF4444]'
                          }`}
                        >
                          {isUserCorrect ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {isUserCorrect ? 'PASS' : 'FAIL'}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {q.options.map((opt, oIdx) => {
                        const isPicked = chosen === oIdx;
                        const isRight = q.correctIndex === oIdx;
                        let style = 'inset-surface text-slate-200 hover:border-[var(--border-strong)]';
                        if (isAnswered) {
                          if (isRight) style = 'border-[#10B981]/60 bg-[#10B981]/12 text-[#10B981]';
                          else if (isPicked) style = 'border-[#EF4444]/60 bg-[#EF4444]/12 text-[#EF4444]';
                        }
                        const rationale = q.optionRationales?.[oIdx];
                        return (
                          <div key={oIdx} className="space-y-1">
                            <button
                              onClick={() => handleAnswerMcq(qIdx, oIdx)}
                              className={`flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-xs transition-colors ${style}`}
                            >
                              <span className="mt-0.5 font-mono font-bold opacity-80">
                                {String.fromCharCode(65 + oIdx)}.
                              </span>
                              <span className="flex-1">{opt}</span>
                            </button>
                            {isAnswered && rationale && (isRight || isPicked) && (
                              <div className="inset-surface ml-6 rounded-lg px-3 py-1.5 text-[11px] text-slate-300">
                                <span className="font-mono font-semibold text-white">
                                  {isRight ? 'Why Correct: ' : 'Why Not This Option: '}
                                </span>
                                {rationale}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {isAnswered && (
                      <div className="inset-surface rounded-xl p-3 text-xs leading-relaxed text-slate-300">
                        <span className="font-semibold text-white">Key Takeaway: </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'PRACTISE' && (
          <div className="space-y-4">
            {/* 3D-Flip Flashcards */}
            <div className="glass-surface rounded-[18px] p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-white">3D Active-Recall Flashcards</h3>
                <span className="text-xs text-slate-400">Click card to flip</span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {activeTopic.flashcards.map((fc, idx) => {
                  const flipped = !!flippedCards[idx];
                  return (
                    <button
                      key={idx}
                      onClick={() => setFlippedCards((p) => ({ ...p, [idx]: !p[idx] }))}
                      className="perspective-1000 h-44 w-full text-left"
                    >
                      <div
                        className={`transform-style-3d relative h-full w-full transition-transform duration-500 ${
                          flipped ? 'rotate-y-180' : ''
                        }`}
                      >
                        <div className="backface-hidden inset-surface absolute inset-0 flex flex-col justify-between rounded-xl p-4">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Prompt #{idx + 1}</span>
                            <RotateCw className="h-3.5 w-3.5" />
                          </div>
                          <p className="text-sm font-medium text-white">{fc.front}</p>
                          <span className="text-[11px] text-slate-400">Tap to reveal engineering answer</span>
                        </div>
                        <div className="backface-hidden rotate-y-180 inset-surface absolute inset-0 flex flex-col justify-between rounded-xl border border-[var(--accent-primary)] p-4">
                          <span className="text-xs font-semibold text-white">Answer</span>
                          <p className="text-xs leading-relaxed text-slate-200">{fc.back}</p>
                          <span className="text-[11px] text-slate-400">Tap to flip back</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {onOpenPracticalLab && (
              <div className="glass-surface flex flex-wrap items-center justify-between gap-3 rounded-[18px] p-5">
                <div>
                  <h3 className="font-display text-sm font-bold text-white">
                    Hands-On Production Pipeline Labs
                  </h3>
                  <p className="text-xs text-slate-400">
                    Apply these concepts in Snowflake, Multi-Cloud AWS/Azure/GCP, dbt/PySpark/Flink, Batch &amp; Streaming assignments.
                  </p>
                </div>
                <button
                  onClick={onOpenPracticalLab}
                  className="btn-primary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-xs"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>Open Practical Assignments Lab</span>
                </button>
              </div>
            )}

            {/* Related Hands-On Company Loop Problems */}
            <div className="glass-surface rounded-[18px] p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-white">
                  Company Interview Coding Problems ({relatedQuestions.length})
                </h3>
                <button
                  onClick={() => setTab('MCQs')}
                  className="text-xs font-semibold text-white underline-offset-4 hover:underline"
                >
                  Practice {activeQuiz.length} Scenario MCQs →
                </button>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {relatedQuestions.map((rq) => (
                  <button
                    key={rq.uniqueId}
                    onClick={() => onSelectQuestion(rq)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-3 text-left hover:bg-white/[0.03]"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">{rq.title}</div>
                      <div className="text-xs text-slate-400">
                        {rq.domain} · {rq.difficulty} · {rq.companyTags.slice(0, 3).join(', ')}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'INTERVIEW' && (
          <div className="glass-surface divide-y divide-[var(--border-subtle)] rounded-[18px]">
            <div className="p-5">
              <h3 className="font-display text-sm font-bold text-white">Tier-1 Interview Q&amp;A &amp; Follow-Ups</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-300">
                {s.interviewQaAndFollowups}
              </p>
            </div>
            <div className="p-5">
              <h3 className="font-display text-sm font-bold text-white">Company-Specific Expectations</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{s.companySpecificNotes}</p>
            </div>
            <div className="p-5">
              <h3 className="font-display text-sm font-bold text-white">Industry Use Cases &amp; Trade-Offs</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {s.industryUseCases} — {s.advantagesLimitations}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Column 3: Quick Revision, Notebook Export & Related Concepts */}
      <aside className="space-y-4 xl:col-span-3">
        <div className="glass-surface rounded-[18px] p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <BookOpen className="h-4 w-4 text-white" />
            <span>Quick Revision Cheat Sheet</span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-300">{s.quickRevisionCheatSheet}</p>
          <button
            onClick={handleSaveCheatSheet}
            className="btn-secondary mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold"
          >
            {savedToast ? <Check className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
            <span>{savedToast ? 'Saved to Notebook' : 'Save Cheat Sheet to Notebook'}</span>
          </button>
        </div>

        <div className="glass-surface rounded-[18px] p-5 space-y-2.5">
          <h3 className="font-display text-sm font-bold text-white">Core Terminology</h3>
          <p className="text-xs leading-relaxed text-slate-400">{s.terminology}</p>
        </div>

        <div className="glass-surface rounded-[18px] p-5 space-y-2.5">
          <h3 className="font-display text-sm font-bold text-white">Explore Connected Pillars</h3>
          <div className="flex flex-wrap gap-1.5">
            {topics
              .filter((t) => t.id !== activeTopic.id)
              .slice(0, 6)
              .map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelectTopic(getTopicSlug(t))}
                  className="btn-secondary rounded-lg px-2.5 py-1 text-[11px] font-medium"
                >
                  {t.domain}
                </button>
              ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
