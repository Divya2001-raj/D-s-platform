import type { Difficulty, ExperienceTier, Question } from '../types/platform';
import { buildPythonStarterSkeleton } from '../lib/pythonSkeleton';

interface DeSpec {
  id: string;
  title: string;
  domain: 'PySpark & Distributed' | 'Engineering Labs';
  topic: string;
  subtopic: string;
  difficulty: Difficulty;
  experienceLevel: ExperienceTier;
  companies: string[];
  roundType: string;
  problemStatement: string;
  starterCode: string;
  detailedSolution: string;
  testInput: string;
  explanation: string;
  practicalRelevance: string;
}

const DE_CORE_SPECS: DeSpec[] = [
  {
    id: 'de_01_pyspark_skew_salting',
    title: 'PySpark Data Skew Mitigation via Key Salting',
    domain: 'PySpark & Distributed',
    topic: 'PySpark & Skew Tuning',
    subtopic: 'Salted Join Pattern',
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companies: ['Databricks', 'Uber', 'Netflix', 'Flipkart'],
    roundType: 'PySpark & Big Data',
    problemStatement:
      'A large fact table has 90% of rows on `merchant_id = "hot_1"`. Implement `salt_fact_and_dim(fact_rows, dim_rows, salt_buckets=4)` returning `(salted_fact, exploded_dim)` where every fact row gets a deterministic `salted_key = f"{merchant_id}_{idx % salt_buckets}"` and every dim row is replicated across `0..salt_buckets-1` so a uniform sort-merge join succeeds without skew.',
    starterCode: `def salt_fact_and_dim(fact_rows, dim_rows, salt_buckets=4):
    salted_fact = []
    for idx, r in enumerate(fact_rows):
        nr = dict(r)
        nr["salted_key"] = f"{r['merchant_id']}_{idx % salt_buckets}"
        salted_fact.append(nr)
    exploded_dim = []
    for d in dim_rows:
        for b in range(salt_buckets):
            nd = dict(d)
            nd["salted_key"] = f"{d['merchant_id']}_{b}"
            exploded_dim.append(nd)
    return salted_fact, exploded_dim`,
    detailedSolution: `def salt_fact_and_dim(fact_rows, dim_rows, salt_buckets=4):
    salted_fact = []
    for idx, r in enumerate(fact_rows):
        nr = dict(r)
        nr["salted_key"] = f"{r['merchant_id']}_{idx % salt_buckets}"
        salted_fact.append(nr)
    exploded_dim = []
    for d in dim_rows:
        for b in range(salt_buckets):
            nd = dict(d)
            nd["salted_key"] = f"{d['merchant_id']}_{b}"
            exploded_dim.append(nd)
    return salted_fact, exploded_dim`,
    testInput: `sf, ed = salt_fact_and_dim([{"merchant_id":"hot_1"}]*4, [{"merchant_id":"hot_1","tier":"gold"}], 4); assert len({r["salted_key"] for r in sf}) == 4 and len(ed) == 4`,
    explanation: 'Salting distributes a hot join key across `salt_buckets` partitions while exploding the smaller dimension side `salt_buckets` times (or only exploding known hot keys via partial salting).',
    practicalRelevance: 'Eliminates 99%-stuck Spark executor OOMs when Spark AQE skew-join optimization cannot split a skewed aggregation or broadcast exceeds threshold.',
  },
  {
    id: 'de_02_scd_type2_merge_engine',
    title: 'Implement SCD Type-2 Incremental Upsert Engine',
    domain: 'PySpark & Distributed',
    topic: 'Lakehouse & SCDs',
    subtopic: 'SCD Type 2 Merge',
    difficulty: 'Hard',
    experienceLevel: '4-6 yrs',
    companies: ['Snowflake', 'Databricks', 'PhonePe', 'Razorpay'],
    roundType: 'Data Modeling & ETL',
    problemStatement:
      'Implement `apply_scd2(existing_rows, incoming_rows, batch_date)` for customer attributes. Existing active rows have `is_current=True, valid_to="9999-12-31"`. If an incoming row changes `tier`, close the old version (`valid_to=batch_date, is_current=False`) and append a new active version (`valid_from=batch_date, valid_to="9999-12-31", is_current=True`). Unchanged rows stay untouched.',
    starterCode: `def apply_scd2(existing_rows, incoming_rows, batch_date):
    out = [dict(r) for r in existing_rows]
    active_by_id = {r["id"]: r for r in out if r["is_current"]}
    for inc in incoming_rows:
        cur = active_by_id.get(inc["id"])
        if cur is None:
            out.append({"id": inc["id"], "tier": inc["tier"], "valid_from": batch_date, "valid_to": "9999-12-31", "is_current": True})
        elif cur["tier"] != inc["tier"]:
            cur["valid_to"] = batch_date
            cur["is_current"] = False
            out.append({"id": inc["id"], "tier": inc["tier"], "valid_from": batch_date, "valid_to": "9999-12-31", "is_current": True})
    return out`,
    detailedSolution: `def apply_scd2(existing_rows, incoming_rows, batch_date):
    out = [dict(r) for r in existing_rows]
    active_by_id = {r["id"]: r for r in out if r["is_current"]}
    for inc in incoming_rows:
        cur = active_by_id.get(inc["id"])
        if cur is None:
            out.append({"id": inc["id"], "tier": inc["tier"], "valid_from": batch_date, "valid_to": "9999-12-31", "is_current": True})
        elif cur["tier"] != inc["tier"]:
            cur["valid_to"] = batch_date
            cur["is_current"] = False
            out.append({"id": inc["id"], "tier": inc["tier"], "valid_from": batch_date, "valid_to": "9999-12-31", "is_current": True})
    return out`,
    testInput: `res = apply_scd2([{"id":1,"tier":"free","valid_from":"2026-01-01","valid_to":"9999-12-31","is_current":True}], [{"id":1,"tier":"pro"}], "2026-02-01"); assert len(res)==2 and not res[0]["is_current"] and res[1]["valid_from"]=="2026-02-01"`,
    explanation: 'In Delta Lake / Apache Iceberg, this translates directly into a two-branch `MERGE INTO` using a staged `UNION ALL` (one key to update/expire, one `NULL` mergeKey to insert the new current row).',
    practicalRelevance: 'Gold-standard historical dimension tracking for billing, risk, and feature stores.',
  },
  {
    id: 'de_03_spark_dataframe_etl',
    title: 'PySpark DataFrame Transform & Filter Pipeline',
    domain: 'PySpark & Distributed',
    topic: 'PySpark Transformations',
    subtopic: 'DataFrame API Execution',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['Databricks', 'Walmart Global Tech', 'Amazon'],
    roundType: 'PySpark & Big Data',
    problemStatement:
      'Using the in-browser `SparkSession` & `F`, build a function `transform_orders(spark, rows)` that creates a DataFrame, filters `amount > 100`, adds `net_amount` (`amount * 0.9`), and returns `.count()`.',
    starterCode: `def transform_orders(spark, rows):
    df = spark.createDataFrame(rows)
    filtered = df.filter(F.col("amount") > 100)
    enriched = filtered.withColumn("net_amount", lambda r: round(r["amount"] * 0.9, 2))
    return enriched.count()`,
    detailedSolution: `def transform_orders(spark, rows):
    df = spark.createDataFrame(rows)
    filtered = df.filter(F.col("amount") > 100)
    enriched = filtered.withColumn("net_amount", lambda r: round(r["amount"] * 0.9, 2))
    return enriched.count()`,
    testInput: `sp = SparkSession.builder.appName("test").getOrCreate(); assert transform_orders(sp, [{"id":1,"amount":50},{"id":2,"amount":200},{"id":3,"amount":150}]) == 2`,
    explanation: 'Pushdown filters (`filter` before projections/joins) reduce shuffle I/O across Parquet/Delta partitions.',
    practicalRelevance: 'Every PySpark Silver transformation job starts with predicate pushdown and column enrichment.',
  },
  {
    id: 'de_04_cdc_watermark_incremental',
    title: 'Lab: Idempotent Watermark Incremental Ingestion',
    domain: 'Engineering Labs',
    topic: 'Incremental Ingestion & CDC',
    subtopic: 'High-Watermark State Management',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Uber', 'Snowflake', 'Confluent', 'Swiggy'],
    roundType: 'Engineering Lab',
    problemStatement:
      'Implement `incremental_ingest(source_events, last_watermark, lookback_sec)` which extracts events with `event_ts > last_watermark - lookback_sec`, deduplicates by `event_id` (keeping max `updated_at`), and returns `(deduped_batch, new_watermark)`.',
    starterCode: `def incremental_ingest(source_events, last_watermark, lookback_sec):
    cutoff = last_watermark - lookback_sec
    latest = {}
    max_ts = last_watermark
    for ev in source_events:
        if ev["event_ts"] > cutoff:
            eid = ev["event_id"]
            if eid not in latest or ev["updated_at"] > latest[eid]["updated_at"]:
                latest[eid] = ev
            if ev["event_ts"] > max_ts:
                max_ts = ev["event_ts"]
    return sorted(latest.values(), key=lambda x: x["event_id"]), max_ts`,
    detailedSolution: `def incremental_ingest(source_events, last_watermark, lookback_sec):
    cutoff = last_watermark - lookback_sec
    latest = {}
    max_ts = last_watermark
    for ev in source_events:
        if ev["event_ts"] > cutoff:
            eid = ev["event_id"]
            if eid not in latest or ev["updated_at"] > latest[eid]["updated_at"]:
                latest[eid] = ev
            if ev["event_ts"] > max_ts:
                max_ts = ev["event_ts"]
    return sorted(latest.values(), key=lambda x: x["event_id"]), max_ts`,
    testInput: `batch, wm = incremental_ingest([{"event_id":1,"event_ts":95,"updated_at":1},{"event_id":1,"event_ts":95,"updated_at":3},{"event_id":2,"event_ts":110,"updated_at":2}], 100, 10); assert len(batch)==2 and batch[0]["updated_at"]==3 and wm==110`,
    explanation: 'Using a bounded lookback window + idempotent deduplication safely captures late-arriving records without duplicating target rows.',
    practicalRelevance: 'Production micro-batch and dbt incremental model pattern.',
  },
  {
    id: 'de_05_data_quality_contract_validator',
    title: 'Lab: Great Expectations Style Data Contract Validator',
    domain: 'Engineering Labs',
    topic: 'Data Quality & Governance',
    subtopic: 'Automated Schema & Null Contracts',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Atlassian', 'Intuit', 'Airbnb', 'Netflix'],
    roundType: 'Engineering Lab',
    problemStatement:
      'Implement `validate_contract(rows, required_cols, non_null_cols, range_rules)` returning `{"passed": bool, "errors": list[str]}`. Check missing required columns, NULLs in `non_null_cols`, and numeric bounds `(min_v, max_v)` in `range_rules`.',
    starterCode: `def validate_contract(rows, required_cols, non_null_cols, range_rules):
    errors = []
    for idx, r in enumerate(rows):
        for col in required_cols:
            if col not in r:
                errors.append(f"row {idx}: missing {col}")
        for col in non_null_cols:
            if r.get(col) is None:
                errors.append(f"row {idx}: null {col}")
        for col, (lo, hi) in range_rules.items():
            val = r.get(col)
            if val is not None and not (lo <= val <= hi):
                errors.append(f"row {idx}: {col}={val} out of [{lo},{hi}]")
    return {"passed": len(errors) == 0, "errors": errors}`,
    detailedSolution: `def validate_contract(rows, required_cols, non_null_cols, range_rules):
    errors = []
    for idx, r in enumerate(rows):
        for col in required_cols:
            if col not in r:
                errors.append(f"row {idx}: missing {col}")
        for col in non_null_cols:
            if r.get(col) is None:
                errors.append(f"row {idx}: null {col}")
        for col, (lo, hi) in range_rules.items():
            val = r.get(col)
            if val is not None and not (lo <= val <= hi):
                errors.append(f"row {idx}: {col}={val} out of [{lo},{hi}]")
    return {"passed": len(errors) == 0, "errors": errors}`,
    testInput: `res = validate_contract([{"id":1,"amt":50},{"id":None,"amt":-5}], ["id","amt"], ["id"], {"amt":(0,1000)}); assert not res["passed"] and len(res["errors"])==2`,
    explanation: 'Write-Audit-Publish (WAP) pipelines quarantine failed batches before publishing Iceberg/Delta tags to downstream BI consumers.',
    practicalRelevance: 'Prevents silent bad data propagation to ML models and financial dashboards.',
  },
  {
    id: 'de_06_schema_evolution_compat',
    title: 'Lab: Avro / Protobuf Backwards Schema Compatibility Check',
    domain: 'Engineering Labs',
    topic: 'Schema Evolution',
    subtopic: 'Schema Registry Governance',
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companies: ['Confluent', 'LinkedIn', 'Uber', 'Google'],
    roundType: 'Engineering Lab',
    problemStatement:
      'Implement `is_backward_compatible(old_schema, new_schema)` where each schema is `{field_name: {"type": str, "has_default": bool}}`. Backwards compatibility holds if: (1) all fields in `old_schema` still exist with the same type, OR (2) any newly added field in `new_schema` has `has_default == True` (and removing a field without default breaks, wait: in Avro backwards compat, new schema can read old data if every NEW field has a default, and old fields aren\'t type-changed!). Check: new fields must have `has_default=True`, and shared fields must keep identical `type`.',
    starterCode: `def is_backward_compatible(old_schema, new_schema):
    for fname, spec in new_schema.items():
        if fname not in old_schema:
            if not spec.get("has_default", False):
                return False
        else:
            if old_schema[fname]["type"] != spec["type"]:
                return False
    return True`,
    detailedSolution: `def is_backward_compatible(old_schema, new_schema):
    for fname, spec in new_schema.items():
        if fname not in old_schema:
            if not spec.get("has_default", False):
                return False
        else:
            if old_schema[fname]["type"] != spec["type"]:
                return False
    return True`,
    testInput: `assert is_backward_compatible({"id":{"type":"long","has_default":False}}, {"id":{"type":"long","has_default":False},"src":{"type":"string","has_default":True}}) is True and is_backward_compatible({"id":{"type":"long","has_default":False}}, {"id":{"type":"long","has_default":False},"req":{"type":"string","has_default":False}}) is False`,
    explanation: 'Consumers upgraded to `new_schema` must deserialize historical events written with `old_schema`, requiring defaults for newly added fields.',
    practicalRelevance: 'Confluent Schema Registry CI/CD gates.',
  },
];

// Expand to 42 DE Core / PySpark / Engineering Labs questions
const EXTRA_DE_ITEMS: Array<{
  id: string;
  title: string;
  domain: 'PySpark & Distributed' | 'Engineering Labs';
  topic: string;
  subtopic: string;
  difficulty: Difficulty;
  experienceLevel: ExperienceTier;
  companies: string[];
  problem: string;
  code: string;
  test: string;
  note: string;
}> = [
  {
    id: 'de_07_broadcast_threshold_planner',
    title: 'PySpark: Broadcast vs Sort-Merge Join Cost Decision',
    domain: 'PySpark & Distributed',
    topic: 'PySpark & Skew Tuning',
    subtopic: 'Join Strategy Planner',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Databricks', 'Amazon', 'Uber'],
    problem: 'Implement `choose_join_strategy(left_mb, right_mb, broadcast_limit_mb=10)` returning `"BROADCAST_RIGHT"`, `"BROADCAST_LEFT"`, or `"SORT_MERGE"`.',
    code: `def choose_join_strategy(left_mb, right_mb, broadcast_limit_mb=10):
    if right_mb <= broadcast_limit_mb: return "BROADCAST_RIGHT"
    if left_mb <= broadcast_limit_mb: return "BROADCAST_LEFT"
    return "SORT_MERGE"`,
    test: `assert choose_join_strategy(5000, 8) == "BROADCAST_RIGHT" and choose_join_strategy(5000, 200) == "SORT_MERGE"`,
    note: 'Broadcast avoids shuffling the large fact table across network.',
  },
  {
    id: 'de_08_aqe_shuffle_coalesce',
    title: 'PySpark: Adaptive Query Execution (AQE) Partition Coalescing',
    domain: 'PySpark & Distributed',
    topic: 'PySpark & Skew Tuning',
    subtopic: 'Small-Partition Coalescing',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Databricks', 'Netflix', 'Google'],
    problem: 'Given post-shuffle partition byte sizes `part_mb` and `target_mb`, greedily merge contiguous small partitions without exceeding `target_mb` and return coalesced sizes.',
    code: `def coalesce_partitions(part_mb, target_mb):
    out = []
    cur = 0
    for sz in part_mb:
        if cur > 0 and cur + sz > target_mb:
            out.append(cur)
            cur = sz
        else:
            cur += sz
    if cur > 0: out.append(cur)
    return out`,
    test: `assert coalesce_partitions([10, 20, 30, 80, 15], 64) == [60, 80, 15]`,
    note: 'Models Spark 3.x `spark.sql.adaptive.coalescePartitions.enabled` reducing task scheduling overhead.',
  },
  {
    id: 'de_09_iceberg_small_files_compaction',
    title: 'Lakehouse: Iceberg / Delta Bin-Packing Compaction Planner',
    domain: 'PySpark & Distributed',
    topic: 'Lakehouse & SCDs',
    subtopic: 'Small-Files Bin Packing',
    difficulty: 'Medium',
    experienceLevel: '6+ yrs',
    companies: ['Databricks', 'Snowflake', 'Apple'],
    problem: 'Identify files smaller than `min_file_mb` that need rewriting and group them into target ~`target_file_mb` rewrite bins.',
    code: `def plan_compaction(file_sizes_mb, min_file_mb=32, target_file_mb=128):
    small = [f for f in file_sizes_mb if f < min_file_mb]
    bins, cur = [], []
    cur_sum = 0
    for f in small:
        if cur and cur_sum + f > target_file_mb:
            bins.append(cur); cur = [f]; cur_sum = f
        else:
            cur.append(f); cur_sum += f
    if cur: bins.append(cur)
    return bins`,
    test: `assert plan_compaction([5, 10, 200, 12, 100], 32, 30) == [[5, 10, 12]]`,
    note: 'Solves metadata bloat and S3 LIST/GET amplification in streaming Lakehouse sinks.',
  },
  {
    id: 'de_10_zorder_space_filling_key',
    title: 'Lakehouse: 2D Z-Order Bit-Interleaving Key',
    domain: 'PySpark & Distributed',
    topic: 'Lakehouse & SCDs',
    subtopic: 'Z-Order Clustering',
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companies: ['Databricks', 'Snowflake'],
    problem: 'Implement `z_order_2d(x, y, bits=4)` interleaving bits of `x` and `y` so multi-column range filters prune Parquet row groups.',
    code: `def z_order_2d(x, y, bits=4):
    z = 0
    for i in range(bits):
        z |= ((x >> i) & 1) << (2 * i + 1)
        z |= ((y >> i) & 1) << (2 * i)
    return z`,
    test: `assert z_order_2d(3, 1, 2) == 0b1011`,
    note: 'Preserves multi-dimensional spatial locality for Delta `OPTIMIZE ZORDER BY` and Iceberg.',
  },
  {
    id: 'de_11_kafka_consistent_partitioner',
    title: 'Streaming: Deterministic Murmur/Hash Key Partitioner',
    domain: 'PySpark & Distributed',
    topic: 'Streaming & Kafka',
    subtopic: 'Partition Key Ordering',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['Confluent', 'Uber', 'LinkedIn'],
    problem: 'Assign `(key, num_partitions)` deterministically so same-key events always preserve per-key ordering.',
    code: `import hashlib
def kafka_partition(key: str, num_partitions: int) -> int:
    digest = int(hashlib.md5(key.encode()).hexdigest(), 16)
    return digest % num_partitions`,
    test: `p = kafka_partition("order_99", 12); assert 0 <= p < 12 and p == kafka_partition("order_99", 12)`,
    note: 'Deterministic hashing avoids Python per-process `PYTHONHASHSEED` randomization.',
  },
  {
    id: 'de_12_flink_watermark_late_events',
    title: 'Streaming: Event-Time Tumbling Window + Allowed Lateness',
    domain: 'PySpark & Distributed',
    topic: 'Streaming & Kafka',
    subtopic: 'Watermarks & Late Data',
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companies: ['Uber', 'Netflix', 'Confluent'],
    problem: 'Process events `(event_ts, val)` with `window_size=10`, `max_out_of_order=3`, `allowed_lateness=2`. Track watermark `max_seen - max_out_of_order`, drop events older than `watermark - allowed_lateness`, and return window sums.',
    code: `from collections import defaultdict
def process_windows(events, window_size=10, max_ooo=3, allowed_lateness=2):
    wm = 0
    sums = defaultdict(int)
    dropped = 0
    for ts, val in events:
        wm = max(wm, ts - max_ooo)
        if ts < wm - allowed_lateness:
            dropped += 1
        else:
            w_start = (ts // window_size) * window_size
            sums[w_start] += val
    return dict(sums), dropped`,
    test: `s, d = process_windows([(10,5),(25,10),(15,3),(30,4)], 10, 3, 2); assert d == 1 and s[20] == 10`,
    note: 'Models Apache Flink watermark progression + side-output late data routing.',
  },
  {
    id: 'de_13_dlq_retry_backoff',
    title: 'Lab: Exponential Backoff & Dead-Letter Queue (DLQ) Router',
    domain: 'Engineering Labs',
    topic: 'Pipeline Reliability',
    subtopic: 'Retry & DLQ Routing',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Stripe', 'Razorpay', 'Amazon'],
    problem: 'Route records with transient errors up to `max_retries` and push poison pills directly to `dlq`.',
    code: `def route_records(records, max_retries=3):
    ok, retry, dlq = [], [], []
    for r in records:
        if r.get("valid"): ok.append(r["id"])
        elif r.get("poison") or r.get("attempts", 0) >= max_retries: dlq.append(r["id"])
        else: retry.append((r["id"], 2 ** r.get("attempts", 0)))
    return ok, retry, dlq`,
    test: `ok, ret, dlq = route_records([{"id":1,"valid":True},{"id":2,"valid":False,"attempts":1},{"id":3,"valid":False,"poison":True}], 3); assert ok==[1] and ret==[(2,2)] and dlq==[3]`,
    note: 'Prevents poison-pill messages from stalling Kafka consumer offsets.',
  },
  {
    id: 'de_14_airflow_backfill_chunker',
    title: 'Lab: Airflow Backfill Date-Range Chunker',
    domain: 'Engineering Labs',
    topic: 'Orchestration & DAGs',
    subtopic: 'Parallel Backfill Windows',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['Airbnb', 'Atlassian', 'Swiggy'],
    problem: 'Split `[start_day, end_day]` inclusive integers into chunks of `step` days for bounded DAG concurrency.',
    code: `def chunk_backfill(start_day, end_day, step):
    chunks = []
    cur = start_day
    while cur <= end_day:
        chunks.append((cur, min(end_day, cur + step - 1)))
        cur += step
    return chunks`,
    test: `assert chunk_backfill(1, 10, 4) == [(1,4),(5,8),(9,10)]`,
    note: 'Prevents OOMs and warehouse slot starvation during 1-year historical backfills.',
  },
  {
    id: 'de_15_idempotent_partition_overwrite',
    title: 'Lab: Dynamic Partition Overwrite Simulator',
    domain: 'Engineering Labs',
    topic: 'Incremental Ingestion & CDC',
    subtopic: 'Atomic Partition Swap',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Netflix', 'Databricks', 'Flipkart'],
    problem: 'Given `existing_partitions` dict `{dt: rows}` and `new_rows` tagged with `dt`, replace ONLY partitions touched by `new_rows` without deleting untouched historical partitions.',
    code: `from collections import defaultdict
def dynamic_partition_overwrite(existing_partitions, new_rows):
    res = {k: list(v) for k, v in existing_partitions.items()}
    grouped = defaultdict(list)
    for r in new_rows:
        grouped[r["dt"]].append(r)
    for dt, rows in grouped.items():
        res[dt] = rows
    return res`,
    test: `out = dynamic_partition_overwrite({"2026-01-01":[{"dt":"2026-01-01","v":1}], "2026-01-02":[{"dt":"2026-01-02","v":2}]}, [{"dt":"2026-01-02","v":99}]); assert out["2026-01-01"][0]["v"]==1 and out["2026-01-02"][0]["v"]==99`,
    note: 'Mirrors Spark `partitionOverwriteMode=dynamic` and Iceberg `replaceWhere`.',
  },
  {
    id: 'de_16_reconcile_row_checksums',
    title: 'Lab: Deterministic Row Checksum Reconciliation',
    domain: 'Engineering Labs',
    topic: 'Data Quality & Governance',
    subtopic: 'Cross-Warehouse Parity',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Snowflake', 'PhonePe', 'Intuit'],
    problem: 'Compute canonical SHA-256 checksum per primary key across sorted `(k, v)` fields and return mismatched PKs.',
    code: `import hashlib, json
def diff_checksums(src_rows, tgt_rows):
    def sig(r): return hashlib.sha256(json.dumps(r, sort_keys=True).encode()).hexdigest()
    s_map = {r["id"]: sig(r) for r in src_rows}
    t_map = {r["id"]: sig(r) for r in tgt_rows}
    return sorted([k for k in set(s_map) | set(t_map) if s_map.get(k) != t_map.get(k)])`,
    test: `assert diff_checksums([{"id":1,"v":"a"},{"id":2,"v":"b"}], [{"id":1,"v":"a"},{"id":2,"v":"c"}]) == [2]`,
    note: 'Used during Snowflake/BigQuery zero-downtime table migrations.',
  },
];

// Generate remaining 26 structured PySpark, Iceberg, dbt, Terraform, CI/CD, & Governance labs
const ADDITIONAL_DE_MODULES: Array<[string, string, 'PySpark & Distributed' | 'Engineering Labs', string, Difficulty, ExperienceTier, string[], string, string, string]> = [
  ['de_17_scd_type1_upsert', 'SCD Type 1 In-Place Dimension Overwrite', 'PySpark & Distributed', 'Lakehouse & SCDs', 'Easy', '3-4 yrs', ['Amazon', 'Flipkart'], 'Implement `scd1_upsert(target, updates)` updating attributes in place by `id`.', `def scd1_upsert(target, updates):\n    m = {r["id"]: dict(r) for r in target}\n    for u in updates: m[u["id"]] = dict(u)\n    return [m[k] for k in sorted(m)]`, `assert scd1_upsert([{"id":1,"city":"BLR"}], [{"id":1,"city":"NYC"},{"id":2,"city":"SFO"}]) == [{"id":1,"city":"NYC"},{"id":2,"city":"SFO"}]`],
  ['de_18_scd_type3_prev_state', 'SCD Type 3 Track Previous Value Column', 'PySpark & Distributed', 'Lakehouse & SCDs', 'Medium', '3-4 yrs', ['Walmart Global Tech', 'Salesforce'], 'Implement `scd3_update(row, new_region)` preserving `prev_region` when `region` changes.', `def scd3_update(row, new_region):\n    r = dict(row)\n    if r["region"] != new_region:\n        r["prev_region"] = r["region"]\n        r["region"] = new_region\n    return r`, `assert scd3_update({"id":1,"region":"APAC","prev_region":None}, "EMEA") == {"id":1,"region":"EMEA","prev_region":"APAC"}`],
  ['de_19_parquet_predicate_pushdown', 'Parquet Row-Group Min/Max Statistics Pruning', 'PySpark & Distributed', 'Storage Internals', 'Medium', '4-6 yrs', ['Databricks', 'Snowflake', 'Google'], 'Given `row_groups=[{"id":i, "min":a, "max":b}]`, prune row groups that cannot contain `target`.', `def prune_row_groups(row_groups, target):\n    return [rg["id"] for rg in row_groups if rg["min"] <= target <= rg["max"]]`, `assert prune_row_groups([{"id":0,"min":1,"max":50},{"id":1,"min":51,"max":100}], 75) == [1]`],
  ['de_20_bloom_filter_check', 'Parquet / Iceberg Bloom Filter Probe Simulator', 'PySpark & Distributed', 'Storage Internals', 'Medium', '6+ yrs', ['Databricks', 'Snowflake'], 'Implement simple multi-hash bitset `BloomFilter(size)` with `add` and `might_contain`.', `class BloomFilter:\n    def __init__(self, m=64):\n        self.m = m; self.bits = 0\n    def _hashes(self, k):\n        return [hash((i, k)) % self.m for i in (1, 2, 3)]\n    def add(self, k):\n        for h in self._hashes(k): self.bits |= (1 << h)\n    def might_contain(self, k):\n        return all((self.bits >> h) & 1 for h in self._hashes(k))`, `bf = BloomFilter(128); bf.add("tx_99"); assert bf.might_contain("tx_99")`],
  ['de_21_delta_time_travel_log', 'Delta Lake `_delta_log` Snapshot Version Reconstructor', 'PySpark & Distributed', 'Lakehouse & SCDs', 'Hard', '6+ yrs', ['Databricks', 'Microsoft'], 'Replay commit actions `[{"ver":0,"add":["f1"],"remove":[]}, {"ver":1,"add":["f2"],"remove":["f1"]}]` up to `target_ver`.', `def active_files_at_version(commits, target_ver):\n    active = set()\n    for c in sorted(commits, key=lambda x: x["ver"]):\n        if c["ver"] > target_ver: break\n        for f in c.get("add", []): active.add(f)\n        for f in c.get("remove", []): active.discard(f)\n    return sorted(active)`, `assert active_files_at_version([{"ver":0,"add":["a.pq"],"remove":[]},{"ver":1,"add":["b.pq"],"remove":["a.pq"]}], 0) == ["a.pq"]`],
  ['de_22_pii_tokenization_mask', 'Lab: Deterministic HMAC PII Masking Transformer', 'Engineering Labs', 'Data Quality & Governance', 'Easy', '3-4 yrs', ['PhonePe', 'Razorpay', 'Apple'], 'Hash `email` with salt using SHA-256 prefix while preserving domain.', `import hashlib\ndef mask_email(email, salt="s3cr3t"):\n    user, dom = email.split("@", 1)\n    tok = hashlib.sha256((salt + user).encode()).hexdigest()[:12]\n    return f"{tok}@{dom}"`, `m = mask_email("alice@uber.com"); assert m.endswith("@uber.com") and "alice" not in m`],
  ['de_23_dbt_ref_dependency_extractor', 'Lab: Extract `ref()` Models From dbt SQL AST', 'Engineering Labs', 'Orchestration & DAGs', 'Easy', '3-4 yrs', ['Atlassian', 'Shopify', 'Snowflake'], 'Parse `{{ ref(\'model_name\') }}` references from dbt SQL text.', `import re\ndef extract_dbt_refs(sql_text):\n    return sorted(set(re.findall(r"ref\\(\\s*['\\\"]([a-zA-Z0-9_]+)['\\\"]\\s*\\)", sql_text)))`, `assert extract_dbt_refs("SELECT * FROM {{ ref('stg_orders') }} JOIN {{ ref('dim_users') }}") == ["dim_users", "stg_orders"]`],
  ['de_24_spark_catalyst_projection_prune', 'PySpark: Catalyst Optimizer Unused Column Pruning', 'PySpark & Distributed', 'PySpark Transformations', 'Medium', '4-6 yrs', ['Databricks', 'Google'], 'Given `required_cols` and `projected_cols`, compute minimal columns to read from Parquet.', `def prune_columns(schema_cols, used_cols):\n    return [c for c in schema_cols if c in set(used_cols)]`, `assert prune_columns(["id","ts","blob","amt"], ["id","amt"]) == ["id", "amt"]`],
  ['de_25_kafka_consumer_lag_calc', 'Streaming: Compute Consumer Group Lag Per Partition', 'PySpark & Distributed', 'Streaming & Kafka', 'Easy', '3-4 yrs', ['Confluent', 'Uber', 'Swiggy'], 'Given `log_end_offsets` and `committed_offsets`, return total lag and max lagging partition.', `def consumer_lag(leo, committed):\n    lags = {p: max(0, leo[p] - committed.get(p, 0)) for p in leo}\n    return sum(lags.values()), max(lags, key=lags.get)`, `assert consumer_lag({0:100, 1:250}, {0:90, 1:100}) == (160, 1)`],
  ['de_26_exactly_once_idempotency_key', 'Streaming: Exactly-Once Sink Deduplication Store', 'PySpark & Distributed', 'Streaming & Kafka', 'Medium', '4-6 yrs', ['Stripe', 'PhonePe', 'Confluent'], 'Filter out already-committed `idempotency_key` records and record newly committed keys.', `def sink_exactly_once(batch, committed_set):\n    applied = []\n    for r in batch:\n        k = r["idempotency_key"]\n        if k not in committed_set:\n            committed_set.add(k)\n            applied.append(r)\n    return applied`, `s = {"k1"}; assert len(sink_exactly_once([{"idempotency_key":"k1"},{"idempotency_key":"k2"}], s)) == 1`],
  ['de_27_snowflake_micro_partition_overlap', 'Warehouse: Measure Micro-Partition Clustering Depth', 'PySpark & Distributed', 'Storage Internals', 'Hard', '6+ yrs', ['Snowflake', 'Google'], 'Given micro-partition `[min, max]` ranges, compute max overlapping partitions for a point query.', `def max_partition_overlap(ranges):\n    events = []\n    for a, b in ranges: events.extend([(a, 1), (b + 1, -1)])\n    events.sort()\n    cur = best = 0\n    for _, d in events:\n        cur += d; best = max(best, cur)\n    return best`, `assert max_partition_overlap([(1,10),(5,15),(12,20)]) == 2`],
  ['de_28_airflow_sla_miss_detector', 'Lab: DAG Task SLA Breach Detector', 'Engineering Labs', 'Orchestration & DAGs', 'Easy', '3-4 yrs', ['Airbnb', 'LinkedIn'], 'Flag tasks where `actual_end - scheduled_start > sla_sec`.', `def find_sla_misses(runs, sla_sec):\n    return [r["task_id"] for r in runs if r["end"] - r["sched"] > sla_sec]`, `assert find_sla_misses([{"task_id":"t1","sched":0,"end":120},{"task_id":"t2","sched":0,"end":400}], 300) == ["t2"]`],
  ['de_29_spark_memory_spill_estimator', 'PySpark: Executor Memory Fraction & Spill Threshold', 'PySpark & Distributed', 'PySpark & Skew Tuning', 'Medium', '4-6 yrs', ['Databricks', 'Amazon'], 'Calculate Spark Unified Execution+Storage pool size `(heap_mb - 300) * memory_fraction`.', `def spark_unified_pool_mb(heap_mb, memory_fraction=0.6):\n    return round(max(0, heap_mb - 300) * memory_fraction, 1)`, `assert spark_unified_pool_mb(4300, 0.6) == 2400.0`],
  ['de_30_terraform_tag_compliance_ci', 'Lab: CI/CD Infrastructure-as-Code FinOps Tag Guard', 'Engineering Labs', 'CI/CD & DevOps', 'Easy', '3-4 yrs', ['Atlassian', 'Adobe', 'Microsoft'], 'Verify every cloud resource dict includes mandatory FinOps tags `owner`, `env`, `cost_center`.', `def check_iac_tags(resources):\n    req = {"owner", "env", "cost_center"}\n    return [r["name"] for r in resources if not req.issubset(set(r.get("tags", {}).keys()))]`, `assert check_iac_tags([{"name":"s3_raw","tags":{"owner":"de","env":"prod"}}]) == ["s3_raw"]`],
  ['de_31_dbt_incremental_merge_sql_gen', 'Lab: Generate Idempotent dbt Incremental Filter', 'Engineering Labs', 'Incremental Ingestion & CDC', 'Medium', '4-6 yrs', ['Snowflake', 'Databricks', 'Shopify'], 'Generate lookback cutoff timestamp string for safe incremental SQL runs.', `from datetime import datetime, timedelta\ndef lookback_cutoff(max_ts_iso, hours=6):\n    dt = datetime.fromisoformat(max_ts_iso)\n    return (dt - timedelta(hours=hours)).isoformat()`, `assert lookback_cutoff("2026-05-01T12:00:00", 6) == "2026-05-01T06:00:00"`],
  ['de_32_pyspark_repartition_vs_coalesce', 'PySpark: Choose repartition() vs coalesce() Safely', 'PySpark & Distributed', 'PySpark & Skew Tuning', 'Medium', '3-4 yrs', ['Databricks', 'Walmart Global Tech'], 'Return `"coalesce"` when shrinking partitions without skew risk, `"repartition"` when increasing partitions or balancing skewed upstream filters.', `def partition_op(cur_parts, target_parts, skewed=False):\n    if target_parts > cur_parts or skewed: return "repartition"\n    return "coalesce"`, `assert partition_op(200, 20, False) == "coalesce" and partition_op(20, 200, False) == "repartition"`],
  ['de_33_cdc_tombstone_compaction', 'Lab: Compact CDC Log Retaining Tombstones Safely', 'Engineering Labs', 'Incremental Ingestion & CDC', 'Hard', '6+ yrs', ['Confluent', 'Uber', 'Razorpay'], 'Keep only the latest event per `key` by `offset`, retaining `op="D"` tombstones if `keep_tombstones=True`.', `def compact_cdc(events, keep_tombstones=False):\n    latest = {}\n    for e in events:\n        k = e["key"]\n        if k not in latest or e["offset"] > latest[k]["offset"]: latest[k] = e\n    return [v for v in latest.values() if keep_tombstones or v["op"] != "D"]`, `assert len(compact_cdc([{"key":1,"op":"I","offset":1},{"key":1,"op":"D","offset":2}], False)) == 0`],
  ['de_34_data_skew_entropy_metric', 'PySpark: Measure Partition Skew Ratio (Max / Median)', 'PySpark & Distributed', 'PySpark & Skew Tuning', 'Medium', '4-6 yrs', ['Uber', 'Databricks'], 'Compute `max(counts) / median(counts)` to trigger skew alerts when ratio > 5.0.', `import statistics\ndef skew_ratio(partition_counts):\n    med = statistics.median(partition_counts)\n    return round(max(partition_counts) / med, 2) if med > 0 else float("inf")`, `assert skew_ratio([10, 12, 11, 100, 11]) == 9.09`],
  ['de_35_s3_hive_partition_path_parser', 'Lab: Parse Hive Partition Key-Values From S3 URI', 'Engineering Labs', 'Storage Internals', 'Easy', '3-4 yrs', ['Amazon', 'Netflix'], 'Extract `dt` and `country` from `s3://bucket/table/dt=2026-01-01/country=IN/part-0.parquet`.', `def parse_hive_path(uri):\n    return dict(seg.split("=", 1) for seg in uri.split("/") if "=" in seg)`, `assert parse_hive_path("s3://lake/orders/dt=2026-01-01/country=IN/part.parquet") == {"dt":"2026-01-01","country":"IN"}`],
  ['de_36_dag_circle_ci_dependency_test', 'Lab: Unit Test Pipeline Transform Purity & Determinism', 'Engineering Labs', 'CI/CD & DevOps', 'Easy', '3-4 yrs', ['Atlassian', 'Intuit'], 'Verify a transform function produces identical output on duplicate re-runs (idempotency check).', `def verify_idempotent(fn, sample):\n    return fn(sample) == fn(fn(sample))`, `assert verify_idempotent(lambda xs: sorted(set(xs)), [3,1,2,1]) is True`],
  ['de_37_spark_window_dedup_python', 'PySpark: Emulate Window ROW_NUMBER Deduplication', 'PySpark & Distributed', 'PySpark Transformations', 'Medium', '3-4 yrs', ['Flipkart', 'Meesho', 'Amazon'], 'Deduplicate list of dicts by `key` keeping highest `ts`.', `def dedup_latest(rows, key_col="id", order_col="ts"):\n    best = {}\n    for r in rows:\n        k = r[key_col]\n        if k not in best or r[order_col] > best[k][order_col]: best[k] = r\n    return list(best.values())`, `assert len(dedup_latest([{"id":1,"ts":1},{"id":1,"ts":5}])) == 1`],
  ['de_38_columnar_rle_encoder', 'PySpark: Implement Run-Length Encoding (RLE) for Parquet', 'PySpark & Distributed', 'Storage Internals', 'Medium', '4-6 yrs', ['Snowflake', 'Google', 'Databricks'], 'Compress sorted column values into `(value, run_length)` pairs.', `def rle_encode(vals):\n    if not vals: return []\n    out = [[vals[0], 1]]\n    for v in vals[1:]:\n        if v == out[-1][0]: out[-1][1] += 1\n        else: out.append([v, 1])\n    return [tuple(x) for x in out]`, `assert rle_encode(["US","US","US","IN","IN"]) == [("US",3),("IN",2)]`],
  ['de_39_dictionary_encoding_parquet', 'PySpark: Implement Parquet Dictionary Encoding', 'PySpark & Distributed', 'Storage Internals', 'Easy', '3-4 yrs', ['Databricks', 'Snowflake'], 'Return `(dictionary_list, encoded_indices)` for low-cardinality string column.', `def dict_encode(vals):\n    vocab = {}\n    d_list, ids = [], []\n    for v in vals:\n        if v not in vocab:\n            vocab[v] = len(d_list); d_list.append(v)\n        ids.append(vocab[v])\n    return d_list, ids`, `assert dict_encode(["prod","dev","prod"]) == (["prod","dev"], [0,1,0])`],
  ['de_40_finops_warehouse_idle_auto_suspend', 'Lab: FinOps Warehouse Auto-Suspend Savings Estimator', 'Engineering Labs', 'CI/CD & DevOps', 'Medium', '4-6 yrs', ['Snowflake', 'Databricks'], 'Compute wasted credits when `idle_gap > suspend_timeout` given sorted query `(start, end)` seconds.', `def wasted_idle_sec(queries, suspend_after=60):\n    wasted = 0\n    for i in range(1, len(queries)):\n        gap = queries[i][0] - queries[i-1][1]\n        if gap > 0:\n            wasted += min(gap, suspend_after)\n    return wasted`, `assert wasted_idle_sec([(0,10),(100,120)], 60) == 60`],
  ['de_41_quarantine_split_pipeline', 'Lab: Write-Audit-Publish (WAP) Split Valid vs Quarantine', 'Engineering Labs', 'Data Quality & Governance', 'Medium', '4-6 yrs', ['Netflix', 'Uber', 'Airbnb'], 'Split records into `(valid_rows, quarantine_rows)` where valid rows must have `amount > 0` and non-empty `user_id`.', `def wap_split(rows):\n    valid, bad = [], []\n    for r in rows:\n        if r.get("user_id") and (r.get("amount") or 0) > 0: valid.append(r)\n        else: bad.append(r)\n    return valid, bad`, `v, b = wap_split([{"user_id":"u1","amount":10},{"user_id":"","amount":5}]); assert len(v)==1 and len(b)==1`],
  ['de_42_cdc_merge_conflict_priority', 'Lab: Multi-Region Active-Active CRDT Last-Write-Wins Merge', 'Engineering Labs', 'Incremental Ingestion & CDC', 'Hard', '6+ yrs', ['Google', 'Meta', 'Uber'], 'Merge two region replica logs keeping highest `(hlc_ts, region_priority)` per record `id`.', `def lww_merge(reg_a, reg_b):\n    merged = {}\n    for r in reg_a + reg_b:\n        k = r["id"]\n        if k not in merged or (r["hlc_ts"], r["prio"]) > (merged[k]["hlc_ts"], merged[k]["prio"]):\n            merged[k] = r\n    return merged`, `assert lww_merge([{"id":1,"hlc_ts":10,"prio":1,"v":"a"}], [{"id":1,"hlc_ts":10,"prio":2,"v":"b"}])[1]["v"] == "b"`],
  ['de_43_iceberg_small_files_binpack', 'Lab: Iceberg Small-File Compaction Bin-Packer', 'Engineering Labs', 'Lakehouse & SCDs', 'Medium', '4-6 yrs', ['Databricks', 'Netflix', 'Snowflake'], 'Group sorted file sizes (MB) greedily into target output files <= `target_mb` without splitting files.', `def binpack_files(sizes_mb, target_mb=128):\n    bins, cur = [], 0\n    for sz in sizes_mb:\n        if cur + sz <= target_mb and bins:\n            bins[-1].append(sz); cur += sz\n        else:\n            bins.append([sz]); cur = sz\n    return bins`, `assert len(binpack_files([30, 40, 50, 90], 128)) == 2`],
  ['de_44_spark_aqe_coalesce_partitions', 'PySpark: AQE Post-Shuffle Partition Coalescer', 'PySpark & Distributed', 'PySpark & Skew Tuning', 'Medium', '4-6 yrs', ['Databricks', 'Uber'], 'Merge consecutive tiny shuffle partition byte sizes until each coalesced partition approaches `advisory_bytes`.', `def aqe_coalesce(part_bytes, advisory_bytes=64):\n    out = []\n    for b in part_bytes:\n        if out and out[-1] + b <= advisory_bytes:\n            out[-1] += b\n        else:\n            out.append(b)\n    return out`, `assert aqe_coalesce([10, 20, 30, 50, 10], 64) == [60, 60]`],
  ['de_45_watermark_late_event_dropper', 'Streaming: Watermark Late-Event Filter', 'PySpark & Distributed', 'Streaming & Kafka', 'Medium', '4-6 yrs', ['Confluent', 'LinkedIn', 'Swiggy'], 'Track `max_event_ts` and drop events arriving strictly before `max_event_ts - delay_sec`.', `def filter_late_events(events, delay_sec=10):\n    max_ts = float("-inf"); kept = []\n    for e in events:\n        ts = e["ts"]\n        max_ts = max(max_ts, ts)\n        if ts >= max_ts - delay_sec:\n            kept.append(e)\n    return kept`, `assert [e["id"] for e in filter_late_events([{"id":1,"ts":100},{"id":2,"ts":85},{"id":3,"ts":95}], 10)] == [1, 3]`],
  ['de_46_zorder_interleave_bits', 'Storage Internals: 2D Z-Order Morton Code Encoder', 'PySpark & Distributed', 'Storage Internals', 'Hard', '6+ yrs', ['Databricks', 'Snowflake'], 'Compute the 2D Morton Z-order integer by interleaving the lower 8 bits of `x` and `y`.', `def morton_2d(x, y):\n    z = 0\n    for i in range(8):\n        z |= ((x >> i) & 1) << (2 * i)\n        z |= ((y >> i) & 1) << (2 * i + 1)\n    return z`, `assert morton_2d(2, 3) == 14`],
  ['de_47_schema_registry_backward_check', 'Lab: Avro/Protobuf Backward Compatibility Checker', 'Engineering Labs', 'Data Quality & Governance', 'Medium', '4-6 yrs', ['Confluent', 'Uber', 'PhonePe'], 'Verify every field in `old_schema` exists in `new_schema` OR every newly added field in `new_schema` has `has_default=True`.', `def is_backward_compatible(old_fields, new_schema):\n    return all(f in old_fields or meta.get("has_default", False) for f, meta in new_schema.items())`, `assert is_backward_compatible({"id","amt"}, {"id":{"has_default":False},"amt":{"has_default":False},"ccy":{"has_default":True}}) is True`],
  ['de_48_token_bucket_api_ingestor', 'Lab: Rate-Limited REST API Ingestion Token Bucket', 'Engineering Labs', 'Incremental Ingestion & CDC', 'Medium', '3-4 yrs', ['Stripe', 'Shopify', 'Razorpay'], 'Simulate token bucket refill (`rate_per_sec`, `capacity`) across request timestamps and return accepted request IDs.', `def token_bucket_accept(reqs, capacity=2, rate=1.0):\n    tokens, last_t, ok = float(capacity), 0.0, []\n    for rid, t in reqs:\n        tokens = min(capacity, tokens + (t - last_t) * rate)\n        last_t = t\n        if tokens >= 1.0:\n            tokens -= 1.0; ok.append(rid)\n    return ok`, `assert token_bucket_accept([(1,0.0),(2,0.0),(3,0.1),(4,1.2)], 2, 1.0) == [1, 2, 4]`],
  ['de_49_dag_topological_kahn_batch', 'Lab: Parallel Airflow DAG Execution Wave Planner', 'Engineering Labs', 'Orchestration & DAGs', 'Medium', '4-6 yrs', ['Airbnb', 'LinkedIn', 'Google'], 'Group DAG tasks `(tasks, edges)` into parallel topological execution waves using Kahn\'s algorithm.', `from collections import defaultdict, deque\ndef execution_waves(tasks, edges):\n    indeg = {t: 0 for t in tasks}; adj = defaultdict(list)\n    for u, v in edges:\n        adj[u].append(v); indeg[v] += 1\n    q = deque(sorted([t for t in tasks if indeg[t] == 0])); waves = []\n    while q:\n        lvl = list(q); q.clear(); waves.append(lvl); nxt = []\n        for u in lvl:\n            for v in adj[u]:\n                indeg[v] -= 1\n                if indeg[v] == 0: nxt.append(v)\n        q.extend(sorted(nxt))\n    return waves`, `assert execution_waves(["a","b","c"], [("a","c"),("b","c")]) == [["a","b"],["c"]]`],
  ['de_50_dlq_exponential_backoff_retry', 'Lab: Dead-Letter Queue Exponential Backoff Planner', 'Engineering Labs', 'CI/CD & DevOps', 'Easy', '3-4 yrs', ['Amazon', 'Netflix', 'Atlassian'], 'Return retry delay schedule `[base * (2 ** i) for i in range(max_retries)]` capped at `max_cap`.', `def backoff_schedule(max_retries, base=2, max_cap=30):\n    return [min(max_cap, base * (2 ** i)) for i in range(max_retries)]`, `assert backoff_schedule(5, 2, 20) == [2, 4, 8, 16, 20]`],
  ['de_51_star_schema_fact_grain_guard', 'Lab: Fact Table Grain Uniqueness Assertor', 'Engineering Labs', 'Data Quality & Governance', 'Easy', '3-4 yrs', ['Flipkart', 'Meesho', 'Walmart Global Tech'], 'Detect duplicate composite grain keys `(order_id, line_id)` before loading a fact table.', `def find_grain_violations(rows, grain_cols=("order_id", "line_id")):\n    seen, dups = set(), []\n    for r in rows:\n        k = tuple(r[c] for c in grain_cols)\n        if k in seen: dups.append(k)\n        seen.add(k)\n    return dups`, `assert find_grain_violations([{"order_id":1,"line_id":1},{"order_id":1,"line_id":1}]) == [(1, 1)]`],
  ['de_52_spark_broadcast_threshold_planner', 'PySpark: Join Strategy Selector (BHJ vs SMJ)', 'PySpark & Distributed', 'PySpark & Skew Tuning', 'Medium', '4-6 yrs', ['Databricks', 'Microsoft', 'Apple'], 'Choose `"BroadcastHashJoin"` if smaller side <= `threshold_mb`, else `"SortMergeJoin"`.', `def choose_join_strategy(left_mb, right_mb, threshold_mb=10):\n    return "BroadcastHashJoin" if min(left_mb, right_mb) <= threshold_mb else "SortMergeJoin"`, `assert choose_join_strategy(500, 8, 10) == "BroadcastHashJoin" and choose_join_strategy(500, 120, 10) == "SortMergeJoin"`],
];

export const SEED_DE_CORE_QUESTIONS: Question[] = [
  ...DE_CORE_SPECS.map((d): Question => ({
    uniqueId: d.id,
    title: d.title,
    problemStatement: d.problemStatement,
    domain: d.domain,
    topic: d.topic,
    subtopic: d.subtopic,
    roadmapTracks: ['Data Engineering Core'],
    difficulty: d.difficulty,
    experienceLevel: d.experienceLevel,
    companyTags: d.companies,
    roundType: d.roundType,
    roundNumber: d.domain === 'Engineering Labs' || d.id === 'de_02_scd_type2_merge_engine' ? 7 : 3,
    evaluationType: 'python',
    sourceType: 'curated_track',
    sourceReference: `D's platforms DE Core & Labs · ${d.topic}`,
    setupSchemaOrEnv: '# Executed in Pyodide CPython + PySpark DataFrame Shim Worker',
    sampleInput: d.testInput,
    expectedOutput: 'All pipeline & lab assertions pass',
    testCases: [{ name: 'Pipeline Validation', input: d.testInput, expected: 'True' }],
    hiddenTestCases: [{ name: 'Hidden Edge-Case Validation', input: d.testInput, expected: 'True' }],
    starterCode: buildPythonStarterSkeleton(d.detailedSolution, `Implement ${d.subtopic}`),
    detailedSolution: d.detailedSolution,
    alternativeApproaches: 'Compare Spark native expressions, Delta/Iceberg SQL MERGE, and streaming checkpoints.',
    explanation: d.explanation,
    practicalRelevance: d.practicalRelevance,
    relatedLearningId: 'topic_lakehouse_formats',
    executionPlanNotes: d.explanation,
  })),
  ...ADDITIONAL_DE_MODULES.map(([id, title, domain, topic, difficulty, experienceLevel, companies, problem, code, test]): Question => ({
    uniqueId: id,
    title,
    problemStatement: problem,
    domain,
    topic,
    subtopic: topic,
    roadmapTracks: ['Data Engineering Core'],
    difficulty,
    experienceLevel,
    companyTags: companies,
    roundType: domain === 'Engineering Labs' ? 'Engineering Lab' : 'PySpark & Big Data',
    roundNumber: domain === 'Engineering Labs' ? 7 : 3,
    evaluationType: 'python',
    sourceType: 'curated_track',
    sourceReference: `D's platforms DE Core & Labs · ${topic}`,
    setupSchemaOrEnv: '# Executed in Pyodide CPython + PySpark DataFrame Shim Worker',
    sampleInput: test,
    expectedOutput: 'All pipeline assertions pass',
    testCases: [{ name: 'Sample Lab Assertion', input: test, expected: 'True' }],
    hiddenTestCases: [{ name: 'Hidden Lab Assertion', input: test, expected: 'True' }],
    starterCode: buildPythonStarterSkeleton(code, `Implement ${topic}`),
    detailedSolution: code,
    alternativeApproaches: 'Evaluate distributed shuffle impact, partition sizing, and idempotency guarantees.',
    explanation: `Production pattern tested in ${companies.join(', ')} Data Engineering interviews.`,
    practicalRelevance: `Core ${topic} engineering pattern.`,
    relatedLearningId: 'topic_lakehouse_formats',
    executionPlanNotes: `Deterministic validation in isolated browser runtime.`,
  })),
];
