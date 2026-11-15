export interface SparkUiScenario {
  id: string;
  title: string;
  companyTag: string;
  stageSummary: string;
  symptom: string;
  taskCount: number;
  medianTaskMs: number;
  p95TaskMs: number;
  maxTaskMs: number;
  shuffleReadMb: number;
  shuffleWriteMb: number;
  spillDiskMb: number;
  gcTimePct: number;
  catalystSnippet: string;
  rootCause: string;
  fixConfigOrCode: string;
  taskHistogram: Array<{ bucket: string; tasks: number; isStraggler?: boolean }>;
}

export const SPARK_UI_SCENARIOS: SparkUiScenario[] = [
  {
    id: 'spark_ui_01_straggler_199',
    title: 'Stage 14 Stuck at 199/200 Tasks (Hot Merchant Skew)',
    companyTag: 'Flipkart · Big Data Engineer',
    stageSummary: 'SortMergeJoin (fact_orders ⋈ dim_merchants on merchant_id)',
    symptom: '199 tasks finish in 18s; task #147 runs 42 minutes with 84 GB Shuffle Read and eventually fails with ExecutorLostFailure (OOM).',
    taskCount: 200,
    medianTaskMs: 14200,
    p95TaskMs: 26500,
    maxTaskMs: 2520000,
    shuffleReadMb: 84200,
    shuffleWriteMb: 12400,
    spillDiskMb: 61800,
    gcTimePct: 38,
    catalystSnippet: `== Physical Plan ==
*(5) SortMergeJoin [merchant_id#12], [merchant_id#88], Inner
:- *(2) Sort [merchant_id#12 ASC], false, 0
:  +- Exchange hashpartitioning(merchant_id#12, 200)
+- *(4) Sort [merchant_id#88 ASC], false, 0
   +- Exchange hashpartitioning(merchant_id#88, 200)`,
    rootCause: 'Single hot key (e.g., merchant_id=mega_seller or NULL) hashes all skewed rows onto 1 of 200 shuffle partitions, exhausting unified execution memory and spilling 61.8 GB to disk.',
    fixConfigOrCode: `spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
# Or manual key salting / broadcast hint on dim_merchants:
df_orders.join(F.broadcast(df_merchants), "merchant_id")`,
    taskHistogram: [
      { bucket: '0-15s', tasks: 152 },
      { bucket: '15-30s', tasks: 44 },
      { bucket: '30-60s', tasks: 3 },
      { bucket: '42m+', tasks: 1, isStraggler: true },
    ],
  },
  {
    id: 'spark_ui_02_broadcast_oom',
    title: 'Driver OOM During Auto-Broadcast Join',
    companyTag: 'Uber · Senior Data Engineer',
    stageSummary: 'BroadcastHashJoin (trips ⋈ drivers)',
    symptom: 'Driver JVM crashes with java.lang.OutOfMemoryError: Java heap space while collecting build side before BroadcastExchange.',
    taskCount: 400,
    medianTaskMs: 8500,
    p95TaskMs: 14000,
    maxTaskMs: 91000,
    shuffleReadMb: 120,
    shuffleWriteMb: 180,
    spillDiskMb: 0,
    gcTimePct: 64,
    catalystSnippet: `== Physical Plan ==
*(2) BroadcastHashJoin [driver_id#4], [driver_id#51], LeftOuter
:- *(2) FileScan parquet trips[...]
+- BroadcastExchange HashedRelationBroadcastMode(...)
   +- *(1) FileScan parquet drivers[sizeOnDisk=9.2MB -> deserialized=3.1GB]`,
    rootCause: 'Compressed Parquet size (9.2 MB) bypassed autoBroadcastJoinThreshold (10 MB), but deserializing nested arrays/maps on the Driver inflated JVM heap to 3.1 GB, causing Driver OOM.',
    fixConfigOrCode: `spark.conf.set("spark.sql.autoBroadcastJoinThreshold", -1) # Disable auto-broadcast for nested schema
# Or switch to SortMergeJoin / increase driver memory overhead:
# --driver-memory 16g`,
    taskHistogram: [
      { bucket: '0-10s', tasks: 360 },
      { bucket: '10-20s', tasks: 35 },
      { bucket: '60s+ Timeout', tasks: 5, isStraggler: true },
    ],
  },
  {
    id: 'spark_ui_03_small_files_driver_scan',
    title: '480K Tiny Parquet Files Causing 22-Minute Planning Delay',
    companyTag: 'Netflix · Senior DE',
    stageSummary: 'FileScan parquet events_hourly (Listing + Task Deserialization)',
    symptom: 'Stage 0 shows 480,000 tiny tasks (140 KB each); 82% of wall-clock time is spent in Task Scheduler Delay & S3 LIST calls rather than compute.',
    taskCount: 16000,
    medianTaskMs: 320,
    p95TaskMs: 980,
    maxTaskMs: 12400,
    shuffleReadMb: 2100,
    shuffleWriteMb: 1900,
    spillDiskMb: 0,
    gcTimePct: 22,
    catalystSnippet: `== Physical Plan ==
FileScan parquet raw.events_hourly[event_id,ts,payload]
  Location: InMemoryFileIndex(481204 paths) [size=67 GB]
  maxPartitionBytes=128MB, openCostInBytes=4MB`,
    rootCause: 'Streaming sink flushed uncompacted micro-batches every 10s, creating 481K files (~140 KB each). File listing saturates S3 API and launches excessive tasks.',
    fixConfigOrCode: `-- Run asynchronous bin-packing compaction in Iceberg / Delta:
CALL system.rewrite_data_files(table => 'raw.events_hourly', options => map('target-file-size-bytes', '134217728'));
-- Tune openCostInBytes for read-side coalescing if uncompacted.`,
    taskHistogram: [
      { bucket: '<0.5s (Overhead)', tasks: 14900, isStraggler: true },
      { bucket: '0.5-2s', tasks: 1020 },
      { bucket: '2s+', tasks: 80 },
    ],
  },
  {
    id: 'spark_ui_04_spill_explosion',
    title: 'Memory-to-Disk Spill on Multi-Column Window Aggregation',
    companyTag: 'Amazon · L5 Data Engineer',
    stageSummary: 'WindowExec [PARTITION BY acct_id ORDER BY ts]',
    symptom: 'Spill (Memory) = 240 GB and Spill (Disk) = 92 GB across 200 executors; throughput drops 9x during external TimSort.',
    taskCount: 200,
    medianTaskMs: 118000,
    p95TaskMs: 245000,
    maxTaskMs: 390000,
    shuffleReadMb: 48000,
    shuffleWriteMb: 48000,
    spillDiskMb: 92000,
    gcTimePct: 31,
    catalystSnippet: `== Physical Plan ==
Window [row_number() windowspecdefinition(acct_id, ts DESC)], [acct_id]
+- *(2) Sort [acct_id ASC, ts DESC], false, 0
   +- Exchange hashpartitioning(acct_id, 200)`,
    rootCause: 'Default spark.sql.shuffle.partitions=200 created ~240 MB compressed (~1.2 GB in-memory) partitions per task on 4 GB heap executors, exceeding unified execution pool.',
    fixConfigOrCode: `spark.conf.set("spark.sql.shuffle.partitions", "2000")
spark.conf.set("spark.sql.adaptive.enabled", "true")
# Target 128-200MB per shuffle partition post-AQE coalescing`,
    taskHistogram: [
      { bucket: '0-60s', tasks: 20 },
      { bucket: '60-180s', tasks: 145 },
      { bucket: '180-390s (Spill)', tasks: 35, isStraggler: true },
    ],
  },
  {
    id: 'spark_ui_05_cartesian_bni',
    title: 'Silent BroadcastNestedLoopJoin O(N*M) Blowup',
    companyTag: 'Stripe · Data Engineer',
    stageSummary: 'BroadcastNestedLoopJoin [BETWEEN start_ip AND end_ip]',
    symptom: '10M rows joined with 200K GeoIP CIDR ranges scans 2 trillion pairs using O(N*M) nested loop.',
    taskCount: 200,
    medianTaskMs: 420000,
    p95TaskMs: 890000,
    maxTaskMs: 1400000,
    shuffleReadMb: 3400,
    shuffleWriteMb: 1200,
    spillDiskMb: 11000,
    gcTimePct: 19,
    catalystSnippet: `== Physical Plan ==
BroadcastNestedLoopJoin BuildRight, Inner, (ip#1 >= start#2 AND ip#1 <= end#2)
:- FileScan parquet web_requests
+- BroadcastExchange IdentityBroadcastMode`,
    rootCause: 'Non-equi range predicate prevents HashJoin / SortMergeJoin, forcing Catalyst into O(N*M) BroadcastNestedLoopJoin.',
    fixConfigOrCode: `-- Bucketize IP prefixes (/16 CIDR prefix) into an equi-join key first:
SELECT r.*, g.country FROM web_requests r
JOIN geo_ip g ON r.ip_prefix16 = g.ip_prefix16
  AND r.ip_long BETWEEN g.start_ip AND g.end_ip;`,
    taskHistogram: [
      { bucket: '0-5m', tasks: 18 },
      { bucket: '5-15m', tasks: 162, isStraggler: true },
      { bucket: '15m+', tasks: 20, isStraggler: true },
    ],
  },
  {
    id: 'spark_ui_06_gc_thrashing',
    title: 'High JVM GC Time (>35%) from Wide Python UDF Serialization',
    companyTag: 'Meta · Data Engineer E5',
    stageSummary: 'BatchEvalPython [parse_nested_json_udf]',
    symptom: 'Executors spend 48% CPU in Stop-The-World G1GC pauses and Arrow IPC serialization between JVM and Python worker.',
    taskCount: 300,
    medianTaskMs: 92000,
    p95TaskMs: 135000,
    maxTaskMs: 178000,
    shuffleReadMb: 14500,
    shuffleWriteMb: 9800,
    spillDiskMb: 4200,
    gcTimePct: 48,
    catalystSnippet: `== Physical Plan ==
*(1) BatchEvalPython [parse_nested_json_udf(payload#9)], [pythonUDF0#33]
+- *(1) FileScan parquet raw_events[payload#9]`,
    rootCause: 'Row-by-row Python @udf breaks Tungsten whole-stage codegen and forces pickle serialization for every tuple.',
    fixConfigOrCode: `# Replace row-at-a-time Python UDF with native Catalyst or Arrow Pandas UDF:
df.withColumn("parsed", F.from_json("payload", schema))
# Or vectorized @pandas_udf("struct<...>") with Arrow enabled`,
    taskHistogram: [
      { bucket: '0-60s', tasks: 30 },
      { bucket: '60-120s', tasks: 210 },
      { bucket: '120s+ GC', tasks: 60, isStraggler: true },
    ],
  },
  {
    id: 'spark_ui_07_non_sargable_parquet',
    title: 'Full Partition Scan Ignored Due to Non-SARGable Filter',
    companyTag: 'PhonePe · Senior DE',
    stageSummary: 'FileScan parquet transactions [PartitionFilters: ()]',
    symptom: 'Job scans 42 TB across 1,095 daily partitions for a 24-hour query because PartitionFilters is empty.',
    taskCount: 4800,
    medianTaskMs: 28000,
    p95TaskMs: 49000,
    maxTaskMs: 82000,
    shuffleReadMb: 9600,
    shuffleWriteMb: 4100,
    spillDiskMb: 0,
    gcTimePct: 14,
    catalystSnippet: `== Physical Plan ==
*(1) Filter (date_format(created_at#1, 'yyyy-MM-dd') = '2026-05-01')
+- *(1) FileScan parquet txns[id,amt,dt] PartitionFilters: [], PushedFilters: []`,
    rootCause: 'Wrapping partition column or timestamp in date_format() prevents Catalyst partition pruning and Parquet row-group min/max pushdown.',
    fixConfigOrCode: `-- Filter directly on the partition column literal:
WHERE dt = '2026-05-01'
  AND created_at >= TIMESTAMP '2026-05-01 00:00:00'`,
    taskHistogram: [
      { bucket: '0-20s', tasks: 1200 },
      { bucket: '20-45s', tasks: 3100, isStraggler: true },
      { bucket: '45s+', tasks: 500 },
    ],
  },
  {
    id: 'spark_ui_08_null_skew_join',
    title: 'NULL Foreign-Key Storm Hashing to Partition #0',
    companyTag: 'Swiggy · Data Engineer II',
    stageSummary: 'SortMergeJoin on guest_device_id (42% NULLs)',
    symptom: 'All 180M guest checkout events with device_id=NULL hash identically to partition 0 in SortMergeJoin.',
    taskCount: 200,
    medianTaskMs: 6500,
    p95TaskMs: 11200,
    maxTaskMs: 1840000,
    shuffleReadMb: 38900,
    shuffleWriteMb: 21000,
    spillDiskMb: 29400,
    gcTimePct: 33,
    catalystSnippet: `== Physical Plan ==
*(3) SortMergeJoin [device_id#2], [device_id#41], LeftOuter
:- Exchange hashpartitioning(device_id#2, 200)
+- Exchange hashpartitioning(device_id#41, 200)`,
    rootCause: 'Murmur3 hash sends every NULL join key to identical bucket before Spark filters NULLs inside Inner/Left join evaluation.',
    fixConfigOrCode: `# Split NULL keys before LeftOuter join and union back without shuffle:
valid_joined = orders.filter("device_id IS NOT NULL").join(dim, "device_id", "left")
null_rows = orders.filter("device_id IS NULL").withColumn("dim_attr", F.lit(None))
result = valid_joined.unionByName(null_rows)`,
    taskHistogram: [
      { bucket: '0-10s', tasks: 185 },
      { bucket: '10-20s', tasks: 14 },
      { bucket: '30m (NULL Bucket)', tasks: 1, isStraggler: true },
    ],
  },
  {
    id: 'spark_ui_09_explode_explosion',
    title: 'Pre-Shuffle explode() Amplifies Shuffle Write 25x',
    companyTag: 'Meta · DE III',
    stageSummary: 'Generate explode(items) -> Exchange hashpartitioning',
    symptom: 'Shuffle Write explodes from 8 GB to 204 GB after exploding nested JSON array prior to filtering/projection.',
    taskCount: 500,
    medianTaskMs: 54000,
    p95TaskMs: 88000,
    maxTaskMs: 120000,
    shuffleReadMb: 204000,
    shuffleWriteMb: 204000,
    spillDiskMb: 44000,
    gcTimePct: 26,
    catalystSnippet: `== Physical Plan ==
Exchange hashpartitioning(category#9, 500)
+- Generate explode(items_array#4), [order_id, raw_blob, items_array]`,
    rootCause: 'Parent wide columns (raw_blob) were carried across explode() + shuffle instead of projecting only key+array and joining back after aggregation.',
    fixConfigOrCode: `# Select minimal keys before explode() and drop parent blob prior to shuffle:
df.select("order_id", F.explode("items").alias("item")).select("order_id", "item.category")`,
    taskHistogram: [
      { bucket: '0-30s', tasks: 80 },
      { bucket: '30-90s', tasks: 390, isStraggler: true },
      { bucket: '90s+', tasks: 30 },
    ],
  },
  {
    id: 'spark_ui_10_count_distinct_shuffle',
    title: 'Multi-Count-Distinct Causes Redundant 3x Expand Shuffle',
    companyTag: 'Databricks · Staff DE',
    stageSummary: 'ExpandExec -> HashAggregate (COUNT(DISTINCT user, session, device))',
    symptom: 'DAG shows an Expand node duplicating every row 3x before HashAggregate.',
    taskCount: 200,
    medianTaskMs: 39000,
    p95TaskMs: 62000,
    maxTaskMs: 89000,
    shuffleReadMb: 67000,
    shuffleWriteMb: 67000,
    spillDiskMb: 18500,
    gcTimePct: 21,
    catalystSnippet: `== Physical Plan ==
HashAggregate(keys=[country#1], functions=[count(distinct user_id), count(distinct session_id), count(distinct device_id)])
+- Exchange hashpartitioning(country#1, gid#99, 200)
   +- Expand [[country, user_id, null, null, 1], [country, null, session_id, null, 2], ...]`,
    rootCause: 'Multiple exact COUNT(DISTINCT col) expressions in one query trigger Catalyst ExpandExec multiplying input rows by N distinct columns.',
    fixConfigOrCode: `-- Use HyperLogLog approximate distinct (~2% RSD) for 10x single-pass speed:
SELECT country, approx_count_distinct(user_id), approx_count_distinct(session_id)
FROM events GROUP BY country;`,
    taskHistogram: [
      { bucket: '0-30s', tasks: 65 },
      { bucket: '30-60s', tasks: 115 },
      { bucket: '60s+', tasks: 20, isStraggler: true },
    ],
  },
  {
    id: 'spark_ui_11_cache_oom_eviction',
    title: 'Unbounded .cache() Without .unpersist() Evicts Execution Memory',
    companyTag: 'Snowflake · Cloud DE',
    stageSummary: 'InMemoryTableScan + Executor Shuffle FetchFailedException',
    symptom: 'After caching 3 intermediate DataFrames in a loop, storage pool pins 55% heap and triggers constant disk spill + BlockManager evictions.',
    taskCount: 200,
    medianTaskMs: 41000,
    p95TaskMs: 92000,
    maxTaskMs: 142000,
    shuffleReadMb: 28000,
    shuffleWriteMb: 19000,
    spillDiskMb: 37000,
    gcTimePct: 44,
    catalystSnippet: `== Physical Plan ==
*(4) InMemoryTableScan [user_id#1, score#8]
   +- InMemoryRelation [StorageLevel(disk, memory, deserialized, 1 replicas)]`,
    rootCause: 'Default MEMORY_AND_DISK deserialized cache stores heavyweight Java objects in storage memory, starving unified execution pool across stages.',
    fixConfigOrCode: `# Use MEMORY_AND_DISK_SER or checkpoint only reused DAG branches, and ALWAYS unpersist():
df_mid.persist(StorageLevel.MEMORY_AND_DISK_SER)
# ... use twice ...
df_mid.unpersist()`,
    taskHistogram: [
      { bucket: '0-30s', tasks: 95 },
      { bucket: '30-90s', tasks: 85 },
      { bucket: '90s+', tasks: 20, isStraggler: true },
    ],
  },
  {
    id: 'spark_ui_12_recompute_lineage',
    title: 'Wide Narrow-Split Lineage Recomputes Expensive Join 4 Times',
    companyTag: 'Walmart Global Tech · DE III',
    stageSummary: '4 separate .write() actions re-triggering Upstream Join Stage',
    symptom: 'Writing metrics to 4 output sinks triggers the exact same 12-minute Shuffle/Join stage 4 consecutive times.',
    taskCount: 800,
    medianTaskMs: 48000,
    p95TaskMs: 79000,
    maxTaskMs: 110000,
    shuffleReadMb: 92000,
    shuffleWriteMb: 92000,
    spillDiskMb: 12000,
    gcTimePct: 18,
    catalystSnippet: `== Job 0, Job 1, Job 2, Job 3 ==
Re-executing Stage 0..4 (SortMergeJoin) for Parquet sink, Iceberg sink, Audit count(), Slack Alert`,
    rootCause: 'Lazy evaluation recomputes the entire DAG from S3 source per Action when no shared intermediate persist/cache exists.',
    fixConfigOrCode: `enriched.persist(StorageLevel.DISK_ONLY) # Materialize once before fan-out writes
enriched.write.mode("overwrite").parquet(...)
audit_cnt = enriched.count()
enriched.unpersist()`,
    taskHistogram: [
      { bucket: 'Stage Repeats (4x)', tasks: 640, isStraggler: true },
      { bucket: 'Final Sink Write', tasks: 160 },
    ],
  },
  {
    id: 'spark_ui_13_aqe_small_shuffle',
    title: 'Static 4,000 Shuffle Partitions Produce 3,920 Empty Files',
    companyTag: 'Razorpay · Senior DE',
    stageSummary: 'WriteFiles -> 4,000 tiny 250KB output Parquet files',
    symptom: 'Over-provisioned shuffle.partitions=4000 on a 900 MB filtered dataset creates thousands of tiny Parquet files and Iceberg metadata bloat.',
    taskCount: 4000,
    medianTaskMs: 180,
    p95TaskMs: 650,
    maxTaskMs: 3200,
    shuffleReadMb: 900,
    shuffleWriteMb: 900,
    spillDiskMb: 0,
    gcTimePct: 9,
    catalystSnippet: `== Physical Plan ==
AdaptiveSparkPlan isFinalPlan=false
+- Exchange hashpartitioning(merchant#1, 4000) -> Writing 4000 part-*.parquet files`,
    rootCause: 'AQE coalescePartitions was disabled (or bypassed by repartition(4000)), forcing 4,000 tasks to write sub-MB Parquet files.',
    fixConfigOrCode: `spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
spark.conf.set("spark.sql.adaptive.advisoryPartitionSizeInBytes", "134217728")`,
    taskHistogram: [
      { bucket: '<1s Empty/Tiny', tasks: 3920, isStraggler: true },
      { bucket: '1-3s', tasks: 80 },
    ],
  },
  {
    id: 'spark_ui_14_dynamic_partition_overwrite',
    title: 'Static Overwrite Wipes Unrelated Historical S3 Partitions',
    companyTag: 'Atlassian · Data Engineer',
    stageSummary: 'InsertIntoHadoopFsRelationCommand (mode=overwrite)',
    symptom: 'Backfilling 1 day partition silently deleted 364 prior partitions in the S3 destination table.',
    taskCount: 64,
    medianTaskMs: 4200,
    p95TaskMs: 7100,
    maxTaskMs: 9500,
    shuffleReadMb: 1200,
    shuffleWriteMb: 1100,
    spillDiskMb: 0,
    gcTimePct: 8,
    catalystSnippet: `== Physical Plan ==
Execute InsertIntoHadoopFsRelationCommand s3://lake/fct_billing/, Overwrite, [dt]`,
    rootCause: 'Default partitionOverwriteMode=static deletes the entire root table directory instead of only partitions present in the incoming DataFrame.',
    fixConfigOrCode: `spark.conf.set("spark.sql.sources.partitionOverwriteMode", "dynamic")
# Or even safer in Iceberg/Delta, use replaceWhere / MERGE:
df.write.format("delta").option("replaceWhere", "dt = '2026-05-01'").mode("overwrite").save(path)`,
    taskHistogram: [
      { bucket: '0-5s', tasks: 52 },
      { bucket: '5-10s (Data Loss Risk)', tasks: 12, isStraggler: true },
    ],
  },
  {
    id: 'spark_ui_15_collect_driver_crash',
    title: 'df.collect() + Python Loop Triggers Driver Heap Collapse',
    companyTag: 'Google · Data Engineer',
    stageSummary: 'CollectLimit / Whole-Dataset Collect to Driver',
    symptom: 'Job executes fine across 40 executors, then hangs 9 minutes on Driver before crashing with GC overhead limit exceeded.',
    taskCount: 200,
    medianTaskMs: 3100,
    p95TaskMs: 5200,
    maxTaskMs: 6800,
    shuffleReadMb: 18500,
    shuffleWriteMb: 0,
    spillDiskMb: 0,
    gcTimePct: 82,
    catalystSnippet: `== Physical Plan ==
CollectMetrics / Driver collect() -> Transferring 18.5 GB across network to Single Driver JVM`,
    rootCause: 'Calling .collect() or .toPandas() pulls distributed executor partitions across the network into single-node Driver RAM.',
    fixConfigOrCode: `# Keep transformations distributed across executors or bound output via .limit(1000) / .write:
df.write.format("iceberg").mode("append").save("prod.gold.aggregated_events")
# For driver sampling, use df.limit(100).toPandas()`,
    taskHistogram: [
      { bucket: '0-5s (Executors)', tasks: 199 },
      { bucket: 'Driver Collect Crash', tasks: 1, isStraggler: true },
    ],
  },
];
