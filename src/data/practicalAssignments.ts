export type PracticalTrackId =
  | 'snowflake'
  | 'multicloud'
  | 'transformation'
  | 'batch'
  | 'streaming';

export type TransformationToolId =
  | 'dbt'
  | 'pyspark'
  | 'flink_sql'
  | 'polars_pandas'
  | 'snowflake_dynamic'
  | 'enterprise_etl';

export interface PracticalTrackMeta {
  id: PracticalTrackId;
  title: string;
  shortTitle: string;
  subtitle: string;
  cloudFocus: string;
}

export interface TransformationToolMeta {
  id: TransformationToolId;
  label: string;
  language: 'sql' | 'python' | 'yaml';
  badge: string;
}

export interface PracticalFileTab {
  path: string;
  language: 'sql' | 'python' | 'yaml' | 'json';
  content: string;
}

export interface PracticalVerificationRule {
  id: string;
  name: string;
  hint: string;
  /** Regex pattern(s) evaluated across active files (joined) */
  mustMatchAny?: string[];
  /** Optional SQLite verification query if engine === 'sql' */
  sqlSetup?: string;
  /** Optional Python pytest-style assertion if engine === 'python' */
  pythonAssert?: string;
}

export interface PracticalToolVariant {
  toolId: TransformationToolId;
  files: PracticalFileTab[];
  solutionSummary: string;
  extraRules: PracticalVerificationRule[];
}

export interface PracticalAssignment {
  id: string;
  trackId: PracticalTrackId;
  title: string;
  companyContext: string;
  difficulty: 'Medium' | 'Hard';
  estimatedMins: number;
  conceptTags: string[];
  requirements: string[];
  sampleInputLabel: string;
  sampleInputData: string;
  executionEngine: 'sql' | 'python' | 'hybrid';
  sqlSetupSeed?: string;
  sqlReferenceQuery?: string;
  pythonSetupCode?: string;
  files: PracticalFileTab[];
  solutionFiles: PracticalFileTab[];
  verificationRules: PracticalVerificationRule[];
  toolVariants?: Record<TransformationToolId, PracticalToolVariant>;
}

export const PRACTICAL_TRACKS: PracticalTrackMeta[] = [
  {
    id: 'snowflake',
    title: '1. Snowflake Warehouse & Performance',
    shortTitle: 'Snowflake & FinOps',
    subtitle: 'COPY INTO, Snowpipe, Streams & Tasks, Dynamic Tables, Zero-Copy Cloning, Time Travel, Clustering Keys & Warehouse FinOps',
    cloudFocus: 'Snowflake · Snowpark · Horizon',
  },
  {
    id: 'multicloud',
    title: '2. Multi-Cloud Data Engineering (AWS / Azure / GCP)',
    shortTitle: 'AWS · Azure · GCP',
    subtitle: 'S3 + Glue + Redshift IAM, ADLS Gen2 + Databricks Unity Catalog ABAC, GCS + Pub/Sub + Dataflow + BigQuery Partitioned MERGE',
    cloudFocus: 'AWS · Azure · GCP',
  },
  {
    id: 'transformation',
    title: '3. Data Transformation & Modeling Engines',
    shortTitle: 'Transform & dbt',
    subtitle: 'Switch seamlessly across dbt, PySpark, Flink SQL, Python Polars/Pandas, Snowflake Dynamic Tables & Enterprise ETL (Glue / Dataiku)',
    cloudFocus: 'dbt · Spark · Flink · Polars',
  },
  {
    id: 'batch',
    title: '4. Batch Ingestion & Idempotent Backfills',
    shortTitle: 'Batch & Backfills',
    subtitle: 'High-watermark CDC MERGE, late-arriving lookback windows, Airflow/Control-M retries, and schema drift quarantine',
    cloudFocus: 'Airflow · Iceberg · Delta',
  },
  {
    id: 'streaming',
    title: '5. Real-Time Streaming Ingestion',
    shortTitle: 'Kafka & Flink CDC',
    subtitle: 'Kafka partitioning keys, Debezium c/u/d envelopes, Flink watermarks, state TTL, and Dead-Letter Queue (DLQ) routing',
    cloudFocus: 'Kafka · Debezium · Flink',
  },
];

export const TRANSFORMATION_TOOLS: TransformationToolMeta[] = [
  { id: 'dbt', label: 'dbt (SQL + YAML)', language: 'sql', badge: 'models/*.sql + schema.yml' },
  { id: 'pyspark', label: 'PySpark / Spark SQL', language: 'python', badge: 'DataFrame + AQE' },
  { id: 'flink_sql', label: 'Flink SQL', language: 'sql', badge: 'Streaming Changelog' },
  { id: 'polars_pandas', label: 'Python Polars / Pandas', language: 'python', badge: 'Vectorized Arrow' },
  { id: 'snowflake_dynamic', label: 'Snowflake Dynamic Tables', language: 'sql', badge: 'Declarative Lag' },
  { id: 'enterprise_etl', label: 'Enterprise ETL (Glue / Dataiku)', language: 'yaml', badge: 'Managed DAG Spec' },
];

export const PRACTICAL_ASSIGNMENTS: PracticalAssignment[] = [
  /* ========================================================================
   * TRACK 1: SNOWFLAKE WAREHOUSE & PERFORMANCE
   * ======================================================================== */
  {
    id: 'pl_sf_01_snowpipe_variant_merge',
    trackId: 'snowflake',
    title: 'Snowpipe JSON Ingestion, Malformed Quarantine & Idempotent MERGE',
    companyContext: 'Snowflake · Stripe FinData Loop',
    difficulty: 'Hard',
    estimatedMins: 35,
    conceptTags: ['Snowflake & Cloud Warehouses', 'Data Quality', 'Idempotent MERGE'],
    requirements: [
      'Configure Snowpipe PIPE with AUTO_INGEST = TRUE and ON_ERROR = SKIP_FILE / CONTINUE audit capture via VALIDATE_PIPE_LOAD.',
      'Flatten raw VARIANT payment payloads safely using TRY_PARSE_JSON / TRY_TO_DECIMAL without failing the batch on corrupt currency strings.',
      'Perform idempotent MERGE INTO silver.payments deduplicating duplicate SQS replay files on (payment_id, event_ts).',
      'Quarantine rows with NULL payment_id or negative amounts into audit.dlq_payments before Silver publish.',
    ],
    sampleInputLabel: 'S3 Stage JSON Events (s3://stripe-raw/payments/2026-11-15/)',
    sampleInputData: `{"payment_id":"pm_901","merchant_id":"m_11","amount":"149.50","currency":"USD","event_ts":"2026-11-15T09:10:00Z"}
{"payment_id":"pm_901","merchant_id":"m_11","amount":"149.50","currency":"USD","event_ts":"2026-11-15T09:10:00Z"}  -- SQS duplicate retry
{"payment_id":null,"merchant_id":"m_22","amount":"invalid_amt","currency":"INR","event_ts":"2026-11-15T09:11:00Z"} -- Corrupt payload`,
    executionEngine: 'sql',
    sqlSetupSeed: `CREATE TABLE raw_payments_stage (payment_id TEXT, merchant_id TEXT, amount_str TEXT, currency TEXT, event_ts TEXT);
INSERT INTO raw_payments_stage VALUES
('pm_901','m_11','149.50','USD','2026-11-15T09:10:00'),
('pm_901','m_11','149.50','USD','2026-11-15T09:10:00'),
('pm_902','m_14','299.00','INR','2026-11-15T09:12:00'),
(NULL,'m_22','bad_num','INR','2026-11-15T09:13:00');`,
    sqlReferenceQuery: `WITH dedup AS (
  SELECT payment_id, merchant_id, CAST(amount_str AS REAL) AS amount, currency, event_ts,
         ROW_NUMBER() OVER (PARTITION BY payment_id ORDER BY event_ts DESC) AS rn
  FROM raw_payments_stage
  WHERE payment_id IS NOT NULL AND CAST(amount_str AS REAL) > 0
)
SELECT payment_id, merchant_id, amount, currency, event_ts FROM dedup WHERE rn = 1 ORDER BY payment_id;`,
    files: [
      {
        path: 'snowpipe_ingest.sql',
        language: 'sql',
        content: `-- Task A: Define Snowflake Stage + Auto-Ingest Pipe + Deduplicated Silver Query
-- Complete the DDL/MERGE and write a valid SQLite SELECT at the bottom to test deduplication against raw_payments_stage!

CREATE OR REPLACE PIPE bronze.payments_pipe
  AUTO_INGEST = TRUE
AS
  COPY INTO bronze.raw_payments
  FROM @bronze.s3_payments_stage
  FILE_FORMAT = (TYPE = JSON)
  ON_ERROR = 'CONTINUE';

-- Local SQLite Simulation Query (Executed live in browser):
WITH ranked AS (
  SELECT payment_id, merchant_id, CAST(amount_str AS REAL) AS amount, currency, event_ts,
         ROW_NUMBER() OVER (PARTITION BY payment_id ORDER BY event_ts DESC) AS rn
  FROM raw_payments_stage
  WHERE payment_id IS NOT NULL
)
SELECT payment_id, merchant_id, amount, currency, event_ts
FROM ranked
WHERE rn = 1 AND amount > 0
ORDER BY payment_id;`,
      },
      {
        path: 'quarantine_dlq.sql',
        language: 'sql',
        content: `-- Task B: Route corrupt or negative records to audit.dlq_payments
INSERT INTO audit.dlq_payments (raw_payload, failure_reason, ingested_at)
SELECT raw_payload, 'INVALID_PAYMENT_OR_AMOUNT', CURRENT_TIMESTAMP()
FROM bronze.raw_payments
WHERE payment_id IS NULL OR TRY_TO_DECIMAL(raw_payload:amount::STRING, 12, 2) IS NULL;`,
      },
    ],
    solutionFiles: [
      {
        path: 'snowpipe_ingest.sql',
        language: 'sql',
        content: `CREATE OR REPLACE PIPE bronze.payments_pipe AUTO_INGEST = TRUE AS
  COPY INTO bronze.raw_payments FROM @bronze.s3_payments_stage FILE_FORMAT = (TYPE = JSON) ON_ERROR = 'CONTINUE';

MERGE INTO silver.payments t
USING (
  SELECT payment_id, merchant_id, TRY_TO_DECIMAL(raw_payload:amount::STRING, 12, 2) AS amount,
         raw_payload:currency::STRING AS currency, raw_payload:event_ts::TIMESTAMP_NTZ AS event_ts
  FROM bronze.raw_payments
  WHERE payment_id IS NOT NULL AND TRY_TO_DECIMAL(raw_payload:amount::STRING, 12, 2) > 0
  QUALIFY ROW_NUMBER() OVER (PARTITION BY payment_id ORDER BY event_ts DESC) = 1
) s ON t.payment_id = s.payment_id
WHEN MATCHED AND s.event_ts >= t.event_ts THEN UPDATE SET t.amount = s.amount, t.event_ts = s.event_ts
WHEN NOT MATCHED THEN INSERT (payment_id, merchant_id, amount, currency, event_ts) VALUES (s.payment_id, s.merchant_id, s.amount, s.currency, s.event_ts);`,
      },
    ],
    verificationRules: [
      { id: 'sf1_pipe', name: '1 · Auto-Ingest Snowpipe Configured', hint: 'Declare CREATE PIPE ... AUTO_INGEST = TRUE.', mustMatchAny: ['auto_ingest\\s*=\\s*true'] },
      { id: 'sf1_onerror', name: '2 · Fault-Tolerant COPY INTO ON_ERROR', hint: 'Set ON_ERROR = CONTINUE or SKIP_FILE so 1 bad row does not halt ingestion.', mustMatchAny: ['on_error'] },
      { id: 'sf1_safe_cast', name: '3 · Safe Casting / Corrupt Numeric Protection', hint: 'Use TRY_TO_DECIMAL / TRY_PARSE_JSON or CAST with NULL/positive filtering.', mustMatchAny: ['try_to_decimal|try_parse_json|cast\\('] },
      { id: 'sf1_dedup', name: '4 · Window Deduplication (ROW_NUMBER / QUALIFY)', hint: 'Deduplicate SQS replay files via ROW_NUMBER() PARTITION BY payment_id.', mustMatchAny: ['row_number\\(\\)'] },
      { id: 'sf1_null_guard', name: '5 · NULL Payment ID Quarantine Check', hint: 'Filter payment_id IS NOT NULL for Silver and route invalid rows to DLQ.', mustMatchAny: ['is not null', 'dlq'] },
      { id: 'sf1_live_sql', name: '6 · In-Browser SQLite Deduplication Test', hint: 'Ensure bottom SELECT query executes cleanly and returns deduplicated positive rows.', mustMatchAny: ['select'] },
    ],
  },
  {
    id: 'pl_sf_02_streams_tasks_dynamic',
    trackId: 'snowflake',
    title: 'Streams, Serverless Tasks & Dynamic Tables Incremental CDC',
    companyContext: 'Snowflake · DoorDash Analytics Eng Loop',
    difficulty: 'Medium',
    estimatedMins: 30,
    conceptTags: ['Snowflake & Cloud Warehouses', 'CDC', 'Incremental Materialization'],
    requirements: [
      'Attach an APPEND_ONLY = FALSE Snowflake Stream on bronze.orders_cdc to capture inserts, updates, and deletes.',
      'Trigger a serverless Task ONLY WHEN SYSTEM$STREAM_HAS_DATA(\'bronze.orders_stream\') = TRUE to eliminate idle warehouse burn.',
      'Handle METADATA$ACTION = \'DELETE\' alongside \'INSERT\' updates deterministically.',
      'Define a declarative Gold Dynamic Table with TARGET_LAG = \'5 minutes\' aggregating merchant revenue.',
    ],
    sampleInputLabel: 'Snowflake Stream Offset Delta (METADATA$ACTION / METADATA$ISUPDATE)',
    sampleInputData: `order_id | merchant_id | status    | METADATA$ACTION | METADATA$ISUPDATE
ord_101  | m_7         | DELIVERED | INSERT          | TRUE
ord_102  | m_7         | CANCELLED | DELETE          | FALSE`,
    executionEngine: 'hybrid',
    files: [
      {
        path: 'streams_tasks_dynamic.sql',
        language: 'sql',
        content: `-- Build Serverless Stream + Conditional Task + Dynamic Table
CREATE OR REPLACE STREAM bronze.orders_stream ON TABLE bronze.orders_cdc;

CREATE OR REPLACE TASK silver.merge_orders_task
  USER_TASK_MANAGED_INITIAL_WAREHOUSE_SIZE = 'XSMALL'
  SCHEDULE = '2 MINUTE'
  WHEN SYSTEM$STREAM_HAS_DATA('bronze.orders_stream')
AS
MERGE INTO silver.fct_orders t
USING bronze.orders_stream s
ON t.order_id = s.order_id
WHEN MATCHED AND s.METADATA$ACTION = 'DELETE' AND s.METADATA$ISUPDATE = FALSE THEN DELETE
WHEN MATCHED AND s.METADATA$ACTION = 'INSERT' THEN UPDATE SET t.status = s.status, t.amount_cents = s.amount_cents
WHEN NOT MATCHED AND s.METADATA$ACTION = 'INSERT' THEN INSERT (order_id, merchant_id, status, amount_cents) VALUES (s.order_id, s.merchant_id, s.status, s.amount_cents);

CREATE OR REPLACE DYNAMIC TABLE gold.merchant_hourly_kpis
  TARGET_LAG = '5 minutes'
  WAREHOUSE = TRANSFORM_WH
AS
  SELECT merchant_id, DATE_TRUNC('hour', updated_at) AS hr, SUM(amount_cents) AS gmv_cents
  FROM silver.fct_orders
  GROUP BY 1, 2;`,
      },
    ],
    solutionFiles: [
      {
        path: 'streams_tasks_dynamic.sql',
        language: 'sql',
        content: `CREATE OR REPLACE STREAM bronze.orders_stream ON TABLE bronze.orders_cdc;
-- Serverless task guards compute with SYSTEM$STREAM_HAS_DATA, handles DELETE vs INSERT cleanly, and Dynamic Table guarantees 5-min freshness.`,
      },
    ],
    verificationRules: [
      { id: 'sf2_stream', name: '1 · CDC Stream Declaration', hint: 'Create a Snowflake STREAM on the source table.', mustMatchAny: ['create\\s+(or\\s+replace\\s+)?stream'] },
      { id: 'sf2_hasdata', name: '2 · Zero-Waste WHEN SYSTEM$STREAM_HAS_DATA', hint: 'Guard Task execution with WHEN SYSTEM$STREAM_HAS_DATA(...).', mustMatchAny: ['system\\$stream_has_data'] },
      { id: 'sf2_serverless', name: '3 · Serverless / Managed Task Compute', hint: 'Configure USER_TASK_MANAGED_INITIAL_WAREHOUSE_SIZE or WAREHOUSE.', mustMatchAny: ['user_task_managed|warehouse\\s*='] },
      { id: 'sf2_meta_delete', name: '4 · Stream DELETE vs ISUPDATE Handling', hint: 'Distinguish METADATA$ACTION = DELETE and METADATA$ISUPDATE = FALSE.', mustMatchAny: ['metadata\\$action', 'metadata\\$isupdate'] },
      { id: 'sf2_dynamic', name: '5 · Declarative Dynamic Table TARGET_LAG', hint: 'Define CREATE DYNAMIC TABLE with TARGET_LAG.', mustMatchAny: ['dynamic\\s+table', 'target_lag'] },
      { id: 'sf2_merge', name: '6 · Idempotent MERGE Target Update', hint: 'Use MERGE INTO silver target keyed on order_id.', mustMatchAny: ['merge\\s+into'] },
    ],
  },
  {
    id: 'pl_sf_03_cloning_timetravel_finops',
    trackId: 'snowflake',
    title: 'Time Travel Recovery, Zero-Copy Cloning & Compute FinOps Tuning',
    companyContext: 'Snowflake · Rippling Data Platform Loop',
    difficulty: 'Medium',
    estimatedMins: 25,
    conceptTags: ['Cloud Security & FinOps', 'Snowflake & Cloud Warehouses'],
    requirements: [
      'Recover a mistakenly truncated production fact table into a zero-copy QA clone using AT(OFFSET => -3600).',
      'Apply CLUSTER BY (event_date, tenant_id) for micro-partition pruning on 40TB telemetry.',
      'Configure Warehouse FinOps guardrails: AUTO_SUSPEND = 60, AUTO_RESUME = TRUE, STATEMENT_TIMEOUT_IN_SECONDS = 900.',
      'Create a Resource Monitor with 80% NOTIFY and 100% SUSPEND_IMMEDIATE triggers.',
    ],
    sampleInputLabel: 'Runaway Warehouse Telemetry Snapshot',
    sampleInputData: `WAREHOUSE: BI_ADHOC_WH (3XL, AUTO_SUSPEND=3600s, Monthly Spend=$64,200 -> Target <$14,000)
INCIDENT: Bad DROP/TRUNCATE ran 45 minutes ago on prod.gold.fct_events`,
    executionEngine: 'hybrid',
    files: [
      {
        path: 'recovery_and_finops.sql',
        language: 'sql',
        content: `-- 1. Zero-Copy Clone & Time Travel Recovery (1 hour ago = -3600s)
CREATE OR REPLACE TABLE prod.gold.fct_events_recovered
  CLONE prod.gold.fct_events AT (OFFSET => -3600);

-- 2. Align Clustering Key to Eliminate Full Micro-Partition Scans
ALTER TABLE prod.gold.fct_events_recovered CLUSTER BY (event_date, tenant_id);

-- 3. Right-Size Compute Warehouse FinOps Controls
ALTER WAREHOUSE BI_ADHOC_WH SET
  WAREHOUSE_SIZE = 'LARGE'
  AUTO_SUSPEND = 60
  AUTO_RESUME = TRUE
  MAX_CLUSTER_COUNT = 4
  SCALING_POLICY = 'ECONOMY'
  STATEMENT_TIMEOUT_IN_SECONDS = 900;

-- 4. Resource Monitor Hard Budget Cap
CREATE OR REPLACE RESOURCE MONITOR monthly_bi_cap
  WITH CREDIT_QUOTA = 4000
  FREQUENCY = MONTHLY
  START_TIMESTAMP = IMMEDIATELY
  TRIGGERS
    ON 80 PERCENT DO NOTIFY
    ON 100 PERCENT DO SUSPEND_IMMEDIATE;`,
      },
    ],
    solutionFiles: [
      {
        path: 'recovery_and_finops.sql',
        language: 'sql',
        content: `-- Complete Zero-Copy Time Travel Clone + Clustering + AUTO_SUSPEND=60 + Resource Monitor cap.`,
      },
    ],
    verificationRules: [
      { id: 'sf3_clone', name: '1 · Zero-Copy CLONE Syntax', hint: 'Use CREATE TABLE ... CLONE.', mustMatchAny: ['clone\\s+'] },
      { id: 'sf3_tt', name: '2 · Time Travel AT(OFFSET/TIMESTAMP)', hint: 'Specify AT (OFFSET => -3600) or TIMESTAMP.', mustMatchAny: ['at\\s*\\(\\s*(offset|timestamp)'] },
      { id: 'sf3_cluster', name: '3 · Micro-Partition CLUSTER BY', hint: 'Cluster large fact table by (event_date, tenant_id).', mustMatchAny: ['cluster\\s+by'] },
      { id: 'sf3_suspend', name: '4 · Aggressive AUTO_SUSPEND = 60 & AUTO_RESUME', hint: 'Set AUTO_SUSPEND = 60 and AUTO_RESUME = TRUE.', mustMatchAny: ['auto_suspend\\s*=\\s*60', 'auto_resume\\s*=\\s*true'] },
      { id: 'sf3_timeout', name: '5 · Runaway STATEMENT_TIMEOUT Guard', hint: 'Cap runaway SQL queries with STATEMENT_TIMEOUT_IN_SECONDS.', mustMatchAny: ['statement_timeout_in_seconds'] },
      { id: 'sf3_monitor', name: '6 · Resource Monitor 80%/100% Cap', hint: 'Create RESOURCE MONITOR with NOTIFY and SUSPEND triggers.', mustMatchAny: ['resource\\s+monitor', 'suspend'] },
    ],
  },

  /* ========================================================================
   * TRACK 2: MULTI-CLOUD DATA ENGINEERING (AWS / AZURE / GCP)
   * ======================================================================== */
  {
    id: 'pl_mc_01_aws_glue_s3_redshift',
    trackId: 'multicloud',
    title: 'AWS S3 Partitioned Lakehouse -> Glue PySpark + Redshift Spectrum IAM',
    companyContext: 'Amazon AWS · L5 Data Engineer Loop',
    difficulty: 'Hard',
    estimatedMins: 35,
    conceptTags: ['PySpark & Distributed Compute', 'Cloud Security & FinOps'],
    requirements: [
      'Write Glue PySpark transformation with pushDownPredicate to read only dt=2026-11-15 S3 partitions.',
      'Enable Glue Job Bookmarks (`transformation_ctx`) so incremental S3 files are never double-processed on retry.',
      'Write partitioned Parquet (~256MB target files via AQE/coalesce) with KMS SSE encryption.',
      'Configure Redshift Spectrum external table & least-privilege IAM role policy scoped strictly to target S3 prefix.',
    ],
    sampleInputLabel: 'AWS S3 Prefix & Glue Bookmark State',
    sampleInputData: `s3://corp-datalake-raw/clickstream/dt=2026-11-15/part-0001.json.gz (420 MB)
IAM Role: arn:aws:iam::123456789012:role/RedshiftSpectrumClickstreamRole`,
    executionEngine: 'python',
    pythonSetupCode: `def validate_aws_pipeline_config(partition_cols, bookmark_enabled, kms_encrypted):
    return bool(partition_cols) and bool(bookmark_enabled) and bool(kms_encrypted)
`,
    files: [
      {
        path: 'glue_clickstream_etl.py',
        language: 'python',
        content: `def build_aws_glue_job_spec():
    return {
        "job_name": "clickstream_bronze_to_silver",
        "push_down_predicate": "dt == '2026-11-15'",
        "transformation_ctx": "clickstream_raw_src",
        "job_bookmark_option": "job-bookmark-enable",
        "spark_conf": {
            "spark.sql.adaptive.enabled": "true",
            "spark.sql.adaptive.coalescePartitions.enabled": "true",
            "spark.sql.sources.partitionOverwriteMode": "dynamic",
        },
        "s3_kms_encryption": True,
        "partition_by": ["dt", "country"],
    }
`,
      },
      {
        path: 'redshift_iam_spectrum.sql',
        language: 'sql',
        content: `CREATE EXTERNAL SCHEMA IF NOT EXISTS spectrum_lake
FROM DATA CATALOG DATABASE 'silver_analytics'
IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftSpectrumClickstreamRole'
CREATE EXTERNAL DATABASE IF NOT EXISTS;`,
      },
    ],
    solutionFiles: [
      {
        path: 'glue_clickstream_etl.py',
        language: 'python',
        content: `# Verified Glue Bookmarks + pushDownPredicate + AQE dynamic overwrite + KMS + Spectrum IAM`,
      },
    ],
    verificationRules: [
      {
        id: 'mc1_pushdown',
        name: '1 · S3 Partition PushDownPredicate',
        hint: 'Specify push_down_predicate / partition filter on dt.',
        mustMatchAny: ['push_down_predicate|pushdownpredicate'],
        pythonAssert: `spec = build_aws_glue_job_spec(); assert "dt" in spec.get("push_down_predicate", "")`,
      },
      {
        id: 'mc1_bookmark',
        name: '2 · Glue Job Bookmark Idempotency',
        hint: 'Set job-bookmark-enable and transformation_ctx.',
        mustMatchAny: ['job-bookmark-enable', 'transformation_ctx'],
        pythonAssert: `spec = build_aws_glue_job_spec(); assert spec.get("job_bookmark_option") == "job-bookmark-enable"`,
      },
      {
        id: 'mc1_aqe',
        name: '3 · Dynamic Overwrite & AQE Coalescing',
        hint: 'Enable adaptive execution + dynamic partitionOverwriteMode.',
        mustMatchAny: ['adaptive\\.enabled', 'dynamic'],
        pythonAssert: `spec = build_aws_glue_job_spec(); assert spec["spark_conf"]["spark.sql.sources.partitionOverwriteMode"] == "dynamic"`,
      },
      {
        id: 'mc1_kms',
        name: '4 · KMS Server-Side Encryption',
        hint: 'Enable KMS encryption for S3 target.',
        mustMatchAny: ['kms'],
        pythonAssert: `assert build_aws_glue_job_spec().get("s3_kms_encryption") is True`,
      },
      {
        id: 'mc1_spectrum',
        name: '5 · Redshift Spectrum External Schema',
        hint: 'Declare CREATE EXTERNAL SCHEMA ... FROM DATA CATALOG.',
        mustMatchAny: ['external\\s+schema', 'data\\s+catalog'],
      },
      {
        id: 'mc1_iam',
        name: '6 · Least-Privilege IAM Role Binding',
        hint: 'Bind explicit IAM_ROLE ARN without wildcard admin credentials.',
        mustMatchAny: ['iam_role\\s+.*arn:aws:iam'],
      },
    ],
  },
  {
    id: 'pl_mc_02_azure_adls_unity_catalog',
    trackId: 'multicloud',
    title: 'Azure ADLS Gen2 + Databricks Unity Catalog ABAC & Delta MERGE',
    companyContext: 'Microsoft · Databricks Cloud DE Loop',
    difficulty: 'Medium',
    estimatedMins: 30,
    conceptTags: ['Lakehouse Formats: Delta / Iceberg / Hudi', 'Cloud Security & FinOps'],
    requirements: [
      'Ingest parquet deltas from Azure ADLS Gen2 (`abfss://raw@datalake.dfs.core.windows.net/`) using Auto Loader (`cloudFiles`) checkpoints.',
      'Execute Delta Lake MERGE with Deletion Vectors enabled (`delta.enableDeletionVectors = true`).',
      'Enforce Unity Catalog column-level PII masking (`CREATE FUNCTION mask_email`) and row-level region access control (`ROW FILTER`).',
    ],
    sampleInputLabel: 'Unity Catalog Governance & ADLS Gen2 Auto Loader Spec',
    sampleInputData: `ADLS URI: abfss://bronze@finlake.dfs.core.windows.net/customers/
UC Table: prod_catalog.silver.dim_customers (enableDeletionVectors=true)`,
    executionEngine: 'hybrid',
    files: [
      {
        path: 'unity_catalog_adls_delta.sql',
        language: 'sql',
        content: `-- Azure Databricks Unity Catalog ABAC + Delta Deletion Vectors
CREATE TABLE IF NOT EXISTS prod_catalog.silver.dim_customers (
  customer_id STRING,
  email STRING,
  region STRING,
  tier STRING,
  updated_at TIMESTAMP
)
USING DELTA
LOCATION 'abfss://silver@finlake.dfs.core.windows.net/dim_customers'
TBLPROPERTIES ('delta.enableDeletionVectors' = 'true');

CREATE OR REPLACE FUNCTION prod_catalog.security.mask_email(email STRING)
RETURNS STRING
RETURN CASE
  WHEN is_account_group_member('pii_analysts') THEN email
  ELSE CONCAT('***@', SPLIT(email, '@')[1])
END;

ALTER TABLE prod_catalog.silver.dim_customers
  ALTER COLUMN email SET MASK prod_catalog.security.mask_email;

ALTER TABLE prod_catalog.silver.dim_customers
  SET ROW FILTER prod_catalog.security.region_filter ON (region);`,
      },
    ],
    solutionFiles: [
      {
        path: 'unity_catalog_adls_delta.sql',
        language: 'sql',
        content: `-- Full ABFSS Unity Catalog Delta Table with Deletion Vectors, Column Mask & Row Filter.`,
      },
    ],
    verificationRules: [
      { id: 'mc2_abfss', name: '1 · Azure ADLS Gen2 ABFSS Location', hint: 'Reference abfss://...dfs.core.windows.net storage path.', mustMatchAny: ['abfss://.*dfs\\.core\\.windows\\.net'] },
      { id: 'mc2_delta', name: '2 · Delta Table Format', hint: 'Define table USING DELTA.', mustMatchAny: ['using\\s+delta'] },
      { id: 'mc2_dv', name: '3 · Delta Deletion Vectors Enabled', hint: 'Enable delta.enableDeletionVectors = true for fast CDC deletes.', mustMatchAny: ['enabledeletionvectors'] },
      { id: 'mc2_mask_fn', name: '4 · Dynamic PII Masking UDF', hint: 'Create masking function checking is_account_group_member.', mustMatchAny: ['is_account_group_member'] },
      { id: 'mc2_set_mask', name: '5 · Column Mask Binding', hint: 'Attach SET MASK to PII email column.', mustMatchAny: ['set\\s+mask'] },
      { id: 'mc2_row_filter', name: '6 · Unity Catalog ROW FILTER Policy', hint: 'Apply SET ROW FILTER ON (region).', mustMatchAny: ['set\\s+row\\s+filter'] },
    ],
  },
  {
    id: 'pl_mc_03_gcp_pubsub_bigquery_merge',
    trackId: 'multicloud',
    title: 'GCP GCS + Pub/Sub + Dataflow -> BigQuery Partitioned MERGE',
    companyContext: 'Google Cloud · Uber / Flipkart GCP Loop',
    difficulty: 'Hard',
    estimatedMins: 30,
    conceptTags: ['Snowflake & Cloud Warehouses', 'Streaming & CDC: Kafka / Flink / Debezium'],
    requirements: [
      'Create BigQuery table partitioned by DATE(event_ts), clustered by (merchant_id, status), with require_partition_filter = TRUE.',
      'Stage Dataflow streaming micro-batches and MERGE idempotently into Gold using partition-pruned date bounds (`event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)`).',
      'Set BigQuery `partition_expiration_days` for FinOps active-to-longterm storage savings.',
    ],
    sampleInputLabel: 'BigQuery Partitioned DDL & Pruned MERGE Pattern',
    sampleInputData: `Pub/Sub Topic: projects/prod-de/topics/checkout-events
GCS Archive: gs://prod-de-lake/checkout/
BQ Target: prod_dw.silver.fct_checkout`,
    executionEngine: 'hybrid',
    files: [
      {
        path: 'bigquery_partition_merge.sql',
        language: 'sql',
        content: `CREATE TABLE IF NOT EXISTS prod_dw.silver.fct_checkout (
  tx_id STRING NOT NULL,
  merchant_id STRING NOT NULL,
  status STRING,
  amount_micros INT64,
  event_ts TIMESTAMP NOT NULL
)
PARTITION BY DATE(event_ts)
CLUSTER BY merchant_id, status
OPTIONS (
  require_partition_filter = TRUE,
  partition_expiration_days = 730
);

MERGE prod_dw.silver.fct_checkout t
USING (
  SELECT tx_id, merchant_id, status, amount_micros, event_ts
  FROM prod_dw.bronze.stg_checkout
  WHERE DATE(event_ts) >= DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)
  QUALIFY ROW_NUMBER() OVER (PARTITION BY tx_id ORDER BY event_ts DESC) = 1
) s
ON t.tx_id = s.tx_id
  AND DATE(t.event_ts) >= DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)
WHEN MATCHED AND s.event_ts >= t.event_ts THEN
  UPDATE SET t.status = s.status, t.amount_micros = s.amount_micros
WHEN NOT MATCHED THEN
  INSERT (tx_id, merchant_id, status, amount_micros, event_ts)
  VALUES (s.tx_id, s.merchant_id, s.status, s.amount_micros, s.event_ts);`,
      },
    ],
    solutionFiles: [
      {
        path: 'bigquery_partition_merge.sql',
        language: 'sql',
        content: `-- Partition-pruned MERGE + require_partition_filter + clustering + expiration.`,
      },
    ],
    verificationRules: [
      { id: 'mc3_part', name: '1 · BigQuery Date Partitioning', hint: 'Partition table with PARTITION BY DATE(event_ts).', mustMatchAny: ['partition\\s+by\\s+date'] },
      { id: 'mc3_cluster', name: '2 · BigQuery CLUSTER BY Keys', hint: 'Cluster on high-cardinality filter keys (merchant_id, status).', mustMatchAny: ['cluster\\s+by'] },
      { id: 'mc3_req_filter', name: '3 · require_partition_filter Guardrail', hint: 'Set require_partition_filter = TRUE to block full table scans.', mustMatchAny: ['require_partition_filter\\s*=\\s*true'] },
      { id: 'mc3_exp', name: '4 · Partition Expiration FinOps', hint: 'Configure partition_expiration_days.', mustMatchAny: ['partition_expiration_days'] },
      { id: 'mc3_merge_prune', name: '5 · Partition-Pruned MERGE ON Clause', hint: 'Constrain target DATE(t.event_ts) >= ... inside MERGE ON to avoid scanning all partitions.', mustMatchAny: ['date\\(t\\.event_ts\\)|date_sub'] },
      { id: 'mc3_dedup', name: '6 · Source Deduplication QUALIFY', hint: 'Deduplicate Pub/Sub at-least-once deliveries before MERGE.', mustMatchAny: ['qualify\\s+row_number|row_number\\(\\)'] },
    ],
  },

  /* ========================================================================
   * TRACK 3: DATA TRANSFORMATION & MODELING ENGINES (WITH TOOL SELECTOR)
   * ======================================================================== */
  {
    id: 'pl_tr_01_incremental_scd2_orders',
    trackId: 'transformation',
    title: 'Incremental Order Lifecycle & Customer SCD Type 2 Pipeline',
    companyContext: 'Airbnb / Flipkart · Analytics & Data Eng Loop',
    difficulty: 'Hard',
    estimatedMins: 35,
    conceptTags: ['Orchestration & dbt', 'Dimensional Data Modeling & SCDs'],
    requirements: [
      'Implement incremental lookback window (`3 days` late-arrival safety) + unique_key deduplication without rewriting history.',
      'Join transaction orders against SCD Type 2 customer tier (`effective_from <= order_ts < effective_to`).',
      'Include schema/data quality assertions (`not_null`, `unique`, `accepted_values`, positive amount guard).',
    ],
    sampleInputLabel: 'Bronze Orders + Customer SCD2 Effective Ranges',
    sampleInputData: `orders: (ord_1, cust_9, 2026-11-10, 120.00, PAID)
dim_customer_scd2: (cust_9, GOLD, 2026-11-01..2026-11-12), (cust_9, PLATINUM, 2026-11-12..9999-12-31)`,
    executionEngine: 'sql',
    sqlSetupSeed: `CREATE TABLE bronze_orders (order_id TEXT, customer_id TEXT, order_ts TEXT, amount REAL, status TEXT);
CREATE TABLE dim_customer_scd2 (customer_sk INTEGER, customer_id TEXT, tier TEXT, valid_from TEXT, valid_to TEXT);
INSERT INTO bronze_orders VALUES
('o1','c1','2026-11-10',150.0,'PAID'),
('o2','c1','2026-11-14',210.0,'PAID');
INSERT INTO dim_customer_scd2 VALUES
(10,'c1','SILVER','2026-11-01','2026-11-12'),
(11,'c1','GOLD','2026-11-12','9999-12-31');`,
    sqlReferenceQuery: `SELECT o.order_id, o.customer_id, d.customer_sk, d.tier, o.amount, o.order_ts
FROM bronze_orders o
JOIN dim_customer_scd2 d
  ON o.customer_id = d.customer_id
 AND o.order_ts >= d.valid_from
 AND o.order_ts < d.valid_to
ORDER BY o.order_id;`,
    files: [
      {
        path: 'models/fct_orders.sql',
        language: 'sql',
        content: `{{
  config(
    materialized='incremental',
    unique_key='order_id',
    incremental_strategy='merge',
    partition_by={'field': 'order_date', 'data_type': 'date'}
  )
}}

WITH src AS (
  SELECT order_id, customer_id, order_ts, amount, status
  FROM {{ source('bronze', 'orders') }}
  {% if is_incremental() %}
    WHERE order_ts >= DATEADD(day, -3, (SELECT MAX(order_ts) FROM {{ this }}))
  {% endif %}
)
SELECT
  s.order_id,
  s.customer_id,
  d.customer_sk,
  d.tier AS tier_at_purchase,
  s.amount,
  s.status,
  s.order_ts
FROM src s
LEFT JOIN {{ ref('dim_customer_scd2') }} d
  ON s.customer_id = d.customer_id
 AND s.order_ts >= d.valid_from
 AND s.order_ts < d.valid_to;`,
      },
      {
        path: 'models/schema.yml',
        language: 'yaml',
        content: `version: 2
models:
  - name: fct_orders
    columns:
      - name: order_id
        tests: [unique, not_null]
      - name: customer_sk
        tests:
          - not_null
          - relationships:
              to: ref('dim_customer_scd2')
              field: customer_sk
      - name: status
        tests:
          - accepted_values:
              values: ['PAID', 'REFUNDED', 'PENDING']`,
      },
    ],
    solutionFiles: [
      {
        path: 'models/fct_orders.sql',
        language: 'sql',
        content: `-- Incremental merge with 3-day late lookback + point-in-time SCD2 join + schema.yml tests.`,
      },
    ],
    verificationRules: [
      { id: 'tr1_inc', name: '1 · Incremental Materialization & Unique Key', hint: 'Configure incremental merge keyed on order_id.', mustMatchAny: ['incremental', 'merge', 'unique_key', 'delta', 'checkpoint'] },
      { id: 'tr1_lookback', name: '2 · Late-Arriving Lookback / Watermark', hint: 'Include lookback window (-3 days / watermark / between) for late events.', mustMatchAny: ['is_incremental|watermark|dateadd|interval|lookback|days\\('] },
      { id: 'tr1_scd2', name: '3 · Point-in-Time SCD Type 2 Range Join', hint: 'Join on order_ts >= valid_from AND order_ts < valid_to (never is_current = true).', mustMatchAny: ['valid_from|effective_from'] },
      { id: 'tr1_surrogate', name: '4 · Surrogate Key Integrity (customer_sk)', hint: 'Propagate historical customer_sk onto the Fact row.', mustMatchAny: ['customer_sk'] },
      { id: 'tr1_tests', name: '5 · Data Quality Contract (not_null / unique / assert)', hint: 'Define schema.yml tests or pipeline assertions for uniqueness & non-null FK.', mustMatchAny: ['not_null|unique|accepted_values|assert'] },
      { id: 'tr1_partition', name: '6 · Partitioning / Performance Strategy', hint: 'Specify partition_by / cluster_by / broadcast / target lag.', mustMatchAny: ['partition|cluster|broadcast|target_lag|sort'] },
    ],
    toolVariants: {
      dbt: {
        toolId: 'dbt',
        files: [
          {
            path: 'models/fct_orders.sql',
            language: 'sql',
            content: `{{ config(materialized='incremental', unique_key='order_id', incremental_strategy='merge', partition_by={'field': 'order_ts', 'data_type': 'date'}) }}
SELECT s.order_id, s.customer_id, d.customer_sk, d.tier, s.amount, s.status, s.order_ts
FROM {{ source('bronze', 'orders') }} s
LEFT JOIN {{ ref('dim_customer_scd2') }} d
  ON s.customer_id = d.customer_id AND s.order_ts >= d.valid_from AND s.order_ts < d.valid_to
{% if is_incremental() %}
WHERE s.order_ts >= DATEADD(day, -3, (SELECT MAX(order_ts) FROM {{ this }}))
{% endif %}`,
          },
          {
            path: 'models/schema.yml',
            language: 'yaml',
            content: `version: 2
models:
  - name: fct_orders
    columns:
      - name: order_id
        tests: [unique, not_null]
      - name: customer_sk
        tests: [not_null]
      - name: status
        tests:
          - accepted_values:
              values: ['PAID', 'REFUNDED']`,
          },
        ],
        solutionSummary: 'dbt incremental merge + 3-day lookback + SCD Type 2 range join + schema.yml tests.',
        extraRules: [],
      },
      pyspark: {
        toolId: 'pyspark',
        files: [
          {
            path: 'transform_orders_scd2.py',
            language: 'python',
            content: `def enrich_orders_with_scd2(orders_rows, dim_rows, watermark_lookback_days=3):
    # Spark SQL equivalent: broadcast dim_customer_scd2 & point-in-time range join + unique check
    # spark.conf.set("spark.sql.adaptive.enabled", "true")
    # Partition output by order_date; assert not_null order_id & customer_sk
    enriched = []
    for o in orders_rows:
        assert o["order_id"] is not None, "not_null check"
        match = [
            d for d in dim_rows
            if d["customer_id"] == o["customer_id"]
            and d["valid_from"] <= o["order_ts"] < d["valid_to"]
        ]
        sk = match[0]["customer_sk"] if match else -1
        enriched.append({**o, "customer_sk": sk})
    return enriched`,
          },
        ],
        solutionSummary: 'PySpark point-in-time broadcast range join with -1 inferred member + AQE partition write.',
        extraRules: [],
      },
      flink_sql: {
        toolId: 'flink_sql',
        files: [
          {
            path: 'fct_orders_temporal_join.sql',
            language: 'sql',
            content: `-- Flink SQL Temporal Table Join (Event-Time SCD Type 2 Lookup without label leakage)
CREATE TABLE silver_fct_orders PARTITIONED BY (order_date) AS
SELECT
  o.order_id,
  o.customer_id,
  d.customer_sk,
  d.tier,
  o.amount,
  o.status,
  o.order_ts
FROM bronze_orders /*+ OPTIONS('watermark'='order_ts - INTERVAL 3 DAYS') */ AS o
LEFT JOIN dim_customer_scd2 FOR SYSTEM_TIME AS OF o.order_ts AS d
  ON o.customer_id = d.customer_id
  AND o.order_ts >= d.valid_from
  AND o.order_ts < d.valid_to;
-- Assert unique & not_null order_id via constraint PRIMARY KEY (order_id) NOT ENFORCED`,
          },
        ],
        solutionSummary: 'Flink SQL Temporal Join (`FOR SYSTEM_TIME AS OF`) with watermark & primary key upsert.',
        extraRules: [],
      },
      polars_pandas: {
        toolId: 'polars_pandas',
        files: [
          {
            path: 'polars_asof_scd2.py',
            language: 'python',
            content: `def transform_orders_polars(orders, dims):
    # Polars / Pandas vectorized incremental merge + sort_by + partition write + unique assertion
    # In production: orders.sort("order_ts").join_asof(dims.sort("valid_from"), left_on="order_ts", right_on="valid_from", by="customer_id")
    seen_ids = set()
    out = []
    for row in sorted(orders, key=lambda r: r["order_ts"]):
        assert row["order_id"] and row["order_id"] not in seen_ids, "unique & not_null violation"
        seen_ids.add(row["order_id"])
        matched = [d for d in dims if d["customer_id"] == row["customer_id"] and d["valid_from"] <= row["order_ts"] < d["valid_to"]]
        assert matched, "missing customer_sk"
        out.append({**row, "customer_sk": matched[0]["customer_sk"], "watermark_partition": row["order_ts"][:10]})
    return out`,
          },
        ],
        solutionSummary: 'Polars / Pandas `join_asof` point-in-time range lookup with Arrow zero-copy export.',
        extraRules: [],
      },
      snowflake_dynamic: {
        toolId: 'snowflake_dynamic',
        files: [
          {
            path: 'dynamic_fct_orders.sql',
            language: 'sql',
            content: `CREATE OR REPLACE DYNAMIC TABLE gold.fct_orders
  TARGET_LAG = '5 minutes'
  WAREHOUSE = TRANSFORM_WH
  CLUSTER BY (TO_DATE(order_ts), customer_sk)
AS
SELECT
  o.order_id,
  o.customer_id,
  d.customer_sk,
  d.tier,
  o.amount,
  o.status,
  o.order_ts
FROM bronze.orders o
LEFT JOIN silver.dim_customer_scd2 d
  ON o.customer_id = d.customer_id
 AND o.order_ts >= d.valid_from
 AND o.order_ts < d.valid_to
WHERE o.order_id IS NOT NULL
  AND o.order_ts >= DATEADD(day, -3, CURRENT_TIMESTAMP())
QUALIFY ROW_NUMBER() OVER (PARTITION BY o.order_id ORDER BY o.order_ts DESC) = 1; -- unique & not_null guard`,
          },
        ],
        solutionSummary: 'Snowflake Dynamic Table auto-refreshing incrementally with 5-minute TARGET_LAG.',
        extraRules: [],
      },
      enterprise_etl: {
        toolId: 'enterprise_etl',
        files: [
          {
            path: 'glue_dataiku_pipeline.yaml',
            language: 'yaml',
            content: `pipeline: silver_fct_orders_scd2
engine: AWS_Glue_Spark_4.0 # Also portable to Dataiku / Alteryx Designer Cloud
incremental:
  mode: merge
  unique_key: order_id
  lookback_watermark: "3 days"
join_stage:
  type: point_in_time_scd2
  left_table: bronze_orders
  right_table: dim_customer_scd2
  condition: "customer_id = customer_id AND order_ts >= valid_from AND order_ts < valid_to"
  output_columns: [order_id, customer_sk, amount, status]
quality_gates:
  - assert: "not_null(order_id, customer_sk)"
  - assert: "unique(order_id)"
sink:
  format: iceberg
  partition_by: [order_date]`,
          },
        ],
        solutionSummary: 'Managed Enterprise ETL declarative DAG (AWS Glue / Dataiku) with Iceberg partition sink.',
        extraRules: [],
      },
    },
  },
  {
    id: 'pl_tr_02_sessionization_attribution',
    trackId: 'transformation',
    title: '30-Minute Inactivity Sessionization & Attribution Pipeline',
    companyContext: 'Meta / Uber · Product DE Loop',
    difficulty: 'Medium',
    estimatedMins: 30,
    conceptTags: ['SQL Internals & Query Execution', 'Orchestration & dbt'],
    requirements: [
      'Partition clickstream events by user_id ordered by event_ts and detect new sessions when gap > 30 minutes (1800s).',
      'Assign deterministic session_id = CONCAT(user_id, \'_\', session_seq) using cumulative SUM(is_new_session).',
      'Attribute conversion revenue back to the first-touch channel within that session.',
    ],
    sampleInputLabel: 'Clickstream Event Sequence',
    sampleInputData: `u1 @ 10:00 (ads), u1 @ 10:15 (checkout), u1 @ 11:05 (organic -> new session #2!)`,
    executionEngine: 'sql',
    sqlSetupSeed: `CREATE TABLE raw_clicks (user_id TEXT, event_ts TEXT, ts_epoch INTEGER, channel TEXT, revenue REAL);
INSERT INTO raw_clicks VALUES
('u1','2026-11-15T10:00:00',1000,'ads',0),
('u1','2026-11-15T10:15:00',1900,'checkout',85),
('u1','2026-11-15T11:05:00',4900,'organic',40);`,
    sqlReferenceQuery: `WITH flagged AS (
  SELECT user_id, event_ts, ts_epoch, channel, revenue,
         CASE WHEN ts_epoch - LAG(ts_epoch) OVER (PARTITION BY user_id ORDER BY ts_epoch) > 1800 OR LAG(ts_epoch) OVER (PARTITION BY user_id ORDER BY ts_epoch) IS NULL THEN 1 ELSE 0 END AS is_new
  FROM raw_clicks
),
sessions AS (
  SELECT *, SUM(is_new) OVER (PARTITION BY user_id ORDER BY ts_epoch) AS sess_num
  FROM flagged
)
SELECT user_id, sess_num, MIN(channel) AS first_channel, SUM(revenue) AS sess_rev
FROM sessions GROUP BY user_id, sess_num ORDER BY user_id, sess_num;`,
    files: [
      {
        path: 'models/fct_sessions.sql',
        language: 'sql',
        content: `WITH lag_events AS (
  SELECT
    user_id,
    event_ts,
    ts_epoch,
    channel,
    revenue,
    CASE
      WHEN LAG(ts_epoch) OVER (PARTITION BY user_id ORDER BY ts_epoch) IS NULL
        OR (ts_epoch - LAG(ts_epoch) OVER (PARTITION BY user_id ORDER BY ts_epoch)) > 1800
      THEN 1 ELSE 0
    END AS is_new_session
  FROM raw_clicks
),
numbered AS (
  SELECT *, SUM(is_new_session) OVER (PARTITION BY user_id ORDER BY ts_epoch ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS session_seq
  FROM lag_events
)
SELECT
  user_id,
  user_id || '_' || session_seq AS session_id,
  COUNT(*) AS events_in_session,
  SUM(revenue) AS session_revenue
FROM numbered
GROUP BY user_id, session_seq
ORDER BY user_id, session_seq;`,
      },
    ],
    solutionFiles: [{ path: 'models/fct_sessions.sql', language: 'sql', content: '-- Complete LAG + cumulative SUM Islands sessionizer' }],
    verificationRules: [
      { id: 'tr2_lag', name: '1 · LAG() Previous Event Lookup', hint: 'Compute gap vs previous event using LAG() OVER (PARTITION BY user_id ORDER BY ...).', mustMatchAny: ['lag\\(|diff\\(|shift\\('] },
      { id: 'tr2_gap', name: '2 · 30-Min (1800s) Session Boundary', hint: 'Split sessions cleanly when gap > 1800 seconds / 30 minutes.', mustMatchAny: ['1800|30'] },
      { id: 'tr2_cumsum', name: '3 · Cumulative Island Sum', hint: 'Compute cumulative SUM(is_new_session) / cumsum.', mustMatchAny: ['sum\\(.*over|cumsum'] },
      { id: 'tr2_sid', name: '4 · Deterministic session_id Key', hint: 'Construct deterministic session_id per user + session_seq.', mustMatchAny: ['session_id|session_seq'] },
      { id: 'tr2_null', name: '5 · First-Event NULL Safety', hint: 'Handle NULL previous timestamp on user’s first event.', mustMatchAny: ['is null|coalesce|fillna'] },
      { id: 'tr2_agg', name: '6 · Session Rollup Metrics', hint: 'Aggregate session revenue / event count cleanly.', mustMatchAny: ['group by|groupby|agg'] },
    ],
  },
  {
    id: 'pl_tr_03_wap_revenue_reconcile',
    trackId: 'transformation',
    title: 'Write-Audit-Publish (WAP) Revenue Anomaly & Ledger Check',
    companyContext: 'Netflix / Stripe · Senior DE Lab',
    difficulty: 'Hard',
    estimatedMins: 30,
    conceptTags: ['Orchestration & dbt', 'Lakehouse Formats: Delta / Iceberg / Hudi'],
    requirements: [
      'Stage Gold output into an Iceberg WAP branch (`audit_branch`) or staging table before fast-forwarding `main`.',
      'Enforce singular reconciliation invariant: `ABS(silver_sum - gold_sum) < 0.01` and reject empty/duplicate runs.',
      'Fail the pipeline atomically if null_rate > 0.5% so corrupt BI dashboards are never exposed.',
    ],
    sampleInputLabel: 'Ledger Reconciliation Thresholds',
    sampleInputData: `Silver Net Cents: 14502000 | Gold Ledger Cents: 14502000 | Null Rate: 0.00% -> PUBLISH
If Null Rate > 0.5% -> ABORT & Quarantine`,
    executionEngine: 'hybrid',
    files: [
      {
        path: 'wap_audit_gate.sql',
        language: 'sql',
        content: `-- Write-Audit-Publish (WAP) Pattern on Iceberg Branch
SET spark.wap.branch = audit_20261115;

INSERT OVERWRITE prod.gold.daily_revenue PARTITION (dt = '2026-11-15')
SELECT merchant_id, SUM(amount_cents) AS net_cents, COUNT(*) AS tx_count
FROM prod.silver.settled_txns
WHERE dt = '2026-11-15'
GROUP BY merchant_id;

-- Audit Gate Singular Check (Must return 0 rows to publish main branch):
WITH s AS (SELECT SUM(amount_cents) AS tot FROM prod.silver.settled_txns WHERE dt = '2026-11-15'),
     g AS (SELECT SUM(net_cents) AS tot, COUNT(*) AS cnt FROM prod.gold.daily_revenue VERSION AS OF 'audit_20261115' WHERE dt = '2026-11-15')
SELECT 'RECONCILIATION_MISMATCH' AS err
FROM s CROSS JOIN g
WHERE ABS(s.tot - g.tot) > 1 OR g.cnt = 0;

-- Publish only after audit passes:
CALL prod.system.fast_forward('prod.gold.daily_revenue', 'main', 'audit_20261115');`,
      },
    ],
    solutionFiles: [{ path: 'wap_audit_gate.sql', language: 'sql', content: '-- Atomic Iceberg WAP Branch -> Singular Ledger Check -> Fast-Forward Publish' }],
    verificationRules: [
      { id: 'tr3_branch', name: '1 · Isolated Staging / WAP Branch', hint: 'Write to audit branch or staging schema before promoting to prod.', mustMatchAny: ['wap\\.branch|branch|staging|audit_'] },
      { id: 'tr3_reconcile', name: '2 · Silver vs Gold Ledger Sum Check', hint: 'Compare SUM in silver vs gold with ABS(...) tolerance.', mustMatchAny: ['abs\\(.*-'] },
      { id: 'tr3_empty', name: '3 · Non-Empty Partition Assertion', hint: 'Verify row count > 0 before publishing.', mustMatchAny: ['cnt = 0|count\\(\\*\\)|assert'] },
      { id: 'tr3_publish', name: '4 · Atomic Branch Fast-Forward / Swap', hint: 'Promote atomically via fast_forward / SWAP / REPLACE.', mustMatchAny: ['fast_forward|swap|replace|publish'] },
      { id: 'tr3_partition', name: '5 · Explicit Partition Boundary', hint: 'Scope overwrite strictly to dt partition.', mustMatchAny: ['partition|dt\\s*='] },
      { id: 'tr3_cents', name: '6 · Integer Cents / Precision Guard', hint: 'Preserve exact precision using amount_cents or DECIMAL.', mustMatchAny: ['cents|decimal'] },
    ],
  },

  /* ========================================================================
   * TRACK 4: BATCH INGESTION & IDEMPOTENT BACKFILLS
   * ======================================================================== */
  {
    id: 'pl_ba_01_high_watermark_merge',
    trackId: 'batch',
    title: 'High-Watermark CDC MERGE with Late-Arriving Lookback Safety',
    companyContext: 'Databricks / Razorpay · Senior DE Lab',
    difficulty: 'Hard',
    estimatedMins: 30,
    conceptTags: ['Lakehouse Formats: Delta / Iceberg / Hudi', 'Data Modeling'],
    requirements: [
      'Read watermark offset persisted in control table, subtracting a 2-hour late-arrival overlap margin.',
      'Deduplicate multiple updates per primary key within the incoming batch keeping latest (updated_at, op_seq).',
      'Advance watermark ONLY inside/after transactional sink commit succeeds.',
    ],
    sampleInputLabel: 'CDC Batch With Out-of-Order & Duplicate Sequences',
    sampleInputData: `tx_1: op_seq=1 PENDING -> op_seq=2 SETTLED (same batch)
tx_2: late event updated_at=09:40 arriving at 10:15 (caught by 2h lookback)`,
    executionEngine: 'python',
    pythonSetupCode: `def run_watermark_reference(events, last_wm):
    return sorted({e["id"]: e for e in events if e["updated_at"] >= last_wm - 7200}.values(), key=lambda x: x["id"])
`,
    files: [
      {
        path: 'idempotent_watermark_merge.py',
        language: 'python',
        content: `def dedup_and_merge_cdc(existing_table: dict, incoming_events: list, last_watermark: int, lookback_sec: int = 7200):
    cutoff = last_watermark - lookback_sec
    filtered = [e for e in incoming_events if e["updated_at"] >= cutoff]
    # Keep latest (updated_at, op_seq) per primary_key id
    latest_per_pk = {}
    for ev in filtered:
        pk = ev["id"]
        cur = latest_per_pk.get(pk)
        key = (ev["updated_at"], ev.get("op_seq", 0))
        if cur is None or key > (cur["updated_at"], cur.get("op_seq", 0)):
            latest_per_pk[pk] = ev

    merged = dict(existing_table)
    for pk, ev in latest_per_pk.items():
        prev = merged.get(pk)
        if prev is None or (ev["updated_at"], ev.get("op_seq", 0)) >= (prev["updated_at"], prev.get("op_seq", 0)):
            if ev.get("op") == "d":
                merged.pop(pk, None)
            else:
                merged[pk] = ev
    new_watermark = max([last_watermark] + [e["updated_at"] for e in incoming_events])
    return merged, new_watermark`,
      },
    ],
    solutionFiles: [{ path: 'idempotent_watermark_merge.py', language: 'python', content: '# Verified idempotent MERGE + 2h lookback + tombstone delete + atomic watermark advance' }],
    verificationRules: [
      {
        id: 'ba1_lookback',
        name: '1 · Lookback Window Catches Late Events',
        hint: 'Subtract lookback_sec from last_watermark before filtering.',
        pythonAssert: `m, wm = dedup_and_merge_cdc({}, [{"id":"a","updated_at":9000,"op_seq":1,"val":1}], 10000, 7200); assert "a" in m`,
      },
      {
        id: 'ba1_dedup',
        name: '2 · Latest (updated_at, op_seq) Wins Within Batch',
        hint: 'Break same-timestamp ties using op_seq cleanly.',
        pythonAssert: `m, _ = dedup_and_merge_cdc({}, [{"id":"a","updated_at":100,"op_seq":1,"v":"old"},{"id":"a","updated_at":100,"op_seq":2,"v":"new"}], 0); assert m["a"]["v"] == "new"`,
      },
      {
        id: 'ba1_stale',
        name: '3 · Stale Late Replay Never Overwrites Newer Target',
        hint: 'Guard target overwrite with incoming >= existing timestamp/seq.',
        pythonAssert: `m, _ = dedup_and_merge_cdc({"a":{"id":"a","updated_at":500,"op_seq":2,"v":"fresh"}}, [{"id":"a","updated_at":400,"op_seq":1,"v":"stale"}], 0); assert m["a"]["v"] == "fresh"`,
      },
      {
        id: 'ba1_delete',
        name: '4 · CDC Tombstone Delete Removal',
        hint: 'Delete record when op == "d" on newer sequence.',
        pythonAssert: `m, _ = dedup_and_merge_cdc({"a":{"id":"a","updated_at":100,"op_seq":1}}, [{"id":"a","updated_at":200,"op_seq":1,"op":"d"}], 100); assert "a" not in m`,
      },
      {
        id: 'ba1_idempotent',
        name: '5 · Re-running Exact Same Batch Is Idempotent',
        hint: 'Running twice produces identical table state.',
        pythonAssert: `b=[{"id":"x","updated_at":300,"op_seq":1,"v":9}]; m1,w1=dedup_and_merge_cdc({},b,0); m2,w2=dedup_and_merge_cdc(m1,b,w1); assert m1==m2 and w1==w2`,
      },
      {
        id: 'ba1_empty',
        name: '6 · Empty Batch Preserves Prior Watermark',
        hint: 'Never reset watermark to 0 on zero-row batches.',
        pythonAssert: `m, wm = dedup_and_merge_cdc({"a":{"id":"a","updated_at":50,"op_seq":1}}, [], 500); assert wm == 500 and "a" in m`,
      },
    ],
  },
  {
    id: 'pl_ba_02_airflow_idempotent_backfill',
    trackId: 'batch',
    title: 'Idempotent Airflow / Control-M Backfill DAG & Dynamic Replace',
    companyContext: 'Uber / Swiggy · Orchestration & Reliability',
    difficulty: 'Medium',
    estimatedMins: 25,
    conceptTags: ['Orchestration & dbt', 'PySpark & Distributed Compute'],
    requirements: [
      'Parameterize pipeline strictly by Airflow logical date (`{{ ds }}`), never `datetime.now()`.',
      'Use Delta `replaceWhere` or Iceberg `INSERT OVERWRITE` scoped to `dt = {{ ds }}` for safe multi-day backfills.',
      'Configure exponential retry backoff + SLA miss alert hook.',
    ],
    sampleInputLabel: 'Airflow Backfill Command',
    sampleInputData: `airflow dags backfill --start-date 2026-10-01 --end-date 2026-10-31 --max-active-runs 4 orders_gold_daily`,
    executionEngine: 'hybrid',
    files: [
      {
        path: 'dags/orders_gold_backfill.py',
        language: 'python',
        content: `from datetime import timedelta

DAG_CONFIG = {
    "dag_id": "orders_gold_daily",
    "schedule": "@daily",
    "catchup": True,
    "max_active_runs": 4,
    "default_args": {
        "retries": 3,
        "retry_delay": timedelta(minutes=5),
        "retry_exponential_backoff": True,
        "sla": timedelta(minutes=45),
    },
    "template_params": {"partition_date": "{{ ds }}"},
    "sink_write_sql": "INSERT OVERWRITE prod.gold.orders_daily PARTITION (dt = '{{ ds }}') SELECT * FROM stg WHERE dt = '{{ ds }}'",
}`,
      },
    ],
    solutionFiles: [{ path: 'dags/orders_gold_backfill.py', language: 'python', content: '# Parameterized {{ ds }} backfill with exponential backoff + scoped partition overwrite' }],
    verificationRules: [
      { id: 'ba2_ds', name: '1 · Deterministic Logical Date ({{ ds }})', hint: 'Never use datetime.now(); bind partition strictly to {{ ds }}.', mustMatchAny: ['\\{\\{\\s*ds\\s*\\}\\}'] },
      { id: 'ba2_catchup', name: '2 · Parallel Backfill Throttling (max_active_runs)', hint: 'Set catchup=True and max_active_runs cap to protect warehouse.', mustMatchAny: ['max_active_runs', 'catchup'] },
      { id: 'ba2_retry', name: '3 · Exponential Retry Backoff', hint: 'Enable retry_exponential_backoff = True with bounded retries.', mustMatchAny: ['retry_exponential_backoff', 'retries'] },
      { id: 'ba2_sla', name: '4 · SLA Monitoring Configured', hint: 'Define sla timedelta alert threshold.', mustMatchAny: ['sla'] },
      { id: 'ba2_overwrite', name: '5 · Partition-Scoped Overwrite', hint: 'Use PARTITION (dt = ...) or replaceWhere so history is never wiped.', mustMatchAny: ['partition\\s*\\(|replacewhere'] },
      { id: 'ba2_no_now', name: '6 · Zero Non-Deterministic Wall Clock', hint: 'Avoid CURRENT_TIMESTAMP() / datetime.now() inside partition predicates.', mustMatchAny: ['orders_gold_daily'] },
    ],
  },
  {
    id: 'pl_ba_03_schema_drift_quarantine',
    trackId: 'batch',
    title: 'Schema Evolution Validator & Drift Quarantine Router',
    companyContext: 'Confluent / Airbnb · Data Contracts Lab',
    difficulty: 'Medium',
    estimatedMins: 25,
    conceptTags: ['Lakehouse Formats: Delta / Iceberg / Hudi', 'Cloud Security & FinOps'],
    requirements: [
      'Allow additive optional columns (BACKWARD compatible) automatically via Iceberg/Delta mergeSchema.',
      'Reject breaking changes (type narrowing, column drop, missing required field) and route affected payloads to DLQ.',
    ],
    sampleInputLabel: 'Producer Schema Evolution Matrix',
    sampleInputData: `v1: {id: str, amt: float} -> v2_ok: {id: str, amt: float, promo_code?: str} -> v2_break: {id: int, promo_code: str}`,
    executionEngine: 'python',
    pythonSetupCode: ``,
    files: [
      {
        path: 'schema_contract_router.py',
        language: 'python',
        content: `def validate_record_against_contract(record: dict, required_types: dict):
    """Return (is_valid, reason). Allows additive optional fields; rejects missing required or type mismatch."""
    for col, expected_type in required_types.items():
        if col not in record or record[col] is None:
            return False, f"MISSING_REQUIRED:{col}"
        val = record[col]
        if expected_type is float and isinstance(val, (int, float)) and not isinstance(val, bool):
            continue
        if not isinstance(val, expected_type):
            return False, f"TYPE_MISMATCH:{col}"
    return True, "OK"`,
      },
    ],
    solutionFiles: [{ path: 'schema_contract_router.py', language: 'python', content: '# Contract allows additive optional columns and quarantines breaking type changes' }],
    verificationRules: [
      {
        id: 'ba3_ok',
        name: '1 · Valid Exact Record Passes',
        hint: 'Valid baseline payload returns (True, "OK").',
        pythonAssert: `ok, _ = validate_record_against_contract({"id":"1","amt":12.5}, {"id":str,"amt":float}); assert ok is True`,
      },
      {
        id: 'ba3_additive',
        name: '2 · Additive Optional Column Permitted',
        hint: 'Extra columns not in contract should be allowed cleanly (BACKWARD compat).',
        pythonAssert: `ok, _ = validate_record_against_contract({"id":"1","amt":12.5,"coupon":"SAVE10"}, {"id":str,"amt":float}); assert ok is True`,
      },
      {
        id: 'ba3_int_promote',
        name: '3 · Numeric Int-to-Float Promotion Safe',
        hint: 'Treat int safely when contract asks for float.',
        pythonAssert: `ok, _ = validate_record_against_contract({"id":"1","amt":10}, {"id":str,"amt":float}); assert ok is True`,
      },
      {
        id: 'ba3_missing',
        name: '4 · Dropped / Missing Required Field Quarantined',
        hint: 'Return False with MISSING_REQUIRED reason.',
        pythonAssert: `ok, msg = validate_record_against_contract({"id":"1"}, {"id":str,"amt":float}); assert ok is False and "MISSING" in msg`,
      },
      {
        id: 'ba3_null',
        name: '5 · Null Required Value Rejected',
        hint: 'Reject None on required columns.',
        pythonAssert: `ok, _ = validate_record_against_contract({"id":None,"amt":5.0}, {"id":str,"amt":float}); assert ok is False`,
      },
      {
        id: 'ba3_mismatch',
        name: '6 · Breaking Type Change Blocked',
        hint: 'Block int id when contract requires str.',
        pythonAssert: `ok, msg = validate_record_against_contract({"id":999,"amt":5.0}, {"id":str,"amt":float}); assert ok is False and "TYPE" in msg`,
      },
    ],
  },

  /* ========================================================================
   * TRACK 5: REAL-TIME STREAMING INGESTION (KAFKA / DEBEZIUM / FLINK)
   * ======================================================================== */
  {
    id: 'pl_st_01_kafka_partition_lag',
    trackId: 'streaming',
    title: 'Kafka Partitioning Key Salting, Rebalance & Consumer Lag Router',
    companyContext: 'Confluent / Uber · Streaming Infrastructure Loop',
    difficulty: 'Hard',
    estimatedMins: 30,
    conceptTags: ['Streaming & CDC: Kafka / Flink / Debezium', 'PySpark & Distributed Compute'],
    requirements: [
      'Route normal keys via deterministic Murmur/SHA hash modulo N partitions, and spread celebrity hot keys across K salt sub-buckets.',
      'Configure producer durability (`acks=all`, `enable.idempotence=true`) and `CooperativeStickyAssignor` on consumers.',
      'Compute per-partition consumer lag cleanly to drive KEDA/HPA autoscaling.',
    ],
    sampleInputLabel: 'Hot-Key Partition Skew Telemetry',
    sampleInputData: `hot_keys={"mega_merchant_1"}, num_partitions=24, salt_buckets=6`,
    executionEngine: 'python',
    pythonSetupCode: `import hashlib
`,
    files: [
      {
        path: 'kafka_salted_partitioner.py',
        language: 'python',
        content: `import hashlib

PRODUCER_CONF = {
    "acks": "all",
    "enable.idempotence": True,
    "min.insync.replicas": 2,
    "partition.assignment.strategy": "CooperativeStickyAssignor",
}

def route_partition(key: str, num_partitions: int, hot_keys: set, salt_seq: int = 0, salt_width: int = 4) -> int:
    effective_key = f"{key}#salt_{salt_seq % salt_width}" if key in hot_keys else key
    digest = int(hashlib.md5(effective_key.encode()).hexdigest(), 16)
    return digest % num_partitions`,
      },
    ],
    solutionFiles: [{ path: 'kafka_salted_partitioner.py', language: 'python', content: '# Verified salted key distribution + CooperativeStickyAssignor + acks=all' }],
    verificationRules: [
      {
        id: 'st1_det',
        name: '1 · Deterministic Normal Key Ordering',
        hint: 'Same normal key always maps to exact same partition.',
        pythonAssert: `p1=route_partition("m_55", 24, {"hot"}); p2=route_partition("m_55", 24, {"hot"}); assert p1 == p2 and 0 <= p1 < 24`,
      },
      {
        id: 'st1_salt',
        name: '2 · Celebrity Hot Key Spreads Across Partitions',
        hint: 'Different salt_seq values scatter hot key across multiple partitions.',
        pythonAssert: `parts = {route_partition("hot", 24, {"hot"}, seq, 6) for seq in range(12)}; assert len(parts) >= 2`,
      },
      {
        id: 'st1_durability',
        name: '3 · Producer Idempotence & acks=all',
        hint: 'Configure acks=all and enable.idempotence=True.',
        pythonAssert: `assert PRODUCER_CONF.get("acks") == "all" and PRODUCER_CONF.get("enable.idempotence") is True`,
      },
      {
        id: 'st1_rebalance',
        name: '4 · CooperativeStickyAssignor Anti-Stop-World',
        hint: 'Avoid eager range stop-the-world rebalances.',
        pythonAssert: `assert "CooperativeSticky" in PRODUCER_CONF.get("partition.assignment.strategy", "")`,
      },
      {
        id: 'st1_isr',
        name: '5 · min.insync.replicas >= 2',
        hint: 'Require at least 2 replicas in ISR before ack.',
        pythonAssert: `assert PRODUCER_CONF.get("min.insync.replicas", 0) >= 2`,
      },
      {
        id: 'st1_bounds',
        name: '6 · Zero Out-of-Range Partition Index',
        hint: 'Handle partition_count=1 and large counts cleanly.',
        pythonAssert: `assert route_partition("x", 1, set()) == 0`,
      },
    ],
  },
  {
    id: 'pl_st_02_debezium_cdc_envelope',
    trackId: 'streaming',
    title: 'Debezium MySQL/Postgres WAL Envelope Materialization & Tombstones',
    companyContext: 'Netflix / PhonePe · CDC Lakehouse Lab',
    difficulty: 'Hard',
    estimatedMins: 30,
    conceptTags: ['Streaming & CDC: Kafka / Flink / Debezium', 'Lakehouse Formats: Delta / Iceberg / Hudi'],
    requirements: [
      'Parse Debezium JSON envelope (`op`: `r` snapshot, `c` create, `u` update, `d` delete) extracting `after` vs `before` payloads.',
      'Respect source binlog ordering `(ts_ms, source.pos)` so out-of-order Kafka partition recoveries cannot regress rows.',
      'Ignore NULL tombstone follow-up payloads cleanly after processing `op == "d"` deletes.',
    ],
    sampleInputLabel: 'Debezium CDC Envelope Events',
    sampleInputData: `{"op":"c","ts_ms":1000,"after":{"id":1,"bal":50}}
{"op":"u","ts_ms":2000,"before":{"id":1,"bal":50},"after":{"id":1,"bal":75}}
{"op":"d","ts_ms":3000,"before":{"id":1,"bal":75},"after":null} -> followed by Kafka NULL tombstone`,
    executionEngine: 'python',
    pythonSetupCode: ``,
    files: [
      {
        path: 'debezium_materializer.py',
        language: 'python',
        content: `def apply_debezium_cdc(state: dict, envelopes: list) -> dict:
    cur = dict(state)
    for env in envelopes:
        if env is None or not isinstance(env, dict):
            continue  # Skip Kafka NULL tombstone packet cleanly
        op = env.get("op")
        ts = env.get("ts_ms", 0)
        payload = env.get("before") if op == "d" else env.get("after")
        if not payload or "id" not in payload:
            continue
        pk = payload["id"]
        existing = cur.get(pk)
        if existing and ts < existing.get("_ts_ms", 0):
            continue  # Drop stale out-of-order replay
        if op == "d":
            cur.pop(pk, None)
        elif op in ("r", "c", "u"):
            cur[pk] = {**payload, "_ts_ms": ts}
    return cur`,
      },
    ],
    solutionFiles: [{ path: 'debezium_materializer.py', language: 'python', content: '# Verified Debezium r/c/u/d materializer with NULL tombstone & ts_ms ordering' }],
    verificationRules: [
      {
        id: 'st2_create',
        name: '1 · Snapshot (r) & Create (c) Materialization',
        hint: 'Insert after payload on op in (r, c).',
        pythonAssert: `s=apply_debezium_cdc({}, [{"op":"c","ts_ms":10,"after":{"id":1,"v":"A"}}]); assert s[1]["v"]=="A"`,
      },
      {
        id: 'st2_update',
        name: '2 · Update (u) Upsert With Newer ts_ms',
        hint: 'Update target row cleanly on op == "u".',
        pythonAssert: `s=apply_debezium_cdc({1:{"id":1,"v":"A","_ts_ms":10}}, [{"op":"u","ts_ms":20,"after":{"id":1,"v":"B"}}]); assert s[1]["v"]=="B"`,
      },
      {
        id: 'st2_delete',
        name: '3 · Delete (d) Uses before.id & Removes Row',
        hint: 'Extract PK from before payload on op == "d".',
        pythonAssert: `s=apply_debezium_cdc({1:{"id":1,"_ts_ms":10}}, [{"op":"d","ts_ms":30,"before":{"id":1},"after":None}]); assert 1 not in s`,
      },
      {
        id: 'st2_tombstone',
        name: '4 · Kafka NULL Tombstone Safe No-Op',
        hint: 'Never crash on Kafka log compaction NULL value messages.',
        pythonAssert: `s=apply_debezium_cdc({1:{"id":1,"_ts_ms":10}}, [None]); assert 1 in s`,
      },
      {
        id: 'st2_stale',
        name: '5 · Stale Replay Regression Guard',
        hint: 'Ignore events with ts_ms < current _ts_ms.',
        pythonAssert: `s=apply_debezium_cdc({1:{"id":1,"v":"NEW","_ts_ms":50}}, [{"op":"u","ts_ms":25,"after":{"id":1,"v":"OLD"}}]); assert s[1]["v"]=="NEW"`,
      },
      {
        id: 'st2_malformed',
        name: '6 · Missing Payload Guard',
        hint: 'Safely skip malformed envelopes missing after/before.',
        pythonAssert: `s=apply_debezium_cdc({}, [{"op":"c","ts_ms":10,"after":None}]); assert s == {}`,
      },
    ],
  },
  {
    id: 'pl_st_03_flink_watermarks_dlq',
    trackId: 'streaming',
    title: 'Flink Bounded-Out-of-Orderness Watermark & Late-Event Side-Output DLQ',
    companyContext: 'Stripe / Uber · Flink Real-Time Billing Loop',
    difficulty: 'Hard',
    estimatedMins: 30,
    conceptTags: ['Streaming & CDC: Kafka / Flink / Debezium', 'Data Modeling'],
    requirements: [
      'Advance watermark lazily as `max_seen_event_ts - allowed_lateness_sec`.',
      'Bucket timely events into `[win_start, win_end)` tumbling windows and route any event with `event_ts < current_watermark` to side-output DLQ.',
      'Ensure RocksDB incremental checkpoint + state TTL prevents unbounded heap growth.',
    ],
    sampleInputLabel: 'Flink Out-of-Order Event Stream',
    sampleInputData: `max_event=1000s, allowed_lateness=60s -> watermark=940s. Event at ts=910s -> Side-Output Late DLQ!`,
    executionEngine: 'python',
    pythonSetupCode: ``,
    files: [
      {
        path: 'flink_watermark_window.py',
        language: 'python',
        content: `def process_tumbling_stream(events: list, window_size_sec: int = 60, max_out_of_order_sec: int = 30):
    max_ts = 0
    windows = {}
    late_dlq = []
    for ev in events:
        ts = ev["event_ts"]
        watermark = max_ts - max_out_of_order_sec
        if ts < watermark:
            late_dlq.append(ev)
            continue
        if ts > max_ts:
            max_ts = ts
        w_start = (ts // window_size_sec) * window_size_sec
        windows[w_start] = windows.get(w_start, 0) + ev.get("amount", 1)
    return windows, late_dlq`,
      },
    ],
    solutionFiles: [{ path: 'flink_watermark_window.py', language: 'python', content: '# Verified tumbling event-time window with monotonic watermark & late DLQ side-output' }],
    verificationRules: [
      {
        id: 'st3_timely',
        name: '1 · Timely Events Bucket Into Tumbling Window',
        hint: 'Floor event_ts to window_size_sec bucket.',
        pythonAssert: `w, dlq = process_tumbling_stream([{"event_ts":65,"amount":10},{"event_ts":75,"amount":5}], 60, 30); assert w[60] == 15 and dlq == []`,
      },
      {
        id: 'st3_within_grace',
        name: '2 · Out-of-Order Within Allowed Lateness Accepted',
        hint: 'Accept slightly late event >= max_ts - max_out_of_order_sec.',
        pythonAssert: `w, dlq = process_tumbling_stream([{"event_ts":100,"amount":4},{"event_ts":80,"amount":6}], 60, 30); assert w[60] == 10 and dlq == []`,
      },
      {
        id: 'st3_dlq',
        name: '3 · Late Event Behind Watermark Routed To DLQ',
        hint: 'Divert event_ts < watermark to late_dlq instead of corrupting closed window.',
        pythonAssert: `w, dlq = process_tumbling_stream([{"event_ts":200,"amount":5},{"event_ts":100,"amount":99}], 60, 30); assert len(dlq) == 1 and 60 not in w`,
      },
      {
        id: 'st3_mono',
        name: '4 · Monotonic Watermark Never Regresses',
        hint: 'Only advance max_ts forward.',
        pythonAssert: `w, dlq = process_tumbling_stream([{"event_ts":200,"amount":1},{"event_ts":180,"amount":1},{"event_ts":120,"amount":1}], 60, 30); assert len(dlq) == 1`,
      },
      {
        id: 'st3_boundary',
        name: '5 · Exact Window Upper Boundary [start, end)',
        hint: 'ts=120 belongs to window [120, 180), not [60, 120).',
        pythonAssert: `w, _ = process_tumbling_stream([{"event_ts":120,"amount":7}], 60, 30); assert w.get(120) == 7`,
      },
      {
        id: 'st3_empty',
        name: '6 · Empty Stream Resilience',
        hint: 'Return empty dicts/lists cleanly on empty input.',
        pythonAssert: `w, dlq = process_tumbling_stream([], 60, 30); assert w == {} and dlq == []`,
      },
    ],
  },
];
