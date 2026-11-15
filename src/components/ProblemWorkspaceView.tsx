import React, { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Bookmark,
  BookOpen,
  BrainCircuit,
  Bug,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Database,
  ExternalLink,
  Eye,
  FlaskConical,
  GitBranch,
  Layers,
  Loader2,
  Lock,
  Moon,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Sun,
  Terminal,
  X,
  XCircle,
} from 'lucide-react';
import type { ExperienceTier, MistakeSourceType, Question } from '../types/platform';
import {
  executeSqlInBrowser,
  extractSampleTables,
  type SampleTablePreview,
  type SqlExecutionResponse,
  type SqlQueryResult,
} from '../lib/sqlEngine';
import { executePythonInWorker, type PythonExecutionResponse } from '../lib/pythonEngine';
import {
  fuzzPythonSolution,
  fuzzSqlSolution,
  type AdversarialFuzzReport,
} from '../lib/codeFuzzer';
import { getQuestionEvalType, getQuestionRound, INTERVIEW_ROUNDS } from '../data/rounds';
import { useTheme } from '../lib/themeContext';
import {
  ArchitectureWhiteboardStudio,
  DimensionalModelingStudio,
  IncidentRcaStarStudio,
  SparkUiDebuggerPanel,
} from './RoundStudios';

interface RubricEvaluationResult {
  score: number;
  verdict: string;
  strengths: string[];
  gaps: string[];
  staffUpgradeSuggestions: string[];
  followUpQuestion: string;
}

interface ProblemWorkspaceViewProps {
  question: Question;
  allQuestions: Question[];
  solvedIds: string[];
  bookmarks: string[];
  experienceTier: ExperienceTier;
  coldSolve?: boolean;
  onColdSolveResult?: (questionId: string, passedFirstTry: boolean) => void;
  onCaptureMistake?: (payload: {
    id: string;
    sourceType: MistakeSourceType;
    questionId?: string;
    topicSlug?: string;
    title: string;
    domain: string;
    reason: string;
  }) => void | Promise<void>;
  onBackToRound: (roundSlug: string) => void;
  onSelectQuestion: (q: Question) => void;
  onSelectTopic: (topicNameOrId: string) => void;
  onMarkSolved: (q: Question, code: string, runtimeMs: number) => void;
  onToggleBookmark: (id: string) => void;
  onScheduleSM2: (q: Question) => void;
  onContextUpdate: (code: string, errorOutput: string) => void;
  onOpenCopilot: () => void;
}

function getDraftKey(uniqueId: string): string {
  return `de360_draft_v1_${uniqueId}`;
}

function getSafeStarter(q: Question): string {
  if (q.starterCode && q.starterCode.trim() && q.starterCode.trim() !== q.detailedSolution.trim()) {
    return q.starterCode;
  }
  const evalType = getQuestionEvalType(q);
  if (evalType === 'sql') {
    return '-- Write your SQLite query below\nSELECT 1;\n';
  }
  if (evalType === 'python') {
    return '# Write your Python 3 solution below\n';
  }
  return `# ${q.title}\n\n## 1. Key Requirements & Constraints\n\n## 2. Core Design / Modeling Decisions\n\n## 3. Edge Cases, Scale & Trade-Offs\n`;
}

export function ProblemWorkspaceView({
  question,
  allQuestions,
  solvedIds,
  bookmarks,
  experienceTier,
  coldSolve = false,
  onColdSolveResult,
  onCaptureMistake,
  onBackToRound,
  onSelectQuestion,
  onSelectTopic,
  onMarkSolved,
  onToggleBookmark,
  onScheduleSM2,
  onContextUpdate,
  onOpenCopilot,
}: ProblemWorkspaceViewProps) {
  const { isDark, toggleTheme } = useTheme();
  const roundNum = getQuestionRound(question);
  const roundMeta = INTERVIEW_ROUNDS.find((r) => r.roundNumber === roundNum) || INTERVIEW_ROUNDS[0];
  const evalType = getQuestionEvalType(question);

  const roundSiblings = useMemo(
    () => allQuestions.filter((q) => getQuestionRound(q) === roundNum),
    [allQuestions, roundNum],
  );
  const siblingIdx = roundSiblings.findIndex((q) => q.uniqueId === question.uniqueId);
  const prevQuestion = siblingIdx > 0 ? roundSiblings[siblingIdx - 1] : null;
  const nextQuestion =
    siblingIdx >= 0 && siblingIdx < roundSiblings.length - 1 ? roundSiblings[siblingIdx + 1] : null;

  const [code, setCode] = useState<string>(() => {
    if (!coldSolve && typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(getDraftKey(question.uniqueId));
      if (saved !== null) return saved;
    }
    return getSafeStarter(question);
  });

  const [leftTab, setLeftTab] = useState<'problem' | 'schema' | 'solution'>('problem');
  const [rightMode, setRightMode] = useState<'editor' | 'studio'>('editor');
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [solutionUnlocked, setSolutionUnlocked] = useState(false);
  const [firstRunDone, setFirstRunDone] = useState(false);

  // Sample tables live preview for SQL questions
  const [sampleTables, setSampleTables] = useState<SampleTablePreview[]>([]);
  const [sampleExpected, setSampleExpected] = useState<SqlQueryResult | null>(null);

  // SQL execution state
  const [dirtyDataMode, setDirtyDataMode] = useState(true);
  const [sqlBottomTab, setSqlBottomTab] = useState<'cases' | 'diff' | 'explain'>('cases');
  const [selectedSqlCaseIdx, setSelectedSqlCaseIdx] = useState(0);
  const [sqlResult, setSqlResult] = useState<SqlExecutionResponse | null>(null);

  // Python state
  const [pyResult, setPyResult] = useState<PythonExecutionResponse | null>(null);

  // Adversarial Fuzzer state
  const [fuzzing, setFuzzing] = useState(false);
  const [fuzzReport, setFuzzReport] = useState<AdversarialFuzzReport | null>(null);

  // Design Rubric state
  const [rubricResult, setRubricResult] = useState<RubricEvaluationResult | null>(null);
  const [rubricError, setRubricError] = useState<string | null>(null);

  const [running, setRunning] = useState(false);

  const hasInteractiveStudio = roundNum === 3 || roundNum === 4 || roundNum === 5 || roundNum === 6 || roundNum === 8;
  const studioLabel =
    roundNum === 3
      ? 'Spark UI & Plan Debugger'
      : roundNum === 4
        ? 'Dimensional Modeling Studio'
        : roundNum === 6
          ? 'SEV-1 RCA & STAR War-Room'
          : 'Whiteboard & Scale Calculator';

  // Reset per-question UI state & anti-spoiler lock whenever question or coldSolve mode changes
  useEffect(() => {
    const saved =
      !coldSolve && typeof window !== 'undefined'
        ? window.localStorage.getItem(getDraftKey(question.uniqueId))
        : null;
    const initialCode = saved !== null ? saved : getSafeStarter(question);
    setCode(initialCode);
    setLeftTab('problem');
    setRightMode('editor');
    setConfirmReveal(false);
    setSolutionUnlocked(false);
    setFirstRunDone(false);
    setSqlResult(null);
    setPyResult(null);
    setFuzzReport(null);
    setRubricResult(null);
    setRubricError(null);
    setSqlBottomTab('cases');
    setSelectedSqlCaseIdx(0);
    onContextUpdate(initialCode, '');

    if (evalType === 'sql' && question.setupSchemaOrEnv) {
      extractSampleTables(question.setupSchemaOrEnv, question.detailedSolution).then((res) => {
        setSampleTables(res.tables);
        setSampleExpected(res.expectedPreview);
      });
    } else {
      setSampleTables([]);
      setSampleExpected(null);
    }
  }, [question.uniqueId, coldSolve]);

  const handleCodeChange = (nextVal: string) => {
    setCode(nextVal);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(getDraftKey(question.uniqueId), nextVal);
      } catch {
        // Ignore quota errors
      }
    }
    onContextUpdate(nextVal, '');
  };

  const handleResetStarter = () => {
    const starter = getSafeStarter(question);
    setCode(starter);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(getDraftKey(question.uniqueId));
    }
    setSqlResult(null);
    setPyResult(null);
    setFuzzReport(null);
    setRubricResult(null);
    setRubricError(null);
    onContextUpdate(starter, '');
  };

  const coldLockActive = coldSolve && !firstRunDone;

  const handleRunSql = async () => {
    setRunning(true);
    const res = await executeSqlInBrowser({
      setupSql: question.setupSchemaOrEnv,
      userSql: code,
      referenceSql: question.detailedSolution,
      dirtyDataMode,
      adversarialSetupSql: question.adversarialSetupSql,
    });
    setSqlResult(res);
    setRunning(false);

    const firstFailIdx = res.testCaseResults.findIndex((t) => !t.passed);
    setSelectedSqlCaseIdx(firstFailIdx >= 0 ? firstFailIdx : 0);

    const errMsg =
      res.error ||
      (firstFailIdx >= 0 ? res.testCaseResults[firstFailIdx].summary : '');
    onContextUpdate(code, errMsg);

    const passedRequired = res.ok && (dirtyDataMode ? res.allPassed : Boolean(res.diffMatched));
    if (passedRequired) {
      onMarkSolved(question, code, res.actual?.runtimeMs ?? 1);
    } else {
      onCaptureMistake?.({
        id: `q_${question.uniqueId}`,
        sourceType: 'coding_fail',
        questionId: question.uniqueId,
        title: question.title,
        domain: question.domain,
        reason: errMsg || `SQL failed ${res.totalCount - res.passedCount}/${res.totalCount} test cases.`,
      });
    }

    if (coldSolve && !firstRunDone) {
      setFirstRunDone(true);
      onColdSolveResult?.(question.uniqueId, passedRequired);
    }
  };

  const handleRunPython = async () => {
    setRunning(true);
    const res = await executePythonInWorker({
      setupCode: question.setupSchemaOrEnv,
      userCode: code,
      testCases: question.testCases,
      hiddenTestCases: question.hiddenTestCases,
    });
    setPyResult(res);
    setRunning(false);

    const firstErr =
      res.stderr ||
      res.tests.find((t) => !t.passed)?.detail ||
      res.hiddenSummary?.firstFailure ||
      '';
    onContextUpdate(code, firstErr);

    const passed = res.ok && res.allPassed;
    if (passed) {
      onMarkSolved(question, code, res.runtimeMs);
    } else {
      onCaptureMistake?.({
        id: `q_${question.uniqueId}`,
        sourceType: 'coding_fail',
        questionId: question.uniqueId,
        title: question.title,
        domain: question.domain,
        reason: firstErr || `Python failed ${res.totalCount - res.passedCount}/${res.totalCount} assertions.`,
      });
    }

    if (coldSolve && !firstRunDone) {
      setFirstRunDone(true);
      onColdSolveResult?.(question.uniqueId, passed);
    }
  };

  const handleFuzzCode = async () => {
    if (evalType === 'design_rubric') return;
    setFuzzing(true);
    try {
      const report =
        evalType === 'sql'
          ? await fuzzSqlSolution({
              setupSql: question.setupSchemaOrEnv,
              userSql: code,
              referenceSql: question.detailedSolution,
            })
          : await fuzzPythonSolution({
              setupCode: question.setupSchemaOrEnv,
              userCode: code,
              testCases: question.testCases,
            });
      setFuzzReport(report);
      if (!report.allPassed) {
        const failedVectors = report.cases.filter((c) => !c.passed).map((c) => c.vector);
        onCaptureMistake?.({
          id: `q_${question.uniqueId}`,
          sourceType: 'coding_fail',
          questionId: question.uniqueId,
          title: question.title,
          domain: question.domain,
          reason: `Adversarial Fuzzer broke code on: ${failedVectors.join(', ')}`,
        });
      }
    } finally {
      setFuzzing(false);
    }
  };

  const handleEvaluateRubric = async () => {
    setRunning(true);
    setRubricError(null);
    const start = performance.now();
    try {
      const resp = await fetch('/api/ai/evaluate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionTitle: question.title,
          questionPrompt: question.problemStatement,
          roundName: roundMeta.title,
          experienceTier,
          userResponse: code,
          referenceSolution: question.detailedSolution,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Evaluation failed.');
      }
      setRubricResult(data as RubricEvaluationResult);
      onContextUpdate(code, '');
      const passed = Number(data.score) >= 70;
      if (passed) {
        onMarkSolved(question, code, Math.round(performance.now() - start));
      } else {
        onCaptureMistake?.({
          id: `q_${question.uniqueId}`,
          sourceType: 'coding_fail',
          questionId: question.uniqueId,
          title: question.title,
          domain: question.domain,
          reason: `Staff Rubric Score ${data.score}/100: ${(data.gaps || [])[0] || 'Needs deeper edge-case coverage.'}`,
        });
      }
      if (coldSolve && !firstRunDone) {
        setFirstRunDone(true);
        onColdSolveResult?.(question.uniqueId, passed);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to reach Gemini rubric evaluator.';
      setRubricError(msg);
      onContextUpdate(code, msg);
    } finally {
      setRunning(false);
    }
  };

  const isSolved = solvedIds.includes(question.uniqueId);
  const isBookmarked = bookmarks.includes(question.uniqueId);
  const totalTestCount =
    (question.testCases?.length || 0) + (question.hiddenTestCases?.length || 0);
  const activeSqlCase =
    sqlResult?.testCaseResults[selectedSqlCaseIdx] || sqlResult?.testCaseResults[0];

  return (
    <div className="aurora-canvas flex h-screen flex-col overflow-hidden text-slate-100">
      {/* Full-Screen Workspace Top Bar */}
      <header className="glass-surface flex h-14 shrink-0 items-center justify-between gap-4 rounded-none border-x-0 border-t-0 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            onClick={() => onBackToRound(roundMeta.slug)}
            className="btn-secondary inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{roundMeta.shortTitle}</span>
            <span className="sm:hidden">Rounds</span>
          </button>

          <div className="hidden items-center gap-1 md:flex">
            <button
              disabled={!prevQuestion}
              onClick={() => prevQuestion && onSelectQuestion(prevQuestion)}
              title={prevQuestion ? `Previous: ${prevQuestion.title}` : 'First problem in round'}
              className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white disabled:opacity-35"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              disabled={!nextQuestion}
              onClick={() => nextQuestion && onSelectQuestion(nextQuestion)}
              title={nextQuestion ? `Next: ${nextQuestion.title}` : 'Last problem in round'}
              className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white disabled:opacity-35"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="min-w-0 pl-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-display text-sm font-bold text-white">{question.title}</h1>
              {isSolved && (
                <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-mono text-[11px] font-semibold text-[#10B981]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Solved
                </span>
              )}
            </div>
            <div className="hidden items-center gap-1.5 truncate text-[11px] text-slate-400 sm:flex">
              <button
                onClick={() => onSelectTopic(question.topic)}
                className="font-semibold text-white hover:underline"
                title="Open Knowledge Hub deep-dive for this topic"
              >
                {question.topic}
              </button>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-slate-300">
                {question.difficulty}
              </span>
              <span aria-hidden="true">·</span>
              <span>{question.experienceLevel}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-white">+{question.xpReward || 250} XP</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{totalTestCount} Test Cases</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Switch to Gallery Light Mode' : 'Switch to Obsidian Dark Mode'}
            className="btn-secondary rounded-lg p-1.5"
          >
            {isDark ? <Sun className="h-4 w-4 text-white" /> : <Moon className="h-4 w-4 text-black" />}
          </button>

          <a
            href={`/problem/${encodeURIComponent(question.uniqueId)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium"
            title="Open this problem in a dedicated browser tab for side-by-side solving"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Open in New Tab</span>
          </a>

          <button
            onClick={() => onScheduleSM2(question)}
            title="Schedule SM-2 Spaced Repetition"
            className="btn-secondary rounded-lg p-1.5 text-slate-400 hover:text-white"
          >
            <BrainCircuit className="h-4 w-4" />
          </button>

          <button
            onClick={() => onToggleBookmark(question.uniqueId)}
            title="Bookmark Problem"
            className={`rounded-lg border p-1.5 transition-colors ${
              isBookmarked ? 'tab-active border-transparent' : 'border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Bookmark className="h-4 w-4" />
          </button>

          <button
            onClick={onOpenCopilot}
            disabled={coldLockActive}
            title={coldLockActive ? 'Locked during Cold-Solve Attempt #1' : 'Open AI Copilot'}
            className="btn-primary inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs disabled:opacity-45"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{coldLockActive ? 'Hints Locked' : 'Ask Copilot'}</span>
          </button>
        </div>
      </header>

      {coldSolve && (
        <div
          className={`mx-3 mt-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-2 text-xs ${
            coldLockActive
              ? 'border-[#8B5CF6]/50 bg-[#8B5CF6]/15 text-white'
              : 'border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E]'
          }`}
        >
          <span className="font-semibold">
            {coldLockActive
              ? 'Cold-Solve Mistake Vault Mode: Prior drafts stripped & Editorial/Hints locked until Attempt #1 completes. Pass all tests on Attempt #1 to promote your spaced-repetition interval.'
              : 'Cold-Solve Attempt #1 recorded — Editorial & AI Copilot hints unlocked for review.'}
          </span>
          <span className="font-mono text-[11px]">
            {coldLockActive ? 'ATTEMPT #1 ACTIVE' : 'ATTEMPT #1 COMPLETE'}
          </span>
        </div>
      )}

      {/* Main Split Workspace */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-12">
        {/* Left Pane: Problem Description / Schema / Locked Editorial */}
        <section className="glass-surface flex min-h-0 flex-col overflow-hidden rounded-2xl lg:col-span-5">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
            <div className="flex gap-1">
              <button
                onClick={() => setLeftTab('problem')}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  leftTab === 'problem' ? 'tab-active' : 'text-slate-400 hover:text-white'
                }`}
              >
                Problem
              </button>
              {question.setupSchemaOrEnv && (
                <button
                  onClick={() => setLeftTab('schema')}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    leftTab === 'schema' ? 'tab-active' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {evalType === 'sql' ? 'DDL & Seed SQL' : 'Test Harness'}
                </button>
              )}
              <button
                onClick={() => {
                  if (!coldLockActive) setLeftTab('solution');
                }}
                disabled={coldLockActive}
                title={coldLockActive ? 'Editorial locked during Cold-Solve Attempt #1' : 'View Editorial'}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                  leftTab === 'solution' ? 'tab-active' : 'text-slate-400 hover:text-white'
                }`}
              >
                {(!solutionUnlocked || coldLockActive) && <Lock className="h-3 w-3 opacity-80" />}
                <span>Editorial / Solution</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 text-sm">
            {leftTab === 'problem' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white">{roundMeta.title}</span>
                  </div>
                  <button
                    onClick={() => onSelectTopic(question.topic)}
                    className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-white hover:underline"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Topic Guide: {question.topic}</span>
                  </button>
                </div>

                {/* Authentic Company Attribution Banner */}
                {question.askedContext && (
                  <div className="inset-surface flex flex-wrap items-center justify-between gap-2 rounded-xl px-3.5 py-2 text-xs">
                    <div className="flex items-center gap-2 font-medium text-white">
                      <Award className="h-3.5 w-3.5 shrink-0 text-white" />
                      <span>{question.askedContext}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-300">
                      {totalTestCount} Verified Checks
                    </span>
                  </div>
                )}

                <div className={`prose prose-sm max-w-none leading-relaxed ${isDark ? 'prose-invert text-slate-200' : 'text-neutral-900'}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{question.problemStatement}</ReactMarkdown>
                </div>

                {/* Live Extracted Sample Input Tables + Expected Output for SQL */}
                {evalType === 'sql' && sampleTables.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Live Input Schema Preview
                    </div>
                    {sampleTables.map((tbl) => (
                      <div key={tbl.tableName} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-semibold text-white">
                            Table: {tbl.tableName}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">
                            {tbl.totalRows} seed rows
                          </span>
                        </div>
                        <SqlResultTable columns={tbl.columns} rows={tbl.rows} />
                      </div>
                    ))}
                  </div>
                )}

                {evalType === 'sql' && sampleExpected && sampleExpected.columns.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Expected Query Output (Canonical Seed)
                    </div>
                    <SqlResultTable columns={sampleExpected.columns} rows={sampleExpected.rows.slice(0, 10)} />
                  </div>
                )}

                {question.sampleInput && (
                  <div>
                    <div className="mb-1 text-xs font-semibold text-white">Sample Input Spec</div>
                    <pre className="inset-surface overflow-x-auto rounded-xl p-3 font-mono text-xs text-slate-300">
                      {question.sampleInput}
                    </pre>
                  </div>
                )}

                {question.expectedOutput && !sampleExpected && (
                  <div>
                    <div className="mb-1 text-xs font-semibold text-white">Expected Output Shape</div>
                    <pre className="inset-surface overflow-x-auto rounded-xl p-3 font-mono text-xs text-slate-200">
                      {question.expectedOutput}
                    </pre>
                  </div>
                )}

                {evalType === 'python' && question.testCases.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-xs font-semibold text-white">
                      Visible Test Suite ({question.testCases.length})
                      {question.hiddenTestCases && question.hiddenTestCases.length > 0 && (
                        <span className="ml-2 font-normal text-slate-400">
                          + {question.hiddenTestCases.length} hidden edge-case assertions
                        </span>
                      )}
                    </div>
                    <pre className="inset-surface overflow-x-auto rounded-xl p-3 font-mono text-xs text-slate-300">
                      {question.testCases.map((tc) => `# ${tc.name}\n${tc.input}`).join('\n\n')}
                    </pre>
                  </div>
                )}

                {evalType === 'design_rubric' && question.testCases.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-xs font-semibold text-white">
                      6-Point Hiring Bar Rubric Criteria
                    </div>
                    <div className="space-y-1.5">
                      {question.testCases.map((tc, i) => (
                        <div key={i} className="inset-surface rounded-xl px-3 py-2 text-xs">
                          <div className="font-semibold text-white">{tc.name}</div>
                          <div className="text-[11px] text-slate-400">{tc.input}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {question.practicalRelevance && (
                  <div className="inset-surface rounded-xl p-3.5 text-xs text-slate-300">
                    <span className="font-semibold text-white">Production Context: </span>
                    {question.practicalRelevance}
                  </div>
                )}

                {question.companyTags.length > 0 && (
                  <div className="text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Target Loops: </span>
                    {question.companyTags.join(' · ')}
                  </div>
                )}

                {isSolved && nextQuestion && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#10B981]/35 bg-[#10B981]/10 p-3.5">
                    <div className="text-xs font-semibold text-[#10B981]">
                      Quest Milestone Cleared! (+{question.xpReward || 250} XP)
                    </div>
                    <button
                      onClick={() => onSelectQuestion(nextQuestion)}
                      className="btn-primary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs"
                    >
                      <span>Complete &amp; Advance to Next Quest</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {leftTab === 'schema' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Database className="h-4 w-4" />
                  <span>
                    {evalType === 'sql'
                      ? 'SQLite DDL & Canonical Seed Dataset'
                      : 'Execution Environment Setup'}
                  </span>
                </div>
                <pre className="inset-surface overflow-x-auto rounded-xl p-3.5 font-mono text-xs leading-relaxed text-slate-300">
                  {question.setupSchemaOrEnv}
                </pre>
              </div>
            )}

            {leftTab === 'solution' && (
              <>
                {!solutionUnlocked ? (
                  <div className="inset-surface flex flex-col items-start justify-center rounded-2xl p-6">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <Lock className="h-4 w-4" />
                      <span>Editorial &amp; Reference Solution Locked</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                      Solutions stay hidden by default to preserve real Tier-1 interview pressure. Use &ldquo;Ask Copilot&rdquo; for progressive Socratic hints or pass all {totalTestCount} test cases first.
                    </p>

                    {!confirmReveal ? (
                      <button
                        onClick={() => setConfirmReveal(true)}
                        className="btn-secondary mt-4 inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Reveal Solution</span>
                      </button>
                    ) : (
                      <div className="glass-surface mt-4 w-full rounded-xl p-4">
                        <p className="text-xs font-medium text-white">
                          Confirm spoiler unlock? This will display the full reference answer and Staff trade-off notes.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setSolutionUnlocked(true);
                              setConfirmReveal(false);
                            }}
                            className="btn-primary whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs"
                          >
                            Confirm Reveal Solution
                          </button>
                          <button
                            onClick={() => setConfirmReveal(false)}
                            className="btn-secondary whitespace-nowrap rounded-lg px-3 py-1.5 text-xs"
                          >
                            Keep Locked
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">Reference Solution</span>
                        <button
                          onClick={() => {
                            handleCodeChange(question.detailedSolution);
                            setRightMode('editor');
                          }}
                          className="btn-secondary rounded-lg px-2.5 py-1 text-xs font-medium"
                        >
                          Load into Editor
                        </button>
                      </div>
                      <pre className="inset-surface overflow-x-auto rounded-xl p-3.5 font-mono text-xs leading-relaxed text-slate-200">
                        {question.detailedSolution}
                      </pre>
                    </div>
                    {question.explanation && (
                      <div>
                        <div className="mb-1 text-xs font-semibold text-white">Engineering Explanation</div>
                        <p className="whitespace-pre-line text-xs leading-relaxed text-slate-300">
                          {question.explanation}
                        </p>
                      </div>
                    )}
                    {question.alternativeApproaches && (
                      <div>
                        <div className="mb-1 text-xs font-semibold text-white">Alternative Approaches</div>
                        <p className="whitespace-pre-line text-xs leading-relaxed text-slate-300">
                          {question.alternativeApproaches}
                        </p>
                      </div>
                    )}
                    {question.executionPlanNotes && (
                      <div>
                        <div className="mb-1 text-xs font-semibold text-white">
                          Execution Plan &amp; Scale Notes
                        </div>
                        <p className="whitespace-pre-line text-xs leading-relaxed text-slate-300">
                          {question.executionPlanNotes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Right Pane: Code / Studio Editor + Real Multi-Case Runner */}
        <section className="flex min-h-0 flex-col gap-3 lg:col-span-7">
          <div className="glass-surface flex min-h-0 flex-[3] flex-col overflow-hidden rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
              <div className="flex flex-wrap items-center gap-2">
                {hasInteractiveStudio ? (
                  <div className="inset-surface flex rounded-xl p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setRightMode('editor')}
                      className={`whitespace-nowrap rounded-lg px-2.5 py-1 font-medium transition-colors ${
                        rightMode === 'editor' ? 'tab-active' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {evalType === 'design_rubric' ? 'Markdown Spec' : 'Code Editor'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRightMode('studio')}
                      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1 font-medium transition-colors ${
                        rightMode === 'studio' ? 'tab-active' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {roundNum === 3 ? (
                        <Cpu className="h-3.5 w-3.5" />
                      ) : roundNum === 4 ? (
                        <Database className="h-3.5 w-3.5" />
                      ) : (
                        <Layers className="h-3.5 w-3.5" />
                      )}
                      <span>{studioLabel}</span>
                    </button>
                  </div>
                ) : (
                  <span className="font-mono text-xs text-slate-400">
                    {evalType === 'sql'
                      ? 'SQLite Wasm 3.x · Monaco SQL'
                      : 'Pyodide CPython 3.12 · Monaco Python'}
                  </span>
                )}

                {evalType === 'sql' && (
                  <button
                    type="button"
                    onClick={() => setDirtyDataMode((v) => !v)}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                      dirtyDataMode
                        ? 'tab-active border-transparent'
                        : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-white'
                    }`}
                    title="Execute all 7 isolated SQL scenarios including NULL FKs, tie-breaks, duplicate CDC replays, zero division, and sparse partitions"
                  >
                    <FlaskConical className="h-3.5 w-3.5" />
                    <span>7-Case Dirty Data Suite: {dirtyDataMode ? 'ON' : 'OFF'}</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetStarter}
                  className="btn-secondary inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>

                {(evalType === 'sql' || evalType === 'python') && (
                  <button
                    type="button"
                    onClick={handleFuzzCode}
                    disabled={fuzzing || running}
                    title="Attack your code with All-NULL Keys, Millisecond Ties, Duplicate CDC c/u/d, Empty/Single-Row, Malformed Unicode, and 100x Hot-Key Skew"
                    className="btn-secondary inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                  >
                    {fuzzing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Bug className="h-3.5 w-3.5 text-[#F43F5E]" />
                    )}
                    <span>{fuzzing ? 'Fuzzing...' : 'Fuzz & Break My Code'}</span>
                  </button>
                )}

                <button
                  onClick={
                    evalType === 'sql'
                      ? handleRunSql
                      : evalType === 'python'
                        ? handleRunPython
                        : handleEvaluateRubric
                  }
                  disabled={running}
                  className="btn-primary inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-1.5 text-xs disabled:opacity-60"
                >
                  {running ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {running
                      ? evalType === 'design_rubric'
                        ? 'Grading...'
                        : 'Executing...'
                      : evalType === 'design_rubric'
                        ? 'Evaluate Response (Staff Rubric)'
                        : `Run All ${evalType === 'sql' ? 7 : totalTestCount} Tests`}
                  </span>
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {rightMode === 'studio' && roundNum === 3 ? (
                <SparkUiDebuggerPanel
                  userCode={code}
                  onInsertFix={(snippet) => {
                    handleCodeChange(`${code}\n\n# Spark UI Tuning Fix Reference:\n${snippet}`);
                    setRightMode('editor');
                  }}
                />
              ) : rightMode === 'studio' && roundNum === 4 ? (
                <DimensionalModelingStudio
                  questionTitle={question.title}
                  submissionText={code}
                  onSyncSubmission={(md) => {
                    handleCodeChange(md);
                    setRightMode('editor');
                  }}
                />
              ) : rightMode === 'studio' && (roundNum === 5 || roundNum === 8) ? (
                <ArchitectureWhiteboardStudio
                  questionTitle={question.title}
                  questionPrompt={question.problemStatement}
                  submissionText={code}
                  onSyncSubmission={(md) => {
                    handleCodeChange(md);
                    setRightMode('editor');
                  }}
                />
              ) : rightMode === 'studio' && roundNum === 6 ? (
                <IncidentRcaStarStudio
                  questionTitle={question.title}
                  submissionText={code}
                  onSyncSubmission={(md) => {
                    handleCodeChange(md);
                    setRightMode('editor');
                  }}
                />
              ) : (
                <div className="h-full min-h-[260px]">
                  <Editor
                    height="100%"
                    language={evalType === 'sql' ? 'sql' : evalType === 'python' ? 'python' : 'markdown'}
                    theme={isDark ? 'vs-dark' : 'vs'}
                    value={code}
                    onChange={(val) => handleCodeChange(val ?? '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      wordWrap: evalType === 'design_rubric' ? 'on' : 'off',
                      fontFamily: "'JetBrains Mono', monospace",
                      padding: { top: 12 },
                      scrollBeyondLastLine: false,
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Adversarial Break-My-Code Fuzzer Panel */}
          {fuzzReport && (
            <div className="glass-surface max-h-56 overflow-y-auto rounded-2xl p-4">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
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
                  title="Close fuzz report"
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
                      <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                        {fc.passed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E]" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-[#EF4444]" />
                        )}
                        {fc.vector}
                      </span>
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
                      Mutated Input: {fc.mutatedInputPreview}
                    </pre>
                    {!fc.passed && fc.failingActualSample && (
                      <div className="mt-1 font-mono text-[10px] text-[#EF4444]">
                        Actual: {fc.failingActualSample} · Expected: {fc.failingExpectedSample}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Execution / 6+ Test Runner / Rubric Output Pane */}
          <div className="glass-surface flex min-h-0 flex-[2] flex-col overflow-hidden rounded-2xl">
            {evalType === 'sql' && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
                  <div className="flex gap-1">
                    {[
                      { id: 'cases' as const, label: 'All 7 Edge-Case Tests' },
                      { id: 'diff' as const, label: 'Canonical Output Diff' },
                      { id: 'explain' as const, label: 'EXPLAIN QUERY PLAN' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSqlBottomTab(t.id)}
                        className={`whitespace-nowrap rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                          sqlBottomTab === t.id ? 'tab-active' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {sqlResult && sqlResult.ok && (
                    <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold ${
                          sqlResult.allPassed ? 'text-[#10B981]' : 'text-[#EF4444]'
                        }`}
                      >
                        {sqlResult.allPassed ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        {sqlResult.passedCount}/{sqlResult.totalCount} SQL Cases Passed ({sqlResult.actual?.runtimeMs} ms)
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-auto p-4">
                  {!sqlResult ? (
                    <p className="text-xs text-slate-400">
                      Click &ldquo;Run All 7 Tests&rdquo; to execute against SQLite Wasm across all 7 isolated scenarios (Canonical, Tie-Break, NULL FK, Duplicate CDC, Zero/Extreme Numerics, Reverse Insertion Order, Sparse Partition) and inspect EXPLAIN QUERY PLAN.
                    </p>
                  ) : !sqlResult.ok ? (
                    <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 font-mono text-xs text-[#EF4444]">
                      {sqlResult.error}
                    </div>
                  ) : sqlBottomTab === 'cases' ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {sqlResult.testCaseResults.map((tc, idx) => (
                          <button
                            key={tc.id}
                            type="button"
                            onClick={() => setSelectedSqlCaseIdx(idx)}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              selectedSqlCaseIdx === idx
                                ? 'tab-active border-transparent'
                                : 'border-white/10 bg-black/20 text-slate-300 hover:border-white/25'
                            }`}
                          >
                            {tc.passed ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-[#EF4444]" />
                            )}
                            <span>Case {idx + 1}: {tc.category}</span>
                          </button>
                        ))}
                      </div>

                      {activeSqlCase && (
                        <div className="space-y-3">
                          <div
                            className={`rounded-xl border p-3 text-xs ${
                              activeSqlCase.passed
                                ? 'border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]'
                                : 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]'
                            }`}
                          >
                            <div className="font-semibold">{activeSqlCase.name}</div>
                            <div className="mt-0.5 text-slate-300">{activeSqlCase.description}</div>
                            <div className="mt-1 font-mono text-[11px]">{activeSqlCase.summary}</div>
                          </div>

                          {activeSqlCase.actual && activeSqlCase.expected && (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div>
                                <div className="mb-1.5 text-xs font-semibold text-white">Your Output</div>
                                <SqlResultTable
                                  columns={activeSqlCase.actual.columns}
                                  rows={activeSqlCase.actual.rows}
                                />
                              </div>
                              <div>
                                <div className="mb-1.5 text-xs font-semibold text-slate-300">
                                  Expected Output
                                </div>
                                <SqlResultTable
                                  columns={activeSqlCase.expected.columns}
                                  rows={activeSqlCase.expected.rows}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : sqlBottomTab === 'diff' ? (
                    <div className="space-y-3">
                      {sqlResult.diffSummary && (
                        <div
                          className={`rounded-xl border p-2.5 text-xs ${
                            sqlResult.diffMatched
                              ? 'border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]'
                              : 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]'
                          }`}
                        >
                          {sqlResult.diffSummary}
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <div className="mb-1.5 text-xs font-semibold text-white">Actual Output</div>
                          {sqlResult.actual && (
                            <SqlResultTable columns={sqlResult.actual.columns} rows={sqlResult.actual.rows} />
                          )}
                        </div>
                        <div>
                          <div className="mb-1.5 text-xs font-semibold text-slate-300">Expected Output</div>
                          {sqlResult.expected && (
                            <SqlResultTable columns={sqlResult.expected.columns} rows={sqlResult.expected.rows} />
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <GitBranch className="h-4 w-4 text-white" />
                        <span>SQLite EXPLAIN QUERY PLAN Tree</span>
                      </div>
                      {sqlResult.explainPlan.length === 0 ? (
                        <p className="text-xs text-slate-400">No plan steps available for this statement.</p>
                      ) : (
                        <div className="space-y-2">
                          {sqlResult.explainPlan.map((node, idx) => (
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
              </>
            )}

            {evalType === 'python' && (
              <>
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Terminal className="h-4 w-4 text-white" />
                    <span>Pyodide Automated Test Runner ({totalTestCount} Tests)</span>
                  </div>
                  {pyResult && (
                    <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                      <span className={pyResult.ok && pyResult.allPassed ? 'text-[#10B981]' : 'text-[#EF4444]'}>
                        {pyResult.passedCount}/{pyResult.totalCount} Passed · {pyResult.runtimeMs} ms
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {!pyResult ? (
                    <p className="text-xs text-slate-400">
                      Click &ldquo;Run All {totalTestCount} Tests&rdquo; to execute all {question.testCases.length} visible assertions and {question.hiddenTestCases?.length || 0} hidden boundary edge-case assertions inside Pyodide Wasm.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {pyResult.stderr && (
                        <pre className="overflow-x-auto rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 font-mono text-xs text-[#EF4444]">
                          {pyResult.stderr}
                        </pre>
                      )}
                      {pyResult.stdout && (
                        <div>
                          <div className="mb-1 text-xs text-slate-400">Stdout</div>
                          <pre className="inset-surface overflow-x-auto rounded-xl p-3 font-mono text-xs text-slate-200">
                            {pyResult.stdout}
                          </pre>
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {[...pyResult.tests, ...(pyResult.hiddenTests || [])].map((tc, idx) => (
                          <div
                            key={idx}
                            className="inset-surface flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs"
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
                            <span className="max-w-[140px] truncate font-mono text-[11px] text-slate-400">
                              {tc.detail}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {evalType === 'design_rubric' && (
              <>
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <ShieldAlert className="h-4 w-4 text-white" />
                    <span>Staff Bar-Raiser Rubric Feedback (Pass threshold: 70/100)</span>
                  </div>
                  {rubricResult && (
                    <span
                      className={`font-mono text-xs font-bold tabular-nums ${
                        rubricResult.score >= 70 ? 'text-[#10B981]' : 'text-[#EF4444]'
                      }`}
                    >
                      Score: {rubricResult.score}/100 · {rubricResult.verdict}
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {rubricError && (
                    <div className="mb-3 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-xs text-[#EF4444]">
                      {rubricError}
                    </div>
                  )}
                  {!rubricResult ? (
                    <p className="text-xs leading-relaxed text-slate-400">
                      Use the Interactive Studio tab to build your Star Schema / Architecture Whiteboard / SEV-1 Triage and sync your blueprint, then click &ldquo;Evaluate Response (Staff Rubric)&rdquo; for live Staff grading.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                      <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-3">
                        <div className="mb-1.5 font-semibold text-[#10B981]">Strong Signals</div>
                        <ul className="space-y-1 text-slate-200">
                          {rubricResult.strengths.map((s, i) => (
                            <li key={i}>• {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-3">
                        <div className="mb-1.5 font-semibold text-[#EF4444]">Gaps &amp; Missing Depth</div>
                        <ul className="space-y-1 text-slate-200">
                          {rubricResult.gaps.map((g, i) => (
                            <li key={i}>• {g}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="inset-surface rounded-xl p-3 md:col-span-2">
                        <div className="mb-1 font-semibold text-white">Staff Follow-Up Probe</div>
                        <p className="text-slate-300">{rubricResult.followUpQuestion}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SqlResultTable({
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
                  <td key={cIdx} className="whitespace-nowrap px-3 py-2">
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
