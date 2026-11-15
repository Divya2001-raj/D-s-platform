import React, { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bookmark,
  BrainCircuit,
  CheckCircle2,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  XCircle,
} from 'lucide-react';
import type { ExperienceTier, Question } from '../types/platform';
import { executePythonInWorker, type PythonExecutionResponse } from '../lib/pythonEngine';
import { GenerateBatchButton } from './GenerateBatchButton';

interface PythonArenaViewProps {
  mode: 'python' | 'labs';
  questions: Question[];
  selectedQuestion: Question | null;
  onSelectQuestion: (q: Question) => void;
  solvedIds: string[];
  bookmarks: string[];
  experienceTier: ExperienceTier;
  onMarkSolved: (q: Question, code: string, runtimeMs: number) => void;
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
  onToggleBookmark,
  onScheduleSM2,
  onAddGeneratedQuestions,
  onContextUpdate,
  onOpenCopilotWithPrompt,
}: PythonArenaViewProps) {
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
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PythonExecutionResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (activeQ) {
      setCode(activeQ.starterCode);
      setResult(null);
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
    });
    setResult(res);
    setRunning(false);
    const firstErr = res.stderr || res.tests.find((t) => !t.passed)?.detail || '';
    onContextUpdate(code, firstErr);

    if (res.ok && res.allPassed) {
      onMarkSolved(activeQ, code, res.runtimeMs);
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
              className="w-full rounded-xl border border-white/10 bg-[#07080C]/80 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#818CF8]"
            />
            <div className="mt-2 flex max-h-36 flex-col gap-1 overflow-y-auto pr-1">
              {filteredList.map((q) => (
                <button
                  key={q.uniqueId}
                  onClick={() => onSelectQuestion(q)}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                    q.uniqueId === activeQ.uniqueId
                      ? 'bg-[#818CF8]/20 text-[#818CF8]'
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
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    leftTab === t ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onScheduleSM2(activeQ)}
                title="Schedule SM-2 Review"
                className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:border-[#A78BFA]/50 hover:text-[#A78BFA]"
              >
                <BrainCircuit className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onToggleBookmark(activeQ.uniqueId)}
                title="Bookmark"
                className={`rounded-lg border border-white/10 p-1.5 ${
                  isBookmarked ? 'border-[#FBBF24]/50 text-[#FBBF24]' : 'text-slate-400 hover:text-white'
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
                <span
                  className={
                    activeQ.difficulty === 'Hard'
                      ? 'text-[#FB7185]'
                      : activeQ.difficulty === 'Medium'
                        ? 'text-[#FBBF24]'
                        : 'text-[#34D399]'
                  }
                >
                  {activeQ.difficulty}
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeQ.experienceLevel}</span>
                {isSolved && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#34D399]">Verified Solved</span>
                  </>
                )}
              </div>
              <h2 className="mt-1 font-display text-lg font-bold text-white">{activeQ.title}</h2>
              {activeQ.sourceType === 'ai_generated_practice' && (
                <p className="mt-1 text-xs text-[#A78BFA]">AI-Generated Practice · {activeQ.sourceReference}</p>
              )}
            </div>

            {leftTab === 'problem' ? (
              <div className="space-y-4">
                <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeQ.problemStatement}</ReactMarkdown>
                </div>
                {activeQ.testCases.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-xs font-semibold text-white">Test Assertions</div>
                    <pre className="overflow-x-auto rounded-xl border border-white/10 bg-[#07080C] p-3 font-mono text-xs text-slate-300">
                      {activeQ.testCases.map((tc) => `# ${tc.name}\n${tc.input}`).join('\n\n')}
                    </pre>
                  </div>
                )}
                <div className="rounded-xl border border-white/10 bg-[#07080C]/70 p-3 text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">Engineering Context:</span> {activeQ.practicalRelevance}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 text-xs font-semibold text-[#818CF8]">Optimal Solution</div>
                  <pre className="overflow-x-auto rounded-xl border border-white/10 bg-[#07080C] p-3 font-mono text-xs text-slate-200">
                    {activeQ.detailedSolution}
                  </pre>
                  <button
                    onClick={() => setCode(activeQ.detailedSolution)}
                    className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCode(activeQ.starterCode);
                    setResult(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={onOpenCopilotWithPrompt}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#A78BFA]/40 bg-[#A78BFA]/10 px-3 py-1.5 text-xs font-medium text-[#A78BFA] hover:bg-[#A78BFA]/20"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Ask Copilot</span>
                </button>
                <button
                  onClick={handleRun}
                  disabled={running}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#2DD4BF] to-[#818CF8] px-4 py-1.5 text-xs font-semibold text-[#07080C] hover:opacity-95 disabled:opacity-60"
                >
                  {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  <span>{running ? 'Running Wasm...' : 'Run Tests'}</span>
                </button>
              </div>
            </div>

            <div className="h-80 w-full bg-[#07080C]">
              <Editor
                height="100%"
                defaultLanguage="python"
                theme="vs-dark"
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

          {/* Test Results Panel */}
          <div className="glass-surface rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Terminal className="h-4 w-4 text-[#818CF8]" />
                <span>Automated Test Runner &amp; Stdout</span>
              </div>
              {result && (
                <span
                  className={`font-mono text-xs tabular-nums ${
                    result.ok && result.allPassed ? 'text-[#34D399]' : 'text-[#FB7185]'
                  }`}
                >
                  {result.ok && result.allPassed ? 'All Tests Passed' : 'Failed'} · {result.runtimeMs} ms
                </span>
              )}
            </div>

            {!result ? (
              <p className="text-xs text-slate-400">
                First execution initializes the isolated Pyodide WebAssembly Python runtime in a background Web Worker (~1–3s), then subsequent runs execute in milliseconds.
              </p>
            ) : (
              <div className="space-y-3">
                {result.stderr && (
                  <pre className="overflow-x-auto rounded-xl border border-[#FB7185]/30 bg-[#FB7185]/10 p-3 font-mono text-xs text-[#FB7185]">
                    {result.stderr}
                  </pre>
                )}
                {result.stdout && (
                  <div>
                    <div className="mb-1 text-xs text-slate-400">Stdout</div>
                    <pre className="overflow-x-auto rounded-xl border border-white/10 bg-[#07080C] p-3 font-mono text-xs text-slate-200">
                      {result.stdout}
                    </pre>
                  </div>
                )}
                <div className="space-y-2">
                  {result.tests.map((tc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-[#07080C]/80 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {tc.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-[#34D399]" />
                        ) : (
                          <XCircle className="h-4 w-4 text-[#FB7185]" />
                        )}
                        <span className="font-medium text-white">{tc.name}</span>
                      </div>
                      <span className="font-mono text-slate-400">{tc.detail}</span>
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
