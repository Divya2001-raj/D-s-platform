import React, { useState } from 'react';
import { BookmarkPlus, Check, FileUp, Loader2, Sparkles, Target } from 'lucide-react';
import type { ExperienceTier } from '../types/platform';

interface JdAnalyzerViewProps {
  experienceTier: ExperienceTier;
  onSaveToNotebook: (title: string, content: string, topic: string) => Promise<void>;
}

interface JdAnalysisResult {
  targetRole: string;
  detectedCompany?: string;
  seniorityAssessment: string;
  extractedSkills: Array<{ skill: string; category: string; priority: string }>;
  gapAnalysis: Array<{ area: string; gapSeverity: string; actionableFix: string }>;
  recommendedTracks: string[];
  weekByWeekPlan: Array<{ week: string; focus: string; deliverables: string[] }>;
}

const SAMPLE_JD = `Senior Data Engineer (4-6+ YOE) — Core Data Platform
We are looking for a Senior Data Engineer to build petabyte-scale batch and real-time Lakehouse pipelines.
Requirements:
- Expert SQL optimization (Window functions, CTEs, query execution plans, partitioning/clustering).
- Production Apache Spark (PySpark) tuning: AQE, broadcast joins, skew mitigation, memory spill debugging.
- Open Lakehouse formats (Apache Iceberg or Delta Lake) with CDC incremental ingestion and SCD Type-2 modeling.
- Real-time event streaming with Apache Kafka & Apache Flink (watermarks, late data, exactly-once semantics).
- Cloud Data Warehousing (Snowflake or BigQuery), dbt, Airflow orchestration, Data Contracts, and FinOps cost control.`;

export function JdAnalyzerView({ experienceTier, onSaveToNotebook }: JdAnalyzerViewProps) {
  const [jdText, setJdText] = useState(SAMPLE_JD);
  const [currentSkills, setCurrentSkills] = useState('SQL, Python, PySpark, Airflow, Snowflake');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<JdAnalysisResult | null>(null);
  const [saved, setSaved] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const buf = await file.arrayBuffer();
      const rawText = new TextDecoder('latin1').decode(buf);
      const readable = rawText
        .replace(/[^\x20-\x7E\n\r]/g, ' ')
        .replace(/\s{3,}/g, '\n')
        .slice(0, 10000);
      setJdText(readable.trim() || `Uploaded PDF: ${file.name}. Paste key JD bullet points if PDF text is compressed.`);
    } else {
      const txt = await file.text();
      setJdText(txt.slice(0, 12000));
    }
  };

  const handleAnalyze = async () => {
    if (!jdText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/ai/analyze-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jdText,
          experienceTier,
          currentSkills: currentSkills.split(',').map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'JD analysis failed');
      setAnalysis(data as JdAnalysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to analyze JD');
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async () => {
    if (!analysis) return;
    const md = `# Custom JD Roadmap: ${analysis.targetRole}\n\n${analysis.seniorityAssessment}\n\n## Gap Analysis\n${analysis.gapAnalysis
      .map((g) => `- **${g.area}** (${g.gapSeverity}): ${g.actionableFix}`)
      .join('\n')}\n\n## Weekly Study Plan\n${analysis.weekByWeekPlan
      .map((w) => `### ${w.week}: ${w.focus}\n${w.deliverables.map((d) => `- ${d}`).join('\n')}`)
      .join('\n\n')}`;
    await onSaveToNotebook(`JD Roadmap: ${analysis.targetRole}`, md, 'Career Strategy');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="glass-surface rounded-2xl p-6 space-y-4 xl:col-span-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-white">Job Description Analyser</h1>
            <p className="text-xs text-slate-400">Paste JD text or upload a file to build a targeted gap roadmap</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10">
            <FileUp className="h-3.5 w-3.5 text-[#2DD4BF]" />
            <span>Upload JD</span>
            <input type="file" accept=".txt,.md,.pdf" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Your Current Core Strengths</label>
          <input
            value={currentSkills}
            onChange={(e) => setCurrentSkills(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#07080C] px-3 py-2 text-xs text-white outline-none focus:border-[#2DD4BF]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Target Job Description</label>
          <textarea
            rows={11}
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste target Data Engineer job description..."
            className="w-full rounded-xl border border-white/10 bg-[#07080C] p-3 text-xs leading-relaxed text-slate-200 outline-none focus:border-[#2DD4BF]"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-[#FB7185]/30 bg-[#FB7185]/10 p-3 text-xs text-[#FB7185]">
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading || !jdText.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2DD4BF] to-[#818CF8] py-2.5 text-xs font-semibold text-[#07080C] disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          <span>{loading ? 'Mapping Skills & Gaps...' : 'Analyze JD & Generate Roadmap'}</span>
        </button>
      </div>

      <div className="glass-surface rounded-2xl p-6 xl:col-span-7">
        {!analysis ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
            <Target className="h-8 w-8 text-[#2DD4BF]/70" />
            <h2 className="mt-3 font-display text-base font-bold text-white">Custom Gap Analysis &amp; Study Plan</h2>
            <p className="mt-1 max-w-md text-xs text-slate-400">
              Run the analyser to extract required Tier-1 Data Engineering competencies, benchmark against your {experienceTier} target tier, and map specific platform study tracks.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="text-xs text-[#2DD4BF]">
                  {analysis.detectedCompany || 'Target Role Match'} · {experienceTier}
                </div>
                <h2 className="mt-1 font-display text-xl font-bold text-white">{analysis.targetRole}</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{analysis.seniorityAssessment}</p>
              </div>
              <button
                onClick={savePlan}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#2DD4BF]/40 bg-[#2DD4BF]/10 px-3 py-1.5 text-xs font-semibold text-[#2DD4BF]"
              >
                {saved ? <Check className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
                <span>{saved ? 'Saved' : 'Save Roadmap'}</span>
              </button>
            </div>

            <div>
              <h3 className="mb-2.5 font-display text-sm font-bold text-white">Extracted Technical Requirements</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {analysis.extractedSkills.map((sk, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#07080C]/70 px-3 py-2 text-xs">
                    <div>
                      <div className="font-semibold text-white">{sk.skill}</div>
                      <div className="text-[11px] text-slate-400">{sk.category}</div>
                    </div>
                    <span className="font-mono text-[11px] text-[#2DD4BF]">{sk.priority}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2.5 font-display text-sm font-bold text-white">Prioritized Gap Analysis</h3>
              <div className="space-y-2.5">
                {analysis.gapAnalysis.map((g, idx) => (
                  <div key={idx} className="rounded-xl border border-white/10 bg-[#07080C]/70 p-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{g.area}</span>
                      <span className="font-mono text-[#FBBF24]">{g.gapSeverity}</span>
                    </div>
                    <p className="mt-1 text-slate-300">{g.actionableFix}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2.5 font-display text-sm font-bold text-white">Week-by-Week Execution Roadmap</h3>
              <div className="space-y-2.5">
                {analysis.weekByWeekPlan.map((w, idx) => (
                  <div key={idx} className="rounded-xl border border-white/10 bg-[#07080C]/70 p-4 text-xs">
                    <div className="font-display font-bold text-[#818CF8]">
                      {w.week} · {w.focus}
                    </div>
                    <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-300">
                      {w.deliverables.map((d, di) => (
                        <li key={di}>{d}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
