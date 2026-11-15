import React, { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertTriangle,
  Bookmark,
  BrainCircuit,
  CheckCircle2,
  Database,
  GitBranch,
  Play,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import type { ExperienceTier, Question } from '../types/platform';
import { executeSqlInBrowser, type SqlExecutionResponse } from '../lib/sqlEngine';
import { GenerateBatchButton } from './GenerateBatchButton';

interface SqlArenaViewProps {
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

export function SqlArenaView({
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
}: SqlArenaViewProps) {
  const sqlQuestions = useMemo(
    () => questions.filter((q) => q.domain === 'Analytical SQL' || q.roundType.toLowerCase().includes('sql')),
    [questions],
  );

  const activeQ = selectedQuestion && sqlQuestions.some((q) => q.uniqueId === selectedQuestion.uniqueId)
    ? selectedQuestion
    : sqlQuestions[0];

  const [code, setCode] = useState(activeQ?.starterCode || '');
  const [leftTab, setLeftTab] = useState<'problem' | 'schema' | 'solution'>('problem');
  const [bottomTab, setBottomTab] = useState<'results' | 'diff' | 'explain'>('results');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SqlExecutionResponse | null>(null);
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
    });
    setResult(res);
    setRunning(false);
    onContextUpdate(code, res.error || (res.diffMatched === false ? res.diffSummary || '' : ''));

    if (res.ok && res.diffMatched) {
      onMarkSolved(activeQ, code, res.actual?.runtimeMs ?? 1);
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
              className="w-full rounded-xl border border-white/10 bg-[#07080C]/80 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#2DD4BF]"
            />
            <div className="mt-2 flex max-h-36 flex-col gap-1 overflow-y-auto pr-1">
              {filteredList.map((q) => (
                <button
                  key={q.uniqueId}
                  onClick={() => onSelectQuestion(q)}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                    q.uniqueId === activeQ.uniqueId
                      ? 'bg-[#2DD4BF]/15 text-[#2DD4BF]'
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
                title="Schedule SM-2 Spaced Repetition"
                className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition-colors hover:border-[#A78BFA]/50 hover:text-[#A78BFA]"
              >
                <BrainCircuit className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onToggleBookmark(activeQ.uniqueId)}
                title="Bookmark problem"
                className={`rounded-lg border border-white/10 p-1.5 transition-colors ${
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

            {leftTab === 'problem' && (
              <div className="space-y-4">
                <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeQ.problemStatement}</ReactMarkdown>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#07080C]/70 p-3 text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">Practical Relevance:</span> {activeQ.practicalRelevance}
                </div>
                <div className="text-xs text-slate-400">
                  Companies: {activeQ.companyTags.join(', ')}
                </div>
              </div>
            )}

            {leftTab === 'schema' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-[#2DD4BF]">
                  <Database className="h-4 w-4" />
                  <span>SQLite DDL &amp; Seed Dataset</span>
                </div>
                <pre className="overflow-x-auto rounded-xl border border-white/10 bg-[#07080C] p-3 font-mono text-xs leading-relaxed text-slate-300">
                  {activeQ.setupSchemaOrEnv}
                </pre>
              </div>
            )}

            {leftTab === 'solution' && (
              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 text-xs font-semibold text-[#2DD4BF]">Reference Solution</div>
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
            )}
          </div>
        </div>

        {/* Right Editor & Results / EXPLAIN Visualizer */}
        <div className="flex flex-col gap-4 xl:col-span-7">
          <div className="glass-surface overflow-hidden rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
              <span className="font-mono text-xs text-slate-400">SQLite Wasm 3.x · Monaco SQL</span>
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
                  <Play className="h-3.5 w-3.5" />
                  <span>{running ? 'Running...' : 'Run & Verify'}</span>
                </button>
              </div>
            </div>

            <div className="h-72 w-full bg-[#07080C]">
              <Editor
                height="100%"
                defaultLanguage="sql"
                theme="vs-dark"
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

          {/* Output & Visual Execution Plan Panel */}
          <div className="glass-surface overflow-hidden rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
              <div className="flex gap-1">
                {[
                  { id: 'results' as const, label: 'Actual Output' },
                  { id: 'diff' as const, label: 'Expected vs Actual' },
                  { id: 'explain' as const, label: 'Execution Plan Tree' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setBottomTab(t.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      bottomTab === t.id ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {result && result.ok && (
                <div className="flex items-center gap-2 text-xs">
                  {result.diffMatched ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#34D399]">
                      <CheckCircle2 className="h-4 w-4" />
                      Accepted · {result.actual?.runtimeMs} ms
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#FBBF24]">
                      <XCircle className="h-4 w-4" />
                      Output Differs · {result.actual?.runtimeMs} ms
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="max-h-80 overflow-auto p-4">
              {!result ? (
                <p className="text-xs text-slate-400">
                  Click &ldquo;Run &amp; Verify&rdquo; to execute your SQL query in-browser, compare against expected rows, and inspect the visual EXPLAIN QUERY PLAN tree.
                </p>
              ) : !result.ok ? (
                <div className="rounded-xl border border-[#FB7185]/30 bg-[#FB7185]/10 p-3 font-mono text-xs text-[#FB7185]">
                  {result.error}
                </div>
              ) : bottomTab === 'results' && result.actual ? (
                <div>
                  <div className="mb-2 font-mono text-xs text-slate-400 tabular-nums">
                    {result.actual.rowCount} rows returned in {result.actual.runtimeMs} ms
                  </div>
                  <ResultTable columns={result.actual.columns} rows={result.actual.rows} />
                </div>
              ) : bottomTab === 'diff' ? (
                <div className="space-y-4">
                  {result.diffSummary && (
                    <div
                      className={`rounded-xl border p-3 text-xs ${
                        result.diffMatched
                          ? 'border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399]'
                          : 'border-[#FBBF24]/30 bg-[#FBBF24]/10 text-[#FBBF24]'
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
                      <div className="mb-1.5 text-xs font-semibold text-[#2DD4BF]">Expected Output</div>
                      {result.expected && <ResultTable columns={result.expected.columns} rows={result.expected.rows} />}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <GitBranch className="h-4 w-4 text-[#818CF8]" />
                    <span>SQLite EXPLAIN QUERY PLAN Tree</span>
                  </div>
                  {result.explainPlan.length === 0 ? (
                    <p className="text-xs text-slate-400">No plan steps available for this statement.</p>
                  ) : (
                    <div className="space-y-2">
                      {result.explainPlan.map((node, idx) => (
                        <div
                          key={`${node.id}-${idx}`}
                          className="rounded-xl border border-white/10 bg-[#07080C]/80 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-semibold text-white">{node.detail}</span>
                            <span
                              className={`shrink-0 font-mono text-[11px] ${
                                node.nodeType === 'SCAN' || node.nodeType === 'TEMP_BTREE'
                                  ? 'text-[#FBBF24]'
                                  : node.nodeType === 'INDEX'
                                    ? 'text-[#34D399]'
                                    : 'text-[#818CF8]'
                              }`}
                            >
                              {node.nodeType}
                            </span>
                          </div>
                          {node.warning && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#FBBF24]">
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
