import React, { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertTriangle,
  Bookmark,
  BrainCircuit,
  Bug,
  CheckCircle2,
  Database,
  ExternalLink,
  Eye,
  FlaskConical,
  GitBranch,
  Loader2,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import type { ExperienceTier, MistakeSourceType, Question } from '../types/platform';
import { executeSqlInBrowser, type SqlExecutionResponse } from '../lib/sqlEngine';
import { fuzzSqlSolution, type AdversarialFuzzReport } from '../lib/codeFuzzer';
import { GenerateBatchButton } from './GenerateBatchButton';
import { useTheme } from '../lib/themeContext';

interface SqlArenaViewProps {
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

export function SqlArenaView({
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
}: SqlArenaViewProps) {
  const { isDark } = useTheme();
  const sqlQuestions = useMemo(
    () => questions.filter((q) => q.domain === 'Analytical SQL' || q.roundType.toLowerCase().includes('sql')),
    [questions],
  );

  const activeQ = selectedQuestion && sqlQuestions.some((q) => q.uniqueId === selectedQuestion.uniqueId)
    ? selectedQuestion
    : sqlQuestions[0];

  const [code, setCode] = useState(activeQ?.starterCode || '');
  const [leftTab, setLeftTab] = useState<'problem' | 'schema' | 'solution'>('problem');
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [solutionUnlocked, setSolutionUnlocked] = useState(false);
  const [dirtyDataMode, setDirtyDataMode] = useState(true);
  const [bottomTab, setBottomTab] = useState<'results' | 'diff' | 'dirty' | 'explain'>('diff');
  const [running, setRunning] = useState(false);
  const [fuzzing, setFuzzing] = useState(false);
  const [fuzzReport, setFuzzReport] = useState<AdversarialFuzzReport | null>(null);
  const [result, setResult] = useState<SqlExecutionResponse | null>(null);
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
    return sqlQuestions.filter(
      (q) => !t || q.title.toLowerCase().includes(t) || q.topic.toLowerCase().includes(t),
    );
  }, [sqlQuestions, searchTerm]);

  const handleRun = async () => {
    if (!activeQ) return;
    setRunning(true);
    const res = await executeSqlInBrowser({
      setupSql: activeQ.setupSchemaOrEnv,
      userSql: code,
      referenceSql: activeQ.detailedSolution,
      dirtyDataMode,
      adversarialSetupSql: activeQ.adversarialSetupSql,
    });
    setResult(res);
    setRunning(false);
    const errMsg =
      res.error ||
      (res.diffMatched === false ? res.diffSummary || '' : '') ||
      (res.testCaseResults.find((t) => !t.passed)?.summary || '');
    onContextUpdate(code, errMsg);

    const passedRequired = dirtyDataMode ? res.allPassed : Boolean(res.diffMatched);
    if (res.ok && passedRequired) {
      onMarkSolved(activeQ, code, res.actual?.runtimeMs ?? 1);
    } else {
      onCaptureMistake?.({
        id: `q_${activeQ.uniqueId}`,
        sourceType: 'coding_fail',
        questionId: activeQ.uniqueId,
        title: activeQ.title,
        domain: activeQ.domain,
        reason: errMsg || `SQL failed ${res.totalCount - res.passedCount}/${res.totalCount} test cases.`,
      });
    }
  };

  const handleFuzz = async () => {
    if (!activeQ) return;
    setFuzzing(true);
    try {
      const report = await fuzzSqlSolution({
        setupSql: activeQ.setupSchemaOrEnv,
        userSql: code,
        referenceSql: activeQ.detailedSolution,
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
          reason: `Adversarial Fuzzer broke query on: ${failedVectors.join(', ')}`,
        });
      }
    } finally {
      setFuzzing(false);
    }
  };

  if (!activeQ) {
    return <div className="glass-surface rounded-2xl p-8 text-sm text-slate-400">No SQL problems loaded.</div>;
  }

  const isSolved = solvedIds.includes(activeQ.uniqueId);
  const isBookmarked = bookmarks.includes(activeQ.uniqueId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-white">SQL Arena &amp; Execution Plan Visualizer</h1>
          <p className="text-xs text-slate-400">
            Isolated SQLite WebAssembly engine · Real multi-table datasets · Visual EXPLAIN QUERY PLAN tree
          </p>
        </div>
        <GenerateBatchButton
          domain="Analytical SQL"
          topic={activeQ.topic}
          roadmapTrack="Analytical SQL Mastery"
          experienceLevel={experienceTier}
          roundType="SQL Coding"
          excludeTitles={questions.map((q) => q.title)}
          onGenerated={onAddGeneratedQuestions}
          compact
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Left Sidebar Problem Picker + Statement */}
        <div className="glass-surface flex flex-col overflow-hidden rounded-2xl xl:col-span-5">
          <div className="border-b border-white/10 p-3">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${sqlQuestions.length} SQL questions...`}
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
              {(['problem', 'schema', 'solution'] as const).map((t) => (
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
                title="Schedule SM-2 Spaced Repetition"
                className="btn-secondary rounded-lg p-1.5 text-slate-400 hover:text-white"
              >
                <BrainCircuit className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onToggleBookmark(activeQ.uniqueId)}
                title="Bookmark problem"
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

            {leftTab === 'problem' && (
              <div className="space-y-4">
                <div className={`prose prose-sm max-w-none ${isDark ? 'prose-invert text-slate-300' : 'text-neutral-900'}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeQ.problemStatement}</ReactMarkdown>
                </div>
                <div className="inset-surface rounded-xl p-3 text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">Practical Relevance:</span> {activeQ.practicalRelevance}
                </div>
                <div className="text-xs text-slate-400">
                  Companies: {activeQ.companyTags.join(', ')}
                </div>
              </div>
            )}

            {leftTab === 'schema' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-white">
                  <Database className="h-4 w-4" />
                  <span>SQLite DDL &amp; Seed Dataset</span>
                </div>
                <pre className="inset-surface overflow-x-auto rounded-xl p-3 font-mono text-xs leading-relaxed text-slate-300">
                  {activeQ.setupSchemaOrEnv}
                </pre>
              </div>
            )}

            {leftTab === 'solution' && (
              !solutionUnlocked ? (
                <div className="inset-surface rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Lock className="h-4 w-4" />
                    <span>Solution Locked (Zero-Spoiler Mode)</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-300">
                    Attempt the query first or ask Copilot for progressive hints before unlocking the reference answer.
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
                    <div className="mb-1.5 text-xs font-semibold text-white">Reference Solution</div>
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
                    <div className="mb-1 text-xs font-semibold text-white">Explanation</div>
                    <p className="text-xs leading-relaxed text-slate-300">{activeQ.explanation}</p>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-white">Alternative Approaches</div>
                    <p className="text-xs leading-relaxed text-slate-300">{activeQ.alternativeApproaches}</p>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-white">Execution Plan Notes</div>
                    <p className="text-xs leading-relaxed text-slate-300">{activeQ.executionPlanNotes}</p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Right Editor & Results / EXPLAIN Visualizer */}
        <div className="flex flex-col gap-4 xl:col-span-7">
          <div className="glass-surface overflow-hidden rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs text-slate-400">SQLite Wasm 3.x</span>
                <button
                  type="button"
                  onClick={() => setDirtyDataMode((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                    dirtyDataMode
                      ? 'tab-active border-transparent'
                      : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-white'
                  }`}
                >
                  <FlaskConical className="h-3.5 w-3.5" />
                  <span>Dirty Data &amp; CDC Mode: {dirtyDataMode ? 'ON' : 'OFF'}</span>
                </button>
              </div>
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
                  <Play className="h-3.5 w-3.5" />
                  <span>{running ? 'Running...' : 'Run All 7 Tests'}</span>
                </button>
              </div>
            </div>

            <div className="h-72 w-full">
              <Editor
                height="100%"
                defaultLanguage="sql"
                theme={isDark ? 'vs-dark' : 'vs'}
                value={code}
                onChange={(val) => {
                  const next = val ?? '';
                  setCode(next);
                  onContextUpdate(next, result?.error || '');
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

          {/* Output & Visual Execution Plan Panel */}
          <div className="glass-surface overflow-hidden rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
              <div className="flex gap-1">
                {[
                  { id: 'diff' as const, label: 'Expected vs Actual' },
                  { id: 'dirty' as const, label: 'Dirty Data & CDC' },
                  { id: 'results' as const, label: 'Actual Output' },
                  { id: 'explain' as const, label: 'Execution Plan Tree' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setBottomTab(t.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      bottomTab === t.id ? 'tab-active' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {result && result.ok && (
                <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
                  {result.allPassed ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#10B981]">
                      <CheckCircle2 className="h-4 w-4" />
                      {result.passedCount}/{result.totalCount} Passed · {result.actual?.runtimeMs} ms
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#EF4444]">
                      <XCircle className="h-4 w-4" />
                      {result.passedCount}/{result.totalCount} Passed · {result.actual?.runtimeMs} ms
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="max-h-80 overflow-auto p-4">
              {!result ? (
                <p className="text-xs text-slate-400">
                  Click &ldquo;Run All 7 Tests&rdquo; to execute your SQL query against all 7 isolated SQLite Wasm test scenarios (canonical, ties, NULL FKs, duplicates, numeric bounds, reverse order, sparse partition) and inspect EXPLAIN QUERY PLAN.
                </p>
              ) : !result.ok ? (
                <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 font-mono text-xs text-[#EF4444]">
                  {result.error}
                </div>
              ) : bottomTab === 'results' && result.actual ? (
                <div>
                  <div className="mb-2 font-mono text-xs text-slate-400 tabular-nums">
                    {result.actual.rowCount} rows returned in {result.actual.runtimeMs} ms
                  </div>
                  <ResultTable columns={result.actual.columns} rows={result.actual.rows} />
                </div>
              ) : bottomTab === 'dirty' ? (
                <div className="space-y-2">
                  {result.testCaseResults.map((tc) => (
                    <div
                      key={tc.id}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs ${
                        tc.passed
                          ? 'border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]'
                          : 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        {tc.passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        <span>{tc.name}</span>
                      </div>
                      <span className="font-mono text-[11px]">{tc.summary}</span>
                    </div>
                  ))}
                </div>
              ) : bottomTab === 'diff' ? (
                <div className="space-y-4">
                  {result.diffSummary && (
                    <div
                      className={`rounded-xl border p-3 text-xs ${
                        result.diffMatched
                          ? 'border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]'
                          : 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]'
                      }`}
                    >
                      {result.diffSummary}
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-1.5 text-xs font-semibold text-white">Your Output</div>
                      {result.actual && <ResultTable columns={result.actual.columns} rows={result.actual.rows} />}
                    </div>
                    <div>
                      <div className="mb-1.5 text-xs font-semibold text-slate-300">Expected Output</div>
                      {result.expected && <ResultTable columns={result.expected.columns} rows={result.expected.rows} />}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <GitBranch className="h-4 w-4 text-white" />
                    <span>SQLite EXPLAIN QUERY PLAN Tree</span>
                  </div>
                  {result.explainPlan.length === 0 ? (
                    <p className="text-xs text-slate-400">No plan steps available for this statement.</p>
                  ) : (
                    <div className="space-y-2">
                      {result.explainPlan.map((node, idx) => (
                        <div
                          key={`${node.id}-${idx}`}
                          className="inset-surface rounded-xl p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-semibold text-white">{node.detail}</span>
                            <span className="shrink-0 font-mono text-[11px] font-semibold text-slate-300">
                              {node.nodeType}
                            </span>
                          </div>
                          {node.warning && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-300">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>{node.warning}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: (string | number | null | Uint8Array)[][];
}) {
  if (columns.length === 0) {
    return <p className="text-xs text-slate-400">Query executed with zero result columns.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full border-collapse text-left font-mono text-xs tabular-nums">
        <thead className="bg-white/[0.04] text-slate-300">
          <tr>
            {columns.map((c, idx) => (
              <th key={`${c}-${idx}`} className="border-b border-white/10 px-3 py-2 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06] text-slate-200">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-3 text-slate-500">
                0 rows returned
              </td>
            </tr>
          ) : (
            rows.map((r, rIdx) => (
              <tr key={rIdx} className="hover:bg-white/[0.02]">
                {r.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 whitespace-nowrap">
                    {cell === null ? <span className="text-slate-500">NULL</span> : String(cell)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
