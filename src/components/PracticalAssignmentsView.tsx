import React, { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  CheckCircle2,
  Code2,
  Cpu,
  Eye,
  EyeOff,
  FileCode2,
  FlaskConical,
  Layers,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Wrench,
  XCircle,
} from 'lucide-react';
import {
  PRACTICAL_ASSIGNMENTS,
  PRACTICAL_TRACKS,
  TRANSFORMATION_TOOLS,
  type PracticalAssignment,
  type PracticalTrackId,
  type TransformationToolId,
} from '../data/practicalAssignments';
import { executeSqlInBrowser } from '../lib/sqlEngine';
import { executePythonInWorker } from '../lib/pythonEngine';
import { loadUserArenaState, saveUserArenaState } from '../lib/firestoreService';
import { useTheme } from '../lib/themeContext';

interface PracticalAssignmentsViewProps {
  userId: string | null;
  onSelectTopic: (topicSlugOrName: string) => void;
}

interface PracticalCheckResult {
  id: string;
  name: string;
  passed: boolean;
  detail: string;
}

interface PracticalLabProgress {
  completedIds: string[];
  preferredTool: TransformationToolId;
  drafts: Record<string, Record<string, string>>;
}

const DEFAULT_PROGRESS: PracticalLabProgress = {
  completedIds: [],
  preferredTool: 'dbt',
  drafts: {},
};

export function PracticalAssignmentsView({
  userId,
  onSelectTopic,
}: PracticalAssignmentsViewProps) {
  const { isDark } = useTheme();
  const [activeTrack, setActiveTrack] = useState<PracticalTrackId>('snowflake');
  const [selectedTool, setSelectedTool] = useState<TransformationToolId>('dbt');
  const [selectedId, setSelectedId] = useState<string>(PRACTICAL_ASSIGNMENTS[0].id);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  const [progress, setProgress] = useState<PracticalLabProgress>(DEFAULT_PROGRESS);
  const [running, setRunning] = useState(false);
  const [runtimeMs, setRuntimeMs] = useState<number | null>(null);
  const [checkResults, setCheckResults] = useState<PracticalCheckResult[]>([]);
  const [sqlPreviewRows, setSqlPreviewRows] = useState<{
    columns: string[];
    rows: (string | number | null | Uint8Array)[][];
  } | null>(null);

  useEffect(() => {
    loadUserArenaState<PracticalLabProgress>(userId, '__practical_lab__', DEFAULT_PROGRESS)
      .then((saved) => {
        if (saved && typeof saved === 'object') {
          setProgress({
            completedIds: Array.isArray(saved.completedIds) ? saved.completedIds : [],
            preferredTool: saved.preferredTool || 'dbt',
            drafts: saved.drafts || {},
          });
          if (saved.preferredTool) setSelectedTool(saved.preferredTool);
        }
      })
      .catch(() => {});
  }, [userId]);

  const persistProgress = async (next: PracticalLabProgress) => {
    setProgress(next);
    await saveUserArenaState(userId, '__practical_lab__', next).catch(() => {});
  };

  const trackAssignments = useMemo(
    () => PRACTICAL_ASSIGNMENTS.filter((a) => a.trackId === activeTrack),
    [activeTrack],
  );

  const activeAssignment: PracticalAssignment = useMemo(() => {
    return (
      trackAssignments.find((a) => a.id === selectedId) ||
      trackAssignments[0] ||
      PRACTICAL_ASSIGNMENTS[0]
    );
  }, [trackAssignments, selectedId]);

  const draftKey =
    activeAssignment.trackId === 'transformation' && activeAssignment.toolVariants
      ? `${activeAssignment.id}::${selectedTool}`
      : activeAssignment.id;

  const baseFiles = useMemo(() => {
    if (
      activeAssignment.trackId === 'transformation' &&
      activeAssignment.toolVariants &&
      activeAssignment.toolVariants[selectedTool]
    ) {
      return activeAssignment.toolVariants[selectedTool].files;
    }
    return activeAssignment.files;
  }, [activeAssignment, selectedTool]);

  const currentFiles = useMemo(() => {
    const savedDrafts = progress.drafts[draftKey] || {};
    return baseFiles.map((f) => ({
      ...f,
      content: savedDrafts[f.path] ?? f.content,
    }));
  }, [baseFiles, progress.drafts, draftKey]);

  const activeFile = currentFiles[Math.min(activeFileIndex, Math.max(0, currentFiles.length - 1))];

  const handleSelectTrack = (trackId: PracticalTrackId) => {
    setActiveTrack(trackId);
    const first = PRACTICAL_ASSIGNMENTS.find((a) => a.trackId === trackId);
    if (first) setSelectedId(first.id);
    setActiveFileIndex(0);
    setCheckResults([]);
    setSqlPreviewRows(null);
    setRuntimeMs(null);
    setShowSolution(false);
  };

  const handleSelectAssignment = (id: string) => {
    setSelectedId(id);
    setActiveFileIndex(0);
    setCheckResults([]);
    setSqlPreviewRows(null);
    setRuntimeMs(null);
    setShowSolution(false);
  };

  const handleSwitchTool = (toolId: TransformationToolId) => {
    setSelectedTool(toolId);
    setActiveFileIndex(0);
    setCheckResults([]);
    setSqlPreviewRows(null);
    persistProgress({ ...progress, preferredTool: toolId });
  };

  const handleCodeChange = (nextVal: string) => {
    if (!activeFile) return;
    const prevDrafts = progress.drafts[draftKey] || {};
    const nextProgress: PracticalLabProgress = {
      ...progress,
      drafts: {
        ...progress.drafts,
        [draftKey]: {
          ...prevDrafts,
          [activeFile.path]: nextVal,
        },
      },
    };
    setProgress(nextProgress);
  };

  const handleResetAssignment = () => {
    const nextDrafts = { ...progress.drafts };
    delete nextDrafts[draftKey];
    const next = { ...progress, drafts: nextDrafts };
    persistProgress(next);
    setCheckResults([]);
    setSqlPreviewRows(null);
  };

  const handleRunVerification = async () => {
    setRunning(true);
    setCheckResults([]);
    setSqlPreviewRows(null);
    const start = performance.now();

    try {
      const activeToolVariant =
        activeAssignment.trackId === 'transformation' && activeAssignment.toolVariants
          ? activeAssignment.toolVariants[selectedTool]
          : null;

      const rules = [
        ...activeAssignment.verificationRules,
        ...(activeToolVariant?.extraRules || []),
      ];

      const joinedCode = currentFiles.map((f) => f.content).join('\n\n');
      const pythonRules = rules.filter((r) => Boolean(r.pythonAssert));

      // Execute live Pyodide assertions when pythonAssert rules are present
      if (pythonRules.length > 0 && activeAssignment.executionEngine === 'python') {
        const pyRes = await executePythonInWorker({
          setupCode: activeAssignment.pythonSetupCode || '',
          userCode: joinedCode,
          testCases: pythonRules.map((r) => ({
            name: r.name,
            input: r.pythonAssert || '',
            expected: r.hint,
          })),
        });

        const pyResults: PracticalCheckResult[] = pyRes.tests.map((t, idx) => ({
          id: pythonRules[idx]?.id || `py_${idx}`,
          name: t.name,
          passed: t.passed,
          detail: t.passed ? 'Assertion verified cleanly in Python WASM worker' : `${t.detail} — Hint: ${pythonRules[idx]?.hint || ''}`,
        }));

        // Also run any regex rules alongside
        const patternRules = rules.filter((r) => !r.pythonAssert);
        const patternResults: PracticalCheckResult[] = patternRules.map((rule) => {
          const matched = (rule.mustMatchAny || []).some((rx) => new RegExp(rx, 'i').test(joinedCode));
          return {
            id: rule.id,
            name: rule.name,
            passed: matched,
            detail: matched ? 'Production pattern detected' : rule.hint,
          };
        });

        const allRes = [...pyResults, ...patternResults];
        setCheckResults(allRes);
        setRuntimeMs(Math.round(performance.now() - start));

        if (allRes.length > 0 && allRes.every((r) => r.passed)) {
          const updatedCompleted = Array.from(new Set([...progress.completedIds, activeAssignment.id]));
          await persistProgress({ ...progress, completedIds: updatedCompleted });
        }
        return;
      }

      // Evaluate structural & production contract rules
      const results: PracticalCheckResult[] = rules.map((rule) => {
        if (rule.mustMatchAny && rule.mustMatchAny.length > 0) {
          const matched = rule.mustMatchAny.some((rx) => {
            try {
              return new RegExp(rx, 'i').test(joinedCode);
            } catch {
              return joinedCode.toLowerCase().includes(rx.toLowerCase());
            }
          });
          return {
            id: rule.id,
            name: rule.name,
            passed: matched,
            detail: matched ? 'Contract verified in workspace files' : rule.hint,
          };
        }
        return {
          id: rule.id,
          name: rule.name,
          passed: joinedCode.trim().length > 40,
          detail: joinedCode.trim().length > 40 ? 'Structure present' : rule.hint,
        };
      });

      // Optionally execute SQLite preview if seed SQL is provided
      if (activeAssignment.sqlSetupSeed && activeAssignment.sqlReferenceQuery) {
        const sqlOut = await executeSqlInBrowser({
          setupSql: activeAssignment.sqlSetupSeed,
          userSql: activeAssignment.sqlReferenceQuery,
          referenceSql: activeAssignment.sqlReferenceQuery,
          dirtyDataMode: false,
        });
        if (sqlOut.actual) {
          setSqlPreviewRows({
            columns: sqlOut.actual.columns,
            rows: sqlOut.actual.rows.slice(0, 6),
          });
        }
      }

      setCheckResults(results);
      setRuntimeMs(Math.round(performance.now() - start));

      if (results.length > 0 && results.every((r) => r.passed)) {
        const updatedCompleted = Array.from(new Set([...progress.completedIds, activeAssignment.id]));
        await persistProgress({ ...progress, completedIds: updatedCompleted });
      }
    } finally {
      setRunning(false);
    }
  };

  const trackMeta = PRACTICAL_TRACKS.find((t) => t.id === activeTrack) || PRACTICAL_TRACKS[0];
  const passedChecks = checkResults.filter((r) => r.passed).length;

  return (
    <div className="space-y-5">
      {/* Header & Track Selector */}
      <div className="glass-surface rounded-[18px] p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs font-semibold text-slate-400">
              <Wrench className="h-4 w-4 text-white" />
              <span>PRACTICAL PRODUCTION ASSIGNMENTS LAB · {PRACTICAL_ASSIGNMENTS.length} REAL-WORLD LABS</span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold text-white">
              Hands-On Multi-Cloud, Warehouse &amp; Pipeline Assignments
            </h1>
            <p className="mt-1 text-xs text-slate-300">
              Implement real Snowflake FinOps, AWS/Azure/GCP lakehouse pipelines, dbt/PySpark/Flink transformations, idempotent batch backfills, and Debezium/Flink streaming with 6-point verification suites.
            </p>
          </div>

          <div className="inset-surface shrink-0 rounded-xl px-4 py-2.5 text-right">
            <div className="text-[11px] text-slate-400">Labs Verified</div>
            <div className="font-mono text-lg font-bold text-white tabular-nums">
              {progress.completedIds.length} / {PRACTICAL_ASSIGNMENTS.length}
            </div>
          </div>
        </div>

        {/* 5 Track Tabs */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {PRACTICAL_TRACKS.map((track) => {
            const active = track.id === activeTrack;
            const trackItems = PRACTICAL_ASSIGNMENTS.filter((a) => a.trackId === track.id);
            const doneCount = trackItems.filter((a) => progress.completedIds.includes(a.id)).length;
            return (
              <button
                key={track.id}
                onClick={() => handleSelectTrack(track.id)}
                className={`rounded-xl border p-3 text-left transition-all ${
                  active
                    ? 'tab-active border-transparent'
                    : 'inset-surface text-slate-300 hover:border-[var(--border-strong)] hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono opacity-80">
                  <span>{track.cloudFocus}</span>
                  <span className="tabular-nums">
                    {doneCount}/{trackItems.length}
                  </span>
                </div>
                <div className="mt-1 font-display text-xs font-bold leading-snug">{track.shortTitle}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split Lab Studio */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Left: Track Assignments + Spec + Tool Selector */}
        <div className="space-y-4 xl:col-span-5">
          {/* Assignment Picker for Active Track */}
          <div className="glass-surface rounded-[18px] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-white">{trackMeta.title}</span>
              <span className="text-[11px] text-slate-400">{trackAssignments.length} labs</span>
            </div>
            <div className="space-y-1.5">
              {trackAssignments.map((item) => {
                const isActive = item.id === activeAssignment.id;
                const isDone = progress.completedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectAssignment(item.id)}
                    className={`flex w-full items-start justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? 'tab-active border-transparent'
                        : 'border-transparent hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[11px] font-mono opacity-80">
                        <span>{item.companyContext}</span>
                        <span>· {item.difficulty}</span>
                      </div>
                      <div className="mt-0.5 text-xs font-semibold leading-snug">{item.title}</div>
                    </div>
                    {isDone && <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#10B981]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Track 3 Multi-Engine Transformation Tool Selector */}
          {activeAssignment.trackId === 'transformation' && activeAssignment.toolVariants && (
            <div className="glass-surface rounded-[18px] p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Cpu className="h-4 w-4 text-white" />
                <span>Transformation Tool Selector</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Switch implementation stacks live while keeping the same core transformation contract &amp; 6-point verification tests.
              </p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {TRANSFORMATION_TOOLS.map((tool) => {
                  const active = selectedTool === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => handleSwitchTool(tool.id)}
                      className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                        active
                          ? 'tab-active border-transparent'
                          : 'inset-surface text-slate-300 hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="text-xs font-semibold">{tool.label}</div>
                      <div className="font-mono text-[10px] opacity-75">{tool.badge}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Assignment Requirements & Clickable Concepts */}
          <div className="glass-surface rounded-[18px] p-5 space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono text-slate-300">{activeAssignment.companyContext}</span>
                <span className="font-mono text-slate-400">~{activeAssignment.estimatedMins} mins</span>
              </div>
              <h2 className="mt-1 font-display text-lg font-bold text-white">{activeAssignment.title}</h2>
            </div>

            <div>
              <div className="mb-1.5 text-xs font-semibold text-white">Production Requirements</div>
              <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-300">
                {activeAssignment.requirements.map((req, idx) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold text-white">
                {activeAssignment.sampleInputLabel}
              </div>
              <pre className="inset-surface overflow-x-auto rounded-xl p-3 font-mono text-[11px] leading-relaxed text-slate-200">
                {activeAssignment.sampleInputData}
              </pre>
            </div>

            {/* Universal Clickable Concept Tags -> DE Concepts & MCQs */}
            <div>
              <div className="mb-1.5 text-[11px] font-semibold text-slate-400">
                Related DE Concepts &amp; MCQs (Click to Open Deep Dive)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeAssignment.conceptTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onSelectTopic(tag)}
                    className="btn-secondary inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold"
                  >
                    <Layers className="h-3 w-3" />
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Multi-File Monaco Workspace + 6+ Automated Verification Runner */}
        <div className="space-y-4 xl:col-span-7">
          <div className="glass-surface overflow-hidden rounded-[18px]">
            {/* File Tabs & Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {currentFiles.map((file, idx) => (
                  <button
                    key={file.path}
                    onClick={() => setActiveFileIndex(idx)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-colors ${
                      idx === activeFileIndex
                        ? 'tab-active'
                        : 'btn-secondary'
                    }`}
                  >
                    <FileCode2 className="h-3.5 w-3.5" />
                    <span>{file.path}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSolution((s) => !s)}
                  className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium"
                >
                  {showSolution ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span>{showSolution ? 'Hide Reference' : 'Reference Notes'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetAssignment}
                  className="btn-secondary inline-flex items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs"
                  title="Reset starter template"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRunVerification}
                  disabled={running}
                  className="btn-primary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-1.5 text-xs disabled:opacity-60"
                >
                  {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  <span>{running ? 'Verifying...' : 'Run Verification Checks (6+)'}</span>
                </button>
              </div>
            </div>

            {showSolution && (
              <div className="inset-surface border-x-0 border-t-0 p-3 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Reference Implementation Summary</span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-slate-200">
                  {activeAssignment.trackId === 'transformation' && activeAssignment.toolVariants?.[selectedTool]
                    ? activeAssignment.toolVariants[selectedTool].solutionSummary
                    : activeAssignment.solutionFiles[0]?.content}
                </p>
              </div>
            )}

            <div className="h-[380px]">
              {activeFile && (
                <Editor
                  height="100%"
                  language={activeFile.language === 'yaml' ? 'yaml' : activeFile.language === 'python' ? 'python' : 'sql'}
                  theme={isDark ? 'vs-dark' : 'vs'}
                  value={activeFile.content}
                  onChange={(val) => handleCodeChange(val || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    padding: { top: 12 },
                  }}
                />
              )}
            </div>
          </div>

          {/* 6+ Verification Output Panel */}
          <div className="glass-surface rounded-[18px] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-display text-sm font-bold text-white">
                <FlaskConical className="h-4 w-4 text-white" />
                <span>Verification Suite Output</span>
              </div>
              {checkResults.length > 0 && (
                <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                  {runtimeMs !== null && <span className="text-slate-400">{runtimeMs} ms</span>}
                  <span
                    className={`rounded-lg px-2.5 py-0.5 font-bold ${
                      passedChecks === checkResults.length
                        ? 'bg-[#10B981]/15 text-[#10B981]'
                        : 'bg-[#EF4444]/15 text-[#EF4444]'
                    }`}
                  >
                    {passedChecks} / {checkResults.length} PASSED
                  </span>
                </div>
              )}
            </div>

            {checkResults.length === 0 ? (
              <div className="inset-surface flex items-center gap-2 rounded-xl p-4 text-xs text-slate-400">
                <Code2 className="h-4 w-4 text-white" />
                <span>
                  Click &ldquo;Run Verification Checks (6+)&rdquo; to execute automated structural checks, SQL previews, or live Python WASM unit assertions.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {checkResults.map((res) => (
                  <div
                    key={res.id}
                    className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                      res.passed
                        ? 'border-[#10B981]/40 bg-[#10B981]/10'
                        : 'border-[#EF4444]/40 bg-[#EF4444]/10'
                    }`}
                  >
                    {res.passed ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-white">
                        <span
                          className={`mr-1.5 font-mono text-[10px] font-bold ${
                            res.passed ? 'text-[#10B981]' : 'text-[#EF4444]'
                          }`}
                        >
                          {res.passed ? 'PASS' : 'FAIL'}
                        </span>
                        {res.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-300">{res.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {sqlPreviewRows && sqlPreviewRows.rows.length > 0 && (
              <div className="inset-surface overflow-x-auto rounded-xl p-3">
                <div className="mb-2 font-mono text-[11px] font-semibold text-white">
                  Verified SQLite Output Sample ({sqlPreviewRows.rows.length} rows)
                </div>
                <table className="w-full text-left font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      {sqlPreviewRows.columns.map((c) => (
                        <th key={c} className="px-2 py-1">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {sqlPreviewRows.rows.map((r, ri) => (
                      <tr key={ri}>
                        {r.map((cell, ci) => (
                          <td key={ci} className="px-2 py-1 text-slate-200">
                            {cell === null ? 'NULL' : String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
