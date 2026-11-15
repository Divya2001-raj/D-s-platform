import type { Difficulty, ExperienceTier, Question } from '../types/platform';

interface SqlBlueprint {
  id: string;
  title: string;
  topic: string;
  subtopic: string;
  difficulty: Difficulty;
  experienceLevel: ExperienceTier;
  companies: string[];
  problemStatement: string;
  setupSql: string;
  adversarialSetupSql?: string;
  starterCode: string;
  solutionSql: string;
  alternativeApproaches: string;
  explanation: string;
  practicalRelevance: string;
  executionPlanNotes: string;
  relatedLearningId: string;
}

const CORE_SQL_BLUEPRINTS: SqlBlueprint[] = [
  {
    id: 'sql_01_top_3_dept_salaries',
    title: 'Top 3 Unique Salaries Per Department',
    topic: 'Window Functions',
    subtopic: 'DENSE_RANK Partitioning',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Google', 'Amazon', 'Microsoft', 'Flipkart'],
    problemStatement:
      'Given `employees(emp_id, emp_name, dept_id, salary)` and `departments(dept_id, dept_name)`, return the top 3 highest *distinct* salaries in each department. Output columns: `dept_name`, `emp_name`, `salary`, ordered by `dept_name ASC`, `salary DESC`, `emp_name ASC`.',
    setupSql: `CREATE TABLE departments (dept_id INTEGER PRIMARY KEY, dept_name TEXT);
CREATE TABLE employees (emp_id INTEGER PRIMARY KEY, emp_name TEXT, dept_id INTEGER, salary INTEGER);
INSERT INTO departments VALUES (1, 'Data Platform'), (2, 'ML Infra'), (3, 'Analytics');
INSERT INTO employees VALUES
  (101, 'Aarav', 1, 185000), (102, 'Maya', 1, 185000), (103, 'Liam', 1, 170000),
  (104, 'Noah', 1, 160000), (105, 'Zara', 1, 145000),
  (201, 'Elena', 2, 210000), (202, 'Rohan', 2, 195000), (203, 'Chloe', 2, 180000), (204, 'Vikram', 2, 165000),
  (301, 'Nia', 3, 150000), (302, 'Dev', 3, 140000);`,
    adversarialSetupSql: `INSERT INTO departments VALUES (4, 'Empty Dept');
INSERT INTO employees VALUES (106, 'Kiran', 1, 185000), (107, 'NullDept', NULL, 250000);`,
    starterCode: `-- Return: dept_name, emp_name, salary
-- Tables: departments(dept_id, dept_name), employees(emp_id, emp_name, dept_id, salary)
SELECT
  -- TODO: rank distinct salaries per department
;`,
    solutionSql: `WITH ranked AS (
  SELECT
    d.dept_name,
    e.emp_name,
    e.salary,
    DENSE_RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rnk
  FROM employees e
  JOIN departments d ON e.dept_id = d.dept_id
)
SELECT dept_name, emp_name, salary
FROM ranked
WHERE rnk <= 3
ORDER BY dept_name ASC, salary DESC, emp_name ASC;`,
    alternativeApproaches:
      'Correlated subquery counting distinct higher salaries: `WHERE (SELECT COUNT(DISTINCT e2.salary) FROM employees e2 WHERE e2.dept_id = e1.dept_id AND e2.salary > e1.salary) < 3`. Window functions run in O(N log N) single pass vs O(N^2) for correlated subqueries.',
    explanation:
      '`DENSE_RANK()` handles tied top salaries without skipping ranks, unlike `RANK()`, ensuring 3 distinct salary levels per department.',
    practicalRelevance:
      'Top-N per group deduplication and ranking appears in leaderboard serving, compensation benchmarking, and feature selection pipelines.',
    executionPlanNotes:
      'Single scan + sort on (dept_id, salary DESC) for window evaluation; adding composite index `(dept_id, salary DESC)` removes the window sort step in engines like PostgreSQL/SQLite.',
    relatedLearningId: 'topic_query_engines',
  },
  {
    id: 'sql_02_gaps_islands_streaks',
    title: 'Gaps & Islands: Consecutive Active Pipeline Days',
    topic: 'Gaps & Islands',
    subtopic: 'Date Difference Grouping',
    difficulty: 'Hard',
    experienceLevel: '4-6 yrs',
    companies: ['Netflix', 'Uber', 'Databricks', 'Swiggy'],
    problemStatement:
      'Given `pipeline_runs(pipeline_id, run_date, status)`, find all streaks of 3 or more *consecutive* calendar days where a pipeline had `status = \'SUCCESS\'` (deduplicate multiple runs on the same day). Return `pipeline_id`, `streak_start`, `streak_end`, `streak_days`, ordered by `pipeline_id ASC`, `streak_start ASC`.',
    setupSql: `CREATE TABLE pipeline_runs (run_id INTEGER PRIMARY KEY, pipeline_id TEXT, run_date TEXT, status TEXT);
INSERT INTO pipeline_runs VALUES
  (1, 'etl_orders', '2026-01-01', 'SUCCESS'),
  (2, 'etl_orders', '2026-01-01', 'SUCCESS'),
  (3, 'etl_orders', '2026-01-02', 'SUCCESS'),
  (4, 'etl_orders', '2026-01-03', 'SUCCESS'),
  (5, 'etl_orders', '2026-01-04', 'FAILED'),
  (6, 'etl_orders', '2026-01-06', 'SUCCESS'),
  (7, 'etl_orders', '2026-01-07', 'SUCCESS'),
  (8, 'etl_clicks', '2026-01-10', 'SUCCESS'),
  (9, 'etl_clicks', '2026-01-11', 'SUCCESS'),
  (10, 'etl_clicks', '2026-01-12', 'SUCCESS'),
  (11, 'etl_clicks', '2026-01-13', 'SUCCESS');`,
    adversarialSetupSql: `INSERT INTO pipeline_runs VALUES
  (12, 'etl_orders', '2026-01-08', 'SUCCESS'),
  (13, 'etl_orders', '2026-01-08', 'FAILED'),
  (14, 'etl_clicks', '2026-01-13', 'SUCCESS'),
  (15, 'etl_nulls', NULL, 'SUCCESS');`,
    starterCode: `-- Return: pipeline_id, streak_start, streak_end, streak_days (streaks >= 3 consecutive days)
-- Table: pipeline_runs(run_id, pipeline_id, run_date, status)
WITH daily_success AS (
  SELECT DISTINCT pipeline_id, run_date
  FROM pipeline_runs
  WHERE status = 'SUCCESS' AND run_date IS NOT NULL
)
SELECT
  -- TODO: compute gap-and-island streaks
;`,
    solutionSql: `WITH daily_success AS (
  SELECT DISTINCT pipeline_id, run_date
  FROM pipeline_runs
  WHERE status = 'SUCCESS'
),
grouped AS (
  SELECT
    pipeline_id,
    run_date,
    date(run_date, '-' || ROW_NUMBER() OVER (PARTITION BY pipeline_id ORDER BY run_date) || ' days') AS island_key
  FROM daily_success
)
SELECT
  pipeline_id,
  MIN(run_date) AS streak_start,
  MAX(run_date) AS streak_end,
  COUNT(*) AS streak_days
FROM grouped
GROUP BY pipeline_id, island_key
HAVING COUNT(*) >= 3
ORDER BY pipeline_id ASC, streak_start ASC;`,
    alternativeApproaches:
      'Use `LAG(run_date)` to mark session/island boundaries (`CASE WHEN julianday(run_date) - julianday(prev_date) = 1 THEN 0 ELSE 1 END`) followed by a running `SUM()` to assign island IDs.',
    explanation:
      'Subtracting a dense `ROW_NUMBER()` in days from consecutive dates yields an identical invariant anchor date (`island_key`) for every uninterrupted streak.',
    practicalRelevance:
      'Used in SLA uptime streak reporting, DAU user retention streaks, and IoT sensor continuity detection.',
    executionPlanNotes:
      'Requires deduplication sort/hash on `(pipeline_id, run_date)` before window `ROW_NUMBER()` and final hash aggregate.',
    relatedLearningId: 'topic_data_modeling',
  },
  {
    id: 'sql_03_clickstream_sessionization',
    title: '30-Minute Inactivity Clickstream Sessionization',
    topic: 'Sessionization',
    subtopic: 'LAG + Running Boundary Sum',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Airbnb', 'Uber', 'Meta', 'Razorpay'],
    problemStatement:
      'Given `click_events(event_id, user_id, event_ts)`, assign a monotonically increasing `session_num` per user where a new session begins if > 30 minutes (1800 seconds) have elapsed since the user\'s previous event. Return `user_id`, `session_num`, `session_start`, `session_end`, `event_count`, ordered by `user_id`, `session_num`.',
    setupSql: `CREATE TABLE click_events (event_id INTEGER PRIMARY KEY, user_id TEXT, event_ts TEXT);
INSERT INTO click_events VALUES
  (1, 'u1', '2026-02-01 10:00:00'),
  (2, 'u1', '2026-02-01 10:12:00'),
  (3, 'u1', '2026-02-01 10:28:00'),
  (4, 'u1', '2026-02-01 11:05:00'),
  (5, 'u1', '2026-02-01 11:20:00'),
  (6, 'u2', '2026-02-01 09:00:00'),
  (7, 'u2', '2026-02-01 09:45:00');`,
    adversarialSetupSql: `INSERT INTO click_events VALUES
  (8, 'u1', '2026-02-01 11:20:00'),
  (9, 'u2', '2026-02-01 09:30:00');`,
    starterCode: `-- Return: user_id, session_num, session_start, session_end, event_count (>30 min inactivity starts new session)
-- Table: click_events(event_id, user_id, event_ts)
SELECT
  -- TODO: detect > 1800s inactivity boundaries per user_id
;`,
    solutionSql: `WITH lagged AS (
  SELECT
    user_id,
    event_ts,
    LAG(event_ts) OVER (PARTITION BY user_id ORDER BY event_ts) AS prev_ts
  FROM click_events
),
flagged AS (
  SELECT
    user_id,
    event_ts,
    CASE
      WHEN prev_ts IS NULL OR (julianday(event_ts) - julianday(prev_ts)) * 86400 > 1800 THEN 1
      ELSE 0
    END AS is_new_session
  FROM lagged
),
sessionized AS (
  SELECT
    user_id,
    event_ts,
    SUM(is_new_session) OVER (PARTITION BY user_id ORDER BY event_ts ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS session_num
  FROM flagged
)
SELECT
  user_id,
  session_num,
  MIN(event_ts) AS session_start,
  MAX(event_ts) AS session_end,
  COUNT(*) AS event_count
FROM sessionized
GROUP BY user_id, session_num
ORDER BY user_id, session_num;`,
    alternativeApproaches:
      'In Snowflake, `CONDITIONAL_TRUE_EVENT` simplifies the boundary flag + running sum into a single expression; in Spark SQL / Trino, the standard `LAG` + `SUM() OVER` pattern shown here is portable.',
    explanation:
      'Each boundary > 1800s emits a `1`. A cumulative `SUM()` over the ordered partition increments `session_num` cleanly without self-joins.',
    practicalRelevance:
      'Sessionization is foundational for web/mobile product analytics, attribution modeling, and fraud burst detection.',
    executionPlanNotes:
      'Uses one sort on `(user_id, event_ts)` reused across both window stages if an index on `(user_id, event_ts)` exists.',
    relatedLearningId: 'topic_streaming_kafka_flink',
  },
  {
    id: 'sql_04_rolling_7d_gmv',
    title: '7-Day Rolling GMV with Missing Calendar Days',
    topic: 'Rolling Aggregations',
    subtopic: 'Date Spine + Range Framing',
    difficulty: 'Hard',
    experienceLevel: '4-6 yrs',
    companies: ['Amazon', 'Flipkart', 'Meesho', 'Shopify'],
    problemStatement:
      'Given `orders(order_id, order_date, amount)` with sparse dates (some days have zero orders), compute a complete daily series from `2026-03-01` to `2026-03-07` showing `dt`, `daily_gmv`, and `rolling_7d_gmv` (sum of current day and prior 6 calendar days).',
    setupSql: `CREATE TABLE orders (order_id INTEGER PRIMARY KEY, order_date TEXT, amount REAL);
INSERT INTO orders VALUES
  (1, '2026-03-01', 120.0),
  (2, '2026-03-01', 80.0),
  (3, '2026-03-03', 300.0),
  (4, '2026-03-05', 150.0),
  (5, '2026-03-07', 250.0);`,
    adversarialSetupSql: `INSERT INTO orders VALUES (6, '2026-03-04', NULL), (7, '2026-02-25', 999.0);`,
    starterCode: `-- Return: dt, daily_gmv, rolling_7d_gmv for 2026-03-01 .. 2026-03-07
-- Table: orders(order_id, order_date, amount)
WITH RECURSIVE date_spine(dt) AS (
  SELECT '2026-03-01'
  UNION ALL
  SELECT date(dt, '+1 day') FROM date_spine WHERE dt < '2026-03-07'
)
SELECT
  -- TODO: left join orders and compute 7-day rolling sum
;`,
    solutionSql: `WITH RECURSIVE date_spine(dt) AS (
  SELECT '2026-03-01'
  UNION ALL
  SELECT date(dt, '+1 day') FROM date_spine WHERE dt < '2026-03-07'
),
daily AS (
  SELECT
    ds.dt,
    COALESCE(SUM(o.amount), 0.0) AS daily_gmv
  FROM date_spine ds
  LEFT JOIN orders o ON o.order_date = ds.dt
  GROUP BY ds.dt
)
SELECT
  dt,
  ROUND(daily_gmv, 2) AS daily_gmv,
  ROUND(SUM(daily_gmv) OVER (ORDER BY dt ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS rolling_7d_gmv
FROM daily
ORDER BY dt ASC;`,
    alternativeApproaches:
      'Using `RANGE BETWEEN INTERVAL 6 DAY PRECEDING AND CURRENT ROW` in Postgres/Snowflake/BigQuery avoids a date spine for rolling windows, but omits zero-order rows from output.',
    explanation:
      'Constructing a recursive CTE date spine first guarantees every calendar date exists so `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` genuinely spans 7 calendar days.',
    practicalRelevance:
      'Preventing silent 7-row vs 7-day bugs on sparse time-series data is a classic Senior Data Engineer interview trap.',
    executionPlanNotes:
      'Pre-aggregating `orders` by `order_date` before joining to `date_spine` avoids scanning exploded rows in large fact tables.',
    relatedLearningId: 'topic_data_modeling',
  },
  {
    id: 'sql_05_point_in_time_asof_join',
    title: 'Point-in-Time (ASOF) Feature Join Without Data Leakage',
    topic: 'Point-in-Time Joins',
    subtopic: 'Temporal Feature Enrichment',
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companies: ['Uber', 'Databricks', 'Stripe', 'PhonePe'],
    problemStatement:
      'Given `transactions(tx_id, user_id, tx_ts, amount)` and `risk_scores(user_id, updated_ts, score)`, enrich every transaction with the latest `score` recorded *strictly at or before* `tx_ts` (returning NULL if none existed yet). Return `tx_id`, `user_id`, `tx_ts`, `amount`, `score_at_tx`, ordered by `tx_id`.',
    setupSql: `CREATE TABLE transactions (tx_id INTEGER PRIMARY KEY, user_id TEXT, tx_ts TEXT, amount REAL);
CREATE TABLE risk_scores (user_id TEXT, updated_ts TEXT, score INTEGER);
INSERT INTO transactions VALUES
  (1, 'u1', '2026-04-01 09:00:00', 50.0),
  (2, 'u1', '2026-04-01 12:00:00', 220.0),
  (3, 'u2', '2026-04-01 10:00:00', 95.0);
INSERT INTO risk_scores VALUES
  ('u1', '2026-04-01 08:30:00', 15),
  ('u1', '2026-04-01 10:00:00', 42),
  ('u1', '2026-04-01 14:00:00', 88),
  ('u2', '2026-04-01 11:00:00', 70);`,
    adversarialSetupSql: `INSERT INTO transactions VALUES (4, 'u1', '2026-04-01 10:00:00', 110.0), (5, 'u3', '2026-04-01 15:00:00', 40.0);
INSERT INTO risk_scores VALUES ('u1', '2026-04-01 12:00:00', 99);`,
    starterCode: `-- Return: tx_id, user_id, tx_ts, amount, score_at_tx (latest score where updated_ts <= tx_ts)
-- Tables: transactions(tx_id, user_id, tx_ts, amount), risk_scores(user_id, updated_ts, score)
SELECT
  -- TODO: perform point-in-time ASOF lookup without future leakage
;`,
    solutionSql: `WITH joined AS (
  SELECT
    t.tx_id,
    t.user_id,
    t.tx_ts,
    t.amount,
    r.score,
    ROW_NUMBER() OVER (PARTITION BY t.tx_id ORDER BY r.updated_ts DESC) AS rn
  FROM transactions t
  LEFT JOIN risk_scores r
    ON t.user_id = r.user_id AND r.updated_ts <= t.tx_ts
)
SELECT tx_id, user_id, tx_ts, amount, score AS score_at_tx
FROM joined
WHERE rn = 1 OR score IS NULL
ORDER BY tx_id;`,
    alternativeApproaches:
      'In Snowflake/DuckDB, native `ASOF JOIN` solves this in O(N log M) without intermediate row explosion; alternatively use SCD Type 2 `valid_from` / `valid_to` range join.',
    explanation:
      'Standard `LEFT JOIN` with `r.updated_ts <= t.tx_ts` followed by `ROW_NUMBER() OVER (PARTITION BY tx_id ORDER BY updated_ts DESC)` selects the exact most recent historical state without future leakage.',
    practicalRelevance:
      'Critical for ML feature stores (Feast/Tecton), fraud scoring backfills, and FX currency conversion at transaction timestamp.',
    executionPlanNotes:
      'Inequality join (`<=`) can multiply rows per user before filtering `rn = 1`. In production Spark/Trino, bucket/partition by `user_id` or convert `risk_scores` into SCD-2 intervals first.',
    relatedLearningId: 'topic_data_modeling',
  },
  {
    id: 'sql_06_funnel_conversion',
    title: 'E-Commerce Checkout Funnel Conversion Rates',
    topic: 'Funnel Conversion',
    subtopic: 'Ordered Step Attribution',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Amazon', 'Flipkart', 'Myntra', 'Zomato'],
    problemStatement:
      'Given `funnel_events(user_id, stage, event_ts)` with stages `view`, `cart`, `checkout`, `purchase`, count unique users who completed each stage *in sequential chronological order* (`view` -> `cart` -> `checkout` -> `purchase`). Return `view_users`, `cart_users`, `checkout_users`, `purchase_users`.',
    setupSql: `CREATE TABLE funnel_events (id INTEGER PRIMARY KEY, user_id TEXT, stage TEXT, event_ts TEXT);
INSERT INTO funnel_events VALUES
  (1, 'u1', 'view', '2026-05-01 10:00:00'),
  (2, 'u1', 'cart', '2026-05-01 10:05:00'),
  (3, 'u1', 'checkout', '2026-05-01 10:08:00'),
  (4, 'u1', 'purchase', '2026-05-01 10:10:00'),
  (5, 'u2', 'view', '2026-05-01 11:00:00'),
  (6, 'u2', 'cart', '2026-05-01 11:05:00'),
  (7, 'u3', 'purchase', '2026-05-01 12:00:00'),
  (8, 'u4', 'view', '2026-05-01 13:00:00'),
  (9, 'u4', 'checkout', '2026-05-01 13:04:00');`,
    adversarialSetupSql: `INSERT INTO funnel_events VALUES
  (10, 'u5', 'view', '2026-05-01 14:05:00'),
  (11, 'u5', 'cart', '2026-05-01 14:00:00'),
  (12, 'u6', 'view', '2026-05-01 15:00:00'),
  (13, 'u6', 'view', '2026-05-01 15:01:00');`,
    starterCode: `-- Return: view_users, cart_users, checkout_users, purchase_users (strictly ordered stages)
-- Table: funnel_events(id, user_id, stage, event_ts)
SELECT
  -- TODO: enforce chronological stage progression per user_id
;`,
    solutionSql: `WITH user_stages AS (
  SELECT
    user_id,
    MIN(CASE WHEN stage = 'view' THEN event_ts END) AS view_ts,
    MIN(CASE WHEN stage = 'cart' THEN event_ts END) AS cart_ts,
    MIN(CASE WHEN stage = 'checkout' THEN event_ts END) AS checkout_ts,
    MIN(CASE WHEN stage = 'purchase' THEN event_ts END) AS purchase_ts
  FROM funnel_events
  GROUP BY user_id
)
SELECT
  COUNT(view_ts) AS view_users,
  COUNT(CASE WHEN cart_ts > view_ts THEN 1 END) AS cart_users,
  COUNT(CASE WHEN checkout_ts > cart_ts AND cart_ts > view_ts THEN 1 END) AS checkout_users,
  COUNT(CASE WHEN purchase_ts > checkout_ts AND checkout_ts > cart_ts AND cart_ts > view_ts THEN 1 END) AS purchase_users
FROM user_stages;`,
    alternativeApproaches:
      'For multi-visit funnels where a user retries after an abandoned cart, use `LEAD()` across ordered events or ClickHouse `windowFunnel()`.',
    explanation:
      'Pivoting earliest timestamps per user stage lets us enforce strict causal ordering (`u3` without view/cart/checkout and `u4` skipping cart are excluded from downstream counts).',
    practicalRelevance:
      'Product growth and experimentation teams rely on strict ordered funnel SQL in dbt models.',
    executionPlanNotes:
      'Single-pass hash aggregation on `user_id` — far cheaper than 4 self-joins on large clickstream tables.',
    relatedLearningId: 'topic_data_modeling',
  },
  {
    id: 'sql_07_cohort_retention_matrix',
    title: 'Monthly Cohort Retention Percentage',
    topic: 'Retention & Cohorts',
    subtopic: 'Cohort Month Offset',
    difficulty: 'Hard',
    experienceLevel: '4-6 yrs',
    companies: ['Meta', 'Netflix', 'Atlassian', 'LinkedIn'],
    problemStatement:
      'Given `user_activity(user_id, activity_date)`, define each user\'s cohort as the month (`YYYY-MM`) of their first activity. Compute `cohort_month`, `month_offset` (0, 1, 2...), `active_users`, and `retention_pct` (rounded to 1 decimal), ordered by `cohort_month`, `month_offset`.',
    setupSql: `CREATE TABLE user_activity (user_id TEXT, activity_date TEXT);
INSERT INTO user_activity VALUES
  ('u1', '2026-01-05'), ('u1', '2026-02-10'), ('u1', '2026-03-15'),
  ('u2', '2026-01-12'), ('u2', '2026-02-18'),
  ('u3', '2026-01-20'),
  ('u4', '2026-02-02'), ('u4', '2026-03-04');`,
    adversarialSetupSql: `INSERT INTO user_activity VALUES ('u1', '2026-02-22'), ('u2', '2026-01-29');`,
    starterCode: `-- Return: cohort_month, month_offset, active_users, retention_pct
-- Table: user_activity(user_id, activity_date)
SELECT
  -- TODO: compute cohort month and monthly retention percentage
;`,
    solutionSql: `WITH first_seen AS (
  SELECT user_id, strftime('%Y-%m', MIN(activity_date)) AS cohort_month
  FROM user_activity
  GROUP BY user_id
),
monthly_active AS (
  SELECT DISTINCT user_id, strftime('%Y-%m', activity_date) AS act_month
  FROM user_activity
),
cohort_counts AS (
  SELECT
    f.cohort_month,
    (CAST(substr(m.act_month, 1, 4) AS INTEGER) - CAST(substr(f.cohort_month, 1, 4) AS INTEGER)) * 12
      + (CAST(substr(m.act_month, 6, 2) AS INTEGER) - CAST(substr(f.cohort_month, 6, 2) AS INTEGER)) AS month_offset,
    COUNT(DISTINCT m.user_id) AS active_users
  FROM first_seen f
  JOIN monthly_active m ON f.user_id = m.user_id
  GROUP BY f.cohort_month, month_offset
)
SELECT
  cohort_month,
  month_offset,
  active_users,
  ROUND(active_users * 100.0 / MAX(CASE WHEN month_offset = 0 THEN active_users END) OVER (PARTITION BY cohort_month), 1) AS retention_pct
FROM cohort_counts
ORDER BY cohort_month, month_offset;`,
    alternativeApproaches:
      'In BigQuery/Snowflake, `DATE_DIFF(act_month, cohort_month, MONTH)` computes the month offset directly.',
    explanation:
      'Deduplicating `(user_id, act_month)` first avoids double counting multi-day users; windowing `MAX(CASE WHEN month_offset = 0 ...)` fetches cohort size cleanly without another join.',
    practicalRelevance:
      'SaaS and consumer analytics engineers build cohort retention tables to evaluate product stickiness and LTV.',
    executionPlanNotes:
      'Pre-aggregating to distinct `(user_id, act_month)` drastically shrinks join cardinality.',
    relatedLearningId: 'topic_data_modeling',
  },
  {
    id: 'sql_08_recursive_org_hierarchy',
    title: 'Recursive CTE: Org Chart Rollup & Manager Depth',
    topic: 'Recursive CTEs',
    subtopic: 'Hierarchical Graph Traversal',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Salesforce', 'Microsoft', 'Intuit', 'LinkedIn'],
    problemStatement:
      'Given `org(emp_id, name, manager_id, budget)`, traverse the hierarchy starting from the root (`manager_id IS NULL`) to return `emp_id`, `name`, `depth` (root = 0), and `path` (e.g., `VP > Director > Lead`), ordered by `depth ASC, emp_id ASC`.',
    setupSql: `CREATE TABLE org (emp_id INTEGER PRIMARY KEY, name TEXT, manager_id INTEGER, budget INTEGER);
INSERT INTO org VALUES
  (1, 'VP Data', NULL, 500),
  (2, 'Dir Platform', 1, 300),
  (3, 'Dir Analytics', 1, 200),
  (4, 'Staff DE', 2, 150),
  (5, 'Senior DE', 4, 100);`,
    starterCode: `-- Return: emp_id, name, depth, path (starting from manager_id IS NULL)
-- Table: org(emp_id, name, manager_id, budget)
WITH RECURSIVE tree AS (
  SELECT emp_id, name, 0 AS depth, name AS path
  FROM org
  WHERE manager_id IS NULL
  -- UNION ALL ...
)
SELECT emp_id, name, depth, path
FROM tree
ORDER BY depth ASC, emp_id ASC;`,
    solutionSql: `WITH RECURSIVE tree AS (
  SELECT emp_id, name, 0 AS depth, name AS path
  FROM org
  WHERE manager_id IS NULL
  UNION ALL
  SELECT o.emp_id, o.name, t.depth + 1, t.path || ' > ' || o.name
  FROM org o
  JOIN tree t ON o.manager_id = t.emp_id
)
SELECT emp_id, name, depth, path
FROM tree
ORDER BY depth ASC, emp_id ASC;`,
    alternativeApproaches:
      'For deep graphs or cycle protection, track visited IDs in the path string and guard `instr(path, o.name) = 0` plus a `depth < 50` termination cap.',
    explanation:
      'The anchor query seeds depth 0 from `manager_id IS NULL`, and the recursive member joins children until no new rows are produced.',
    practicalRelevance:
      'Used for BOM explosion, lineage dependency graphs (dbt/Airflow upstream-downstream), and RBAC org trees.',
    executionPlanNotes:
      'Indexing `org(manager_id)` converts each recursive step from a full scan into an indexed lookup.',
    relatedLearningId: 'topic_query_engines',
  },
  {
    id: 'sql_09_deduplicate_cdc_events',
    title: 'Deduplicate Out-of-Order CDC Events (Latest State)',
    topic: 'Deduplication',
    subtopic: 'CDC Upsert Snapshotting',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Databricks', 'Snowflake', 'Confluent', 'PhonePe'],
    problemStatement:
      'A Kafka CDC topic landed duplicate and out-of-order rows in `cdc_customers(id, email, tier, op, lsn_seq)`. Compute the final active snapshot excluding hard deletes (`op = \'D\'`), keeping the row with the highest `lsn_seq` per `id`. Order by `id ASC`.',
    setupSql: `CREATE TABLE cdc_customers (id INTEGER, email TEXT, tier TEXT, op TEXT, lsn_seq INTEGER);
INSERT INTO cdc_customers VALUES
  (1, 'a@co.io', 'free', 'I', 100),
  (1, 'a@co.io', 'pro', 'U', 105),
  (1, 'a@co.io', 'free', 'U', 102),
  (2, 'b@co.io', 'pro', 'I', 101),
  (2, 'b@co.io', 'pro', 'D', 109),
  (3, 'c@co.io', 'enterprise', 'I', 110);`,
    adversarialSetupSql: `INSERT INTO cdc_customers VALUES
  (1, 'a@co.io', 'enterprise', 'D', 120),
  (4, 'd@co.io', 'pro', 'U', 115),
  (4, 'd@co.io', 'free', 'I', 110),
  (5, 'e@co.io', NULL, 'I', 112);`,
    starterCode: `-- Return: id, email, tier, lsn_seq (latest non-deleted CDC state per id)
-- Table: cdc_customers(id, email, tier, op, lsn_seq)
SELECT
  -- TODO: rank by lsn_seq DESC before filtering op != 'D'
;`,
    solutionSql: `WITH ranked AS (
  SELECT
    id, email, tier, op, lsn_seq,
    ROW_NUMBER() OVER (PARTITION BY id ORDER BY lsn_seq DESC) AS rn
  FROM cdc_customers
)
SELECT id, email, tier, lsn_seq
FROM ranked
WHERE rn = 1 AND op != 'D'
ORDER BY id ASC;`,
    alternativeApproaches:
      'In Snowflake use `QUALIFY ROW_NUMBER() OVER (PARTITION BY id ORDER BY lsn_seq DESC) = 1`; in BigQuery `ARRAY_AGG(STRUCT(...) ORDER BY lsn_seq DESC LIMIT 1)[OFFSET(0)]`.',
    explanation:
      'Filtering `op != \'D\'` MUST happen *after* `rn = 1`, never before — otherwise an earlier `I` or `U` would resurface after a delete tombstone.',
    practicalRelevance:
      'Every Debezium/CDC Bronze-to-Silver Lakehouse pipeline depends on this exact tombstone-safe deduplication rule.',
    executionPlanNotes:
      'Partitioning Bronze tables by ingestion date with Z-Order/Clustering on `(id, lsn_seq)` speeds up incremental MERGE.',
    relatedLearningId: 'topic_lakehouse_formats',
  },
  {
    id: 'sql_10_median_and_ntile',
    title: 'Exact Median Latency & Top Quartile Endpoints',
    topic: 'Window Functions',
    subtopic: 'NTILE & Percentile Math',
    difficulty: 'Hard',
    experienceLevel: '4-6 yrs',
    companies: ['Uber', 'Netflix', 'Databricks', 'Google'],
    problemStatement:
      'Given `api_latency(endpoint, latency_ms)`, calculate the exact median latency per endpoint (handling both odd and even sample counts) rounded to 1 decimal place. Return `endpoint`, `sample_count`, `median_ms`, ordered by `median_ms DESC`.',
    setupSql: `CREATE TABLE api_latency (id INTEGER PRIMARY KEY, endpoint TEXT, latency_ms INTEGER);
INSERT INTO api_latency VALUES
  (1, '/ingest', 12), (2, '/ingest', 18), (3, '/ingest', 25), (4, '/ingest', 40),
  (5, '/query', 80), (6, '/query', 110), (7, '/query', 140),
  (8, '/auth', 15), (9, '/auth', 21);`,
    adversarialSetupSql: `INSERT INTO api_latency VALUES (10, '/ingest', 18), (11, '/auth', 18), (12, '/query', 110);`,
    starterCode: `-- Return: endpoint, sample_count, median_ms (exact median for odd & even counts)
-- Table: api_latency(id, endpoint, latency_ms)
SELECT
  -- TODO: order latencies per endpoint and select middle 1 or 2 rows
;`,
    solutionSql: `WITH ordered AS (
  SELECT
    endpoint,
    latency_ms,
    ROW_NUMBER() OVER (PARTITION BY endpoint ORDER BY latency_ms ASC) AS rn,
    COUNT(*) OVER (PARTITION BY endpoint) AS cnt
  FROM api_latency
)
SELECT
  endpoint,
  MAX(cnt) AS sample_count,
  ROUND(AVG(latency_ms * 1.0), 1) AS median_ms
FROM ordered
WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2)
GROUP BY endpoint
ORDER BY median_ms DESC;`,
    alternativeApproaches:
      'In PostgreSQL/Snowflake/Trino use `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms)` or `APPROX_PERCENTILE` for massive scale.',
    explanation:
      'Integer division `(cnt + 1) / 2` and `(cnt + 2) / 2` resolve to the single middle row when `cnt` is odd, and the two middle rows when `cnt` is even, so `AVG()` gives the exact median.',
    practicalRelevance:
      'Writing engine-agnostic exact median without `PERCENTILE_CONT` is frequently tested in SQLite/MySQL/Trino interviews.',
    executionPlanNotes:
      'Window sort on `(endpoint, latency_ms)` is computed once and shared across `ROW_NUMBER()` and `COUNT()`.',
    relatedLearningId: 'topic_query_engines',
  },
  {
    id: 'sql_11_overlapping_intervals',
    title: 'Merge Overlapping Cloud Cluster Maintenance Windows',
    topic: 'Gaps & Islands',
    subtopic: 'Interval Merging',
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companies: ['Snowflake', 'Google', 'Amazon', 'Atlassian'],
    problemStatement:
      'Given `maint_windows(cluster_id, start_min, end_min)`, merge overlapping or contiguous (`next.start_min <= current_max_end`) maintenance windows per `cluster_id`. Return `cluster_id`, `merged_start`, `merged_end`, ordered by `cluster_id`, `merged_start`.',
    setupSql: `CREATE TABLE maint_windows (id INTEGER PRIMARY KEY, cluster_id TEXT, start_min INTEGER, end_min INTEGER);
INSERT INTO maint_windows VALUES
  (1, 'c1', 10, 30), (2, 'c1', 20, 50), (3, 'c1', 50, 65), (4, 'c1', 80, 100),
  (5, 'c2', 5, 15), (6, 'c2', 25, 40);`,
    adversarialSetupSql: `INSERT INTO maint_windows VALUES (7, 'c1', 15, 25), (8, 'c2', 40, 45);`,
    starterCode: `-- Return: cluster_id, merged_start, merged_end
-- Table: maint_windows(id, cluster_id, start_min, end_min)
SELECT
  -- TODO: merge overlapping or touching maintenance intervals
;`,
    solutionSql: `WITH running AS (
  SELECT
    cluster_id,
    start_min,
    end_min,
    MAX(end_min) OVER (PARTITION BY cluster_id ORDER BY start_min, end_min ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max_end
  FROM maint_windows
),
islands AS (
  SELECT
    cluster_id,
    start_min,
    end_min,
    SUM(CASE WHEN prev_max_end IS NULL OR start_min > prev_max_end THEN 1 ELSE 0 END)
      OVER (PARTITION BY cluster_id ORDER BY start_min, end_min ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS grp
  FROM running
)
SELECT
  cluster_id,
  MIN(start_min) AS merged_start,
  MAX(end_min) AS merged_end
FROM islands
GROUP BY cluster_id, grp
ORDER BY cluster_id, merged_start;`,
    alternativeApproaches:
      'In Python/PySpark, sort intervals by `start` and sweep in O(N log N); in SQL, `MAX(end_min) OVER (... 1 PRECEDING)` handles nested intervals correctly unlike simple `LAG(end_min)`.',
    explanation:
      'Using `MAX(end_min)` across *all* preceding rows (not just `LAG(end_min, 1)`) catches cases where a short interval is completely contained inside an earlier wider interval.',
    practicalRelevance:
      'Essential for compute uptime billing, ad-impression viewability deduplication, and warehouse utilization accounting.',
    executionPlanNotes:
      'Two linear window passes over a single `(cluster_id, start_min, end_min)` sort.',
    relatedLearningId: 'topic_query_engines',
  },
  {
    id: 'sql_12_yoy_category_growth',
    title: 'Month-over-Month Revenue Growth & Running Share',
    topic: 'Window Functions',
    subtopic: 'LAG & Partition Ratios',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['Flipkart', 'Swiggy', 'Amazon', 'Intuit'],
    problemStatement:
      'Given `monthly_rev(category, month_str, revenue)`, compute each category\'s `prev_rev`, `mom_growth_pct` (`ROUND((revenue - prev_rev) * 100.0 / prev_rev, 2)`), and `pct_of_month_total`. Order by `category`, `month_str`.',
    setupSql: `CREATE TABLE monthly_rev (category TEXT, month_str TEXT, revenue REAL);
INSERT INTO monthly_rev VALUES
  ('Cloud', '2026-01', 1000.0), ('Cloud', '2026-02', 1250.0), ('Cloud', '2026-03', 1500.0),
  ('Ads', '2026-01', 2000.0), ('Ads', '2026-02', 1800.0), ('Ads', '2026-03', 2250.0);`,
    adversarialSetupSql: `INSERT INTO monthly_rev VALUES ('ZeroRev', '2026-01', 0.0), ('ZeroRev', '2026-02', 500.0);`,
    starterCode: `-- Return: category, month_str, revenue, prev_rev, mom_growth_pct, pct_of_month_total
-- Table: monthly_rev(category, month_str, revenue)
SELECT
  -- TODO: guard against zero division with NULLIF
;`,
    solutionSql: `SELECT
  category,
  month_str,
  revenue,
  LAG(revenue) OVER (PARTITION BY category ORDER BY month_str) AS prev_rev,
  ROUND((revenue - LAG(revenue) OVER (PARTITION BY category ORDER BY month_str)) * 100.0
    / NULLIF(LAG(revenue) OVER (PARTITION BY category ORDER BY month_str), 0), 2) AS mom_growth_pct,
  ROUND(revenue * 100.0 / SUM(revenue) OVER (PARTITION BY month_str), 2) AS pct_of_month_total
FROM monthly_rev
ORDER BY category, month_str;`,
    alternativeApproaches:
      'Self-join on `month_str - 1 month`, though `LAG()` avoids extra joins and handles missing months if paired with a month spine.',
    explanation:
      'Always wrap denominators in `NULLIF(..., 0)` in production analytical SQL to guard against division-by-zero failures.',
    practicalRelevance:
      'Core KPI mart pattern in dbt / Looker / PowerBI executive dashboards.',
    executionPlanNotes:
      'Requires two window sorts: one by `(category, month_str)` and one by `month_str`.',
    relatedLearningId: 'topic_data_modeling',
  },
];

interface SqlTrackSpec {
  id: string;
  title: string;
  topic: string;
  subtopic: string;
  difficulty: Difficulty;
  experienceLevel: ExperienceTier;
  companies: string[];
  problemStatement: string;
  setupSql: string;
  solutionSql: string;
  explanation: string;
  practicalRelevance: string;
  executionPlanNotes: string;
}

const EXPANDED_SQL_SPECS: SqlTrackSpec[] = [
  {
    id: 'sql_13_first_last_value_frame',
    title: 'First & Last Touch Attribution Per User Session',
    topic: 'Window Functions',
    subtopic: 'FIRST_VALUE & Frame Clauses',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Adobe', 'Meta', 'Salesforce'],
    problemStatement: 'Given `touchpoints(user_id, touch_ts, channel)`, return one row per `user_id` with `first_channel` and `last_channel` ordered by `user_id`.',
    setupSql: `CREATE TABLE touchpoints (id INTEGER PRIMARY KEY, user_id TEXT, touch_ts TEXT, channel TEXT);
INSERT INTO touchpoints VALUES (1,'u1','2026-01-01 09:00','organic'),(2,'u1','2026-01-01 12:00','paid_search'),(3,'u1','2026-01-02 10:00','email'),(4,'u2','2026-01-03 08:00','direct');`,
    solutionSql: `SELECT DISTINCT
  user_id,
  FIRST_VALUE(channel) OVER (PARTITION BY user_id ORDER BY touch_ts ASC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS first_channel,
  LAST_VALUE(channel) OVER (PARTITION BY user_id ORDER BY touch_ts ASC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_channel
FROM touchpoints
ORDER BY user_id;`,
    explanation: 'Default window framing ends at `CURRENT ROW`, which breaks `LAST_VALUE` unless `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` is explicitly specified.',
    practicalRelevance: 'Marketing multi-touch attribution models.',
    executionPlanNotes: 'Single partition sort on `(user_id, touch_ts)`.',
  },
  {
    id: 'sql_14_second_highest_without_limit',
    title: 'Nth Highest Metric Per Region Without LIMIT',
    topic: 'Window Functions',
    subtopic: 'DENSE_RANK Filtering',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['Amazon', 'Walmart Global Tech', 'Microsoft'],
    problemStatement: 'Given `store_sales(region, store_id, revenue)`, find the 2nd highest unique revenue per `region`. Return `region`, `second_highest_revenue` (exclude regions with <2 distinct revenues).',
    setupSql: `CREATE TABLE store_sales (region TEXT, store_id TEXT, revenue INTEGER);
INSERT INTO store_sales VALUES ('North','s1',900),('North','s2',900),('North','s3',750),('South','s4',600),('West','s5',1200),('West','s6',1100),('West','s7',950);`,
    solutionSql: `WITH r AS (
  SELECT region, revenue, DENSE_RANK() OVER (PARTITION BY region ORDER BY revenue DESC) AS dr
  FROM store_sales
)
SELECT DISTINCT region, revenue AS second_highest_revenue
FROM r WHERE dr = 2 ORDER BY region;`,
    explanation: '`DENSE_RANK()` ensures ties at rank 1 do not mask the second highest distinct value.',
    practicalRelevance: 'Regional performance benchmarking.',
    executionPlanNotes: 'Window sort on `(region, revenue DESC)` followed by hash distinct.',
  },
  {
    id: 'sql_15_cumulative_budget_cap',
    title: 'Greedy Batch Packing Under Compute Credit Cap',
    topic: 'Rolling Aggregations',
    subtopic: 'Cumulative Sum Boundary',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Snowflake', 'Databricks', 'Google'],
    problemStatement: 'Jobs in `job_queue(job_id, priority, credits)` execute in ascending `priority` order until adding the next job would exceed 100 credits. Return `job_id`, `priority`, `credits`, `running_credits` for selected jobs.',
    setupSql: `CREATE TABLE job_queue (job_id TEXT, priority INTEGER, credits INTEGER);
INSERT INTO job_queue VALUES ('j1',1,35),('j2',2,40),('j3',3,25),('j4',4,15);`,
    solutionSql: `WITH cum AS (
  SELECT job_id, priority, credits,
    SUM(credits) OVER (ORDER BY priority ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_credits
  FROM job_queue
)
SELECT job_id, priority, credits, running_credits
FROM cum WHERE running_credits <= 100 ORDER BY priority;`,
    explanation: 'Running cumulative sum with `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` prevents duplicate priority tie leakage.',
    practicalRelevance: 'FinOps warehouse credit quota enforcement.',
    executionPlanNotes: 'Single ordered scan on `priority`.',
  },
  {
    id: 'sql_16_user_retention_d1_d7',
    title: 'Day-1 & Day-7 Signup Retention Rate',
    topic: 'Retention & Cohorts',
    subtopic: 'Cohort Join Windows',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Swiggy', 'Zomato', 'PhonePe'],
    problemStatement: 'Given `signups(user_id, signup_date)` and `logins(user_id, login_date)`, compute `signup_date`, `cohort_size`, `d1_retained`, `d7_retained` ordered by `signup_date`.',
    setupSql: `CREATE TABLE signups (user_id TEXT, signup_date TEXT);
CREATE TABLE logins (user_id TEXT, login_date TEXT);
INSERT INTO signups VALUES ('u1','2026-01-01'),('u2','2026-01-01'),('u3','2026-01-02');
INSERT INTO logins VALUES ('u1','2026-01-02'),('u1','2026-01-08'),('u2','2026-01-02'),('u3','2026-01-09');`,
    solutionSql: `SELECT
  s.signup_date,
  COUNT(DISTINCT s.user_id) AS cohort_size,
  COUNT(DISTINCT CASE WHEN l.login_date = date(s.signup_date, '+1 day') THEN s.user_id END) AS d1_retained,
  COUNT(DISTINCT CASE WHEN l.login_date = date(s.signup_date, '+7 day') THEN s.user_id END) AS d7_retained
FROM signups s
LEFT JOIN logins l ON s.user_id = l.user_id AND l.login_date IN (date(s.signup_date, '+1 day'), date(s.signup_date, '+7 day'))
GROUP BY s.signup_date ORDER BY s.signup_date;`,
    explanation: 'Pushing the `+1 day` and `+7 day` predicate into the `LEFT JOIN ON` clause prunes irrelevant login history early.',
    practicalRelevance: 'Daily active retention metric definitions.',
    executionPlanNotes: 'Index on `logins(user_id, login_date)` enables fast nested index lookup.',
  },
  {
    id: 'sql_17_market_basket_cooccurrence',
    title: 'Top Co-Purchased Product Pairs (Market Basket)',
    topic: 'Query Optimization',
    subtopic: 'Non-Equi Self-Join',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Amazon', 'Flipkart', 'Myntra'],
    problemStatement: 'Given `order_items(order_id, product_id)`, find distinct product pairs `(p1 < p2)` bought together in the same order, returning `p1`, `p2`, `pair_count` ordered by `pair_count DESC, p1 ASC, p2 ASC`.',
    setupSql: `CREATE TABLE order_items (order_id INTEGER, product_id TEXT);
INSERT INTO order_items VALUES (1,'A'),(1,'B'),(1,'C'),(2,'A'),(2,'B'),(3,'B'),(3,'C'),(4,'A'),(4,'B');`,
    solutionSql: `WITH dedup AS (SELECT DISTINCT order_id, product_id FROM order_items)
SELECT a.product_id AS p1, b.product_id AS p2, COUNT(*) AS pair_count
FROM dedup a
JOIN dedup b ON a.order_id = b.order_id AND a.product_id < b.product_id
GROUP BY a.product_id, b.product_id
ORDER BY pair_count DESC, p1 ASC, p2 ASC;`,
    explanation: 'Strict inequality `a.product_id < b.product_id` eliminates mirror duplicates (`B,A`) and self-pairs (`A,A`).',
    practicalRelevance: 'Recommendation candidate generation.',
    executionPlanNotes: 'Deduplicate `(order_id, product_id)` first to avoid quadratic blowup on quantity rows.',
  },
  {
    id: 'sql_18_outlier_zscore_detection',
    title: 'Pipeline Duration Anomaly Detection (Z-Score > 2)',
    topic: 'Window Functions',
    subtopic: 'Statistical Deviation',
    difficulty: 'Hard',
    experienceLevel: '4-6 yrs',
    companies: ['Databricks', 'Google', 'Uber'],
    problemStatement: 'Given `job_metrics(job_name, run_id, duration_sec)`, flag runs where `duration_sec` exceeds the job\'s mean by more than 1.5 standard deviations (population stddev). Return `job_name`, `run_id`, `duration_sec`, `mean_sec`.',
    setupSql: `CREATE TABLE job_metrics (job_name TEXT, run_id INTEGER, duration_sec REAL);
INSERT INTO job_metrics VALUES ('dag_a',1,100),('dag_a',2,102),('dag_a',3,98),('dag_a',4,100),('dag_a',5,260),('dag_b',1,50),('dag_b',2,52),('dag_b',3,48);`,
    solutionSql: `WITH stats AS (
  SELECT job_name, run_id, duration_sec,
    AVG(duration_sec) OVER (PARTITION BY job_name) AS mean_sec,
    AVG(duration_sec * duration_sec) OVER (PARTITION BY job_name) AS mean_sq
  FROM job_metrics
)
SELECT job_name, run_id, duration_sec, ROUND(mean_sec, 2) AS mean_sec
FROM stats
WHERE duration_sec > mean_sec + 1.5 * SQRT(MAX(0.0, mean_sq - mean_sec * mean_sec))
ORDER BY job_name, run_id;`,
    explanation: 'Computes variance algebraically via `E[X^2] - (E[X])^2` in a single window pass, portable even in SQLite without `STDDEV_POP`.',
    practicalRelevance: 'Automated observability alerting on SLA drift.',
    executionPlanNotes: 'Single partition pass over `job_name`.',
  },
  {
    id: 'sql_19_scd2_gap_validation',
    title: 'Data Quality: Detect Overlapping or Gapped SCD-2 Ranges',
    topic: 'Gaps & Islands',
    subtopic: 'SCD Type 2 Integrity Audit',
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companies: ['Snowflake', 'Intuit', 'Razorpay'],
    problemStatement: 'Given `dim_customer_scd2(cust_id, valid_from, valid_to)`, return any `cust_id` and `valid_from` where the row overlaps or leaves a gap with the preceding row (`valid_from != prev_valid_to`).',
    setupSql: `CREATE TABLE dim_customer_scd2 (cust_id TEXT, valid_from TEXT, valid_to TEXT);
INSERT INTO dim_customer_scd2 VALUES
  ('c1','2026-01-01','2026-02-01'),('c1','2026-02-01','9999-12-31'),
  ('c2','2026-01-01','2026-01-15'),('c2','2026-01-20','9999-12-31'),
  ('c3','2026-01-01','2026-03-01'),('c3','2026-02-15','9999-12-31');`,
    solutionSql: `WITH ordered AS (
  SELECT cust_id, valid_from, valid_to,
    LAG(valid_to) OVER (PARTITION BY cust_id ORDER BY valid_from) AS prev_valid_to
  FROM dim_customer_scd2
)
SELECT cust_id, valid_from, prev_valid_to
FROM ordered
WHERE prev_valid_to IS NOT NULL AND valid_from != prev_valid_to
ORDER BY cust_id, valid_from;`,
    explanation: 'Adjacent SCD-2 half-open intervals `[valid_from, valid_to)` must satisfy `curr.valid_from == prev.valid_to`. Any mismatch flags a gap or overlap.',
    practicalRelevance: 'Automated dbt data tests on Type-2 dimension tables.',
    executionPlanNotes: 'Single sort per `cust_id` on `valid_from`.',
  },
  {
    id: 'sql_20_recursive_series_hierarchy_cost',
    title: 'Recursive Dependency Rollup: DAG Downstream Impact Count',
    topic: 'Recursive CTEs',
    subtopic: 'Transitive Closure',
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companies: ['Databricks', 'Airbnb', 'Netflix'],
    problemStatement: 'Given `dag_edges(parent_model, child_model)`, find all distinct transitive downstream models impacted if `stg_orders` breaks. Return `downstream_model`, `min_hops`, ordered by `min_hops, downstream_model`.',
    setupSql: `CREATE TABLE dag_edges (parent_model TEXT, child_model TEXT);
INSERT INTO dag_edges VALUES ('stg_orders','int_order_items'),('int_order_items','fct_revenue'),('stg_orders','fct_daily_kpis'),('fct_revenue','exec_dashboard');`,
    solutionSql: `WITH RECURSIVE impact AS (
  SELECT child_model AS downstream_model, 1 AS hops
  FROM dag_edges WHERE parent_model = 'stg_orders'
  UNION ALL
  SELECT e.child_model, i.hops + 1
  FROM dag_edges e JOIN impact i ON e.parent_model = i.downstream_model
  WHERE i.hops < 20
)
SELECT downstream_model, MIN(hops) AS min_hops
FROM impact
GROUP BY downstream_model
ORDER BY min_hops, downstream_model;`,
    explanation: 'Recursively expands lineage edges with a hop-limit safeguard and collapses diamond paths via `MIN(hops)`.',
    practicalRelevance: 'Data catalog lineage impact analysis (DataHub / OpenMetadata).',
    executionPlanNotes: 'Index on `dag_edges(parent_model)` prevents full scans per recursion level.',
  },
  {
    id: 'sql_21_anti_join_missing_partitions',
    title: 'Find Missing Hourly Partitions in Data Lake Audit',
    topic: 'Date Spines',
    subtopic: 'Left Anti-Join Pattern',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['Uber', 'LinkedIn', 'PhonePe'],
    problemStatement: 'Given `partition_log(hr)` for `2026-06-01` hours `00` to `05`, identify which hours are missing from the expected 6-hour spine (`00`..`05`). Return `missing_hr`.',
    setupSql: `CREATE TABLE partition_log (hr INTEGER);
INSERT INTO partition_log VALUES (0),(1),(3),(5);`,
    solutionSql: `WITH RECURSIVE hrs(hr) AS (
  SELECT 0 UNION ALL SELECT hr + 1 FROM hrs WHERE hr < 5
)
SELECT h.hr AS missing_hr
FROM hrs h
LEFT JOIN partition_log p ON h.hr = p.hr
WHERE p.hr IS NULL
ORDER BY missing_hr;`,
    explanation: '`LEFT JOIN ... WHERE right_key IS NULL` is safer than `NOT IN (...)` because `NOT IN` silently returns 0 rows if any NULL exists.',
    practicalRelevance: 'Partition completeness sensors in Airflow/Dagster.',
    executionPlanNotes: 'Hash/merge anti-join with zero NULL pitfalls.',
  },
  {
    id: 'sql_22_percentile_bucketing_ntile',
    title: 'Segment Customers Into Revenue Quartiles (NTILE)',
    topic: 'Window Functions',
    subtopic: 'NTILE(4) Tiering',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['Salesforce', 'Shopify', 'Razorpay'],
    problemStatement: 'Given `cust_spend(cust_id, total_spend)`, assign each customer to quartile `1` (highest spend) through `4` using `NTILE(4)` and return `quartile`, `cust_count`, `min_spend`, `max_spend` ordered by `quartile`.',
    setupSql: `CREATE TABLE cust_spend (cust_id TEXT, total_spend REAL);
INSERT INTO cust_spend VALUES ('c1',500),('c2',420),('c3',310),('c4',290),('c5',210),('c6',180),('c7',90),('c8',40);`,
    solutionSql: `WITH q AS (
  SELECT cust_id, total_spend, NTILE(4) OVER (ORDER BY total_spend DESC) AS quartile
  FROM cust_spend
)
SELECT quartile, COUNT(*) AS cust_count, MIN(total_spend) AS min_spend, MAX(total_spend) AS max_spend
FROM q GROUP BY quartile ORDER BY quartile;`,
    explanation: '`NTILE(4)` distributes rows evenly across 4 ranked buckets.',
    practicalRelevance: 'RFM segmentation and VIP tiering.',
    executionPlanNotes: 'Single global sort on `total_spend DESC`.',
  },
  {
    id: 'sql_23_reconciliation_hash_diff',
    title: 'Cross-System Table Reconciliation (Source vs Target Diff)',
    topic: 'Deduplication',
    subtopic: 'Full Outer Reconciliation Emulation',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['PhonePe', 'Razorpay', 'Intuit'],
    problemStatement: 'Given `src_ledger(tx_id, amount)` and `tgt_ledger(tx_id, amount)`, output mismatched rows with `tx_id` and `discrepancy_type` (`MISSING_IN_TARGET`, `EXTRA_IN_TARGET`, `AMOUNT_MISMATCH`), ordered by `tx_id`.',
    setupSql: `CREATE TABLE src_ledger (tx_id INTEGER PRIMARY KEY, amount REAL);
CREATE TABLE tgt_ledger (tx_id INTEGER PRIMARY KEY, amount REAL);
INSERT INTO src_ledger VALUES (1,100),(2,200),(3,300);
INSERT INTO tgt_ledger VALUES (1,100),(2,250),(4,400);`,
    solutionSql: `SELECT s.tx_id AS tx_id,
  CASE WHEN t.tx_id IS NULL THEN 'MISSING_IN_TARGET' WHEN s.amount != t.amount THEN 'AMOUNT_MISMATCH' END AS discrepancy_type
FROM src_ledger s LEFT JOIN tgt_ledger t ON s.tx_id = t.tx_id
WHERE t.tx_id IS NULL OR s.amount != t.amount
UNION ALL
SELECT t.tx_id AS tx_id, 'EXTRA_IN_TARGET' AS discrepancy_type
FROM tgt_ledger t LEFT JOIN src_ledger s ON t.tx_id = s.tx_id
WHERE s.tx_id IS NULL
ORDER BY 1;`,
    explanation: 'Emulates `FULL OUTER JOIN` cleanly across engines like MySQL/SQLite using two disjoint `LEFT JOIN` anti/mismatch branches + `UNION ALL`.',
    practicalRelevance: 'Daily financial ledger & warehouse migration verification.',
    executionPlanNotes: 'Primary key lookups on both sides.',
  },
  {
    id: 'sql_24_running_balance_overdraft',
    title: 'Flag First Account Overdraft Timestamp',
    topic: 'Rolling Aggregations',
    subtopic: 'Running Balance + QUALIFY',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Stripe', 'Razorpay', 'PhonePe'],
    problemStatement: 'Given `wallet_tx(account_id, tx_ts, delta_amount)` (assume initial balance 0), find the earliest `tx_ts` per `account_id` where the running balance drops strictly below 0. Order by `account_id`.',
    setupSql: `CREATE TABLE wallet_tx (id INTEGER PRIMARY KEY, account_id TEXT, tx_ts TEXT, delta_amount REAL);
INSERT INTO wallet_tx VALUES (1,'a1','2026-01-01 10:00',100),(2,'a1','2026-01-01 11:00',-120),(3,'a1','2026-01-01 12:00',-30),(4,'a2','2026-01-01 09:00',50),(5,'a2','2026-01-01 10:00',-50);`,
    solutionSql: `WITH bal AS (
  SELECT account_id, tx_ts,
    SUM(delta_amount) OVER (PARTITION BY account_id ORDER BY tx_ts, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_bal
  FROM wallet_tx
)
SELECT account_id, MIN(tx_ts) AS first_overdraft_ts
FROM bal WHERE running_bal < 0
GROUP BY account_id ORDER BY account_id;`,
    explanation: 'Tie-breaking `ORDER BY tx_ts, id` guarantees deterministic running sum ordering when timestamps collide.',
    practicalRelevance: 'Fintech ledger audit and credit risk triggers.',
    executionPlanNotes: 'Single partition sort + running aggregate.',
  },
  {
    id: 'sql_25_active_concurrent_sessions',
    title: 'Peak Concurrent Warehouse Queries (Sweep-Line SQL)',
    topic: 'Gaps & Islands',
    subtopic: 'Event Sweep-Line Aggregation',
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companies: ['Snowflake', 'Databricks', 'Google'],
    problemStatement: 'Given `query_runs(qid, start_sec, end_sec)` (half-open `[start_sec, end_sec)`), compute the maximum number of concurrently executing queries at any instant.',
    setupSql: `CREATE TABLE query_runs (qid INTEGER, start_sec INTEGER, end_sec INTEGER);
INSERT INTO query_runs VALUES (1,0,10),(2,3,8),(3,5,12),(4,10,15);`,
    solutionSql: `WITH events AS (
  SELECT start_sec AS ts, 1 AS delta FROM query_runs
  UNION ALL
  SELECT end_sec AS ts, -1 AS delta FROM query_runs
),
agg AS (
  SELECT ts, SUM(delta) AS net_delta FROM events GROUP BY ts
),
running AS (
  SELECT ts, SUM(net_delta) OVER (ORDER BY ts) AS concurrent FROM agg
)
SELECT MAX(concurrent) AS peak_concurrency FROM running;`,
    explanation: 'Aggregating `+1` starts and `-1` ends at identical timestamps (`GROUP BY ts`) handles instant handoffs `[0,10)` + `[10,15)` accurately.',
    practicalRelevance: 'Compute warehouse autoscaling and concurrency queue sizing.',
    executionPlanNotes: 'O(N log N) sweep-line avoids quadratic self-join interval comparisons.',
  },
];

const EXTRA_SQL_PATTERNS: Array<{
  id: string;
  title: string;
  topic: string;
  subtopic: string;
  difficulty: Difficulty;
  experienceLevel: ExperienceTier;
  companies: string[];
  tableDdl: string;
  problem: string;
  query: string;
  notes: string;
}> = [
  {
    id: 'sql_26_dedup_keep_latest_email',
    title: 'Latest Verified Contact Per Account',
    topic: 'Deduplication',
    subtopic: 'ROW_NUMBER Tie-Breaking',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['Salesforce', 'Intuit'],
    tableDdl: `CREATE TABLE contacts (id INTEGER, acct_id TEXT, email TEXT, verified INTEGER, updated_at TEXT);
INSERT INTO contacts VALUES (1,'a1','old@x.io',1,'2026-01-01'),(2,'a1','new@x.io',0,'2026-02-01'),(3,'a2','ok@y.io',1,'2026-01-15');`,
    problem: 'Return the single best contact per `acct_id`, prioritizing `verified = 1` first, then latest `updated_at`.',
    query: `WITH r AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY acct_id ORDER BY verified DESC, updated_at DESC) AS rn FROM contacts) SELECT acct_id, email, verified FROM r WHERE rn = 1 ORDER BY acct_id;`,
    notes: 'Multi-key window ordering cleanly expresses business priority rules.',
  },
  {
    id: 'sql_27_moving_avg_3_orders',
    title: '3-Order Moving Average Per Merchant',
    topic: 'Rolling Aggregations',
    subtopic: 'ROWS Frame',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['Swiggy', 'Zomato'],
    tableDdl: `CREATE TABLE merchant_orders (merchant TEXT, seq INTEGER, amount REAL);
INSERT INTO merchant_orders VALUES ('m1',1,100),('m1',2,200),('m1',3,300),('m1',4,400);`,
    problem: 'Compute the 3-order trailing moving average (`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`) per merchant.',
    query: `SELECT merchant, seq, amount, ROUND(AVG(amount) OVER (PARTITION BY merchant ORDER BY seq ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS ma_3 FROM merchant_orders ORDER BY merchant, seq;`,
    notes: 'Window `ROWS` frame computes exact item count averages regardless of value ties.',
  },
  {
    id: 'sql_28_top_spender_per_month',
    title: 'Monthly Highest Spending Customer',
    topic: 'Window Functions',
    subtopic: 'Monthly Aggregation + Rank',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Amazon', 'Flipkart'],
    tableDdl: `CREATE TABLE tx (cust TEXT, dt TEXT, amt REAL);
INSERT INTO tx VALUES ('c1','2026-01-02',50),('c1','2026-01-10',80),('c2','2026-01-05',120),('c2','2026-02-01',200);`,
    problem: 'Aggregate spend by `(month, cust)` and return top spender(s) per month.',
    query: `WITH m AS (SELECT strftime('%Y-%m', dt) AS mo, cust, SUM(amt) AS tot FROM tx GROUP BY 1,2), r AS (SELECT *, RANK() OVER (PARTITION BY mo ORDER BY tot DESC) AS rk FROM m) SELECT mo, cust, tot FROM r WHERE rk = 1 ORDER BY mo;`,
    notes: 'Aggregating before windowing reduces window input cardinality dramatically.',
  },
  {
    id: 'sql_29_consecutive_login_3_days',
    title: 'Users Active 3+ Consecutive Days',
    topic: 'Gaps & Islands',
    subtopic: 'Consecutive Activity',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Meta', 'Netflix'],
    tableDdl: `CREATE TABLE logins_d (uid TEXT, dt TEXT);
INSERT INTO logins_d VALUES ('u1','2026-01-01'),('u1','2026-01-02'),('u1','2026-01-03'),('u2','2026-01-01'),('u2','2026-01-03');`,
    problem: 'Return distinct `uid` values with at least 3 consecutive calendar days of logins.',
    query: `WITH d AS (SELECT DISTINCT uid, dt FROM logins_d), g AS (SELECT uid, date(dt, '-' || ROW_NUMBER() OVER (PARTITION BY uid ORDER BY dt) || ' days') AS k FROM d) SELECT DISTINCT uid FROM g GROUP BY uid, k HAVING COUNT(*) >= 3 ORDER BY uid;`,
    notes: 'Classic date-minus-row-number island key.',
  },
  {
    id: 'sql_30_funnel_drop_off_pct',
    title: 'Stage-to-Stage Drop-Off Percentage',
    topic: 'Funnel Conversion',
    subtopic: 'LAG Conversion Ratio',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Uber', 'Airbnb'],
    tableDdl: `CREATE TABLE step_counts (step_num INTEGER, step_name TEXT, users INTEGER);
INSERT INTO step_counts VALUES (1,'visit',1000),(2,'signup',450),(3,'activate',270);`,
    problem: 'Compute `step_name`, `users`, and `step_conversion_pct` from the immediately preceding stage.',
    query: `SELECT step_name, users, ROUND(users * 100.0 / LAG(users) OVER (ORDER BY step_num), 1) AS step_conversion_pct FROM step_counts ORDER BY step_num;`,
    notes: 'Uses `LAG(users)` over step sequence.',
  },
  {
    id: 'sql_31_skewed_key_audit',
    title: 'Detect Heavy-Hitter Skew Keys (>20% Traffic)',
    topic: 'Query Optimization',
    subtopic: 'Skew Profiling',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Databricks', 'Uber', 'LinkedIn'],
    tableDdl: `CREATE TABLE events_log (partition_key TEXT, bytes INTEGER);
INSERT INTO events_log VALUES ('null_k',500),('null_k',400),('k1',50),('k2',50),('k3',50);`,
    problem: 'Find `partition_key` values accounting for >20% of total event rows to diagnose Spark join skew.',
    query: `WITH c AS (SELECT partition_key, COUNT(*) AS cnt FROM events_log GROUP BY partition_key), t AS (SELECT partition_key, cnt, SUM(cnt) OVER () AS tot FROM c) SELECT partition_key, cnt, ROUND(cnt * 100.0 / tot, 1) AS pct FROM t WHERE cnt * 1.0 / tot > 0.2 ORDER BY cnt DESC;`,
    notes: 'Pre-flight skew detection informs Spark salting keys.',
  },
  {
    id: 'sql_32_pivot_channel_metrics',
    title: 'Conditional Aggregation Pivot: Daily Revenue by Channel',
    topic: 'Window Functions',
    subtopic: 'Pivot Matrix',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['Google', 'Adobe'],
    tableDdl: `CREATE TABLE rev_ch (dt TEXT, channel TEXT, amt REAL);
INSERT INTO rev_ch VALUES ('2026-01-01','web',100),('2026-01-01','ios',150),('2026-01-02','ios',200);`,
    problem: 'Pivot `rev_ch` to show `dt`, `web_rev`, `ios_rev`, `total_rev` ordered by `dt`.',
    query: `SELECT dt, SUM(CASE WHEN channel='web' THEN amt ELSE 0 END) AS web_rev, SUM(CASE WHEN channel='ios' THEN amt ELSE 0 END) AS ios_rev, SUM(amt) AS total_rev FROM rev_ch GROUP BY dt ORDER BY dt;`,
    notes: 'Portable `SUM(CASE WHEN ...)` works across every SQL warehouse.',
  },
  {
    id: 'sql_33_year_to_date_sum',
    title: 'Year-to-Date Cumulative Revenue by Region',
    topic: 'Rolling Aggregations',
    subtopic: 'Partitioned YTD',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['Microsoft', 'Oracle'],
    tableDdl: `CREATE TABLE rev_mo (region TEXT, yr INTEGER, mo INTEGER, rev REAL);
INSERT INTO rev_mo VALUES ('EMEA',2026,1,100),('EMEA',2026,2,150),('EMEA',2026,3,120);`,
    problem: 'Compute `ytd_rev` partitioned by `(region, yr)` ordered by `mo`.',
    query: `SELECT region, yr, mo, rev, SUM(rev) OVER (PARTITION BY region, yr ORDER BY mo ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS ytd_rev FROM rev_mo ORDER BY region, yr, mo;`,
    notes: 'Partitioning by `(region, yr)` resets cumulative totals automatically each fiscal year.',
  },
  {
    id: 'sql_34_session_bounce_rate',
    title: 'Compute Single-Event Bounce Rate Per Landing Page',
    topic: 'Sessionization',
    subtopic: 'Session Depth Metrics',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Google', 'Airbnb'],
    tableDdl: `CREATE TABLE sess_hits (session_id TEXT, hit_seq INTEGER, page TEXT);
INSERT INTO sess_hits VALUES ('s1',1,'/home'),('s2',1,'/home'),('s2',2,'/pricing'),('s3',1,'/blog');`,
    problem: 'A bounced session has only 1 hit. Return `landing_page`, `sessions`, `bounce_pct`.',
    query: `WITH s AS (SELECT session_id, MIN(CASE WHEN hit_seq=1 THEN page END) AS landing_page, COUNT(*) AS hits FROM sess_hits GROUP BY session_id) SELECT landing_page, COUNT(*) AS sessions, ROUND(SUM(CASE WHEN hits=1 THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) AS bounce_pct FROM s GROUP BY landing_page ORDER BY landing_page;`,
    notes: 'Two-level aggregation avoids correlating session counts back to hit rows.',
  },
  {
    id: 'sql_35_null_safe_coalesce_chain',
    title: 'Schema Evolution Backfill with Multi-Column Coalesce',
    topic: 'Deduplication',
    subtopic: 'Backwards-Compatible Reads',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['LinkedIn', 'Atlassian'],
    tableDdl: `CREATE TABLE raw_events (id INTEGER, user_uuid TEXT, legacy_uid TEXT, anon_id TEXT);
INSERT INTO raw_events VALUES (1,'u-1',NULL,'a-1'),(2,NULL,'leg-2','a-2'),(3,NULL,NULL,'a-3');`,
    problem: 'Resolve canonical `actor_id` using priority `user_uuid -> legacy_uid -> anon_id` and count events per `actor_id`.',
    query: `SELECT COALESCE(user_uuid, legacy_uid, anon_id) AS actor_id, COUNT(*) AS event_cnt FROM raw_events GROUP BY 1 ORDER BY actor_id;`,
    notes: 'Handles phased mobile SDK identifier migrations cleanly.',
  },
  {
    id: 'sql_36_recursive_number_padding',
    title: 'Generate Hourly Spine & Fill Forward Last Known Sensor Reading',
    topic: 'Date Spines',
    subtopic: 'LOCF Forward Fill',
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companies: ['Apple', 'Databricks'],
    tableDdl: `CREATE TABLE readings (hr INTEGER, temp REAL);
INSERT INTO readings VALUES (0, 21.5), (2, 23.0), (4, 22.0);`,
    problem: 'Generate hours `0..4` and carry forward the last known `temp` (LOCF) for missing hours.',
    query: `WITH RECURSIVE hrs(hr) AS (SELECT 0 UNION ALL SELECT hr+1 FROM hrs WHERE hr<4), j AS (SELECT h.hr, r.temp, MAX(CASE WHEN r.temp IS NOT NULL THEN h.hr END) OVER (ORDER BY h.hr) AS grp_hr FROM hrs h LEFT JOIN readings r ON h.hr=r.hr) SELECT hr, MAX(temp) OVER (PARTITION BY grp_hr) AS filled_temp FROM j ORDER BY hr;`,
    notes: 'LOCF in ANSI SQL uses a running `MAX(non_null_ts)` group key followed by a partitioned `MAX()`.',
  },
  {
    id: 'sql_37_churned_reactivated_users',
    title: 'Classify Users: New, Retained, Churned, Reactivated',
    topic: 'Retention & Cohorts',
    subtopic: 'State Machine Classification',
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companies: ['Netflix', 'Meta', 'Uber'],
    tableDdl: `CREATE TABLE m_active (uid TEXT, m INTEGER);
INSERT INTO m_active VALUES ('u1',1),('u1',2),('u2',1),('u2',3),('u3',2);`,
    problem: 'For each row in `m_active`, label `status`: `NEW` (no prior month), `RETAINED` (`prev_m = m - 1`), or `REACTIVATED` (`prev_m < m - 1`).',
    query: `WITH l AS (SELECT uid, m, LAG(m) OVER (PARTITION BY uid ORDER BY m) AS pm FROM m_active) SELECT uid, m, CASE WHEN pm IS NULL THEN 'NEW' WHEN pm = m - 1 THEN 'RETAINED' ELSE 'REACTIVATED' END AS status FROM l ORDER BY uid, m;`,
    notes: 'Drives growth accounting waterfalls (`New + Retained + Reactivated - Churned`).',
  },
  {
    id: 'sql_38_point_in_time_fx_conversion',
    title: 'Point-in-Time FX Rate Currency Normalization',
    topic: 'Point-in-Time Joins',
    subtopic: 'Temporal Rate Lookup',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Stripe', 'Razorpay', 'Airbnb'],
    tableDdl: `CREATE TABLE payments (pid INTEGER, ccy TEXT, pay_ts TEXT, amt REAL);
CREATE TABLE fx_rates (ccy TEXT, eff_ts TEXT, usd_rate REAL);
INSERT INTO payments VALUES (1,'EUR','2026-01-01 10:00',100),(2,'EUR','2026-01-02 10:00',100);
INSERT INTO fx_rates VALUES ('EUR','2026-01-01 00:00',1.10),('EUR','2026-01-02 08:00',1.12);`,
    problem: 'Convert each payment to `usd_amt` using the latest `usd_rate` effective at or before `pay_ts`.',
    query: `WITH j AS (SELECT p.pid, p.amt, f.usd_rate, ROW_NUMBER() OVER (PARTITION BY p.pid ORDER BY f.eff_ts DESC) AS rn FROM payments p JOIN fx_rates f ON p.ccy=f.ccy AND f.eff_ts<=p.pay_ts) SELECT pid, ROUND(amt*usd_rate, 2) AS usd_amt FROM j WHERE rn=1 ORDER BY pid;`,
    notes: 'Prevents future rate look-ahead in financial reporting.',
  },
  {
    id: 'sql_39_top_2_products_per_category_ties',
    title: 'Top 2 Products Per Category With Revenue Share',
    topic: 'Window Functions',
    subtopic: 'Multi-Window Composition',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Flipkart', 'Meesho'],
    tableDdl: `CREATE TABLE prod_rev (cat TEXT, prod TEXT, rev REAL);
INSERT INTO prod_rev VALUES ('Electronics','Phone',500),('Electronics','Laptop',400),('Electronics','Cable',100),('Books','SQL',150),('Books','Spark',50);`,
    problem: 'Return top 2 products per category by `rev` along with their percentage share of category total.',
    query: `WITH w AS (SELECT cat, prod, rev, ROW_NUMBER() OVER (PARTITION BY cat ORDER BY rev DESC) AS rn, SUM(rev) OVER (PARTITION BY cat) AS cat_tot FROM prod_rev) SELECT cat, prod, rev, ROUND(rev*100.0/cat_tot, 1) AS cat_share_pct FROM w WHERE rn <= 2 ORDER BY cat, rev DESC;`,
    notes: 'Computes `SUM() OVER` prior to filtering `rn <= 2` so category denominator remains accurate.',
  },
  {
    id: 'sql_40_index_covering_sargable',
    title: 'SARGable Date Range Filtering vs Function Wrapping',
    topic: 'Query Optimization',
    subtopic: 'SARGability & Index Usage',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Google', 'Microsoft', 'Snowflake'],
    tableDdl: `CREATE TABLE audit_logs (id INTEGER PRIMARY KEY, created_at TEXT, action TEXT);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
INSERT INTO audit_logs VALUES (1,'2026-05-01 09:00:00','LOGIN'),(2,'2026-05-02 10:00:00','EXPORT'),(3,'2026-05-02 23:59:59','DELETE');`,
    problem: 'Write a SARGable query using `idx_audit_created` to count actions on `2026-05-02` without wrapping `created_at` in `DATE()`. Check the Explain Plan!',
    query: `SELECT action, COUNT(*) AS cnt FROM audit_logs WHERE created_at >= '2026-05-02 00:00:00' AND created_at < '2026-05-03 00:00:00' GROUP BY action ORDER BY action;`,
    notes: 'Notice in Explain Plan: `SEARCH audit_logs USING INDEX idx_audit_created` instead of `SCAN audit_logs`!',
  },
  {
    id: 'sql_41_recursive_calendar_fill_gaps',
    title: 'Monthly Active Recurring Revenue Expansion',
    topic: 'Date Spines',
    subtopic: 'Subscription Expansion',
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companies: ['Atlassian', 'Salesforce', 'Snowflake'],
    tableDdl: `CREATE TABLE subs (cust TEXT, start_mo INTEGER, end_mo INTEGER, mrr REAL);
INSERT INTO subs VALUES ('c1',1,3,100),('c2',2,4,200);`,
    problem: 'Expand active subscriptions across months `1..4` and return `mo`, `total_mrr`.',
    query: `WITH RECURSIVE mos(mo) AS (SELECT 1 UNION ALL SELECT mo+1 FROM mos WHERE mo<4) SELECT m.mo, COALESCE(SUM(s.mrr), 0) AS total_mrr FROM mos m LEFT JOIN subs s ON m.mo BETWEEN s.start_mo AND s.end_mo GROUP BY m.mo ORDER BY m.mo;`,
    notes: 'Exploding contract intervals onto a spine unlocks accurate MRR recognition.',
  },
  {
    id: 'sql_42_duplicate_pair_cleanup',
    title: 'Detect Symmetric Graph Edges Without Self-Loops',
    topic: 'Query Optimization',
    subtopic: 'Canonical Graph Edges',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['LinkedIn', 'Meta'],
    tableDdl: `CREATE TABLE connections (u1 TEXT, u2 TEXT);
INSERT INTO connections VALUES ('A','B'),('B','A'),('B','C'),('A','A');`,
    problem: 'Normalize undirected friendships into canonical pairs (`u_low < u_high`) with duplicates and self-loops removed.',
    query: `SELECT DISTINCT CASE WHEN u1 < u2 THEN u1 ELSE u2 END AS u_low, CASE WHEN u1 < u2 THEN u2 ELSE u1 END AS u_high FROM connections WHERE u1 != u2 ORDER BY u_low, u_high;`,
    notes: 'Canonical ordering prevents undirected edges from double-counting degrees.',
  },
];

export const SEED_SQL_QUESTIONS: Question[] = [
  ...CORE_SQL_BLUEPRINTS.map((b): Question => ({
    uniqueId: b.id,
    title: b.title,
    problemStatement: b.problemStatement,
    domain: 'Analytical SQL',
    topic: b.topic,
    subtopic: b.subtopic,
    roadmapTracks: ['Analytical SQL Mastery'],
    difficulty: b.difficulty,
    experienceLevel: b.experienceLevel,
    companyTags: b.companies,
    roundType: 'SQL Coding',
    evaluationType: 'sql',
    sourceType: 'curated_track',
    sourceReference: `D's platforms Analytical SQL Mastery · ${b.topic}`,
    setupSchemaOrEnv: b.setupSql,
    adversarialSetupSql: b.adversarialSetupSql,
    sampleInput: b.setupSql.split('INSERT INTO').slice(1).map((s) => 'INSERT INTO' + s).join('\n'),
    expectedOutput: 'Executed dynamically against reference query in SQLite Wasm',
    testCases: [{ name: 'Canonical Dataset Verification', input: 'reference_sql', expected: 'Exact row & column match' }],
    starterCode: b.starterCode,
    detailedSolution: b.solutionSql,
    alternativeApproaches: b.alternativeApproaches,
    explanation: b.explanation,
    practicalRelevance: b.practicalRelevance,
    relatedLearningId: b.relatedLearningId,
    executionPlanNotes: b.executionPlanNotes,
  })),
  ...EXPANDED_SQL_SPECS.map((s): Question => ({
    uniqueId: s.id,
    title: s.title,
    problemStatement: s.problemStatement,
    domain: 'Analytical SQL',
    topic: s.topic,
    subtopic: s.subtopic,
    roadmapTracks: ['Analytical SQL Mastery'],
    difficulty: s.difficulty,
    experienceLevel: s.experienceLevel,
    companyTags: s.companies,
    roundType: 'SQL Coding',
    evaluationType: 'sql',
    sourceType: 'curated_track',
    sourceReference: `D's platforms Analytical SQL Mastery · ${s.topic}`,
    setupSchemaOrEnv: s.setupSql,
    sampleInput: s.setupSql,
    expectedOutput: 'Executed dynamically against reference query in SQLite Wasm',
    testCases: [{ name: 'Canonical Dataset Verification', input: 'reference_sql', expected: 'Exact row & column match' }],
    starterCode: `-- Write your SQLite query below\nSELECT 1;`,
    detailedSolution: s.solutionSql,
    alternativeApproaches: 'Consider CTE materialization vs inline subqueries depending on engine optimizer.',
    explanation: s.explanation,
    practicalRelevance: s.practicalRelevance,
    relatedLearningId: 'topic_query_engines',
    executionPlanNotes: s.executionPlanNotes,
  })),
  ...EXTRA_SQL_PATTERNS.map((s): Question => ({
    uniqueId: s.id,
    title: s.title,
    problemStatement: s.problem,
    domain: 'Analytical SQL',
    topic: s.topic,
    subtopic: s.subtopic,
    roadmapTracks: ['Analytical SQL Mastery'],
    difficulty: s.difficulty,
    experienceLevel: s.experienceLevel,
    companyTags: s.companies,
    roundType: 'SQL Coding',
    evaluationType: 'sql',
    sourceType: 'curated_track',
    sourceReference: `D's platforms Analytical SQL Mastery · ${s.topic}`,
    setupSchemaOrEnv: s.tableDdl,
    sampleInput: s.tableDdl,
    expectedOutput: 'Executed dynamically against reference query in SQLite Wasm',
    testCases: [{ name: 'Canonical Dataset Verification', input: 'reference_sql', expected: 'Exact row & column match' }],
    starterCode: `-- Write your SQLite query below\nSELECT 1;`,
    detailedSolution: s.query,
    alternativeApproaches: 'Consider CTE materialization vs inline subqueries depending on engine optimizer.',
    explanation: s.notes,
    practicalRelevance: `Production pattern frequently evaluated in ${s.companies.join(', ')} DE SQL rounds.`,
    relatedLearningId: 'topic_query_engines',
    executionPlanNotes: s.notes,
  })),
];
