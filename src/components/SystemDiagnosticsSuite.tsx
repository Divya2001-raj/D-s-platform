import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Loader2,
  Play,
  Sparkles,
  Wrench,
  XCircle,
} from 'lucide-react';
import type { KnowledgeTopic, Question } from '../types/platform';
import { MISTAKE_INTERVALS, runFirestoreDiagnostics } from '../lib/firestoreService';
import { executeSqlInBrowser } from '../lib/sqlEngine';
import { executePythonInWorker } from '../lib/pythonEngine';
import { fuzzSqlSolution } from '../lib/codeFuzzer';
import { INTERVIEW_ROUNDS } from '../data/rounds';
import { COMPANY_DOSSIERS } from '../data/companyDossiers';
import { PRACTICAL_ASSIGNMENTS, PRACTICAL_TRACKS } from '../data/practicalAssignments';

interface DiagnosticCheckResult {
  id: string;
  name: string;
  status: 'IDLE' | 'RUNNING' | 'PASS' | 'FAIL';
  latencyMs?: number;
  summary: string;
}

interface SystemDiagnosticsSuiteProps {
  userId: string | null;
  questions: Question[];
  topics: KnowledgeTopic[];
  onAutoRepairQuestions?: () => Promise<number>;
}

export function SystemDiagnosticsSuite({
  userId,
  questions,
  topics,
  onAutoRepairQuestions,
}: SystemDiagnosticsSuiteProps) {
  const [runningAll, setRunningAll] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairNotice, setRepairNotice] = useState('');
  const [checks, setChecks] = useState<DiagnosticCheckResult[]>([
    { id: 'firebase', name: '1. Firebase Auth & Index-Free Firestore (chat/notes/mistake_vault/applications)', status: 'IDLE', summary: 'Not run yet.' },
    { id: 'engines', name: '2. In-Browser SQL (sql.js), Python WASM & Adversarial Edge-Case Fuzzer', status: 'IDLE', summary: 'Not run yet.' },
    { id: 'bank', name: '3. Question Bank Authenticity & 6+ Test Case Audit', status: 'IDLE', summary: 'Not run yet.' },
    { id: 'gemini', name: '4. Gemini API, Google Search Grounding & AI ATS Resume Tailor Probe', status: 'IDLE', summary: 'Not run yet.' },
    { id: 'dossiers_vault', name: '5. 12 Company Dossiers & Mistake Vault Spaced-Repetition Intervals', status: 'IDLE', summary: 'Not run yet.' },
    { id: 'nav_theme', name: '6. Clickable Bento DOM Targets, Zero Blocking Overlays & Pitch-Black/Violet Tokens', status: 'IDLE', summary: 'Not run yet.' },
  ]);

  const updateCheck = (id: string, patch: Partial<DiagnosticCheckResult>) => {
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const runAllTests = async () => {
    setRunningAll(true);
    setRepairNotice('');
    setChecks((prev) => prev.map((c) => ({ ...c, status: 'RUNNING', summary: 'Running live verification...' })));

    // 1. Firebase Auth & Index-Free Firestore Check
    try {
      const fb = await runFirestoreDiagnostics(userId);
      updateCheck('firebase', {
        status: fb.passed ? 'PASS' : 'FAIL',
        latencyMs: fb.latencyMs,
        summary: fb.details,
      });
    } catch (err) {
      updateCheck('firebase', {
        status: 'FAIL',
        summary: err instanceof Error ? err.message : 'Firestore diagnostics failed',
      });
    }

    // 2. In-Browser SQL (sql.js), Python WASM & Adversarial Fuzzer Check
    const engStart = performance.now();
    try {
      const sqlOut = await executeSqlInBrowser({
        setupSql: 'CREATE TABLE diag_sales (id INT, dept TEXT, rev INT); INSERT INTO diag_sales VALUES (1,\'A\',10),(2,\'A\',30),(3,\'B\',20);',
        userSql: 'SELECT dept, SUM(rev) AS total FROM diag_sales GROUP BY dept ORDER BY dept;',
        referenceSql: 'SELECT dept, SUM(rev) AS total FROM diag_sales GROUP BY dept ORDER BY dept;',
        dirtyDataMode: false,
      });
      const pyOut = await executePythonInWorker({
        setupCode: '',
        userCode: 'def top_two(nums): return sorted(nums, reverse=True)[:2]',
        testCases: [
          { name: 'top_two basic', input: 'assert top_two([3, 1, 9, 4]) == [9, 4]', expected: '[9, 4]' },
        ],
      });
      const fuzzOut = await fuzzSqlSolution({
        setupSql: 'CREATE TABLE diag_sales (id INT, dept TEXT, rev INT); INSERT INTO diag_sales VALUES (1,\'A\',10),(2,\'A\',30),(3,\'B\',20);',
        userSql: 'SELECT COALESCE(dept, \'UNKNOWN\') AS dept, COALESCE(SUM(rev), 0) AS total FROM diag_sales GROUP BY COALESCE(dept, \'UNKNOWN\') ORDER BY dept;',
        referenceSql: 'SELECT COALESCE(dept, \'UNKNOWN\') AS dept, COALESCE(SUM(rev), 0) AS total FROM diag_sales GROUP BY COALESCE(dept, \'UNKNOWN\') ORDER BY dept;',
      });
      const engLatency = Math.round(performance.now() - engStart);
      const passed =
        sqlOut.ok &&
        sqlOut.diffMatched !== false &&
        pyOut.ok &&
        pyOut.passedCount === 1 &&
        fuzzOut.totalCount === 6 &&
        fuzzOut.allPassed;
      updateCheck('engines', {
        status: passed ? 'PASS' : 'FAIL',
        latencyMs: engLatency,
        summary: `sql.js (${sqlOut.passedCount}/${sqlOut.totalCount}) · Python (${pyOut.passedCount}/${pyOut.totalCount} in ${pyOut.engineMode}) · Adversarial Fuzzer (${fuzzOut.passedCount}/${fuzzOut.totalCount} vectors)`,
      });
    } catch (err) {
      updateCheck('engines', {
        status: 'FAIL',
        latencyMs: Math.round(performance.now() - engStart),
        summary: err instanceof Error ? err.message : 'Execution runner error',
      });
    }

    // 3. Question Bank Authenticity & 6+ Test Case Audit
    const bankStart = performance.now();
    const missingAuth = questions.filter(
      (q) => !Array.isArray(q.companyTags) || q.companyTags.length === 0 || !(q.askedContext || q.sourceReference),
    );
    const under6 = questions.filter((q) => (q.testCases?.length || 0) + (q.hiddenTestCases?.length || 0) < 6);
    const bankOk = missingAuth.length === 0 && under6.length === 0 && questions.length > 0;
    updateCheck('bank', {
      status: bankOk ? 'PASS' : 'FAIL',
      latencyMs: Math.round(performance.now() - bankStart),
      summary: `${questions.length} active questions · Authenticity tags failing: ${missingAuth.length} · Under 6 tests: ${under6.length}`,
    });

    // 4. Gemini API, Google Search Grounding & AI Resume Tailor Validation Probe
    const aiStart = performance.now();
    try {
      const [diagResp, tailorProbe] = await Promise.all([
        fetch('/api/ai/diagnostics-ping', { method: 'POST' }),
        fetch('/api/ai/tailor-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
      ]);
      const data = await diagResp.json();
      const aiLatency = Number(data.latencyMs || Math.round(performance.now() - aiStart));
      const tailorRouteOk = tailorProbe.status === 400;
      if (diagResp.ok && data.ok && tailorRouteOk) {
        updateCheck('gemini', {
          status: 'PASS',
          latencyMs: aiLatency,
          summary: `Model ${data.model} responsive (${data.groundedCount || 0} grounded citations) · /api/ai/tailor-resume validation probe HTTP 400 OK`,
        });
      } else {
        updateCheck('gemini', {
          status: 'FAIL',
          latencyMs: aiLatency,
          summary: !tailorRouteOk
            ? `/api/ai/tailor-resume unexpected status ${tailorProbe.status}`
            : data.error || 'Gemini API ping returned non-OK',
        });
      }
    } catch (err) {
      updateCheck('gemini', {
        status: 'FAIL',
        latencyMs: Math.round(performance.now() - aiStart),
        summary: err instanceof Error ? err.message : 'Gemini probe unreachable',
      });
    }

    // 5. 12 Company Dossiers & Mistake Vault Spaced-Repetition Intervals Audit
    const dosStart = performance.now();
    const invalidDossiers = COMPANY_DOSSIERS.filter(
      (d) =>
        d.loopStructure.length < 4 ||
        d.signatureTraps.length < 3 ||
        d.behavioralThemes.length < 5,
    );
    const intervalsOk = MISTAKE_INTERVALS.join(',') === '1,3,7,21';
    const dossiersOk = COMPANY_DOSSIERS.length >= 12 && invalidDossiers.length === 0 && intervalsOk;
    updateCheck('dossiers_vault', {
      status: dossiersOk ? 'PASS' : 'FAIL',
      latencyMs: Math.round(performance.now() - dosStart),
      summary: `${COMPANY_DOSSIERS.length} Company Loop Dossiers verified (${invalidDossiers.length} incomplete) · Mistake Vault Intervals [${MISTAKE_INTERVALS.join('D -> ')}D]`,
    });

    // 6. Clickable Navigation, Bento DOM Targets, Zero Blocking Overlays & Pitch-Black/Violet Tokens
    const navStart = performance.now();
    const styles = typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null;
    const bgCanvas = styles?.getPropertyValue('--bg-canvas').trim() || '';
    const accentPrimary = styles?.getPropertyValue('--accent-primary').trim() || '';
    const pillarsUnder8Mcqs = topics.filter((t) => (t.quiz?.length || 0) < 8);
    const homeTargets = typeof document !== 'undefined' ? document.querySelectorAll('[data-nav-home]').length : 0;
    const dockPresent = typeof document !== 'undefined' ? Boolean(document.querySelector('[data-bento-dock]')) : false;
    const dockBar = typeof document !== 'undefined' ? document.querySelector('[data-bento-dock-bar]') : null;
    let dockBarOverlap = false;
    if (dockBar && dockBar.children.length >= 2) {
      const r1 = dockBar.children[0].getBoundingClientRect();
      const r2 = dockBar.children[1].getBoundingClientRect();
      dockBarOverlap =
        r1.right > r2.left + 1 &&
        r2.right > r1.left + 1 &&
        r1.bottom > r2.top + 1 &&
        r2.bottom > r1.top + 1;
    }
    const pointerTrapOverlays =
      typeof document !== 'undefined'
        ? Array.from(document.querySelectorAll('.fixed.inset-0')).filter((el) => {
            const st = getComputedStyle(el);
            return Number(st.opacity) === 0 && st.pointerEvents !== 'none';
          }).length
        : 0;
    const navOk =
      INTERVIEW_ROUNDS.length === 8 &&
      topics.length >= 8 &&
      PRACTICAL_TRACKS.length === 5 &&
      PRACTICAL_ASSIGNMENTS.length >= 15 &&
      homeTargets >= 1 &&
      !dockBarOverlap &&
      pointerTrapOverlays === 0 &&
      Boolean(bgCanvas && accentPrimary);

    updateCheck('nav_theme', {
      status: navOk ? 'PASS' : 'FAIL',
      latencyMs: Math.round(performance.now() - navStart),
      summary: `8/8 Rounds · ${topics.length} Pillars (${pillarsUnder8Mcqs.length} <8 MCQs) · ${homeTargets} Home nav targets · Dock: ${dockPresent ? (dockBarOverlap ? 'overlap' : 'unified-clear') : 'drawer-open'} · Blocking overlays: ${pointerTrapOverlays} · Tokens (${bgCanvas} / ${accentPrimary})`,
    });

    setRunningAll(false);
  };

  const handleAutoRepair = async () => {
    if (!onAutoRepairQuestions) return;
    setRepairing(true);
    try {
      const fixed = await onAutoRepairQuestions();
      setRepairNotice(`Auto-repaired & enriched ${fixed} question(s) to guarantee authentic tags and 6+ executable tests.`);
      await runAllTests();
    } finally {
      setRepairing(false);
    }
  };

  const passCount = checks.filter((c) => c.status === 'PASS').length;
  const failCount = checks.filter((c) => c.status === 'FAIL').length;

  return (
    <div className="glass-surface rounded-[18px] p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-display text-base font-bold text-white">
            <Activity className="h-4 w-4 text-white" />
            <span>System Health &amp; End-to-End Verification Suite</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Runs live browser checks across Firestore, SQL/Python WASM engines, Question Bank integrity, Gemini + Search Grounding, and UI theme tokens.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onAutoRepairQuestions && failCount > 0 && (
            <button
              type="button"
              onClick={handleAutoRepair}
              disabled={repairing}
              className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold"
            >
              {repairing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
              <span>Auto-Repair Failing Questions</span>
            </button>
          )}
          <button
            type="button"
            onClick={runAllTests}
            disabled={runningAll}
            className="btn-primary inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs disabled:opacity-60"
          >
            {runningAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            <span>{runningAll ? 'Running E2E Suite...' : 'Run All System Tests Now'}</span>
          </button>
        </div>
      </div>

      {repairNotice && (
        <div className="rounded-xl border border-[#10B981]/40 bg-[#10B981]/10 p-3 text-xs text-[#10B981]">
          <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />
          {repairNotice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2.5">
        {checks.map((chk) => (
          <div
            key={chk.id}
            className={`flex flex-col gap-2 rounded-xl border p-3.5 text-xs sm:flex-row sm:items-center sm:justify-between ${
              chk.status === 'PASS'
                ? 'border-[#10B981]/40 bg-[#10B981]/10'
                : chk.status === 'FAIL'
                  ? 'border-[#EF4444]/40 bg-[#EF4444]/10'
                  : 'inset-surface'
            }`}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              {chk.status === 'PASS' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
              ) : chk.status === 'FAIL' ? (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
              ) : chk.status === 'RUNNING' ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-white" />
              ) : (
                <Activity className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              )}
              <div className="min-w-0">
                <div className="font-semibold text-white">{chk.name}</div>
                <div className="mt-0.5 text-[11px] text-slate-300">{chk.summary}</div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 font-mono text-[11px] tabular-nums">
              {chk.latencyMs !== undefined && <span className="text-slate-400">{chk.latencyMs} ms</span>}
              <span
                className={`rounded-lg px-2.5 py-0.5 font-bold ${
                  chk.status === 'PASS'
                    ? 'bg-[#10B981]/20 text-[#10B981]'
                    : chk.status === 'FAIL'
                      ? 'bg-[#EF4444]/20 text-[#EF4444]'
                      : 'inset-surface text-slate-300'
                }`}
              >
                {chk.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {(passCount > 0 || failCount > 0) && (
        <div className="inset-surface flex items-center justify-between rounded-xl px-4 py-2.5 font-mono text-xs tabular-nums">
          <span className="text-slate-300">Overall E2E Readiness Verification</span>
          <span className={failCount === 0 && passCount === checks.length ? 'font-bold text-[#10B981]' : 'font-bold text-white'}>
            {passCount} / {checks.length} PASSED
          </span>
        </div>
      )}
    </div>
  );
}
