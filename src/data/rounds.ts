import type { EvaluationType, KnowledgeTopic, Question, RoundNumber } from '../types/platform';

export interface InterviewRoundMeta {
  roundNumber: RoundNumber;
  slug: string;
  shortTitle: string;
  title: string;
  subtitle: string;
  howItWorks: string;
  durationMins: number;
  accent: string;
  keySignals: string[];
  pillarTopicId: string;
}

export const INTERVIEW_ROUNDS: InterviewRoundMeta[] = [
  {
    roundNumber: 1,
    slug: 'round-1-sql-query-optimization',
    shortTitle: 'R1 · SQL & Optimization',
    title: 'Round 1: SQL & Query Optimization',
    subtitle: 'Window functions, Gaps & Islands, Retention, Query Plans',
    howItWorks:
      'Live browser or coderpad SQL screen (45–60 mins). You solve 2–3 analytical queries over raw schemas with edge cases (ties, NULL foreign keys, duplicate timestamps, missing calendar dates), then read EXPLAIN plans to eliminate full table scans and non-SARGable filters.',
    durationMins: 50,
    accent: '#FFFFFF',
    keySignals: ['DENSE_RANK & Frame Bounds', 'Gaps & Islands / Sessionization', 'SARGability & Index Scans', 'NULL & Zero-Division Safety'],
    pillarTopicId: 'topic_sql_internals',
  },
  {
    roundNumber: 2,
    slug: 'round-2-python-wrangling-dsa',
    shortTitle: 'R2 · Python & DSA',
    title: 'Round 2: Python Wrangling & DSA',
    subtitle: 'Stream/log parsing, Generators, NeetCode 150 patterns, Complexity',
    howItWorks:
      '45–60 min coding screen blending practical Python data parsing (nested JSON, log quantiles, O(1) RAM generators) with high-signal NeetCode 150 algorithms (sliding windows, heaps, topological sort, Union-Find). Evaluated on clean time/space complexity and boundary tests.',
    durationMins: 55,
    accent: '#E5E5E5',
    keySignals: ['O(1) Memory Generators', 'Top-K Heaps & K-Way Merge', 'DAG Topo Sort & Graphs', 'Defensive Malformed Input Handling'],
    pillarTopicId: 'topic_python_dsa_patterns',
  },
  {
    roundNumber: 3,
    slug: 'round-3-distributed-internals-pyspark',
    shortTitle: 'R3 · PySpark & Internals',
    title: 'Round 3: Distributed Internals & PySpark',
    subtitle: 'Spark execution, Data skew, Shuffle tuning, Delta/Iceberg internals',
    howItWorks:
      'Deep technical coding + internals round (60 mins). You diagnose 99%-stuck executors, implement key salting and AQE partition coalescing, reason about Broadcast vs Sort-Merge joins, and explain Parquet row-group pruning, Z-Order, and Delta/Iceberg transaction logs.',
    durationMins: 60,
    accent: '#D4D4D4',
    keySignals: ['Key Salting & Broadcast Thresholds', 'AQE & Spill Tuning', 'Iceberg/Delta Commit Logs', 'Watermarks & Kafka Partitioning'],
    pillarTopicId: 'topic_query_engines',
  },
  {
    roundNumber: 4,
    slug: 'round-4-dimensional-data-modeling',
    shortTitle: 'R4 · Data Modeling',
    title: 'Round 4: Dimensional Data Modeling',
    subtitle: 'Grain declaration, Star/Snowflake schemas, Fact/Dim tables, SCD Type 2',
    howItWorks:
      '45–60 min modeling round common at Meta, Amazon, Airbnb, and Snowflake. You explicitly declare fact table grain first, design conformed Star schemas, prevent fan-out traps, write SCD Type 2 MERGE/gap audits, and justify Transaction vs Periodic vs Accumulating Snapshot facts.',
    durationMins: 50,
    accent: '#A3A3A3',
    keySignals: ['Explicit Grain Declaration', 'Transaction vs Snapshot Facts', 'SCD Type 2 & Mini-Dimensions', 'Conformed Metrics & Anti-Fanout'],
    pillarTopicId: 'topic_data_modeling',
  },
  {
    roundNumber: 5,
    slug: 'round-5-end-to-end-data-system-design',
    shortTitle: 'R5 · System Design',
    title: 'Round 5: End-to-End Data System Design',
    subtitle: 'Batch/Streaming pipelines, CDC, Kafka/Flink/Spark, Scale & Cost sizing',
    howItWorks:
      '60 min flagship architecture loop for DE II & Senior/Staff roles. Starting from an ambiguous business SLA (e.g. 500K events/s, <2s freshness), you size throughput/storage, design CDC + Kafka + Flink/Spark + Iceberg Lakehouse layers, handle late data/backfills, and defend FinOps trade-offs.',
    durationMins: 60,
    accent: '#FFFFFF',
    keySignals: ['Back-of-the-Envelope Sizing', 'Exactly-Once & Idempotency', 'Watermarks, DLQ & Replays', 'Compute vs Storage FinOps'],
    pillarTopicId: 'topic_streaming_kafka_flink',
  },
  {
    roundNumber: 6,
    slug: 'round-6-incident-rca-project-behavioral',
    shortTitle: 'R6 · RCA & Behavioral',
    title: 'Round 6: Incident RCA, Project Defense & Behavioral',
    subtitle: 'Production triage, Resume defense, STAR leadership',
    howItWorks:
      'Hiring Manager & Staff bar-raiser round (45–60 mins). Half live SEV-1 incident triage (reading lag spikes, OOMs, small-file explosions to pinpoint root cause and containment), half probing your hardest resume project decisions ("Why Iceberg over Hudi?") and STAR conflict/ownership stories.',
    durationMins: 50,
    accent: '#D4D4D4',
    keySignals: ['Structured SEV-1 Triage', 'Blast Radius Containment', '"Why X over Y?" Defense', 'Quantified STAR Impact'],
    pillarTopicId: 'topic_orchestration_dbt',
  },
  {
    roundNumber: 7,
    slug: 'round-7-practical-pipeline-data-quality',
    shortTitle: 'R7 · Pipeline & DQ Lab',
    title: 'Round 7: Practical Pipeline Build & Data Quality Lab',
    subtitle: 'Idempotent incremental MERGE ingestion, nested JSON, schema drift, dbt assertions',
    howItWorks:
      'Take-home or 90-min practical lab replicating real production pipelines. You build idempotent watermark/CDC MERGE ingestion, enforce Write-Audit-Publish (WAP) data contracts with quarantine routing, validate backward schema evolution, and guard fact grain.',
    durationMins: 60,
    accent: '#A3A3A3',
    keySignals: ['Idempotent Watermark MERGE', 'Write-Audit-Publish & Quarantine', 'Avro/Protobuf Schema Compat', 'Exponential Backoff & DLQ'],
    pillarTopicId: 'topic_lakehouse_formats',
  },
  {
    roundNumber: 8,
    slug: 'round-8-ai-ml-data-governance-finops',
    shortTitle: 'R8 · AI/ML, Gov & FinOps',
    title: 'Round 8: AI/ML Data Engineering, Governance & FinOps',
    subtitle: 'Feature stores, point-in-time joins, RAG vector pipelines, PII/RBAC, compute cost optimization',
    howItWorks:
      'Modern Senior/Staff differentiator round covering ML feature parity (point-in-time ASOF joins without label leakage, online/offline stores), enterprise RAG incremental chunking & ACLs, PII tokenization/GDPR Iceberg deletes, and cloud warehouse compute cost attribution.',
    durationMins: 55,
    accent: '#E5E5E5',
    keySignals: ['Leakage-Free ASOF Joins', 'RAG Chunking & ACL Sync', 'HMAC PII Masking & GDPR Deletes', 'Warehouse Auto-Suspend FinOps'],
    pillarTopicId: 'topic_cloud_governance_finops',
  },
];

export const KNOWLEDGE_TOPIC_SLUG_MAP: Record<string, string> = {
  topic_sql_internals: 'sql-internals',
  topic_query_engines: 'pyspark-compute',
  topic_lakehouse_formats: 'lakehouse-formats',
  topic_snowflake_warehouses: 'snowflake-warehouses',
  topic_data_modeling: 'data-modeling',
  topic_streaming_kafka_flink: 'streaming-kafka-flink',
  topic_orchestration_dbt: 'orchestration-dbt',
  topic_cloud_governance_finops: 'cloud-governance-finops',
  topic_python_dsa_patterns: 'python-dsa-patterns',
};

export function slugifyTopic(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function unslugifyTopic(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => {
      const upperMap: Record<string, string> = {
        sql: 'SQL',
        dsa: 'DSA',
        cdc: 'CDC',
        etl: 'ETL',
        scd: 'SCD',
        scds: 'SCDs',
        ml: 'ML',
        ai: 'AI',
        rag: 'RAG',
        pii: 'PII',
        rbac: 'RBAC',
        finops: 'FinOps',
        rca: 'RCA',
        ctes: 'CTEs',
        pyspark: 'PySpark',
        aqe: 'AQE',
        dbt: 'dbt',
        ci: 'CI',
        cd: 'CD',
        api: 'API',
        s3: 'S3',
        dp: 'DP',
      };
      if (upperMap[word]) return upperMap[word];
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function getTopicSlug(topic: Pick<KnowledgeTopic, 'id' | 'slug' | 'title'>): string {
  if (topic.slug) return slugifyTopic(topic.slug);
  if (KNOWLEDGE_TOPIC_SLUG_MAP[topic.id]) return KNOWLEDGE_TOPIC_SLUG_MAP[topic.id];
  return slugifyTopic(topic.id.replace(/^topic_/, ''));
}

const TOPIC_KEYWORD_ALIASES: Array<{ keywords: string[]; topicId: string }> = [
  { keywords: ['snowflake', 'bigquery', 'redshift', 'warehouse', 'clustering', 'micro-partition', 'time travel'], topicId: 'topic_snowflake_warehouses' },
  { keywords: ['spark', 'pyspark', 'trino', 'presto', 'photon', 'aqe', 'shuffle', 'query-engine', 'compute'], topicId: 'topic_query_engines' },
  { keywords: ['iceberg', 'delta', 'hudi', 'parquet', 'orc', 'lakehouse', 'compaction', 'z-order'], topicId: 'topic_lakehouse_formats' },
  { keywords: ['kafka', 'flink', 'kinesis', 'streaming', 'cdc', 'debezium', 'watermark', 'event'], topicId: 'topic_streaming_kafka_flink' },
  { keywords: ['airflow', 'dbt', 'dagster', 'prefect', 'orchestration', 'wap', 'great expectations', 'soda'], topicId: 'topic_orchestration_dbt' },
  { keywords: ['modeling', 'kimball', 'star schema', 'fact', 'dimension', 'scd', 'grain', 'data-modeling'], topicId: 'topic_data_modeling' },
  { keywords: ['governance', 'finops', 'rbac', 'pii', 'gdpr', 'feature store', 'rag', 'vector', 'mlops', 'unity catalog', 'cloud'], topicId: 'topic_cloud_governance_finops' },
  { keywords: ['python', 'dsa', 'algorithm', 'leetcode', 'neetcode', 'generator', 'heap', 'graph'], topicId: 'topic_python_dsa_patterns' },
  { keywords: ['sql', 'window', 'cte', 'explain', 'index', 'postgres', 'duckdb', 'retention'], topicId: 'topic_sql_internals' },
];

export function resolveTopicBySlug(
  slugOrId: string,
  topics: KnowledgeTopic[],
): { topic: KnowledgeTopic | null; slug: string; displayName: string } {
  const clean = decodeURIComponent(slugOrId || '').trim();
  const normalizedSlug = slugifyTopic(clean.replace(/^topic_/, ''));

  const direct = topics.find(
    (t) =>
      t.id === clean ||
      t.slug === clean ||
      getTopicSlug(t) === normalizedSlug ||
      slugifyTopic(t.title) === normalizedSlug ||
      slugifyTopic(t.domain) === normalizedSlug,
  );

  if (direct) {
    return { topic: direct, slug: getTopicSlug(direct), displayName: direct.title };
  }

  const lower = clean.toLowerCase();
  for (const entry of TOPIC_KEYWORD_ALIASES) {
    if (entry.keywords.some((kw) => lower.includes(kw) || normalizedSlug.includes(kw))) {
      const matched = topics.find((t) => t.id === entry.topicId);
      if (matched) {
        return { topic: matched, slug: getTopicSlug(matched), displayName: matched.title };
      }
    }
  }

  return {
    topic: null,
    slug: normalizedSlug || 'query-engines',
    displayName: unslugifyTopic(normalizedSlug || 'Data Engineering'),
  };
}

export function getQuestionRound(q: Question): RoundNumber {
  if (q.roundNumber && q.roundNumber >= 1 && q.roundNumber <= 8) {
    return q.roundNumber;
  }

  const id = q.uniqueId.toLowerCase();
  const topic = q.topic.toLowerCase();
  const domain = q.domain.toLowerCase();
  const round = q.roundType.toLowerCase();

  if (id.startsWith('r4_') || domain.includes('modeling') || round.includes('modeling')) return 4;
  if (id.startsWith('r5_') || domain.includes('system design') || round.includes('system design')) return 5;
  if (id.startsWith('r6_') || domain.includes('incident') || domain.includes('behavioral') || round.includes('behavioral') || round.includes('rca')) return 6;
  if (id.startsWith('r8_') || domain.includes('ai/ml') || domain.includes('governance') || domain.includes('finops') || topic.includes('point-in-time') || topic.includes('rag') || topic.includes('feature store')) {
    return 8;
  }
  if (
    id.startsWith('r7_') ||
    domain === 'engineering labs' ||
    topic.includes('incremental') ||
    topic.includes('data quality') ||
    topic.includes('schema evolution') ||
    topic.includes('orchestration') ||
    topic.includes('ci/cd') ||
    topic.includes('pipeline reliability') ||
    topic.includes('scd') && id === 'de_02_scd_type2_merge_engine'
  ) {
    return 7;
  }
  if (domain === 'analytical sql' || round.includes('sql')) {
    if (topic.includes('point-in-time')) return 8;
    return 1;
  }
  if (domain === 'python & dsa' || round.includes('dsa')) {
    return 2;
  }
  if (domain === 'pyspark & distributed' || round.includes('pyspark') || topic.includes('spark') || topic.includes('lakehouse') || topic.includes('streaming') || topic.includes('storage')) {
    return 3;
  }
  return 7;
}

export function getQuestionEvalType(q: Question): EvaluationType {
  if (q.evaluationType) return q.evaluationType;
  const r = getQuestionRound(q);
  if (q.domain === 'Analytical SQL' || q.roundType.toLowerCase().includes('sql')) return 'sql';
  if (r === 5 || r === 6) return 'design_rubric';
  if ((r === 4 || r === 8) && !q.setupSchemaOrEnv.toLowerCase().includes('create table') && !q.detailedSolution.trim().startsWith('def ') && !q.detailedSolution.trim().startsWith('import ') && !q.detailedSolution.trim().startsWith('from ') && !q.detailedSolution.trim().startsWith('class ')) {
    return 'design_rubric';
  }
  return 'python';
}
