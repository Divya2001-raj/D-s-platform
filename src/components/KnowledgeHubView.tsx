import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  BookmarkPlus,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Layers,
  RotateCw,
} from 'lucide-react';
import type { KnowledgeTopic, Question } from '../types/platform';

interface KnowledgeHubViewProps {
  topics: KnowledgeTopic[];
  selectedTopicId: string;
  onSelectTopic: (id: string) => void;
  questions: Question[];
  completedTopics: string[];
  bookmarks: string[];
  onToggleCompleteTopic: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onSelectQuestion: (q: Question) => void;
  onSaveToNotebook: (title: string, content: string, topic: string) => Promise<void>;
}

export function KnowledgeHubView({
  topics,
  selectedTopicId,
  onSelectTopic,
  questions,
  completedTopics,
  bookmarks,
  onToggleCompleteTopic,
  onToggleBookmark,
  onSelectQuestion,
  onSaveToNotebook,
}: KnowledgeHubViewProps) {
  const activeTopic = topics.find((t) => t.id === selectedTopicId) || topics[0];
  const [tab, setTab] = useState<'LEARN' | 'PRACTISE' | 'INTERVIEW'>('LEARN');
  const [depth, setDepth] = useState<'Foundational' | 'Production' | 'Staff'>('Production');
  const [activeDiagramNodeId, setActiveDiagramNodeId] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [savedToast, setSavedToast] = useState(false);

  const relatedQuestions = useMemo(() => {
    if (!activeTopic) return [];
    const byId = questions.filter((q) => activeTopic.relatedQuestionIds.includes(q.uniqueId));
    if (byId.length > 0) return byId;
    return questions.slice(0, 4);
  }, [activeTopic, questions]);

  if (!activeTopic) return null;

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
      {/* Column 1: Syllabus Explorer */}
      <aside className="glass-surface rounded-2xl p-4 xl:col-span-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-white">Autonomous Syllabus</h2>
          <span className="font-mono text-xs text-[#2DD4BF] tabular-nums">
            {completedTopics.length}/{topics.length}
          </span>
        </div>
        <div className="space-y-1.5">
          {topics.map((t) => {
            const active = t.id === activeTopic.id;
            const done = completedTopics.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => {
                  onSelectTopic(t.id);
                  setActiveDiagramNodeId(null);
                  setFlippedCards({});
                  setQuizAnswers({});
                }}
                className={`flex w-full items-start justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  active ? 'bg-[#2DD4BF]/12 text-white border border-[#2DD4BF]/30' : 'text-slate-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-400">{t.domain}</div>
                  <div className="mt-0.5 text-xs font-semibold leading-snug">{t.title}</div>
                </div>
                {done && <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#34D399]" />}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Column 2: Main 3-Mode Technical Documentation */}
      <div className="space-y-5 xl:col-span-6">
        <div className="glass-surface rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              <span>{activeTopic.domain}</span>
              <span aria-hidden="true"> · </span>
              <span className="font-mono text-[#2DD4BF]">{activeTopic.officialDocRefAndVersion}</span>
              <span aria-hidden="true"> · </span>
              <span>{activeTopic.estimatedMinutes} min read</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleBookmark(activeTopic.id)}
                className={`rounded-lg border border-white/10 p-2 ${
                  isBookmarked ? 'border-[#FBBF24]/50 text-[#FBBF24]' : 'text-slate-400 hover:text-white'
                }`}
                title="Bookmark topic"
              >
                <Bookmark className="h-4 w-4" />
              </button>
              <button
                onClick={() => onToggleCompleteTopic(activeTopic.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isCompleted
                    ? 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30'
                    : 'bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{isCompleted ? 'Completed' : 'Mark Complete'}</span>
              </button>
            </div>
          </div>

          <h1 className="mt-2 font-display text-2xl font-bold text-white">{activeTopic.title}</h1>
          <p className="mt-2 text-sm text-slate-300">{activeTopic.summary}</p>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div className="flex rounded-xl border border-white/10 bg-[#07080C] p-1">
              {(['LEARN', 'PRACTISE', 'INTERVIEW'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setTab(mode)}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                    tab === mode
                      ? 'bg-gradient-to-r from-[#2DD4BF] to-[#818CF8] text-[#07080C]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {tab === 'LEARN' && (
              <div className="flex rounded-xl border border-white/10 bg-[#07080C] p-1 text-xs">
                {(['Foundational', 'Production', 'Staff'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDepth(d)}
                    className={`rounded-lg px-3 py-1 font-medium transition-colors ${
                      depth === d ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
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
            <div className="glass-surface rounded-2xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Layers className="h-4 w-4 text-[#2DD4BF]" />
                  <span>Interactive Architecture Blueprint</span>
                </div>
                <span className="text-xs text-slate-400">Click any node to inspect internals</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 overflow-x-auto rounded-xl border border-white/10 bg-[#07080C]/90 p-4">
                {activeTopic.diagramNodes.map((node, idx) => (
                  <React.Fragment key={node.id}>
                    <button
                      onClick={() => setActiveDiagramNodeId(node.id)}
                      className={`rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                        selectedNode?.id === node.id
                          ? 'border-[#2DD4BF] bg-[#2DD4BF]/15 text-white'
                          : 'border-white/10 bg-[#10121A] text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <div className="font-mono text-[10px] text-[#818CF8]">{node.layer}</div>
                      <div className="text-xs font-semibold whitespace-nowrap">{node.label}</div>
                    </button>
                    {idx < activeTopic.diagramNodes.length - 1 && (
                      <div className="flex flex-col items-center px-1 text-slate-500">
                        <ChevronRight className="h-4 w-4 text-[#2DD4BF]" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {selectedNode && (
                <div className="mt-3 rounded-xl border border-white/10 bg-[#07080C]/70 px-4 py-3 text-xs text-slate-300">
                  <span className="font-semibold text-[#2DD4BF]">{selectedNode.label}:</span> {selectedNode.detail}
                </div>
              )}
            </div>

            {/* Deep-Dive Sections Filtered by Depth Toggle */}
            <div className="glass-surface divide-y divide-white/[0.06] rounded-2xl">
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
                      <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-[#07080C] p-3.5 font-mono text-xs text-[#2DD4BF]">
                        {sec.code}
                      </pre>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {tab === 'PRACTISE' && (
          <div className="space-y-4">
            {/* 3D-Flip Flashcards */}
            <div className="glass-surface rounded-2xl p-5">
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
                        <div className="backface-hidden absolute inset-0 flex flex-col justify-between rounded-xl border border-white/10 bg-[#07080C] p-4">
                          <div className="flex items-center justify-between text-xs text-[#2DD4BF]">
                            <span>Prompt #{idx + 1}</span>
                            <RotateCw className="h-3.5 w-3.5" />
                          </div>
                          <p className="text-sm font-medium text-white">{fc.front}</p>
                          <span className="text-[11px] text-slate-500">Tap to reveal engineering answer</span>
                        </div>
                        <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col justify-between rounded-xl border border-[#2DD4BF]/40 bg-[#10121A] p-4">
                          <span className="text-xs font-semibold text-[#34D399]">Answer</span>
                          <p className="text-xs leading-relaxed text-slate-200">{fc.back}</p>
                          <span className="text-[11px] text-slate-500">Tap to flip back</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Topic Quiz */}
            <div className="glass-surface rounded-2xl p-5 space-y-4">
              <h3 className="font-display text-base font-bold text-white">Knowledge Verification Quiz</h3>
              {activeTopic.quiz.map((q, qIdx) => {
                const chosen = quizAnswers[qIdx];
                return (
                  <div key={qIdx} className="rounded-xl border border-white/10 bg-[#07080C]/70 p-4">
                    <p className="text-sm font-medium text-white">{q.question}</p>
                    <div className="mt-3 space-y-2">
                      {q.options.map((opt, oIdx) => {
                        const isPicked = chosen === oIdx;
                        const isRight = q.correctIndex === oIdx;
                        let style = 'border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/5';
                        if (chosen !== undefined) {
                          if (isRight) style = 'border-[#34D399]/60 bg-[#34D399]/10 text-[#34D399]';
                          else if (isPicked) style = 'border-[#FB7185]/60 bg-[#FB7185]/10 text-[#FB7185]';
                        }
                        return (
                          <button
                            key={oIdx}
                            onClick={() => setQuizAnswers((p) => ({ ...p, [qIdx]: oIdx }))}
                            className={`block w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ${style}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {chosen !== undefined && (
                      <p className="mt-2.5 text-xs text-slate-400">{q.explanation}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Related Hands-On Problems */}
            <div className="glass-surface rounded-2xl p-5">
              <h3 className="mb-3 font-display text-base font-bold text-white">Practice Problems for This Module</h3>
              <div className="divide-y divide-white/[0.06]">
                {relatedQuestions.map((rq) => (
                  <button
                    key={rq.uniqueId}
                    onClick={() => onSelectQuestion(rq)}
                    className="flex w-full items-center justify-between py-3 text-left hover:bg-white/[0.02] px-2 rounded-lg"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">{rq.title}</div>
                      <div className="text-xs text-slate-400">
                        {rq.domain} · {rq.difficulty}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'INTERVIEW' && (
          <div className="glass-surface divide-y divide-white/[0.06] rounded-2xl">
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

      {/* Column 3: Quick Revision & Notebook Export */}
      <aside className="space-y-4 xl:col-span-3">
        <div className="glass-surface rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <BookOpen className="h-4 w-4 text-[#A78BFA]" />
            <span>Quick Revision Cheat Sheet</span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-300">{s.quickRevisionCheatSheet}</p>
          <button
            onClick={handleSaveCheatSheet}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#2DD4BF]/40 bg-[#2DD4BF]/10 py-2 text-xs font-semibold text-[#2DD4BF] transition-colors hover:bg-[#2DD4BF]/20"
          >
            {savedToast ? <Check className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
            <span>{savedToast ? 'Saved to Notebook' : 'Save Cheat Sheet to Notebook'}</span>
          </button>
        </div>

        <div className="glass-surface rounded-2xl p-5">
          <h3 className="font-display text-sm font-bold text-white">Core Terminology</h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{s.terminology}</p>
        </div>
      </aside>
    </div>
  );
}
