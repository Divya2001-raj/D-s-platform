export interface CompanyDossier {
  company: string;
  aliases: string[];
  headline: string;
  loopStructure: Array<{
    round: string;
    duration: string;
    focus: string;
  }>;
  signatureTraps: string[];
  scaleAndStack: {
    typicalScale: string;
    preferredStack: string[];
    modelingStyle: string;
  };
  behavioralThemes: string[];
}

export const COMPANY_DOSSIERS: CompanyDossier[] = [
  {
    company: 'Meta',
    aliases: ['meta', 'facebook'],
    headline: 'High-speed SQL + Python product sense & Kimball dimensional modeling at 3B+ DAU scale',
    loopStructure: [
      { round: 'Phone Screen (45m)', duration: '45 mins', focus: '3–4 timed SQL queries (retention, DAU, joins) + 3 Python data wrangling tasks (hashmaps, dicts)' },
      { round: 'On-Site 1: Data Modeling', duration: '45 mins', focus: 'Product metrics definition + Star Schema design (Fact/Dim tables, grains, SCD2)' },
      { round: 'On-Site 2: Coding (SQL + Python)', duration: '45 mins', focus: 'Multi-grain attribution SQL + streaming aggregation / dedupe in pure Python' },
      { round: 'On-Site 3: ETL Architecture', duration: '45 mins', focus: 'Presto/Trino + Spark batch/near-RT pipeline sizing, late arrivals & backfill SLA' },
      { round: 'On-Site 4: Ownership & Product Sense', duration: '45 mins', focus: 'Ambiguous metric root-cause (e.g., DAU drop 12%) + cross-functional conflict' },
    ],
    signatureTraps: [
      'Using INNER JOIN instead of LEFT JOIN on denominator tables, silently inflation conversion/activation rates.',
      'Forgetting DISTINCT before subtracting dates in Gaps & Islands DAU retention queries.',
      'In Python rounds, iterating with O(N^2) nested list scans instead of collections.Counter / defaultdict.',
      'Failing to declare explicit Fact table grain before listing columns in Dimensional Modeling.',
    ],
    scaleAndStack: {
      typicalScale: '3B+ DAU, 100+ PB warehouse, >10M events/sec logging',
      preferredStack: ['Presto / Trino', 'Apache Spark', 'Hive / Iceberg', 'Python', 'Dataswarm / Scuba'],
      modelingStyle: 'Strict Kimball Star Schema + pre-aggregated daily/28d cumulative snapshot tables (Cumulatives)',
    },
    behavioralThemes: [
      'Move Fast & Focus on Impact: quantify business decision changed by your pipeline.',
      'Debugging silent data corruption before downstream ML or executive dashboards notice.',
      'Navigating ambiguity when Product Managers propose conflicting metric definitions.',
      'Taking ownership of broken on-call DAGs and writing blameless postmortems.',
      'Simplifying over-engineered architectures for measurable reliability gains.',
    ],
  },
  {
    company: 'Amazon',
    aliases: ['amazon', 'aws'],
    headline: 'Leadership Principles (Bar-Raiser) + Redshift/Glue/EMR cost & dimensional warehouse scaling',
    loopStructure: [
      { round: 'Online Assessment / Screen', duration: '60 mins', focus: 'SQL window rankings + Python log aggregation + LP behavioral probe' },
      { round: 'On-Site 1: SQL & Data Modeling', duration: '60 mins', focus: 'E-commerce order lifecycle Fact/Dim model + multi-currency & refund edge cases' },
      { round: 'On-Site 2: Distributed Pipelines', duration: '60 mins', focus: 'Redshift sort/dist keys, EMR Spark skew tuning, S3 small-file compaction' },
      { round: 'On-Site 3: System Design', duration: '60 mins', focus: 'Event-driven Kinesis/Kafka + Glue/Iceberg Lakehouse w/ DLQ & replay' },
      { round: 'On-Site 4: Bar Raiser (LP Focus)', duration: '60 mins', focus: 'Deep-dive STAR probes across Dive Deep, Ownership, Frugality, Disagree & Commit' },
    ],
    signatureTraps: [
      'Giving generic "we" answers in Behavioral instead of crisp "I" decisions, numbers, and post-mortem learnings.',
      'Picking poor Redshift DISTKEY / SORTKEY pairs causing cross-node broadcast or skew during order joins.',
      'Ignoring partial cancellations, split shipments, and idempotent S3 prefix partitioning.',
      'Forgetting FinOps / Frugality sizing when choosing EMR instance fleets or Athena scan pruning.',
    ],
    scaleAndStack: {
      typicalScale: '100M+ daily orders, Petabyte Redshift/S3 data lakes, sub-minute fulfillment SLA',
      preferredStack: ['AWS Glue / EMR Spark', 'Amazon Redshift', 'Kinesis / MSK Kafka', 'Apache Iceberg on S3', 'Step Functions'],
      modelingStyle: 'Kimball Star Schema w/ Accumulating Snapshot facts for order -> ship -> return lifecycles',
    },
    behavioralThemes: [
      'Dive Deep: tell me about a metric anomaly you traced down to code/bytes.',
      'Frugality: reducing AWS compute/storage spend cleanly without hurting SLAs.',
      'Disagree & Commit: pushing back with data against a Principal Engineer or PM.',
      'Deliver Results under tight holiday-peak deadlines (Prime Day resilience).',
      'Insist on the Highest Standards: automated Data Quality gates & SLA contracts.',
    ],
  },
  {
    company: 'Google',
    aliases: ['google', 'gcp'],
    headline: 'Algorithmic Python/DSA rigor + BigQuery/Beam/PubSub unified batch & streaming semantics',
    loopStructure: [
      { round: 'Technical Screen', duration: '45 mins', focus: '1–2 NeetCode-caliber DSA/streaming algorithm problems + complex analytical SQL' },
      { round: 'Coding 1 (Python / DSA)', duration: '45 mins', focus: 'Sliding windows, heaps, intervals, tries, or topological DAG ordering w/ Big-O proof' },
      { round: 'SQL & Distributed Pipelines', duration: '45 mins', focus: 'BigQuery partitioning/clustering + Apache Beam / Dataflow watermark & late data' },
      { round: 'Data System Architecture', duration: '45 mins', focus: 'Global multi-region event ingestion, schema evolution, PII governance & backfills' },
      { round: 'Googleyness & Leadership', duration: '45 mins', focus: 'Inclusive collaboration, handling technical ambiguity & mentoring' },
    ],
    signatureTraps: [
      'Neglecting time & space complexity edge cases (empty graphs, cycles in DAGs, memory-bounded streams).',
      'Mixing up Event Time vs Processing Time watermarks and Trigger firing modes in Beam/Flink.',
      'Writing non-partition-pruned BigQuery SQL that triggers full-table byte scans.',
      'Overlooking GDPR/CCPA crypto-shredding and column-level policy tags in governance rounds.',
    ],
    scaleAndStack: {
      typicalScale: 'Millions QPS telemetry, Exabyte-scale analytics, strict latency & correctness guarantees',
      preferredStack: ['BigQuery', 'Apache Beam / Dataflow', 'Pub/Sub', 'Spanner / Bigtable', 'LookML / dbt'],
      modelingStyle: 'Nested/Repeated (STRUCT/ARRAY) denormalized BigQuery warehouses + strict Event-Time semantics',
    },
    behavioralThemes: [
      'Navigating open-ended design ambiguity without prescriptive requirements.',
      'Balancing engineering rigor & schema evolution with rapid product iteration.',
      'Constructive code review and raising team reliability standards.',
      'Cross-org alignment on canonical datasets and SLIs/SLOs.',
      'Learning visibly from a production outage or wrong architectural bet.',
    ],
  },
  {
    company: 'Uber',
    aliases: ['uber'],
    headline: 'Real-time geo-spatial H3/Flink streaming + Apache Hudi/Iceberg CDC & Marketplace metrics',
    loopStructure: [
      { round: 'CodeSignal / Tech Screen', duration: '60 mins', focus: 'Hard SQL session/retention + Python concurrency/DSA problem' },
      { round: 'Streaming & Distributed Systems', duration: '60 mins', focus: 'Kafka + Flink RocksDB checkpointing, H3 geo-bucketing & surge windowing' },
      { round: 'SQL & Marketplace Modeling', duration: '60 mins', focus: 'Two-sided marketplace (Rider/Driver) funnel modeling + trip state attribution' },
      { round: 'Platform Architecture', duration: '60 mins', focus: 'Incremental Lakehouse (Hudi/Iceberg MoR), Kafka backpressure & multi-DC failover' },
      { round: 'Hiring Manager / Cultural', duration: '45 mins', focus: 'High-urgency SEV-1 incident triage + building 0->1 data reliability tooling' },
    ],
    signatureTraps: [
      'Using static city partitions that cause catastrophic hot-key skew in NYC/Bengaluru peaks vs H3 spatial cells.',
      'Ignoring out-of-order mobile GPS pings arriving offline after tunnel trips (60s–15m late data).',
      'Failing to handle driver cancellation / re-dispatch duplicates in trip conversion SQL.',
      'Not explaining Write-Amplification vs Read-Latency in Merge-on-Read (MoR) vs Copy-on-Write (CoW).',
    ],
    scaleAndStack: {
      typicalScale: '30M+ daily trips, millions GPS pings/sec, <2s surge pricing feature freshness',
      preferredStack: ['Apache Kafka', 'Apache Flink', 'Apache Hudi / Iceberg', 'Presto / Pinot', 'Spark / Airflow'],
      modelingStyle: 'Marketplace Canonical Entities + Streaming-First Kappa / Incremental Lakehouse',
    },
    behavioralThemes: [
      'Bias for Action during real-time marketplace degradation.',
      'Triaging SLA misses affecting live driver payouts or surge pricing.',
      'Influencing product & ML platform teams on feature freshness SLAs.',
      'Deep technical defense of trade-offs in Kappa vs Lambda migrations.',
      'Mentoring engineers on Spark/Flink observability & memory tuning.',
    ],
  },
  {
    company: 'Databricks',
    aliases: ['databricks'],
    headline: 'Deep Spark Catalyst / Photon internals, Delta Lake transaction logs & Python systems coding',
    loopStructure: [
      { round: 'Screen (Python / Systems)', duration: '60 mins', focus: 'Concurrency, LRU/interval/DAG algorithms in clean modular Python' },
      { round: 'Spark & Lakehouse Internals', duration: '60 mins', focus: 'Adaptive Query Execution, Shuffle Exchange, Delta `_delta_log` OCC & Liquid Clustering' },
      { round: 'SQL & Optimization', duration: '45 mins', focus: 'Complex analytical SQL + physical query plan bottleneck diagnosis' },
      { round: 'Architecture Design', duration: '60 mins', focus: 'Multi-tenant Medallion Lakehouse w/ Unity Catalog governance & Photon FinOps' },
      { round: 'Values & Leadership', duration: '45 mins', focus: 'Customer obsession, first-principles debugging, ownership' },
    ],
    signatureTraps: [
      'Confusing SortMergeJoin vs BroadcastHashJoin thresholds and AQE runtime skew splitting mechanics.',
      'Not knowing how Delta Lake Optimistic Concurrency Control resolves concurrent append vs delete conflicts.',
      'Leaving Python UDF serialization bottlenecks instead of Pandas/Arrow vectorized or native SQL expressions.',
      'Overlooking Z-Ordering / Liquid Clustering data skipping statistics (`min`/`max` per file).',
    ],
    scaleAndStack: {
      typicalScale: 'Exabyte customer Lakehouses, multi-thousand-core Spark clusters, millisecond metadata lookups',
      preferredStack: ['Apache Spark / Photon', 'Delta Lake', 'Unity Catalog', 'Spark Structured Streaming', 'DLT'],
      modelingStyle: 'Bronze -> Silver -> Gold Medallion Architecture w/ Expectations & CDC APPLY CHANGES',
    },
    behavioralThemes: [
      'First-principles troubleshooting of OOM, GC thrash, and shuffle fetch failures.',
      'Designing customer-centric abstractions that prevent common misconfigurations.',
      'Handling high-stakes enterprise escalations with calm clarity.',
      'Proactive cost/performance benchmarking (DBU optimization).',
      'Collaborating across distributed runtime and SQL engine teams.',
    ],
  },
  {
    company: 'Snowflake',
    aliases: ['snowflake'],
    headline: 'Micro-partition pruning, Dynamic Tables, Snowpark/Streams & zero-copy warehouse FinOps',
    loopStructure: [
      { round: 'Technical Screen', duration: '60 mins', focus: 'Window SQL + warehouse pruning critique + Python wrangling' },
      { round: 'Cloud Warehouse Internals', duration: '60 mins', focus: 'Micro-partitions, Clustering Keys, Search Optimization & Result/Local Disk Cache' },
      { round: 'Data Engineering Design', duration: '60 mins', focus: 'Snowpipe Streaming + Streams/Tasks vs Dynamic Tables + Iceberg interoperability' },
      { round: 'FinOps & Governance', duration: '45 mins', focus: 'Warehouse auto-suspend, spilling diagnosis, RBAC/Row Access Policies & masking' },
      { round: 'Behavioral / HM Loop', duration: '45 mins', focus: 'Engineering craftsmanship, customer SLA ownership' },
    ],
    signatureTraps: [
      'Setting clustering keys on high-cardinality UUIDs or wrapping date filters in `TO_CHAR()`, breaking pruning.',
      'Recommending XL warehouses when a query is spilling due to cartesian/exploding joins rather than compute shortage.',
      'Confusing Snowflake Stream offset consumption behavior across multiple downstream tasks.',
      'Ignoring small-file Snowpipe overhead vs batched Snowpipe Streaming cost.',
    ],
    scaleAndStack: {
      typicalScale: 'Multi-PB federated warehouses, 10k+ concurrent BI/ML queries, sub-second metadata pruning',
      preferredStack: ['Snowflake SQL', 'Snowpark Python', 'Dynamic Tables', 'Streams & Tasks', 'dbt / Iceberg'],
      modelingStyle: 'Layered Raw -> Curated -> Consumption marts w/ Dynamic Tables & zero-copy cloning QA',
    },
    behavioralThemes: [
      'Obsessing over query latency, byte-spilling, and credit efficiency.',
      'Building zero-downtime blue/green schema migrations using zero-copy clones.',
      'Partnering closely with BI, Finance, and SecOps on strict data governance.',
      'Root-causing sudden credit burn spikes before monthly billing alerts.',
      'Championing clean automated dbt/CI testing contracts.',
    ],
  },
  {
    company: 'Flipkart',
    aliases: ['flipkart'],
    headline: 'Big Billion Days 50x traffic burst resilience, Spark/Flink scale & Indian e-commerce modeling',
    loopStructure: [
      { round: 'Machine Coding / Screen', duration: '60 mins', focus: 'Python stream parsing / ETL transformer + complex e-commerce SQL' },
      { round: 'Big Data & Spark Tuning', duration: '60 mins', focus: 'Skewed Flash-Sale SKUs in Spark, Hive/Iceberg partitioning & Yarn/K8s OOM' },
      { round: 'Data Modeling & DWH', duration: '60 mins', focus: 'Inventory, pricing, seller payouts & reverse-logistics Star Schema' },
      { round: 'System Design (BBD Scale)', duration: '60 mins', focus: 'Surviving 50x spike during Big Billion Days w/ Kafka backpressure & tiered SLA' },
      { round: 'HM / Culture Fit', duration: '45 mins', focus: 'Ownership, frugal scaling, stakeholder management' },
    ],
    signatureTraps: [
      'Joining `orders` on hot flash-sale `seller_id` or `product_id` without salting or broadcast isolation.',
      'Missing reverse-logistics / COD RTO (Return-to-Origin) state transitions in Net GMV calculations.',
      'Assuming steady-state Kafka consumer lag instead of designing burst-buffer retention & autoscaling.',
      'Overlooking PII masking of customer phone/address across analytics sandboxes.',
    ],
    scaleAndStack: {
      typicalScale: '50x peak flash-sale bursts, >1B daily clickstream & order events, petabyte HDFS/GCS/S3 lake',
      preferredStack: ['Apache Spark', 'Apache Flink', 'Kafka', 'Iceberg / Hudi', 'Airflow / Trino'],
      modelingStyle: 'Conformed Retail Star Schema w/ Flash-Sale Isolation & COD Reconciliation Facts',
    },
    behavioralThemes: [
      'High-stakes war-room execution during Big Billion Days peaks.',
      'Cutting cloud/cluster spend cleanly through partition & compaction hygiene.',
      'Handling broken upstream microservice schema changes without dropping events.',
      'Cross-team collaboration across Supply Chain, Trust & Safety, and Pricing ML.',
      'Mentoring junior DEs on Spark UI and deterministic SQL.',
    ],
  },
  {
    company: 'PhonePe',
    aliases: ['phonepe'],
    headline: 'Zero-data-loss UPI fintech ledgers, idempotent CDC & strict RBI audit compliance',
    loopStructure: [
      { round: 'Coding & SQL Screen', duration: '60 mins', focus: 'Fintech reconciliation SQL (double-entry, gaps) + Python deduplication/DSA' },
      { round: 'Pipeline & Spark Internals', duration: '60 mins', focus: 'Exactly-once Spark/Flink sinks, transactional Hudi/Iceberg MERGE & checkpointing' },
      { round: 'Fintech Data Modeling', duration: '60 mins', focus: 'UPI transaction state machine, merchant settlement, chargebacks & SCD Type-2' },
      { round: 'System Design (Ledger Scale)', duration: '60 mins', focus: 'High-TPS UPI telemetry + NPCI T+1 automated reconciliation pipeline' },
      { round: 'Engineering Leadership', duration: '45 mins', focus: 'Compliance discipline, incident rigor, ownership' },
    ],
    signatureTraps: [
      'Allowing floating-point DOUBLE/FLOAT instead of exact integer paise / `DECIMAL(18,2)` for money math.',
      'Failing to handle duplicate webhook retries or out-of-order `SUCCESS` -> `REVERSED` CDC events.',
      'Missing audit trails (who/when/batch_id) required for RBI financial & KYC regulatory audits.',
      'Ignoring hot-merchant skew (e.g., IRCTC / Zomato merchant IDs) in Spark aggregations.',
    ],
    scaleAndStack: {
      typicalScale: 'Billions of monthly UPI transactions, strict 0-rupee reconciliation variance, multi-DC HA',
      preferredStack: ['Kafka', 'Flink / Spark', 'Hudi / Iceberg', 'ClickHouse / Druid', 'Airflow'],
      modelingStyle: 'Immutable Double-Entry Ledger Facts + Tombstone-Safe SCD2 Merchant Dimensions',
    },
    behavioralThemes: [
      'Zero tolerance for silent financial data drift — proactive reconciliation alerts.',
      'Debugging production incidents affecting merchant settlement SLAs.',
      'Designing PII tokenization & vaulting for strict financial compliance.',
      'Driving consensus across Payments Core, Risk/Fraud ML, and Finance.',
      'Simplifying brittle legacy cron jobs into idempotent DAGs.',
    ],
  },
  {
    company: 'Swiggy',
    aliases: ['swiggy'],
    headline: 'Hyperlocal logistics telemetry, sub-minute ETA feature pipelines & Spark/Kafka scale',
    loopStructure: [
      { round: 'Technical Screen', duration: '45 mins', focus: 'Sessionization SQL + Python spatial/interval wrangling' },
      { round: 'Real-Time Streaming Design', duration: '60 mins', focus: 'Driver ping -> Flink geo-window -> Feature Store for live ETA & batching ML' },
      { round: 'Data Modeling & SQL', duration: '60 mins', focus: 'Order funnel (Cart -> Assigned -> Picked -> Delivered) & restaurant prep-time SLA' },
      { round: 'Spark & Warehouse Lab', duration: '60 mins', focus: 'PySpark skew tuning, Airflow backfill idempotency & Snowplow/Kafka clickstream' },
      { round: 'Bar-Raiser / HM', duration: '45 mins', focus: 'Customer-first problem solving, high-velocity trade-offs' },
    ],
    signatureTraps: [
      'Counting multi-order batched deliveries twice in rider utilization or delivery-time denominators.',
      'Ignoring lunch/dinner 20x peak spikes (12:30 PM & 8:00 PM IST) in Kafka/Flink provisioning.',
      'Failing to handle offline rider GPS bursts reconnecting mid-trip.',
      'Using non-idempotent Airflow `execution_date` scripts that corrupt historical partitions on rerun.',
    ],
    scaleAndStack: {
      typicalScale: 'Millions daily hyperlocal orders, <3s ML feature freshness, 10x meal-hour surges',
      preferredStack: ['Kafka', 'Flink', 'Spark on EMR', 'Snowflake / Redshift', 'Airflow / Pinot'],
      modelingStyle: 'Accumulating Snapshot Order Lifecycle + Point-in-Time ML Feature Store Joins',
    },
    behavioralThemes: [
      'Pragmatic speed vs reliability during rapid product experiments (Instamart / Genie).',
      'Reducing peak-hour warehouse contention between ML training and BI dashboards.',
      'Tracing sudden metric drops (e.g., false rider idle time spikes) to telemetry bugs.',
      'Partnering with Data Scientists on training-serving feature parity.',
      'Taking end-to-end ownership from instrumentation schema to Gold mart.',
    ],
  },
  {
    company: 'Razorpay',
    aliases: ['razorpay'],
    headline: 'High-integrity payment gateway CDC, fraud real-time scoring & Lakehouse FinOps',
    loopStructure: [
      { round: 'Screen (SQL + Python)', duration: '60 mins', focus: 'Payment gateway funnel SQL + Python JSON webhook normalizer' },
      { round: 'System Design (Payments Lakehouse)', duration: '60 mins', focus: 'Debezium MySQL CDC -> Kafka -> Hudi/Delta Lakehouse + Fraud RT feature store' },
      { round: 'Data Modeling & Quality', duration: '45 mins', focus: 'Settlement, refunds, disputes, MDR fees & dbt contract enforcement' },
      { round: 'Spark / Query Tuning', duration: '45 mins', focus: 'Partition compaction, skew mitigation & Trino/Athena cost optimization' },
      { round: 'HM & Culture Round', duration: '45 mins', focus: 'Ownership, technical depth defense, stakeholder communication' },
    ],
    signatureTraps: [
      'Dropping nested dynamic JSON metadata fields on merchant webhook schema drift instead of DLQ/variant parsing.',
      'Ignoring late bank settlement webhooks (T+2 / T+3 days) in partition overwrite jobs.',
      'Mishandling idempotency keys across duplicate payment attempt retries.',
      'Underestimating PII/PCI-DSS boundary controls around card/token attributes.',
    ],
    scaleAndStack: {
      typicalScale: '1000s TPS payment bursts, PCI-DSS compliant lakehouse, sub-second fraud scoring',
      preferredStack: ['Debezium CDC', 'Kafka', 'Spark / Delta or Hudi', 'Trino / Redshift', 'dbt / Airflow'],
      modelingStyle: 'Domain-Oriented Payment Ledgers + Write-Audit-Publish (WAP) Quality Contracts',
    },
    behavioralThemes: [
      'Maintaining 100% financial auditability while scaling data democratization.',
      'Catching silent schema drift from upstream payment microservices.',
      'Reducing Lakehouse compaction & Trino scan costs measurably.',
      'Driving blameless incident retrospectives with concrete guardrails.',
      'Mentoring teams on idempotent MERGE and data contracts.',
    ],
  },
  {
    company: 'Walmart',
    aliases: ['walmart', 'walmart global tech'],
    headline: 'Omnichannel petabyte inventory pipelines, multi-cloud Spark/BigQuery & supply chain modeling',
    loopStructure: [
      { round: 'Technical Screen', duration: '60 mins', focus: 'Retail SQL (running inventory, store cohorts) + Python data structures' },
      { round: 'Big Data & Cloud Pipelines', duration: '60 mins', focus: 'Spark 3.5 AQE, GCS/BigQuery/Kafka omnichannel POS + e-commerce unification' },
      { round: 'Dimensional Modeling', duration: '60 mins', focus: 'Store + Online Inventory Snapshot facts, SKU hierarchies & SCD Type-2 pricing' },
      { round: 'Architecture & FinOps', duration: '60 mins', focus: 'Batch + Streaming store-level telemetry across 10,000+ stores & cost control' },
      { round: 'Leadership / HM Loop', duration: '45 mins', focus: 'Enterprise scale collaboration, production stability, trade-offs' },
    ],
    signatureTraps: [
      'Computing store inventory via full-history scans instead of periodic daily snapshot + delta accumulation.',
      'Failing to unify offline POS store clocks/timezones cleanly with online UTC order timestamps.',
      'Hot-key skew during holiday/Black Friday mega-SKUs in Spark joins.',
      'Ignoring BigQuery / Snowflake slot contention and materialized view refresh FinOps.',
    ],
    scaleAndStack: {
      typicalScale: 'Multi-petabyte omnichannel retail, 10,000+ stores, millions concurrent SKU-location combinations',
      preferredStack: ['Apache Spark', 'Kafka', 'BigQuery / Azure Synapse', 'Airflow', 'Iceberg / Delta'],
      modelingStyle: 'Conformed Retail Periodic Inventory Snapshots + SCD2 Store/SKU Dimensions',
    },
    behavioralThemes: [
      'Operating reliable enterprise pipelines across hybrid/multi-cloud environments.',
      'Quantifying compute & storage savings across petabyte-scale clusters.',
      'Resolving upstream vendor EDI / POS feed corruption gracefully.',
      'Aligning business supply-chain teams with standardized Gold metrics.',
      'Leading zero-downtime platform migrations at scale.',
    ],
  },
  {
    company: 'Atlassian',
    aliases: ['atlassian'],
    headline: 'SaaS product telemetry lakehouse, Snowflake/dbt analytics engineering & GDPR privacy',
    loopStructure: [
      { round: 'Coding & SQL Screen', duration: '60 mins', focus: 'SaaS subscription/churn cohort SQL + clean Python event processor' },
      { round: 'Data Platform System Design', duration: '60 mins', focus: 'Multi-tenant SaaS telemetry (Jira/Confluence) -> Kafka -> Databricks/Snowflake' },
      { round: 'Analytics Engineering & Modeling', duration: '60 mins', focus: 'Conformed B2B SaaS tenant/seat/ARR Star Schema + dbt incremental & testing' },
      { round: 'Privacy, Governance & Scale', duration: '45 mins', focus: 'Tenant data residency (EU/US), GDPR Right-to-Be-Forgotten & RBAC' },
      { round: 'Values Interview (Open Company)', duration: '45 mins', focus: 'Collaboration without ego, Play as a Team, Build with Heart & Balance' },
    ],
    signatureTraps: [
      'Breaking B2B tenant data residency boundaries when replicating telemetry across US/EU regions.',
      'Calculating SaaS ARR / NRR expansion churn wrong across mid-month seat upgrades or downgrades.',
      'Treating GDPR delete propagation as an ad-hoc script rather than tombstones + compaction lifecycle.',
      'Neglecting dbt modular staging/intermediate layering & incremental `unique_key` merge safety.',
    ],
    scaleAndStack: {
      typicalScale: 'Hundreds of thousands of B2B tenants, billions monthly product telemetry events',
      preferredStack: ['Snowflake', 'Databricks Spark', 'dbt', 'Apache Kafka', 'Airflow / Dagster'],
      modelingStyle: 'B2B SaaS Tenant-Isolated Star Schema + Modular dbt Contracts',
    },
    behavioralThemes: [
      'Play as a Team: transparent documentation, RFCs, and cross-timezone collaboration.',
      'Be the Change You Seek: proactively eliminating brittle manual data ops.',
      'Balancing data self-service speed with ironclad GDPR / SOC2 governance.',
      'Explaining complex pipeline trade-offs clearly to Product & Finance partners.',
      'Constructive ownership of data incidents and post-incident learning.',
    ],
  },
];

export function findCompanyDossier(companyName: string): CompanyDossier | null {
  const norm = companyName.trim().toLowerCase();
  if (!norm) return null;
  return (
    COMPANY_DOSSIERS.find(
      (d) =>
        d.company.toLowerCase() === norm ||
        d.aliases.some((a) => norm.includes(a) || a.includes(norm)),
    ) || null
  );
}
