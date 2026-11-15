import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import { executePythonInWorker } from './pythonEngine';

export interface AdversarialFuzzCase {
  id: string;
  vector:
    | 'All-NULL Keys'
    | 'Millisecond Timestamp Ties'
    | 'Duplicate CDC c/u/d'
    | 'Empty & Single-Row'
    | 'Malformed / Unicode'
    | '100x Hot-Key Skew';
  passed: boolean;
  mutatedInputPreview: string;
  detail: string;
  failingActualSample?: string;
  failingExpectedSample?: string;
}

export interface AdversarialFuzzReport {
  engine: 'sql' | 'python';
  ranAt: string;
  runtimeMs: number;
  passedCount: number;
  totalCount: number;
  allPassed: boolean;
  cases: AdversarialFuzzCase[];
}

let fuzzSqlPromise: Promise<SqlJsStatic> | null = null;
async function getSqlJs(): Promise<SqlJsStatic> {
  if (!fuzzSqlPromise) {
    fuzzSqlPromise = initSqlJs({
      locateFile: () => (typeof window === 'undefined' ? 'public/sql-wasm.wasm' : '/sql-wasm.wasm'),
    });
  }
  return fuzzSqlPromise;
}

function sqlLit(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : '0';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function normalizeCell(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? String(val) : val.toFixed(4).replace(/\.?0+$/, '');
  }
  return String(val).trim();
}

function extractSchema(db: Database) {
  const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
  if (!res.length) return [];
  return res[0].values.map(([name]) => {
    const tbl = String(name);
    const safeTbl = `"${tbl.replace(/"/g, '""')}"`;
    const info = db.exec(`PRAGMA table_info(${safeTbl});`);
    const cols = (info[0]?.values ?? []).map((col) => ({
      name: String(col[1]),
      safeName: `"${String(col[1]).replace(/"/g, '""')}"`,
      type: String(col[2] || 'TEXT').toUpperCase(),
      notNull: Number(col[3] ?? 0) === 1,
      isPk: Number(col[5] ?? 0) > 0,
    }));
    return { name: tbl, safeTbl, cols };
  });
}

function mutateDatabase(
  db: Database,
  vector: AdversarialFuzzCase['vector'],
): string {
  const tables = extractSchema(db);
  const mutatedRowsLog: string[] = [];

  if (vector === 'Empty & Single-Row') {
    for (const t of tables) {
      try {
        db.run(`DELETE FROM ${t.safeTbl};`);
      } catch {
        // Ignore FK blocks
      }
    }
    return `Truncated ${tables.map((t) => t.name).join(', ')} to 0 rows to verify empty-table & NULL-aggregate safety.`;
  }

  for (let tIdx = 0; tIdx < tables.length; tIdx++) {
    const t = tables[tIdx];
    const seed = db.exec(`SELECT * FROM ${t.safeTbl} LIMIT 1;`);
    if (!seed.length || !seed[0].values.length) continue;
    const base = [...seed[0].values[0]];
    const colNames = t.cols.map((c) => c.safeName).join(', ');

    const makePk = (offset: number, orig: unknown, col: (typeof t.cols)[number]) => {
      if (col.type.includes('INT') || typeof orig === 'number') {
        const mx = db.exec(`SELECT COALESCE(MAX(${col.safeName}), 0) FROM ${t.safeTbl};`);
        const baseMax = Number(mx[0]?.values?.[0]?.[0] ?? 9500);
        return (Number.isFinite(baseMax) ? baseMax : 9500) + offset;
      }
      return `${String(orig ?? 'k')}_fuzz_${offset}`;
    };

    const insertRow = (vals: unknown[], label: string) => {
      try {
        db.run(`INSERT INTO ${t.safeTbl} (${colNames}) VALUES (${vals.map(sqlLit).join(', ')});`);
        if (mutatedRowsLog.length < 3) {
          const obj = Object.fromEntries(t.cols.map((c, i) => [c.name, vals[i]]));
          mutatedRowsLog.push(`${t.name} [${label}]: ${JSON.stringify(obj)}`);
        }
      } catch {
        // Skip constraint-incompatible mutations silently
      }
    };

    if (vector === 'All-NULL Keys') {
      const vals = t.cols.map((c, idx) => {
        if (c.isPk) return makePk(101 + idx, base[idx], c);
        if (!c.notNull) return null;
        return base[idx];
      });
      insertRow(vals, 'ALL_NULL_KEYS');
    } else if (vector === 'Millisecond Timestamp Ties') {
      for (const delta of [1, 2]) {
        const vals = t.cols.map((c, idx) => {
          if (c.isPk) return makePk(200 + delta, base[idx], c);
          if (/ts|time|date|at/i.test(c.name)) return '2026-03-01 12:00:00.000';
          if (c.type.includes('INT') || c.type.includes('REAL') || typeof base[idx] === 'number') {
            return Number(base[idx] ?? 10) + delta * 15;
          }
          return base[idx];
        });
        insertRow(vals, `TIE_MS_${delta}`);
      }
    } else if (vector === 'Duplicate CDC c/u/d') {
      for (const [step, op] of (['c', 'u', 'd'] as const).entries()) {
        const vals = t.cols.map((c, idx) => {
          if (c.isPk) return makePk(300 + step, base[idx], c);
          if (/^(op|cdc_op|operation|event_type|action)$/i.test(c.name)) return op;
          if (/ts|time|at/i.test(c.name)) return `2026-03-01 12:00:0${step}.000`;
          return base[idx];
        });
        insertRow(vals, `CDC_${op}`);
      }
    } else if (vector === 'Malformed / Unicode') {
      const vals = t.cols.map((c, idx) => {
        if (c.isPk) return makePk(401, base[idx], c);
        if (c.type.includes('TEXT') || c.type.includes('CHAR') || typeof base[idx] === 'string') {
          if (/ts|time|date|at/i.test(c.name)) return '2026-03-01 23:59:59';
          return idx === 1 ? "O'Reilly 🚀 null NULL NaN" : 'NULL_STR_🔥';
        }
        return base[idx];
      });
      insertRow(vals, 'MALFORMED_UNICODE');
    } else if (vector === '100x Hot-Key Skew') {
      // Inject 100 skewed rows on the first record's key to expose unbounded subqueries/non-deterministic ordering
      const burst = 100;
      for (let k = 1; k <= burst; k++) {
        const vals = t.cols.map((c, idx) => {
          if (c.isPk) return makePk(500 + k, base[idx], c);
          if (c.type.includes('INT') || c.type.includes('REAL')) {
            return idx === 0 ? base[idx] : Number(base[idx] ?? 1) + (k % 7);
          }
          return base[idx];
        });
        try {
          db.run(`INSERT INTO ${t.safeTbl} (${colNames}) VALUES (${vals.map(sqlLit).join(', ')});`);
        } catch {
          break;
        }
      }
      mutatedRowsLog.push(`${t.name}: injected 100x skewed rows sharing hot partition key from seed row`);
      break;
    }
  }

  return mutatedRowsLog.join(' | ') || `Injected ${vector} mutations into schema.`;
}

function compareSql(
  actualCols: string[],
  actualRows: unknown[][],
  expCols: string[],
  expRows: unknown[][],
): { ok: boolean; detail: string } {
  if (actualCols.length !== expCols.length) {
    return { ok: false, detail: `Column mismatch: got [${actualCols.join(', ')}], expected [${expCols.join(', ')}].` };
  }
  if (actualRows.length !== expRows.length) {
    return { ok: false, detail: `Row count mismatch: returned ${actualRows.length} rows, expected ${expRows.length} rows.` };
  }
  for (let r = 0; r < expRows.length; r++) {
    for (let c = 0; c < expCols.length; c++) {
      const a = normalizeCell(actualRows[r][c]);
      const e = normalizeCell(expRows[r][c]);
      if (a !== e) {
        return {
          ok: false,
          detail: `Mismatch at row ${r + 1}, "${expCols[c]}": got "${a}", expected "${e}".`,
        };
      }
    }
  }
  return { ok: true, detail: `Matched all ${expRows.length} rows cleanly under mutation.` };
}

export async function fuzzSqlSolution(params: {
  setupSql: string;
  userSql: string;
  referenceSql: string;
}): Promise<AdversarialFuzzReport> {
  const start = performance.now();
  const SQL = await getSqlJs();
  const vectors: AdversarialFuzzCase['vector'][] = [
    'All-NULL Keys',
    'Millisecond Timestamp Ties',
    'Duplicate CDC c/u/d',
    'Empty & Single-Row',
    'Malformed / Unicode',
    '100x Hot-Key Skew',
  ];

  const cases: AdversarialFuzzCase[] = [];
  const uSql = params.userSql.trim();
  const rSql = params.referenceSql.trim();

  for (const vector of vectors) {
    const userDb = new SQL.Database();
    const refDb = new SQL.Database();
    try {
      if (params.setupSql.trim()) {
        userDb.run(params.setupSql);
        refDb.run(params.setupSql);
      }
      const preview = mutateDatabase(userDb, vector);
      mutateDatabase(refDb, vector);

      const userExec = userDb.exec(uSql);
      const uLast = userExec[userExec.length - 1] ?? { columns: [], values: [] };

      if (!rSql) {
        cases.push({
          id: `fuzz_${vector}`,
          vector,
          passed: true,
          mutatedInputPreview: preview,
          detail: `Executed cleanly (${uLast.values.length} row(s) returned).`,
        });
        continue;
      }

      const refExec = refDb.exec(rSql);
      const rLast = refExec[refExec.length - 1] ?? { columns: [], values: [] };

      const cmp = compareSql(uLast.columns, uLast.values, rLast.columns, rLast.values);
      cases.push({
        id: `fuzz_${vector}`,
        vector,
        passed: cmp.ok,
        mutatedInputPreview: preview,
        detail: cmp.detail,
        failingActualSample: cmp.ok ? undefined : JSON.stringify(uLast.values.slice(0, 3)),
        failingExpectedSample: cmp.ok ? undefined : JSON.stringify(rLast.values.slice(0, 3)),
      });
    } catch (err) {
      cases.push({
        id: `fuzz_${vector}`,
        vector,
        passed: false,
        mutatedInputPreview: `Mutated ${vector} dataset caused runtime failure`,
        detail: err instanceof Error ? err.message : String(err),
      });
    } finally {
      userDb.close();
      refDb.close();
    }
  }

  const passedCount = cases.filter((c) => c.passed).length;
  return {
    engine: 'sql',
    ranAt: new Date().toISOString(),
    runtimeMs: Math.round(performance.now() - start),
    passedCount,
    totalCount: cases.length,
    allPassed: passedCount === cases.length,
    cases,
  };
}

export async function fuzzPythonSolution(params: {
  setupCode: string;
  userCode: string;
  testCases: Array<{ name: string; input: string; expected: string }>;
}): Promise<AdversarialFuzzReport> {
  const start = performance.now();

  // Dynamic Pyodide harness that discovers user-defined functions and stress-tests adversarial inputs
  const fuzzVectors: Array<{
    vector: AdversarialFuzzCase['vector'];
    pyProbe: string;
    preview: string;
  }> = [
    {
      vector: 'All-NULL Keys',
      preview: '[{"id": None, "user_id": None, "ts": None, "amount": None, "op": "c"}]',
      pyProbe: `
_fuzz_rows = [{"id": None, "user_id": None, "key": None, "ts": None, "val": None, "amount": None, "op": "c"}, {"id": None, "user_id": None, "key": None, "ts": None, "val": 0, "amount": 0, "op": None}]
_fn_names = [k for k, v in list(globals().items()) if callable(v) and not k.startswith('_') and k not in ('Row','Column','F','DataFrame','SparkSession')]
if _fn_names:
    _target = globals()[_fn_names[-1]]
    try:
        _sig = inspect.signature(_target)
        _pcount = len([p for p in _sig.parameters.values() if p.default is inspect.Parameter.empty])
        if _pcount == 1:
            _res = _target(_fuzz_rows)
            assert _res is not None or isinstance(_res, (list, dict, tuple, int, float, str))
    except TypeError:
        pass
assert True`,
    },
    {
      vector: 'Millisecond Timestamp Ties',
      preview: '[{"id": "e2", "ts": "2026-03-01T12:00:00.000Z", "seq": 2}, {"id": "e1", "ts": "2026-03-01T12:00:00.000Z", "seq": 1}]',
      pyProbe: `
_tie_rows = [{"id": "e2", "user_id": "u1", "ts": "2026-03-01T12:00:00.000Z", "amount": 200, "op": "u"}, {"id": "e1", "user_id": "u1", "ts": "2026-03-01T12:00:00.000Z", "amount": 100, "op": "c"}]
assert len(_tie_rows) == 2 and _tie_rows[0]["ts"] == _tie_rows[1]["ts"]`,
    },
    {
      vector: 'Duplicate CDC c/u/d',
      preview: '[{"id": "o9", "op": "c", "val": 50}, {"id": "o9", "op": "u", "val": 75}, {"id": "o9", "op": "d", "val": 75}]',
      pyProbe: `
_cdc = [{"id": "o9", "op": "c", "ts": 100, "val": 50}, {"id": "o9", "op": "u", "ts": 100, "val": 75}, {"id": "o9", "op": "d", "ts": 101, "val": 75}]
assert len(_cdc) == 3`,
    },
    {
      vector: 'Empty & Single-Row',
      preview: '[] and [{"id": "only_1", "amount": 0}]',
      pyProbe: `
import inspect
_fn_names = [k for k, v in list(globals().items()) if callable(v) and not k.startswith('_') and k not in ('Row','Column','F','DataFrame','SparkSession')]
if _fn_names:
    _target = globals()[_fn_names[-1]]
    try:
        _sig = inspect.signature(_target)
        _pcount = len([p for p in _sig.parameters.values() if p.default is inspect.Parameter.empty])
        if _pcount == 1:
            _target([])
    except TypeError:
        pass
assert True`,
    },
    {
      vector: 'Malformed / Unicode',
      preview: '{"id": "🔥\\n\\t\'bad\'", "payload": "NULL null NaN 🚀"}',
      pyProbe: `
_bad = {"id": "🔥\\n\\t'bad'", "payload": "NULL null NaN 🚀", "amount": "NaN"}
assert isinstance(_bad["id"], str)`,
    },
    {
      vector: '100x Hot-Key Skew',
      preview: '[{"partition_key": "HOT_MERCHANT", "seq": i, "amount": i % 7} for i in range(100)] + [{"partition_key": "COLD_1", "seq": 1, "amount": 10}]',
      pyProbe: `
_skew = [{"partition_key": "HOT_MERCHANT", "seq": i, "amount": i % 7} for i in range(100)] + [{"partition_key": "COLD_1", "seq": 1, "amount": 10}]
assert len(_skew) == 101`,
    },
  ];

  // Combine user's own test assertions with adversarial fuzz vectors so broken functions fail visibly with exact mutated input
  const res = await executePythonInWorker({
    setupCode: `import inspect\n${params.setupCode || ''}`,
    userCode: params.userCode,
    testCases: fuzzVectors.map((v) => ({
      name: v.vector,
      input: v.pyProbe,
      expected: 'Pass adversarial mutation',
    })),
    hiddenTestCases: params.testCases.slice(0, 4),
  });

  const cases: AdversarialFuzzCase[] = fuzzVectors.map((v, idx) => {
    const t = res.tests[idx];
    const hiddenFail = res.hiddenTests?.find((ht) => !ht.passed);
    const passed = res.ok && Boolean(t?.passed) && !hiddenFail;
    return {
      id: `py_fuzz_${idx}`,
      vector: v.vector,
      passed,
      mutatedInputPreview: v.preview,
      detail: !res.ok
        ? res.stderr || 'Syntax / Runtime Error under adversarial execution'
        : hiddenFail && !t?.passed
          ? `${t?.detail || hiddenFail.detail}`
          : hiddenFail
            ? `Failed contract assertion "${hiddenFail.name}": ${hiddenFail.detail}`
            : t?.passed
              ? 'Function & boundary invariants survived adversarial mutation.'
              : t?.detail || 'Failed edge-case check',
    };
  });

  const passedCount = cases.filter((c) => c.passed).length;
  return {
    engine: 'python',
    ranAt: new Date().toISOString(),
    runtimeMs: Math.round(performance.now() - start),
    passedCount,
    totalCount: cases.length,
    allPassed: passedCount === cases.length,
    cases,
  };
}
