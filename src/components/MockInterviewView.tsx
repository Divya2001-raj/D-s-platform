import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { BookmarkPlus, Check, Loader2, Mic, MicOff, Play, Send, Square, Volume2 } from 'lucide-react';
import type { ExperienceTier } from '../types/platform';
import { ALL_COMPANY_PORTALS } from '../data';

interface MockInterviewViewProps {
  experienceTier: ExperienceTier;
  onSaveToNotebook: (title: string, content: string, topic: string) => Promise<void>;
}

interface InterviewTurn {
  role: 'interviewer' | 'candidate';
  text: string;
  rubricScore?: number;
  strengths?: string[];
  gapsToProbe?: string[];
}

export function MockInterviewView({ experienceTier, onSaveToNotebook }: MockInterviewViewProps) {
  const [company, setCompany] = useState('Uber');
  const [role, setRole] = useState('Senior Data Engineer');
  const [roundType, setRoundType] = useState('System Design & Lakehouse Architecture');
  const [started, setStarted] = useState(false);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [saved, setSaved] = useState(false);
  const recognitionRef = useRef<any>(null);

  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.02;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
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
          roundType,
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
    setTurns([]);
    await callInterviewer('', false);
  };

  const handleSendAnswer = async () => {
    const trimmed = answer.trim();
    if (!trimmed || loading) return;
    setAnswer('');
    await callInterviewer(trimmed, false);
  };

  const toggleMic = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      return;
    }
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
    const md = turns
      .map((t) => `### ${t.role === 'interviewer' ? 'Interviewer' : 'Candidate'}\n${t.text}${t.rubricScore ? `\n*Practice Rubric Score: ${t.rubricScore}/10*` : ''}`)
      .join('\n\n');
    await onSaveToNotebook(`Mock Interview: ${company} (${roundType})`, md, company);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const latestFeedback = [...turns].reverse().find((t) => t.role === 'interviewer' && t.rubricScore !== undefined);
  const hasSpeechRec = typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      {/* Left Configuration & Breathing Aurora Orb */}
      <div className="glass-surface rounded-2xl p-6 space-y-5 xl:col-span-4">
        <div>
          <h1 className="font-display text-xl font-bold text-white">AI Mock &amp; Voice Interviewer</h1>
          <p className="mt-1 text-xs text-slate-400">
            Web Speech API voice loop + dynamic Gemini follow-up probing
          </p>
        </div>

        {/* Breathing Aurora Orb */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#07080C]/80 py-8">
          <div className="relative flex h-28 w-28 items-center justify-center">
            <motion.div
              animate={{
                scale: speaking || listening ? [1, 1.18, 1] : [1, 1.05, 1],
                opacity: speaking || listening ? [0.65, 0.95, 0.65] : [0.35, 0.55, 0.35],
              }}
              transition={{ duration: speaking ? 1.4 : 3.2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#2DD4BF] to-[#818CF8] blur-xl"
            />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-[#10121A]">
              <Volume2 className={`h-7 w-7 ${speaking ? 'text-[#2DD4BF]' : listening ? 'text-[#FB7185]' : 'text-slate-300'}`} />
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-slate-300">
            {loading ? 'Interviewer thinking...' : listening ? 'Listening via microphone...' : speaking ? 'Speaking question...' : started ? 'Ready for your response' : 'Configure round to begin'}
          </p>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="mb-1 block text-slate-400">Target Company</label>
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#07080C] px-3 py-2 text-white outline-none focus:border-[#2DD4BF]"
            >
              {ALL_COMPANY_PORTALS.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-slate-400">Target Role</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#07080C] px-3 py-2 text-white outline-none focus:border-[#2DD4BF]"
            />
          </div>
          <div>
            <label className="mb-1 block text-slate-400">Interview Round</label>
            <select
              value={roundType}
              onChange={(e) => setRoundType(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#07080C] px-3 py-2 text-white outline-none focus:border-[#2DD4BF]"
            >
              <option>System Design &amp; Lakehouse Architecture</option>
              <option>Spark Tuning &amp; Production Debugging</option>
              <option>Data Modeling &amp; Analytical SQL Deep Dive</option>
              <option>Behavioral &amp; Project Deep Dive</option>
            </select>
          </div>

          <label className="flex items-center gap-2 pt-1 text-slate-300">
            <input
              type="checkbox"
              checked={voiceEnabled}
              onChange={(e) => setVoiceEnabled(e.target.checked)}
              className="accent-[#2DD4BF]"
            />
            <span>Read interviewer questions aloud (Text-to-Speech)</span>
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleStart}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2DD4BF] to-[#818CF8] py-2.5 text-xs font-semibold text-[#07080C]"
          >
            <Play className="h-3.5 w-3.5" />
            <span>{started ? 'Restart Session' : 'Start Interview'}</span>
          </button>
          {started && (
            <button
              onClick={() => callInterviewer(answer || 'Please summarize my performance.', true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-medium text-white hover:bg-white/10"
            >
              <Square className="h-3.5 w-3.5" />
              <span>Debrief</span>
            </button>
          )}
        </div>
      </div>

      {/* Right Live Transcript & Rubric */}
      <div className="flex flex-col gap-4 xl:col-span-8">
        <div className="glass-surface flex flex-1 flex-col overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
            <span className="font-display text-sm font-bold text-white">
              Live Interview Transcript · {company} ({experienceTier})
            </span>
            {turns.length > 0 && (
              <button
                onClick={saveTranscript}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2DD4BF] hover:underline"
              >
                {saved ? <Check className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
                <span>{saved ? 'Saved' : 'Save Transcript'}</span>
              </button>
            )}
          </div>

          <div className="max-h-[380px] min-h-[260px] flex-1 space-y-3 overflow-y-auto p-5">
            {turns.length === 0 ? (
              <p className="text-sm text-slate-400">
                Click &ldquo;Start Interview&rdquo; to begin a realistic multi-turn technical interview tailored to {company} and {experienceTier}.
              </p>
            ) : (
              turns.map((t, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-4 text-sm ${
                    t.role === 'interviewer'
                      ? 'border-white/10 bg-[#07080C]/80 text-slate-200'
                      : 'ml-8 border-[#2DD4BF]/30 bg-[#2DD4BF]/10 text-white'
                  }`}
                >
                  <div className="mb-1 font-mono text-[11px] text-[#2DD4BF]">
                    {t.role === 'interviewer' ? `${company} Principal Interviewer` : 'You'}
                  </div>
                  <p className="whitespace-pre-line leading-relaxed">{t.text}</p>
                </div>
              ))
            )}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-[#A78BFA]">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Evaluating your answer &amp; formulating follow-up...</span>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="flex items-end gap-2">
              {hasSpeechRec && (
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={!started}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                    listening
                      ? 'border-[#FB7185] bg-[#FB7185]/20 text-[#FB7185]'
                      : 'border-white/10 bg-[#07080C] text-slate-300 hover:border-[#2DD4BF]'
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
                placeholder={started ? 'Speak via mic or type your technical answer...' : 'Start the interview first...'}
                className="w-full resize-none rounded-xl border border-white/10 bg-[#07080C] px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-[#2DD4BF] disabled:opacity-50"
              />
              <button
                onClick={handleSendAnswer}
                disabled={!started || loading || !answer.trim()}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#2DD4BF] to-[#818CF8] px-4 text-xs font-semibold text-[#07080C] disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Respond</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Rubric Diagnostics */}
        {latestFeedback && (
          <div className="glass-surface rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold text-white">Live Practice Rubric</span>
              <span className="font-mono text-sm font-bold text-[#2DD4BF] tabular-nums">
                {latestFeedback.rubricScore}/10 (Practice Estimate)
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div>
                <div className="font-semibold text-[#34D399]">Demonstrated Strengths</div>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-300">
                  {(latestFeedback.strengths || []).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-semibold text-[#FBBF24]">Areas Probed Deeper</div>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-300">
                  {(latestFeedback.gapsToProbe || []).map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
