import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookMarked, Calculator, Check, Copy, Cpu, Database, Layers, X } from 'lucide-react';

interface CheatSheetDrawerProps {
  open: boolean;
  onClose: () => void;
}

type SheetTab = 'sql' | 'spark' | 'lakehouse' | 'sizing';

interface SnippetItem {
  title: string;
  badge: string;
  notes: string;
  code: string;
}

const SQL_SNIPPETS: SnippetItem[] = [
  {
    title: 'Window Frame Bounds: ROWS vs RANGE',
    badge: 'Analytical SQL',
    notes:
      'Always declare ROWS BETWEEN when computing moving metrics with duplicate timestamps. Default RANGE aggregates all peers sharing the same ORDER BY value.',
    code: `SUM(amount) OVER (
  PARTITION BY account_id
  ORDER BY event_date
  ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
) AS rolling_7d_spend`,
  },
  {
    title: 'Gaps & Islands (Session / Streak Detection)',
    badge: 'Classic Pattern',
    notes:
      'Subtracting a dense row sequence from a monotonic date/integer produces a constant group key for contiguous sequences.',
    code: `WITH ranked AS (
  SELECT user_id, login_date,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) AS rn
  FROM (SELECT DISTINCT user_id, DATE(login_ts) AS login_date FROM logins) d
)
SELECT user_id, MIN(login_date) AS start_dt, MAX(login_date) AS end_dt, COUNT(*) AS streak_len
FROM ranked
GROUP BY user_id, DATE(login_date, '-' || rn || ' days');`,
  },
  {
    title: 'SARGable Predicates & Tie-Breaking',
    badge: 'Query Optimization',
    notes:
      'Never wrap indexed timestamp columns in functions inside WHERE. Prefer DENSE_RANK/ROW_NUMBER with deterministic secondary keys.',
    code: `-- SARGable (uses B-Tree / micro-partition pruning)
WHERE created_at >= '2026-01-01' AND created_at < '2026-02-01'
-- Non-SARGable (forces full scan): WHERE YEAR(created_at) = 2026`,
  },
];

const SPARK_SNIPPETS: SnippetItem[] = [
  {
    title: 'Skew Mitigation: Two-Phase Salted Aggregation & Joins',
    badge: 'Shuffle & Skew',
    notes:
      'When AQE cannot split an ultra-skewed key (or for non-equi/UDF joins), explode the small side [0..N-1] and salt the large side with rand() % N.',
    code: `SALT_FACTOR = 16
salted_fact = fact.withColumn("salt", (F.rand() * SALT_FACTOR).cast("int"))
exploded_dim = dim.withColumn("salt", F.explode(F.array([F.lit(i) for i in range(SALT_FACTOR)])))
joined = salted_fact.join(exploded_dim, on=["merchant_id", "salt"], how="inner")`,
  },
  {
    title: 'Production AQE & Partition Sizing Flags',
    badge: 'Spark 3.x Tuning',
    notes:
      'Target 128MB–256MB compressed Parquet/Iceberg output files. Set advisoryPartitionSizeInBytes to prevent tiny-file spills after coalescing.',
    code: `spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
spark.conf.set("spark.sql.adaptive.advisoryPartitionSizeInBytes", "134217728") # 128MB
spark.conf.set("spark.sql.autoBroadcastJoinThreshold", "104857600") # 100MB`,
  },
  {
    title: 'Unified Memory Pool & Spill Triage',
    badge: 'OOM Prevention',
    notes:
      'Execution memory (shuffles, joins, sorts) can evict Storage cache, not vice versa. Watch Disk Bytes Spilled vs Memory Bytes Spilled in Spark UI.',
    code: `# Tune executor overhead for PySpark UDF / Arrow off-heap pressure
--conf spark.executor.memory=16g
--conf spark.executor.memoryOverhead=4g
--conf spark.memory.fraction=0.6`,
  },
];

const LAKEHOUSE_SNIPPETS: SnippetItem[] = [
  {
    title: 'Apache Iceberg: Copy-on-Write vs Merge-on-Read',
    badge: 'Storage Internals',
    notes:
      'CoW rewrites entire Parquet files on UPDATE/DELETE (fast reads, high write amplification). MoR emits equality/positional delete files (fast CDC streaming writes, requires periodic compaction).',
    code: `ALTER TABLE prod.silver.orders SET TBLPROPERTIES (
  'write.delete.mode' = 'merge-on-read',
  'write.update.mode' = 'merge-on-read',
  'write.merge.mode' = 'merge-on-read'
);`,
  },
  {
    title: 'Write-Audit-Publish (WAP) & Compaction',
    badge: 'Data Reliability',
    notes:
      'Stage incremental batches onto an isolated Iceberg branch, run dbt/DQ assertions, then fast-forward main. Run expire_snapshots after retention.',
    code: `CALL system.rewrite_data_files(table => 'prod.silver.orders', options => map('target-file-size-bytes', '268435456'));
CALL system.expire_snapshots(table => 'prod.silver.orders', older_than => TIMESTAMP '2026-01-01 00:00:00', retain_last => 5);`,
  },
  {
    title: 'SCD Type-2 Idempotent MERGE Skeleton',
    badge: 'Dimensional Modeling',
    notes:
      'Expire active row (is_current = false, valid_to = batch_ts) and insert new version atomically so retries never duplicate active surrogate keys.',
    code: `MERGE INTO dim_customer t USING staged_updates s
ON t.customer_id = s.customer_id AND t.is_current = TRUE
WHEN MATCHED AND t.attr_hash <> s.attr_hash THEN UPDATE SET is_current = FALSE, valid_to = s.effective_ts
WHEN NOT MATCHED THEN INSERT (...);`,
  },
];

export function CheatSheetDrawer({ open, onClose }: CheatSheetDrawerProps) {
  const [tab, setTab] = useState<SheetTab>('sql');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Back-of-the-envelope interactive sizing calculator
  const [eventsPerSec, setEventsPerSec] = useState(100000);
  const [payloadBytes, setPayloadBytes] = useState(1024);
  const [retentionDays, setRetentionDays] = useState(90);
  const [compressionRatio, setCompressionRatio] = useState(4);

  const mbPerSec = (eventsPerSec * payloadBytes) / (1024 * 1024);
  const rawTbPerDay = (eventsPerSec * payloadBytes * 86400) / 1e12;
  const compressedTbPerDay = rawTbPerDay / Math.max(1, compressionRatio);
  const totalLakeTb = compressedTbPerDay * retentionDays;
  const kafkaReplicateTbPerDay = rawTbPerDay * 3; // RF=3

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const snippets = tab === 'sql' ? SQL_SNIPPETS : tab === 'spark' ? SPARK_SNIPPETS : LAKEHOUSE_SNIPPETS;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-2xl flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-canvas)] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="inset-surface flex h-9 w-9 items-center justify-center rounded-xl text-white">
                  <BookMarked className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-white">Staff Data Engineer Cheat Sheet</h2>
                  <p className="text-xs text-slate-400">
                    Quick reference for live coding, PySpark tuning, Lakehouse ops &amp; TPS math
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="btn-secondary rounded-xl p-2 text-slate-400 hover:text-white"
                aria-label="Close cheat sheet"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1.5 border-b border-[var(--border-subtle)] px-6 py-3">
              {[
                { id: 'sql' as SheetTab, label: 'SQL Windows & SARG', icon: Database },
                { id: 'spark' as SheetTab, label: 'PySpark Skew & AQE', icon: Cpu },
                { id: 'lakehouse' as SheetTab, label: 'Iceberg / SCD2', icon: Layers },
                { id: 'sizing' as SheetTab, label: 'Scale & TPS Sizing', icon: Calculator },
              ].map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active ? 'tab-active' : 'btn-secondary'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {tab !== 'sizing' ? (
                snippets.map((item, idx) => {
                  const id = `${tab}_${idx}`;
                  const copied = copiedId === id;
                  return (
                    <div key={id} className="glass-surface rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-mono text-[11px] font-semibold text-slate-400">{item.badge}</div>
                          <h3 className="font-display text-sm font-bold text-white">{item.title}</h3>
                        </div>
                        <button
                          onClick={() => handleCopy(id, item.code)}
                          className="btn-secondary inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium"
                        >
                          {copied ? <Check className="h-3 w-3 text-white" /> : <Copy className="h-3 w-3" />}
                          <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-300">{item.notes}</p>
                      <pre className="inset-surface overflow-x-auto rounded-xl p-3 font-mono text-xs leading-relaxed text-slate-200">
                        {item.code}
                      </pre>
                    </div>
                  );
                })
              ) : (
                <div className="space-y-4">
                  <div className="glass-surface rounded-2xl p-5 space-y-4">
                    <h3 className="font-display text-sm font-bold text-white">
                      Interactive Pipeline &amp; Storage Capacity Estimator
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                      <label className="space-y-1">
                        <span className="text-slate-400">Peak Ingestion (Events / sec)</span>
                        <input
                          type="number"
                          min={100}
                          value={eventsPerSec}
                          onChange={(e) => setEventsPerSec(Math.max(1, Number(e.target.value) || 0))}
                          className="inset-surface w-full rounded-xl px-3 py-2 font-mono text-white outline-none focus:border-[var(--border-strong)]"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-slate-400">Avg Record Payload (Bytes)</span>
                        <input
                          type="number"
                          min={32}
                          value={payloadBytes}
                          onChange={(e) => setPayloadBytes(Math.max(1, Number(e.target.value) || 0))}
                          className="inset-surface w-full rounded-xl px-3 py-2 font-mono text-white outline-none focus:border-[var(--border-strong)]"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-slate-400">Parquet / Zstd Compression Ratio (x)</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={compressionRatio}
                          onChange={(e) => setCompressionRatio(Math.max(1, Number(e.target.value) || 1))}
                          className="inset-surface w-full rounded-xl px-3 py-2 font-mono text-white outline-none focus:border-[var(--border-strong)]"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-slate-400">Lakehouse Retention (Days)</span>
                        <input
                          type="number"
                          min={1}
                          value={retentionDays}
                          onChange={(e) => setRetentionDays(Math.max(1, Number(e.target.value) || 1))}
                          className="inset-surface w-full rounded-xl px-3 py-2 font-mono text-white outline-none focus:border-[var(--border-strong)]"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
                      <div className="inset-surface rounded-xl p-3">
                        <div className="text-[11px] text-slate-400">Ingress Bandwidth</div>
                        <div className="mt-1 font-mono text-base font-bold text-white tabular-nums">
                          {mbPerSec.toFixed(1)} MB/s
                        </div>
                      </div>
                      <div className="inset-surface rounded-xl p-3">
                        <div className="text-[11px] text-slate-400">Kafka Storage/Day (RF=3)</div>
                        <div className="mt-1 font-mono text-base font-bold text-white tabular-nums">
                          {kafkaReplicateTbPerDay.toFixed(2)} TB
                        </div>
                      </div>
                      <div className="inset-surface rounded-xl p-3">
                        <div className="text-[11px] text-slate-400">Parquet Compressed/Day</div>
                        <div className="mt-1 font-mono text-base font-bold text-white tabular-nums">
                          {compressedTbPerDay.toFixed(2)} TB
                        </div>
                      </div>
                      <div className="inset-surface rounded-xl p-3">
                        <div className="text-[11px] text-slate-400">Total Lake ({retentionDays}d)</div>
                        <div className="mt-1 font-mono text-base font-bold text-white tabular-nums">
                          {totalLakeTb.toFixed(1)} TB
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-surface rounded-2xl p-5">
                    <h3 className="font-display text-sm font-bold text-white">Latency &amp; Throughput Cheat Table</h3>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left font-mono text-xs tabular-nums">
                        <thead className="border-b border-[var(--border-subtle)] text-slate-400">
                          <tr>
                            <th className="py-2 pr-4">System / Operation</th>
                            <th className="py-2 pr-4">Typical Latency / Throughput</th>
                            <th className="py-2">Interview Rule of Thumb</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06] text-slate-200">
                          <tr>
                            <td className="py-2 pr-4">100K events/s @ 1KB</td>
                            <td className="py-2 pr-4">~100 MB/s · 8.64 TB/day raw</td>
                            <td className="py-2">86,400 sec/day (~10^5 sec)</td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4">Kafka Single Broker</td>
                            <td className="py-2 pr-4">~500 MB/s write sequential</td>
                            <td className="py-2">Target 10–30 MB/s per partition</td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4">Parquet Row Group</td>
                            <td className="py-2 pr-4">128 MB default · ~4:1 Snappy</td>
                            <td className="py-2">Avoid &lt;10MB small-file storm</td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4">S3 / GCS PUT + GET</td>
                            <td className="py-2 pr-4">~3,500 PUT / 5,500 GET per prefix</td>
                            <td className="py-2">Partition/hash prefixes avoid 503</td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4">NVMe SSD Sequential Read</td>
                            <td className="py-2 pr-4">~3,000 MB/s (~15–100 us seek)</td>
                            <td className="py-2">RocksDB state store in Flink</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
