import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Cpu,
  Database,
  Eye,
  GitBranch,
  Layers,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { SPARK_UI_SCENARIOS, type SparkUiScenario } from '../data/sparkUiScenarios';

interface CheckItem {
  label: string;
  passed: boolean;
  hint: string;
}

/* ============================================================================
 * ROUND 3: SPARK UI & CATALYST PHYSICAL PLAN DEBUGGER
 * ============================================================================ */
export function SparkUiDebuggerPanel({
  userCode = '',
  onInsertFix,
}: {
  userCode?: string;
  onInsertFix?: (snippet: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(SPARK_UI_SCENARIOS[0].id);
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const [verifiedRan, setVerifiedRan] = useState(false);

  const scenario: SparkUiScenario = useMemo(
    () => SPARK_UI_SCENARIOS.find((s) => s.id === selectedId) || SPARK_UI_SCENARIOS[0],
    [selectedId],
  );
  const isRevealed = revealedIds.includes(scenario.id);
  const maxBucketTasks = Math.max(1, ...scenario.taskHistogram.map((b) => b.tasks));

  const toggleReveal = () => {
    setRevealedIds((prev) =>
      prev.includes(scenario.id) ? prev.filter((x) => x !== scenario.id) : [...prev, scenario.id],
    );
  };

  return (
    <div className="space-y-4 p-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-display text-sm font-bold text-white">
          <Cpu className="h-4 w-4 text-white" />
          <span>Spark UI Stage &amp; Catalyst Physical Plan Debugger (15 Production Traces)</span>
        </div>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="inset-surface max-w-xs rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--accent-primary)]"
        >
          {SPARK_UI_SCENARIOS.map((s, idx) => (
            <option key={s.id} value={s.id}>
              #{idx + 1} · {s.title}
            </option>
          ))}
        </select>
      </div>

      <div className="inset-surface rounded-xl p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold text-white">{scenario.stageSummary}</div>
          <span className="font-mono text-[11px] font-medium text-slate-300">{scenario.companyTag}</span>
        </div>
        <p className="mt-1.5 leading-relaxed text-slate-400">{scenario.symptom}</p>

        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { label: 'Median / Max Task', value: `${(scenario.medianTaskMs / 1000).toFixed(1)}s / ${(scenario.maxTaskMs / 1000).toFixed(1)}s`, warn: scenario.maxTaskMs > scenario.medianTaskMs * 10 },
            { label: 'Shuffle Read / Write', value: `${(scenario.shuffleReadMb / 1024).toFixed(1)} / ${(scenario.shuffleWriteMb / 1024).toFixed(1)} GB`, warn: scenario.shuffleReadMb > 25000 },
            { label: 'Disk Spill', value: `${(scenario.spillDiskMb / 1024).toFixed(1)} GB`, warn: scenario.spillDiskMb > 5000 },
            { label: 'JVM GC Time %', value: `${scenario.gcTimePct}%`, warn: scenario.gcTimePct >= 25 },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-white/10 bg-black/20 p-2.5">
              <div className="text-[11px] text-slate-400">{m.label}</div>
              <div className={`mt-0.5 font-mono text-xs font-bold tabular-nums ${m.warn ? 'text-white underline decoration-dotted' : 'text-slate-300'}`}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* Task Duration Distribution Histogram */}
        <div className="mt-3 space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Task Duration Histogram ({scenario.taskCount.toLocaleString()} Tasks)
          </div>
          {scenario.taskHistogram.map((b) => (
            <div key={b.bucket} className="flex items-center gap-2 font-mono text-[11px]">
              <span className="w-32 shrink-0 truncate text-slate-400">{b.bucket}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-500/20">
                <div
                  className={`h-full rounded-full ${b.isStraggler ? 'bg-[var(--accent-primary)]' : 'bg-neutral-500/60'}`}
                  style={{ width: `${Math.max(4, Math.round((b.tasks / maxBucketTasks) * 100))}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right tabular-nums text-white">
                {b.tasks.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-white">
          <GitBranch className="h-3.5 w-3.5" />
          <span>Catalyst Physical Execution Plan</span>
        </div>
        <pre className="inset-surface overflow-x-auto rounded-xl p-3 font-mono text-[11px] leading-relaxed text-slate-200">
          {scenario.catalystSnippet}
        </pre>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleReveal}
          className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>{isRevealed ? 'Hide Diagnosis & Tuning Fix' : 'Inspect Root Cause & PySpark Fix'}</span>
        </button>

        {isRevealed && onInsertFix && (
          <button
            type="button"
            onClick={() => onInsertFix(scenario.fixConfigOrCode)}
            className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Insert Config Snippet</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setVerifiedRan(true)}
          className="btn-primary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs"
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Run 6-Point Spark Tuning Check</span>
        </button>
      </div>

      {verifiedRan && (() => {
        const lower = `${userCode} ${isRevealed ? scenario.fixConfigOrCode : ''}`.toLowerCase();
        const sparkChecks: CheckItem[] = [
          {
            label: '1 · Adaptive Query Execution (AQE)',
            passed: /(adaptive\.enabled|coalescepartitions|aqe)/.test(lower),
            hint: 'Enable spark.sql.adaptive.enabled & partition coalescing.',
          },
          {
            label: '2 · Skew Join / Salting / NULL Split',
            passed: /(skewjoin|salt|is not null|is null)/.test(lower),
            hint: 'Mitigate straggler bucket via AQE skewJoin, key salting, or NULL isolation.',
          },
          {
            label: '3 · Broadcast Strategy Guard',
            passed: /(broadcast|autobroadcastjointhreshold|sortmerge)/.test(lower),
            hint: 'Tune broadcast threshold or explicit F.broadcast() cleanly.',
          },
          {
            label: '4 · Shuffle Partition & File Sizing',
            passed: /(shuffle\.partitions|repartition|coalesce|rewrite_data_files|advisorypartitionsize)/.test(lower),
            hint: 'Size shuffle partitions (~128–200MB) or run Iceberg/Delta bin-packing.',
          },
          {
            label: '5 · Memory Spill & Vectorization',
            passed: /(memory_and_disk|unpersist|pandas_udf|from_json|approx_count_distinct|partitionoverwritemode)/.test(lower),
            hint: 'Avoid row-by-row Python UDFs, unbounded .cache(), or static overwrite.',
          },
          {
            label: '6 · Driver Heap Protection',
            passed: !/\.collect\(\)/.test(userCode) || /limit\(/.test(lower),
            hint: 'Never call unbounded .collect() on distributed partitions; write or .limit().',
          },
        ];
        const passCnt = sparkChecks.filter((c) => c.passed).length;
        return (
          <div className="inset-surface rounded-xl p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-white">6-Point PySpark / Spark UI Tuning Audit</span>
              <span className={`font-mono font-bold tabular-nums ${passCnt >= 4 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                {passCnt}/6 Passed
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {sparkChecks.map((c) => (
                <div key={c.label} className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/20 p-2">
                  {c.passed ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#10B981]" />
                  ) : (
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EF4444]" />
                  )}
                  <div>
                    <div className="font-medium text-white">
                      <span className={`mr-1 font-mono text-[10px] font-bold ${c.passed ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                        {c.passed ? 'PASS' : 'FAIL'}
                      </span>
                      · {c.label}
                    </div>
                    {!c.passed && <div className="text-[11px] text-slate-400">{c.hint}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {isRevealed && (
        <div className="inset-surface space-y-2 rounded-xl p-3.5">
          <div className="font-semibold text-white">Diagnosed Bottleneck</div>
          <p className="leading-relaxed text-slate-300">{scenario.rootCause}</p>
          <pre className="inset-surface overflow-x-auto rounded-lg p-3 font-mono text-[11px] text-slate-200">
            {scenario.fixConfigOrCode}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * ROUND 4: DIMENSIONAL DATA MODELING STUDIO
 * ============================================================================ */
interface ModelTable {
  id: string;
  name: string;
  kind: 'Fact' | 'Dimension' | 'Mini-Dim / Bridge';
  scdMode: 'Transaction Fact' | 'SCD Type 1' | 'SCD Type 2' | 'SCD Type 4' | 'Bridge Weighted';
  columns: string;
}

export function DimensionalModelingStudio({
  questionTitle,
  submissionText,
  onSyncSubmission,
}: {
  questionTitle: string;
  submissionText: string;
  onSyncSubmission: (nextMarkdown: string) => void;
}) {
  const [grain, setGrain] = useState('One row per atomic event / transaction ID with surrogate keys');
  const [partitionSpec, setPartitionSpec] = useState('PARTITION BY event_date, CLUSTER BY entity_sk');
  const [lateHandling, setLateHandling] = useState('Inferred member surrogate key (-1) for late dimensions; MERGE idempotent update');
  const [tables, setTables] = useState<ModelTable[]>([
    {
      id: 't_fact',
      name: 'fct_core_events',
      kind: 'Fact',
      scdMode: 'Transaction Fact',
      columns: 'event_sk (PK), entity_sk (FK), dim_date_sk (FK), base_amount_cents, unit_count, event_ts',
    },
    {
      id: 't_dim1',
      name: 'dim_entity_scd2',
      kind: 'Dimension',
      scdMode: 'SCD Type 2',
      columns: 'entity_sk (PK), natural_entity_id, tier_name, effective_from, effective_to, is_current',
    },
  ]);

  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<ModelTable['kind']>('Dimension');
  const [newScd, setNewScd] = useState<ModelTable['scdMode']>('SCD Type 2');
  const [newCols, setNewCols] = useState('dim_sk (PK), natural_id, attribute_a');

  const ddlPreview = useMemo(() => {
    return tables
      .map((t) => {
        const cols = t.columns
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)
          .map((c) => `  ${c}`)
          .join(',\n');
        return `-- ${t.kind} (${t.scdMode})\nCREATE TABLE analytics.${t.name} (\n${cols}\n);`;
      })
      .join('\n\n');
  }, [tables]);

  const combinedText = `${grain}\n${partitionSpec}\n${lateHandling}\n${ddlPreview}\n${submissionText}`.toLowerCase();

  const verificationChecks: CheckItem[] = [
    {
      label: 'Check 1 · Explicit Atomic Grain Declaration',
      passed: grain.trim().length >= 18 && /(one row per|atomic|per )/.test(grain.toLowerCase()),
      hint: 'Specify "One row per ..." before creating fact tables.',
    },
    {
      label: 'Check 2 · Fact & Conformed Dimension Tables',
      passed: tables.some((t) => t.kind === 'Fact') && tables.some((t) => t.kind !== 'Fact'),
      hint: 'Model at least 1 Fact table and 1 Dimension / Bridge table.',
    },
    {
      label: 'Check 3 · Surrogate PK / FK Linkage (_sk / PK / FK)',
      passed: /(pk|_sk|fk|surrogate)/.test(combinedText),
      hint: 'Include surrogate PK/FK keys joining Fact to Dimensions.',
    },
    {
      label: 'Check 4 · Historical SCD Type 2 / Type 4 Tracking',
      passed: /(effective_from|valid_from|is_current|scd|mini)/.test(combinedText),
      hint: 'Add SCD Type 2 effective dates or SCD4 mini-dimension strategy.',
    },
    {
      label: 'Check 5 · Partitioning & Physical Storage Alignment',
      passed: /(partition|cluster|z-order|bucket|date)/.test(combinedText),
      hint: 'Define partition_by / clustering column for scan pruning.',
    },
    {
      label: 'Check 6 · Late-Arriving Dimensions & Fan-Out Guard',
      passed: /(inferred|unknown|-1|fan-out|merge|additive|cents|null)/.test(combinedText),
      hint: 'Address late-arriving dims (-1 inferred key) & non-additive metric safety.',
    },
  ];

  const handleAddTable = () => {
    if (!newName.trim()) return;
    setTables((prev) => [
      ...prev,
      {
        id: `t_${Date.now()}`,
        name: newName.trim().replace(/\s+/g, '_').toLowerCase(),
        kind: newKind,
        scdMode: newScd,
        columns: newCols,
      },
    ]);
    setNewName('');
  };

  const handleExportToMarkdown = () => {
    const md = `# Dimensional Modeling Blueprint: ${questionTitle}

## 1. Explicit Fact Grain
${grain}

## 2. Partitioning & Late-Arriving Handling
- Physical Layout: ${partitionSpec}
- Late Dimensions & Integrity: ${lateHandling}

## 3. Star / Snowflake DDL Schema
\`\`\`sql
${ddlPreview}
\`\`\`
`;
    onSyncSubmission(md);
  };

  const passedCount = verificationChecks.filter((c) => c.passed).length;

  return (
    <div className="space-y-4 p-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-display text-sm font-bold text-white">
          <Database className="h-4 w-4 text-white" />
          <span>Interactive Star Schema &amp; SCD Studio</span>
        </div>
        <button
          type="button"
          onClick={handleExportToMarkdown}
          className="btn-primary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Sync Blueprint To Submission</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-400">Fact Table Grain Declaration</label>
          <input
            value={grain}
            onChange={(e) => setGrain(e.target.value)}
            className="inset-surface w-full rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--accent-primary)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-400">Partitioning &amp; Clustering Strategy</label>
          <input
            value={partitionSpec}
            onChange={(e) => setPartitionSpec(e.target.value)}
            className="inset-surface w-full rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--accent-primary)]"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold text-slate-400">Late-Arriving Dimensions &amp; Fan-Out Guard</label>
        <input
          value={lateHandling}
          onChange={(e) => setLateHandling(e.target.value)}
          className="inset-surface w-full rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--accent-primary)]"
        />
      </div>

      {/* Interactive Table Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {tables.map((t) => (
          <div key={t.id} className="inset-surface rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-xs font-bold text-white">{t.name}</div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-slate-400">
                  {t.kind} · {t.scdMode}
                </span>
                {tables.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setTables((prev) => prev.filter((x) => x.id !== t.id))}
                    className="text-slate-400 hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <textarea
              rows={2}
              value={t.columns}
              onChange={(e) =>
                setTables((prev) =>
                  prev.map((x) => (x.id === t.id ? { ...x, columns: e.target.value } : x)),
                )
              }
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 p-2 font-mono text-[11px] text-slate-200 outline-none"
            />
          </div>
        ))}
      </div>

      {/* Add Table Bar */}
      <div className="inset-surface flex flex-wrap items-center gap-2 rounded-xl p-2.5">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New table name (e.g. dim_zone_hex)"
          className="min-w-[160px] flex-1 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-xs text-white outline-none"
        />
        <select
          value={newKind}
          onChange={(e) => setNewKind(e.target.value as ModelTable['kind'])}
          className="inset-surface rounded-lg px-2.5 py-1.5 text-xs text-white"
        >
          <option value="Dimension">Dimension</option>
          <option value="Fact">Fact</option>
          <option value="Mini-Dim / Bridge">Mini-Dim / Bridge</option>
        </select>
        <select
          value={newScd}
          onChange={(e) => setNewScd(e.target.value as ModelTable['scdMode'])}
          className="inset-surface rounded-lg px-2.5 py-1.5 text-xs text-white"
        >
          <option value="SCD Type 2">SCD Type 2</option>
          <option value="SCD Type 1">SCD Type 1</option>
          <option value="SCD Type 4">SCD Type 4</option>
          <option value="Transaction Fact">Transaction Fact</option>
          <option value="Bridge Weighted">Bridge Weighted</option>
        </select>
        <input
          value={newCols}
          onChange={(e) => setNewCols(e.target.value)}
          placeholder="comma-sep columns"
          className="min-w-[180px] flex-1 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 font-mono text-[11px] text-white outline-none"
        />
        <button
          type="button"
          onClick={handleAddTable}
          className="btn-secondary inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Table</span>
        </button>
      </div>

      {/* 6-Point Automated Verification */}
      <div className="inset-surface rounded-xl p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold text-white">6-Point Dimensional Schema Verification</span>
          <span className={`font-mono font-bold ${passedCount === 6 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            {passedCount}/6 Passed
          </span>
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {verificationChecks.map((c) => (
            <div key={c.label} className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/20 p-2">
              {c.passed ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#10B981]" />
              ) : (
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EF4444]" />
              )}
              <div>
                <div className="font-medium text-white">
                  <span className={`mr-1 font-mono text-[10px] font-bold ${c.passed ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                    {c.passed ? 'PASS' : 'FAIL'}
                  </span>
                  · {c.label}
                </div>
                {!c.passed && <div className="text-[11px] text-slate-400">{c.hint}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * ROUNDS 5 & 8: 4-PHASE TIER-1 SYSTEM DESIGN STUDIO
 * (Phase 1 Clarification Q&A -> Phase 2 Sizing -> Phase 3 Whiteboard -> Phase 4 Stress Suite)
 * ============================================================================ */
interface WhiteboardNode {
  id: string;
  label: string;
  layer: 'Source' | 'Ingest' | 'Compute' | 'Storage' | 'Serving' | 'Governance';
  partitionKey: string;
  edgeLabel: string;
}

const NODE_TEMPLATES: Array<Omit<WhiteboardNode, 'id'>> = [
  { label: 'Debezium CDC', layer: 'Source', partitionKey: 'tx_id / tenant_id', edgeLabel: 'WAL Change Stream' },
  { label: 'Kafka / Kinesis', layer: 'Ingest', partitionKey: 'entity_id (salted)', edgeLabel: 'acks=all · 7d WAL' },
  { label: 'Apache Flink', layer: 'Compute', partitionKey: 'keyBy(account_id)', edgeLabel: 'Watermark 2PC Sink' },
  { label: 'Spark Structured Streaming', layer: 'Compute', partitionKey: 'micro-batch AQE', edgeLabel: 'Checkpoint S3' },
  { label: 'S3 / ADLS / GCS', layer: 'Storage', partitionKey: 'dt=YYYY-MM-DD', edgeLabel: 'Parquet 256MB' },
  { label: 'Delta Lake / Apache Iceberg', layer: 'Storage', partitionKey: 'days(ts), bucket(64,id)', edgeLabel: 'ACID MERGE + MoR' },
  { label: 'Snowflake / BigQuery / ClickHouse', layer: 'Serving', partitionKey: 'CLUSTER BY (org,dt)', edgeLabel: 'Sub-sec OLAP' },
  { label: 'Redis / DynamoDB', layer: 'Serving', partitionKey: 'feature:{user_id}', edgeLabel: '<10ms Point Lookup' },
  { label: 'Dead-Letter Queue (DLQ)', layer: 'Governance', partitionKey: 'error_code + topic', edgeLabel: 'Side-Output Poison' },
  { label: 'Schema Registry', layer: 'Governance', partitionKey: 'subject-vN', edgeLabel: 'BACKWARD Contract' },
  { label: 'Airflow / dbt', layer: 'Governance', partitionKey: 'execution_date', edgeLabel: 'WAP Silver->Gold' },
];

interface ClarifyTurn {
  q: string;
  a: string;
}

export function ArchitectureWhiteboardStudio({
  questionTitle,
  questionPrompt = '',
  submissionText,
  onSyncSubmission,
}: {
  questionTitle: string;
  questionPrompt?: string;
  submissionText: string;
  onSyncSubmission: (nextMarkdown: string) => void;
}) {
  const [phase, setPhase] = useState<1 | 2 | 3 | 4>(1);

  // Phase 1: Requirement Clarification Q&A
  const [clarifyInput, setClarifyInput] = useState('');
  const [clarifyLoading, setClarifyLoading] = useState(false);
  const [clarifications, setClarifications] = useState<ClarifyTurn[]>([
    {
      q: 'Baseline scale & freshness SLA assumptions?',
      a: 'Expect 250K sustained events/sec (2.5x peak burst = 625K/sec), avg 1.2 KB payload, <5s end-to-end streaming freshness for alerting, 1-hour SLA for Gold BI, 365-day Lakehouse retention.',
    },
  ]);

  // Phase 2: Back-of-the-Envelope Calculator State
  const [eventsPerSec, setEventsPerSec] = useState(250000);
  const [payloadKb, setPayloadKb] = useState(1.2);
  const [retentionDays, setRetentionDays] = useState(365);
  const [replicationFactor, setReplicationFactor] = useState(3);

  // Phase 3: Interactive Drag & Connect Whiteboard
  const [nodes, setNodes] = useState<WhiteboardNode[]>([
    { id: 'n1', label: 'Debezium CDC', layer: 'Source', partitionKey: 'order_id', edgeLabel: 'WAL Change Stream' },
    { id: 'n2', label: 'Kafka / Kinesis', layer: 'Ingest', partitionKey: 'merchant_id (salted)', edgeLabel: 'acks=all · 7d WAL' },
    { id: 'n3', label: 'Apache Flink', layer: 'Compute', partitionKey: 'keyBy(merchant_id)', edgeLabel: 'Watermark + 2PC' },
    { id: 'n4', label: 'Delta Lake / Apache Iceberg', layer: 'Storage', partitionKey: 'days(ts), bucket(64,id)', edgeLabel: 'ACID MERGE + MoR' },
    { id: 'n5', label: 'Snowflake / BigQuery / ClickHouse', layer: 'Serving', partitionKey: 'CLUSTER BY (dt,org)', edgeLabel: 'BI & <200ms API' },
    { id: 'n6', label: 'Dead-Letter Queue (DLQ)', layer: 'Governance', partitionKey: 'schema_err', edgeLabel: 'Poison Pill Isolation' },
  ]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [tradeoffNotes, setTradeoffNotes] = useState(
    'Chose Flink + RocksDB over batch hourly Spark for <5s alerting SLA; Iceberg MoR with async compaction avoids write stalls; salted hot merchant_id keys + Schema Registry BACKWARD compatibility + DLQ quarantine.',
  );

  // Phase 4: Stress Suite Trigger Counter
  const [suiteRunAt, setSuiteRunAt] = useState<string | null>(null);

  const sizing = useMemo(() => {
    const rawMbPerSec = (eventsPerSec * payloadKb) / 1024;
    const peakMbPerSec = rawMbPerSec * 2.5;
    const rawGbPerDay = (rawMbPerSec * 86400) / 1024;
    const compressedTbPerYear = (rawGbPerDay * retentionDays * 0.35) / 1024;
    const compressedPbPerYear = compressedTbPerYear / 1024;
    const replicatedKafkaTb = (rawGbPerDay * 7 * replicationFactor) / 1024;
    const recommendedKafkaPartitions = Math.max(12, Math.ceil(peakMbPerSec / 25));
    const estMonthlyStorageCost = Math.round(compressedTbPerYear * 1024 * 0.023);
    const estMonthlyComputeCost = Math.round(peakMbPerSec * 8.5);
    return {
      rawMbPerSec: rawMbPerSec.toFixed(1),
      peakMbPerSec: peakMbPerSec.toFixed(1),
      rawGbPerDay: rawGbPerDay.toFixed(0),
      compressedTbPerYear: compressedTbPerYear.toFixed(1),
      compressedPbPerYear: compressedPbPerYear.toFixed(3),
      replicatedKafkaTb: replicatedKafkaTb.toFixed(1),
      recommendedKafkaPartitions,
      estMonthlyTotalUsd: estMonthlyStorageCost + estMonthlyComputeCost,
    };
  }, [eventsPerSec, payloadKb, retentionDays, replicationFactor]);

  const askInterviewer = async (preset?: string) => {
    const q = (preset || clarifyInput).trim();
    if (!q) return;
    setClarifyLoading(true);
    try {
      const resp = await fetch('/api/ai/design-clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionTitle,
          questionPrompt,
          userQuestion: q,
          currentPhase: `Phase ${phase}`,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.answer) {
        setClarifications((prev) => [...prev, { q, a: String(data.answer) }]);
      } else {
        throw new Error(data.error || 'Clarification fallback');
      }
    } catch {
      const lower = q.toLowerCase();
      const fallback = lower.includes('late') || lower.includes('dedup')
        ? 'Allow up to 15-minute out-of-order late arrival before watermark triggers side-output DLQ; duplicates occur ~2% on network retries—require idempotent MERGE by event_id.'
        : lower.includes('pii') || lower.includes('gdpr') || lower.includes('cost')
          ? 'All PII fields (email, phone) require HMAC tokenization pre-Lakehouse; support GDPR deletion within 72h and keep infra FinOps < $18K/month.'
          : 'Expect 10x burst spikes during flash events, strict BACKWARD schema compatibility (Avro/Protobuf), and p99 serving query latency < 500ms.';
      setClarifications((prev) => [...prev, { q, a: fallback }]);
    } finally {
      setClarifyLoading(false);
      if (!preset) setClarifyInput('');
    }
  };

  const moveNode = (from: number, to: number) => {
    if (to < 0 || to >= nodes.length || from === to) return;
    setNodes((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  };

  const combined = `${nodes.map((n) => `${n.label} ${n.partitionKey} ${n.edgeLabel}`).join(' -> ')} ${sizing.rawMbPerSec} MB/s ${sizing.compressedTbPerYear} TB ${tradeoffNotes} ${submissionText}`.toLowerCase();

  const checks: CheckItem[] = [
    {
      label: 'Test 1 · Throughput & Storage Sizing Math (MB/s, TB/PB, Partitions)',
      passed: eventsPerSec >= 1000 && Number(sizing.peakMbPerSec) > 0 && sizing.recommendedKafkaPartitions >= 12,
      hint: 'Complete Phase 2 Back-of-the-Envelope calculator with realistic event rate & retention.',
    },
    {
      label: 'Test 2 · 10x Spike Backpressure Resilience',
      passed:
        nodes.some((n) => /kafka|kinesis/i.test(n.label)) &&
        nodes.some((n) => /flink|spark/i.test(n.label)),
      hint: 'Decouple durable log (Kafka/Kinesis) before stateful compute (Flink/Spark).',
    },
    {
      label: 'Test 3 · Exactly-Once & Duplicate CDC Idempotency',
      passed:
        /(2pc|merge|idempoten|exactly|upsert|cdc|debezium|checkpoint)/.test(combined) &&
        nodes.some((n) => /iceberg|delta|lakehouse|s3/i.test(n.label)),
      hint: 'Include ACID Lakehouse sink (Iceberg/Delta) and idempotent MERGE / 2PC strategy.',
    },
    {
      label: 'Test 4 · Hot-Partition / Celebrity Skew Mitigation',
      passed: /(salt|bucket|skew|keyby|partition|cluster)/.test(combined),
      hint: 'Specify salted or bucketed partition keys on high-volume ingest/storage nodes.',
    },
    {
      label: 'Test 5 · Schema Evolution & DLQ Poison-Pill Isolation',
      passed:
        nodes.some((n) => /dlq|schema registry|dead-letter/i.test(n.label)) ||
        /(dlq|dead-letter|schema registry|quarantine|backward)/.test(combined),
      hint: 'Add Schema Registry or Dead-Letter Queue (DLQ) node to isolate malformed payloads.',
    },
    {
      label: 'Test 6 · Serving Latency SLA & FinOps Cost Efficiency',
      passed:
        nodes.some((n) => n.layer === 'Serving') &&
        /(finops|compact|mor|ttl|cost|tier|cluster|sla|redis|clickhouse|snowflake)/.test(combined),
      hint: 'Add low-latency Serving layer (Snowflake/ClickHouse/Redis) + compaction/FinOps notes.',
    },
  ];

  const handleExportToMarkdown = () => {
    const pipelineChain = nodes
      .map((n, i) => `${i + 1}. **${n.label}** _(${n.layer})_ — Key: \`${n.partitionKey}\` → _${n.edgeLabel}_`)
      .join('\n');
    const clarifyBlock = clarifications.map((c) => `- **Q:** ${c.q}\n  - **Constraint:** ${c.a}`).join('\n');
    const md = `# System Design Specification: ${questionTitle}

## Phase 1 · Clarified Requirements & Constraints
${clarifyBlock}

## Phase 2 · Back-of-the-Envelope Scale & FinOps Sizing
- Sustained Ingest: **${eventsPerSec.toLocaleString()} events/sec** (~**${sizing.rawMbPerSec} MB/s**, **${sizing.peakMbPerSec} MB/s peak @ 2.5x**)
- Daily Uncompressed Volume: **${sizing.rawGbPerDay} GB/day**
- Compressed Lakehouse Storage (${retentionDays}d retention @ 0.35 Parquet ratio): **${sizing.compressedTbPerYear} TB** (**${sizing.compressedPbPerYear} PB/yr**)
- Kafka Buffer (7d × RF ${replicationFactor}): **${sizing.replicatedKafkaTb} TB** across **${sizing.recommendedKafkaPartitions} partitions**
- Estimated Cloud Infra Cost: **$${sizing.estMonthlyTotalUsd.toLocaleString()}/month**

## Phase 3 · End-to-End Pipeline Whiteboard
${pipelineChain}

## Phase 4 · Trade-Offs, Failure Modes & Stress Readiness
${tradeoffNotes}
`;
    onSyncSubmission(md);
  };

  const passedCount = checks.filter((c) => c.passed).length;

  return (
    <div className="space-y-4 p-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-display text-sm font-bold text-white">
          <Layers className="h-4 w-4 text-white" />
          <span>4-Phase Tier-1 System Design Studio</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPhase(4);
              setSuiteRunAt(new Date().toLocaleTimeString());
            }}
            className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold"
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Run Architecture Test Suite ({passedCount}/6)</span>
          </button>
          <button
            type="button"
            onClick={handleExportToMarkdown}
            className="btn-primary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Insert Full Spec &amp; Sizing</span>
          </button>
        </div>
      </div>

      {/* 4-Phase Stepper */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {[
          { id: 1 as const, label: '1 · Clarify SLA' },
          { id: 2 as const, label: '2 · PB/TB Sizing' },
          { id: 3 as const, label: '3 · Whiteboard' },
          { id: 4 as const, label: `4 · Stress Tests (${passedCount}/6)` },
        ].map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPhase(p.id)}
            className={`rounded-xl border px-2.5 py-2 text-left font-medium whitespace-nowrap transition-colors ${
              phase === p.id
                ? 'tab-active border-transparent'
                : 'inset-surface text-slate-400 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* PHASE 1: ASK THE INTERVIEWER */}
      {phase === 1 && (
        <div className="inset-surface space-y-3 rounded-xl p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-white">Ask the Interviewer (Unlock Constraints Without Spoilers)</span>
            <span className="font-mono text-[11px] text-slate-400">{clarifications.length} constraints unlocked</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              'What is the late-arriving event bound & duplicate rate?',
              'Are there PII/GDPR deletion SLAs or multi-region compliance rules?',
              'What p99 query latency & monthly FinOps budget do we target?',
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={clarifyLoading}
                onClick={() => askInterviewer(preset)}
                className="btn-secondary rounded-lg px-2.5 py-1 text-[11px]"
              >
                + {preset}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={clarifyInput}
              onChange={(e) => setClarifyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  askInterviewer();
                }
              }}
              placeholder="Ask interviewer about peak traffic, schema evolution, or backfills..."
              className="inset-surface flex-1 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--accent-primary)]"
            />
            <button
              type="button"
              disabled={clarifyLoading || !clarifyInput.trim()}
              onClick={() => askInterviewer()}
              className="btn-primary rounded-xl px-3.5 py-2 disabled:opacity-50"
            >
              {clarifyLoading ? 'Asking...' : 'Ask'}
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {clarifications.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                <div className="font-semibold text-slate-300">Q: {item.q}</div>
                <div className="mt-1 leading-relaxed text-white">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PHASE 2: BACK-OF-THE-ENVELOPE CALCULATOR */}
      {phase === 2 && (
        <div className="inset-surface rounded-xl p-3.5">
          <div className="mb-2.5 flex items-center gap-2 font-semibold text-white">
            <Calculator className="h-4 w-4 text-white" />
            <span>Back-of-the-Envelope Scale &amp; Cost Sizing (MB/s · PB/yr · Partitions)</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <label className="block">
              <span className="text-[11px] text-slate-400">Events / Sec</span>
              <input
                type="number"
                min={100}
                value={eventsPerSec}
                onChange={(e) => setEventsPerSec(Math.max(1, Number(e.target.value)))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5 font-mono text-xs text-white outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-400">Avg Payload (KB)</span>
              <input
                type="number"
                step={0.1}
                min={0.1}
                value={payloadKb}
                onChange={(e) => setPayloadKb(Math.max(0.1, Number(e.target.value)))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5 font-mono text-xs text-white outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-400">Retention (Days)</span>
              <input
                type="number"
                min={1}
                value={retentionDays}
                onChange={(e) => setRetentionDays(Math.max(1, Number(e.target.value)))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5 font-mono text-xs text-white outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-400">Kafka RF</span>
              <input
                type="number"
                min={1}
                max={5}
                value={replicationFactor}
                onChange={(e) => setReplicationFactor(Math.max(1, Number(e.target.value)))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5 font-mono text-xs text-white outline-none"
              />
            </label>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4 font-mono">
            <div className="rounded-lg border border-white/10 bg-black/20 p-2">
              <div className="text-[10px] text-slate-400">Ingest Bandwidth</div>
              <div className="font-bold text-white tabular-nums">{sizing.rawMbPerSec} MB/s</div>
              <div className="text-[10px] text-slate-300">Peak: {sizing.peakMbPerSec} MB/s</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-2">
              <div className="text-[10px] text-slate-400">Daily / Annual Lake</div>
              <div className="font-bold text-white tabular-nums">{sizing.rawGbPerDay} GB/d</div>
              <div className="text-[10px] text-slate-300">
                {sizing.compressedTbPerYear} TB ({sizing.compressedPbPerYear} PB)
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-2">
              <div className="text-[10px] text-slate-400">Kafka Sizing</div>
              <div className="font-bold text-white tabular-nums">{sizing.recommendedKafkaPartitions} parts</div>
              <div className="text-[10px] text-slate-400">{sizing.replicatedKafkaTb} TB (7d WAL)</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-2">
              <div className="text-[10px] text-slate-400">Est. Monthly Infra</div>
              <div className="font-bold text-white tabular-nums">${sizing.estMonthlyTotalUsd.toLocaleString()}/mo</div>
              <div className="text-[10px] text-slate-400">Object Store + Spot</div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 3: INTERACTIVE DRAG / REORDER / CONNECT WHITEBOARD */}
      {phase === 3 && (
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 text-[11px] font-semibold text-slate-400">
              Click Node To Add · Drag Cards Or Use Arrows To Reorder Connections · Edit Partition Keys
            </div>
            <div className="flex flex-wrap gap-1.5">
              {NODE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() =>
                    setNodes((prev) => [...prev, { id: `n_${Date.now()}_${prev.length}`, ...tpl }])
                  }
                  className="btn-secondary inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium"
                >
                  <Plus className="h-3 w-3" />
                  <span>{tpl.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="inset-surface rounded-xl p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              Connected Architecture DAG ({nodes.length} Components)
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {nodes.map((node, idx) => (
                <div
                  key={node.id}
                  draggable
                  onDragStart={() => setDragIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIdx !== null) moveNode(dragIdx, idx);
                    setDragIdx(null);
                  }}
                  className="rounded-xl border border-white/15 bg-black/25 p-2.5 cursor-move"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-slate-400">
                        #{idx + 1} · {node.layer}
                      </div>
                      <div className="font-semibold text-white">{node.label}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveNode(idx, idx - 1)}
                        disabled={idx === 0}
                        className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-300 disabled:opacity-30"
                        title="Move upstream"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveNode(idx, idx + 1)}
                        disabled={idx === nodes.length - 1}
                        className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-300 disabled:opacity-30"
                        title="Move downstream"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => setNodes((prev) => prev.filter((n) => n.id !== node.id))}
                        className="p-1 text-slate-400 hover:text-white"
                        title="Remove node"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <input
                      value={node.partitionKey}
                      onChange={(e) =>
                        setNodes((prev) =>
                          prev.map((x) => (x.id === node.id ? { ...x, partitionKey: e.target.value } : x)),
                        )
                      }
                      placeholder="Partition / Sharding Key"
                      className="rounded-md border border-white/10 bg-black/20 px-2 py-1 font-mono text-[10px] text-white outline-none"
                    />
                    <input
                      value={node.edgeLabel}
                      onChange={(e) =>
                        setNodes((prev) =>
                          prev.map((x) => (x.id === node.id ? { ...x, edgeLabel: e.target.value } : x)),
                        )
                      }
                      placeholder="Edge / Protocol"
                      className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-slate-300 outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-400">
              Trade-Off Justification Notes (Idempotency, Skew Salting, FinOps)
            </label>
            <textarea
              rows={2}
              value={tradeoffNotes}
              onChange={(e) => setTradeoffNotes(e.target.value)}
              className="inset-surface w-full rounded-xl p-2.5 text-xs text-white outline-none focus:border-[var(--accent-primary)]"
            />
          </div>
        </div>
      )}

      {/* PHASE 4: AUTOMATED 6+ STRESS TEST SUITE */}
      {phase === 4 && (
        <div className="inset-surface rounded-xl p-3.5">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-white">Automated 6-Point System Design Stress Test Suite</span>
              {suiteRunAt && (
                <span className="ml-2 font-mono text-[10px] text-slate-400">Last run: {suiteRunAt}</span>
              )}
            </div>
            <span className={`font-mono font-bold tabular-nums ${passedCount === 6 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {passedCount}/6 Stress Tests Passed
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {checks.map((c) => (
              <div
                key={c.label}
                className={`flex items-start gap-2 rounded-lg border p-2.5 ${
                  c.passed ? 'border-[#10B981]/35 bg-[#10B981]/10' : 'border-[#EF4444]/35 bg-[#EF4444]/10'
                }`}
              >
                {c.passed ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#10B981]" />
                ) : (
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EF4444]" />
                )}
                <div>
                  <div className="font-medium text-white">
                    <span className={`mr-1.5 font-mono text-[10px] font-bold ${c.passed ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {c.passed ? 'PASS' : 'FAIL'}
                    </span>
                    {c.label}
                  </div>
                  {!c.passed && <div className="mt-0.5 text-[11px] text-slate-300">{c.hint}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * ROUND 6: INCIDENT RCA & STAR WAR-ROOM STUDIO
 * ============================================================================ */
export function IncidentRcaStarStudio({
  questionTitle,
  submissionText,
  onSyncSubmission,
}: {
  questionTitle: string;
  submissionText: string;
  onSyncSubmission: (nextMarkdown: string) => void;
}) {
  const [situation, setSituation] = useState('');
  const [blastRadius, setBlastRadius] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [containment, setContainment] = useState('');
  const [tradeOff, setTradeOff] = useState('');
  const [guardrail, setGuardrail] = useState('');

  const allText = `${situation} ${blastRadius} ${rootCause} ${containment} ${tradeOff} ${guardrail} ${submissionText}`.toLowerCase();

  const checks: CheckItem[] = [
    { label: 'Check 1 · Incident Telemetry / Situation Scope', passed: situation.trim().length > 15 || allText.length > 120, hint: 'Summarize the exact anomaly or production context.' },
    { label: 'Check 2 · Blast Radius & Quantified SLA Impact', passed: blastRadius.trim().length > 15 || /(\$|%|tb|gb|sla|p99|hour|min|delay)/.test(allText), hint: 'Quantify downstream consumers, latency, or $/mo impact.' },
    { label: 'Check 3 · Immediate Mitigation / Containment First', passed: containment.trim().length > 15 || /(rollback|quarantine|kill|scale|broadcast|pause|contain)/.test(allText), hint: 'How did you stop the bleeding before refactoring?' },
    { label: 'Check 4 · Deep Technical Root Cause', passed: rootCause.trim().length > 15 || /(skew|oom|small file|schema|partition|spill|watermark)/.test(allText), hint: 'Pinpoint the exact engine/system failure mechanism.' },
    { label: 'Check 5 · Architectural Trade-Off ("Why X Over Y?")', passed: tradeOff.trim().length > 15 || /(trade-off|versus|over |instead of|cost|latency)/.test(allText), hint: 'Contrast alternatives you ruled out cleanly.' },
    { label: 'Check 6 · Permanent Guardrail & Postmortem Action', passed: guardrail.trim().length > 15 || /(alert|ci|contract|test|monitor|runbook|automate)/.test(allText), hint: 'State the automated CI/alerting prevention added.' },
  ];

  const handleSync = () => {
    const md = `# ${questionTitle}

## 1. Situation & Telemetry Context
${situation || '_Summarize metric anomaly or team conflict context_'}

## 2. Task & Blast Radius Impact
${blastRadius || '_Quantify downstream SLA, consumer tables, and cost/revenue impact_'}

## 3. Immediate Containment & Mitigation
${containment || '_Immediate rollback, quarantine, resource isolation steps_'}

## 4. Technical Root Cause
${rootCause || '_Exact spark/iceberg/schema/pipeline failure mechanism_'}

## 5. Key Trade-Off ("Why X Over Y?")
${tradeOff || '_Alternatives considered and why chosen fix won_'}

## 6. Result & Systemic Preventive Guardrail
${guardrail || '_CI contract gate, alerting threshold, measurable post-launch impact_'}
`;
    onSyncSubmission(md);
  };

  const passedCount = checks.filter((c) => c.passed).length;

  return (
    <div className="space-y-3 p-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-display text-sm font-bold text-white">
          <ShieldAlert className="h-4 w-4 text-white" />
          <span>SEV-1 Incident Triage &amp; STAR Defense War-Room</span>
        </div>
        <button
          type="button"
          onClick={handleSync}
          className="btn-primary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Sync Structured Defense To Editor</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {[
          { label: '1. Situation / Symptom Telemetry', val: situation, set: setSituation, ph: 'Hourly Spark Gold MERGE stalled at task 199/200 with 60GB spill...' },
          { label: '2. Task / Blast Radius & SLA', val: blastRadius, set: setBlastRadius, ph: '4 downstream revenue dashboards delayed 2.5h; $1.4K burned retries...' },
          { label: '3. Immediate Containment Action', val: containment, set: setContainment, ph: 'Halted retry loop, filtered NULL keys cleanly, restored SLA...' },
          { label: '4. Deep Technical Root Cause', val: rootCause, set: setRootCause, ph: 'Hot merchant key + NULL foreign key hashed to single partition...' },
          { label: '5. Trade-Off ("Why X Over Y?")', val: tradeOff, set: setTradeOff, ph: 'Chose AQE skewJoin + NULL split over manual static salting because...' },
          { label: '6. Result & Automated Guardrail', val: guardrail, set: setGuardrail, ph: 'Cut P99 job runtime from 42m -> 4m; added skew entropy CI gate...' },
        ].map((f) => (
          <div key={f.label}>
            <label className="mb-1 block text-[11px] font-semibold text-slate-400">{f.label}</label>
            <textarea
              rows={2}
              value={f.val}
              onChange={(e) => f.set(e.target.value)}
              placeholder={f.ph}
              className="inset-surface w-full rounded-xl p-2.5 text-xs text-white outline-none focus:border-[var(--accent-primary)]"
            />
          </div>
        ))}
      </div>

      <div className="inset-surface rounded-xl p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold text-white">6-Point Bar-Raiser Coverage Check</span>
          <span className={`font-mono font-bold ${passedCount === 6 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            {passedCount}/6 Passed
          </span>
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {checks.map((c) => (
            <div key={c.label} className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/20 p-2">
              {c.passed ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#10B981]" />
              ) : (
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EF4444]" />
              )}
              <div>
                <div className="font-medium text-white">
                  <span className={`mr-1 font-mono text-[10px] font-bold ${c.passed ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                    {c.passed ? 'PASS' : 'FAIL'}
                  </span>
                  · {c.label}
                </div>
                {!c.passed && <div className="text-[11px] text-slate-400">{c.hint}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
