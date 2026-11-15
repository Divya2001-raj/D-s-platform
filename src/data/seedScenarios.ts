import type { ProductionScenario } from '../types/platform';

export const SEED_PRODUCTION_SCENARIOS: ProductionScenario[] = [
  {
    id: 'scen_spark_oom_skew',
    title: 'Spark Silver Job Failing at 99% With Executor OOM During Fact-Dim Join',
    domain: 'PySpark & Distributed Compute',
    severity: 'SEV-1',
    environment: 'Spark 3.5 on EMR · 80 Executors (32GB RAM) · 12TB Daily Orders Fact',
    problem:
      'The nightly `silver_orders_enriched` Spark job completes 199 of 200 shuffle tasks in 4 minutes, then stalls on task #147 for 45 minutes before crashing with `Container killed by YARN for exceeding memory limits` / `FetchFailedException`.',
    telemetryClues: [
      'Spark UI Stage Summary: Median Shuffle Read = 180 MB, Max Shuffle Read = 48.6 GB on Task #147.',
      'GC Time on Executor 12 hits 68% before JVM exit code 137 (OOM Killer).',
      'Inspecting `merchant_id` distribution reveals `merchant_id IS NULL` or `"GUEST_CHECKOUT"` represents 31% of all rows.',
    ],
    investigationSteps: [
      'Open Spark UI -> Stages -> Failed Stage -> Summary Metrics for P50 vs Max Shuffle Read/Records.',
      'Check SQL/DataFrame DAG tab to identify which Join or GroupBy operator sits at the boundary.',
      'Profile join key cardinality (`COUNT(*) GROUP BY join_key ORDER BY 2 DESC LIMIT 10`) to isolate hot/NULL keys.',
      'Verify why AQE `skewJoin` did not trigger (e.g., an intermediate `Window` or custom UDF prevented AQE split, or `skewedPartitionThresholdInBytes` was set too high).',
    ],
    rootCause:
      'Millions of rows share `merchant_id IS NULL` / `"BOT_TEST"`. Standard hash partitioning routes every matching key to a single reducer task (#147), overflowing executor off-heap + execution memory and spilling gigabytes to disk.',
    solution:
      '1. Filter or route `NULL` join keys cleanly before joining (remember SQL `NULL = NULL` never matches anyway, or assign unique negative random keys to NULLs).\n2. Enable AQE skew join (`spark.sql.adaptive.skewJoin.enabled=true`) OR apply partial key salting (`0..N-1`) exclusively to detected heavy-hitter keys while keeping normal keys unsalted.',
    tradeOffs:
      'Full-table salting explodes the entire dimension table N times; **partial/isolated salting** (salting only keys > 1M rows) keeps 95% of data untouched with zero broadcast bloat.',
    preventionChecklist: [
      'Add pre-join NULL & heavy-hitter telemetry check in pipeline observability.',
      'Set `spark.sql.adaptive.enabled=true` and `spark.sql.adaptive.skewJoin.enabled=true` as cluster defaults.',
      'Alert whenever `MaxTaskTime / MedianTaskTime > 5x`.',
    ],
  },
  {
    id: 'scen_kafka_consumer_lag_storm',
    title: 'Kafka Consumer Lag Exploding During Peak Traffic After Poison-Pill Deploy',
    domain: 'Streaming & Kafka',
    severity: 'SEV-1',
    environment: 'Kafka 3.8 (24 Partitions) · Flink 1.20 Sink to Iceberg · 120k events/sec',
    problem:
      'Consumer lag surged from <500ms to 4.2M messages on partition 7 & 14 immediately after a mobile app release. Flink checkpoint durations jumped from 2s to >120s and began timing out.',
    telemetryClues: [
      'Lag is concentrated on specific partitions while 20 other partitions stay near 0 lag.',
      'Flink TaskManager logs show repeated `NumberFormatException: For input string: "nan"` followed by task restart loops.',
      'Iceberg sink commits are failing and rolling back the checkpoint window.',
    ],
    investigationSteps: [
      'Run `kafka-consumer-groups --describe` to see if lag is global (downstream sink slow) or partition-localized (poison pill / hot key).',
      'Inspect Flink TaskManager exception stack traces and identify the exact offset & schema version.',
      'Check Schema Registry compatibility mode on the topic (`BACKWARD` vs `NONE`).',
    ],
    rootCause:
      'A mobile client sent a malformed string `"nan"` in an integer field on an unvalidated producer topic (`NONE` schema check). The Flink deserializer threw an unhandled exception, triggering infinite restart loops and blocking checkpoint barriers.',
    solution:
      '1. Wrap deserialization in a `Try/Catch` side-output router that diverts malformed records (with raw bytes + error metadata) to a Dead-Letter Queue (DLQ) Kafka topic.\n2. Deploy hotfix and allow Flink to drain the 4.2M backlog by temporarily scaling parallelism up to 24 (matching partition count).\n3. Enforce `BACKWARD` Schema Registry validation in CI/CD.',
    tradeOffs:
      'DLQ routing preserves 99.99% stream availability instead of halting the pipeline, but requires an automated replay/reconciliation workflow for DLQ records so no business data is permanently forgotten.',
    preventionChecklist: [
      'Never deploy streaming consumers without a Dead-Letter Queue (DLQ) side output.',
      'Enforce Schema Registry compatibility checks at producer CI.',
      'Alert on Flink checkpoint duration > 50% of checkpoint interval.',
    ],
  },
  {
    id: 'scen_snowflake_credit_spike',
    title: 'Snowflake Monthly Compute Bill Spiked 3.4x Without Traffic Growth',
    domain: 'Cloud FinOps & Warehousing',
    severity: 'Cost Spike',
    environment: 'Snowflake Enterprise · X-Large BI Warehouse + dbt Hourly Models',
    problem:
      'Finance flagged a 340% month-over-month Snowflake credit jump despite stable user traffic and identical BI dashboard counts.',
    telemetryClues: [
      '`SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY` shows 68% of credits come from `dbt_hourly_metrics`.',
      'Query Profile shows `TableScan` scanning 100% of micro-partitions (14,200 / 14,200) on a 18TB `fct_events` table.',
      'Automatic Clustering history shows heavy background re-clustering churn.',
    ],
    investigationSteps: [
      'Query `WAREHOUSE_METERING_HISTORY` and `QUERY_HISTORY` grouped by `USER_NAME`, `WAREHOUSE_NAME`, and `QUERY_TAG`.',
      'Inspect `PARTITIONS_SCANNED / PARTITIONS_TOTAL` in `QUERY_HISTORY` for top credit-consuming queries.',
      'Check `MATERIALIZED_VIEW_REFRESH_HISTORY` and `AUTOMATIC_CLUSTERING_HISTORY` for hidden background serverless credits.',
    ],
    rootCause:
      '1. A recent PR changed a dbt incremental model filter from `event_ts >= DATEADD(hour, -6, ...)` to `DATE(event_ts) >= ...`, breaking micro-partition pruning (non-SARGable).\n2. Simultaneously, someone enabled Automatic Clustering on a high-churn UUID column instead of `(DATE_TRUNC(\'DAY\', event_ts), tenant_id)`.',
    solution:
      '1. Restore SARGable timestamp range predicates so micro-partition pruning drops scans from 14,200 partitions to ~12 partitions.\n2. Change clustering key to `(TO_DATE(event_ts), tenant_id)`.\n3. Downsize warehouse from XL to Medium with multi-cluster autoscaling (1–3) and 60s auto-suspend + Resource Monitors.',
    tradeOffs:
      'Multi-cluster Medium scales concurrency cleanly for BI without paying 8x/16x per query when single queries don\'t need XL memory; aggressive 60s auto-suspend saves idle burn while keeping 1-minute query cadence warm.',
    preventionChecklist: [
      'Tag all dbt & BI queries via `QUERY_TAG` for instant FinOps attribution.',
      'Set Resource Monitors at 75% / 90% / 100% monthly credit thresholds.',
      'Review `PARTITIONS_SCANNED / PARTITIONS_TOTAL` in SQL CI checks.',
    ],
  },
  {
    id: 'scen_iceberg_small_files',
    title: 'Trino Interactive Queries Timing Out on 10TB Apache Iceberg Table',
    domain: 'Storage & Lakehouse Formats',
    severity: 'SEV-2',
    environment: 'Apache Iceberg v2 on S3 · Flink 1-Minute Streaming Sink · Trino 450',
    problem:
      'Interactive Trino queries on `events_iceberg` that used to take 3 seconds now spend 95 seconds in `PLANNING` state before failing with S3 503 SlowDown errors.',
    telemetryClues: [
      'Inspecting `events_iceberg.files` metadata table reveals 1.4 million Parquet files averaging 720 KB each.',
      '`events_iceberg.snapshots` shows 45,000 retained snapshots over 30 days.',
      'S3 metrics show spikes in `ListObjects` and `GetObject` request rates.',
    ],
    investigationSteps: [
      'Query Iceberg system metadata tables: `$files`, `$manifests`, `$snapshots`.',
      'Check average file size per partition and total manifest file count.',
      'Verify whether `rewrite_data_files`, `rewrite_manifests`, and `expire_snapshots` maintenance jobs are running.',
    ],
    rootCause:
      'The Flink sink commits every 60 seconds across 64 parallel subtasks and 24 hourly partitions, generating ~1,500 tiny <1MB Parquet files per minute with zero background compaction.',
    solution:
      '1. Run `CALL system.rewrite_data_files(table => ..., options => map(\'target-file-size-bytes\', \'268435456\'))` (256MB target) partition by partition.\n2. Run `rewrite_manifests` and `expire_snapshots` (keeping last 7 days) + `remove_orphan_files`.\n3. Enable Flink Iceberg sink distribution mode (`hash` on partition key) and increase checkpoint interval to 3–5 minutes.',
    tradeOffs:
      'Increasing Flink checkpoint interval from 60s to 3m trades slightly higher end-to-end freshness latency for 3x fewer small files and dramatically lower S3 API costs.',
    preventionChecklist: [
      'Schedule automated Iceberg/Delta bin-packing compaction every 1–4 hours.',
      'Monitor average Parquet file size (alert if < 64MB on hot partitions).',
      'Configure S3 prefix-level rate optimization or Iceberg object-store hash prefixes.',
    ],
  },
  {
    id: 'scen_airflow_scheduler_deadlock',
    title: 'Airflow DAGs Stuck in Queued State & Scheduler Heartbeat Lagging',
    domain: 'Orchestration & DAGs',
    severity: 'SEV-2',
    environment: 'Apache Airflow 2.9 on KubernetesExecutor · Postgres Metadata DB · 450 DAGs',
    problem:
      'Morning SLA-critical DAGs remain `queued` for 40+ minutes while CPU on the Airflow Scheduler is pegged at 100%.',
    telemetryClues: [
      'DAG parsing logs show individual `.py` files taking 18 seconds per parse cycle.',
      'Postgres `pg_stat_activity` shows high lock contention on `task_instance` and exhausted connection pool.',
      'Several DAG files execute live `SnowflakeOperator` or AWS boto3 API calls at top-level module import time.',
    ],
    investigationSteps: [
      'Check `airflow dags report` to inspect per-file `duration` during DAG parsing.',
      'Inspect `pools` utilization and `max_active_tasks_per_dag` / `parallelism` config.',
      'Check metadata DB CPU & active connections (`PgBouncer`).',
    ],
    rootCause:
      'Engineers placed dynamic database queries (`SELECT table_name FROM ...`) at the top level of DAG Python files outside `@task` functions. The scheduler executes top-level Python every 30 seconds across 450 files, starving CPU and DB connections.',
    solution:
      '1. Move all external API/DB lookups inside runtime TaskFlow `@task` callables or use Airflow Variables/Datasets cached externally.\n2. Add a CI/CD pytest check asserting DAG parse time < 0.5s with zero network calls.\n3. Front Postgres with PgBouncer and tune `min_file_process_interval`.',
    tradeOffs:
      'Dynamic task mapping (`expand()`) evaluated at runtime keeps DAG parsing instantaneous while still allowing dynamic fan-out.',
    preventionChecklist: [
      'Enforce DAG Bag import tests (`parse_time < 1s`) in GitHub Actions.',
      'Use PgBouncer in front of Airflow Postgres metadata DB.',
      'Separate critical SLA tasks into dedicated Airflow Pools.',
    ],
  },
  {
    id: 'scen_late_arriving_cdc',
    title: 'Silently Stale Gold Revenue Mart Due to Out-of-Order Debezium CDC Events',
    domain: 'Incremental Ingestion & CDC',
    severity: 'SEV-1',
    environment: 'Postgres -> Debezium -> Kafka -> Iceberg Bronze -> dbt Silver/Gold',
    problem:
      'Finance reported yesterday\'s settled revenue was $1.4M lower than Stripe payouts, even though all pipelines reported GREEN.',
    telemetryClues: [
      'Kafka partition offsets rebalanced during a network blip; some `UPDATE` events from 23:55 UTC landed in Bronze partition `dt=next_day` at 00:08 UTC.',
      'The dbt incremental Silver job filtered `WHERE ingestion_date = current_date` and only updated `dt = current_date` partitions, missing yesterday\'s event-date corrections.',
      'Delete tombstones (`op = "d"`) were filtered out before deduplication, causing deleted orders to reappear.',
    ],
    investigationSteps: [
      'Compare Bronze `lsn_seq` / `source.ts_ms` vs `kafka_ingestion_ts` to quantify late-arrival skew.',
      'Audit dbt incremental SQL `is_incremental()` predicate and `unique_key` merge logic.',
      'Check whether `op = "d"` tombstones are retained through deduplication before soft/hard delete.',
    ],
    rootCause:
      'Partitioning/filtering incrementally by *ingestion timestamp* without a lookback window on *event timestamp* missed late cross-midnight events, and filtering deletes pre-window resurrected older rows.',
    solution:
      '1. Filter incremental runs using a lookback window (`WHERE ingestion_ts >= max_ingested - INTERVAL \'6 hours\'`), deduplicate by `(id ORDER BY lsn_seq DESC)` keeping tombstones, then execute `MERGE INTO` on `id` handling `WHEN MATCHED AND src.op = \'D\' THEN DELETE`.\n2. Add automated daily source-vs-Gold reconciliation assertions.',
    tradeOffs:
      'A 6–24h lookback window increases incremental merge scan cost slightly (~5–10%) in exchange for mathematical correctness across midnight boundaries and broker retries.',
    preventionChecklist: [
      'Always deduplicate CDC streams *before* filtering `op != "D"`.',
      'Partition Silver/Gold by `event_date` while ingesting incrementally on `ingestion_ts` with lookback.',
      'Run automated source-to-Gold reconciliation checks before publishing.',
    ],
  },
];
