import type { Question } from '../types/platform';
import { buildPythonStarterSkeleton } from '../lib/pythonSkeleton';

const ROUND4_MODELING_SQL_QUESTIONS: Question[] = [
  {
    uniqueId: 'r4_01_star_schema_anti_fanout',
    title: 'Prevent Fact-to-Fact Join Fanout in Multi-Grain Order & Shipment Marts',
    problemStatement:
      'Joining `fact_orders(order_id, customer_id, order_amt)` directly to `fact_shipments(shipment_id, order_id, shipping_cost)` causes revenue fanout when an order splits across multiple shipments. Write a query returning one row per `customer_id` with exact `total_order_amt` and `total_shipping_cost` (rounded to 2 decimals), ordered by `customer_id`.',
    domain: 'Dimensional Modeling',
    topic: 'Star Schema & Grain',
    subtopic: 'Multi-Fact Fanout Prevention',
    roadmapTracks: ['Analytical SQL Mastery', 'Data Engineering Core'],
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companyTags: ['Amazon', 'Shopify', 'Flipkart', 'Meta'],
    roundType: 'Dimensional Data Modeling',
    roundNumber: 4,
    evaluationType: 'sql',
    sourceType: 'curated_track',
    sourceReference: "D's platforms Round 4 · Dimensional Data Modeling",
    setupSchemaOrEnv: `CREATE TABLE fact_orders (order_id INTEGER PRIMARY KEY, customer_id TEXT, order_amt REAL);
CREATE TABLE fact_shipments (shipment_id INTEGER PRIMARY KEY, order_id INTEGER, shipping_cost REAL);
INSERT INTO fact_orders VALUES (1, 'c1', 200.0), (2, 'c1', 150.0), (3, 'c2', 300.0);
INSERT INTO fact_shipments VALUES (10, 1, 12.0), (11, 1, 8.0), (12, 2, 10.0), (13, 3, 15.0), (14, 3, 5.0);`,
    adversarialSetupSql: `INSERT INTO fact_orders VALUES (4, 'c3', 100.0);
INSERT INTO fact_shipments VALUES (15, 1, NULL);`,
    sampleInput: 'fact_orders + fact_shipments with split deliveries',
    expectedOutput: 'Executed dynamically against reference query in SQLite Wasm',
    testCases: [{ name: 'Canonical Multi-Grain Rollup', input: 'reference_sql', expected: 'Exact match' }],
    starterCode: `-- Return: customer_id, total_order_amt, total_shipping_cost
-- Tables: fact_orders(order_id, customer_id, order_amt), fact_shipments(shipment_id, order_id, shipping_cost)
SELECT
  -- TODO: aggregate each fact to customer_id grain before joining
;`,
    detailedSolution: `WITH order_agg AS (
  SELECT customer_id, SUM(COALESCE(order_amt, 0.0)) AS total_order_amt
  FROM fact_orders
  GROUP BY customer_id
),
ship_agg AS (
  SELECT o.customer_id, SUM(COALESCE(s.shipping_cost, 0.0)) AS total_shipping_cost
  FROM fact_orders o
  JOIN fact_shipments s ON o.order_id = s.order_id
  GROUP BY o.customer_id
)
SELECT
  oa.customer_id,
  ROUND(oa.total_order_amt, 2) AS total_order_amt,
  ROUND(COALESCE(sa.total_shipping_cost, 0.0), 2) AS total_shipping_cost
FROM order_agg oa
LEFT JOIN ship_agg sa ON oa.customer_id = sa.customer_id
ORDER BY oa.customer_id ASC;`,
    alternativeApproaches:
      'In Kimball Bus Architecture, drill across conformed dimensions by aggregating each fact table independently to the common conformed grain (`customer_id`) before outer-joining.',
    explanation:
      'Joining two facts directly multiplies `order_amt` by the number of shipments per order. Aggregating to the conformed dimension grain before joining guarantees zero fanout.',
    practicalRelevance: 'Top Round 4 Meta/Amazon Data Modeling SQL trap (chasm & fan traps).',
    relatedLearningId: 'topic_data_modeling',
    executionPlanNotes: 'Two separate hash aggregations joined on low-cardinality `customer_id`.',
  },
  {
    uniqueId: 'r4_02_scd2_point_in_time_fact_lookup',
    title: 'Join Fact Transactions to SCD Type-2 Customer Dimension Surrogate Key',
    problemStatement:
      'Given `fact_tx(tx_id, cust_nk, tx_date, amount)` and `dim_cust_scd2(cust_sk, cust_nk, segment, valid_from, valid_to)` (half-open `[valid_from, valid_to)`), resolve each transaction to the exact historical `cust_sk` and `segment` active on `tx_date`. Return `tx_id`, `cust_sk`, `segment`, `amount`, ordered by `tx_id`.',
    domain: 'Dimensional Modeling',
    topic: 'SCD Type 2 & Surrogate Keys',
    subtopic: 'Historical Surrogate Lookup',
    roadmapTracks: ['Analytical SQL Mastery', 'Data Engineering Core'],
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companyTags: ['Snowflake', 'Airbnb', 'Meta', 'Intuit'],
    roundType: 'Dimensional Data Modeling',
    roundNumber: 4,
    evaluationType: 'sql',
    sourceType: 'curated_track',
    sourceReference: "D's platforms Round 4 · Dimensional Data Modeling",
    setupSchemaOrEnv: `CREATE TABLE fact_tx (tx_id INTEGER PRIMARY KEY, cust_nk TEXT, tx_date TEXT, amount REAL);
CREATE TABLE dim_cust_scd2 (cust_sk INTEGER PRIMARY KEY, cust_nk TEXT, segment TEXT, valid_from TEXT, valid_to TEXT);
INSERT INTO dim_cust_scd2 VALUES
  (101, 'u1', 'Bronze', '2026-01-01', '2026-02-01'),
  (102, 'u1', 'Gold', '2026-02-01', '9999-12-31'),
  (201, 'u2', 'Silver', '2026-01-01', '9999-12-31');
INSERT INTO fact_tx VALUES
  (1, 'u1', '2026-01-15', 100.0),
  (2, 'u1', '2026-02-01', 250.0),
  (3, 'u2', '2026-02-10', 80.0);`,
    adversarialSetupSql: `INSERT INTO fact_tx VALUES (4, 'u_late', '2026-02-15', 50.0);`,
    sampleInput: 'fact_tx joined to half-open SCD-2 intervals',
    expectedOutput: 'Executed dynamically against reference query in SQLite Wasm',
    testCases: [{ name: 'Half-Open Interval Boundary', input: 'reference_sql', expected: 'Exact match' }],
    starterCode: `-- Return: tx_id, cust_sk, segment, amount
-- Tables: fact_tx(tx_id, cust_nk, tx_date, amount), dim_cust_scd2(cust_sk, cust_nk, segment, valid_from, valid_to)
SELECT
  -- TODO: join on natural key and half-open [valid_from, valid_to) range
;`,
    detailedSolution: `SELECT
  f.tx_id,
  COALESCE(d.cust_sk, -1) AS cust_sk,
  COALESCE(d.segment, 'Unknown') AS segment,
  f.amount
FROM fact_tx f
LEFT JOIN dim_cust_scd2 d
  ON f.cust_nk = d.cust_nk
  AND f.tx_date >= d.valid_from
  AND f.tx_date < d.valid_to
ORDER BY f.tx_id ASC;`,
    alternativeApproaches:
      'Use an inferred-member `-1` / `Unknown` surrogate key on `LEFT JOIN` so late-arriving facts are never silently dropped by an `INNER JOIN`.',
    explanation:
      'Half-open intervals (`tx_date >= valid_from AND tx_date < valid_to`) ensure exact boundary dates like `2026-02-01` match only the new Gold version (`cust_sk = 102`) with zero overlap.',
    practicalRelevance: 'Core Kimball surrogate-key pipeline lookup for historical BI accuracy.',
    relatedLearningId: 'topic_data_modeling',
    executionPlanNotes: 'Composite index on `(cust_nk, valid_from, valid_to)` accelerates range lookup.',
  },
  {
    uniqueId: 'r4_03_accumulating_snapshot_milestone_sla',
    title: 'Accumulating Snapshot Fact: Order-to-Delivery Milestone Lag',
    problemStatement:
      'An e-commerce accumulating snapshot `fact_order_lifecycle(order_id, placed_date, packed_date, shipped_date, delivered_date)` tracks one row per order updated across milestones. Compute `order_id`, `days_to_ship` (if shipped), `days_to_deliver` (if delivered), and `current_stage` (`DELIVERED`, `SHIPPED`, `PACKED`, `PLACED`), ordered by `order_id`.',
    domain: 'Dimensional Modeling',
    topic: 'Fact Table Types',
    subtopic: 'Accumulating Snapshot Lag',
    roadmapTracks: ['Analytical SQL Mastery', 'Data Engineering Core'],
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companyTags: ['Amazon', 'Flipkart', 'Swiggy', 'Walmart Global Tech'],
    roundType: 'Dimensional Data Modeling',
    roundNumber: 4,
    evaluationType: 'sql',
    sourceType: 'curated_track',
    sourceReference: "D's platforms Round 4 · Dimensional Data Modeling",
    setupSchemaOrEnv: `CREATE TABLE fact_order_lifecycle (order_id INTEGER PRIMARY KEY, placed_date TEXT, packed_date TEXT, shipped_date TEXT, delivered_date TEXT);
INSERT INTO fact_order_lifecycle VALUES
  (1, '2026-03-01', '2026-03-02', '2026-03-03', '2026-03-06'),
  (2, '2026-03-02', '2026-03-03', '2026-03-05', NULL),
  (3, '2026-03-04', '2026-03-04', NULL, NULL);`,
    adversarialSetupSql: `INSERT INTO fact_order_lifecycle VALUES (4, '2026-03-05', NULL, NULL, NULL);`,
    sampleInput: 'fact_order_lifecycle milestone timestamps',
    expectedOutput: 'Executed dynamically against reference query in SQLite Wasm',
    testCases: [{ name: 'Lifecycle Lag Calculation', input: 'reference_sql', expected: 'Exact match' }],
    starterCode: `-- Return: order_id, days_to_ship, days_to_deliver, current_stage
-- Table: fact_order_lifecycle(order_id, placed_date, packed_date, shipped_date, delivered_date)
SELECT
  -- TODO: compute milestone day lags using julianday()
;`,
    detailedSolution: `SELECT
  order_id,
  CAST(julianday(shipped_date) - julianday(placed_date) AS INTEGER) AS days_to_ship,
  CAST(julianday(delivered_date) - julianday(placed_date) AS INTEGER) AS days_to_deliver,
  CASE
    WHEN delivered_date IS NOT NULL THEN 'DELIVERED'
    WHEN shipped_date IS NOT NULL THEN 'SHIPPED'
    WHEN packed_date IS NOT NULL THEN 'PACKED'
    ELSE 'PLACED'
  END AS current_stage
FROM fact_order_lifecycle
ORDER BY order_id ASC;`,
    alternativeApproaches:
      'Accumulating snapshots complement Transaction Facts by holding fixed milestone date FKs (`placed_date_sk`, `shipped_date_sk`) updated via Iceberg/Delta `MERGE`.',
    explanation:
      'Evaluating `CASE` from latest milestone backwards determines `current_stage` cleanly while preserving NULL lags for incomplete orders.',
    practicalRelevance: 'Supply-chain fulfillment funnel and SLA bottleneck modeling.',
    relatedLearningId: 'topic_data_modeling',
    executionPlanNotes: 'Single sequential scan with zero joins.',
  },
  {
    uniqueId: 'r4_04_bridge_table_weighted_attribution',
    title: 'Multi-Valued Dimension Bridge Table With Allocation Weights',
    problemStatement:
      'In SaaS billing, one deal in `fact_deals(deal_id, arr_usd)` can have multiple sales reps in `bridge_deal_rep(deal_id, rep_id, weight)` where weights sum to 1.0. Compute `rep_id` and `weighted_arr` rounded to 2 decimals without double-counting total ARR, ordered by `weighted_arr DESC, rep_id ASC`.',
    domain: 'Dimensional Modeling',
    topic: 'Bridge Tables & Grain',
    subtopic: 'Many-to-Many Weight Allocation',
    roadmapTracks: ['Analytical SQL Mastery', 'Data Engineering Core'],
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companyTags: ['Salesforce', 'Atlassian', 'Snowflake'],
    roundType: 'Dimensional Data Modeling',
    roundNumber: 4,
    evaluationType: 'sql',
    sourceType: 'curated_track',
    sourceReference: "D's platforms Round 4 · Dimensional Data Modeling",
    setupSchemaOrEnv: `CREATE TABLE fact_deals (deal_id INTEGER PRIMARY KEY, arr_usd REAL);
CREATE TABLE bridge_deal_rep (deal_id INTEGER, rep_id TEXT, weight REAL);
INSERT INTO fact_deals VALUES (1, 100000.0), (2, 60000.0);
INSERT INTO bridge_deal_rep VALUES (1, 'rep_a', 0.7), (1, 'rep_b', 0.3), (2, 'rep_b', 0.5), (2, 'rep_c', 0.5);`,
    adversarialSetupSql: `INSERT INTO fact_deals VALUES (3, 40000.0);`,
    sampleInput: 'fact_deals + bridge_deal_rep',
    expectedOutput: 'Executed dynamically against reference query in SQLite Wasm',
    testCases: [{ name: 'Weighted Rollup Integrity', input: 'reference_sql', expected: 'Exact match' }],
    starterCode: `-- Return: rep_id, weighted_arr
-- Tables: fact_deals(deal_id, arr_usd), bridge_deal_rep(deal_id, rep_id, weight)
SELECT
  -- TODO: multiply arr_usd by bridge allocation weight
;`,
    detailedSolution: `SELECT
  b.rep_id,
  ROUND(SUM(d.arr_usd * b.weight), 2) AS weighted_arr
FROM fact_deals d
JOIN bridge_deal_rep b ON d.deal_id = b.deal_id
GROUP BY b.rep_id
ORDER BY weighted_arr DESC, b.rep_id ASC;`,
    alternativeApproaches:
      'Use weight allocation factors for additive financial rollups, or provide an unweighted impact view explicitly labeled as non-additive.',
    explanation:
      'Multiplying by `weight` in the bridge table keeps `SUM(weighted_arr)` reconciled to the exact total company ARR.',
    practicalRelevance: 'Kimball multi-valued bridge pattern for multi-touch attribution, diagnoses, and co-owned accounts.',
    relatedLearningId: 'topic_data_modeling',
    executionPlanNotes: 'PK join on `deal_id` followed by hash aggregation on `rep_id`.',
  },
];

const ROUND4_DESIGN_QUESTIONS: Question[] = [
  {
    uniqueId: 'r4_05_ride_sharing_star_schema',
    title: 'Design a Global Ride-Sharing Trip & Surge Pricing Star Schema',
    problemStatement:
      'Design the dimensional warehouse schema for a ride-sharing platform (Uber/Ola scale). Explicitly cover:\n1. **Fact Table Grain(s)** (trip request vs completed trip vs driver telemetry)\n2. **Conformed Dimensions** (`dim_rider`, `dim_driver`, `dim_geo_hex`, `dim_date`, `dim_vehicle`)\n3. **SCD Strategy** for driver rating tier & vehicle city changes\n4. **Junk & Degenerate Dimensions** (payment method, promo flags, surge bucket)\n5. **Snowflake vs Star vs OBT** trade-offs for PowerBI/Looker vs ML.',
    domain: 'Dimensional Modeling',
    topic: 'Star Schema & Grain',
    subtopic: 'Uber-Scale Dimensional Model',
    roadmapTracks: ['Data Engineering Core'],
    difficulty: 'Hard',
    experienceLevel: '4-6 yrs',
    companyTags: ['Uber', 'Lyft', 'Ola', 'Airbnb'],
    roundType: 'Dimensional Data Modeling',
    roundNumber: 4,
    evaluationType: 'design_rubric',
    sourceType: 'curated_track',
    sourceReference: "D's platforms Round 4 · Dimensional Data Modeling",
    setupSchemaOrEnv: '# Structured Modeling Architecture & DDL Response',
    sampleInput: '100M trips/day · multi-currency fares · driver tier history · BI + ML consumers',
    expectedOutput: 'Explicit grain declaration, Star DDL, SCD-2 strategy, and conformed metric guardrails',
    testCases: [],
    starterCode: `## 1. Declared Fact Grain\n- Primary Fact Table (fct_trips): One row per ...\n\n## 2. Fact & Dimension Tables (DDL / Keys)\n- fct_trips(trip_id, rider_sk, driver_sk, pickup_hex_sk, ...)\n\n## 3. SCD Strategy (Type 1 vs Type 2)\n- ...\n\n## 4. Conformed Metrics & OBT Serving Trade-offs\n- ...`,
    detailedSolution: `### Model Solution: Ride-Sharing Star Schema
1. **Explicit Fact Grain**:
   - \`fct_trip_requests\` (1 row per ride request — captures cancellations & conversion rate)
   - \`fct_trips\` (1 row per completed/billed trip — additive fares, surge multiplier, distance, duration, USD-normalized amounts)
2. **Conformed Dimensions & Keys**:
   - \`dim_rider(rider_sk, rider_id, signup_cohort, valid_from, valid_to, is_current)\`
   - \`dim_driver(driver_sk, driver_id, home_city, rating_tier, valid_from, valid_to, is_current)\` -> **SCD Type 2** because historical trips must reflect the driver's tier/city at trip timestamp.
   - \`dim_geo_h3(h3_sk, h3_index, city, zone_name, country)\`
   - \`dim_date\` & \`dim_time_of_day\`
   - \`dim_trip_flags\` (**Junk Dimension** consolidating low-cardinality booleans: \`is_pool\`, \`is_airport\`, \`payment_type\`, \`promo_applied\`) + \`trip_id\` as a **Degenerate Dimension**.
3. **Multi-Currency & Fanout Guardrail**: Store both local currency + \`fx_rate_at_trip\` + \`fare_usd\`. Keep split payments/tips in a separate bridge or line-item fact if 1:N.
4. **Serving Trade-off**: Keep Kimball Star in Gold Silver-to-Gold warehouse for conformed governance, and materialize an **OBT (One Big Table)** projection in Snowflake/BigQuery/ClickHouse for sub-second self-serve BI.`,
    alternativeApproaches: 'Compare Kimball Star Schema against Data Vault 2.0 (Hubs/Links/Satellites) when ingesting from 15+ ERP/microservice sources.',
    explanation: 'Interviewers fail candidates who jump straight into listing tables before declaring exact fact grain.',
    practicalRelevance: 'Standard Round 4 Data Modeling question at Uber, Airbnb, and Meta.',
    relatedLearningId: 'topic_data_modeling',
    executionPlanNotes: 'Evaluated on grain clarity, SCD-2 correctness, and anti-fanout separation.',
  },
  {
    uniqueId: 'r4_06_scd4_mini_dimension_high_churn',
    title: 'Prevent Dimension Bloat: SCD Type 4 Mini-Dimension for 100M User Profiles',
    problemStatement:
      'Your `dim_user` table has 100M rows. Slow attributes (`email`, `country`, `signup_date`) rarely change, while behavioral attributes (`engagement_band`, `credit_score_tier`, `ltv_bucket`) change daily. Explain why pure SCD Type 2 explodes table size to 36B rows/year and design an **SCD Type 4 (Mini-Dimension + Outrigger)** solution with lookup pipeline logic.',
    domain: 'Dimensional Modeling',
    topic: 'SCD Type 2 & Surrogate Keys',
    subtopic: 'SCD Type 4 Mini-Dimension',
    roadmapTracks: ['Data Engineering Core'],
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companyTags: ['Meta', 'Netflix', 'LinkedIn', 'Snowflake'],
    roundType: 'Dimensional Data Modeling',
    roundNumber: 4,
    evaluationType: 'design_rubric',
    sourceType: 'curated_track',
    sourceReference: "D's platforms Round 4 · Dimensional Data Modeling",
    setupSchemaOrEnv: '# Staff Dimensional Modeling Exercise',
    sampleInput: '100M users × 365 daily attribute changes = 36.5B SCD-2 rows/year',
    expectedOutput: 'Banded mini-dimension design splitting volatile vs stable attributes',
    testCases: [],
    starterCode: `## 1. Why Pure SCD-2 Fails Here\n- ...\n\n## 2. SCD Type 4 Table Split\n- dim_user_core: ...\n- dim_user_profile_band (Mini-Dimension): ...\n\n## 3. Fact Table Foreign Keys & Query Pattern\n- ...`,
    detailedSolution: `### Model Solution: SCD Type 4 Mini-Dimension
1. **Failure of Pure SCD-2**: Tracking daily changes on 100M users inserts 100M new rows/day (~36.5B rows/year), destroying join performance and storage.
2. **SCD Type 4 Split**:
   - \`dim_user_core\` (100M rows, SCD Type 1/2 only on rare attributes like \`country\`, \`account_type\`).
   - \`dim_user_behavior_mini\` (bounded Cartesian product of banded ranges, e.g. 5 engagement bands × 10 LTV buckets × 5 risk tiers = **250 static rows** with \`behavior_profile_sk\`).
3. **Fact Linkage**: Store **both** \`user_sk\` and \`behavior_profile_sk\` directly on \`fct_events\` / \`fct_daily_account_snapshot\` at event time so historical segmentation queries filter a 250-row dimension with zero billion-row range joins!`,
    alternativeApproaches: 'SCD Type 6 (1+2+3 hybrid) or monthly periodic snapshot fact with banded buckets.',
    explanation: 'Banding volatile continuous attributes into a finite mini-dimension eliminates billion-row SCD churn.',
    practicalRelevance: 'Senior/Staff Data Modeling differentiator at Meta and LinkedIn.',
    relatedLearningId: 'topic_data_modeling',
    executionPlanNotes: 'Tests awareness of cardinality explosion and Kimball SCD Type 4.',
  },
];

const ROUND5_SYSTEM_DESIGN_QUESTIONS: Question[] = [
  {
    uniqueId: 'r5_01_uber_realtime_surge_lakehouse',
    title: 'Design Real-Time Ride Surge Pricing & Geospatial Lakehouse (500K Events/Sec)',
    problemStatement:
      'Design an end-to-end streaming + lakehouse platform processing **500K GPS pings & trip state events/sec** with **<2s end-to-end freshness** for live surge multipliers and **100% reproducible historical backfills** for ML/Finance.\n\nCover: Sizing (MB/s & TB/day), Ingestion (Kafka partitioning & hot-city skew), Stream Compute (Flink watermarks, RocksDB state, allowed lateness + DLQ), Lakehouse Sink (Iceberg MoR + compaction), and Online Serving.',
    domain: 'Data System Design',
    topic: 'Streaming Architecture',
    subtopic: 'Low-Latency Geospatial Pipeline',
    roadmapTracks: ['Data Engineering Core'],
    difficulty: 'Hard',
    experienceLevel: '4-6 yrs',
    companyTags: ['Uber', 'Databricks', 'Confluent', 'Swiggy'],
    roundType: 'System Design',
    roundNumber: 5,
    evaluationType: 'design_rubric',
    sourceType: 'curated_track',
    sourceReference: "D's platforms Round 5 · End-to-End Data System Design",
    setupSchemaOrEnv: '# Interactive System Design Architecture Prompt',
    sampleInput: '500K events/s · ~300B/event = 150 MB/s · ~13 TB/day raw · P99 < 2s online freshness',
    expectedOutput: 'Capacity math, Kafka -> Flink -> Redis/Iceberg architecture, skew & late-data handling',
    testCases: [],
    starterCode: `## 1. Back-of-the-Envelope Sizing\n- Ingestion bandwidth: ...\n- Daily / Yearly Storage (compressed Parquet): ...\n\n## 2. Ingestion & Partitioning Strategy\n- Kafka topic partitioning (handling mega-city hot keys): ...\n\n## 3. Stateful Stream Processing (Flink)\n- Windowing, Watermarks, Allowed Lateness & DLQ: ...\n\n## 4. Storage, Compaction & Backfill Reproducibility\n- Iceberg Merge-on-Read vs Copy-on-Write: ...`,
    detailedSolution: `### Model Solution: Real-Time Surge & Lakehouse
1. **Capacity Math**: 500K events/s × 300B = 150 MB/s (~13 TB/day raw, ~3 TB/day Zstd Parquet). With 3x Kafka replication = 450 MB/s broker write throughput (~120–200 Kafka partitions).
2. **Hot-Key Partitioning**: Partition raw GPS stream by \`geohash_precision_6\` or \`city_id + hash(driver_id) % 8\` so mega-cities (NYC, Bengaluru) do not saturate single Kafka brokers or Flink task slots.
3. **Flink Stateful Windows**: 5-minute sliding window (1-min slide) using \`RocksDBStateBackend\` + incremental S3 checkpoints every 30s. Watermark = \`max_event_ts - 15s\`; allowed lateness = \`60s\` updating online Redis TTL keys; ultra-late events routed to side-output DLQ for batch reconciliation.
4. **Dual Serving + Reproducibility**: Online surge service reads Flink -> Redis/Pinot (<10ms). Raw + Silver append to **Apache Iceberg (Merge-on-Read)** with hourly async compaction & Z-Order on \`(city_id, event_date)\`, enabling Kafka/Iceberg time-travel replay for ML training parity.`,
    alternativeApproaches: 'Spark Structured Streaming micro-batch (cheaper ops, ~5-10s latency) vs Flink continuous streaming (<1s latency).',
    explanation: 'Separates fast-path operational serving from immutable Lakehouse auditability without Lambda dual-codebases (Kappa pattern).',
    practicalRelevance: 'Flagship Round 5 prompt at Uber, DoorDash, Swiggy, and Confluent.',
    relatedLearningId: 'topic_streaming_kafka_flink',
    executionPlanNotes: 'Scored on math accuracy, skew mitigation, state backend sizing, and failure recovery.',
  },
  {
    uniqueId: 'r5_02_fintech_zero_loss_cdc_lakehouse',
    title: 'Design Zero-Loss Fintech Payment Settlement & CDC Reconciliation Pipeline',
    problemStatement:
      'Design a Tier-0 financial ledger pipeline capturing 100K TPS OLTP Postgres mutations into an Iceberg + Snowflake analytical platform. Requirements:\n- Zero silent row loss or duplicate financial amounts\n- Out-of-order updates and hard delete tombstones\n- Write-Audit-Publish (WAP) blocking corrupted batches from executive/regulatory marts\n- Automated T+0 vs T+1 reconciliation.',
    domain: 'Data System Design',
    topic: 'CDC & Lakehouse',
    subtopic: 'Zero-Loss Financial Pipeline',
    roadmapTracks: ['Data Engineering Core'],
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companyTags: ['Stripe', 'PhonePe', 'Razorpay', 'Airbnb'],
    roundType: 'System Design',
    roundNumber: 5,
    evaluationType: 'design_rubric',
    sourceType: 'curated_track',
    sourceReference: "D's platforms Round 5 · End-to-End Data System Design",
    setupSchemaOrEnv: '# Interactive Financial Pipeline Architecture Prompt',
    sampleInput: '100K TPS OLTP Postgres -> Debezium -> Kafka -> Iceberg WAP -> Snowflake',
    expectedOutput: 'Transactional Outbox + Debezium LSN ordering + WAP branching + checksum reconciliation',
    testCases: [],
    starterCode: `## 1. CDC Capture & Ordering Guarantees\n- Debezium WAL slot + Transactional Outbox: ...\n\n## 2. Delivery & Idempotency (Kafka -> Silver)\n- LSN deduplication & tombstone handling: ...\n\n## 3. Write-Audit-Publish (WAP) Quality Gate\n- Iceberg Nessie/Branching assertions & quarantine: ...\n\n## 4. T+0 / T+1 Reconciliation & FinOps\n- ...`,
    detailedSolution: `### Model Solution: Zero-Loss Financial CDC
1. **Capture**: Postgres logical replication slot + Debezium Outbox table guarantees commit-order LSN events; Schema Registry enforces \`BACKWARD\` compatibility.
2. **Idempotent Silver MERGE**: Kafka partitioned by \`account_id\` (\`acks=all\`, \`min.insync.replicas=2\`). Silver Spark job deduplicates within micro-batch by \`MAX(lsn)\`, keeps \`op='D'\` tombstones until MERGE executes, then deletes/soft-expires target rows.
3. **Write-Audit-Publish (WAP)**: Stage changes onto an **Iceberg audit branch** (\`audit_run_123\`). Run Soda/dbt contracts (primary key uniqueness, \`SUM(debit) == SUM(credit)\`, zero negative balances). Only fast-forward \`main\` branch tag if 100% pass; otherwise page on-call and quarantine bad keys.
4. **Reconciliation**: Nightly Spark job computes per-partition row counts & SHA-256 monetary checksums against OLTP read-replica snapshots.`,
    alternativeApproaches: 'Snowpipe Streaming + Dynamic Tables vs Spark Structured Streaming + Iceberg WAP.',
    explanation: 'Financial pipelines prioritize correctness & auditability over sub-second latency; WAP branching prevents dirty reads during audits.',
    practicalRelevance: 'Core Round 5 interview at Stripe, Razorpay, PhonePe, and Visa.',
    relatedLearningId: 'topic_lakehouse_formats',
    executionPlanNotes: 'Evaluated on LSN ordering, tombstone safety, WAP gates, and reconciliation.',
  },
  {
    uniqueId: 'r5_03_clickstream_backfill_reprocessing',
    title: 'Design Multi-Petabyte Clickstream Pipeline With Idempotent 90-Day Backfills',
    problemStatement:
      'Design a product analytics pipeline ingesting 2B events/day from mobile & web SDKs. A bug in sessionization attribution requires re-computing the past 90 days (~180B events) without impacting live dashboards or blowing up cloud warehouse bills.',
    domain: 'Data System Design',
    topic: 'Batch & Backfill Architecture',
    subtopic: 'Idempotent Reprocessing & Cost Control',
    roadmapTracks: ['Data Engineering Core'],
    difficulty: 'Hard',
    experienceLevel: '4-6 yrs',
    companyTags: ['Netflix', 'Meta', 'Atlassian', 'Google'],
    roundType: 'System Design',
    roundNumber: 5,
    evaluationType: 'design_rubric',
    sourceType: 'curated_track',
    sourceReference: "D's platforms Round 5 · End-to-End Data System Design",
    setupSchemaOrEnv: '# Interactive Backfill & Lakehouse Design Prompt',
    sampleInput: '2B events/day · 90-day backfill = 180B rows · zero dashboard downtime',
    expectedOutput: 'Immutable Bronze replay, atomic partition swap, chunked Airflow DAGs, spot compute',
    testCases: [],
    starterCode: `## 1. Immutable Bronze Partitioning\n- ...\n\n## 2. Zero-Downtime Backfill & Atomic Swap\n- ...\n\n## 3. Chunked Orchestration & Concurrency Limits\n- ...\n\n## 4. Cost Sizing (Spot Nodes & Incremental Pruning)\n- ...`,
    detailedSolution: `### Model Solution: 180B-Row Idempotent Backfill
1. **Immutable Bronze**: Partition raw events by \`ingest_date\` (Iceberg hidden partitioning \`days(event_ts)\`) in Zstd Parquet on S3.
2. **Atomic Partition Overwrite**: Never mutate live Gold tables row-by-row. Run backfill into a shadow version / Iceberg WAP branch or use \`replaceWhere\` / dynamic partition overwrite per \`event_date\` so dashboards read consistent snapshots until swap.
3. **Chunked Orchestration**: Use Airflow/Dagster dynamic task mapping chunked into 3-day windows with \`max_active_tasks=8\` so warehouse slots and downstream BI caches aren't starved.
4. **FinOps Control**: Route backfill Spark jobs onto AWS Spot/Preemptible Graviton workers with Shuffle Service/Celeborn remote shuffle so node preemption does not lose stage progress.`,
    alternativeApproaches: 'dbt incremental microbatch strategy vs Spark Iceberg \`CALL system.rewrite_data_files\` + \`replaceWhere\`.',
    explanation: 'Functional idempotency (`INSERT OVERWRITE` / `replaceWhere` per partition) turns scary multi-month backfills into safe, repeatable runs.',
    practicalRelevance: 'Tested heavily at Netflix, Airbnb, and Meta.',
    relatedLearningId: 'topic_lakehouse_formats',
    executionPlanNotes: 'Evaluated on blast-radius isolation, chunking, and compute FinOps.',
  },
  {
    uniqueId: 'r5_04_ecommerce_inventory_ad_attribution',
    title: 'Design Real-Time Ad Click-to-Purchase Attribution With 7-Day Late Windows',
    problemStatement:
      'Users click an ad on Monday and purchase up to 7 days later. Ingest 200K ad clicks/sec and 10K purchases/sec. Join clicks to purchases in near real time without blowing up Flink/Spark streaming join state memory.',
    domain: 'Data System Design',
    topic: 'Streaming Architecture',
    subtopic: 'Long-Window Stream Enrichment',
    roadmapTracks: ['Data Engineering Core'],
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companyTags: ['Google', 'Meta', 'Amazon', 'Flipkart'],
    roundType: 'System Design',
    roundNumber: 5,
    evaluationType: 'design_rubric',
    sourceType: 'curated_track',
    sourceReference: "D's platforms Round 5 · End-to-End Data System Design",
    setupSchemaOrEnv: '# Long-TTL Stream Join Architecture',
    sampleInput: '200K clicks/s × 7 days = ~120B clicks state if naive stream-stream join',
    expectedOutput: 'Hybrid Hot RocksDB/Redis + Cold Iceberg Async Lookup Join',
    testCases: [],
    starterCode: `## 1. Why Naive 7-Day Flink Stream-Stream Join Explodes\n- State math: ...\n\n## 2. Two-Tier Hot/Cold Attribution Join\n- Fast path (0–24h): ...\n- Cold path (1–7 days): ...\n\n## 3. Multi-Touch Deduplication & Late Purchases\n- ...`,
    detailedSolution: `### Model Solution: 7-Day Ad Attribution
1. **State Math**: Retaining 200K clicks/s × 86,400s × 7 days = **121 billion clicks** (~36 TB raw state!) inside Flink in-memory/RocksDB state causes massive checkpoint amplification.
2. **Tiered Lookup Architecture**:
   - Store only the **latest N click keys per user** (compact Bloom + last-touch/session vector) in RocksDB/Aerospike/Redis for 24h (catches ~85% of purchases in <5ms).
   - Purchases without a hot hit emit to an **async Iceberg/ClickHouse indexed lookup** or hourly Spark incremental ASOF join over partitioned 7-day click tables!
3. **Deduplication**: Key purchases by \`order_id\` in an idempotent sink so late retries emit updated attribution adjustments rather than double-counting revenue.`,
    alternativeApproaches: 'ClickHouse / StarRocks Materialized Views vs Flink Async I/O + Aerospike SSD.',
    explanation: 'Recognizing when NOT to hold 7 days of raw high-volume stream-stream state in Flink is a classic Staff-level insight.',
    practicalRelevance: 'Ads & E-commerce data engineering staple at Google, Meta, Amazon, and Flipkart.',
    relatedLearningId: 'topic_streaming_kafka_flink',
    executionPlanNotes: 'Evaluated on state sizing math and hybrid hot/cold join architecture.',
  },
];

const ROUND6_RCA_BEHAVIORAL_QUESTIONS: Question[] = [
  {
    uniqueId: 'r6_01_incident_spark_99_stuck_oom',
    title: 'SEV-1 Incident RCA: Spark Hourly Gold Job Stuck at 199/200 Tasks & Executor OOM',
    problemStatement:
      '**Incident Alert:** Your company\'s hourly revenue Spark job normally finishes in 11 minutes. Today it has been stuck at task `199/200` for 75 minutes, spilling 180 GB to disk before executors crash with `Container killed by YARN/K8s for exceeding memory limits (OOM)`.\n\nProvide a structured **Production Triage & Root-Cause Analysis**:\n1. Immediate telemetry checks in Spark UI\n2. Likely root causes (null join key skew vs broadcast failure vs distinct explosion)\n3. Immediate containment fix vs permanent code fix\n4. Prevention guardrails.',
    domain: 'Incident RCA & Behavioral',
    topic: 'Production Triage & RCA',
    subtopic: 'Spark Shuffle Skew & OOM',
    roadmapTracks: ['Data Engineering Core'],
    difficulty: 'Hard',
    experienceLevel: '4-6 yrs',
    companyTags: ['Databricks', 'Uber', 'Netflix', 'Amazon'],
    roundType: 'Incident RCA & Behavioral',
    roundNumber: 6,
    evaluationType: 'design_rubric',
    sourceType: 'curated_track',
    sourceReference: "D's platforms Round 6 · Incident RCA & Behavioral",
    setupSchemaOrEnv: '# SEV-1 Production Incident Triage',
    sampleInput: '199/200 tasks done in 2m · 1 task reads 180GB shuffle · Executor OOM 137',
    expectedOutput: 'Spark UI skew diagnosis, NULL/bot key isolation, AQE + salting fix, alerting',
    testCases: [],
    starterCode: `## 1. Spark UI Triage Signals\n- ...\n\n## 2. Root Cause Hypothesis\n- ...\n\n## 3. Immediate Mitigation vs Permanent Fix\n- ...\n\n## 4. Prevention & SLA Guardrails\n- ...`,
    detailedSolution: `### Model Triage & RCA
1. **Spark UI Verification**: Inspect Stage summary min/median/max task duration & shuffle read bytes. One task receiving 180 GB while median is 200 MB confirms **extreme key skew** (commonly \`user_id IS NULL\`, \`-1\`, or a scraper/bot ID).
2. **Root Cause**: A join or \`GROUP BY\` / \`COUNT(DISTINCT)\` routed all NULL or default sentinel keys to a single partition. Spark AQE \`skewJoin\` only splits skewed *joins* (not skewed aggregations or disabled AQE/non-equi joins).
3. **Fix**:
   - **Immediate**: Filter/separate NULLs before join (\`UNION ALL\` null branch) or quarantine bot ID; enable \`spark.sql.adaptive.enabled=true\` & \`skewJoin.enabled=true\`.
   - **Permanent**: Two-stage **Salted Aggregation / Partial Salted Join** (append \`_salt = rand() % 32\` for top skewed keys, aggregate partially, then drop salt) + upstream DQ contract rejecting unexpected NULL bursts.
4. **Prevention**: Track partition skew ratio (\`max_bytes / median_bytes\`) in observability metrics and enforce memory-spill alarms.`,
    alternativeApproaches: 'BroadcastHashJoin if the dimension side fits comfortably inside driver/executor memory (`autoBroadcastJoinThreshold`).',
    explanation: 'Clear separation between Spark UI verification, immediate SLA recovery, and permanent architectural remediation.',
    practicalRelevance: 'Most frequently asked PySpark incident scenario across Tier-1 loops.',
    relatedLearningId: 'topic_query_engines',
    executionPlanNotes: 'Evaluated on diagnostic precision and concrete Spark config/code remediation.',
  },
  {
    uniqueId: 'r6_02_incident_iceberg_small_files_cost',
    title: 'SEV-2 Cost & Latency Spike: Iceberg Table Queries Degraded 12x Overnight',
    problemStatement:
      '**Incident Alert:** A Flink streaming job writes to an Apache Iceberg table every 60 seconds. Over 3 weeks, Snowflake/Trino read queries on the table slowed from 4s to 52s and S3 API GET/LIST costs spiked 10x.\n\nDiagnose the root cause, quantify why metadata planning stalled, and design a zero-downtime compaction + snapshot expiration fix.',
    domain: 'Incident RCA & Behavioral',
    topic: 'Production Triage & RCA',
    subtopic: 'Iceberg Small-Files Explosion',
    roadmapTracks: ['Data Engineering Core'],
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companyTags: ['Netflix', 'Apple', 'Snowflake', 'Databricks'],
    roundType: 'Incident RCA & Behavioral',
    roundNumber: 6,
    evaluationType: 'design_rubric',
    sourceType: 'curated_track',
    sourceReference: "D's platforms Round 6 · Incident RCA & Behavioral",
    setupSchemaOrEnv: '# Lakehouse Metadata & Small-Files Incident',
    sampleInput: '60s micro-commits × 30 days × 48 partitions = 2M+ tiny 40KB Parquet files',
    expectedOutput: 'Manifest bloat diagnosis, bin-pack compaction, expire_snapshots, writer tuning',
    testCases: [],
    starterCode: `## 1. Root Cause (Why Metadata & S3 Costs Exploded)\n- ...\n\n## 2. Zero-Downtime Remediation (Iceberg Procedures)\n- ...\n\n## 3. Long-Term Writer & Maintenance Architecture\n- ...`,
    detailedSolution: `### Model Triage & RCA
1. **Root Cause**: Writing every 60s across dozens of partitions creates millions of tiny KB-sized Parquet files plus thousands of unmerged Iceberg manifest lists. Trino/Snowflake spend 90% of query wall-time opening Parquet footers and issuing S3 HEAD/GET requests.
2. **Immediate Remediation**: Run asynchronous \`rewrite_data_files\` (bin-pack strategy targeting 256–512 MB files) + \`rewrite_manifests\` + \`expire_snapshots\` (retaining 7 days for time travel) + \`remove_orphan_files\`.
3. **Long-Term Prevention**:
   - Use **fanout/hash partition distribution** in Flink/Spark writers to reduce files per checkpoint.
   - Use **Merge-on-Read (MoR)** for streaming upserts so positional delete files stay cheap, paired with scheduled hourly/daily compaction jobs.`,
    alternativeApproaches: 'Delta Lake \`OPTIMIZE\` + \`Auto Compaction\` or Snowflake Snowpipe Streaming automated micro-partition clustering.',
    explanation: 'Demonstrates deep hands-on mastery of open Lakehouse file/manifest internals.',
    practicalRelevance: 'Standard Lakehouse production troubleshooting question.',
    relatedLearningId: 'topic_lakehouse_formats',
    executionPlanNotes: 'Evaluated on Iceberg manifest mechanics and safe snapshot expiration.',
  },
  {
    uniqueId: 'r6_03_project_defense_why_x_over_y',
    title: 'Project Defense: Defend Your Hardest Architecture Decision ("Why X Over Y?")',
    problemStatement:
      'Prepare and test your **Flagship Resume Project Defense** for Hiring Manager / Staff Architecture rounds:\n- 90-second executive pitch with quantified scale (TB/day, latency SLA, business impact)\n- Core architectural choice ("Why Iceberg over Delta/Hudi?", "Why Flink over Spark Streaming?", or "Why Star Schema over OBT?")\n- What broke in production and what you would redesign today.',
    domain: 'Incident RCA & Behavioral',
    topic: 'Project Defense & STAR',
    subtopic: 'Staff Architecture Justification',
    roadmapTracks: ['Data Engineering Core'],
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companyTags: ['Google', 'Meta', 'Uber', 'Atlassian'],
    roundType: 'Incident RCA & Behavioral',
    roundNumber: 6,
    evaluationType: 'design_rubric',
    sourceType: 'curated_track',
    sourceReference: "D's platforms Round 6 · Project Defense & Behavioral",
    setupSchemaOrEnv: '# Hiring Manager Project Defense Evaluator',
    sampleInput: 'Explain scale, SLA, trade-offs, failure recovery, and measurable ROI',
    expectedOutput: 'Crisp 90s pitch + rigorous trade-off matrix + honest failure reflection',
    testCases: [],
    starterCode: `## 1. 90-Second Executive Pitch (Scale + Impact)\n- ...\n\n## 2. Key Architecture Trade-off ("Why X over Y?")\n- Option chosen vs rejected alternative & constraints:\n\n## 3. Hardest Production Failure & Postmortem Lesson\n- ...`,
    detailedSolution: `### Staff-Bar Project Defense Structure
- **Scale & Impact**: Anchor immediately with hard numbers (e.g., *"Migrated 45 TB/day across 180 pipelines to Iceberg, cutting Snowflake/EMR spend by 42% and tightening P99 SLA from 4h to 18m"*).
- **Why X over Y**: Frame around constraints (multi-engine Trino+Spark readers -> Iceberg open REST catalog; <2s stateful windowing -> Flink over micro-batch). Never say "X is always better" — state exact break-even thresholds.
- **Honest Failure**: Describe a real bottleneck (e.g., forgetting \`expire_snapshots\` or missing DLQ on schema drift) and the systemic contract you built afterwards.`,
    alternativeApproaches: 'Use the "Context -> Constraint -> Trade-off -> Outcome" arc rather than listing tools chronologically.',
    explanation: 'Tier-1 interviewers reject project walkthroughs that sound like buzzword lists without trade-offs.',
    practicalRelevance: 'Mandatory Hiring Manager round across all Senior/Staff DE loops.',
    relatedLearningId: 'topic_cloud_governance_finops',
    executionPlanNotes: 'Evaluated by Gemini Staff Rubric on clarity, metrics, and trade-off honesty.',
  },
  {
    uniqueId: 'r6_04_behavioral_star_upstream_breakage',
    title: 'STAR Behavioral: Navigating Upstream Schema Breakage & Cross-Team Conflict',
    problemStatement:
      'Answer using the **STAR (Situation, Task, Action, Result)** framework:\n*"Tell me about a time an upstream product/service team repeatedly broke your critical data pipelines or disagreed with your data contract proposal. How did you resolve the immediate fire and build lasting organizational alignment?"*',
    domain: 'Incident RCA & Behavioral',
    topic: 'Project Defense & STAR',
    subtopic: 'Cross-Team Ownership & Contracts',
    roadmapTracks: ['Data Engineering Core'],
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companyTags: ['Amazon', 'Google', 'Microsoft', 'PhonePe'],
    roundType: 'Incident RCA & Behavioral',
    roundNumber: 6,
    evaluationType: 'design_rubric',
    sourceType: 'curated_track',
    sourceReference: "D's platforms Round 6 · Incident RCA & Behavioral",
    setupSchemaOrEnv: '# Amazon Leadership / Staff Behavioral Rubric',
    sampleInput: 'Situation -> Task -> Action (influence without authority) -> Quantified Result',
    expectedOutput: 'Empathetic alignment + CI schema gates + measurable reduction in SEV pages',
    testCases: [],
    starterCode: `## Situation & Stakes\n- ...\n\n## Task & Conflict\n- ...\n\n## Action (Technical + Stakeholder Alignment)\n- ...\n\n## Quantified Result\n- ...`,
    detailedSolution: `### Staff Behavioral Benchmark (STAR)
- **Situation**: Downstream executive revenue dashboards missed 8 AM SLA 3 times in a month due to silent microservice column drops/renames.
- **Action**: Instead of demanding product engineers slow down, partnered with backend leads to add lightweight Protobuf/JSON Schema Registry CI checks on PRs + automated quarantine routing (WAP) in our ingestion layer so malformed events never crashed the DAG.
- **Result**: Eliminated schema-related SEV-1s by 100% over 2 quarters while cutting cross-team incident triage time from 6 hrs/week to zero.`,
    alternativeApproaches: 'Frame around Amazon Leadership Principles: *Ownership*, *Earn Trust*, and *Insist on the Highest Standards*.',
    explanation: 'Senior+ engineers solve recurring technical pain with socio-technical guardrails, not manual heroics.',
    practicalRelevance: 'Core Amazon Bar-Raiser & Google Googleyness/Leadership prompt.',
    relatedLearningId: 'topic_cloud_governance_finops',
    executionPlanNotes: 'Evaluated on ownership, influence without authority, and measurable result.',
  },
];

const ROUND7_SQL_LAB_QUESTIONS: Question[] = [
  {
    uniqueId: 'r7_01_idempotent_sql_upsert_cdc',
    title: 'Lab: Idempotent Incremental SQL Snapshot With Late Tombstone Handling',
    problemStatement:
      'You are building a Silver SQL pipeline step combining existing `silver_users(user_id, plan, updated_ts)` with incoming incremental CDC staging rows `stg_cdc(user_id, plan, op, event_ts)` (`op` in `I`, `U`, `D`). Produce the exact post-merge active state of `silver_users` (`user_id, plan, updated_ts`), ignoring older out-of-order staging rows (`stg.event_ts <= existing.updated_ts`) and removing rows whose latest event is `op = \'D\'`. Order by `user_id`.',
    domain: 'Engineering Labs',
    topic: 'Incremental Ingestion & CDC',
    subtopic: 'Idempotent SQL Merge Logic',
    roadmapTracks: ['Analytical SQL Mastery', 'Data Engineering Core'],
    difficulty: 'Hard',
    experienceLevel: '4-6 yrs',
    companyTags: ['Databricks', 'Snowflake', 'Airbnb', 'Uber'],
    roundType: 'Engineering Lab',
    roundNumber: 7,
    evaluationType: 'sql',
    sourceType: 'curated_track',
    sourceReference: "D's platforms Round 7 · Practical Pipeline & DQ Lab",
    setupSchemaOrEnv: `CREATE TABLE silver_users (user_id TEXT PRIMARY KEY, plan TEXT, updated_ts TEXT);
CREATE TABLE stg_cdc (user_id TEXT, plan TEXT, op TEXT, event_ts TEXT);
INSERT INTO silver_users VALUES ('u1', 'pro', '2026-05-01 10:00:00'), ('u2', 'free', '2026-05-01 09:00:00');
INSERT INTO stg_cdc VALUES
  ('u1', 'free', 'U', '2026-05-01 08:00:00'),
  ('u2', 'pro', 'U', '2026-05-01 11:00:00'),
  ('u2', 'enterprise', 'U', '2026-05-01 12:00:00'),
  ('u3', 'pro', 'I', '2026-05-01 10:30:00'),
  ('u3', 'pro', 'D', '2026-05-01 10:45:00');`,
    adversarialSetupSql: `INSERT INTO stg_cdc VALUES ('u1', 'enterprise', 'U', '2026-05-01 10:00:00'), ('u4', 'free', 'I', '2026-05-01 13:00:00');`,
    sampleInput: 'silver_users + out-of-order stg_cdc with duplicates and tombstones',
    expectedOutput: 'Executed dynamically against reference query in SQLite Wasm',
    testCases: [{ name: 'Idempotent Merge Snapshot', input: 'reference_sql', expected: 'Exact match' }],
    starterCode: `-- Return: user_id, plan, updated_ts (active post-merge Silver state)
-- Tables: silver_users(user_id, plan, updated_ts), stg_cdc(user_id, plan, op, event_ts)
SELECT
  -- TODO: combine existing silver + latest staging per user_id, handling stale updates & deletes
;`,
    detailedSolution: `WITH unioned AS (
  SELECT user_id, plan, 'U' AS op, updated_ts AS event_ts, 0 AS prio
  FROM silver_users
  UNION ALL
  SELECT user_id, plan, op, event_ts, 1 AS prio
  FROM stg_cdc
),
ranked AS (
  SELECT
    user_id, plan, op, event_ts,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY event_ts DESC, prio ASC) AS rn
  FROM unioned
)
SELECT user_id, plan, event_ts AS updated_ts
FROM ranked
WHERE rn = 1 AND op != 'D'
ORDER BY user_id ASC;`,
    alternativeApproaches:
      'In Delta/Iceberg/Snowflake, deduplicate `stg_cdc` via `QUALIFY ROW_NUMBER() = 1` first, then run `MERGE INTO silver_users ... WHEN MATCHED AND s.event_ts > t.updated_ts ...`.',
    explanation:
      'Ordering by `(event_ts DESC, prio ASC)` guarantees idempotency when an identical timestamp replays, and checking `op != \'D\'` after `rn = 1` prevents deleted keys from resurrecting.',
    practicalRelevance: 'Production dbt incremental merge & Iceberg CDC ingestion contract.',
    relatedLearningId: 'topic_lakehouse_formats',
    executionPlanNotes: 'Single partition sort over unioned Silver + staging micro-batch.',
  },
];

const ROUND8_AI_GOV_FINOPS_QUESTIONS: Question[] = [
  {
    uniqueId: 'r8_01_rag_vector_chunk_dedup_python',
    title: 'Lab: Incremental RAG Document Chunker & Cosine Similarity Top-K Retriever',
    problemStatement:
      'Implement two functions for an incremental RAG pipeline:\n1. `chunk_text(doc_id, text, chunk_size, overlap)` returning `[{"chunk_id": f"{doc_id}_{idx}", "text": chunk, "sha": sha256_prefix}]` using sliding step `chunk_size - overlap`.\n2. `top_k_cosine(query_vec, chunks_with_vecs, k)` computing exact cosine similarity against `[(chunk_id, vec), ...]` and returning the top `k` `chunk_id`s sorted by similarity DESC.',
    domain: 'AI/ML Data, Governance & FinOps',
    topic: 'RAG & Vector Pipelines',
    subtopic: 'Chunking & Cosine Top-K',
    roadmapTracks: ['Data Engineering Core'],
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companyTags: ['Databricks', 'Snowflake', 'Google', 'Atlassian'],
    roundType: 'AI/ML Data & Governance',
    roundNumber: 8,
    evaluationType: 'python',
    sourceType: 'curated_track',
    sourceReference: "D's platforms Round 8 · AI/ML Data, Governance & FinOps",
    setupSchemaOrEnv: '# Executed in Pyodide CPython Worker',
    sampleInput: 'chunk_text("d1", "abcdefghij", 4, 1) + top_k_cosine',
    expectedOutput: 'All RAG chunking & vector retrieval assertions pass',
    testCases: [
      {
        name: 'Sliding Overlap Chunker & Cosine Rank',
        input: `chunks = chunk_text("doc1", "abcdefghij", 4, 1); assert [c["text"] for c in chunks] == ["abcd", "defg", "ghij"] and top_k_cosine([1.0, 0.0], [("c1", [0.2, 0.9]), ("c2", [0.95, 0.1]), ("c3", [0.5, 0.5])], 2) == ["c2", "c3"]`,
        expected: 'True',
      },
    ],
    hiddenTestCases: [
      {
        name: 'Zero Vector Guard & Exact SHA Dedupe',
        input: `c2 = chunk_text("d", "hello", 10, 2); assert len(c2)==1 and top_k_cosine([0.0, 0.0], [("a", [1.0, 1.0])], 1) == ["a"]`,
        expected: 'True',
      },
    ],
    starterCode: buildPythonStarterSkeleton(
      `import hashlib, math\ndef chunk_text(doc_id, text, chunk_size, overlap):\n    pass\ndef top_k_cosine(query_vec, chunks_with_vecs, k):\n    pass`,
      'Implement incremental RAG chunking and cosine Top-K ranking',
    ),
    detailedSolution: `import hashlib, math

def chunk_text(doc_id, text, chunk_size, overlap):
    step = max(1, chunk_size - overlap)
    out = []
    idx = 0
    for start in range(0, len(text), step):
        seg = text[start:start + chunk_size]
        if not seg:
            break
        sha = hashlib.sha256(seg.encode()).hexdigest()[:16]
        out.append({"chunk_id": f"{doc_id}_{idx}", "text": seg, "sha": sha})
        idx += 1
        if start + chunk_size >= len(text):
            break
    return out

def top_k_cosine(query_vec, chunks_with_vecs, k):
    q_norm = math.sqrt(sum(x * x for x in query_vec))
    scored = []
    for cid, vec in chunks_with_vecs:
        v_norm = math.sqrt(sum(x * x for x in vec))
        if q_norm == 0 or v_norm == 0:
            sim = 0.0
        else:
            sim = sum(a * b for a, b in zip(query_vec, vec)) / (q_norm * v_norm)
        scored.append((sim, cid))
    scored.sort(key=lambda x: (-x[0], x[1]))
    return [cid for _, cid in scored[:k]]`,
    alternativeApproaches:
      'Hashing chunk text (`sha256`) before calling embedding APIs avoids re-embedding unchanged paragraphs on incremental document edits.',
    explanation:
      'Content-addressed chunk hashing cuts LLM embedding API cost by 70–90% on incremental Enterprise RAG refreshes.',
    practicalRelevance: 'Production GenAI / Vector Lakehouse ingestion pipelines.',
    relatedLearningId: 'topic_cloud_governance_finops',
    executionPlanNotes: 'O(N) chunking and O(M log M) exact cosine scoring with zero-norm protection.',
  },
  {
    uniqueId: 'r8_02_sql_rbac_row_level_pii_masking',
    title: 'SQL Lab: Dynamic Row-Level Security & PII Masking Policy',
    problemStatement:
      'Given `customer_records(cust_id, region, email, annual_spend)` and a viewer context `viewer_policy(role, allowed_region, can_view_pii)` (1 row), write a query returning `cust_id`, `region`, `masked_email` (full `email` if `can_view_pii = 1`, else `\'***@\' || substr(email, instr(email, \'@\') + 1)`), and `annual_spend`, filtered ONLY to rows permitted by `allowed_region` (`\'ALL\'` allows every region). Order by `cust_id`.',
    domain: 'AI/ML Data, Governance & FinOps',
    topic: 'Governance, PII & RBAC',
    subtopic: 'Row-Level & Column-Masking Policy',
    roadmapTracks: ['Analytical SQL Mastery', 'Data Engineering Core'],
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companyTags: ['Snowflake', 'Databricks', 'PhonePe', 'Razorpay'],
    roundType: 'AI/ML Data & Governance',
    roundNumber: 8,
    evaluationType: 'sql',
    sourceType: 'curated_track',
    sourceReference: "D's platforms Round 8 · AI/ML Data, Governance & FinOps",
    setupSchemaOrEnv: `CREATE TABLE customer_records (cust_id INTEGER PRIMARY KEY, region TEXT, email TEXT, annual_spend REAL);
CREATE TABLE viewer_policy (role TEXT, allowed_region TEXT, can_view_pii INTEGER);
INSERT INTO customer_records VALUES
  (1, 'APAC', 'ananya@fintech.in', 12000.0),
  (2, 'EMEA', 'lukas@bank.eu', 19500.0),
  (3, 'APAC', 'rohan@pay.in', 8400.0);
INSERT INTO viewer_policy VALUES ('analyst_apac', 'APAC', 0);`,
    adversarialSetupSql: `INSERT INTO customer_records VALUES (4, 'APAC', NULL, 500.0);`,
    sampleInput: 'customer_records filtered & masked dynamically by viewer_policy',
    expectedOutput: 'Executed dynamically against reference query in SQLite Wasm',
    testCases: [{ name: 'RBAC + Dynamic Masking', input: 'reference_sql', expected: 'Exact match' }],
    starterCode: `-- Return: cust_id, region, masked_email, annual_spend
-- Tables: customer_records(cust_id, region, email, annual_spend), viewer_policy(role, allowed_region, can_view_pii)
SELECT
  -- TODO: enforce row-level region filter and conditional PII masking
;`,
    detailedSolution: `SELECT
  c.cust_id,
  c.region,
  CASE
    WHEN c.email IS NULL THEN NULL
    WHEN p.can_view_pii = 1 THEN c.email
    ELSE '***@' || substr(c.email, instr(c.email, '@') + 1)
  END AS masked_email,
  c.annual_spend
FROM customer_records c
CROSS JOIN viewer_policy p
WHERE p.allowed_region = 'ALL' OR c.region = p.allowed_region
ORDER BY c.cust_id ASC;`,
    alternativeApproaches:
      'In Snowflake use Dynamic Data Masking Policies (`CREATE MASKING POLICY`) + Row Access Policies; in Databricks use Unity Catalog Column Masks + Row Filters.',
    explanation:
      'Separating policy metadata (`viewer_policy` / ABAC tags) from physical storage allows one Gold table to serve multiple compliance zones securely.',
    practicalRelevance: 'Mandatory SOC2/GDPR/DPDP governance pattern in modern Lakehouses.',
    relatedLearningId: 'topic_cloud_governance_finops',
    executionPlanNotes: 'Filter pushdown on `region` prunes unauthorized partitions automatically.',
  },
  {
    uniqueId: 'r8_03_feature_store_training_serving_skew',
    title: 'Design an Online/Offline Feature Store Eliminating Training-Serving Skew',
    problemStatement:
      'ML models trained on offline warehouse aggregates (`user_7d_tx_count`, `avg_amount_30d`) suffer 15% accuracy degradation in production because the online inference API computes slightly different rolling features in Java/Python.\n\nDesign a unified **Feature Store** architecture (Feast / Tecton / Databricks Feature Store style) covering:\n1. Single feature definition compiled to both offline Spark/SQL & online streaming Flink\n2. Point-in-time ASOF backfill joins (zero label leakage)\n3. Online Redis/DynamoDB low-latency (<10ms) sync & parity monitoring.',
    domain: 'AI/ML Data, Governance & FinOps',
    topic: 'Feature Stores & ML Data',
    subtopic: 'Training-Serving Parity',
    roadmapTracks: ['Data Engineering Core'],
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companyTags: ['Uber', 'Databricks', 'Stripe', 'Airbnb'],
    roundType: 'AI/ML Data & Governance',
    roundNumber: 8,
    evaluationType: 'design_rubric',
    sourceType: 'curated_track',
    sourceReference: "D's platforms Round 8 · AI/ML Data, Governance & FinOps",
    setupSchemaOrEnv: '# ML Data Platform System Design',
    sampleInput: '100+ ML features · <10ms online serving · zero offline training label leakage',
    expectedOutput: 'Feature registry DSL, ASOF offline joins, Flink->Redis online sink, drift monitor',
    testCases: [],
    starterCode: `## 1. Root Causes of Training-Serving Skew\n- ...\n\n## 2. Unified Feature Registry (Single Source of Truth)\n- ...\n\n## 3. Offline Point-in-Time Training Dataset Generation\n- ...\n\n## 4. Online Serving Sync (<10ms) & Feature Parity Alerts\n- ...`,
    detailedSolution: `### Model Solution: Unified Feature Store
1. **Single Feature Spec**: Define transformations once in declarative Python/SQL specs (e.g., Feast/Tecton FeatureView with entity \`user_id\`, TTL, aggregation window) compiled to both Spark/Iceberg offline backfill jobs and Flink streaming sinks.
2. **Leakage-Free Offline Join**: Build training datasets using **Point-in-Time (\`ASOF\`) joins** aligning each labeled event timestamp \`label_ts\` with the latest feature snapshot strictly \`<= label_ts\` (within TTL).
3. **Online Store Materialization**: Stream real-time Flink window updates into **Redis / DynamoDB** keyed by \`(feature_view, entity_id)\` and log served online feature vectors back to Iceberg so offline feature-parity monitors detect null spikes or distribution drift automatically.`,
    alternativeApproaches: 'Snowflake Feature Store / Databricks Unity Catalog Feature Tables.',
    explanation: 'Unified feature definitions + logged inference vectors close the offline/online loop permanently.',
    practicalRelevance: 'Tested heavily for Senior ML Data Engineer roles at Uber, Stripe, and Airbnb.',
    relatedLearningId: 'topic_cloud_governance_finops',
    executionPlanNotes: 'Evaluated on ASOF correctness, online store SLA, and drift detection.',
  },
  {
    uniqueId: 'r8_04_finops_chargeback_warehouse_tuning',
    title: 'FinOps Architecture: Cut Monthly Snowflake/Databricks Compute Spend by 40%',
    problemStatement:
      'Your company\'s cloud data platform bill jumped from $65K/mo to $145K/mo with flat data volume growth. Propose a systematic **FinOps Diagnostic & Optimization Playbook** covering:\n1. Attribution & query-tagging chargeback (`QUERY_HISTORY` / cluster tags)\n2. Storage pruning & table clustering ROI\n3. Warehouse sizing, auto-suspend, and Spot/Photon compute policies\n4. Automated CI cost-regression gates.',
    domain: 'AI/ML Data, Governance & FinOps',
    topic: 'FinOps & Cost Optimization',
    subtopic: 'Cloud Warehouse Spend Governance',
    roadmapTracks: ['Data Engineering Core'],
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companyTags: ['Snowflake', 'Databricks', 'Atlassian', 'Intuit'],
    roundType: 'AI/ML Data & Governance',
    roundNumber: 8,
    evaluationType: 'design_rubric',
    sourceType: 'curated_track',
    sourceReference: "D's platforms Round 8 · AI/ML Data, Governance & FinOps",
    setupSchemaOrEnv: '# Cloud Data FinOps Playbook',
    sampleInput: '$145K/mo compute spike · unmanaged XL warehouses · unpruned BI scans',
    expectedOutput: 'Chargeback attribution, micro-partition pruning, auto-suspend, and CI cost budgets',
    testCases: [],
    starterCode: `## 1. Cost Attribution & Telemetry Queries\n- ...\n\n## 2. Top Compute Waste Patterns & Fixes\n- ...\n\n## 3. Storage Clustering & Compaction ROI\n- ...\n\n## 4. Automated Guardrails & Budgets\n- ...`,
    detailedSolution: `### Model FinOps Playbook
1. **Attribution**: Enforce mandatory query tags (\`team\`, \`dbt_model\`, \`dag_id\`) and IaC tags (\`owner\`, \`env\`, \`cost_center\`). Rank top 20 models by \`credits × frequency\` rather than single huge queries (often a 1-minute BI dashboard polling every 5 minutes burns 60% of spend!).
2. **Compute Right-Sizing**: Set \`AUTO_SUSPEND = 60s\`, separate interactive BI warehouses from batch ELT warehouses, enforce \`STATEMENT_TIMEOUT_IN_SECONDS\`, and move non-SLA batch Spark jobs to Spot/Graviton instances.
3. **Partition Pruning & Clustering**: Add partition/clustering keys matching top \`WHERE\` predicates so micro-partition scan percentage drops from 95% to <5%, and materialize pre-aggregated Gold tables instead of scanning raw Bronze in BI tools.
4. **CI/CD Budgets**: Fail dbt PRs that convert an \`incremental\` model into a \`full-refresh\` unintentionally or degrade scan bytes beyond threshold.`,
    alternativeApproaches: 'Snowflake Resource Monitors + Databricks System Tables (`system.billing.usage`).',
    explanation: 'Frequency × cost per run uncovers hidden waste far faster than chasing ad-hoc queries alone.',
    practicalRelevance: 'High-impact Senior/Staff engineering expectation across all cloud-native teams.',
    relatedLearningId: 'topic_cloud_governance_finops',
    executionPlanNotes: 'Evaluated on concrete telemetry, query pruning, and organizational chargeback.',
  },
];

export const SEED_ROUND_QUESTIONS: Question[] = [
  ...ROUND4_MODELING_SQL_QUESTIONS,
  ...ROUND4_DESIGN_QUESTIONS,
  ...ROUND5_SYSTEM_DESIGN_QUESTIONS,
  ...ROUND6_RCA_BEHAVIORAL_QUESTIONS,
  ...ROUND7_SQL_LAB_QUESTIONS,
  ...ROUND8_AI_GOV_FINOPS_QUESTIONS,
];
