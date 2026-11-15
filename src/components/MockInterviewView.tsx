import React, { useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { motion } from 'motion/react';
import {
  Award,
  BookmarkPlus,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Code2,
  Compass,
  Database,
  History,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  Square,
  Volume2,
  XCircle,
} from 'lucide-react';
import type {
  ExperienceTier,
  MistakeSourceType,
  MockInterviewScorecard,
  MockVerdict,
  Question,
} from '../types/platform';
import { getQuestionEvalType, getQuestionRound, INTERVIEW_ROUNDS } from '../data/rounds';
import { findCompanyDossier } from '../data/companyDossiers';
import { executeSqlInBrowser, type SqlExecutionResponse } from '../lib/sqlEngine';
import { executePythonInWorker, type PythonExecutionResponse } from '../lib/pythonEngine';
import { loadUserArenaState, saveUserArenaState } from '../lib/firestoreService';
import { useTheme } from '../lib/themeContext';
import {
  ArchitectureWhiteboardStudio,
  DimensionalModelingStudio,
} from './RoundStudios';

interface MockInterviewViewProps {
  userId: string | null;
  questions: Question[];
  experienceTier: ExperienceTier;
  initialCompany?: string;
  onSaveToNotebook: (title: string, content: string, topic: string) => Promise<void>;
  onNavigateToQuest: () => void;
  onSelectRound: (roundSlug: string) => void;
  onSelectTopic?: (topicNameOrSlug: string) => void;
  onCaptureMistake?: (payload: {
    id: string;
    sourceType: MistakeSourceType;
    questionId?: string;
    topicSlug?: string;
    title: string;
    domain: string;
    reason: string;
  }) => void | Promise<void>;
}

interface InterviewTurn {
  role: 'interviewer' | 'candidate';
  text: string;
  rubricScore?: number;
  strengths?: string[];
  gapsToProbe?: string[];
}

const TARGET_COMPANIES = [
  'Meta',
  'Amazon',
  'Google',
  'Uber',
  'Databricks',
  'Snowflake',
  'Flipkart',
  'PhonePe',
  'Swiggy',
  'Razorpay',
  'Walmart Global Tech',
  'Atlassian',
];

const PHASES = ['Clarification', 'Execution', 'Edge Cases & Scale', 'Debrief'] as const;
type InterviewPhase = (typeof PHASES)[number];

const LOOP_ROUND_SEQUENCE = [
  { roundNumber: 1 as const, label: 'Round 1 · SQL & Query Tuning' },
  { roundNumber: 2 as const, label: 'Round 2 · Python & DSA' },
  { roundNumber: 3 as const, label: 'Round 3 · PySpark & Distributed' },
  { roundNumber: 4 as const, label: 'Round 4 · Dimensional Modeling' },
  { roundNumber: 5 as const, label: 'Round 5 · End-to-End System Design' },
  { roundNumber: 6 as const, label: 'Round 6 · Incident RCA & Behavioral' },
];

function formatCountdown(secs: number): string {
  const m = Math.floor(Math.max(0, secs) / 60);
  const s = Math.max(0, secs) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function MockInterviewView({
  userId,
  questions,
  experienceTier,
  initialCompany,
  onSaveToNotebook,
  onNavigateToQuest,
  onSelectRound,
  onSelectTopic,
  onCaptureMistake,
}: MockInterviewViewProps) {
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState<'studio' | 'history'>('studio');
  const [rightPaneMode, setRightPaneMode] = useState<'editor' | 'interactive_studio'>('editor');
  const [dossierOpen, setDossierOpen] = useState(true);

  const companyOptions = useMemo(() => {
    if (initialCompany && !TARGET_COMPANIES.some((c) => c.toLowerCase() === initialCompany.toLowerCase())) {
      return [initialCompany, ...TARGET_COMPANIES];
    }
    return TARGET_COMPANIES;
  }, [initialCompany]);

  const [company, setCompany] = useState(initialCompany || 'Uber');
  const [role, setRole] = useState('Senior Data Engineer');
  const [loopMode, setLoopMode] = useState<'single_round' | 'full_loop'>('single_round');
  const [selectedRoundNumber, setSelectedRoundNumber] = useState<number>(1);
  const [loopStepIndex, setLoopStepIndex] = useState<number>(0);

  useEffect(() => {
    if (initialCompany) {
      setCompany(initialCompany);
    }
  }, [initialCompany]);

  const activeRoundNumber =
    loopMode === 'full_loop' ? LOOP_ROUND_SEQUENCE[loopStepIndex]?.roundNumber || 1 : selectedRoundNumber;

  const activeRoundMeta =
    INTERVIEW_ROUNDS.find((r) => r.roundNumber === activeRoundNumber) || INTERVIEW_ROUNDS[0];

  // Pick authentic company-tagged question first, else authentic round-matched question
  const roundQuestionPool = useMemo(() => {
    const inRound = questions.filter((q) => getQuestionRound(q) === activeRoundNumber);
    const companyMatched = inRound.filter((q) =>
      q.companyTags.some((t) => t.toLowerCase().includes(company.toLowerCase()) || company.toLowerCase().includes(t.toLowerCase())),
    );
    if (companyMatched.length > 0) return companyMatched;
    const anyCompanyMatch = questions.filter((q) =>
      q.companyTags.some((t) => t.toLowerCase().includes(company.toLowerCase()) || company.toLowerCase().includes(t.toLowerCase())),
    );
    if (anyCompanyMatch.length > 0 && inRound.length === 0) return anyCompanyMatch;
    return inRound.length > 0 ? inRound : questions.slice(0, 5);
  }, [questions, activeRoundNumber, company]);

  const [questionIndex, setQuestionIndex] = useState(0);
  const activeQuestion: Question | undefined = roundQuestionPool[questionIndex % Math.max(1, roundQuestionPool.length)];
  const evalType = activeQuestion ? getQuestionEvalType(activeQuestion) : 'sql';

  // Live split workspace state
  const [liveCode, setLiveCode] = useState('');
  const [sqlResult, setSqlResult] = useState<SqlExecutionResponse | null>(null);
  const [pyResult, setPyResult] = useState<PythonExecutionResponse | null>(null);
  const [runningTests, setRunningTests] = useState(false);
  const [testPassSummary, setTestPassSummary] = useState('Tests not executed yet.');

  // Sync starter code when question changes
  useEffect(() => {
    if (!activeQuestion) return;
    setLiveCode(
      activeQuestion.starterCode ||
        (evalType === 'sql'
          ? '-- Write your SQLite solution\nSELECT 1;\n'
          : evalType === 'python'
            ? '# Write your Python 3 solution\n'
            : `# ${activeQuestion.title}\n\n## Assumptions & Grain\n\n## Architecture / Model\n`),
    );
    setSqlResult(null);
    setPyResult(null);
    setTestPassSummary('Tests not executed yet.');
  }, [activeQuestion?.uniqueId, evalType]);

  // Interview state
  const [started, setStarted] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(45 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [activeScorecard, setActiveScorecard] = useState<MockInterviewScorecard | null>(null);
  const [scorecardHistory, setScorecardHistory] = useState<MockInterviewScorecard[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    loadUserArenaState<MockInterviewScorecard[]>(userId, '__scorecards__', [])
      .then((items) => {
        if (Array.isArray(items)) setScorecardHistory(items);
      })
      .catch(() => {});
  }, [userId]);

  // 45:00 Countdown timer
  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  const currentPhase: InterviewPhase = PHASES[Math.min(phaseIndex, PHASES.length - 1)];

  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.03;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  };

  const handleRunLiveTests = async () => {
    if (!activeQuestion) return;
    setRunningTests(true);
    try {
      if (evalType === 'sql') {
        const res = await executeSqlInBrowser({
          setupSql: activeQuestion.setupSchemaOrEnv,
          userSql: liveCode,
          referenceSql: activeQuestion.detailedSolution,
          dirtyDataMode: true,
          adversarialSetupSql: activeQuestion.adversarialSetupSql,
          customTestCases: activeQuestion.testCases,
        });
        setSqlResult(res);
        setTestPassSummary(
          `SQLite suite: ${res.passedCount}/${res.totalCount} test cases passed.${
            res.error ? ` Error: ${res.error}` : ''
          }`,
        );
      } else if (evalType === 'python') {
        const res = await executePythonInWorker({
          setupCode: activeQuestion.setupSchemaOrEnv,
          userCode: liveCode,
          testCases: activeQuestion.testCases,
          hiddenTestCases: activeQuestion.hiddenTestCases || [],
        });
        setPyResult(res);
        setTestPassSummary(
          `Pyodide suite: ${res.passedCount}/${res.totalCount} tests passed.${
            res.stderr ? ` Stderr: ${res.stderr.slice(0, 300)}` : ''
          }`,
        );
      } else {
        setTestPassSummary(`Architecture/Modeling spec length: ${liveCode.trim().length} chars.`);
      }
    } finally {
      setRunningTests(false);
    }
  };

  const callInterviewer = async (userResp: string, finish = false) => {
    setLoading(true);
    try {
      const resp = await fetch('/api/ai/mock-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company,
          role,
          experienceTier,
          roundType: activeRoundMeta.title,
          currentPhase: finish ? 'Debrief' : currentPhase,
          activeQuestionTitle: activeQuestion?.title || activeRoundMeta.title,
          activeQuestionPrompt: activeQuestion?.problemStatement || '',
          liveCode,
          testPassSummary,
          transcript: turns.map((t) => ({ role: t.role, text: t.text })),
          userResponse: userResp,
          finishInterview: finish,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Mock interview request failed');

      const nextTurns: InterviewTurn[] = userResp
        ? [...turns, { role: 'candidate', text: userResp }]
        : [...turns];
      nextTurns.push({
        role: 'interviewer',
        text: data.interviewerMessage || 'Let us continue.',
        rubricScore: data.rubricScore,
        strengths: data.strengths,
        gapsToProbe: data.gapsToProbe,
      });
      setTurns(nextTurns);
      speakText(data.interviewerMessage || '');

      if (!finish && nextTurns.filter((t) => t.role === 'candidate').length >= 1 && phaseIndex === 0) {
        setPhaseIndex(1);
      } else if (!finish && nextTurns.filter((t) => t.role === 'candidate').length >= 3 && phaseIndex < 2) {
        setPhaseIndex(2);
      }

      if (finish && data.scorecard) {
        setPhaseIndex(3);
        setTimerRunning(false);
        const rawAxes = Array.isArray(data.scorecard.axes) ? data.scorecard.axes : [];
        const getAxis = (idx: number) => Math.max(1, Math.min(4, Number(rawAxes[idx]?.score || 3)));
        const validVerdicts: MockVerdict[] = ['Strong Hire', 'Hire', 'Lean Hire', 'No Hire'];
        const rawVerdict = validVerdicts.includes(data.scorecard.verdict)
          ? (data.scorecard.verdict as MockVerdict)
          : 'Hire';

        const card: MockInterviewScorecard = {
          id: `sc_${Date.now()}`,
          company,
          role,
          mode: loopMode,
          roundName: activeRoundMeta.title,
          verdict: rawVerdict,
          axes: {
            technicalDepth: getAxis(0),
            codingSqlAccuracy: getAxis(1),
            edgeCasesScale: getAxis(2),
            architectureModeling: getAxis(3),
            communicationTradeoffs: getAxis(4),
          },
          overallScore: Number(data.scorecard.overallScore || data.rubricScore || 7.5),
          companyBarFeedback: String(
            data.scorecard.companyBarFeedback || data.interviewerMessage || 'Balanced senior engineering signal.',
          ),
          weakAreas: Array.isArray(data.scorecard.weakAreas) ? data.scorecard.weakAreas.map(String) : [],
          recommendedRoundSlugs: Array.isArray(data.scorecard.recommendedRoundSlugs)
            ? data.scorecard.recommendedRoundSlugs.map(String)
            : [activeRoundMeta.slug],
          createdAt: new Date().toISOString(),
        };
        setActiveScorecard(card);
        const updatedHistory = [card, ...scorecardHistory].slice(0, 20);
        setScorecardHistory(updatedHistory);
        await saveUserArenaState(userId, '__scorecards__', updatedHistory);

        if (card.weakAreas.length > 0) {
          onCaptureMistake?.({
            id: `mock_${company.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${activeRoundMeta.roundNumber}`,
            sourceType: 'mock_weak_area',
            title: `${company} (${activeRoundMeta.shortTitle}) Debrief Gaps`,
            domain: company,
            reason: `Weak areas flagged (${card.verdict}, ${card.overallScore}/10): ${card.weakAreas.join('; ')}`,
          });
        }
      }
    } catch (err) {
      setTurns((prev) => [
        ...prev,
        { role: 'interviewer', text: `Error: ${err instanceof Error ? err.message : 'Unable to connect'}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    setStarted(true);
    setActiveScorecard(null);
    setPhaseIndex(0);
    setSecondsLeft(45 * 60);
    setTimerRunning(true);
    setTurns([]);
    await callInterviewer('', false);
  };

  const handleNextOnSiteRound = async () => {
    const nextIdx = (loopStepIndex + 1) % LOOP_ROUND_SEQUENCE.length;
    setLoopStepIndex(nextIdx);
    setActiveScorecard(null);
    setPhaseIndex(0);
    setSecondsLeft(45 * 60);
    setTimerRunning(true);
    setTurns([]);
    setStarted(true);
    // Slight timeout so activeQuestion effect syncs starterCode cleanly before opening prompt
    setTimeout(() => {
      callInterviewer('', false);
    }, 60);
  };

  const handleSendAnswer = async () => {
    const trimmed = answer.trim();
    if (!trimmed || loading) return;
    setAnswer('');
    await callInterviewer(trimmed, false);
  };

  const toggleMic = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript + ' ';
      }
      setAnswer(transcript.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const saveTranscript = async () => {
    const md = `# Mock Interview: ${company} — ${activeRoundMeta.title}\n\n**Question:** ${activeQuestion?.title || ''}\n\n## Live Code / Spec\n\`\`\`\n${liveCode}\n\`\`\`\n\n## Transcript\n${turns
      .map(
        (t) =>
          `### ${t.role === 'interviewer' ? `${company} Principal Interviewer` : 'Candidate'}\n${t.text}${
            t.rubricScore ? `\n*Practice Rubric Score: ${t.rubricScore}/10*` : ''
          }`,
      )
      .join('\n\n')}`;
    await onSaveToNotebook(`Mock Interview: ${company} (${activeRoundMeta.shortTitle})`, md, company);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const latestFeedback = [...turns].reverse().find((t) => t.role === 'interviewer' && t.rubricScore !== undefined);
  const hasSpeechRec =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <div className="space-y-5">
      {/* Top Studio Bar */}
      <div className="glass-surface rounded-2xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-300">
              <span>LIVE COMPANY LOOP &amp; VOICE INTERVIEWER</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-400">Live Editor Synced with Gemini Staff Bar-Raiser</span>
            </div>
            <h1 className="mt-0.5 font-display text-xl font-bold text-white">
              {company} — {activeRoundMeta.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* 45:00 Live Timer */}
            <div className="inset-surface flex items-center gap-2 rounded-xl px-3 py-1.5 font-mono text-xs tabular-nums">
              <Clock className="h-3.5 w-3.5 text-white" />
              <span className="font-bold text-white">{formatCountdown(secondsLeft)}</span>
              {started && (
                <button
                  onClick={() => setTimerRunning((r) => !r)}
                  className="text-slate-400 hover:text-white"
                  title={timerRunning ? 'Pause timer' : 'Resume timer'}
                >
                  {timerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
              )}
              <button
                onClick={() => setSecondsLeft(45 * 60)}
                className="text-slate-400 hover:text-white"
                title="Reset 45:00 timer"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>

            <div className="inset-surface flex rounded-xl p-1 text-xs">
              <button
                onClick={() => setViewMode('studio')}
                className={`whitespace-nowrap rounded-lg px-3 py-1 font-semibold ${
                  viewMode === 'studio' ? 'tab-active' : 'text-slate-400 hover:text-white'
                }`}
              >
                Live Room
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1 font-semibold ${
                  viewMode === 'history' ? 'tab-active' : 'text-slate-400 hover:text-white'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                <span>Scorecards ({scorecardHistory.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4-Phase Tracker + Configuration Strip */}
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-white/[0.08] pt-3 lg:grid-cols-12">
          <div className="flex flex-wrap items-center gap-2 lg:col-span-7">
            <select
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                setQuestionIndex(0);
              }}
              className="inset-surface rounded-xl px-3 py-1.5 text-xs font-semibold text-white outline-none focus:border-[var(--accent-primary)]"
            >
              {companyOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div className="inset-surface flex rounded-xl p-0.5 text-xs">
              <button
                onClick={() => setLoopMode('single_round')}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1 font-medium ${
                  loopMode === 'single_round' ? 'tab-active' : 'text-slate-400'
                }`}
              >
                45m Single Round
              </button>
              <button
                onClick={() => setLoopMode('full_loop')}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1 font-medium ${
                  loopMode === 'full_loop' ? 'tab-active' : 'text-slate-400'
                }`}
              >
                Multi-Round On-Site ({loopStepIndex + 1}/6)
              </button>
            </div>

            {loopMode === 'single_round' ? (
              <select
                value={selectedRoundNumber}
                onChange={(e) => {
                  setSelectedRoundNumber(Number(e.target.value));
                  setQuestionIndex(0);
                }}
                className="inset-surface rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--accent-primary)]"
              >
                {LOOP_ROUND_SEQUENCE.map((r) => (
                  <option key={r.roundNumber} value={r.roundNumber}>
                    {r.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="inset-surface rounded-xl px-2.5 py-1 font-mono text-[11px] font-semibold text-white">
                Stage {loopStepIndex + 1}: {activeRoundMeta.shortTitle}
              </span>
            )}

            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Target Role"
              className="inset-surface w-44 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5 lg:col-span-5">
            {PHASES.map((p, idx) => (
              <button
                key={p}
                onClick={() => setPhaseIndex(idx)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  idx === phaseIndex
                    ? 'tab-active'
                    : idx < phaseIndex
                      ? 'inset-surface text-white'
                      : 'inset-surface text-slate-400 hover:text-white'
                }`}
              >
                {idx + 1}. {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 15-Min Pre-Interview Company Loop Dossier */}
      {(() => {
        const dossier = findCompanyDossier(company);
        if (!dossier || viewMode !== 'studio') return null;
        return (
          <div className="glass-surface rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="gradient-violet keep-white flex h-8 w-8 items-center justify-center rounded-xl">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#C4B5FD]">
                    15-Min Pre-Interview Loop Dossier
                  </div>
                  <h2 className="text-sm font-bold text-white">
                    {dossier.company} — {dossier.headline}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDossierOpen((o) => !o)}
                className="btn-secondary inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold"
              >
                <span>{dossierOpen ? 'Collapse Briefing' : 'Open 15-Min Dossier'}</span>
                {dossierOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            {dossierOpen && (
              <div className="mt-4 grid grid-cols-1 gap-4 border-t border-white/[0.08] pt-4 lg:grid-cols-12">
                <div className="space-y-2 lg:col-span-5">
                  <div className="text-xs font-bold text-white">On-Site Loop Structure</div>
                  <div className="space-y-1.5">
                    {dossier.loopStructure.map((st, idx) => (
                      <div key={idx} className="inset-surface rounded-xl px-3 py-2 text-xs">
                        <div className="flex items-center justify-between gap-2 font-semibold text-white">
                          <span>{st.round}</span>
                          <span className="font-mono text-[10px] text-[#C084FC]">{st.duration}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-300">{st.focus}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 lg:col-span-4">
                  <div>
                    <div className="mb-1.5 text-xs font-bold text-[#F43F5E]">Signature Bar-Raiser Traps</div>
                    <ul className="space-y-1.5 text-[11px] text-slate-300">
                      {dossier.signatureTraps.map((trap, i) => (
                        <li key={i} className="inset-surface rounded-lg px-2.5 py-1.5 leading-snug">
                          • {trap}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="inset-surface rounded-xl p-3 text-xs space-y-1.5">
                    <div className="font-bold text-white">Scale &amp; Preferred Stack</div>
                    <div className="text-[11px] text-slate-300">{dossier.scaleAndStack.typicalScale}</div>
                    <div className="text-[11px] text-slate-400">
                      Modeling: <span className="text-white">{dossier.scaleAndStack.modelingStyle}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {dossier.scaleAndStack.preferredStack.map((tech) => (
                        <button
                          key={tech}
                          type="button"
                          onClick={() => onSelectTopic?.(tech)}
                          className="rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-slate-200 hover:bg-[#8B5CF6]/25"
                        >
                          {tech}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 lg:col-span-3">
                  <div className="text-xs font-bold text-white">Top 5 Behavioral Themes</div>
                  <ul className="space-y-1.5 text-[11px] text-slate-300">
                    {dossier.behavioralThemes.map((b, i) => (
                      <li key={i} className="inset-surface rounded-xl px-3 py-2 leading-snug">
                        {i + 1}. {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {viewMode === 'history' ? (
        <div className="glass-surface rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-white">Saved Hiring Committee Scorecards</h2>
              <p className="text-xs text-slate-400">
                Historical company-calibrated verdicts and 5-axis rubric diagnostics
              </p>
            </div>
          </div>
          {scorecardHistory.length === 0 ? (
            <div className="inset-surface rounded-xl p-8 text-center text-xs text-slate-400">
              No completed mock interview scorecards yet. Finish a mock interview round to persist your Hiring Committee report.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {scorecardHistory.map((sc) => (
                <div key={sc.id} className="inset-surface rounded-2xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-xs text-slate-300">
                        {sc.company} · {sc.roundName}
                      </div>
                      <h3 className="font-display text-base font-bold text-white">{sc.role}</h3>
                      <div className="text-[11px] text-slate-400">{new Date(sc.createdAt).toLocaleString()}</div>
                    </div>
                    <span className="btn-secondary rounded-lg px-2.5 py-1 font-mono text-xs font-bold">
                      {sc.verdict} ({sc.overallScore}/10)
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">{sc.companyBarFeedback}</p>
                  <div className="grid grid-cols-5 gap-1.5 text-center font-mono text-[10px]">
                    {[
                      { k: 'Depth', v: sc.axes.technicalDepth },
                      { k: 'Code/SQL', v: sc.axes.codingSqlAccuracy },
                      { k: 'Scale', v: sc.axes.edgeCasesScale },
                      { k: 'Design', v: sc.axes.architectureModeling },
                      { k: 'Tradeoffs', v: sc.axes.communicationTradeoffs },
                    ].map((ax) => (
                      <div key={ax.k} className="rounded-lg border border-white/10 py-1.5">
                        <div className="text-slate-400">{ax.k}</div>
                        <div className="font-bold text-white">{ax.v}/4</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* LEFT PANE: Voice Controls, Transcript & Hiring Committee Scorecard */}
          <div className="flex flex-col gap-4 xl:col-span-5">
            <div className="glass-surface flex flex-1 flex-col overflow-hidden rounded-2xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <motion.div
                    animate={{
                      scale: speaking || listening ? [1, 1.15, 1] : 1,
                    }}
                    transition={{ duration: 1.3, repeat: speaking || listening ? Infinity : 0 }}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                      speaking || listening
                        ? 'tab-active border-transparent'
                        : 'border-white/15 bg-white/5 text-slate-300'
                    }`}
                  >
                    <Volume2 className="h-4 w-4" />
                  </motion.div>
                  <div>
                    <div className="text-xs font-bold text-white">{company} Principal Interviewer</div>
                    <div className="text-[11px] text-slate-400">
                      {loading ? 'Analyzing live code & response...' : listening ? 'Listening...' : `Phase: ${currentPhase}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={voiceEnabled}
                      onChange={(e) => setVoiceEnabled(e.target.checked)}
                      className="accent-current"
                    />
                    <span>TTS</span>
                  </label>
                  {turns.length > 0 && (
                    <button
                      onClick={saveTranscript}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-white hover:underline"
                    >
                      {savedToast ? <Check className="h-3 w-3" /> : <BookmarkPlus className="h-3 w-3" />}
                      <span>{savedToast ? 'Saved' : 'Save'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-[380px] min-h-[260px] flex-1 space-y-3 overflow-y-auto p-4">
                {turns.length === 0 ? (
                  <div className="inset-surface rounded-xl p-4 text-xs leading-relaxed text-slate-300">
                    <p className="font-semibold text-white">Ready for {company} Loop ({experienceTier})</p>
                    <p className="mt-1 text-slate-400">
                      Authentic problem loaded on the right:{' '}
                      <strong className="text-white">{activeQuestion?.title}</strong>. Click &ldquo;Start Interview&rdquo; below to begin the 45-minute live bar-raiser session.
                    </p>
                  </div>
                ) : (
                  turns.map((t, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl border p-3.5 text-xs ${
                        t.role === 'interviewer'
                          ? 'inset-surface text-slate-200'
                          : 'ml-6 border-[var(--border-strong)] bg-[var(--accent-secondary-bg)] text-white'
                      }`}
                    >
                      <div className="mb-1 font-mono text-[10px] font-bold text-slate-400">
                        {t.role === 'interviewer' ? `${company} Bar-Raiser` : 'You'}
                      </div>
                      <p className="whitespace-pre-line leading-relaxed">{t.text}</p>
                    </div>
                  ))
                )}
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Reading your workspace code &amp; formulating follow-up...</span>
                  </div>
                )}
              </div>

              {/* Start / Debrief & Input Bar */}
              <div className="border-t border-white/[0.08] p-3.5 space-y-2.5">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleStart}
                    disabled={loading}
                    className="btn-primary inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>{started ? 'Restart Round' : 'Start Interview'}</span>
                  </button>
                  {started && (
                    <button
                      onClick={() => callInterviewer(answer || 'Please provide my Hiring Committee Scorecard.', true)}
                      disabled={loading}
                      className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <Square className="h-3.5 w-3.5" />
                      <span>Finish &amp; Scorecard</span>
                    </button>
                  )}
                </div>

                <div className="flex items-end gap-2">
                  {hasSpeechRec && (
                    <button
                      type="button"
                      onClick={toggleMic}
                      disabled={!started}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                        listening
                          ? 'tab-active border-transparent'
                          : 'inset-surface text-slate-300 hover:border-[var(--border-strong)]'
                      }`}
                      title="Toggle voice dictation"
                    >
                      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  )}
                  <textarea
                    rows={2}
                    disabled={!started || loading}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendAnswer();
                      }
                    }}
                    placeholder={
                      started
                        ? 'Explain your approach, clarify grain, or ask a question (live editor syncs automatically)...'
                        : 'Click Start Interview above...'
                    }
                    className="inset-surface w-full resize-none rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[var(--accent-primary)] disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendAnswer}
                    disabled={!started || loading || !answer.trim()}
                    className="btn-primary flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Coaching OR Final Hiring Committee Scorecard */}
            {activeScorecard ? (
              <div className="glass-surface rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-white" />
                    <span className="font-display text-sm font-bold text-white">Hiring Committee Scorecard</span>
                  </div>
                  <span className="btn-secondary rounded-lg px-3 py-1 font-mono text-xs font-bold">
                    {activeScorecard.verdict} · {activeScorecard.overallScore}/10
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {[
                    { label: 'Technical Depth', val: activeScorecard.axes.technicalDepth },
                    { label: 'SQL / Coding Accuracy', val: activeScorecard.axes.codingSqlAccuracy },
                    { label: 'Edge Cases & Scale', val: activeScorecard.axes.edgeCasesScale },
                    { label: 'Architecture / Modeling', val: activeScorecard.axes.architectureModeling },
                    { label: 'Communication & Trade-offs', val: activeScorecard.axes.communicationTradeoffs },
                  ].map((ax) => (
                    <div key={ax.label} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 text-slate-300">{ax.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-500/20">
                        <div
                          className="h-full rounded-full bg-[var(--accent-primary)]"
                          style={{ width: `${(ax.val / 4) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono font-bold text-white tabular-nums">{ax.val}/4</span>
                    </div>
                  ))}
                </div>

                <p className="inset-surface rounded-xl p-3 text-xs leading-relaxed text-slate-300">
                  {activeScorecard.companyBarFeedback}
                </p>

                {activeScorecard.weakAreas.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-400">
                      Weak Areas Flagged (Click to Study Concept &amp; Drill MCQs)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeScorecard.weakAreas.map((area) => (
                        <button
                          key={area}
                          type="button"
                          onClick={() => onSelectTopic?.(area)}
                          className="btn-secondary rounded-lg px-2.5 py-1 text-[11px] font-semibold"
                        >
                          {area} →
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={onNavigateToQuest}
                    className="btn-primary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs"
                  >
                    <Compass className="h-3.5 w-3.5" />
                    <span>Practice Weak Areas in Quest Roadmap</span>
                  </button>
                  {activeScorecard.recommendedRoundSlugs[0] && (
                    <button
                      onClick={() => onSelectRound(activeScorecard.recommendedRoundSlugs[0])}
                      className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium"
                    >
                      <span>Drill Recommended Round</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {loopMode === 'full_loop' && (
                    <button
                      onClick={handleNextOnSiteRound}
                      className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <span>Next On-Site Round ({((loopStepIndex + 1) % 6) + 1}/6)</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              latestFeedback && (
                <div className="glass-surface rounded-2xl p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-white">Live Turn Coaching</span>
                    <span className="font-mono font-bold text-white tabular-nums">
                      {latestFeedback.rubricScore}/10
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <div className="font-semibold text-white">Signals Hit</div>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-300">
                        {(latestFeedback.strengths || []).slice(0, 3).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-300">Next Probe</div>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-400">
                        {(latestFeedback.gapsToProbe || []).slice(0, 3).map((g, i) => (
                          <li key={i}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {/* RIGHT PANE: Synced Live Coding / SQL / Architecture Workspace */}
          <div className="glass-surface flex flex-col overflow-hidden rounded-2xl xl:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                  {evalType === 'sql' ? (
                    <Database className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <Code2 className="h-3.5 w-3.5 text-white" />
                  )}
                  <span className="truncate">
                    {activeQuestion?.askedContext || activeQuestion?.sourceReference || `${company} Authentic Prompt`}
                  </span>
                </div>
                <h2 className="truncate font-display text-sm font-bold text-white">
                  {activeQuestion?.title || activeRoundMeta.title}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {(activeRoundNumber === 4 || activeRoundNumber === 5 || activeRoundNumber === 8) && (
                  <div className="inset-surface flex rounded-lg p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setRightPaneMode('editor')}
                      className={`rounded-md px-2 py-1 font-medium ${
                        rightPaneMode === 'editor' ? 'tab-active' : 'text-slate-300'
                      }`}
                    >
                      Spec Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setRightPaneMode('interactive_studio')}
                      className={`rounded-md px-2 py-1 font-medium ${
                        rightPaneMode === 'interactive_studio' ? 'tab-active' : 'text-slate-300'
                      }`}
                    >
                      Interactive Studio
                    </button>
                  </div>
                )}
                {roundQuestionPool.length > 1 && (
                  <button
                    onClick={() => setQuestionIndex((i) => i + 1)}
                    className="btn-secondary rounded-lg px-2.5 py-1 text-[11px] font-medium"
                  >
                    Switch Prompt ({(questionIndex % roundQuestionPool.length) + 1}/{roundQuestionPool.length})
                  </button>
                )}
                <button
                  onClick={handleRunLiveTests}
                  disabled={runningTests}
                  className="btn-primary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs"
                >
                  {runningTests ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  <span>
                    {evalType === 'design_rubric'
                      ? 'Sync Spec with Interviewer'
                      : `Run ${activeQuestion?.testCases.length || 6}+ Tests`}
                  </span>
                </button>
              </div>
            </div>

            {activeQuestion && (
              <div className="border-b border-white/[0.08] bg-[var(--bg-inset)] px-4 py-3 text-xs leading-relaxed text-slate-300 max-h-36 overflow-y-auto">
                <p>{activeQuestion.problemStatement}</p>
                {activeQuestion.setupSchemaOrEnv && evalType === 'sql' && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-mono text-[11px] font-semibold text-white">
                      Inspect Tables / DDL Schema
                    </summary>
                    <pre className="mt-1.5 overflow-x-auto rounded-lg border border-white/10 p-2 font-mono text-[11px] text-slate-300">
                      {activeQuestion.setupSchemaOrEnv}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {rightPaneMode === 'interactive_studio' && (activeRoundNumber === 4 || activeRoundNumber === 5 || activeRoundNumber === 8) ? (
              <div className="max-h-[420px] flex-1 overflow-y-auto">
                {activeRoundNumber === 4 ? (
                  <DimensionalModelingStudio
                    questionTitle={activeQuestion?.title || activeRoundMeta.title}
                    submissionText={liveCode}
                    onSyncSubmission={(md) => {
                      setLiveCode(md);
                      setTestPassSummary('Synced Interactive Star Schema DDL to live interview workspace.');
                    }}
                  />
                ) : (
                  <ArchitectureWhiteboardStudio
                    questionTitle={activeQuestion?.title || activeRoundMeta.title}
                    questionPrompt={activeQuestion?.problemStatement || ''}
                    submissionText={liveCode}
                    onSyncSubmission={(md) => {
                      setLiveCode(md);
                      setTestPassSummary('Synced 4-Phase Architecture Whiteboard & Sizing to live interview workspace.');
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="h-[340px] min-h-[300px] flex-1">
                <Editor
                  height="100%"
                  language={evalType === 'sql' ? 'sql' : evalType === 'python' ? 'python' : 'markdown'}
                  theme={isDark ? 'vs-dark' : 'vs'}
                  value={liveCode}
                  onChange={(val) => setLiveCode(val || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    padding: { top: 12 },
                  }}
                />
              </div>
            )}

            {/* Live Test Results Strip Synced to Gemini */}
            <div className="border-t border-white/[0.08] bg-[var(--bg-inset)] px-4 py-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-white" />
                  <span className="font-mono font-semibold text-white">{testPassSummary}</span>
                </div>
                <span className="text-[11px] text-slate-400">Synced live to {company} Bar-Raiser</span>
              </div>

              {sqlResult && sqlResult.testCaseResults.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {sqlResult.testCaseResults.map((tc, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 font-mono text-[10px] ${
                        tc.passed
                          ? 'border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]'
                          : 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]'
                      }`}
                    >
                      {tc.passed ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {tc.name}
                    </span>
                  ))}
                </div>
              )}

              {pyResult && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {[...pyResult.tests, ...(pyResult.hiddenTests || [])].map((tc, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 font-mono text-[10px] ${
                        tc.passed
                          ? 'border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]'
                          : 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]'
                      }`}
                    >
                      {tc.passed ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {tc.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
