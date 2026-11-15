import React, { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bookmark,
  BrainCircuit,
  Bug,
  CheckCircle2,
  ExternalLink,
  Eye,
  Loader2,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  X,
  XCircle,
} from 'lucide-react';
import type { ExperienceTier, MistakeSourceType, Question } from '../types/platform';
import { executePythonInWorker, type PythonExecutionResponse } from '../lib/pythonEngine';
import { fuzzPythonSolution, type AdversarialFuzzReport } from '../lib/codeFuzzer';
import { GenerateBatchButton } from './GenerateBatchButton';
import { useTheme } from '../lib/themeContext';

interface PythonArenaViewProps {
  mode: 'python' | 'labs';
  questions: Question[];
  selectedQuestion: Question | null;
  onSelectQuestion: (q: Question) => void;
  solvedIds: string[];
  bookmarks: string[];
  experienceTier: ExperienceTier;
  onMarkSolved: (q: Question, code: string, runtimeMs: number) => void;
  onCaptureMistake?: (payload: {
    id: string;
    sourceType: MistakeSourceType;
    questionId?: string;
    topicSlug?: string;
    title: string;
    domain: string;
    reason: string;
  }) => void | Promise<void>;
  onToggleBookmark: (id: string) => void;
  onScheduleSM2: (q: Question) => void;
  onAddGeneratedQuestions: (qs: Question[]) => Promise<void>;
  onContextUpdate: (code: string, errorOutput: string) => void;
  onOpenCopilotWithPrompt: () => void;
}

export function PythonArenaView({
  mode,
  questions,
  selectedQuestion,
  onSelectQuestion,
  solvedIds,
  bookmarks,
  experienceTier,
  onMarkSolved,
  onCaptureMistake,
  onToggleBookmark,
  onScheduleSM2,
  onAddGeneratedQuestions,
  onContextUpdate,
  onOpenCopilotWithPrompt,
}: PythonArenaViewProps) {
  const { isDark } = useTheme();
  const pool = useMemo(() => {
    if (mode === 'labs') {
      return questions.filter(
        (q) => q.domain === 'Engineering Labs' || q.domain === 'PySpark & Distributed',
      );
    }
    return questions.filter((q) => q.domain === 'Python & DSA');
  }, [questions, mode]);

  const activeQ =
    selectedQuestion && pool.some((q) => q.uniqueId === selectedQuestion.uniqueId)
      ? selectedQuestion
      : pool[0];

  const [code, setCode] = useState(activeQ?.starterCode || '');
  const [leftTab, setLeftTab] = useState<'problem' | 'solution'>('problem');
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [solutionUnlocked, setSolutionUnlocked] = useState(false);
  const [running, setRunning] = useState(false);
  const [fuzzing, setFuzzing] = useState(false);
  const [fuzzReport, setFuzzReport] = useState<AdversarialFuzzReport | null>(null);
  const [result, setResult] = useState<PythonExecutionResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (activeQ) {
      setCode(activeQ.starterCode);
      setResult(null);
      setFuzzReport(null);
      setLeftTab('problem');
      setConfirmReveal(false);
      setSolutionUnlocked(false);
      onContextUpdate(activeQ.starterCode, '');
    }
  }, [activeQ?.uniqueId]);

  const filteredList = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    return pool.filter(
      (q) => !t || q.title.toLowerCase().includes(t) || q.topic.toLowerCase().includes(t),
    );
  }, [pool, searchTerm]);

  const handleRun = async () => {
    if (!activeQ) return;
    setRunning(true);
    const res = await executePythonInWorker({
      setupCode: activeQ.setupSchemaOrEnv,
      userCode: code,
      testCases: activeQ.testCases,
      hiddenTestCases: activeQ.hiddenTestCases,
    });
    setResult(res);
    setRunning(false);
    const firstErr =
      res.stderr ||
      res.tests.find((t) => !t.passed)?.detail ||
      res.hiddenSummary?.firstFailure ||
      '';
    onContextUpdate(code, firstErr);

    if (res.ok && res.allPassed) {
      onMarkSolved(activeQ, code, res.runtimeMs);
    } else {
      onCaptureMistake?.({
        id: `q_${activeQ.uniqueId}`,
        sourceType: 'coding_fail',
        questionId: activeQ.uniqueId,
        title: activeQ.title,
        domain: activeQ.domain,
        reason: firstErr || `Python failed ${res.totalCount - res.passedCount}/${res.totalCount} assertions.`,
      });
    }
  };

  const handleFuzz = async () => {
    if (!activeQ) return;
    setFuzzing(true);
    try {
      const report = await fuzzPythonSolution({
        setupCode: activeQ.setupSchemaOrEnv,
        userCode: code,
        testCases: activeQ.testCases,
      });
      setFuzzReport(report);
      if (!report.allPassed) {
        const failedVectors = report.cases.filter((c) => !c.passed).map((c) => c.vector);
        onCaptureMistake?.({
          id: `q_${activeQ.uniqueId}`,
          sourceType: 'coding_fail',
          questionId: activeQ.uniqueId,
          title: activeQ.title,
          domain: activeQ.domain,
          reason: `Adversarial Fuzzer broke solution on: ${failedVectors.join(', ')}`,
        });
      }
    } finally {
      setFuzzing(false);
    }
  };

  if (!activeQ) {
    return <div className="glass-surface rounded-2xl p-8 text-sm text-slate-400">No problems loaded.</div>;
  }

  const isSolved = solvedIds.includes(activeQ.uniqueId);
  const isBookmarked = bookmarks.includes(activeQ.uniqueId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-white">
            {mode === 'labs'
              ? 'PySpark & Data Engineering Labs'
              : 'Python 3 & DSA Pattern Arena'}
          </h1>
          <p className="text-xs text-slate-400">
            Isolated Pyodide WebAssembly CPython worker · Automated unit assertions · Built-in PySpark DataFrame shim
          </p>
        </div>
        <GenerateBatchButton
          domain={mode === 'labs' ? 'PySpark & Distributed' : 'Python & DSA'}
          topic={activeQ.topic}
          roadmapTrack={mode === 'labs' ? 'Data Engineering Core' : 'DSA Pattern Roadmap'}
          experienceLevel={experienceTier}
          roundType={mode === 'labs' ? 'PySpark & Engineering Lab' : 'Python & DSA Coding'}
          excludeTitles={questions.map((q) => q.title)}
          onGenerated={onAddGeneratedQuestions}
          compact
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Left Panel */}
        <div className="glass-surface flex flex-col overflow-hidden rounded-2xl xl:col-span-5">
          <div className="border-b border-white/10 p-3">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${pool.length} ${mode === 'labs' ? 'PySpark & Engineering Labs' : 'Python/DSA problems'}...`}
              className="inset-surface w-full rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[var(--accent-primary)]"
            />
            <div className="mt-2 flex max-h-36 flex-col gap-1 overflow-y-auto pr-1">
              {filteredList.map((q) => (
                <button
                  key={q.uniqueId}
                  onClick={() => onSelectQuestion(q)}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                    q.uniqueId === activeQ.uniqueId
                      ? 'tab-active'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="truncate pr-2 font-medium">{q.title}</span>
                  <span className="shrink-0 font-mono text-[11px] opacity-80">
                    {solvedIds.includes(q.uniqueId) ? 'Solved' : q.difficulty}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
            <div className="flex gap-1">
              {(['problem', 'solution'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setLeftTab(t)}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    leftTab === t ? 'tab-active' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t === 'solution' && !solutionUnlocked && <Lock className="h-3 w-3 opacity-80" />}
                  <span>{t}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <a
                href={`/problem/${encodeURIComponent(activeQ.uniqueId)}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in New Tab"
                className="btn-secondary rounded-lg p-1.5 text-slate-400 hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                onClick={() => onScheduleSM2(activeQ)}
                title="Schedule SM-2 Review"
                className="btn-secondary rounded-lg p-1.5 text-slate-400 hover:text-white"
              >
                <BrainCircuit className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onToggleBookmark(activeQ.uniqueId)}
                title="Bookmark"
                className={`rounded-lg border p-1.5 transition-colors ${
                  isBookmarked ? 'tab-active border-transparent' : 'border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Bookmark className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 text-sm">
            <div className="mb-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{activeQ.topic}</span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-slate-300">
                  {activeQ.difficulty}
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeQ.experienceLevel}</span>
                {isSolved && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-white">Verified Solved</span>
                  </>
                )}
              </div>
              <h2 className="mt-1 font-display text-lg font-bold text-white">{activeQ.title}</h2>
              {activeQ.askedContext && (
                <p className="mt-1 font-mono text-[11px] text-slate-300">{activeQ.askedContext}</p>
              )}
            </div>

            {leftTab === 'problem' ? (
              <div className="space-y-4">
                <div className={`prose prose-sm max-w-none ${isDark ? 'prose-invert text-slate-300' : 'text-neutral-900'}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeQ.problemStatement}</ReactMarkdown>
                </div>
                {activeQ.testCases.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-xs font-semibold text-white">Test Assertions</div>
                    <pre className="inset-surface overflow-x-auto rounded-xl p-3 font-mono text-xs text-slate-300">
                      {activeQ.testCases.map((tc) => `# ${tc.name}\n${tc.input}`).join('\n\n')}
                    </pre>
                  </div>
                )}
                <div className="inset-surface rounded-xl p-3 text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">Engineering Context:</span> {activeQ.practicalRelevance}
                </div>
              </div>
              ) : !solutionUnlocked ? (
                <div className="inset-surface rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Lock className="h-4 w-4" />
                    <span>Solution Locked (Zero-Spoiler Mode)</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-300">
                    Implement your solution or ask Copilot for hints before revealing the reference answer.
                  </p>
                  {!confirmReveal ? (
                    <button
                      onClick={() => setConfirmReveal(true)}
                      className="btn-secondary mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Reveal Solution</span>
                    </button>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setSolutionUnlocked(true);
                          setConfirmReveal(false);
                        }}
                        className="btn-primary rounded-lg px-3.5 py-1.5 text-xs"
                      >
                        Confirm Reveal Solution
                      </button>
                      <button
                        onClick={() => setConfirmReveal(false)}
                        className="btn-secondary rounded-lg px-3 py-1.5 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="mb-1.5 text-xs font-semibold text-white">Optimal Solution</div>
                    <pre className="inset-surface overflow-x-auto rounded-xl p-3 font-mono text-xs text-slate-200">
                      {activeQ.detailedSolution}
                    </pre>
                    <button
                      onClick={() => setCode(activeQ.detailedSolution)}
                      className="btn-secondary mt-2 rounded-lg px-3 py-1.5 text-xs font-medium"
                    >
                      Load into Editor
                    </button>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-white">Complexity &amp; Internals</div>
                    <p className="text-xs leading-relaxed text-slate-300">{activeQ.explanation}</p>
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Right Editor & Test Runner */}
        <div className="flex flex-col gap-4 xl:col-span-7">
          <div className="glass-surface overflow-hidden rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
              <span className="font-mono text-xs text-slate-400">Pyodide CPython 3.12 Web Worker</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setCode(activeQ.starterCode);
                    setResult(null);
                    setFuzzReport(null);
                  }}
                  className="btn-secondary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={handleFuzz}
                  disabled={fuzzing || running}
                  className="btn-secondary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                >
                  {fuzzing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Bug className="h-3.5 w-3.5 text-[#F43F5E]" />
                  )}
                  <span>{fuzzing ? 'Fuzzing...' : 'Fuzz & Break My Code'}</span>
                </button>
                <button
                  onClick={onOpenCopilotWithPrompt}
                  className="btn-secondary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Ask Copilot</span>
                </button>
                <button
                  onClick={handleRun}
                  disabled={running}
                  className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs disabled:opacity-60"
                >
                  {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  <span>{running ? 'Running Wasm...' : `Run All ${(activeQ.testCases?.length || 0) + (activeQ.hiddenTestCases?.length || 0)} Tests`}</span>
                </button>
              </div>
            </div>

            <div className="h-80 w-full">
              <Editor
                height="100%"
                defaultLanguage="python"
                theme={isDark ? 'vs-dark' : 'vs'}
                value={code}
                onChange={(val) => {
                  const next = val ?? '';
                  setCode(next);
                  onContextUpdate(next, result?.stderr || '');
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: { top: 12 },
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </div>

          {/* Adversarial Fuzzer Output */}
          {fuzzReport && (
            <div className="glass-surface rounded-2xl p-4">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Bug className="h-4 w-4 text-[#F43F5E]" />
                  <span>Adversarial Edge-Case Fuzzer ({fuzzReport.passedCount}/{fuzzReport.totalCount} Survived)</span>
                  <span className="font-mono text-[11px] font-normal text-slate-400">
                    · {fuzzReport.runtimeMs} ms
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFuzzReport(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {fuzzReport.cases.map((fc) => (
                  <div
                    key={fc.id}
                    className={`rounded-xl border p-2.5 text-xs ${
                      fc.passed
                        ? 'border-[#22C55E]/35 bg-[#22C55E]/8'
                        : 'border-[#EF4444]/40 bg-[#EF4444]/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">{fc.vector}</span>
                      <span
                        className={`font-mono text-[10px] font-bold ${
                          fc.passed ? 'text-[#22C55E]' : 'text-[#EF4444]'
                        }`}
                      >
                        {fc.passed ? 'SURVIVED' : 'BROKE'}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">{fc.detail}</p>
                    <pre className="inset-surface mt-1.5 overflow-x-auto rounded-lg p-1.5 font-mono text-[10px] text-slate-400">
                      {fc.mutatedInputPreview}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test Results Panel */}
          <div className="glass-surface rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Terminal className="h-4 w-4 text-white" />
                <span>Automated Test Runner ({(activeQ.testCases?.length || 0) + (activeQ.hiddenTestCases?.length || 0)} Checks) &amp; Stdout</span>
              </div>
              {result && (
                <span
                  className={`font-mono text-xs tabular-nums ${
                    result.ok && result.allPassed ? 'text-[#10B981]' : 'text-[#EF4444]'
                  }`}
                >
                  {result.passedCount}/{result.totalCount} Passed · {result.runtimeMs} ms
                </span>
              )}
            </div>

            {!result ? (
              <p className="text-xs text-slate-400">
                Executes all {activeQ.testCases?.length || 0} visible + {activeQ.hiddenTestCases?.length || 0} hidden edge-case assertions inside Pyodide WebAssembly CPython 3.12.
              </p>
            ) : (
              <div className="space-y-3">
                {result.stderr && (
                  <pre className="overflow-x-auto rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 font-mono text-xs text-[#EF4444]">
                    {result.stderr}
                  </pre>
                )}
                {result.stdout && (
                  <div>
                    <div className="mb-1 text-xs text-slate-400">Stdout</div>
                    <pre className="inset-surface overflow-x-auto rounded-xl p-3 font-mono text-xs text-slate-200">
                      {result.stdout}
                    </pre>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[...result.tests, ...(result.hiddenTests || [])].map((tc, idx) => (
                    <div
                      key={idx}
                      className="inset-surface flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {tc.passed ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10B981]" />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0 text-[#EF4444]" />
                        )}
                        <span className="truncate font-medium text-white">
                          {tc.hidden ? `[Hidden] ${tc.name}` : tc.name}
                        </span>
                      </div>
                      <span className="max-w-[140px] truncate font-mono text-[11px] text-slate-400">{tc.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
