import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertTriangle,
  ArrowRight,
  BookmarkPlus,
  Check,
  Cpu,
  Layers,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { ProductionScenario } from '../types/platform';

interface SystemDesignStudioViewProps {
  scenarios: ProductionScenario[];
  initialTab?: 'studio' | 'scenarios' | 'deep-dive';
  onSaveToNotebook: (title: string, content: string, topic: string) => Promise<void>;
}

interface CanvasBlock {
  id: string;
  label: string;
  category: 'Ingest' | 'Streaming' | 'Batch Compute' | 'Lakehouse' | 'Serving' | 'Governance';
  note: string;
}

const COMPONENT_PALETTE: Array<Omit<CanvasBlock, 'id'>> = [
  { label: 'Debezium CDC', category: 'Ingest', note: 'Postgres/MySQL WAL log capture' },
  { label: 'Apache Kafka (KRaft)', category: 'Ingest', note: 'Partitioned commit log, ISR=2' },
  { label: 'Apache Flink', category: 'Streaming', note: 'Stateful watermarks + RocksDB' },
  { label: 'Spark Structured Streaming', category: 'Batch Compute', note: 'Micro-batch + AQE' },
  { label: 'Apache Iceberg on S3', category: 'Lakehouse', note: 'ACID MoR/CoW + Hidden Partitioning' },
  { label: 'Snowflake / BigQuery', category: 'Serving', note: 'Columnar MPP Warehouse' },
  { label: 'Apache Airflow / Dagster', category: 'Governance', note: 'DAG orchestration & backfills' },
  { label: 'Unity Catalog / DataHub', category: 'Governance', note: 'ABAC, PII Masking & Lineage' },
];

const BLUEPRINTS: Record<string, { title: string; scale: string; summary: string; blocks: CanvasBlock[] }> = {
  uber_realtime: {
    title: 'Real-Time Surge Pricing & Trip Lakehouse (Uber Scale)',
    scale: '500K GPS events/sec · P99 < 2s feature freshness · Multi-AZ 99.99%',
    summary:
      'Ingest driver GPS pings and trip state transitions via Kafka, compute 5-min tumbling geo-hash supply/demand aggregates in Flink with 60s allowed lateness + DLQ, write to Iceberg MoR Silver/Gold tables and Redis online feature store.',
    blocks: [
      { id: 'b1', label: 'Mobile Telemetry + CDC', category: 'Ingest', note: 'Protobuf validated at Edge' },
      { id: 'b2', label: 'Apache Kafka (KRaft)', category: 'Ingest', note: 'Partitioned by geo_city_id' },
      { id: 'b3', label: 'Apache Flink', category: 'Streaming', note: 'RocksDB + 60s Watermark' },
      { id: 'b4', label: 'Apache Iceberg on S3', category: 'Lakehouse', note: 'MoR + Hourly Compaction' },
      { id: 'b5', label: 'Trino / Pinot OLAP', category: 'Serving', note: 'Sub-second dashboard serving' },
    ],
  },
  fintech_cdc: {
    title: 'Zero-Loss Fintech Payment Settlement & Reconciliation Lakehouse',
    scale: '100K TPS peak · Exactly-once financial accuracy · Strict PII tokenization',
    summary:
      'Capture OLTP ledger mutations via Debezium CDC into Kafka (`acks=all`), run Write-Audit-Publish (WAP) quality contracts in Spark/Iceberg branching before promoting Gold settlement marts.',
    blocks: [
      { id: 'f1', label: 'Debezium CDC', category: 'Ingest', note: 'Outbox pattern + LSN ordering' },
      { id: 'f2', label: 'Apache Kafka (KRaft)', category: 'Ingest', note: 'acks=all, min.insync.replicas=2' },
      { id: 'f3', label: 'Spark + WAP Branch', category: 'Batch Compute', note: 'Tombstone-safe MERGE + QA' },
      { id: 'f4', label: 'Unity Catalog / DataHub', category: 'Governance', note: 'HMAC PII masking & audit' },
      { id: 'f5', label: 'Snowflake Gold Marts', category: 'Serving', note: 'Reconciled T+0 & T+1 views' },
    ],
  },
};

export function SystemDesignStudioView({
  scenarios,
  initialTab = 'studio',
  onSaveToNotebook,
}: SystemDesignStudioViewProps) {
  const [subTab, setSubTab] = useState<'studio' | 'scenarios' | 'deep-dive'>(initialTab);
  const [designTitle, setDesignTitle] = useState(BLUEPRINTS.uber_realtime.title);
  const [scaleMetrics, setScaleMetrics] = useState(BLUEPRINTS.uber_realtime.scale);
  const [summary, setSummary] = useState(BLUEPRINTS.uber_realtime.summary);
  const [blocks, setBlocks] = useState<CanvasBlock[]>(BLUEPRINTS.uber_realtime.blocks);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewMarkdown, setReviewMarkdown] = useState('');
  const [savedFlag, setSavedFlag] = useState(false);

  // Scenario Lab state
  const [selectedScenario, setSelectedScenario] = useState<ProductionScenario>(scenarios[0]);
  const [revealedSteps, setRevealedSteps] = useState(1);

  // Project Deep Dive state
  const [projTitle, setProjTitle] = useState('Multi-Tenant Iceberg Lakehouse Migration & FinOps Optimization');
  const [projStack, setProjStack] = useState('Apache Iceberg, Spark 3.5, Kafka, Airflow, Snowflake, Terraform');
  const [projScale, setProjScale] = useState('45 TB/day · Cut Snowflake + EMR compute spend by 42% · P99 SLA improved from 4h to 18m');
  const [projSummary, setProjSummary] = useState(
    'Led migration of 180 legacy Hive/Parquet pipelines to Apache Iceberg with Write-Audit-Publish quality branches, AQE skew salting, and automated bin-packing compaction.',
  );
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [deepDiveMd, setDeepDiveMd] = useState('');

  const addBlock = (item: Omit<CanvasBlock, 'id'>) => {
    setBlocks((prev) => [...prev, { ...item, id: `blk_${Date.now()}_${prev.length}` }]);
  };

  const runDesignReview = async () => {
    setReviewLoading(true);
    setReviewMarkdown('');
    try {
      const resp = await fetch('/api/ai/deep-dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'system_design_review',
          title: designTitle,
          scaleMetrics,
          summary,
          nodes: blocks.map((b) => ({ label: b.label, category: b.category })),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Architecture review failed');
      setReviewMarkdown(data.markdown);
    } catch (err) {
      setReviewMarkdown(`**Error:** ${err instanceof Error ? err.message : 'Unable to review architecture'}`);
    } finally {
      setReviewLoading(false);
    }
  };

  const runProjectDeepDive = async () => {
    setDeepDiveLoading(true);
    setDeepDiveMd('');
    try {
      const resp = await fetch('/api/ai/deep-dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'project_deep_dive',
          title: projTitle,
          techStack: projStack,
          scaleMetrics: projScale,
          summary: projSummary,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Deep dive generation failed');
      setDeepDiveMd(data.markdown);
    } catch (err) {
      setDeepDiveMd(`**Error:** ${err instanceof Error ? err.message : 'Unable to generate deep dive'}`);
    } finally {
      setDeepDiveLoading(false);
    }
  };

  const handleSaveNote = async (title: string, content: string, topic: string) => {
    await onSaveToNotebook(title, content, topic);
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-white">
            Architecture, Production Scenarios &amp; Project Deep Dive
          </h1>
          <p className="text-xs text-slate-400">
            Interactive pipeline composition · SEV-1 root-cause labs · Staff-level defense briefs
          </p>
        </div>

        <div className="flex rounded-xl border border-white/10 bg-[#10121A] p-1 text-xs">
          {[
            { id: 'studio' as const, label: 'System Design Studio' },
            { id: 'scenarios' as const, label: 'Production Scenario Lab' },
            { id: 'deep-dive' as const, label: 'Project Deep Dive' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`rounded-lg px-3.5 py-1.5 font-medium transition-colors ${
                subTab === t.id
                  ? 'bg-gradient-to-r from-[#2DD4BF] to-[#818CF8] font-semibold text-[#07080C]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'studio' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-8">
            <div className="glass-surface rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Layers className="h-4 w-4 text-[#2DD4BF]" />
                  <span>Pipeline Blueprint Canvas</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const bp = BLUEPRINTS.uber_realtime;
                      setDesignTitle(bp.title);
                      setScaleMetrics(bp.scale);
                      setSummary(bp.summary);
                      setBlocks(bp.blocks);
                    }}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/5"
                  >
                    Load Uber Real-Time
                  </button>
                  <button
                    onClick={() => {
                      const bp = BLUEPRINTS.fintech_cdc;
                      setDesignTitle(bp.title);
                      setScaleMetrics(bp.scale);
                      setSummary(bp.summary);
                      setBlocks(bp.blocks);
                    }}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/5"
                  >
                    Load Fintech CDC
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  value={designTitle}
                  onChange={(e) => setDesignTitle(e.target.value)}
                  placeholder="Architecture Title"
                  className="rounded-xl border border-white/10 bg-[#07080C] px-3 py-2 text-xs font-semibold text-white outline-none focus:border-[#2DD4BF]"
                />
                <input
                  value={scaleMetrics}
                  onChange={(e) => setScaleMetrics(e.target.value)}
                  placeholder="Throughput / Latency SLAs"
                  className="rounded-xl border border-white/10 bg-[#07080C] px-3 py-2 text-xs text-slate-200 outline-none focus:border-[#2DD4BF]"
                />
              </div>

              {/* Interactive Connected Flow */}
              <div className="rounded-xl border border-white/10 bg-[#07080C]/90 p-4">
                {blocks.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-500">
                    Add architecture components from the palette on the right.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2.5">
                    {blocks.map((blk, i) => (
                      <React.Fragment key={blk.id}>
                        <div className="group relative rounded-xl border border-white/15 bg-[#10121A] px-3.5 py-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono text-[10px] text-[#2DD4BF]">{blk.category}</span>
                            <button
                              onClick={() => setBlocks((p) => p.filter((x) => x.id !== blk.id))}
                              className="text-slate-500 hover:text-[#FB7185]"
                              aria-label={`Remove ${blk.label}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="mt-0.5 text-xs font-semibold text-white">{blk.label}</div>
                          <div className="mt-0.5 text-[11px] text-slate-400">{blk.note}</div>
                        </div>
                        {i < blocks.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 text-[#818CF8]" />}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              <textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Describe partitioning, late-arriving data handling, backpressure, and failure recovery..."
                className="w-full rounded-xl border border-white/10 bg-[#07080C] px-3 py-2.5 text-xs leading-relaxed text-slate-200 outline-none focus:border-[#2DD4BF]"
              />

              <div className="flex justify-end">
                <button
                  onClick={runDesignReview}
                  disabled={reviewLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2DD4BF] to-[#818CF8] px-4 py-2 text-xs font-semibold text-[#07080C] disabled:opacity-60"
                >
                  {reviewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  <span>{reviewLoading ? 'Reviewing Trade-offs...' : 'Run Staff Architecture Review'}</span>
                </button>
              </div>
            </div>

            {reviewMarkdown && (
              <div className="glass-surface rounded-2xl p-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-white">Staff Architecture Critique</h3>
                  <button
                    onClick={() => handleSaveNote(`Design Review: ${designTitle}`, reviewMarkdown, 'System Design')}
                    className="inline-flex items-center gap-1.5 text-xs text-[#2DD4BF] hover:underline"
                  >
                    {savedFlag ? <Check className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
                    <span>{savedFlag ? 'Saved' : 'Save to Notebook'}</span>
                  </button>
                </div>
                <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{reviewMarkdown}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          {/* Component Palette */}
          <div className="glass-surface rounded-2xl p-5 xl:col-span-4">
            <h2 className="font-display text-sm font-bold text-white">Component Building Blocks</h2>
            <p className="mt-1 text-xs text-slate-400">Click to append onto your architecture flow</p>
            <div className="mt-4 space-y-2">
              {COMPONENT_PALETTE.map((item) => (
                <button
                  key={item.label}
                  onClick={() => addBlock(item)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#07080C]/70 px-3.5 py-2.5 text-left transition-colors hover:border-[#2DD4BF]/40"
                >
                  <div>
                    <div className="text-xs font-semibold text-white">{item.label}</div>
                    <div className="text-[11px] text-slate-400">
                      {item.category} · {item.note}
                    </div>
                  </div>
                  <Plus className="h-4 w-4 shrink-0 text-[#2DD4BF]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'scenarios' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="glass-surface rounded-2xl p-4 xl:col-span-4">
            <h2 className="mb-3 font-display text-sm font-bold text-white">Production Incidents</h2>
            <div className="space-y-2">
              {scenarios.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => {
                    setSelectedScenario(sc);
                    setRevealedSteps(1);
                  }}
                  className={`w-full rounded-xl border p-3.5 text-left transition-colors ${
                    selectedScenario.id === sc.id
                      ? 'border-[#FB7185]/50 bg-[#FB7185]/10 text-white'
                      : 'border-white/10 bg-[#07080C]/60 text-slate-300 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-[#FB7185]">{sc.severity}</span>
                    <span className="text-slate-400">{sc.domain}</span>
                  </div>
                  <div className="mt-1 text-xs font-semibold leading-snug">{sc.title}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-surface rounded-2xl p-6 space-y-5 xl:col-span-8">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#FB7185]">
                <AlertTriangle className="h-4 w-4" />
                <span>{selectedScenario.severity}</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-400">{selectedScenario.environment}</span>
              </div>
              <h2 className="mt-1.5 font-display text-xl font-bold text-white">{selectedScenario.title}</h2>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#07080C]/80 p-4">
              <div className="text-xs font-semibold text-white">1. Problem &amp; Telemetry Clues</div>
              <p className="mt-1.5 text-sm text-slate-300">{selectedScenario.problem}</p>
              <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-slate-400">
                {selectedScenario.telemetryClues.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#2DD4BF]">
                  Progressive Postmortem Investigation ({Math.min(revealedSteps, 4)} / 4)
                </span>
                {revealedSteps < 4 && (
                  <button
                    onClick={() => setRevealedSteps((s) => Math.min(4, s + 1))}
                    className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
                  >
                    Reveal Next Stage
                  </button>
                )}
              </div>

              {revealedSteps >= 1 && (
                <div className="rounded-xl border border-white/10 bg-[#07080C]/70 p-4">
                  <div className="text-xs font-semibold text-white">2. Investigation Playbook</div>
                  <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-slate-300">
                    {selectedScenario.investigationSteps.map((st, idx) => (
                      <li key={idx}>{st}</li>
                    ))}
                  </ol>
                </div>
              )}

              {revealedSteps >= 2 && (
                <div className="rounded-xl border border-[#FBBF24]/30 bg-[#FBBF24]/5 p-4">
                  <div className="text-xs font-semibold text-[#FBBF24]">3. Root Cause</div>
                  <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-slate-200">
                    {selectedScenario.rootCause}
                  </p>
                </div>
              )}

              {revealedSteps >= 3 && (
                <div className="rounded-xl border border-[#34D399]/30 bg-[#34D399]/5 p-4">
                  <div className="text-xs font-semibold text-[#34D399]">4. Production Fix</div>
                  <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-slate-200">
                    {selectedScenario.solution}
                  </p>
                </div>
              )}

              {revealedSteps >= 4 && (
                <div className="rounded-xl border border-[#818CF8]/30 bg-[#818CF8]/5 p-4">
                  <div className="text-xs font-semibold text-[#818CF8]">5. Architectural Trade-Offs &amp; Prevention</div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-200">{selectedScenario.tradeOffs}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-400">
                    {selectedScenario.preventionChecklist.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {subTab === 'deep-dive' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="glass-surface rounded-2xl p-6 space-y-4 lg:col-span-5">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Cpu className="h-4 w-4 text-[#A78BFA]" />
              <span>Project Deep Dive Generator</span>
            </div>
            <p className="text-xs text-slate-400">
              Generate a 90-second executive pitch, &ldquo;Why X over Y?&rdquo; architecture justifications, and hard Staff-level follow-up Q&amp;As for your resume projects.
            </p>
            <input
              value={projTitle}
              onChange={(e) => setProjTitle(e.target.value)}
              placeholder="Project Title"
              className="w-full rounded-xl border border-white/10 bg-[#07080C] px-3 py-2 text-xs text-white outline-none focus:border-[#2DD4BF]"
            />
            <input
              value={projStack}
              onChange={(e) => setProjStack(e.target.value)}
              placeholder="Tech Stack"
              className="w-full rounded-xl border border-white/10 bg-[#07080C] px-3 py-2 text-xs text-white outline-none focus:border-[#2DD4BF]"
            />
            <input
              value={projScale}
              onChange={(e) => setProjScale(e.target.value)}
              placeholder="Scale & Measurable Impact"
              className="w-full rounded-xl border border-white/10 bg-[#07080C] px-3 py-2 text-xs text-white outline-none focus:border-[#2DD4BF]"
            />
            <textarea
              rows={4}
              value={projSummary}
              onChange={(e) => setProjSummary(e.target.value)}
              placeholder="Architecture, bottlenecks, and trade-offs..."
              className="w-full rounded-xl border border-white/10 bg-[#07080C] px-3 py-2 text-xs text-white outline-none focus:border-[#2DD4BF]"
            />
            <button
              onClick={runProjectDeepDive}
              disabled={deepDiveLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2DD4BF] to-[#818CF8] py-2.5 text-xs font-semibold text-[#07080C] disabled:opacity-60"
            >
              {deepDiveLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span>{deepDiveLoading ? 'Synthesizing Brief...' : 'Generate Defense Brief'}</span>
            </button>
          </div>

          <div className="glass-surface rounded-2xl p-6 lg:col-span-7">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-white">Interview Defense Brief</h3>
              {deepDiveMd && (
                <button
                  onClick={() => handleSaveNote(`Project Deep Dive: ${projTitle}`, deepDiveMd, 'Behavioral & Projects')}
                  className="inline-flex items-center gap-1.5 text-xs text-[#2DD4BF] hover:underline"
                >
                  <BookmarkPlus className="h-3.5 w-3.5" />
                  <span>Save to Notebook</span>
                </button>
              )}
            </div>
            {deepDiveMd ? (
              <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{deepDiveMd}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Enter your flagship project details on the left and click &ldquo;Generate Defense Brief&rdquo; to prepare for Hiring Manager &amp; Architecture Deep Dive rounds.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
