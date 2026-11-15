import type { QuestionTestCase } from '../types/platform';

export interface SplitTestSuite {
  visible: QuestionTestCase[];
  hidden: QuestionTestCase[];
}

export const PYTHON_6PLUS_TESTS_REGISTRY: Record<string, SplitTestSuite> = {
  py_01_flatten_nested_json: {
    visible: [
      { name: 'Case 1 · Nested Dict & List', input: 'assert flatten_json({"user": {"id": 7, "tags": ["de", "sql"]}}) == {"user.id": 7, "user.tags.0": "de", "user.tags.1": "sql"}', expected: 'True' },
      { name: 'Case 2 · Shallow Mixed Keys', input: 'assert flatten_json({"a": {"b": 1}, "c": 2}) == {"a.b": 1, "c": 2}', expected: 'True' },
      { name: 'Case 3 · Custom Underscore Separator', input: 'assert flatten_json({"meta": {"src": "kafka", "v": 3}}, sep="_") == {"meta_src": "kafka", "meta_v": 3}', expected: 'True' },
      { name: 'Case 4 · Null & Boolean Leaves', input: 'assert flatten_json({"ok": True, "err": None, "nested": {"ok": False}}) == {"ok": True, "err": None, "nested.ok": False}', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Deeply Nested Array Matrix', input: 'assert flatten_json({"items": [{"sku": "A"}, {"sku": "B"}]}) == {"items.0.sku": "A", "items.1.sku": "B"}', expected: 'True' },
      { name: 'Case 6 · Empty Container Boundary', input: 'assert flatten_json({}) == {} and flatten_json([]) == {}', expected: 'True' },
    ],
  },
  py_02_p95_streaming_logs: {
    visible: [
      { name: 'Case 1 · Standard Multi-Endpoint P95', input: 'logs = ["ts=1 endpoint=/pay status=200 latency_ms=10", "ts=2 endpoint=/pay status=200 latency_ms=100", "ts=3 endpoint=/pay status=502 latency_ms=9999"]; assert compute_p95(logs) == {"/pay": 100}', expected: 'True' },
      { name: 'Case 2 · 20 Samples Nearest-Rank P95', input: 'logs = [f"endpoint=/api status=200 latency_ms={i*10}" for i in range(1, 21)]; assert compute_p95(logs) == {"/api": 190}', expected: 'True' },
      { name: 'Case 3 · Exclude 5xx Spikes', input: 'logs = ["endpoint=/search status=200 latency_ms=45", "endpoint=/search status=500 latency_ms=8000", "endpoint=/search status=503 latency_ms=9000"]; assert compute_p95(logs) == {"/search": 45}', expected: 'True' },
      { name: 'Case 4 · Multiple Endpoints Independent', input: 'logs = ["endpoint=/a status=200 latency_ms=12", "endpoint=/b status=201 latency_ms=88"]; assert compute_p95(logs) == {"/a": 12, "/b": 88}', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty & Malformed Input Safe', input: 'assert compute_p95([]) == {} and compute_p95(["bad line without kv"]) == {}', expected: 'True' },
      { name: 'Case 6 · Include 3xx/4xx Below 500', input: 'assert compute_p95(["endpoint=/auth status=401 latency_ms=15", "endpoint=/auth status=200 latency_ms=30"]) == {"/auth": 30}', expected: 'True' },
    ],
  },
  py_03_memory_bounded_chunk_gen: {
    visible: [
      { name: 'Case 1 · Even & Remainder Batches', input: 'assert list(batch_stream([1, None, 2, 3, 4, None, 5], 2)) == [[1, 2], [3, 4], [5]]', expected: 'True' },
      { name: 'Case 2 · Lazy Generator Iterator Protocol', input: 'g = batch_stream((i for i in range(5)), 2); assert next(g) == [0, 1] and next(g) == [2, 3] and next(g) == [4]', expected: 'True' },
      { name: 'Case 3 · All None Filtered Out', input: 'assert list(batch_stream([None, None, None], 3)) == []', expected: 'True' },
      { name: 'Case 4 · Batch Size Larger Than Input', input: 'assert list(batch_stream([{"id": 1}, {"id": 2}], 10)) == [[{"id": 1}, {"id": 2}]]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Exact Multiple Division', input: 'assert list(batch_stream([10, 20, 30, 40], 2)) == [[10, 20], [30, 40]]', expected: 'True' },
      { name: 'Case 6 · Empty Stream Boundary', input: 'assert list(batch_stream([], 5)) == []', expected: 'True' },
    ],
  },
  py_04_arrays_two_sum_dedup: {
    visible: [
      { name: 'Case 1 · Canonical Pair', input: 'assert two_sum([2, 7, 11, 15], 9) == [0, 1]', expected: 'True' },
      { name: 'Case 2 · Duplicate Element Values', input: 'assert two_sum([3, 3], 6) == [0, 1]', expected: 'True' },
      { name: 'Case 3 · Negative Offsets', input: 'assert two_sum([-3, 4, 3, 90], 0) == [0, 2]', expected: 'True' },
      { name: 'Case 4 · Non-Adjacent Match', input: 'assert two_sum([3, 2, 4], 6) == [1, 2]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · No Match Returns Empty', input: 'assert two_sum([1, 2, 3], 99) == []', expected: 'True' },
      { name: 'Case 6 · Single / Empty Boundary', input: 'assert two_sum([], 5) == [] and two_sum([5], 5) == []', expected: 'True' },
    ],
  },
  py_05_group_anagrams_schema_sigs: {
    visible: [
      { name: 'Case 1 · Canonical Schema Tokens', input: 'assert group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]) == [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]]', expected: 'True' },
      { name: 'Case 2 · Single Empty String', input: 'assert group_anagrams([""]) == [[""]]', expected: 'True' },
      { name: 'Case 3 · Single Element', input: 'assert group_anagrams(["id"]) == [["id"]]', expected: 'True' },
      { name: 'Case 4 · Disjoint Signatures', input: 'assert group_anagrams(["ab", "cd", "ef"]) == [["ab"], ["cd"], ["ef"]]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Duplicate Identical Tokens', input: 'assert group_anagrams(["ts", "ts", "st"]) == [["st", "ts", "ts"]]', expected: 'True' },
      { name: 'Case 6 · Empty List Boundary', input: 'assert group_anagrams([]) == []', expected: 'True' },
    ],
  },
  py_06_top_k_frequent_events: {
    visible: [
      { name: 'Case 1 · Canonical Frequencies', input: 'assert sorted(top_k_frequent([1, 1, 1, 2, 2, 3], 2)) == [1, 2]', expected: 'True' },
      { name: 'Case 2 · Single Distinct Element', input: 'assert top_k_frequent([7], 1) == [7]', expected: 'True' },
      { name: 'Case 3 · String Event Keys', input: 'assert sorted(top_k_frequent(["u1", "u2", "u1", "u3", "u2", "u1"], 2)) == ["u1", "u2"]', expected: 'True' },
      { name: 'Case 4 · Skewed Heavy Hitter', input: 'assert top_k_frequent(["hot"] * 10 + ["cold", "warm"], 1) == ["hot"]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · K Equals All Unique Items', input: 'assert sorted(top_k_frequent(["a", "b", "c"], 3)) == ["a", "b", "c"]', expected: 'True' },
      { name: 'Case 6 · Empty Input Safe', input: 'assert top_k_frequent([], 2) == []', expected: 'True' },
    ],
  },
  py_07_two_pointers_dedup_sorted: {
    visible: [
      { name: 'Case 1 · Overlapping Sorted Arrays', input: 'assert merge_unique([1, 2, 2, 5], [2, 3, 5, 7]) == [1, 2, 3, 5, 7]', expected: 'True' },
      { name: 'Case 2 · Internal Duplicates Only', input: 'assert merge_unique([1, 1, 1], [1, 1]) == [1]', expected: 'True' },
      { name: 'Case 3 · One Empty Partition', input: 'assert merge_unique([], [4, 4, 8]) == [4, 8]', expected: 'True' },
      { name: 'Case 4 · Disjoint Ascending Ranges', input: 'assert merge_unique([1, 2], [3, 4]) == [1, 2, 3, 4]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Negative & Zero Offsets', input: 'assert merge_unique([-5, -1, 0], [-1, 0, 2]) == [-5, -1, 0, 2]', expected: 'True' },
      { name: 'Case 6 · Both Empty', input: 'assert merge_unique([], []) == []', expected: 'True' },
    ],
  },
  py_08_sliding_window_rate_limiter: {
    visible: [
      { name: 'Case 1 · Standard Sliding Max', input: 'assert max_window_sum([100, 200, 300, 400], 2) == 700', expected: 'True' },
      { name: 'Case 2 · Spike In Middle Window', input: 'assert max_window_sum([1, 4, 2, 10, 2, 3, 1], 4) == 18', expected: 'True' },
      { name: 'Case 3 · K Greater Than Array', input: 'assert max_window_sum([5, 6], 5) == 0', expected: 'True' },
      { name: 'Case 4 · K Equals Array Length', input: 'assert max_window_sum([3, 7, 2], 3) == 12', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · K <= 0 Guard', input: 'assert max_window_sum([1, 2, 3], 0) == 0 and max_window_sum([], 2) == 0', expected: 'True' },
      { name: 'Case 6 · Single Element K=1', input: 'assert max_window_sum([2, 9, 4], 1) == 9', expected: 'True' },
    ],
  },
  py_09_sliding_window_longest_unique: {
    visible: [
      { name: 'Case 1 · Repeated Prefix Reset', input: 'assert length_of_longest_substring("abcabcbb") == 3', expected: 'True' },
      { name: 'Case 2 · All Identical Characters', input: 'assert length_of_longest_substring("bbbbb") == 1', expected: 'True' },
      { name: 'Case 3 · Substring vs Subsequence', input: 'assert length_of_longest_substring("pwwkew") == 3', expected: 'True' },
      { name: 'Case 4 · Overlapping Pointer Safety', input: 'assert length_of_longest_substring("abba") == 2', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty String Boundary', input: 'assert length_of_longest_substring("") == 0', expected: 'True' },
      { name: 'Case 6 · All Distinct Characters', input: 'assert length_of_longest_substring("abcdef") == 6', expected: 'True' },
    ],
  },
  py_10_stack_valid_sql_parens: {
    visible: [
      { name: 'Case 1 · Nested SQL & JSON Brackets', input: 'assert is_valid_brackets("SELECT (a + [b]) FROM {tbl}") is True', expected: 'True' },
      { name: 'Case 2 · Crossed Order Rejected', input: 'assert is_valid_brackets("([)]") is False', expected: 'True' },
      { name: 'Case 3 · Unclosed Opening Bracket', input: 'assert is_valid_brackets("((())") is False', expected: 'True' },
      { name: 'Case 4 · Trailing Extra Closer', input: 'assert is_valid_brackets("()[]}") is False', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty String Valid', input: 'assert is_valid_brackets("") is True', expected: 'True' },
      { name: 'Case 6 · Deep Symmetric Nesting', input: 'assert is_valid_brackets("{[(()[])]}") is True', expected: 'True' },
    ],
  },
  py_11_binary_search_partition_offset: {
    visible: [
      { name: 'Case 1 · Exact Timestamp Match', input: 'assert lower_bound_ts([10, 20, 20, 35, 50], 20) == 1', expected: 'True' },
      { name: 'Case 2 · Ceiling Between Gaps', input: 'assert lower_bound_ts([10, 20, 35, 50], 25) == 2', expected: 'True' },
      { name: 'Case 3 · Target Beyond Max Returns -1', input: 'assert lower_bound_ts([10, 20, 35], 99) == -1', expected: 'True' },
      { name: 'Case 4 · Target Smaller Than First', input: 'assert lower_bound_ts([10, 20, 35], 1) == 0', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty Log Offset Partition', input: 'assert lower_bound_ts([], 10) == -1', expected: 'True' },
      { name: 'Case 6 · All Duplicate Targets First Index', input: 'assert lower_bound_ts([5, 5, 5, 5], 5) == 0', expected: 'True' },
    ],
  },
  py_12_heap_k_way_merge: {
    visible: [
      { name: 'Case 1 · K-Way Timestamp Merge', input: 'assert merge_k_sorted([[(1, "a"), (4, "b")], [(2, "c"), (3, "d")]]) == [(1, "a"), (2, "c"), (3, "d"), (4, "b")]', expected: 'True' },
      { name: 'Case 2 · Empty Partition Mixed In', input: 'assert merge_k_sorted([[], [(5, "x")], []]) == [(5, "x")]', expected: 'True' },
      { name: 'Case 3 · Tie-Break By Event ID', input: 'assert merge_k_sorted([[(10, "b")], [(10, "a")]]) == [(10, "a"), (10, "b")]', expected: 'True' },
      { name: 'Case 4 · Three Streams Unequal Length', input: 'assert merge_k_sorted([[(1, "1")], [(2, "2"), (8, "8")], [(3, "3"), (4, "4"), (9, "9")]]) == [(1,"1"),(2,"2"),(3,"3"),(4,"4"),(8,"8"),(9,"9")]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · All Streams Empty', input: 'assert merge_k_sorted([[], []]) == []', expected: 'True' },
      { name: 'Case 6 · Empty Input List', input: 'assert merge_k_sorted([]) == []', expected: 'True' },
    ],
  },
  py_13_graphs_dag_topo_sort: {
    visible: [
      { name: 'Case 1 · Linear Medallion DAG', input: 'assert topo_order(["bronze", "silver", "gold"], [["bronze", "silver"], ["silver", "gold"]]) == ["bronze", "silver", "gold"]', expected: 'True' },
      { name: 'Case 2 · Cycle Detected Returns Empty', input: 'assert topo_order(["a", "b"], [["a", "b"], ["b", "a"]]) == []', expected: 'True' },
      { name: 'Case 3 · Diamond Dependency DAG', input: 'res = topo_order(["raw", "dim", "fct", "mart"], [["raw", "dim"], ["raw", "fct"], ["dim", "mart"], ["fct", "mart"]]); assert res[0] == "raw" and res[-1] == "mart" and len(res) == 4', expected: 'True' },
      { name: 'Case 4 · Disconnected Independent Models', input: 'assert sorted(topo_order(["m1", "m2", "m3"], [])) == ["m1", "m2", "m3"]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Self-Loop Edge Cycle', input: 'assert topo_order(["t1"], [["t1", "t1"]]) == []', expected: 'True' },
      { name: 'Case 6 · Empty Graph Safe', input: 'assert topo_order([], []) == []', expected: 'True' },
    ],
  },
  py_14_intervals_merge_windows: {
    visible: [
      { name: 'Case 1 · Standard Overlap Coalescing', input: 'assert merge_intervals([[1, 3], [2, 6], [8, 10], [15, 18]]) == [[1, 6], [8, 10], [15, 18]]', expected: 'True' },
      { name: 'Case 2 · Unsorted Touching Boundary', input: 'assert merge_intervals([[4, 5], [1, 4]]) == [[1, 5]]', expected: 'True' },
      { name: 'Case 3 · Completely Contained Subwindow', input: 'assert merge_intervals([[1, 10], [3, 5], [2, 8]]) == [[1, 10]]', expected: 'True' },
      { name: 'Case 4 · Disjoint Windows Unchanged', input: 'assert merge_intervals([[1, 2], [4, 5]]) == [[1, 2], [4, 5]]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Single Interval Identity', input: 'assert merge_intervals([[7, 9]]) == [[7, 9]]', expected: 'True' },
      { name: 'Case 6 · Empty List Boundary', input: 'assert merge_intervals([]) == []', expected: 'True' },
    ],
  },
  py_15_dp_coin_change_min_batches: {
    visible: [
      { name: 'Case 1 · Optimal 3 Batches', input: 'assert min_batches([1, 2, 5], 11) == 3', expected: 'True' },
      { name: 'Case 2 · Unreachable Target Returns -1', input: 'assert min_batches([2], 3) == -1', expected: 'True' },
      { name: 'Case 3 · Zero Target Base Case', input: 'assert min_batches([1, 5], 0) == 0', expected: 'True' },
      { name: 'Case 4 · Greedy Trap Non-Canonical Coins', input: 'assert min_batches([1, 3, 4], 6) == 2', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Single Exact Match', input: 'assert min_batches([64], 64) == 1', expected: 'True' },
      { name: 'Case 6 · Multiple Impossible Factors', input: 'assert min_batches([4, 6], 5) == -1', expected: 'True' },
    ],
  },
  py_16_linked_list_lru_cache: {
    visible: [
      { name: 'Case 1 · Read Refreshes Recency Before Evict', input: 'c = LRUCache(2); c.put(1,1); c.put(2,2); assert c.get(1)==1; c.put(3,3); assert c.get(2)==-1', expected: 'True' },
      { name: 'Case 2 · Overwrite Existing Key Promotion', input: 'c = LRUCache(2); c.put(1,10); c.put(2,20); c.put(1,15); c.put(3,30); assert c.get(2)==-1 and c.get(1)==15', expected: 'True' },
      { name: 'Case 3 · Capacity 1 Rapid Eviction', input: 'c = LRUCache(1); c.put(1,100); c.put(2,200); assert c.get(1)==-1 and c.get(2)==200', expected: 'True' },
      { name: 'Case 4 · Missing Key Returns -1', input: 'c = LRUCache(3); assert c.get(99) == -1', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Sequential Get Promotions', input: 'c = LRUCache(3); c.put(1,1); c.put(2,2); c.put(3,3); c.get(1); c.get(2); c.put(4,4); assert c.get(3)==-1 and c.get(1)==1', expected: 'True' },
      { name: 'Case 6 · Zero Value Stored Correctly', input: 'c = LRUCache(2); c.put(1, 0); assert c.get(1) == 0', expected: 'True' },
    ],
  },
  py_17_trees_lca_lineage: {
    visible: [
      { name: 'Case 1 · Asymmetric Depth Lineage LCA', input: 'assert lca({"root": None, "db": "root", "t1": "db", "t2": "db", "c1": "t1"}, "c1", "t2") == "db"', expected: 'True' },
      { name: 'Case 2 · Node Is Own Ancestor', input: 'assert lca({"root": None, "db": "root", "t1": "db", "c1": "t1"}, "t1", "c1") == "t1"', expected: 'True' },
      { name: 'Case 3 · Root Fallback Common Node', input: 'assert lca({"root": None, "s1": "root", "s2": "root"}, "s1", "s2") == "root"', expected: 'True' },
      { name: 'Case 4 · Same Node Twice', input: 'assert lca({"root": None, "a": "root"}, "a", "a") == "a"', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Deep Column-to-Column Lineage', input: 'p = {"r":None,"d":"r","t":"d","c1":"t","c2":"t","f":"c1"}; assert lca(p, "f", "c2") == "t"', expected: 'True' },
      { name: 'Case 6 · Root With Root Self Query', input: 'assert lca({"root": None}, "root", "root") == "root"', expected: 'True' },
    ],
  },
  py_18_tries_prefix_catalog_search: {
    visible: [
      { name: 'Case 1 · Prefix vs Exact Match', input: 't = Trie(); t.insert("fct_orders"); assert t.starts_with("fct_") and not t.search("fct_") and t.search("fct_orders")', expected: 'True' },
      { name: 'Case 2 · Overlapping Shared Branch', input: 't = Trie(); t.insert("dim_user"); t.insert("dim_users"); assert t.search("dim_user") and t.search("dim_users") and not t.search("dim_u")', expected: 'True' },
      { name: 'Case 3 · Unknown Prefix Returns False', input: 't = Trie(); t.insert("stg_events"); assert not t.starts_with("gold_") and not t.search("gold")', expected: 'True' },
      { name: 'Case 4 · Insert Empty String Edge', input: 't = Trie(); t.insert(""); assert t.search("") and t.starts_with("")', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Short Word Under Long Word', input: 't = Trie(); t.insert("orders_v2"); assert not t.search("orders"); t.insert("orders"); assert t.search("orders")', expected: 'True' },
      { name: 'Case 6 · Multiple Independent Roots', input: 't = Trie(); t.insert("raw_a"); t.insert("mart_b"); assert t.starts_with("raw") and t.starts_with("mart")', expected: 'True' },
    ],
  },
  py_19_graphs_union_find_clusters: {
    visible: [
      { name: 'Case 1 · Two Disjoint Components', input: 'assert count_entities(5, [[0,1],[1,2],[3,4]]) == 2', expected: 'True' },
      { name: 'Case 2 · Fully Merged Single Graph', input: 'assert count_entities(4, [[0,1],[1,2],[2,3]]) == 1', expected: 'True' },
      { name: 'Case 3 · Redundant Cycle Edges Ignored', input: 'assert count_entities(3, [[0,1],[1,2],[0,2]]) == 1', expected: 'True' },
      { name: 'Case 4 · Zero Edges All Singletons', input: 'assert count_entities(4, []) == 4', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Self-Loop Edge Neutral', input: 'assert count_entities(2, [[0,0],[1,1]]) == 2', expected: 'True' },
      { name: 'Case 6 · Transitive Chain Collapse', input: 'assert count_entities(6, [[5,4],[3,4],[2,3],[1,2],[0,1]]) == 1', expected: 'True' },
    ],
  },
  py_20_adv_graphs_dijkstra_routing: {
    visible: [
      { name: 'Case 1 · Shorter Multi-Hop Beats Direct', input: 'assert shortest_latency({"a":[("b",4),("c",1)], "c":[("b",2)], "b":[("d",3)]}, "a", "d") == 6', expected: 'True' },
      { name: 'Case 2 · Unreachable Target Returns -1', input: 'assert shortest_latency({"a":[("b",2)], "c":[]}, "a", "c") == -1', expected: 'True' },
      { name: 'Case 3 · Zero Distance Source == Dest', input: 'assert shortest_latency({"a":[("b",5)]}, "a", "a") == 0', expected: 'True' },
      { name: 'Case 4 · Graph With Cycle Chooses Shortest', input: 'assert shortest_latency({"a":[("b",1)], "b":[("a",1),("c",2)]}, "a", "c") == 3', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Multiple Parallel Edges', input: 'assert shortest_latency({"s":[("t",10),("t",3)]}, "s", "t") == 3', expected: 'True' },
      { name: 'Case 6 · Zero Weight Zero-Hop Edge', input: 'assert shortest_latency({"s":[("m",0)], "m":[("t",4)]}, "s", "t") == 4', expected: 'True' },
    ],
  },
  py_21_backtracking_partition_subsets: {
    visible: [
      { name: 'Case 1 · Power Set Two Items', input: 'assert subsets([1, 2]) == [[], [1], [1, 2], [2]]', expected: 'True' },
      { name: 'Case 2 · Single Element Partition', input: 'assert subsets([9]) == [[], [9]]', expected: 'True' },
      { name: 'Case 3 · Power Set Count 2^3', input: 'assert len(subsets([1, 2, 3])) == 8', expected: 'True' },
      { name: 'Case 4 · Empty Set Returns [[]]', input: 'assert subsets([]) == [[]]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · String Column Keys', input: 'assert subsets(["dt", "region"]) == [[], ["dt"], ["dt", "region"], ["region"]]', expected: 'True' },
      { name: 'Case 6 · Four Items Length 16', input: 'assert len(subsets([1, 2, 3, 4])) == 16', expected: 'True' },
    ],
  },
  py_22_greedy_meeting_rooms_min_executors: {
    visible: [
      { name: 'Case 1 · Concurrent Overlap Needs 2', input: 'assert min_executors([[0, 30], [5, 10], [15, 20]]) == 2', expected: 'True' },
      { name: 'Case 2 · Touching End==Start Reuses Slot', input: 'assert min_executors([[0, 10], [10, 20], [20, 30]]) == 1', expected: 'True' },
      { name: 'Case 3 · All Overlapping Needs N', input: 'assert min_executors([[1, 10], [2, 10], [3, 10]]) == 3', expected: 'True' },
      { name: 'Case 4 · Unsorted Start Windows', input: 'assert min_executors([[15, 25], [0, 20], [5, 10]]) == 2', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty Schedule Needs 0', input: 'assert min_executors([]) == 0', expected: 'True' },
      { name: 'Case 6 · Single Job Needs 1', input: 'assert min_executors([[4, 9]]) == 1', expected: 'True' },
    ],
  },
  py_23_bit_manipulation_bloom_mask: {
    visible: [
      { name: 'Case 1 · Canonical Binary Mask', input: 'assert count_set_bits(0b101101) == 4', expected: 'True' },
      { name: 'Case 2 · Zero Empty Filter', input: 'assert count_set_bits(0) == 0', expected: 'True' },
      { name: 'Case 3 · Power of Two Single Bit', input: 'assert count_set_bits(1024) == 1', expected: 'True' },
      { name: 'Case 4 · Full Byte All Ones', input: 'assert count_set_bits(255) == 8', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · 32-Bit Full Word', input: 'assert count_set_bits(0xFFFFFFFF) == 32', expected: 'True' },
      { name: 'Case 6 · Large Sparse 64-Bit Flag', input: 'assert count_set_bits((1 << 40) | (1 << 3) | 1) == 3', expected: 'True' },
    ],
  },
  py_24_binary_search_rotated_array: {
    visible: [
      { name: 'Case 1 · Target In Right Pivot Segment', input: 'assert search_rotated([4,5,6,7,0,1,2], 0) == 4', expected: 'True' },
      { name: 'Case 2 · Target Missing Returns -1', input: 'assert search_rotated([4,5,6,7,0,1,2], 3) == -1', expected: 'True' },
      { name: 'Case 3 · Target In Left Sorted Segment', input: 'assert search_rotated([4,5,6,7,0,1,2], 5) == 1', expected: 'True' },
      { name: 'Case 4 · Unrotated Sorted Array', input: 'assert search_rotated([1,2,3,4,5], 4) == 3', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Single Element Match & Miss', input: 'assert search_rotated([1], 1) == 0 and search_rotated([1], 0) == -1', expected: 'True' },
      { name: 'Case 6 · Two-Element Rotated Pivot', input: 'assert search_rotated([3, 1], 1) == 1 and search_rotated([3, 1], 3) == 0', expected: 'True' },
    ],
  },
  py_25_stack_monotonic_next_peak: {
    visible: [
      { name: 'Case 1 · Canonical Monotonic Wait Days', input: 'assert days_until_spike([73,74,75,71,69,72,76,73]) == [1,1,4,2,1,1,0,0]', expected: 'True' },
      { name: 'Case 2 · Strictly Decreasing Never Spikes', input: 'assert days_until_spike([90, 80, 70]) == [0, 0, 0]', expected: 'True' },
      { name: 'Case 3 · Flat Equal Values Need Strictly Greater', input: 'assert days_until_spike([50, 50, 51]) == [2, 1, 0]', expected: 'True' },
      { name: 'Case 4 · Strictly Increasing', input: 'assert days_until_spike([10, 20, 30]) == [1, 1, 0]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Single Day Metric', input: 'assert days_until_spike([42]) == [0]', expected: 'True' },
      { name: 'Case 6 · Empty Series Safe', input: 'assert days_until_spike([]) == []', expected: 'True' },
    ],
  },
  py_26_dp_2d_edit_distance_schema: {
    visible: [
      { name: 'Case 1 · Column Name Expansion', input: 'assert min_distance("cust_id", "customer_id") == 4', expected: 'True' },
      { name: 'Case 2 · Canonical Transform Distance', input: 'assert min_distance("horse", "ros") == 3', expected: 'True' },
      { name: 'Case 3 · Identical Column Names Cost 0', input: 'assert min_distance("event_ts", "event_ts") == 0', expected: 'True' },
      { name: 'Case 4 · Empty Source String Insert All', input: 'assert min_distance("", "abc") == 3', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty Target String Delete All', input: 'assert min_distance("xyz", "") == 3', expected: 'True' },
      { name: 'Case 6 · Both Empty Strings', input: 'assert min_distance("", "") == 0', expected: 'True' },
    ],
  },
  py_27_heap_running_median_stream: {
    visible: [
      { name: 'Case 1 · Even & Odd Stream Median', input: 'mf = MedianFinder(); mf.add_num(10); mf.add_num(20); assert mf.find_median()==15.0; mf.add_num(30); assert mf.find_median()==20.0', expected: 'True' },
      { name: 'Case 2 · Out-of-Order Negative Values', input: 'mf = MedianFinder(); mf.add_num(-1); assert mf.find_median()==-1.0; mf.add_num(-2); assert mf.find_median()==-1.5; mf.add_num(-3); assert mf.find_median()==-2.0', expected: 'True' },
      { name: 'Case 3 · Duplicate Numbers Stability', input: 'mf = MedianFinder(); mf.add_num(5); mf.add_num(5); mf.add_num(5); assert mf.find_median()==5.0', expected: 'True' },
      { name: 'Case 4 · Decreasing Insertion Order', input: 'mf = MedianFinder(); mf.add_num(100); mf.add_num(50); mf.add_num(10); mf.add_num(1); assert mf.find_median()==30.0', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Single Observation', input: 'mf = MedianFinder(); mf.add_num(7); assert mf.find_median()==7.0', expected: 'True' },
      { name: 'Case 6 · Zero Latency Boundary', input: 'mf = MedianFinder(); mf.add_num(0); mf.add_num(0); assert mf.find_median()==0.0', expected: 'True' },
    ],
  },
  py_28_two_pointers_3sum_zero: {
    visible: [
      { name: 'Case 1 · Canonical Triplets Deduped', input: 'assert three_sum([-1,0,1,2,-1,-4]) == [[-1,-1,2],[-1,0,1]]', expected: 'True' },
      { name: 'Case 2 · All Zeros Unique Triplet', input: 'assert three_sum([0, 0, 0, 0]) == [[0, 0, 0]]', expected: 'True' },
      { name: 'Case 3 · No Zero-Sum Triplet', input: 'assert three_sum([0, 1, 1]) == []', expected: 'True' },
      { name: 'Case 4 · Multiple Duplicates Skip', input: 'assert three_sum([-2, 0, 0, 2, 2]) == [[-2, 0, 2]]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Fewer Than 3 Elements', input: 'assert three_sum([]) == [] and three_sum([1, -1]) == []', expected: 'True' },
      { name: 'Case 6 · Symmetric Large Pairs', input: 'assert three_sum([-4,-2,-2,-2,0,1,2,2,2,3,3,4,4,6,6]) == [[-4,-2,6],[-4,0,4],[-4,1,3],[-4,2,2],[-2,-2,4],[-2,0,2]]', expected: 'True' },
    ],
  },
  py_29_trees_validate_bst_ranges: {
    visible: [
      { name: 'Case 1 · Valid Balanced BST', input: 'assert is_valid_bst({"val": 5, "left": {"val": 3}, "right": {"val": 8}}) is True', expected: 'True' },
      { name: 'Case 2 · Subtree Ancestor Bound Violation', input: 'assert is_valid_bst({"val": 5, "left": {"val": 1}, "right": {"val": 6, "left": {"val": 3}, "right": {"val": 7}}}) is False', expected: 'True' },
      { name: 'Case 3 · Duplicate Key Rejected Strictly', input: 'assert is_valid_bst({"val": 2, "left": {"val": 2}}) is False', expected: 'True' },
      { name: 'Case 4 · Empty Tree Is Valid BST', input: 'assert is_valid_bst(None) is True', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Single Node Leaf', input: 'assert is_valid_bst({"val": 42}) is True', expected: 'True' },
      { name: 'Case 6 · Negative Infinity Left Child', input: 'assert is_valid_bst({"val": -10, "left": {"val": -20}, "right": {"val": -5}}) is True', expected: 'True' },
    ],
  },
  py_30_arrays_product_except_self: {
    visible: [
      { name: 'Case 1 · Positive Array Prefix*Suffix', input: 'assert product_except_self([1, 2, 3, 4]) == [24, 12, 8, 6]', expected: 'True' },
      { name: 'Case 2 · Single Zero Preserves Its Index', input: 'assert product_except_self([-1, 1, 0, -3, 3]) == [0, 0, 9, 0, 0]', expected: 'True' },
      { name: 'Case 3 · Two Zeros Collapses All', input: 'assert product_except_self([0, 4, 0]) == [0, 0, 0]', expected: 'True' },
      { name: 'Case 4 · Two Elements Swap', input: 'assert product_except_self([5, 9]) == [9, 5]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Negative Odd Count', input: 'assert product_except_self([-2, 3, -4]) == [-12, 8, -6]', expected: 'True' },
      { name: 'Case 6 · All Ones', input: 'assert product_except_self([1, 1, 1, 1]) == [1, 1, 1, 1]', expected: 'True' },
    ],
  },
  py_31_graphs_island_connected_clusters: {
    visible: [
      { name: 'Case 1 · Diagonal Cells Are Separate Clusters', input: 'assert num_clusters([[1,1,0],[0,1,0],[0,0,1]]) == 2', expected: 'True' },
      { name: 'Case 2 · Single Connected Region', input: 'assert num_clusters([[1,1,1],[1,1,1]]) == 1', expected: 'True' },
      { name: 'Case 3 · All Zero Cells', input: 'assert num_clusters([[0,0],[0,0]]) == 0', expected: 'True' },
      { name: 'Case 4 · Checkerboard Four Isolated', input: 'assert num_clusters([[1,0,1],[0,1,0],[1,0,0]]) == 4', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty Matrix Safe', input: 'assert num_clusters([]) == 0', expected: 'True' },
      { name: 'Case 6 · U-Shaped Winding Island', input: 'assert num_clusters([[1,0,1],[1,0,1],[1,1,1]]) == 1', expected: 'True' },
    ],
  },
  py_32_greedy_jump_partition_reach: {
    visible: [
      { name: 'Case 1 · Reachable vs Dead-End Trap', input: 'assert can_reach_end([2,3,1,1,4]) is True and can_reach_end([3,2,1,0,4]) is False', expected: 'True' },
      { name: 'Case 2 · Single Zero Already At End', input: 'assert can_reach_end([0]) is True', expected: 'True' },
      { name: 'Case 3 · Immediate Zero Blocker', input: 'assert can_reach_end([0, 2, 3]) is False', expected: 'True' },
      { name: 'Case 4 · Exact Boundary Landing', input: 'assert can_reach_end([2, 0, 0]) is True', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Long Single Leap', input: 'assert can_reach_end([5, 0, 0, 0, 0, 0]) is True', expected: 'True' },
      { name: 'Case 6 · Zero Right Before Finish', input: 'assert can_reach_end([1, 1, 0, 1]) is False', expected: 'True' },
    ],
  },
  py_33_python_xml_nested_kv_parser: {
    visible: [
      { name: 'Case 1 · Single Event Extract', input: 'assert parse_xml_events(\'<events><event id="e1"><amt>45</amt></event></events>\') == [{"id": "e1", "amt": 45}]', expected: 'True' },
      { name: 'Case 2 · Multiple Events Preserve Order', input: 'assert parse_xml_events(\'<events><event id="a"><amt>10</amt></event><event id="b"><amt>20</amt></event></events>\') == [{"id":"a","amt":10},{"id":"b","amt":20}]', expected: 'True' },
      { name: 'Case 3 · Missing <amt> Defaults Zero', input: 'assert parse_xml_events(\'<events><event id="e2"></event></events>\') == [{"id": "e2", "amt": 0}]', expected: 'True' },
      { name: 'Case 4 · Empty Events Container', input: 'assert parse_xml_events("<events></events>") == []', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Negative Adjustment Amount', input: 'assert parse_xml_events(\'<events><event id="r1"><amt>-25</amt></event></events>\') == [{"id": "r1", "amt": -25}]', expected: 'True' },
      { name: 'Case 6 · Missing ID Attribute Safe', input: 'assert parse_xml_events("<events><event><amt>9</amt></event></events>") == [{"id": None, "amt": 9}]', expected: 'True' },
    ],
  },
  py_34_dp_house_robber_non_adj: {
    visible: [
      { name: 'Case 1 · Canonical Alternating Maximum', input: 'assert max_non_adjacent([2, 7, 9, 3, 1]) == 12', expected: 'True' },
      { name: 'Case 2 · Skip Adjacent Pair Benefit', input: 'assert max_non_adjacent([2, 1, 1, 2]) == 4', expected: 'True' },
      { name: 'Case 3 · Small Two-Item Choice', input: 'assert max_non_adjacent([5, 9]) == 9', expected: 'True' },
      { name: 'Case 4 · Single Item Base', input: 'assert max_non_adjacent([42]) == 42', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty Input Safe', input: 'assert max_non_adjacent([]) == 0', expected: 'True' },
      { name: 'Case 6 · All Zeros', input: 'assert max_non_adjacent([0, 0, 0]) == 0', expected: 'True' },
    ],
  },
  py_35_sliding_window_token_bucket: {
    visible: [
      { name: 'Case 1 · Sliding Eviction After Window', input: 'assert rate_limit([1, 2, 3, 10], 5, 2) == [True, True, False, True]', expected: 'True' },
      { name: 'Case 2 · Exact Window Boundary Evicts Oldest', input: 'assert rate_limit([1, 2, 6], 5, 2) == [True, True, True]', expected: 'True' },
      { name: 'Case 3 · Burst At Same Timestamp', input: 'assert rate_limit([5, 5, 5], 10, 1) == [True, False, False]', expected: 'True' },
      { name: 'Case 4 · Empty Timestamp Stream', input: 'assert rate_limit([], 5, 2) == []', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Zero Limit Blocks All', input: 'assert rate_limit([1, 2], 5, 0) == [False, False]', expected: 'True' },
      { name: 'Case 6 · Rejected Event Does Not Enter Window', input: 'assert rate_limit([1, 2, 3, 6], 5, 2) == [True, True, False, True]', expected: 'True' },
    ],
  },
  py_36_linked_list_detect_cycle: {
    visible: [
      { name: 'Case 1 · Cycle vs Linear Chain', input: 'assert has_cycle({1:2, 2:3, 3:1}, 1) is True and has_cycle({1:2, 2:3}, 1) is False', expected: 'True' },
      { name: 'Case 2 · Self-Loop Edge', input: 'assert has_cycle({1:1}, 1) is True', expected: 'True' },
      { name: 'Case 3 · Rho-Shaped Stem Into Cycle', input: 'assert has_cycle({1:2, 2:3, 3:4, 4:2}, 1) is True', expected: 'True' },
      { name: 'Case 4 · Single Isolated Node', input: 'assert has_cycle({}, 1) is False', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Disconnected Cycle Does Not Trigger', input: 'assert has_cycle({1:2, 9:10, 10:9}, 1) is False', expected: 'True' },
      { name: 'Case 6 · None Head Boundary', input: 'assert has_cycle({1:2}, None) is False', expected: 'True' },
    ],
  },
  py_37_trees_level_order_bfs: {
    visible: [
      { name: 'Case 1 · Two-Level Tree', input: 'assert level_order({"val":1,"left":{"val":2},"right":{"val":3}}) == [[1],[2,3]]', expected: 'True' },
      { name: 'Case 2 · Left-Skewed Unbalanced Tree', input: 'assert level_order({"val":1,"left":{"val":2,"left":{"val":3}}}) == [[1],[2],[3]]', expected: 'True' },
      { name: 'Case 3 · Single Root Node', input: 'assert level_order({"val":99}) == [[99]]', expected: 'True' },
      { name: 'Case 4 · Empty Tree None', input: 'assert level_order(None) == []', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Three-Level Mixed Children', input: 'assert level_order({"val":1,"left":{"val":2,"right":{"val":4}},"right":{"val":3,"left":{"val":5}}}) == [[1],[2,3],[4,5]]', expected: 'True' },
      { name: 'Case 6 · Zero Root Value', input: 'assert level_order({"val":0}) == [[0]]', expected: 'True' },
    ],
  },
  py_38_backtracking_combination_sum: {
    visible: [
      { name: 'Case 1 · Reuse Candidates Multiple Times', input: 'assert combination_sum([2,3,6,7], 7) == [[2,2,3],[7]]', expected: 'True' },
      { name: 'Case 2 · Unsorted Candidates Ordered', input: 'assert combination_sum([5,3,2], 8) == [[2,2,2,2],[2,3,3],[3,5]]', expected: 'True' },
      { name: 'Case 3 · Impossible Target Returns []', input: 'assert combination_sum([4,6], 5) == []', expected: 'True' },
      { name: 'Case 4 · Zero Target Single Empty Combo', input: 'assert combination_sum([2,3], 0) == [[]]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Single Candidate Multiple', input: 'assert combination_sum([3], 9) == [[3,3,3]]', expected: 'True' },
      { name: 'Case 6 · Target Smaller Than All', input: 'assert combination_sum([5, 10], 3) == []', expected: 'True' },
    ],
  },
  py_39_intervals_non_overlapping_erase: {
    visible: [
      { name: 'Case 1 · Drop One Overlapping Interval', input: 'assert erase_overlap_intervals([[1,2],[2,3],[3,4],[1,3]]) == 1', expected: 'True' },
      { name: 'Case 2 · Identical Intervals Keep Only One', input: 'assert erase_overlap_intervals([[1,2],[1,2],[1,2]]) == 2', expected: 'True' },
      { name: 'Case 3 · Touching Endpoints Zero Drops', input: 'assert erase_overlap_intervals([[1,2],[2,3]]) == 0', expected: 'True' },
      { name: 'Case 4 · Long Container Dropped Early', input: 'assert erase_overlap_intervals([[1,100],[11,22],[1,11],[2,12]]) == 2', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty Interval List', input: 'assert erase_overlap_intervals([]) == 0', expected: 'True' },
      { name: 'Case 6 · Negative Timeline Ranges', input: 'assert erase_overlap_intervals([[-5,-1],[-3,0],[0,2]]) == 1', expected: 'True' },
    ],
  },
  py_40_bit_single_number_xor: {
    visible: [
      { name: 'Case 1 · Odd-Count Survivor', input: 'assert single_number([4, 1, 2, 1, 2]) == 4', expected: 'True' },
      { name: 'Case 2 · Single Element Array', input: 'assert single_number([77]) == 77', expected: 'True' },
      { name: 'Case 3 · Negative Partition IDs', input: 'assert single_number([-3, 9, -3]) == 9', expected: 'True' },
      { name: 'Case 4 · Zero Survivor', input: 'assert single_number([8, 0, 8]) == 0', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Large Integer Pairings', input: 'assert single_number([100001, 55, 100001]) == 55', expected: 'True' },
      { name: 'Case 6 · Empty Stream Identity Zero', input: 'assert single_number([]) == 0', expected: 'True' },
    ],
  },
  py_41_python_hll_cardinality_sketch: {
    visible: [
      { name: 'Case 1 · Above 50% Heavy Hitter', input: 'assert heavy_hitters(["k1","k1","k1","k2","k3"], 0.5) == ["k1"]', expected: 'True' },
      { name: 'Case 2 · Multiple Qualifiers Sorted', input: 'assert heavy_hitters(["b","a","b","a","c"], 0.3) == ["a", "b"]', expected: 'True' },
      { name: 'Case 3 · Exact Threshold Inclusive', input: 'assert heavy_hitters(["x","y"], 0.5) == ["x", "y"]', expected: 'True' },
      { name: 'Case 4 · No Heavy Hitter Found', input: 'assert heavy_hitters(["a","b","c","d"], 0.5) == []', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty Event Stream Safe', input: 'assert heavy_hitters([], 0.25) == []', expected: 'True' },
      { name: 'Case 6 · 100% Monopoly Threshold', input: 'assert heavy_hitters(["only","only"], 1.0) == ["only"]', expected: 'True' },
    ],
  },
  py_42_adv_graphs_longest_dag_path: {
    visible: [
      { name: 'Case 1 · Diamond Critical Path 12', input: 'assert critical_path_duration({"a":3,"b":5,"c":2,"d":4}, [("a","b"),("a","c"),("b","d"),("c","d")]) == 12', expected: 'True' },
      { name: 'Case 2 · Disconnected Components Picks Max', input: 'assert critical_path_duration({"x":10,"y":2,"z":3}, [("y","z")]) == 10', expected: 'True' },
      { name: 'Case 3 · Single Task No Edges', input: 'assert critical_path_duration({"solo": 15}, []) == 15', expected: 'True' },
      { name: 'Case 4 · Linear Pipeline Chain', input: 'assert critical_path_duration({"e":2,"t":4,"l":6}, [("e","t"),("t","l")]) == 12', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty DAG Safe', input: 'assert critical_path_duration({}, []) == 0', expected: 'True' },
      { name: 'Case 6 · Zero-Duration Barrier Node', input: 'assert critical_path_duration({"a":5,"b":0,"c":7}, [("a","b"),("b","c")]) == 12', expected: 'True' },
    ],
  },
  de_01_pyspark_skew_salting: {
    visible: [
      { name: 'Case 1 · Hot Key Spread Across 4 Buckets', input: 'sf, ed = salt_fact_and_dim([{"merchant_id":"hot_1"}]*4, [{"merchant_id":"hot_1","tier":"gold"}], 4); assert len({r["salted_key"] for r in sf}) == 4 and len(ed) == 4', expected: 'True' },
      { name: 'Case 2 · Preserves Original Attributes', input: 'sf, ed = salt_fact_and_dim([{"merchant_id":"m1","amt":50}], [{"merchant_id":"m1","tier":"s"}], 2); assert sf[0]["amt"] == 50 and len(ed) == 2', expected: 'True' },
      { name: 'Case 3 · Multiple Dim Keys Multiplied', input: 'sf, ed = salt_fact_and_dim([{"merchant_id":"a"}], [{"merchant_id":"a"},{"merchant_id":"b"}], 3); assert len(ed) == 6', expected: 'True' },
      { name: 'Case 4 · Joinable Key Overlap Guaranteed', input: 'sf, ed = salt_fact_and_dim([{"merchant_id":"m1"}]*3, [{"merchant_id":"m1"}], 3); assert {r["salted_key"] for r in sf}.issubset({d["salted_key"] for d in ed})', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty Fact & Dim Boundary', input: 'sf, ed = salt_fact_and_dim([], [], 4); assert sf == [] and ed == []', expected: 'True' },
      { name: 'Case 6 · Salt Bucket 1 Identity Pass', input: 'sf, ed = salt_fact_and_dim([{"merchant_id":"x"}], [{"merchant_id":"x"}], 1); assert sf[0]["salted_key"] == "x_0" and ed[0]["salted_key"] == "x_0"', expected: 'True' },
    ],
  },
  de_02_scd_type2_merge_engine: {
    visible: [
      { name: 'Case 1 · Attribute Change Expires Old Row', input: 'res = apply_scd2([{"id":1,"tier":"free","valid_from":"2026-01-01","valid_to":"9999-12-31","is_current":True}], [{"id":1,"tier":"pro"}], "2026-02-01"); assert len(res)==2 and not res[0]["is_current"] and res[1]["valid_from"]=="2026-02-01"', expected: 'True' },
      { name: 'Case 2 · No-Op Identical Tier Skipped', input: 'res = apply_scd2([{"id":1,"tier":"pro","valid_from":"2026-01-01","valid_to":"9999-12-31","is_current":True}], [{"id":1,"tier":"pro"}], "2026-02-01"); assert len(res)==1 and res[0]["is_current"] is True', expected: 'True' },
      { name: 'Case 3 · New Customer Brand New Open Row', input: 'res = apply_scd2([], [{"id":42,"tier":"vip"}], "2026-03-01"); assert len(res)==1 and res[0]["valid_to"]=="9999-12-31" and res[0]["is_current"]', expected: 'True' },
      { name: 'Case 4 · Historical Closed Rows Untouched', input: 'res = apply_scd2([{"id":1,"tier":"free","valid_from":"2025-01-01","valid_to":"2026-01-01","is_current":False},{"id":1,"tier":"plus","valid_from":"2026-01-01","valid_to":"9999-12-31","is_current":True}], [{"id":1,"tier":"ent"}], "2026-04-01"); assert res[0]["valid_to"]=="2026-01-01" and len(res)==3', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Mixed Insert + Update Batch', input: 'res = apply_scd2([{"id":1,"tier":"free","valid_from":"2026-01-01","valid_to":"9999-12-31","is_current":True}], [{"id":1,"tier":"pro"},{"id":2,"tier":"free"}], "2026-02-01"); assert len(res)==3 and sum(1 for r in res if r["is_current"])==2', expected: 'True' },
      { name: 'Case 6 · Empty Incoming Batch Preserves State', input: 'res = apply_scd2([{"id":1,"tier":"free","valid_from":"2026-01-01","valid_to":"9999-12-31","is_current":True}], [], "2026-02-01"); assert len(res)==1', expected: 'True' },
    ],
  },
  de_03_spark_dataframe_etl: {
    visible: [
      { name: 'Case 1 · Filter >100 Keeps Two Orders', input: 'sp = SparkSession.builder.appName("t").getOrCreate(); assert transform_orders(sp, [{"id":1,"amount":50},{"id":2,"amount":200},{"id":3,"amount":150}]) == 2', expected: 'True' },
      { name: 'Case 2 · Boundary Amount == 100 Excluded', input: 'sp = SparkSession.builder.appName("t").getOrCreate(); assert transform_orders(sp, [{"id":1,"amount":100},{"id":2,"amount":101}]) == 1', expected: 'True' },
      { name: 'Case 3 · None Amount Does Not Crash', input: 'sp = SparkSession.builder.appName("t").getOrCreate(); assert transform_orders(sp, [{"id":1,"amount":None},{"id":2,"amount":500}]) == 1', expected: 'True' },
      { name: 'Case 4 · All Filtered Out Returns 0', input: 'sp = SparkSession.builder.appName("t").getOrCreate(); assert transform_orders(sp, [{"id":1,"amount":10}]) == 0', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty Input DataFrame', input: 'sp = SparkSession.builder.appName("t").getOrCreate(); assert transform_orders(sp, []) == 0', expected: 'True' },
      { name: 'Case 6 · Large High-Value Batch', input: 'sp = SparkSession.builder.appName("t").getOrCreate(); assert transform_orders(sp, [{"id":i,"amount":i*50} for i in range(6)]) == 3', expected: 'True' },
    ],
  },
  de_04_cdc_watermark_incremental: {
    visible: [
      { name: 'Case 1 · Deduplicate Lookback & Advance Watermark', input: 'batch, wm = incremental_ingest([{"event_id":1,"event_ts":95,"updated_at":1},{"event_id":1,"event_ts":95,"updated_at":3},{"event_id":2,"event_ts":110,"updated_at":2}], 100, 10); assert len(batch)==2 and batch[0]["updated_at"]==3 and wm==110', expected: 'True' },
      { name: 'Case 2 · Drop Events Older Than Cutoff', input: 'batch, wm = incremental_ingest([{"event_id":1,"event_ts":80,"updated_at":1}], 100, 10); assert batch == [] and wm == 100', expected: 'True' },
      { name: 'Case 3 · Cutoff Boundary Strictly Greater', input: 'batch, wm = incremental_ingest([{"event_id":1,"event_ts":90,"updated_at":1}], 100, 10); assert batch == []', expected: 'True' },
      { name: 'Case 4 · Empty Source Preserves Prior Watermark', input: 'batch, wm = incremental_ingest([], 500, 30); assert batch == [] and wm == 500', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Deterministic Sort By Event ID', input: 'batch, wm = incremental_ingest([{"event_id":9,"event_ts":105,"updated_at":1},{"event_id":2,"event_ts":105,"updated_at":1}], 100, 10); assert [r["event_id"] for r in batch] == [2, 9]', expected: 'True' },
      { name: 'Case 6 · Out-of-Order Updated_At Resolution', input: 'batch, _ = incremental_ingest([{"event_id":5,"event_ts":105,"updated_at":9},{"event_id":5,"event_ts":105,"updated_at":2}], 100, 10); assert batch[0]["updated_at"] == 9', expected: 'True' },
    ],
  },
  de_05_data_quality_contract_validator: {
    visible: [
      { name: 'Case 1 · Catch Null PK & Negative Range', input: 'res = validate_contract([{"id":1,"amt":50},{"id":None,"amt":-5}], ["id","amt"], ["id"], {"amt":(0,1000)}); assert not res["passed"] and len(res["errors"])==2', expected: 'True' },
      { name: 'Case 2 · Valid Batch Clean Pass', input: 'res = validate_contract([{"id":1,"amt":0},{"id":2,"amt":1000}], ["id","amt"], ["id"], {"amt":(0,1000)}); assert res["passed"] and res["errors"] == []', expected: 'True' },
      { name: 'Case 3 · Missing Required Column Flagged', input: 'res = validate_contract([{"id":1}], ["id","amt"], ["id"], {}); assert not res["passed"] and "missing amt" in res["errors"][0]', expected: 'True' },
      { name: 'Case 4 · Optional Range Null Allowed When Not In Non-Null', input: 'res = validate_contract([{"id":1,"amt":None}], ["id","amt"], ["id"], {"amt":(0,100)}); assert res["passed"]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Upper Bound Exceeded Flagged', input: 'res = validate_contract([{"id":1,"amt":1001}], ["id","amt"], ["id"], {"amt":(0,1000)}); assert not res["passed"]', expected: 'True' },
      { name: 'Case 6 · Empty Batch Passes Contract', input: 'res = validate_contract([], ["id"], ["id"], {}); assert res["passed"]', expected: 'True' },
    ],
  },
  de_06_schema_evolution_compat: {
    visible: [
      { name: 'Case 1 · Optional Addition Safe vs Required Rejected', input: 'assert is_backward_compatible({"id":{"type":"long","has_default":False}}, {"id":{"type":"long","has_default":False},"src":{"type":"string","has_default":True}}) is True and is_backward_compatible({"id":{"type":"long","has_default":False}}, {"id":{"type":"long","has_default":False},"req":{"type":"string","has_default":False}}) is False', expected: 'True' },
      { name: 'Case 2 · Field Type Change Rejected', input: 'assert is_backward_compatible({"amt":{"type":"int","has_default":False}}, {"amt":{"type":"string","has_default":False}}) is False', expected: 'True' },
      { name: 'Case 3 · Optional Field Removal Allowed', input: 'assert is_backward_compatible({"id":{"type":"long","has_default":False},"legacy":{"type":"string","has_default":True}}, {"id":{"type":"long","has_default":False}}) is True', expected: 'True' },
      { name: 'Case 4 · Identical Schema Compatible', input: 'assert is_backward_compatible({"a":{"type":"int"}}, {"a":{"type":"int"}}) is True', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Multiple New Columns Mixed Defaults', input: 'assert is_backward_compatible({"id":{"type":"int"}}, {"id":{"type":"int"},"x":{"type":"str","has_default":True},"y":{"type":"str","has_default":False}}) is False', expected: 'True' },
      { name: 'Case 6 · Empty Old Schema All With Defaults', input: 'assert is_backward_compatible({}, {"k":{"type":"str","has_default":True}}) is True', expected: 'True' },
    ],
  },
  de_17_scd_type1_upsert: {
    visible: [
      { name: 'Case 1 · Overwrite City + Insert New ID', input: 'assert scd1_upsert([{"id":1,"city":"BLR"}], [{"id":1,"city":"NYC"},{"id":2,"city":"SFO"}]) == [{"id":1,"city":"NYC"},{"id":2,"city":"SFO"}]', expected: 'True' },
      { name: 'Case 2 · Deterministic Ascending Key Sort', input: 'assert scd1_upsert([{"id":5,"city":"A"}], [{"id":2,"city":"B"}]) == [{"id":2,"city":"B"},{"id":5,"city":"A"}]', expected: 'True' },
      { name: 'Case 3 · Empty Updates Preserves Target', input: 'assert scd1_upsert([{"id":1,"city":"DEL"}], []) == [{"id":1,"city":"DEL"}]', expected: 'True' },
      { name: 'Case 4 · Empty Target Pure Inserts', input: 'assert scd1_upsert([], [{"id":3,"city":"SEA"}]) == [{"id":3,"city":"SEA"}]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Sequential Updates Same Batch Last Wins', input: 'assert scd1_upsert([], [{"id":1,"city":"X"},{"id":1,"city":"Y"}]) == [{"id":1,"city":"Y"}]', expected: 'True' },
      { name: 'Case 6 · Does Not Mutate Caller Dicts', input: 'orig = [{"id":1,"city":"A"}]; _ = scd1_upsert(orig, [{"id":1,"city":"B"}]); assert orig[0]["city"] == "A"', expected: 'True' },
    ],
  },
  de_18_scd_type3_prev_state: {
    visible: [
      { name: 'Case 1 · Shift Current To Previous On Change', input: 'assert scd3_update({"id":1,"region":"APAC","prev_region":None}, "EMEA") == {"id":1,"region":"EMEA","prev_region":"APAC"}', expected: 'True' },
      { name: 'Case 2 · No-Op When Region Unchanged', input: 'assert scd3_update({"id":1,"region":"APAC","prev_region":"US"}, "APAC") == {"id":1,"region":"APAC","prev_region":"US"}', expected: 'True' },
      { name: 'Case 3 · Consecutive Chained Update', input: 'r1 = scd3_update({"id":1,"region":"US","prev_region":None}, "EU"); r2 = scd3_update(r1, "IN"); assert r2 == {"id":1,"region":"IN","prev_region":"EU"}', expected: 'True' },
      { name: 'Case 4 · Non-Mutating Input Row Copy', input: 'row = {"id":2,"region":"US","prev_region":None}; _ = scd3_update(row, "CA"); assert row["region"] == "US"', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Extra Dimension Attributes Preserved', input: 'assert scd3_update({"id":7,"name":"Acme","region":"US","prev_region":None}, "UK")["name"] == "Acme"', expected: 'True' },
      { name: 'Case 6 · Switch Back Restores Previous', input: 'assert scd3_update({"id":1,"region":"EMEA","prev_region":"APAC"}, "APAC") == {"id":1,"region":"APAC","prev_region":"EMEA"}', expected: 'True' },
    ],
  },
  de_19_parquet_predicate_pushdown: {
    visible: [
      { name: 'Case 1 · Skip Non-Overlapping Row Group', input: 'assert prune_row_groups([{"id":0,"min":1,"max":50},{"id":1,"min":51,"max":100}], 75) == [1]', expected: 'True' },
      { name: 'Case 2 · Inclusive Boundary Match', input: 'assert prune_row_groups([{"id":0,"min":1,"max":50},{"id":1,"min":50,"max":100}], 50) == [0, 1]', expected: 'True' },
      { name: 'Case 3 · Target Out Of All Bounds Returns Empty', input: 'assert prune_row_groups([{"id":0,"min":10,"max":20}], 99) == []', expected: 'True' },
      { name: 'Case 4 · Unsorted Overlapping Groups Kept', input: 'assert prune_row_groups([{"id":5,"min":10,"max":80},{"id":6,"min":70,"max":90}], 75) == [5, 6]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty Row Group Metadata', input: 'assert prune_row_groups([], 10) == []', expected: 'True' },
      { name: 'Case 6 · Exact Singleton Min==Max Match', input: 'assert prune_row_groups([{"id":3,"min":42,"max":42}], 42) == [3]', expected: 'True' },
    ],
  },
  de_20_bloom_filter_check: {
    visible: [
      { name: 'Case 1 · Added Key Zero False Negatives', input: 'bf = BloomFilter(128); bf.add("tx_99"); assert bf.might_contain("tx_99")', expected: 'True' },
      { name: 'Case 2 · Empty Bloom Filter Rejects Key', input: 'bf = BloomFilter(128); assert not bf.might_contain("missing_key")', expected: 'True' },
      { name: 'Case 3 · Multiple Distinct Keys Preserved', input: 'bf = BloomFilter(256); keys = ["k1","k2","k3"]; [bf.add(k) for k in keys]; assert all(bf.might_contain(k) for k in keys)', expected: 'True' },
      { name: 'Case 4 · Integer Keys Supported', input: 'bf = BloomFilter(128); bf.add(9001); assert bf.might_contain(9001)', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Idempotent Repeated Insert', input: 'bf = BloomFilter(64); bf.add("a"); bf.add("a"); assert bf.might_contain("a")', expected: 'True' },
      { name: 'Case 6 · Large Filter Low Collision on Unseen', input: 'bf = BloomFilter(4096); bf.add("seen_only"); assert not bf.might_contain("definitely_unseen_item_xyz")', expected: 'True' },
    ],
  },
  de_21_delta_time_travel_log: {
    visible: [
      { name: 'Case 1 · Time Travel Before Remove Commit', input: 'commits = [{"ver":0,"add":["a.pq"],"remove":[]},{"ver":1,"add":["b.pq"],"remove":["a.pq"]}]; assert active_files_at_version(commits, 0) == ["a.pq"]', expected: 'True' },
      { name: 'Case 2 · Version 1 Reflects Tombstone Remove', input: 'commits = [{"ver":0,"add":["a.pq"],"remove":[]},{"ver":1,"add":["b.pq"],"remove":["a.pq"]}]; assert active_files_at_version(commits, 1) == ["b.pq"]', expected: 'True' },
      { name: 'Case 3 · Out-of-Order Commit Log Sorted', input: 'commits = [{"ver":2,"add":["c.pq"],"remove":["a.pq"]},{"ver":0,"add":["a.pq","b.pq"],"remove":[]}]; assert active_files_at_version(commits, 2) == ["b.pq", "c.pq"]', expected: 'True' },
      { name: 'Case 4 · Gap Target Version Stops Correctly', input: 'commits = [{"ver":0,"add":["a.pq"],"remove":[]},{"ver":5,"add":["b.pq"],"remove":[]}]; assert active_files_at_version(commits, 3) == ["a.pq"]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty Commit Log', input: 'assert active_files_at_version([], 10) == []', expected: 'True' },
      { name: 'Case 6 · File Removed Then Re-Added Later', input: 'commits = [{"ver":0,"add":["x.pq"],"remove":[]},{"ver":1,"add":[],"remove":["x.pq"]},{"ver":2,"add":["x.pq"],"remove":[]}]; assert active_files_at_version(commits, 2) == ["x.pq"]', expected: 'True' },
    ],
  },
  de_22_pii_tokenization_mask: {
    visible: [
      { name: 'Case 1 · Preserve Domain & Hide Local Part', input: 'm = mask_email("alice@uber.com"); assert m.endswith("@uber.com") and "alice" not in m', expected: 'True' },
      { name: 'Case 2 · Deterministic For Same Salt', input: 'assert mask_email("bob@stripe.com", "k1") == mask_email("bob@stripe.com", "k1")', expected: 'True' },
      { name: 'Case 3 · Different Salt Changes Token', input: 'assert mask_email("bob@stripe.com", "k1") != mask_email("bob@stripe.com", "k2")', expected: 'True' },
      { name: 'Case 4 · Distinct Users Distinct Tokens', input: 'assert mask_email("u1@x.com") != mask_email("u2@x.com")', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Preserves Fixed 12-Char Prefix', input: 'tok, dom = mask_email("dev@databricks.com").split("@"); assert len(tok) == 12 and dom == "databricks.com"', expected: 'True' },
      { name: 'Case 6 · Multi-@ Local Safe Split Once', input: 'm = mask_email("a.b+tag@sub.corp.io"); assert m.endswith("@sub.corp.io")', expected: 'True' },
    ],
  },
  de_23_dbt_ref_dependency_extractor: {
    visible: [
      { name: 'Case 1 · Extract Single & Double Quoted Refs', input: 'assert extract_dbt_refs("SELECT * FROM {{ ref(\'stg_orders\') }} JOIN {{ ref(\\"dim_users\\") }}") == ["dim_users", "stg_orders"]', expected: 'True' },
      { name: 'Case 2 · Deduplicate Repeated Model Ref', input: 'assert extract_dbt_refs("{{ ref(\'m1\') }} UNION {{ ref(\'m1\') }}") == ["m1"]', expected: 'True' },
      { name: 'Case 3 · Whitespace Inside ref() Ignored', input: 'assert extract_dbt_refs("{{ ref(  \'fct_pay\'  ) }}") == ["fct_pay"]', expected: 'True' },
      { name: 'Case 4 · Raw SQL With Zero Refs', input: 'assert extract_dbt_refs("SELECT * FROM raw.events") == []', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Underscores & Digits Supported', input: 'assert extract_dbt_refs("FROM {{ ref(\'silver_v2_events_2026\') }}") == ["silver_v2_events_2026"]', expected: 'True' },
      { name: 'Case 6 · Multi-Line CTE Query Extraction', input: 'assert extract_dbt_refs("WITH a AS (SELECT * FROM {{ ref(\'s1\') }}) SELECT * FROM {{ ref(\'s2\') }}") == ["s1", "s2"]', expected: 'True' },
    ],
  },
  de_24_spark_catalyst_projection_prune: {
    visible: [
      { name: 'Case 1 · Keep Only Referenced Columns', input: 'assert prune_columns(["id","ts","blob","amt"], ["id","amt"]) == ["id", "amt"]', expected: 'True' },
      { name: 'Case 2 · Preserve Original Schema Order', input: 'assert prune_columns(["a","b","c"], ["c","a"]) == ["a", "c"]', expected: 'True' },
      { name: 'Case 3 · Zero Used Columns', input: 'assert prune_columns(["id","ts"], []) == []', expected: 'True' },
      { name: 'Case 4 · Unknown Columns Ignored Safely', input: 'assert prune_columns(["id","ts"], ["ts","missing"]) == ["ts"]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · All Columns Referenced', input: 'assert prune_columns(["x","y"], ["x","y"]) == ["x", "y"]', expected: 'True' },
      { name: 'Case 6 · Empty Schema Safe', input: 'assert prune_columns([], ["x"]) == []', expected: 'True' },
    ],
  },
  de_25_kafka_consumer_lag_calc: {
    visible: [
      { name: 'Case 1 · Total Lag & Hottest Partition', input: 'assert consumer_lag({0:100, 1:250}, {0:90, 1:100}) == (160, 1)', expected: 'True' },
      { name: 'Case 2 · Missing Committed Defaults To Zero', input: 'assert consumer_lag({0:50, 1:200}, {0:50}) == (200, 1)', expected: 'True' },
      { name: 'Case 3 · Committed Ahead Clamps At Zero', input: 'assert consumer_lag({0:100, 1:120}, {0:150, 1:110}) == (10, 1)', expected: 'True' },
      { name: 'Case 4 · Zero Lag Across All Partitions', input: 'assert consumer_lag({0:50, 1:50}, {0:50, 1:50})[0] == 0', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Single Partition Topic', input: 'assert consumer_lag({0:42}, {0:10}) == (32, 0)', expected: 'True' },
      { name: 'Case 6 · Three Partitions Max Skew', input: 'assert consumer_lag({0:100, 1:100, 2:999}, {0:100, 1:95, 2:0}) == (1004, 2)', expected: 'True' },
    ],
  },
  de_26_exactly_once_idempotency_key: {
    visible: [
      { name: 'Case 1 · Skip Already Committed Key', input: 's = {"k1"}; assert len(sink_exactly_once([{"idempotency_key":"k1"},{"idempotency_key":"k2"}], s)) == 1', expected: 'True' },
      { name: 'Case 2 · Duplicate Keys Within Same Batch', input: 's = set(); res = sink_exactly_once([{"idempotency_key":"x","v":1},{"idempotency_key":"x","v":2}], s); assert len(res)==1 and res[0]["v"]==1', expected: 'True' },
      { name: 'Case 3 · Persists New Keys Into Committed Set', input: 's = set(); sink_exactly_once([{"idempotency_key":"k9"}], s); assert "k9" in s', expected: 'True' },
      { name: 'Case 4 · Empty Batch Safe', input: 's = {"k1"}; assert sink_exactly_once([], s) == []', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Sequential Replay Entirely Skipped', input: 's = set(); b = [{"idempotency_key":"a"},{"idempotency_key":"b"}]; sink_exactly_once(b, s); assert sink_exactly_once(b, s) == []', expected: 'True' },
      { name: 'Case 6 · Preserves Emission Order', input: 'assert [r["idempotency_key"] for r in sink_exactly_once([{"idempotency_key":"z"},{"idempotency_key":"a"}], set())] == ["z","a"]', expected: 'True' },
    ],
  },
  de_27_snowflake_micro_partition_overlap: {
    visible: [
      { name: 'Case 1 · Two Overlapping Partitions Max', input: 'assert max_partition_overlap([(1,10),(5,15),(12,20)]) == 2', expected: 'True' },
      { name: 'Case 2 · Fully Disjoint Clustered Partitions', input: 'assert max_partition_overlap([(1,5),(6,10),(11,15)]) == 1', expected: 'True' },
      { name: 'Case 3 · Inclusive Endpoint Touching [1,5] & [5,9]', input: 'assert max_partition_overlap([(1,5),(5,9)]) == 2', expected: 'True' },
      { name: 'Case 4 · Full Overlap Unclustered Table', input: 'assert max_partition_overlap([(1,100)]*4) == 4', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty Micro-Partition Table', input: 'assert max_partition_overlap([]) == 0', expected: 'True' },
      { name: 'Case 6 · Singleton Range Query', input: 'assert max_partition_overlap([(10,10),(10,20),(5,15)]) == 3', expected: 'True' },
    ],
  },
  de_28_airflow_sla_miss_detector: {
    visible: [
      { name: 'Case 1 · Detects Breached SLA Task', input: 'assert find_sla_misses([{"task_id":"t1","sched":0,"end":120},{"task_id":"t2","sched":0,"end":400}], 300) == ["t2"]', expected: 'True' },
      { name: 'Case 2 · Exact SLA Boundary Passes', input: 'assert find_sla_misses([{"task_id":"t1","sched":100,"end":400}], 300) == []', expected: 'True' },
      { name: 'Case 3 · Multiple Violations Preserve Order', input: 'assert find_sla_misses([{"task_id":"a","sched":0,"end":500},{"task_id":"b","sched":0,"end":50},{"task_id":"c","sched":10,"end":600}], 300) == ["a","c"]', expected: 'True' },
      { name: 'Case 4 · Empty DAG Run History', input: 'assert find_sla_misses([], 300) == []', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Zero-Second Strict SLA', input: 'assert find_sla_misses([{"task_id":"t0","sched":10,"end":11}], 0) == ["t0"]', expected: 'True' },
      { name: 'Case 6 · All Within Budget', input: 'assert find_sla_misses([{"task_id":"t1","sched":50,"end":100}], 100) == []', expected: 'True' },
    ],
  },
  de_29_spark_memory_spill_estimator: {
    visible: [
      { name: 'Case 1 · 4.3GB Heap After 300MB Reserve', input: 'assert spark_unified_pool_mb(4300, 0.6) == 2400.0', expected: 'True' },
      { name: 'Case 2 · Clamps At Zero Below 300MB Reserved', input: 'assert spark_unified_pool_mb(250, 0.6) == 0.0', expected: 'True' },
      { name: 'Case 3 · Custom Higher Unified Fraction', input: 'assert spark_unified_pool_mb(8300, 0.75) == 6000.0', expected: 'True' },
      { name: 'Case 4 · Exact 300MB Edge', input: 'assert spark_unified_pool_mb(300, 0.6) == 0.0', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Default Fraction Parameter', input: 'assert spark_unified_pool_mb(1300) == 600.0', expected: 'True' },
      { name: 'Case 6 · Rounding Precision 1 Decimal', input: 'assert spark_unified_pool_mb(1000, 0.333) == 233.1', expected: 'True' },
    ],
  },
  de_30_terraform_tag_compliance_ci: {
    visible: [
      { name: 'Case 1 · Missing Cost Center Flagged', input: 'assert check_iac_tags([{"name":"s3_raw","tags":{"owner":"de","env":"prod"}}]) == ["s3_raw"]', expected: 'True' },
      { name: 'Case 2 · Fully Compliant Resources Empty', input: 'assert check_iac_tags([{"name":"db1","tags":{"owner":"de","env":"prod","cost_center":"cc10"}}]) == []', expected: 'True' },
      { name: 'Case 3 · Missing Tags Dict Handled Safely', input: 'assert check_iac_tags([{"name":"orphan_bucket"}]) == ["orphan_bucket"]', expected: 'True' },
      { name: 'Case 4 · Mixed Pass & Fail Modules', input: 'assert check_iac_tags([{"name":"ok","tags":{"owner":"d","env":"p","cost_center":"1"}},{"name":"bad","tags":{"owner":"d"}}]) == ["bad"]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty Terraform Plan', input: 'assert check_iac_tags([]) == []', expected: 'True' },
      { name: 'Case 6 · Extra Custom Tags Allowed', input: 'assert check_iac_tags([{"name":"s3","tags":{"owner":"a","env":"b","cost_center":"c","pii":"true"}}]) == []', expected: 'True' },
    ],
  },
  de_31_dbt_incremental_merge_sql_gen: {
    visible: [
      { name: 'Case 1 · 6-Hour Late Event Lookback', input: 'assert lookback_cutoff("2026-05-01T12:00:00", 6) == "2026-05-01T06:00:00"', expected: 'True' },
      { name: 'Case 2 · Cross-Midnight Rollback', input: 'assert lookback_cutoff("2026-05-02T02:00:00", 5) == "2026-05-01T21:00:00"', expected: 'True' },
      { name: 'Case 3 · Month Boundary Rollback', input: 'assert lookback_cutoff("2026-03-01T01:00:00", 3) == "2026-02-28T22:00:00"', expected: 'True' },
      { name: 'Case 4 · Zero Hours Lookback Identity', input: 'assert lookback_cutoff("2026-05-01T12:00:00", 0) == "2026-05-01T12:00:00"', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Default 6 Hours Arg', input: 'assert lookback_cutoff("2026-05-01T10:30:00") == "2026-05-01T04:30:00"', expected: 'True' },
      { name: 'Case 6 · Multi-Day 48h Window', input: 'assert lookback_cutoff("2026-05-03T12:00:00", 48) == "2026-05-01T12:00:00"', expected: 'True' },
    ],
  },
  de_32_pyspark_repartition_vs_coalesce: {
    visible: [
      { name: 'Case 1 · Scale Down Unskewed Chooses Coalesce', input: 'assert partition_op(200, 20, False) == "coalesce"', expected: 'True' },
      { name: 'Case 2 · Scale Up Forces Repartition', input: 'assert partition_op(20, 200, False) == "repartition"', expected: 'True' },
      { name: 'Case 3 · Skewed Flag Forces Full Shuffle Repartition', input: 'assert partition_op(200, 20, True) == "repartition"', expected: 'True' },
      { name: 'Case 4 · Equal Count Skewed Rebalances', input: 'assert partition_op(100, 100, True) == "repartition"', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Equal Count Unskewed Coalesce No-Op', input: 'assert partition_op(64, 64, False) == "coalesce"', expected: 'True' },
      { name: 'Case 6 · Single Target File Reduction', input: 'assert partition_op(50, 1, False) == "coalesce"', expected: 'True' },
    ],
  },
  de_33_cdc_tombstone_compaction: {
    visible: [
      { name: 'Case 1 · Drop Tombstones Drops Deleted Key', input: 'assert len(compact_cdc([{"key":1,"op":"I","offset":1},{"key":1,"op":"D","offset":2}], False)) == 0', expected: 'True' },
      { name: 'Case 2 · Retain Tombstone Marker For Downstream', input: 'res = compact_cdc([{"key":1,"op":"I","offset":1},{"key":1,"op":"D","offset":2}], True); assert len(res)==1 and res[0]["op"]=="D"', expected: 'True' },
      { name: 'Case 3 · Out-of-Order Offsets Highest Offset Wins', input: 'res = compact_cdc([{"key":5,"op":"U","offset":20},{"key":5,"op":"I","offset":10}], False); assert res[0]["offset"]==20', expected: 'True' },
      { name: 'Case 4 · Re-Insert After Delete Resurrects Key', input: 'res = compact_cdc([{"key":1,"op":"D","offset":2},{"key":1,"op":"I","offset":3}], False); assert len(res)==1 and res[0]["op"]=="I"', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty CDC Log Safe', input: 'assert compact_cdc([], False) == []', expected: 'True' },
      { name: 'Case 6 · Multiple Keys Mixed Live & Deleted', input: 'res = compact_cdc([{"key":1,"op":"I","offset":1},{"key":2,"op":"I","offset":2},{"key":1,"op":"D","offset":3}], False); assert [r["key"] for r in res] == [2]', expected: 'True' },
    ],
  },
  de_34_data_skew_entropy_metric: {
    visible: [
      { name: 'Case 1 · Detect Heavy Hitter Ratio 9.09x', input: 'assert skew_ratio([10, 12, 11, 100, 11]) == 9.09', expected: 'True' },
      { name: 'Case 2 · Perfectly Balanced Partition Ratio 1.0', input: 'assert skew_ratio([50, 50, 50, 50]) == 1.0', expected: 'True' },
      { name: 'Case 3 · Zero Median Returns Infinity', input: 'import math; assert math.isinf(skew_ratio([0, 0, 100]))', expected: 'True' },
      { name: 'Case 4 · Even Length List Median Average', input: 'assert skew_ratio([10, 20, 30, 40]) == 1.6', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Single Partition Ratio 1.0', input: 'assert skew_ratio([250]) == 1.0', expected: 'True' },
      { name: 'Case 6 · Extreme 1000x Partition Outlier', input: 'assert skew_ratio([1, 1, 1, 1000]) == 1000.0', expected: 'True' },
    ],
  },
  de_35_s3_hive_partition_path_parser: {
    visible: [
      { name: 'Case 1 · Extract Date & Country Keys', input: 'assert parse_hive_path("s3://lake/orders/dt=2026-01-01/country=IN/part.parquet") == {"dt":"2026-01-01","country":"IN"}', expected: 'True' },
      { name: 'Case 2 · Unpartitioned S3 Path Returns Empty', input: 'assert parse_hive_path("s3://bucket/raw/events/file.parquet") == {}', expected: 'True' },
      { name: 'Case 3 · Preserves Equals Inside Value', input: 'assert parse_hive_path("s3://b/k=a=b/p.pq") == {"k": "a=b"}', expected: 'True' },
      { name: 'Case 4 · Three-Level Time Partition', input: 'assert parse_hive_path("abfss://c@a/tbl/yr=2026/mo=05/hr=14/f.orc") == {"yr":"2026","mo":"05","hr":"14"}', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Trailing Slash Path Safe', input: 'assert parse_hive_path("s3://lake/env=prod/dt=2026-05-01/") == {"env":"prod","dt":"2026-05-01"}', expected: 'True' },
      { name: 'Case 6 · Empty URI Safe', input: 'assert parse_hive_path("") == {}', expected: 'True' },
    ],
  },
  de_36_dag_circle_ci_dependency_test: {
    visible: [
      { name: 'Case 1 · Dedup Transform Is Idempotent', input: 'assert verify_idempotent(lambda xs: sorted(set(xs)), [3,1,2,1]) is True', expected: 'True' },
      { name: 'Case 2 · Append-Only Mutation Fails Idempotency', input: 'assert verify_idempotent(lambda xs: xs + [99], [1, 2]) is False', expected: 'True' },
      { name: 'Case 3 · Normalize String Keys Idempotent', input: 'assert verify_idempotent(lambda s: s.strip().lower(), "  Prod_DB ") is True', expected: 'True' },
      { name: 'Case 4 · Counter Increment Non-Idempotent', input: 'assert verify_idempotent(lambda x: x + 1, 10) is False', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Identity Function Always Idempotent', input: 'assert verify_idempotent(lambda x: x, {"a": 1}) is True', expected: 'True' },
      { name: 'Case 6 · Rounding Float Idempotent', input: 'assert verify_idempotent(lambda x: round(x, 2), 3.14159) is True', expected: 'True' },
    ],
  },
  de_37_spark_window_dedup_python: {
    visible: [
      { name: 'Case 1 · Keep Highest Timestamp Per ID', input: 'res = dedup_latest([{"id":1,"ts":1,"v":"a"},{"id":1,"ts":5,"v":"b"}]); assert len(res)==1 and res[0]["v"]=="b"', expected: 'True' },
      { name: 'Case 2 · Custom Key & Order Columns', input: 'res = dedup_latest([{"pk":"u1","seq":10},{"pk":"u1","seq":2}], "pk", "seq"); assert res[0]["seq"]==10', expected: 'True' },
      { name: 'Case 3 · Multiple Distinct Keys Preserved', input: 'res = dedup_latest([{"id":1,"ts":2},{"id":2,"ts":1},{"id":1,"ts":9}]); assert sorted([r["id"] for r in res]) == [1, 2]', expected: 'True' },
      { name: 'Case 4 · Empty Batch Safe', input: 'assert dedup_latest([]) == []', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Equal Timestamp Keeps First Encountered', input: 'res = dedup_latest([{"id":1,"ts":5,"v":1},{"id":1,"ts":5,"v":2}]); assert res[0]["v"] == 1', expected: 'True' },
      { name: 'Case 6 · Negative Watermark Order Column', input: 'res = dedup_latest([{"id":9,"ts":-10},{"id":9,"ts":-2}]); assert res[0]["ts"] == -2', expected: 'True' },
    ],
  },
  de_38_columnar_rle_encoder: {
    visible: [
      { name: 'Case 1 · Consecutive Runs Compressed', input: 'assert rle_encode(["US","US","US","IN","IN"]) == [("US",3),("IN",2)]', expected: 'True' },
      { name: 'Case 2 · Non-Adjacent Repeat Separate Runs', input: 'assert rle_encode(["A","B","A"]) == [("A",1),("B",1),("A",1)]', expected: 'True' },
      { name: 'Case 3 · Single Element Column Block', input: 'assert rle_encode([42]) == [(42, 1)]', expected: 'True' },
      { name: 'Case 4 · Empty Column Safe', input: 'assert rle_encode([]) == []', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Null Run-Length Preserved', input: 'assert rle_encode([None, None, "UK"]) == [(None, 2), ("UK", 1)]', expected: 'True' },
      { name: 'Case 6 · Boolean Flag Column', input: 'assert rle_encode([True, False, False]) == [(True, 1), (False, 2)]', expected: 'True' },
    ],
  },
  de_39_dictionary_encoding_parquet: {
    visible: [
      { name: 'Case 1 · Build Vocab & Integer Codes', input: 'assert dict_encode(["prod","dev","prod"]) == (["prod","dev"], [0,1,0])', expected: 'True' },
      { name: 'Case 2 · Low Cardinality Repeating Column', input: 'vocab, ids = dict_encode(["IN","IN","IN"]); assert vocab == ["IN"] and ids == [0,0,0]', expected: 'True' },
      { name: 'Case 3 · All Unique Values Identity Codes', input: 'assert dict_encode(["a","b","c"]) == (["a","b","c"], [0,1,2])', expected: 'True' },
      { name: 'Case 4 · Empty Column Returns Empty Pair', input: 'assert dict_encode([]) == ([], [])', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Numeric Status Codes Supported', input: 'assert dict_encode([200, 404, 200]) == ([200, 404], [0, 1, 0])', expected: 'True' },
      { name: 'Case 6 · Roundtrip Reconstruction Exact', input: 'src = ["x","y","z","x"]; v, ids = dict_encode(src); assert [v[i] for i in ids] == src', expected: 'True' },
    ],
  },
  de_40_finops_warehouse_idle_auto_suspend: {
    visible: [
      { name: 'Case 1 · Gap > Auto-Suspend Caps At Threshold', input: 'assert wasted_idle_sec([(0,10),(100,120)], 60) == 60', expected: 'True' },
      { name: 'Case 2 · Short Gap Consumes Exact Idle Seconds', input: 'assert wasted_idle_sec([(0,10),(40,50)], 60) == 30', expected: 'True' },
      { name: 'Case 3 · Overlapping Concurrent Queries Zero Idle', input: 'assert wasted_idle_sec([(0,50),(20,60)], 60) == 0', expected: 'True' },
      { name: 'Case 4 · Single Or Empty Query Zero Idle', input: 'assert wasted_idle_sec([(0,10)], 60) == 0 and wasted_idle_sec([], 60) == 0', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Multiple Gaps Cumulative Savings', input: 'assert wasted_idle_sec([(0,10),(100,110),(130,140)], 60) == 80', expected: 'True' },
      { name: 'Case 6 · Back-to-Back Touching Queries Zero', input: 'assert wasted_idle_sec([(0,10),(10,20)], 60) == 0', expected: 'True' },
    ],
  },
  de_41_quarantine_split_pipeline: {
    visible: [
      { name: 'Case 1 · Empty User ID Routed To Quarantine', input: 'v, b = wap_split([{"user_id":"u1","amount":10},{"user_id":"","amount":5}]); assert len(v)==1 and len(b)==1', expected: 'True' },
      { name: 'Case 2 · Zero & Negative Amounts Quarantined', input: 'v, b = wap_split([{"user_id":"u1","amount":0},{"user_id":"u2","amount":-3}]); assert len(v)==0 and len(b)==2', expected: 'True' },
      { name: 'Case 3 · Null Amount Fails Safe Without Crash', input: 'v, b = wap_split([{"user_id":"u1","amount":None}]); assert len(v)==0 and len(b)==1', expected: 'True' },
      { name: 'Case 4 · All Clean Rows Pass Audit', input: 'v, b = wap_split([{"user_id":"u1","amount":25.5}]); assert len(v)==1 and b==[]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Missing Keys Safely Quarantined', input: 'v, b = wap_split([{}]); assert v==[] and len(b)==1', expected: 'True' },
      { name: 'Case 6 · Empty Audit Batch', input: 'assert wap_split([]) == ([], [])', expected: 'True' },
    ],
  },
  de_42_cdc_merge_conflict_priority: {
    visible: [
      { name: 'Case 1 · Equal HLC Tie Broken By Region Priority', input: 'assert lww_merge([{"id":1,"hlc_ts":10,"prio":1,"v":"a"}], [{"id":1,"hlc_ts":10,"prio":2,"v":"b"}])[1]["v"] == "b"', expected: 'True' },
      { name: 'Case 2 · Higher HLC Beats Higher Priority', input: 'assert lww_merge([{"id":1,"hlc_ts":20,"prio":1,"v":"newer"}], [{"id":1,"hlc_ts":10,"prio":9,"v":"older"}])[1]["v"] == "newer"', expected: 'True' },
      { name: 'Case 3 · Disjoint Regional Writes Merged', input: 'm = lww_merge([{"id":1,"hlc_ts":1,"prio":1,"v":"us"}], [{"id":2,"hlc_ts":1,"prio":1,"v":"eu"}]); assert set(m.keys()) == {1, 2}', expected: 'True' },
      { name: 'Case 4 · Commutative Across Region A/B Swap', input: 'a, b = [{"id":1,"hlc_ts":5,"prio":2,"v":"a"}], [{"id":1,"hlc_ts":5,"prio":1,"v":"b"}]; assert lww_merge(a, b) == lww_merge(b, a)', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty Both Regions', input: 'assert lww_merge([], []) == {}', expected: 'True' },
      { name: 'Case 6 · One Empty Region', input: 'assert lww_merge([{"id":7,"hlc_ts":3,"prio":1,"v":"x"}], [])[7]["v"] == "x"', expected: 'True' },
    ],
  },
  de_43_iceberg_small_files_binpack: {
    visible: [
      { name: 'Case 1 · Greedy Sequential Bin-Packing', input: 'assert binpack_files([30, 40, 50, 90], 128) == [[30, 40, 50], [90]]', expected: 'True' },
      { name: 'Case 2 · Exact Target Boundary Fills Single Bin', input: 'assert binpack_files([64, 64, 128], 128) == [[64, 64], [128]]', expected: 'True' },
      { name: 'Case 3 · Oversized File Placed In Own Bin', input: 'assert binpack_files([200, 30], 128) == [[200], [30]]', expected: 'True' },
      { name: 'Case 4 · All Small Files Coalesced To One', input: 'assert binpack_files([10, 20, 30], 128) == [[10, 20, 30]]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty File List', input: 'assert binpack_files([], 128) == []', expected: 'True' },
      { name: 'Case 6 · Single File List', input: 'assert binpack_files([50], 128) == [[50]]', expected: 'True' },
    ],
  },
  de_44_spark_aqe_coalesce_partitions: {
    visible: [
      { name: 'Case 1 · Adjacent Small Partitions Combined', input: 'assert aqe_coalesce([10, 20, 30, 50, 10], 64) == [60, 60]', expected: 'True' },
      { name: 'Case 2 · Large Partitions Remain Unmerged', input: 'assert aqe_coalesce([60, 60, 60], 64) == [60, 60, 60]', expected: 'True' },
      { name: 'Case 3 · Preserves Oversize Partition Whole', input: 'assert aqe_coalesce([100, 10, 20], 64) == [100, 30]', expected: 'True' },
      { name: 'Case 4 · Zero-Byte Empty Shuffle Partitions Coalesced', input: 'assert aqe_coalesce([0, 0, 10, 0], 64) == [10]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty Shuffle Input', input: 'assert aqe_coalesce([], 64) == []', expected: 'True' },
      { name: 'Case 6 · Single Exact Advisory Partition', input: 'assert aqe_coalesce([64], 64) == [64]', expected: 'True' },
    ],
  },
  de_45_watermark_late_event_dropper: {
    visible: [
      { name: 'Case 1 · Drops Stale Event Beyond Delay', input: 'assert [e["id"] for e in filter_late_events([{"id":1,"ts":100},{"id":2,"ts":85},{"id":3,"ts":95}], 10)] == [1, 3]', expected: 'True' },
      { name: 'Case 2 · Exact Watermark Boundary Kept', input: 'assert [e["id"] for e in filter_late_events([{"id":1,"ts":100},{"id":2,"ts":90}], 10)] == [1, 2]', expected: 'True' },
      { name: 'Case 3 · Watermark Advances Monotonically', input: 'assert [e["id"] for e in filter_late_events([{"id":1,"ts":50},{"id":2,"ts":200},{"id":3,"ts":150}], 20)] == [1, 2]', expected: 'True' },
      { name: 'Case 4 · Zero Allowed Lateness Strict', input: 'assert [e["id"] for e in filter_late_events([{"id":1,"ts":10},{"id":2,"ts":9},{"id":3,"ts":10}], 0)] == [1, 3]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty Stream Safe', input: 'assert filter_late_events([], 10) == []', expected: 'True' },
      { name: 'Case 6 · Strictly Increasing Events Keep All', input: 'assert len(filter_late_events([{"id":i,"ts":i} for i in range(5)], 0)) == 5', expected: 'True' },
    ],
  },
  de_46_zorder_interleave_bits: {
    visible: [
      { name: 'Case 1 · (2, 3) Interleaves To 14', input: 'assert morton_2d(2, 3) == 14', expected: 'True' },
      { name: 'Case 2 · Origin (0, 0) Maps To 0', input: 'assert morton_2d(0, 0) == 0', expected: 'True' },
      { name: 'Case 3 · Unit X vs Unit Y Spatial Order', input: 'assert morton_2d(1, 0) == 1 and morton_2d(0, 1) == 2 and morton_2d(1, 1) == 3', expected: 'True' },
      { name: 'Case 4 · 8-Bit Maximum (255, 255) == 65535', input: 'assert morton_2d(255, 255) == 65535', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Power-of-Two Axis Separation', input: 'assert morton_2d(4, 0) == 16 and morton_2d(0, 4) == 32', expected: 'True' },
      { name: 'Case 6 · Distinct Nearby Points Uniquely Mapped', input: 'assert len({morton_2d(x, y) for x in range(4) for y in range(4)}) == 16', expected: 'True' },
    ],
  },
  de_47_schema_registry_backward_check: {
    visible: [
      { name: 'Case 1 · Optional Column Added Passes', input: 'assert is_backward_compatible({"id","amt"}, {"id":{"has_default":False},"amt":{"has_default":False},"ccy":{"has_default":True}}) is True', expected: 'True' },
      { name: 'Case 2 · New Required Column Without Default Fails', input: 'assert is_backward_compatible({"id"}, {"id":{"has_default":False},"region":{"has_default":False}}) is False', expected: 'True' },
      { name: 'Case 3 · Dropped Column Permitted Backward Compat', input: 'assert is_backward_compatible({"id","legacy"}, {"id":{"has_default":False}}) is True', expected: 'True' },
      { name: 'Case 4 · Identical Schema Always Valid', input: 'assert is_backward_compatible({"a","b"}, {"a":{"has_default":False},"b":{"has_default":False}}) is True', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Multiple New Columns One Missing Default Fails', input: 'assert is_backward_compatible({"id"}, {"id":{"has_default":False},"a":{"has_default":True},"b":{"has_default":False}}) is False', expected: 'True' },
      { name: 'Case 6 · Empty New Schema Allowed', input: 'assert is_backward_compatible({"id"}, {}) is True', expected: 'True' },
    ],
  },
  de_48_token_bucket_api_ingestor: {
    visible: [
      { name: 'Case 1 · Initial Burst + Refill Throttle', input: 'assert token_bucket_accept([(1,0.0),(2,0.0),(3,0.1),(4,1.2)], 2, 1.0) == [1, 2, 4]', expected: 'True' },
      { name: 'Case 2 · Bucket Never Exceeds Capacity After Long Idle', input: 'assert token_bucket_accept([(1,100.0),(2,100.0),(3,100.0)], 2, 5.0) == [1, 2]', expected: 'True' },
      { name: 'Case 3 · Capacity Zero Rejects Everything', input: 'assert token_bucket_accept([(1,0.0),(2,10.0)], 0, 1.0) == []', expected: 'True' },
      { name: 'Case 4 · Slow Refill Allows Steady Pace', input: 'assert token_bucket_accept([(1,0.0),(2,2.0),(3,4.0)], 1, 0.5) == [1, 2, 3]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty Request Stream', input: 'assert token_bucket_accept([], 5, 1.0) == []', expected: 'True' },
      { name: 'Case 6 · Fractional Accumulator Reaches 1.0', input: 'assert token_bucket_accept([(1,0.0),(2,0.5),(3,1.0)], 1, 1.0) == [1, 3]', expected: 'True' },
    ],
  },
  de_49_dag_topological_kahn_batch: {
    visible: [
      { name: 'Case 1 · Parallel Roots Merge Into Sink', input: 'assert execution_waves(["a","b","c"], [("a","c"),("b","c")]) == [["a","b"],["c"]]', expected: 'True' },
      { name: 'Case 2 · Serial Pipeline Waves', input: 'assert execution_waves(["extract","transform","load"], [("extract","transform"),("transform","load")]) == [["extract"],["transform"],["load"]]', expected: 'True' },
      { name: 'Case 3 · Lexicographical Tie Order Per Wave', input: 'assert execution_waves(["z","a","m"], []) == [["a","m","z"]]', expected: 'True' },
      { name: 'Case 4 · Multi-Branch Diamond Graph', input: 'assert execution_waves(["raw","dim","fct","mart"], [("raw","dim"),("raw","fct"),("dim","mart"),("fct","mart")]) == [["raw"],["dim","fct"],["mart"]]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty DAG', input: 'assert execution_waves([], []) == []', expected: 'True' },
      { name: 'Case 6 · Cycle Nodes Excluded Gracefully', input: 'assert execution_waves(["a","b"], [("a","b"),("b","a")]) == []', expected: 'True' },
    ],
  },
  de_50_dlq_exponential_backoff_retry: {
    visible: [
      { name: 'Case 1 · Doubles Until Max Cap', input: 'assert backoff_schedule(5, 2, 20) == [2, 4, 8, 16, 20]', expected: 'True' },
      { name: 'Case 2 · Zero Retries Empty Schedule', input: 'assert backoff_schedule(0, 2, 30) == []', expected: 'True' },
      { name: 'Case 3 · Base Exceeds Max Cap Immediately Clamped', input: 'assert backoff_schedule(3, 50, 30) == [30, 30, 30]', expected: 'True' },
      { name: 'Case 4 · Single Retry Base Delay', input: 'assert backoff_schedule(1, 5, 30) == [5]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Default Args Compatibility', input: 'assert backoff_schedule(4) == [2, 4, 8, 16]', expected: 'True' },
      { name: 'Case 6 · Exact Power Equal Cap', input: 'assert backoff_schedule(4, 2, 8) == [2, 4, 8, 8]', expected: 'True' },
    ],
  },
  de_51_star_schema_fact_grain_guard: {
    visible: [
      { name: 'Case 1 · Detects Composite Grain Duplicate', input: 'assert find_grain_violations([{"order_id":1,"line_id":1},{"order_id":1,"line_id":1}]) == [(1, 1)]', expected: 'True' },
      { name: 'Case 2 · Distinct Lines Same Order Valid', input: 'assert find_grain_violations([{"order_id":1,"line_id":1},{"order_id":1,"line_id":2}]) == []', expected: 'True' },
      { name: 'Case 3 · Custom Single-Column Grain', input: 'assert find_grain_violations([{"txn_id":"t1"},{"txn_id":"t2"},{"txn_id":"t1"}], ("txn_id",)) == [("t1",)]', expected: 'True' },
      { name: 'Case 4 · Triplicate Key Emits Two Violations', input: 'assert find_grain_violations([{"order_id":9,"line_id":1}]*3) == [(9,1),(9,1)]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty Fact Table Safe', input: 'assert find_grain_violations([]) == []', expected: 'True' },
      { name: 'Case 6 · Null Composite Grain Key Flagged On Repeat', input: 'assert find_grain_violations([{"order_id":None,"line_id":1},{"order_id":None,"line_id":1}]) == [(None, 1)]', expected: 'True' },
    ],
  },
  de_52_spark_broadcast_threshold_planner: {
    visible: [
      { name: 'Case 1 · Selects BHJ Below vs SMJ Above Threshold', input: 'assert choose_join_strategy(500, 8, 10) == "BroadcastHashJoin" and choose_join_strategy(500, 120, 10) == "SortMergeJoin"', expected: 'True' },
      { name: 'Case 2 · Symmetric Small Left Side Triggers BHJ', input: 'assert choose_join_strategy(5, 9000, 10) == "BroadcastHashJoin"', expected: 'True' },
      { name: 'Case 3 · Exact Threshold Inclusive BHJ', input: 'assert choose_join_strategy(500, 10, 10) == "BroadcastHashJoin"', expected: 'True' },
      { name: 'Case 4 · Auto-Broadcast Disabled (-1) Forces SMJ', input: 'assert choose_join_strategy(1, 1, -1) == "SortMergeJoin"', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Both Tables Huge Forces SMJ', input: 'assert choose_join_strategy(2000, 3000, 100) == "SortMergeJoin"', expected: 'True' },
      { name: 'Case 6 · Zero-Byte Empty Dim Broadcasts', input: 'assert choose_join_strategy(1000, 0, 10) == "BroadcastHashJoin"', expected: 'True' },
    ],
  },
  r8_01_rag_vector_chunk_dedup_python: {
    visible: [
      { name: 'Case 1 · Overlapping Chunks + Cosine Top-K', input: 'chunks = chunk_text("doc1", "abcdefghij", 4, 1); assert [c["text"] for c in chunks] == ["abcd", "defg", "ghij"] and top_k_cosine([1.0, 0.0], [("c1", [0.2, 0.9]), ("c2", [0.95, 0.1]), ("c3", [0.5, 0.5])], 2) == ["c2", "c3"]', expected: 'True' },
      { name: 'Case 2 · Short Document Single Chunk + Zero Norm Safe', input: 'c2 = chunk_text("d", "hello", 10, 2); assert len(c2)==1 and top_k_cosine([0.0, 0.0], [("a", [1.0, 1.0])], 1) == ["a"]', expected: 'True' },
      { name: 'Case 3 · Deterministic SHA256 Content Hash', input: 'a = chunk_text("d1", "hello world", 5, 0); b = chunk_text("d2", "hello world", 5, 0); assert a[0]["sha"] == b[0]["sha"] and a[0]["chunk_id"] == "d1_0"', expected: 'True' },
      { name: 'Case 4 · Cosine Tie-Break By Lexicographical Chunk ID', input: 'assert top_k_cosine([1.0, 0.0], [("c_b", [0.8, 0.2]), ("c_a", [0.8, 0.2])], 2) == ["c_a", "c_b"]', expected: 'True' },
    ],
    hidden: [
      { name: 'Case 5 · Empty Document & Empty Vector Candidate Safe', input: 'assert chunk_text("d0", "", 5, 1) == [] and top_k_cosine([1.0], [], 3) == []', expected: 'True' },
      { name: 'Case 6 · Zero-Overlap Exact Boundary Division', input: 'assert [c["text"] for c in chunk_text("d", "123456", 3, 0)] == ["123", "456"]', expected: 'True' },
    ],
  },
};

export const DESIGN_6_RUBRIC_REGISTRY: Record<string, QuestionTestCase[]> = {
  r4_05_ride_sharing_star_schema: [
    { name: 'Check 1 · Explicit Fact Grain Declaration', input: 'Fact table grain explicitly stated (one row per trip_id or trip-surge event)', expected: 'Required' },
    { name: 'Check 2 · Conformed Dimensions Linked via Surrogate FKs', input: 'dim_rider, dim_driver, dim_zone_hex, dim_date/time foreign keys defined', expected: 'Required' },
    { name: 'Check 3 · SCD Type 2 Handling for Dynamic Driver/Zone Tiers', input: 'effective_from, effective_to, is_current captured for historical point-in-time joins', expected: 'Required' },
    { name: 'Check 4 · Additive vs Non-Additive Surge Ratio Metrics Separated', input: 'Stores base_fare_cents + surge_amount_cents rather than averaging pre-computed surge_multiplier', expected: 'Required' },
    { name: 'Check 5 · Partitioning & Clustering Strategy Defined', input: 'Partition by trip_date_utc + cluster/Z-Order by h3_hex_res8 or city_id', expected: 'Required' },
    { name: 'Check 6 · Late-Arriving Dimension / Null FK Handling', input: 'Inferred member (-1 unknown surrogate key) for un-registered zones/drivers', expected: 'Required' },
  ],
  r4_06_scd4_mini_dimension_high_churn: [
    { name: 'Check 1 · Decouples High-Churn Attributes Into Mini-Dim', input: 'Volatile profile attributes split into dim_user_profile_snapshot (SCD4)', expected: 'Required' },
    { name: 'Check 2 · Bounded Surrogate Cardinality Verified', input: 'Banded/bucketed discrete attributes (e.g. age_band, tier, risk_bucket)', expected: 'Required' },
    { name: 'Check 3 · Main dim_user Stays Lean & Stable (SCD1/2)', input: 'Core static identity keys separated from daily churn rows', expected: 'Required' },
    { name: 'Check 4 · Fact Table Carries Dual Surrogate Foreign Keys', input: 'fact_events stores both user_sk and mini_profile_sk for O(1) joins', expected: 'Required' },
    { name: 'Check 5 · Outrigger / Current Profile Bridge Strategy', input: 'Optional latest profile_sk stored on dim_user for current-state slice queries', expected: 'Required' },
    { name: 'Check 6 · Quantified Storage & Join Reduction Math', input: 'Demonstrates 100M x 365 bloat eliminated down to bounded combination matrix', expected: 'Required' },
  ],
  r5_01_uber_realtime_surge_lakehouse: [
    { name: 'Check 1 · Throughput, Bandwidth & Storage Sizing', input: '500K events/sec sizing in MB/s, GB/day, TB/year, and Kafka partition count', expected: 'Required' },
    { name: 'Check 2 · Streaming Ingestion & Partitioning Strategy', input: 'Kafka partitioned by H3 hexagon cell + Flink stateful sliding windows', expected: 'Required' },
    { name: 'Check 3 · Watermarks & Late-Arriving Telemetry Policy', input: 'Bounded out-of-orderness watermark + allowed lateness + side-output DLQ', expected: 'Required' },
    { name: 'Check 4 · Exactly-Once / Idempotent Lakehouse Sink', input: 'Iceberg/Delta MERGE or Kafka EOS + Redis/Pinot sub-second serving split', expected: 'Required' },
    { name: 'Check 5 · Hot H3 Zone Skew Mitigation', input: 'Pre-aggregation / local combine or dynamic salted key before global state shuffle', expected: 'Required' },
    { name: 'Check 6 · FinOps & Multi-AZ Backpressure Plan', input: 'Spot executors for batch compaction, tiered retention, RocksDB checkpointing', expected: 'Required' },
  ],
  r5_02_fintech_zero_loss_cdc_lakehouse: [
    { name: 'Check 1 · Debezium WAL Log-Based CDC Capture', input: 'Zero-impact Postgres/MySQL binlog capture without dual-write race conditions', expected: 'Required' },
    { name: 'Check 2 · Outbox Pattern & Idempotency Keys', input: 'Deterministic event_id / sequence LSN deduplication across retries', expected: 'Required' },
    { name: 'Check 3 · Out-of-Order Tombstone & Delete Handling', input: 'Logical delete markers + version vector / LSN comparison inside MERGE', expected: 'Required' },
    { name: 'Check 4 · Automated Cross-System Hash Reconciliation', input: 'Periodic row-count + checksum diff audit between OLTP replica and Gold Ledger', expected: 'Required' },
    { name: 'Check 5 · PCI / PII Tokenization & Audit Lineage', input: 'Field-level KMS encryption / HMAC tokenization prior to Bronze/Silver exposure', expected: 'Required' },
    { name: 'Check 6 · Sizing, RPO/RTO & Replay SLA Math', input: 'RPO=0 recovery via Kafka offset rewind + Iceberg snapshot rollback', expected: 'Required' },
  ],
  r5_03_clickstream_backfill_reprocessing: [
    { name: 'Check 1 · Petabyte Ingestion & Partition Sizing Math', input: 'Bandwidth, daily TB volume, and Iceberg/Delta hidden partitioning layout', expected: 'Required' },
    { name: 'Check 2 · Idempotent Backfill Overlaps (Dynamic Overwrite / Branch)', input: 'Write-Audit-Publish (WAP) Nessie/Iceberg branch or MERGE preventing partial reads', expected: 'Required' },
    { name: 'Check 3 · Schema Evolution & Backward Reader Isolation', input: 'Schema Registry + Iceberg field-ID column tracking across 90-day replay', expected: 'Required' },
    { name: 'Check 4 · Small File Avoidance & Async Compaction', input: 'Distributed bin-packing + Z-Ordering without stalling live streaming writers', expected: 'Required' },
    { name: 'Check 5 · Compute Throttling & Queue Isolation for 90-Day Replay', input: 'Separate backfill cluster pool + incremental chunking by dt/hour', expected: 'Required' },
    { name: 'Check 6 · FinOps Cost Estimate & Spot Tolerance', input: 'Spot instance mix, S3 Intelligent-Tiering, partition pruning savings', expected: 'Required' },
  ],
  r5_04_ecommerce_inventory_ad_attribution: [
    { name: 'Check 1 · Dual-Stream Temporal Join (Clicks ⋈ Orders)', input: 'Flink interval join or RocksDB state store bounding 7-day click history', expected: 'Required' },
    { name: 'Check 2 · State TTL & Late Attribution Window', input: 'TTL eviction + asynchronous late-click Lakehouse reconciliation MERGE', expected: 'Required' },
    { name: 'Check 3 · Bot / Click-Spam Deduplication Upstream', input: 'Bloom filter / Flink deduplication keyed by (ad_id, session_id)', expected: 'Required' },
    { name: 'Check 4 · Multi-Touch vs Last-Touch Attribution Extensibility', input: 'Stores ordered click array or immutable attribution fact table', expected: 'Required' },
    { name: 'Check 5 · Throughput & RocksDB State Size Math', input: 'Quantifies active click state GB/day * 7 days across Flink taskmanagers', expected: 'Required' },
    { name: 'Check 6 · Serving Layer SLA & Governance', input: 'Sub-second advertiser dashboard via Druid/Pinot/ClickHouse + GDPR opt-out', expected: 'Required' },
  ],
  r6_01_incident_spark_99_stuck_oom: [
    { name: 'Check 1 · Pinpoints Skewed Partition & Disk Spill From UI Metrics', input: 'Identifies 1 task receiving majority shuffle read bytes & spilling >50GB', expected: 'Required' },
    { name: 'Check 2 · Immediate SEV-1 Blast Radius Containment', input: 'Kill runaway retry loop / temporarily scale memoryOverhead or broadcast small side', expected: 'Required' },
    { name: 'Check 3 · Root-Cause Code Fix (Salting / NULL Split / AQE)', input: 'Concrete PySpark AQE skewJoin flags or deterministic salted key / NULL split', expected: 'Required' },
    { name: 'Check 4 · Memory Pool Explanation (Unified vs Overhead)', input: 'Explains why executor OOM killed container (off-heap / Python / GC thrash)', expected: 'Required' },
    { name: 'Check 5 · Data Consumer Impact & Backfill Verification', input: 'Checks downstream Gold SLA freshness, alerts stakeholders, validates row counts', expected: 'Required' },
    { name: 'Check 6 · Blameless Postmortem & Preventive CI Guardrail', input: 'Skew alert thresholds, automated regression tests on hot keys', expected: 'Required' },
  ],
  r6_02_incident_iceberg_small_files_cost: [
    { name: 'Check 1 · Diagnoses File Explosion & Metadata Planning Overhead', input: 'Links 10s micro-batch commits to 100x increase in S3 LIST / manifest scans', expected: 'Required' },
    { name: 'Check 2 · Immediate Containment & Query Mitigation', input: 'Triggers rewrite_data_files bin-pack compaction + rewrite_manifests', expected: 'Required' },
    { name: 'Check 3 · Fixes Root Cause Streaming Commit Cadence', input: 'Increases trigger interval / hash-distributes writes before commit', expected: 'Required' },
    { name: 'Check 4 · Snapshot Expiration & Orphan File Cleanup', input: 'Schedules expire_snapshots + remove_orphan_files respecting time-travel SLA', expected: 'Required' },
    { name: 'Check 5 · FinOps S3 Request & Scan Cost Breakdown', input: 'Explains S3 GET/LIST amplification + Snowflake/Trino CPU credit burn', expected: 'Required' },
    { name: 'Check 6 · Monitoring Alerting On Avg File Size < 32MB', input: 'Prometheus/Datadog alert on files-per-partition threshold', expected: 'Required' },
  ],
  r6_03_project_defense_why_x_over_y: [
    { name: 'Check 1 · Concrete Business Context & Scale Numbers', input: 'Quantifies TPS, TB/day, SLA target, and team constraints upfront', expected: 'Required' },
    { name: 'Check 2 · Direct Architectural Comparison ("Why X Over Y")', input: 'Articulates 2+ viable alternatives and exact bottleneck/cost reason rejected', expected: 'Required' },
    { name: 'Check 3 · Acknowledges Chosen Architecture Limitations', input: 'Honest discussion of downsides of X and how team mitigated them', expected: 'Required' },
    { name: 'Check 4 · Failure Modes & Operational Runbooks', input: 'Covers backpressure, schema evolution, or replay disaster story', expected: 'Required' },
    { name: 'Check 5 · Measurable Impact After Launch', input: 'Latency/cost/reliability delta clearly stated ($/mo, P99 mins, incident drop)', expected: 'Required' },
    { name: 'Check 6 · Answers Staff Follow-Up At 10x Scale', input: 'Explains what breaks first at 10x traffic and migration path', expected: 'Required' },
  ],
  r6_04_behavioral_star_upstream_breakage: [
    { name: 'Check 1 · Situation & Blast Radius Quantified', input: 'Specific broken downstream pipelines/dashboards and revenue/SLA impact', expected: 'Required' },
    { name: 'Check 2 · Task & Immediate Containment Ownership', input: 'Stabilized pipeline first (quarantine/rollback/fallback) before blame', expected: 'Required' },
    { name: 'Check 3 · Constructive Cross-Team Conflict Resolution', input: 'Data-driven alignment with upstream producer engineering team without finger-pointing', expected: 'Required' },
    { name: 'Check 4 · Systemic Prevention Implemented (Data Contract)', input: 'Schema Registry CI gate, Protobuf/Avro check, or automated PR contract test', expected: 'Required' },
    { name: 'Check 5 · Measurable Result & Culture Shift', input: 'Zero repeat P1 schema breakages across subsequent quarters', expected: 'Required' },
    { name: 'Check 6 · Self-Reflection & Trade-off Empathy', input: 'Balanced producer velocity with consumer reliability guarantees', expected: 'Required' },
  ],
  r8_03_feature_store_training_serving_skew: [
    { name: 'Check 1 · Dual Offline (Iceberg/Parquet) + Online (Redis/Dynamo) Architecture', input: 'Clear separation between batch backfill store and <10ms key-value serving', expected: 'Required' },
    { name: 'Check 2 · Leakage-Free Point-in-Time ASOF Backfill', input: 'Guarantees feature_ts <= label_ts across historical training tables', expected: 'Required' },
    { name: 'Check 3 · Single Transform Definition (Batch & Stream Parity)', input: 'Shared SQL/Python/Flink transformation registry preventing logic drift', expected: 'Required' },
    { name: 'Check 4 · Online Store Hydration & TTL Management', input: 'CDC/Kafka stream syncing latest entity state into Redis with freshness SLA', expected: 'Required' },
    { name: 'Check 5 · Skew & Drift Monitoring (PSI / KL Divergence)', input: 'Compares logged inference features vs offline feature distribution automatically', expected: 'Required' },
    { name: 'Check 6 · Cost, Storage Sizing & Multi-Entity Keys', input: 'Quantifies Redis RAM footprint vs Iceberg cold storage cost', expected: 'Required' },
  ],
  r8_04_finops_chargeback_warehouse_tuning: [
    { name: 'Check 1 · Workload Tagging & Query Attribution Schema', input: 'QUERY_HISTORY + warehouse tags attributed by team, dbt model, and BI dashboard', expected: 'Required' },
    { name: 'Check 2 · Auto-Suspend, Auto-Scale & Multi-Cluster Right-Sizing', input: 'Explains 60s auto-suspend tradeoffs vs local SSD cache warm-up', expected: 'Required' },
    { name: 'Check 3 · Storage Clustering & Partition Pruning Optimization', input: 'Eliminates full scans via clustering keys, Iceberg sorting, and search optimization', expected: 'Required' },
    { name: 'Check 4 · Incrementalization of Full-Refresh dbt Models', input: 'Converts hourly full table rebuilds into lookback-window MERGE / dynamic tables', expected: 'Required' },
    { name: 'Check 5 · Guardrails: Resource Monitors & Statement Timeouts', input: 'Hard credit quotas, BI ad-hoc concurrency caps, spill alerts', expected: 'Required' },
    { name: 'Check 6 · Quantified 40% Savings Breakdown ($/mo)', input: 'Allocates concrete savings % across compute, clustering, and BI tiering', expected: 'Required' },
  ],
};

export const AUTHENTIC_ASKED_CONTEXT: Record<string, string> = {
  sql_01_top_3_dept_salaries: 'Asked in Amazon L5 Data Engineer Loop & Google DE Technical Screen',
  sql_02_gaps_islands_streaks: 'Asked in Netflix Senior Data Engineer & Uber DE II SQL Screen',
  sql_03_clickstream_sessionization: 'Asked in Airbnb Data Engineer & Meta E4/E5 Product DE Screen',
  sql_04_rolling_7d_gmv: 'Asked in Flipkart DE II & Amazon Retail Analytics On-Site',
  sql_05_point_in_time_asof_join: 'Asked in Databricks Staff DE & Stripe Risk Data Engineering Loop',
  sql_06_funnel_conversion: 'Asked in Flipkart & Zomato Senior Analytics Engineer Screen',
  sql_07_cohort_retention_matrix: 'Asked in Meta E5 Data Engineer & Atlassian Product Data Screen',
  sql_08_recursive_org_hierarchy: 'Asked in Salesforce & Microsoft Azure Data Engineer On-Site',
  sql_09_deduplicate_cdc_events: 'Asked in Databricks & Snowflake Lakehouse DE Technical Screen',
  sql_10_median_and_ntile: 'Asked in Uber Marketplace DE & Netflix Telemetry SQL Round',
  sql_11_overlapping_intervals: 'Asked in Google Cloud Data Engineer & Atlassian Infrastructure Loop',
  sql_12_yoy_category_growth: 'Asked in Flipkart Commerce DE & Swiggy Growth Analytics Screen',
  sql_13_first_last_value_frame: 'Asked in Meta Ads DE & Adobe Experience Platform On-Site',
  sql_14_second_highest_without_limit: 'Asked in Amazon L4/L5 DE Phone Screen & Walmart Global Tech Loop',
  sql_15_cumulative_budget_cap: 'Asked in Snowflake Internal FinOps & Databricks Platform DE Round',
  sql_16_user_retention_d1_d7: 'Asked in Swiggy & PhonePe Consumer Growth DE Technical Screen',
  sql_17_market_basket_cooccurrence: 'Asked in Amazon Recommendation DE & Flipkart Search Data Loop',
  sql_18_outlier_zscore_detection: 'Asked in Uber Observability DE & Databricks Reliability Screen',
  sql_19_scd2_gap_validation: 'Asked in Snowflake Enterprise DW & Razorpay Finance Ledger DE Round',
  sql_20_recursive_series_hierarchy_cost: 'Asked in Airbnb Minerva Platform & Netflix Lineage DE On-Site',
  sql_21_anti_join_missing_partitions: 'Asked in LinkedIn Pinot Ingestion & PhonePe Lakehouse Audit Screen',
  sql_22_percentile_bucketing_ntile: 'Asked in Stripe & Razorpay Merchant Tiering SQL Round',
  sql_23_reconciliation_hash_diff: 'Asked in PhonePe & Razorpay Payments Reconciliation DE Loop',
  sql_24_running_balance_overdraft: 'Asked in Stripe Financial Ledger & PhonePe Core Payments Screen',
  sql_25_active_concurrent_sessions: 'Asked in Snowflake Query Scheduler & Google Cloud Spanner DE Round',
  sql_26_dedup_keep_latest_email: 'Asked in Salesforce CRM Ingestion & Intuit Identity DE Screen',
  sql_27_moving_avg_3_orders: 'Asked in Swiggy Dispatch Logistics & Zomato Merchant SLA Loop',
  sql_28_top_spender_per_month: 'Asked in Amazon Prime DE & Flipkart Loyalty Analytics Screen',
  sql_29_consecutive_login_3_days: 'Asked in Meta Engagement DE & Netflix Growth Retention Round',
  sql_30_funnel_drop_off_pct: 'Asked in Uber Rider Funnel & Airbnb Booking Conversion Screen',
  sql_31_skewed_key_audit: 'Asked in Databricks Skew Diagnostic & Uber Kafka Partitioning Screen',
  sql_32_pivot_channel_metrics: 'Asked in Google Ads Measurement & Adobe Attribution DE Round',
  sql_33_year_to_date_sum: 'Asked in Microsoft Finance BI & Oracle Cloud DW Screen',
  sql_34_session_bounce_rate: 'Asked in Google Analytics 4 DE & Airbnb Search Ranking Screen',
  sql_35_null_safe_coalesce_chain: 'Asked in LinkedIn Profile Ingestion & Atlassian Telemetry DE Loop',
  sql_36_recursive_number_padding: 'Asked in Apple IoT Telemetry & Databricks Time-Series Screen',
  sql_37_churned_reactivated_users: 'Asked in Netflix Subscriber Lifecycle & Meta DAU/MAU DE Loop',
  sql_38_point_in_time_fx_conversion: 'Asked in Stripe Multi-Currency Ledger & Razorpay Cross-Border DE Round',
  sql_39_top_2_products_per_category_ties: 'Asked in Flipkart Category Mart & Meesho Seller Analytics Screen',
  sql_40_index_covering_sargable: 'Asked in Google SQL Optimization & Snowflake Tuning Round',
  sql_41_recursive_calendar_fill_gaps: 'Asked in Atlassian SaaS ARR DE & Salesforce Billing Loop',
  sql_42_duplicate_pair_cleanup: 'Asked in Meta Social Graph DE & LinkedIn Connection Feed Screen',
  r4_01_star_schema_anti_fanout: 'Asked in Amazon Supply Chain DE & Meta E5 Modeling Loop',
  r4_02_scd2_point_in_time_fact_lookup: 'Asked in Snowflake & Airbnb Core Data Warehouse Modeling Round',
  r4_03_accumulating_snapshot_milestone_sla: 'Asked in Flipkart Logistics DE & Swiggy Instamart Fulfillment Loop',
  r4_04_bridge_table_weighted_attribution: 'Asked in Salesforce Multi-Touch Marketing & Atlassian Modeling Screen',
  r4_05_ride_sharing_star_schema: 'Asked in Uber Senior Data Engineer On-Site Modeling Loop',
  r4_06_scd4_mini_dimension_high_churn: 'Asked in Meta E5 & Netflix Identity Warehouse Modeling Loop',
  r5_01_uber_realtime_surge_lakehouse: 'Asked in Uber Senior DE & Confluent Streaming System Design Loop',
  r5_02_fintech_zero_loss_cdc_lakehouse: 'Asked in Stripe & PhonePe Principal/Senior DE Architecture Loop',
  r5_03_clickstream_backfill_reprocessing: 'Asked in Netflix & Google Cloud Big Data Architecture Loop',
  r5_04_ecommerce_inventory_ad_attribution: 'Asked in Amazon & Meta Ads Attribution System Design On-Site',
  r6_01_incident_spark_99_stuck_oom: 'Asked in Databricks & Flipkart Production Troubleshooting Bar-Raiser',
  r6_02_incident_iceberg_small_files_cost: 'Asked in Netflix & Snowflake Lakehouse On-Call RCA Loop',
  r6_03_project_defense_why_x_over_y: 'Asked in Google & Uber Staff/Senior DE Architecture Defense Round',
  r6_04_behavioral_star_upstream_breakage: 'Asked in Amazon Bar-Raiser & PhonePe Engineering Manager Round',
  r7_01_idempotent_sql_upsert_cdc: 'Asked in Databricks & Airbnb Practical Pipeline Take-Home / Live Lab',
  r8_01_rag_vector_chunk_dedup_python: 'Asked in Databricks Mosaic AI & Google AI Data Pipeline Loop',
  r8_02_sql_rbac_row_level_pii_masking: 'Asked in Snowflake Governance & PhonePe Security Compliance Lab',
  r8_03_feature_store_training_serving_skew: 'Asked in Uber Michelangelo & Stripe ML Platform DE Design Loop',
  r8_04_finops_chargeback_warehouse_tuning: 'Asked in Snowflake Field DE & Atlassian Cloud FinOps Architecture Loop',
};
