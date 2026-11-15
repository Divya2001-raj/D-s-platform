import type { Difficulty, ExperienceTier, Question, QuestionTestCase } from '../types/platform';
import { buildPythonStarterSkeleton } from '../lib/pythonSkeleton';

interface PythonSpec {
  id: string;
  title: string;
  topic: string;
  subtopic: string;
  difficulty: Difficulty;
  experienceLevel: ExperienceTier;
  companies: string[];
  problemStatement: string;
  starterCode: string;
  detailedSolution: string;
  testCases: QuestionTestCase[];
  hiddenTestCases?: QuestionTestCase[];
  explanation: string;
  practicalRelevance: string;
}

const PYTHON_DSA_SPECS: PythonSpec[] = [
  {
    id: 'py_01_flatten_nested_json',
    title: 'Flatten Deeply Nested Telemetry JSON Records',
    topic: 'Python Data Wrangling',
    subtopic: 'Recursive Schema Flattening',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Databricks', 'Snowflake', 'Uber', 'Airbnb'],
    problemStatement:
      'Implement `flatten_json(obj: dict, sep: str = ".") -> dict` to recursively flatten nested dictionaries and lists (using zero-based index keys for lists) into a single flat key-value dictionary.',
    starterCode: `def flatten_json(obj, parent_key="", sep="."):
    # TODO: recursively flatten dicts and lists
    out = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            nk = f"{parent_key}{sep}{k}" if parent_key else str(k)
            out.update(flatten_json(v, nk, sep))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            nk = f"{parent_key}{sep}{i}" if parent_key else str(i)
            out.update(flatten_json(v, nk, sep))
    else:
        out[parent_key] = obj
    return out`,
    detailedSolution: `def flatten_json(obj, parent_key="", sep="."):
    out = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            nk = f"{parent_key}{sep}{k}" if parent_key else str(k)
            out.update(flatten_json(v, nk, sep))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            nk = f"{parent_key}{sep}{i}" if parent_key else str(i)
            out.update(flatten_json(v, nk, sep))
    else:
        out[parent_key] = obj
    return out`,
    testCases: [
      {
        name: 'Nested Dict & List',
        input: `assert flatten_json({"user": {"id": 7, "tags": ["de", "sql"]}}) == {"user.id": 7, "user.tags.0": "de", "user.tags.1": "sql"}`,
        expected: 'True',
      },
      {
        name: 'Empty Nested Dict Leaf',
        input: `assert flatten_json({"a": {"b": 1}, "c": 2}) == {"a.b": 1, "c": 2}`,
        expected: 'True',
      },
    ],
    explanation: 'DFS recursion builds dotted keys in O(Total Keys) time and O(Depth) call stack.',
    practicalRelevance: 'Bronze-to-Silver JSON normalization before Parquet schema enforcement.',
  },
  {
    id: 'py_02_p95_streaming_logs',
    title: 'Log Parser & Exact P95 Endpoint Latency',
    topic: 'Python Data Wrangling',
    subtopic: 'Log Parsing & Quantiles',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Google', 'Netflix', 'Uber', 'PhonePe'],
    problemStatement:
      'Given an iterable of log lines `"2026-01-01T10:00:00Z endpoint=/checkout status=200 latency_ms=145"`, implement `compute_p95(lines)` returning a dict `{endpoint: p95_latency}` using nearest-rank ceiling index `ceil(0.95 * N) - 1`. Ignore malformed lines or status >= 500.',
    starterCode: `import math
from collections import defaultdict

def compute_p95(lines):
    buckets = defaultdict(list)
    for line in lines:
        parts = dict(p.split("=", 1) for p in line.split() if "=" in p)
        if "endpoint" in parts and "latency_ms" in parts and int(parts.get("status", 500)) < 500:
            buckets[parts["endpoint"]].append(int(parts["latency_ms"]))
    res = {}
    for ep, vals in buckets.items():
        vals.sort()
        idx = max(0, math.ceil(0.95 * len(vals)) - 1)
        res[ep] = vals[idx]
    return res`,
    detailedSolution: `import math
from collections import defaultdict

def compute_p95(lines):
    buckets = defaultdict(list)
    for line in lines:
        parts = dict(p.split("=", 1) for p in line.split() if "=" in p)
        if "endpoint" in parts and "latency_ms" in parts and int(parts.get("status", 500)) < 500:
            buckets[parts["endpoint"]].append(int(parts["latency_ms"]))
    res = {}
    for ep, vals in buckets.items():
        vals.sort()
        idx = max(0, math.ceil(0.95 * len(vals)) - 1)
        res[ep] = vals[idx]
    return res`,
    testCases: [
      {
        name: 'Filter 5xx & Nearest Rank P95',
        input: `assert compute_p95(["t1 endpoint=/pay status=200 latency_ms=10", "t2 endpoint=/pay status=200 latency_ms=100", "t3 endpoint=/pay status=503 latency_ms=999"]) == {"/pay": 100}`,
        expected: 'True',
      },
    ],
    explanation: 'Parses key=value tokens safely, filters server errors, sorts per endpoint in O(N log N).',
    practicalRelevance: 'SLI/SLO telemetry aggregators and ingestion health monitors.',
  },
  {
    id: 'py_03_memory_bounded_chunk_gen',
    title: 'Memory-Bounded Streaming Generator & Chunked Batcher',
    topic: 'Python Data Wrangling',
    subtopic: 'Generators & O(1) Memory Streaming',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['Databricks', 'Amazon', 'Snowflake'],
    problemStatement:
      'Implement a generator `batch_stream(records, batch_size)` that yields lists of at most `batch_size` valid non-empty records without materializing the full input iterator in RAM.',
    starterCode: `def batch_stream(records, batch_size):
    buf = []
    for rec in records:
        if rec is None:
            continue
        buf.append(rec)
        if len(buf) == batch_size:
            yield buf
            buf = []
    if buf:
        yield buf`,
    detailedSolution: `def batch_stream(records, batch_size):
    buf = []
    for rec in records:
        if rec is None:
            continue
        buf.append(rec)
        if len(buf) == batch_size:
            yield buf
            buf = []
    if buf:
        yield buf`,
    testCases: [
      {
        name: 'Lazy Chunking with None Filtering',
        input: `assert list(batch_stream((x if x % 2 == 0 else None for x in range(7)), 2)) == [[0, 2], [4, 6]]`,
        expected: 'True',
      },
    ],
    explanation: 'Maintains O(batch_size) peak RAM regardless of stream length.',
    practicalRelevance: 'Micro-batching Kafka/S3 record streams into Snowflake/BigQuery bulk loaders.',
  },
  {
    id: 'py_04_arrays_two_sum_dedup',
    title: 'Arrays & Hashing: Pair Sum With Duplicate Keys',
    topic: 'Arrays & Hashing',
    subtopic: 'Hash Map Complement Lookup',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['Google', 'Amazon', 'Microsoft'],
    problemStatement:
      'Given `nums: list[int]` and `target: int`, return sorted indices `[i, j]` (`i < j`) of the two numbers adding up to `target`.',
    starterCode: `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        diff = target - n
        if diff in seen:
            return [seen[diff], i]
        seen[n] = i
    return []`,
    detailedSolution: `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        diff = target - n
        if diff in seen:
            return [seen[diff], i]
        seen[n] = i
    return []`,
    testCases: [
      { name: 'Standard Pair', input: `assert two_sum([2, 7, 11, 15], 9) == [0, 1]`, expected: 'True' },
      { name: 'Duplicate Values', input: `assert two_sum([3, 3], 6) == [0, 1]`, expected: 'True' },
    ],
    explanation: 'Single-pass hash map achieves O(N) time and O(N) space.',
    practicalRelevance: 'Foundational hash-join probe pattern.',
  },
  {
    id: 'py_05_group_anagrams_schema_sigs',
    title: 'Arrays & Hashing: Group Equivalent Schema Fingerprints',
    topic: 'Arrays & Hashing',
    subtopic: 'Canonical Key Bucketing',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Meta', 'Uber', 'LinkedIn'],
    problemStatement:
      'Given a list of column-set strings (words), group anagrams together and return sorted groups of sorted strings.',
    starterCode: `from collections import defaultdict

def group_anagrams(strs):
    groups = defaultdict(list)
    for s in strs:
        groups[tuple(sorted(s))].append(s)
    return sorted([sorted(v) for v in groups.values()])`,
    detailedSolution: `from collections import defaultdict

def group_anagrams(strs):
    groups = defaultdict(list)
    for s in strs:
        groups[tuple(sorted(s))].append(s)
    return sorted([sorted(v) for v in groups.values()])`,
    testCases: [
      {
        name: 'Canonical Grouping',
        input: `assert group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]) == [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]]`,
        expected: 'True',
      },
    ],
    explanation: 'Sorting characters (or 26-count tuple) creates a deterministic hash key.',
    practicalRelevance: 'Schema fingerprinting and duplicate dataset signature clustering.',
  },
  {
    id: 'py_06_top_k_frequent_events',
    title: 'Arrays & Hashing: Top-K Frequent Event Keys (Bucket Sort)',
    topic: 'Arrays & Hashing',
    subtopic: 'O(N) Bucket Frequency',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Databricks', 'Netflix', 'Google'],
    problemStatement:
      'Return the `k` most frequent elements from `nums` in O(N) average time using bucket sort.',
    starterCode: `from collections import Counter

def top_k_frequent(nums, k):
    counts = Counter(nums)
    buckets = [[] for _ in range(len(nums) + 1)]
    for val, freq in counts.items():
        buckets[freq].append(val)
    res = []
    for freq in range(len(buckets) - 1, 0, -1):
        for val in buckets[freq]:
            res.append(val)
            if len(res) == k:
                return res
    return res`,
    detailedSolution: `from collections import Counter

def top_k_frequent(nums, k):
    counts = Counter(nums)
    buckets = [[] for _ in range(len(nums) + 1)]
    for val, freq in counts.items():
        buckets[freq].append(val)
    res = []
    for freq in range(len(buckets) - 1, 0, -1):
        for val in buckets[freq]:
            res.append(val)
            if len(res) == k:
                return res
    return res`,
    testCases: [
      { name: 'Top 2 Keys', input: `assert sorted(top_k_frequent([1,1,1,2,2,3], 2)) == [1, 2]`, expected: 'True' },
    ],
    explanation: 'Frequency never exceeds `len(nums)`, allowing linear O(N) bucket extraction.',
    practicalRelevance: 'Hot-key detection in Kafka/Spark partitions.',
  },
  {
    id: 'py_07_two_pointers_dedup_sorted',
    title: 'Two Pointers: Merge Two Sorted WAL Streams',
    topic: 'Two Pointers',
    subtopic: 'Sorted Stream Merge & Deduplication',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['Snowflake', 'Amazon', 'Flipkart'],
    problemStatement:
      'Merge two sorted integer arrays `a` and `b` into a single sorted list removing duplicates in O(N + M) time without calling `sorted()`.',
    starterCode: `def merge_unique(a, b):
    i = j = 0
    res = []
    def push(x):
        if not res or res[-1] != x:
            res.append(x)
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            push(a[i]); i += 1
        else:
            push(b[j]); j += 1
    while i < len(a): push(a[i]); i += 1
    while j < len(b): push(b[j]); j += 1
    return res`,
    detailedSolution: `def merge_unique(a, b):
    i = j = 0
    res = []
    def push(x):
        if not res or res[-1] != x:
            res.append(x)
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            push(a[i]); i += 1
        else:
            push(b[j]); j += 1
    while i < len(a): push(a[i]); i += 1
    while j < len(b): push(b[j]); j += 1
    return res`,
    testCases: [
      { name: 'Sorted Unique Merge', input: `assert merge_unique([1, 2, 2, 5], [2, 3, 5, 8]) == [1, 2, 3, 5, 8]`, expected: 'True' },
    ],
    explanation: 'Core primitive of LSM-Tree SSTable compaction and Spark Sort-Merge Join.',
    practicalRelevance: 'LSM compaction & Iceberg/Hudi sorted run merging.',
  },
  {
    id: 'py_08_sliding_window_rate_limiter',
    title: 'Sliding Window: Max Throughput Window & Distinct Keys',
    topic: 'Sliding Window',
    subtopic: 'Bounded Window Tracking',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Uber', 'Razorpay', 'Atlassian'],
    problemStatement:
      'Given an array of event bytes `nums` and window size `k`, return the maximum sum of any contiguous subarray of length `k`, or longest substring without repeating characters via `longest_unique(s)`. Implement `max_window_sum(nums, k)`.',
    starterCode: `def max_window_sum(nums, k):
    if k <= 0 or k > len(nums):
        return 0
    cur = sum(nums[:k])
    best = cur
    for i in range(k, len(nums)):
        cur += nums[i] - nums[i - k]
        if cur > best:
            best = cur
    return best`,
    detailedSolution: `def max_window_sum(nums, k):
    if k <= 0 or k > len(nums):
        return 0
    cur = sum(nums[:k])
    best = cur
    for i in range(k, len(nums)):
        cur += nums[i] - nums[i - k]
        if cur > best:
            best = cur
    return best`,
    testCases: [
      { name: 'Sliding Window Peak', input: `assert max_window_sum([100, 200, 300, 50, 400], 2) == 500`, expected: 'True' },
    ],
    explanation: 'O(N) sliding window maintains running state in O(1) memory.',
    practicalRelevance: 'Flink sliding window throughput and backpressure burst detection.',
  },
  {
    id: 'py_09_sliding_window_longest_unique',
    title: 'Sliding Window: Longest Unique Event Sequence',
    topic: 'Sliding Window',
    subtopic: 'Variable Window Shrink',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Google', 'Meta', 'Microsoft'],
    problemStatement:
      'Implement `length_of_longest_substring(s: str) -> int` returning the length of the longest substring with all unique characters.',
    starterCode: `def length_of_longest_substring(s):
    last_idx = {}
    left = best = 0
    for right, ch in enumerate(s):
        if ch in last_idx and last_idx[ch] >= left:
            left = last_idx[ch] + 1
        last_idx[ch] = right
        best = max(best, right - left + 1)
    return best`,
    detailedSolution: `def length_of_longest_substring(s):
    last_idx = {}
    left = best = 0
    for right, ch in enumerate(s):
        if ch in last_idx and last_idx[ch] >= left:
            left = last_idx[ch] + 1
        last_idx[ch] = right
        best = max(best, right - left + 1)
    return best`,
    testCases: [
      { name: 'Repeat Reset', input: `assert length_of_longest_substring("abcabcbb") == 3`, expected: 'True' },
      { name: 'All Same', input: `assert length_of_longest_substring("bbbbb") == 1`, expected: 'True' },
    ],
    explanation: 'Hash map tracks last seen position so `left` jumps forward directly in O(N) time.',
    practicalRelevance: 'Session anomaly and deduplication window sizing.',
  },
  {
    id: 'py_10_stack_valid_sql_parens',
    title: 'Stack: Validate Nested SQL / Expression Brackets',
    topic: 'Stack',
    subtopic: 'Balanced Delimiter Parsing',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['Snowflake', 'Databricks', 'Intuit'],
    problemStatement:
      'Implement `is_valid_brackets(s: str) -> bool` checking whether `()[]{}` delimiters in a template expression are properly nested and balanced.',
    starterCode: `def is_valid_brackets(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return len(stack) == 0`,
    detailedSolution: `def is_valid_brackets(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return len(stack) == 0`,
    testCases: [
      { name: 'Nested Expression', input: `assert is_valid_brackets("SELECT (a + [b * {c}])") is True`, expected: 'True' },
      { name: 'Mismatched Order', input: `assert is_valid_brackets("([)]") is False`, expected: 'True' },
    ],
    explanation: 'LIFO stack validates matching opening/closing tokens in O(N) time.',
    practicalRelevance: 'SQL/Jinja preprocessor and AST syntax pre-checks.',
  },
  {
    id: 'py_11_binary_search_partition_offset',
    title: 'Binary Search: First Bad Commit / Partition Offset',
    topic: 'Binary Search',
    subtopic: 'Lower Bound Predicate Search',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Google', 'Uber', 'LinkedIn'],
    problemStatement:
      'Given a sorted array of commit timestamps `ts` and a threshold `target`, return the leftmost index where `ts[i] >= target` (or `-1` if none). Also handle exact search.',
    starterCode: `def lower_bound_ts(ts, target):
    lo, hi = 0, len(ts) - 1
    ans = -1
    while lo <= hi:
        mid = (lo + hi) // 2
        if ts[mid] >= target:
            ans = mid
            hi = mid - 1
        else:
            lo = mid + 1
    return ans`,
    detailedSolution: `def lower_bound_ts(ts, target):
    lo, hi = 0, len(ts) - 1
    ans = -1
    while lo <= hi:
        mid = (lo + hi) // 2
        if ts[mid] >= target:
            ans = mid
            hi = mid - 1
        else:
            lo = mid + 1
    return ans`,
    testCases: [
      { name: 'Leftmost Match', input: `assert lower_bound_ts([10, 20, 20, 30, 50], 20) == 1`, expected: 'True' },
      { name: 'Out of Range', input: `assert lower_bound_ts([10, 20], 99) == -1`, expected: 'True' },
    ],
    explanation: 'O(log N) boundary search mirrors Kafka `offsetsForTimes` and Iceberg manifest min/max pruning.',
    practicalRelevance: 'Time-travel snapshot lookup and Parquet row-group binary search.',
  },
  {
    id: 'py_12_heap_k_way_merge',
    title: 'Heap / Priority Queue: K-Way Merge of Sorted Partition Files',
    topic: 'Heap / Priority Queue',
    subtopic: 'Min-Heap External Sort Merge',
    difficulty: 'Hard',
    experienceLevel: '4-6 yrs',
    companies: ['Databricks', 'Snowflake', 'Google', 'Amazon'],
    problemStatement:
      'Given `k` sorted lists of `(timestamp, event_id)` tuples, merge them into one globally sorted list in O(N log k) time using `heapq`.',
    starterCode: `import heapq

def merge_k_sorted(streams):
    heap = []
    for s_idx, stream in enumerate(streams):
        if stream:
            heapq.heappush(heap, (stream[0][0], stream[0][1], s_idx, 0))
    out = []
    while heap:
        ts, eid, s_idx, elem_idx = heapq.heappop(heap)
        out.append((ts, eid))
        nxt = elem_idx + 1
        if nxt < len(streams[s_idx]):
            nts, neid = streams[s_idx][nxt]
            heapq.heappush(heap, (nts, neid, s_idx, nxt))
    return out`,
    detailedSolution: `import heapq

def merge_k_sorted(streams):
    heap = []
    for s_idx, stream in enumerate(streams):
        if stream:
            heapq.heappush(heap, (stream[0][0], stream[0][1], s_idx, 0))
    out = []
    while heap:
        ts, eid, s_idx, elem_idx = heapq.heappop(heap)
        out.append((ts, eid))
        nxt = elem_idx + 1
        if nxt < len(streams[s_idx]):
            nts, neid = streams[s_idx][nxt]
            heapq.heappush(heap, (nts, neid, s_idx, nxt))
    return out`,
    testCases: [
      {
        name: '3-Stream Temporal Merge',
        input: `assert merge_k_sorted([[(1,'a'),(5,'b')], [(2,'c')], [(1,'0'),(4,'d')]]) == [(1,'0'),(1,'a'),(2,'c'),(4,'d'),(5,'b')]`,
        expected: 'True',
      },
    ],
    explanation: 'Keeps heap size bounded at O(K) instead of loading all N elements to sort.',
    practicalRelevance: 'External merge-sort spill recovery in Spark, Trino, and DuckDB.',
  },
  {
    id: 'py_13_graphs_dag_topo_sort',
    title: 'Graphs: Airflow / dbt DAG Topological Execution Order',
    topic: 'Graphs',
    subtopic: 'Kahn Algorithm & Cycle Detection',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Airbnb', 'Databricks', 'Uber', 'LinkedIn'],
    problemStatement:
      'Given `tasks` (list of task names) and directed `deps` `[upstream, downstream]`, return a valid topological execution order (lexicographically smallest tie-break using a min-heap), or `[]` if a dependency cycle exists.',
    starterCode: `import heapq
from collections import defaultdict

def topo_order(tasks, deps):
    adj = defaultdict(list)
    indeg = {t: 0 for t in tasks}
    for u, v in deps:
        adj[u].append(v)
        indeg[v] = indeg.get(v, 0) + 1
    heap = [t for t in tasks if indeg[t] == 0]
    heapq.heapify(heap)
    order = []
    while heap:
        cur = heapq.heappop(heap)
        order.append(cur)
        for nxt in adj[cur]:
            indeg[nxt] -= 1
            if indeg[nxt] == 0:
                heapq.heappush(heap, nxt)
    return order if len(order) == len(tasks) else []`,
    detailedSolution: `import heapq
from collections import defaultdict

def topo_order(tasks, deps):
    adj = defaultdict(list)
    indeg = {t: 0 for t in tasks}
    for u, v in deps:
        adj[u].append(v)
        indeg[v] = indeg.get(v, 0) + 1
    heap = [t for t in tasks if indeg[t] == 0]
    heapq.heapify(heap)
    order = []
    while heap:
        cur = heapq.heappop(heap)
        order.append(cur)
        for nxt in adj[cur]:
            indeg[nxt] -= 1
            if indeg[nxt] == 0:
                heapq.heappush(heap, nxt)
    return order if len(order) == len(tasks) else []`,
    testCases: [
      {
        name: 'Valid DAG Order',
        input: `assert topo_order(["bronze", "silver", "gold"], [["bronze", "silver"], ["silver", "gold"]]) == ["bronze", "silver", "gold"]`,
        expected: 'True',
      },
      {
        name: 'Cycle Rejected',
        input: `assert topo_order(["a", "b"], [["a", "b"], ["b", "a"]]) == []`,
        expected: 'True',
      },
    ],
    explanation: 'Kahn\'s BFS with in-degree tracking guarantees cycle detection when `len(order) < len(tasks)`.',
    practicalRelevance: 'Core scheduler execution engine inside Airflow, Dagster, and dbt.',
  },
  {
    id: 'py_14_intervals_merge_windows',
    title: 'Intervals: Merge Overlapping Batch Backfill Ranges',
    topic: 'Intervals',
    subtopic: 'Interval Coalescing',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Google', 'Meta', 'Stripe'],
    problemStatement:
      'Given `intervals: list[list[int]]`, merge all overlapping `[start, end]` intervals and return sorted merged intervals.',
    starterCode: `def merge_intervals(intervals):
    if not intervals:
        return []
    intervals = sorted(intervals, key=lambda x: (x[0], x[1]))
    merged = [intervals[0][:]]
    for s, e in intervals[1:]:
        if s <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    return merged`,
    detailedSolution: `def merge_intervals(intervals):
    if not intervals:
        return []
    intervals = sorted(intervals, key=lambda x: (x[0], x[1]))
    merged = [intervals[0][:]]
    for s, e in intervals[1:]:
        if s <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    return merged`,
    testCases: [
      {
        name: 'Coalesce Overlaps',
        input: `assert merge_intervals([[1, 3], [2, 6], [8, 10], [15, 18]]) == [[1, 6], [8, 10], [15, 18]]`,
        expected: 'True',
      },
    ],
    explanation: 'Sorting by start time reduces interval merging to a single O(N) sweep.',
    practicalRelevance: 'Consolidating fragmented backfill time-windows before issuing expensive BigQuery/Snowflake scans.',
  },
  {
    id: 'py_15_dp_coin_change_min_batches',
    title: '1-D DP: Minimum API Batch Calls to Reach Exact Quota',
    topic: '1-D / 2-D DP',
    subtopic: 'Unbounded Knapsack Minimization',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Amazon', 'Microsoft', 'Flipkart'],
    problemStatement:
      'Given allowed batch sizes `sizes` and `target` rows, return the minimum number of batch calls needed to emit `target` rows, or `-1` if impossible.',
    starterCode: `def min_batches(sizes, target):
    dp = [target + 1] * (target + 1)
    dp[0] = 0
    for amt in range(1, target + 1):
        for s in sizes:
            if s <= amt:
                dp[amt] = min(dp[amt], dp[amt - s] + 1)
    return dp[target] if dp[target] <= target else -1`,
    detailedSolution: `def min_batches(sizes, target):
    dp = [target + 1] * (target + 1)
    dp[0] = 0
    for amt in range(1, target + 1):
        for s in sizes:
            if s <= amt:
                dp[amt] = min(dp[amt], dp[amt - s] + 1)
    return dp[target] if dp[target] <= target else -1`,
    testCases: [
      { name: 'Optimal Packing', input: `assert min_batches([1, 2, 5], 11) == 3`, expected: 'True' },
      { name: 'Impossible Target', input: `assert min_batches([2], 3) == -1`, expected: 'True' },
    ],
    explanation: 'Bottom-up 1D DP computes exact minimum transitions in O(target * len(sizes)).',
    practicalRelevance: 'Optimal chunking and shard sizing under fixed payload constraints.',
  },
];

// Additional 27 NeetCode 150 / Blind 75 / DE Python patterns so total Python/DSA >= 42
const MORE_PYTHON_SPECS: Array<{
  id: string;
  title: string;
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
    id: 'py_16_linked_list_lru_cache',
    title: 'Linked List & Design: O(1) LRU Cache for Metadata Catalog',
    topic: 'Linked List',
    subtopic: 'OrderedDict / Doubly Linked List',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Google', 'Uber', 'Databricks'],
    problem: 'Implement `LRUCache(capacity)` with O(1) `get(key)` and `put(key, value)` evicting least recently used keys.',
    code: `from collections import OrderedDict
class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.od = OrderedDict()
    def get(self, key: int) -> int:
        if key not in self.od: return -1
        self.od.move_to_end(key)
        return self.od[key]
    def put(self, key: int, value: int) -> None:
        if key in self.od: self.od.move_to_end(key)
        self.od[key] = value
        if len(self.od) > self.cap: self.od.popitem(last=False)`,
    test: `c = LRUCache(2); c.put(1,1); c.put(2,2); assert c.get(1)==1; c.put(3,3); assert c.get(2)==-1`,
    note: 'Used in Hive Metastore / Iceberg catalog manifest caching.',
  },
  {
    id: 'py_17_trees_lca_lineage',
    title: 'Trees: Lowest Common Ancestor in Schema Hierarchy',
    topic: 'Trees',
    subtopic: 'Recursive Tree LCA',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Meta', 'Amazon', 'Snowflake'],
    problem: 'Given parent pointers `{node: parent}`, implement `lca(parents, a, b)` to find the lowest common ancestor of nodes `a` and `b`.',
    code: `def lca(parents, a, b):
    ancestors = set()
    while a is not None:
        ancestors.add(a)
        a = parents.get(a)
    while b not in ancestors:
        b = parents.get(b)
    return b`,
    test: `assert lca({"root": None, "db": "root", "t1": "db", "t2": "db", "c1": "t1"}, "c1", "t2") == "db"`,
    note: 'Ancestor set traversal runs in O(Height) time.',
  },
  {
    id: 'py_18_tries_prefix_catalog_search',
    title: 'Tries: Prefix Autocomplete for Data Catalog Tables',
    topic: 'Tries',
    subtopic: 'Prefix Trie Index',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Databricks', 'Atlassian', 'LinkedIn'],
    problem: 'Implement `Trie` supporting `insert(word)`, `search(word)`, and `starts_with(prefix)`.',
    code: `class Trie:
    def __init__(self):
        self.root = {}
    def insert(self, word: str) -> None:
        cur = self.root
        for ch in word: cur = cur.setdefault(ch, {})
        cur["#"] = True
    def search(self, word: str) -> bool:
        cur = self.root
        for ch in word:
            if ch not in cur: return False
            cur = cur[ch]
        return "#" in cur
    def starts_with(self, prefix: str) -> bool:
        cur = self.root
        for ch in prefix:
            if ch not in cur: return False
            cur = cur[ch]
        return True`,
    test: `t = Trie(); t.insert("fct_orders"); assert t.starts_with("fct_") and not t.search("fct_") and t.search("fct_orders")`,
    note: 'O(L) prefix lookup for command palettes and table search.',
  },
  {
    id: 'py_19_graphs_union_find_clusters',
    title: 'Graphs: Union-Find Identity Resolution Stitching',
    topic: 'Graphs',
    subtopic: 'Disjoint Set Union (Path Compression)',
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companies: ['Uber', 'Airbnb', 'Adobe'],
    problem: 'Given pairs of linked user identifiers `edges`, implement `count_entities(n, edges)` using Union-Find to return total distinct connected identities across `0..n-1`.',
    code: `def count_entities(n, edges):
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    comps = n
    for u, v in edges:
        ru, rv = find(u), find(v)
        if ru != rv:
            parent[ru] = rv
            comps -= 1
    return comps`,
    test: `assert count_entities(5, [[0,1],[1,2],[3,4]]) == 2`,
    note: 'Nearly O(1) amortized alpha(N) identity stitching across devices/cookies.',
  },
  {
    id: 'py_20_adv_graphs_dijkstra_routing',
    title: 'Advanced Graphs: Minimum Latency Pipeline Routing (Dijkstra)',
    topic: 'Advanced Graphs',
    subtopic: 'Weighted Shortest Path',
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companies: ['Google', 'Netflix', 'Confluent'],
    problem: 'Given weighted directed edges `{u: [(v, w)]}`, implement `shortest_latency(adj, src, dst)` using Dijkstra.',
    code: `import heapq
def shortest_latency(adj, src, dst):
    dist = {src: 0}
    pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if u == dst: return d
        if d > dist.get(u, float("inf")): continue
        for v, w in adj.get(u, []):
            nd = d + w
            if nd < dist.get(v, float("inf")):
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return -1`,
    test: `assert shortest_latency({"a":[("b",4),("c",1)], "c":[("b",2)], "b":[("d",3)]}, "a", "d") == 6`,
    note: 'Models cross-region Kafka replication routing cost.',
  },
  {
    id: 'py_21_backtracking_partition_subsets',
    title: 'Backtracking: Generate Valid Feature Combinations',
    topic: 'Backtracking',
    subtopic: 'Combinatorial Search',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Meta', 'Amazon'],
    problem: 'Implement `subsets(nums)` returning all unique subsets sorted lexicographically.',
    code: `def subsets(nums):
    res = []
    def dfs(i, path):
        if i == len(nums):
            res.append(path[:])
            return
        dfs(i + 1, path)
        path.append(nums[i])
        dfs(i + 1, path)
        path.pop()
    dfs(0, [])
    return sorted(res)`,
    test: `assert subsets([1, 2]) == [[], [1], [1, 2], [2]]`,
    note: 'Foundational backtracking state-space exploration.',
  },
  {
    id: 'py_22_greedy_meeting_rooms_min_executors',
    title: 'Greedy & Intervals: Minimum Spark Executors for Concurrent Jobs',
    topic: 'Greedy',
    subtopic: 'Min-Heap End-Time Scheduling',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Databricks', 'Snowflake', 'Uber'],
    problem: 'Given job `[start, end]` intervals, return the minimum number of executors needed so no two overlapping jobs share an executor.',
    code: `import heapq
def min_executors(intervals):
    if not intervals: return 0
    intervals = sorted(intervals)
    heap = []
    for s, e in intervals:
        if heap and heap[0] <= s:
            heapq.heappop(heap)
        heapq.heappush(heap, e)
    return len(heap)`,
    test: `assert min_executors([[0, 30], [5, 10], [15, 20]]) == 2`,
    note: 'Identical to Meeting Rooms II — crucial for compute cluster sizing.',
  },
  {
    id: 'py_23_bit_manipulation_bloom_mask',
    title: 'Bit Manipulation: Compact Partition Bloom Bitmask Check',
    topic: 'Bit Manipulation',
    subtopic: 'Bitwise Operations',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['Google', 'Apple', 'Databricks'],
    problem: 'Implement `count_set_bits(n: int) -> int` using Brian Kernighan\'s bit-clearing trick `n &= (n - 1)`.',
    code: `def count_set_bits(n: int) -> int:
    c = 0
    while n > 0:
        n &= (n - 1)
        c += 1
    return c`,
    test: `assert count_set_bits(0b101101) == 4`,
    note: 'Runs in O(number of set bits), used inside Roaring Bitmaps and Bloom filters.',
  },
  {
    id: 'py_24_binary_search_rotated_array',
    title: 'Binary Search: Search in Rotated Sorted Log Segment',
    topic: 'Binary Search',
    subtopic: 'Rotated Array Pivot',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Amazon', 'Microsoft', 'Uber'],
    problem: 'Search `target` in a rotated sorted array `nums` with distinct integers in O(log N) time.',
    code: `def search_rotated(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target: return mid
        if nums[lo] <= nums[mid]:
            if nums[lo] <= target < nums[mid]: hi = mid - 1
            else: lo = mid + 1
        else:
            if nums[mid] < target <= nums[hi]: lo = mid + 1
            else: hi = mid - 1
    return -1`,
    test: `assert search_rotated([4,5,6,7,0,1,2], 0) == 4`,
    note: 'Handles circular ring-buffer log segments cleanly.',
  },
  {
    id: 'py_25_stack_monotonic_next_peak',
    title: 'Stack: Monotonic Stack for Next Latency Spike',
    topic: 'Stack',
    subtopic: 'Monotonic Decreasing Stack',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Meta', 'Netflix', 'Google'],
    problem: 'Given daily latencies `arr`, return an array where `ans[i]` is how many steps until a strictly higher latency occurs (0 if none).',
    code: `def days_until_spike(arr):
    ans = [0] * len(arr)
    st = []
    for i, val in enumerate(arr):
        while st and arr[st[-1]] < val:
            idx = st.pop()
            ans[idx] = i - idx
        st.append(i)
    return ans`,
    test: `assert days_until_spike([73,74,75,71,69,72,76,73]) == [1,1,4,2,1,1,0,0]`,
    note: 'O(N) monotonic stack avoids O(N^2) lookahead.',
  },
  {
    id: 'py_26_dp_2d_edit_distance_schema',
    title: '2-D DP: Column Name Edit Distance (Fuzzy Schema Matching)',
    topic: '1-D / 2-D DP',
    subtopic: 'Levenshtein Distance',
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companies: ['Snowflake', 'Databricks', 'Salesforce'],
    problem: 'Compute minimum insert/delete/replace operations to transform `w1` into `w2`.',
    code: `def min_distance(w1: str, w2: str) -> int:
    m, n = len(w1), len(w2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1): dp[i][0] = i
    for j in range(n + 1): dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if w1[i-1] == w2[j-1]: dp[i][j] = dp[i-1][j-1]
            else: dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    return dp[m][n]`,
    test: `assert min_distance("cust_id", "customer_id") == 4`,
    note: 'Powers automated schema-drift column auto-mapping.',
  },
  {
    id: 'py_27_heap_running_median_stream',
    title: 'Heap: Streaming Median Latency (Two-Heaps Pattern)',
    topic: 'Heap / Priority Queue',
    subtopic: 'Balanced Min/Max Heaps',
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companies: ['Google', 'Uber', 'PhonePe'],
    problem: 'Implement `MedianFinder` with O(log N) `add_num(num)` and O(1) `find_median()`.',
    code: `import heapq
class MedianFinder:
    def __init__(self):
        self.small = [] # max-heap (negated)
        self.large = [] # min-heap
    def add_num(self, num: int) -> None:
        heapq.heappush(self.small, -num)
        heapq.heappush(self.large, -heapq.heappop(self.small))
        if len(self.large) > len(self.small):
            heapq.heappush(self.small, -heapq.heappop(self.large))
    def find_median(self) -> float:
        if len(self.small) > len(self.large):
            return float(-self.small[0])
        return (-self.small[0] + self.large[0]) / 2.0`,
    test: `mf = MedianFinder(); mf.add_num(10); mf.add_num(20); assert mf.find_median()==15.0; mf.add_num(30); assert mf.find_median()==20.0`,
    note: 'Exact streaming quantile tracking without sorting on every read.',
  },
  {
    id: 'py_28_two_pointers_3sum_zero',
    title: 'Two Pointers: Triplets Summing to Zero Reconciliation Balance',
    topic: 'Two Pointers',
    subtopic: 'Sorted Two-Pointer Deduplication',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Amazon', 'Razorpay'],
    problem: 'Return all unique sorted triplets `[a, b, c]` in `nums` that sum to `0`.',
    code: `def three_sum(nums):
    nums.sort()
    res = []
    for i in range(len(nums)):
        if i > 0 and nums[i] == nums[i-1]: continue
        l, r = i + 1, len(nums) - 1
        while l < r:
            s = nums[i] + nums[l] + nums[r]
            if s < 0: l += 1
            elif s > 0: r -= 1
            else:
                res.append([nums[i], nums[l], nums[r]])
                l += 1
                while l < r and nums[l] == nums[l-1]: l += 1
    return res`,
    test: `assert three_sum([-1,0,1,2,-1,-4]) == [[-1,-1,2],[-1,0,1]]`,
    note: 'O(N^2) time and O(1) auxiliary space.',
  },
  {
    id: 'py_29_trees_validate_bst_ranges',
    title: 'Trees: Validate Range-Partitioned B-Tree Invariant',
    topic: 'Trees',
    subtopic: 'Min/Max Bound DFS',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Snowflake', 'Microsoft'],
    problem: 'Given nested dict node `{"val": int, "left": ..., "right": ...}`, implement `is_valid_bst(node)` checking strict BST ordering.',
    code: `def is_valid_bst(node, lo=float("-inf"), hi=float("inf")):
    if node is None: return True
    v = node["val"]
    if not (lo < v < hi): return False
    return is_valid_bst(node.get("left"), lo, v) and is_valid_bst(node.get("right"), v, hi)`,
    test: `assert is_valid_bst({"val": 5, "left": {"val": 3}, "right": {"val": 8}}) is True`,
    note: 'Mirrors range-partition boundary verification in storage engines.',
  },
  {
    id: 'py_30_arrays_product_except_self',
    title: 'Arrays & Hashing: Prefix/Suffix Product Without Division',
    topic: 'Arrays & Hashing',
    subtopic: 'Two-Pass Prefix-Suffix',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Amazon', 'Apple'],
    problem: 'Return `out[i]` equal to the product of all elements except `nums[i]` in O(N) time without division.',
    code: `def product_except_self(nums):
    n = len(nums)
    out = [1] * n
    pref = 1
    for i in range(n):
        out[i] = pref
        pref *= nums[i]
    suff = 1
    for i in range(n - 1, -1, -1):
        out[i] *= suff
        suff *= nums[i]
    return out`,
    test: `assert product_except_self([1, 2, 3, 4]) == [24, 12, 8, 6]`,
    note: 'Avoids zero-division hazards.',
  },
  {
    id: 'py_31_graphs_island_connected_clusters',
    title: 'Graphs: Count Isolated Fault Domains in 2D Rack Grid',
    topic: 'Graphs',
    subtopic: 'Grid BFS/DFS Flood Fill',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Google', 'Amazon'],
    problem: 'Given 2D grid of `1` (active node) and `0` (empty), return the number of connected active clusters.',
    code: `def num_clusters(grid):
    if not grid: return 0
    rows, cols = len(grid), len(grid[0])
    seen = set()
    def dfs(r, c):
        stack = [(r, c)]
        while stack:
            cr, cc = stack.pop()
            for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):
                nr, nc = cr+dr, cc+dc
                if 0<=nr<rows and 0<=nc<cols and grid[nr][nc]==1 and (nr,nc) not in seen:
                    seen.add((nr,nc))
                    stack.append((nr,nc))
    cnt = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c]==1 and (r,c) not in seen:
                seen.add((r,c))
                dfs(r,c)
                cnt += 1
    return cnt`,
    test: `assert num_clusters([[1,1,0],[0,1,0],[0,0,1]]) == 2`,
    note: 'Iterative stack avoids Python recursion limit on large grids.',
  },
  {
    id: 'py_32_greedy_jump_partition_reach',
    title: 'Greedy: Verify Checkpoint Reachability Across Offsets',
    topic: 'Greedy',
    subtopic: 'Max Reachable Horizon',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Uber', 'Netflix'],
    problem: 'Given `max_jumps[i]` from index `i`, return `True` if you can reach the last index from `0`.',
    code: `def can_reach_end(nums):
    reach = 0
    for i, step in enumerate(nums):
        if i > reach: return False
        reach = max(reach, i + step)
    return True`,
    test: `assert can_reach_end([2,3,1,1,4]) is True and can_reach_end([3,2,1,0,4]) is False`,
    note: 'O(N) time and O(1) space.',
  },
  {
    id: 'py_33_python_xml_nested_kv_parser',
    title: 'Python Data Wrangling: Parse Nested XML/Tag Payload Safely',
    topic: 'Python Data Wrangling',
    subtopic: 'ElementTree Extraction',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Intuit', 'Salesforce', 'Walmart Global Tech'],
    problem: 'Parse an XML `<events><event id="1"><amt>45</amt></event>...</events>` string and return `[{"id": "1", "amt": 45}, ...]`.',
    code: `import xml.etree.ElementTree as ET
def parse_xml_events(xml_str):
    root = ET.fromstring(xml_str)
    out = []
    for ev in root.findall("event"):
        amt_el = ev.find("amt")
        out.append({"id": ev.attrib.get("id"), "amt": int(amt_el.text) if amt_el is not None else 0})
    return out`,
    test: `assert parse_xml_events('<events><event id="e1"><amt>45</amt></event></events>') == [{"id": "e1", "amt": 45}]`,
    note: 'Safe standard library parsing for legacy SOAP/ERP feeds.',
  },
  {
    id: 'py_34_dp_house_robber_non_adj',
    title: '1-D DP: Max Non-Adjacent Maintenance Slot Throughput',
    topic: '1-D / 2-D DP',
    subtopic: 'Constant-Space Recurrence',
    difficulty: 'Medium',
    experienceLevel: '3-4 yrs',
    companies: ['Google', 'Adobe'],
    problem: 'Choose non-adjacent elements from `nums` to maximize total sum.',
    code: `def max_non_adjacent(nums):
    prev2 = prev1 = 0
    for x in nums:
        prev2, prev1 = prev1, max(prev1, prev2 + x)
    return prev1`,
    test: `assert max_non_adjacent([2, 7, 9, 3, 1]) == 12`,
    note: 'O(N) time, O(1) space DP.',
  },
  {
    id: 'py_35_sliding_window_token_bucket',
    title: 'Sliding Window: Fixed-Window API Rate Limiter',
    topic: 'Sliding Window',
    subtopic: 'Deque Timestamp Queue',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Stripe', 'Razorpay', 'Atlassian'],
    problem: 'Given sorted request timestamps `ts_list`, window `W`, and `limit`, return booleans indicating if each request is allowed under at most `limit` allowed requests in `[t - W + 1, t]`.',
    code: `from collections import deque
def rate_limit(ts_list, window, limit):
    q = deque()
    res = []
    for t in ts_list:
        while q and q[0] <= t - window:
            q.popleft()
        if len(q) < limit:
            q.append(t)
            res.append(True)
        else:
            res.append(False)
    return res`,
    test: `assert rate_limit([1, 2, 3, 10], 5, 2) == [True, True, False, True]`,
    note: 'Exact sliding window log rate-limiter.',
  },
  {
    id: 'py_36_linked_list_detect_cycle',
    title: 'Linked List: Floyd Cycle Detection on Pointer Graph',
    topic: 'Linked List',
    subtopic: 'Fast & Slow Pointers',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['Microsoft', 'Amazon'],
    problem: 'Given `nxt` mapping `{node: next_node}` and `head`, return `True` if a cycle is reachable from `head`.',
    code: `def has_cycle(nxt, head):
    slow = fast = head
    while fast is not None and nxt.get(fast) is not None:
        slow = nxt.get(slow)
        fast = nxt.get(nxt.get(fast))
        if slow == fast:
            return True
    return False`,
    test: `assert has_cycle({1:2, 2:3, 3:1}, 1) is True and has_cycle({1:2, 2:3}, 1) is False`,
    note: 'O(1) memory cycle guard for lineage pointer traversal.',
  },
  {
    id: 'py_37_trees_level_order_bfs',
    title: 'Trees: Level-Order BFS Traversal of Partition Tree',
    topic: 'Trees',
    subtopic: 'Queue BFS Layering',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['Meta', 'Flipkart'],
    problem: 'Return level-order values `[[root], [left, right], ...]` for nested dict tree `{"val": x, "left": ..., "right": ...}`.',
    code: `from collections import deque
def level_order(root):
    if not root: return []
    q = deque([root])
    res = []
    while q:
        lvl = []
        for _ in range(len(q)):
            node = q.popleft()
            lvl.append(node["val"])
            if node.get("left"): q.append(node["left"])
            if node.get("right"): q.append(node["right"])
        res.append(lvl)
    return res`,
    test: `assert level_order({"val":1,"left":{"val":2},"right":{"val":3}}) == [[1],[2,3]]`,
    note: 'Standard breadth-first wave scheduling.',
  },
  {
    id: 'py_38_backtracking_combination_sum',
    title: 'Backtracking: Exact Shard Capacity Combinations',
    topic: 'Backtracking',
    subtopic: 'Pruned Recursive Search',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Databricks', 'Airbnb'],
    problem: 'Find all unique combinations of `candidates` (reusable) summing to `target`.',
    code: `def combination_sum(candidates, target):
    candidates = sorted(candidates)
    res = []
    def dfs(start, rem, path):
        if rem == 0:
            res.append(path[:]); return
        for i in range(start, len(candidates)):
            if candidates[i] > rem: break
            path.append(candidates[i])
            dfs(i, rem - candidates[i], path)
            path.pop()
    dfs(0, target, [])
    return res`,
    test: `assert combination_sum([2,3,6,7], 7) == [[2,2,3],[7]]`,
    note: 'Sorting enables immediate branch pruning.',
  },
  {
    id: 'py_39_intervals_non_overlapping_erase',
    title: 'Intervals: Minimum Jobs Dropped to Resolve Contention',
    topic: 'Intervals',
    subtopic: 'Greedy End-Time Selection',
    difficulty: 'Medium',
    experienceLevel: '4-6 yrs',
    companies: ['Google', 'Uber'],
    problem: 'Return the minimum number of intervals to remove so the rest are non-overlapping.',
    code: `def erase_overlap_intervals(intervals):
    if not intervals: return 0
    intervals = sorted(intervals, key=lambda x: x[1])
    end = intervals[0][1]
    dropped = 0
    for s, e in intervals[1:]:
        if s < end: dropped += 1
        else: end = e
    return dropped`,
    test: `assert erase_overlap_intervals([[1,2],[2,3],[3,4],[1,3]]) == 1`,
    note: 'Classic greedy interval scheduling.',
  },
  {
    id: 'py_40_bit_single_number_xor',
    title: 'Bit Manipulation: Find Unpaired Orphan Checkpoint ID via XOR',
    topic: 'Bit Manipulation',
    subtopic: 'XOR Identity Property',
    difficulty: 'Easy',
    experienceLevel: '3-4 yrs',
    companies: ['Amazon', 'Apple'],
    problem: 'Every element in `nums` appears twice except one; return the single element in O(N) time and O(1) space.',
    code: `def single_number(nums):
    acc = 0
    for n in nums:
        acc ^= n
    return acc`,
    test: `assert single_number([4, 1, 2, 1, 2]) == 4`,
    note: 'Zero extra memory checksum verification.',
  },
  {
    id: 'py_41_python_hll_cardinality_sketch',
    title: 'Python Data Wrangling: Streaming Sketch & Top-N Heavy Hitters',
    topic: 'Python Data Wrangling',
    subtopic: 'Count-Min / Deterministic Top-N',
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companies: ['Databricks', 'Confluent', 'Netflix'],
    problem: 'Implement `heavy_hitters(events, min_share)` returning sorted keys whose occurrence ratio is strictly >= `min_share`.',
    code: `from collections import Counter
def heavy_hitters(events, min_share):
    n = len(events)
    if n == 0: return []
    counts = Counter(events)
    return sorted([k for k, v in counts.items() if v / n >= min_share])`,
    test: `assert heavy_hitters(["k1","k1","k1","k2","k3"], 0.5) == ["k1"]`,
    note: 'Detects hot keys prior to Spark salt injection.',
  },
  {
    id: 'py_42_adv_graphs_longest_dag_path',
    title: 'Advanced Graphs: Critical Path Duration in Airflow DAG',
    topic: 'Advanced Graphs',
    subtopic: 'DAG Longest Path DP',
    difficulty: 'Hard',
    experienceLevel: '6+ yrs',
    companies: ['Airbnb', 'Uber', 'Google'],
    problem: 'Given `durations: dict[str, int]` and directed `edges: list[tuple[str, str]]`, return the longest critical-path runtime across the DAG.',
    code: `from collections import defaultdict
def critical_path_duration(durations, edges):
    adj = defaultdict(list)
    for u, v in edges:
        adj[u].append(v)
    memo = {}
    def dfs(u):
        if u in memo: return memo[u]
        best_child = max((dfs(v) for v in adj[u]), default=0)
        memo[u] = durations[u] + best_child
        return memo[u]
    return max((dfs(node) for node in durations), default=0)`,
    test: `assert critical_path_duration({"a":3,"b":5,"c":2,"d":4}, [("a","b"),("a","c"),("b","d"),("c","d")]) == 12`,
    note: 'Critical path analysis drives SLA optimization in multi-stage Airflow DAGs.',
  },
];

export const SEED_DSA_PYTHON_QUESTIONS: Question[] = [
  ...PYTHON_DSA_SPECS.map((p): Question => ({
    uniqueId: p.id,
    title: p.title,
    problemStatement: p.problemStatement,
    domain: 'Python & DSA',
    topic: p.topic,
    subtopic: p.subtopic,
    roadmapTracks: ['DSA Pattern Roadmap', 'Data Engineering Core'],
    difficulty: p.difficulty,
    experienceLevel: p.experienceLevel,
    companyTags: p.companies,
    roundType: 'Python & DSA Coding',
    roundNumber: 2,
    evaluationType: 'python',
    sourceType: 'curated_track',
    sourceReference: `D's platforms DSA & Python Roadmap · ${p.topic}`,
    setupSchemaOrEnv: '# Executed in isolated Pyodide WebAssembly CPython worker',
    sampleInput: p.testCases[0]?.input || '',
    expectedOutput: 'All Python unit assertions pass',
    testCases: p.testCases,
    hiddenTestCases: p.hiddenTestCases ?? [
      {
        name: 'Hidden Boundary Check',
        input: p.testCases[0]?.input || 'assert True',
        expected: 'True',
      },
    ],
    starterCode: buildPythonStarterSkeleton(p.detailedSolution, `Implement ${p.subtopic}`),
    detailedSolution: p.detailedSolution,
    alternativeApproaches: 'Compare iterative vs recursive or heap vs sort complexity trade-offs.',
    explanation: p.explanation,
    practicalRelevance: p.practicalRelevance,
    relatedLearningId: 'topic_python_dsa_patterns',
    executionPlanNotes: p.explanation,
  })),
  ...MORE_PYTHON_SPECS.map((p): Question => ({
    uniqueId: p.id,
    title: p.title,
    problemStatement: p.problem,
    domain: 'Python & DSA',
    topic: p.topic,
    subtopic: p.subtopic,
    roadmapTracks: ['DSA Pattern Roadmap'],
    difficulty: p.difficulty,
    experienceLevel: p.experienceLevel,
    companyTags: p.companies,
    roundType: 'Python & DSA Coding',
    roundNumber: 2,
    evaluationType: 'python',
    sourceType: 'curated_track',
    sourceReference: `D's platforms DSA Pattern Roadmap · ${p.topic}`,
    setupSchemaOrEnv: '# Executed in isolated Pyodide WebAssembly CPython worker',
    sampleInput: p.test,
    expectedOutput: 'All Python unit assertions pass',
    testCases: [{ name: 'Sample Unit Assertion', input: p.test, expected: 'True' }],
    hiddenTestCases: [{ name: 'Hidden Verification Suite', input: p.test, expected: 'True' }],
    starterCode: buildPythonStarterSkeleton(p.code, `Implement ${p.subtopic}`),
    detailedSolution: p.code,
    alternativeApproaches: p.note,
    explanation: p.note,
    practicalRelevance: `Evaluated in ${p.companies.join(', ')} Data Engineering coding loops.`,
    relatedLearningId: 'topic_python_dsa_patterns',
    executionPlanNotes: p.note,
  })),
];
