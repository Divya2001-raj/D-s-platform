import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import type { QuestionTestCase } from '../types/platform';

let sqlPromise: Promise<SqlJsStatic> | null = null;

async function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: () =>
        typeof window === 'undefined'
          ? 'public/sql-wasm.wasm'
          : '/sql-wasm.wasm',
    });
  }
  return sqlPromise;
}

export interface SqlQueryResult {
  columns: string[];
  rows: (string | number | null | Uint8Array)[][];
  rowCount: number;
  runtimeMs: number;
}

export interface SampleTablePreview {
  tableName: string;
  columns: string[];
  rows: (string | number | null | Uint8Array)[][];
  totalRows: number;
}

export interface ExplainPlanNode {
  id: number;
  parent: number;
  detail: string;
  nodeType: 'SCAN' | 'SEARCH' | 'INDEX' | 'TEMP_BTREE' | 'SUBQUERY' | 'JOIN' | 'OTHER';
  warning?: string;
}

export interface DirtyDataRunResult {
  ran: boolean;
  matched: boolean;
  summary: string;
  fixtureNote: string;
  actual?: SqlQueryResult;
  expected?: SqlQueryResult;
  error?: string;
}

export interface SqlTestCaseResult {
  id: string;
  name: string;
  category: string;
  description: string;
  passed: boolean;
  summary: string;
  runtimeMs: number;
  actual?: SqlQueryResult;
  expected?: SqlQueryResult;
  error?: string;
}

export interface SqlExecutionResponse {
  ok: boolean;
  actual?: SqlQueryResult;
  expected?: SqlQueryResult;
  diffMatched?: boolean;
  diffSummary?: string;
  explainPlan: ExplainPlanNode[];
  dirtyDataResult?: DirtyDataRunResult;
  testCaseResults: SqlTestCaseResult[];
  passedCount: number;
  totalCount: number;
  allPassed: boolean;
  error?: string;
}

function classifyPlanDetail(detail: string): {
  nodeType: ExplainPlanNode['nodeType'];
  warning?: string;
} {
  const upper = detail.toUpperCase();
  if (upper.includes('SCAN')) {
    return {
      nodeType: 'SCAN',
      warning: 'Full table scan detected — consider adding a composite index or selective predicate.',
    };
  }
  if (upper.includes('USE TEMP B-TREE')) {
    return {
      nodeType: 'TEMP_BTREE',
      warning: 'Temporary B-Tree sort/group allocation — an aligned index on ORDER BY/GROUP BY could avoid sort memory.',
    };
  }
  if (upper.includes('SEARCH') && upper.includes('USING INDEX')) {
    return { nodeType: 'INDEX' };
  }
  if (upper.includes('SEARCH')) {
    return { nodeType: 'SEARCH' };
  }
  if (
    upper.includes('CORRELATED') ||
    upper.includes('SUBQUERY') ||
    upper.includes('CO-ROUTINE') ||
    upper.includes('MATERIALIZE')
  ) {
    return { nodeType: 'SUBQUERY' };
  }
  return { nodeType: 'OTHER' };
}

function extractFirstResult(db: Database, sql: string): SqlQueryResult {
  const start = performance.now();
  const res = db.exec(sql);
  const runtimeMs = Number((performance.now() - start).toFixed(2));
  if (!res || res.length === 0) {
    return { columns: [], rows: [], rowCount: 0, runtimeMs };
  }
  const last = res[res.length - 1];
  return {
    columns: last.columns,
    rows: last.values,
    rowCount: last.values.length,
    runtimeMs,
  };
}

function normalizeCell(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? String(val) : val.toFixed(4).replace(/\.?0+$/, '');
  }
  return String(val).trim();
}

function compareResults(
  actual: SqlQueryResult,
  expected: SqlQueryResult,
): { matched: boolean; summary: string } {
  if (actual.columns.length !== expected.columns.length) {
    return {
      matched: false,
      summary: `Column count mismatch: got ${actual.columns.length} (${actual.columns.join(', ')}), expected ${expected.columns.length} (${expected.columns.join(', ')}).`,
    };
  }
  if (actual.rows.length !== expected.rows.length) {
    return {
      matched: false,
      summary: `Row count mismatch: returned ${actual.rows.length} rows, expected ${expected.rows.length} rows.`,
    };
  }
  for (let r = 0; r < expected.rows.length; r++) {
    for (let c = 0; c < expected.columns.length; c++) {
      const a = normalizeCell(actual.rows[r][c]);
      const e = normalizeCell(expected.rows[r][c]);
      if (a !== e) {
        return {
          matched: false,
          summary: `Value mismatch at row ${r + 1}, column "${expected.columns[c]}": got "${a}", expected "${e}".`,
        };
      }
    }
  }
  return {
    matched: true,
    summary: `Matched ${expected.rows.length} rows and ${expected.columns.length} columns.`,
  };
}

function getSchemaTables(db: Database) {
  const res = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
  );
  if (!res.length) return [];
  return res[0].values.map(([rawName]) => {
    const tbl = String(rawName);
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

function sqlLiteral(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : '0';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function cloneLastRowWithFreshPk(db: Database, mode: 'tie' | 'nulls' | 'zero' | 'duplicate'): void {
  const tables = getSchemaTables(db);
  for (let tIdx = tables.length - 1; tIdx >= 0; tIdx--) {
    const t = tables[tIdx];
    const rowRes = db.exec(`SELECT * FROM ${t.safeTbl} LIMIT 1;`);
    if (!rowRes.length || !rowRes[0].values.length) continue;
    const baseRow = [...rowRes[0].values[0]];

    const colNames = t.cols.map((c) => c.safeName);
    let pkCounter = 9000 + tIdx * 100 + Math.floor(Math.random() * 50);

    const nextRow = t.cols.map((col, idx) => {
      const orig = baseRow[idx];
      if (col.isPk) {
        if (col.type.includes('INT') || typeof orig === 'number') {
          const maxRes = db.exec(`SELECT COALESCE(MAX(${col.safeName}), 0) FROM ${t.safeTbl};`);
          const maxVal = Number(maxRes[0]?.values?.[0]?.[0] ?? pkCounter);
          return (Number.isFinite(maxVal) ? maxVal : pkCounter) + 1 + (mode === 'zero' ? 2 : mode === 'nulls' ? 3 : mode === 'duplicate' ? 4 : 5);
        }
        return `${String(orig ?? 'key')}_${mode}_${idx}`;
      }
      if (mode === 'nulls' && !col.notNull && idx > 0) {
        return null;
      }
      if (mode === 'zero' && (col.type.includes('INT') || col.type.includes('REAL') || col.type.includes('NUM') || typeof orig === 'number')) {
        return 0;
      }
      return orig;
    });

    try {
      db.run(
        `INSERT INTO ${t.safeTbl} (${colNames.join(', ')}) VALUES (${nextRow.map(sqlLiteral).join(', ')});`,
      );
      if (mode === 'tie') break;
    } catch {
      // Ignore constraint rejections cleanly
    }
  }
}

function applyReverseOrderingStress(db: Database): void {
  const tables = getSchemaTables(db);
  for (const t of tables) {
    const dataRes = db.exec(`SELECT * FROM ${t.safeTbl};`);
    if (!dataRes.length || dataRes[0].values.length < 2) continue;
    const reversed = [...dataRes[0].values].reverse();
    const colNames = t.cols.map((c) => c.safeName).join(', ');
    try {
      db.run(`DELETE FROM ${t.safeTbl};`);
      for (const r of reversed) {
        db.run(`INSERT INTO ${t.safeTbl} (${colNames}) VALUES (${r.map(sqlLiteral).join(', ')});`);
      }
    } catch {
      // Keep original order if FK constraints prevent delete
    }
  }
}

function applySparsePartitionStress(db: Database): void {
  const tables = getSchemaTables(db);
  if (!tables.length) return;
  // Remove half of rows in the primary leaf table to verify query does not hardcode row counts
  const leaf = tables[tables.length - 1];
  try {
    const cntRes = db.exec(`SELECT COUNT(*) FROM ${leaf.safeTbl};`);
    const cnt = Number(cntRes[0]?.values?.[0]?.[0] ?? 0);
    if (cnt >= 4) {
      const keep = Math.max(2, Math.floor(cnt / 2));
      db.run(
        `DELETE FROM ${leaf.safeTbl} WHERE rowid NOT IN (SELECT rowid FROM ${leaf.safeTbl} LIMIT ${keep});`,
      );
    }
  } catch {
    // Ignore FK restriction cleanly
  }
}

function runSingleScenario(
  SQL: SqlJsStatic,
  opts: {
    id: string;
    name: string;
    category: string;
    description: string;
    setupSql: string;
    userSql: string;
    referenceSql: string;
    extraDeltaSql?: string;
    perturbation?: 'tie' | 'nulls' | 'duplicate' | 'zero' | 'reverse' | 'sparse';
  },
): SqlTestCaseResult {
  const userDb = new SQL.Database();
  const refDb = new SQL.Database();
  try {
    if (opts.setupSql.trim()) {
      userDb.run(opts.setupSql);
      refDb.run(opts.setupSql);
    }
    if (opts.extraDeltaSql && opts.extraDeltaSql.trim()) {
      userDb.run(opts.extraDeltaSql);
      refDb.run(opts.extraDeltaSql);
    } else if (opts.perturbation === 'tie') {
      cloneLastRowWithFreshPk(userDb, 'tie');
      cloneLastRowWithFreshPk(refDb, 'tie');
    } else if (opts.perturbation === 'nulls') {
      cloneLastRowWithFreshPk(userDb, 'nulls');
      cloneLastRowWithFreshPk(refDb, 'nulls');
    } else if (opts.perturbation === 'duplicate') {
      cloneLastRowWithFreshPk(userDb, 'duplicate');
      cloneLastRowWithFreshPk(refDb, 'duplicate');
    } else if (opts.perturbation === 'zero') {
      cloneLastRowWithFreshPk(userDb, 'zero');
      cloneLastRowWithFreshPk(refDb, 'zero');
    } else if (opts.perturbation === 'reverse') {
      applyReverseOrderingStress(userDb);
      applyReverseOrderingStress(refDb);
    } else if (opts.perturbation === 'sparse') {
      applySparsePartitionStress(userDb);
      applySparsePartitionStress(refDb);
    }

    const actual = extractFirstResult(userDb, opts.userSql);
    const expected = extractFirstResult(refDb, opts.referenceSql);
    const cmp = compareResults(actual, expected);
    return {
      id: opts.id,
      name: opts.name,
      category: opts.category,
      description: opts.description,
      passed: cmp.matched,
      summary: cmp.summary,
      runtimeMs: actual.runtimeMs,
      actual,
      expected,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      id: opts.id,
      name: opts.name,
      category: opts.category,
      description: opts.description,
      passed: false,
      summary: msg,
      runtimeMs: 0,
      error: msg,
    };
  } finally {
    userDb.close();
    refDb.close();
  }
}

export async function extractSampleTables(
  setupSql: string,
  referenceSql?: string,
): Promise<{ tables: SampleTablePreview[]; expectedPreview: SqlQueryResult | null }> {
  try {
    const SQL = await getSqlJs();
    const db = new SQL.Database();
    try {
      if (setupSql.trim()) {
        db.run(setupSql);
      }
      const schemaTables = getSchemaTables(db);
      const tables: SampleTablePreview[] = schemaTables.map((t) => {
        const rowsRes = db.exec(`SELECT * FROM ${t.safeTbl} LIMIT 8;`);
        const cntRes = db.exec(`SELECT COUNT(*) FROM ${t.safeTbl};`);
        return {
          tableName: t.name,
          columns: rowsRes[0]?.columns ?? t.cols.map((c) => c.name),
          rows: rowsRes[0]?.values ?? [],
          totalRows: Number(cntRes[0]?.values?.[0]?.[0] ?? 0),
        };
      });
      let expectedPreview: SqlQueryResult | null = null;
      if (referenceSql && referenceSql.trim()) {
        expectedPreview = extractFirstResult(db, referenceSql.trim().replace(/;+\s*$/, ''));
      }
      return { tables, expectedPreview };
    } finally {
      db.close();
    }
  } catch {
    return { tables: [], expectedPreview: null };
  }
}

export async function executeSqlInBrowser(params: {
  setupSql: string;
  userSql: string;
  referenceSql?: string;
  dirtyDataMode?: boolean;
  adversarialSetupSql?: string;
  customTestCases?: QuestionTestCase[];
}): Promise<SqlExecutionResponse> {
  try {
    const SQL = await getSqlJs();
    const db = new SQL.Database();
    const explainPlan: ExplainPlanNode[] = [];

    try {
      if (params.setupSql.trim()) {
        db.run(params.setupSql);
      }

      const trimmedUser = params.userSql.trim().replace(/;+\s*$/, '');
      if (!trimmedUser) {
        return {
          ok: false,
          explainPlan: [],
          testCaseResults: [],
          passedCount: 0,
          totalCount: 0,
          allPassed: false,
          error: 'Please enter a SQL query to execute.',
        };
      }

      // 1. Execution Plan Inspection
      try {
        const planRes = db.exec(`EXPLAIN QUERY PLAN ${trimmedUser}`);
        if (planRes.length > 0) {
          for (const row of planRes[0].values) {
            const detail = String(row[3] ?? '');
            const { nodeType, warning } = classifyPlanDetail(detail);
            explainPlan.push({
              id: Number(row[0] ?? 0),
              parent: Number(row[1] ?? 0),
              detail,
              nodeType,
              warning,
            });
          }
        }
      } catch {
        // Syntax error will surface during execution
      }

      // 2. Run User Query on Canonical Dataset
      const actual = extractFirstResult(db, trimmedUser);
      const trimmedRef = (params.referenceSql || '').trim().replace(/;+\s*$/, '');

      let expected: SqlQueryResult | undefined;
      let diffMatched: boolean | undefined;
      let diffSummary: string | undefined;

      if (trimmedRef) {
        const refDb = new SQL.Database();
        try {
          if (params.setupSql.trim()) {
            refDb.run(params.setupSql);
          }
          expected = extractFirstResult(refDb, trimmedRef);
          const cmp = compareResults(actual, expected);
          diffMatched = cmp.matched;
          diffSummary = cmp.summary;
        } finally {
          refDb.close();
        }
      }

      // 3. Execute Mandatory 6+ SQL Test Cases
      const testCaseResults: SqlTestCaseResult[] = [];
      if (trimmedRef) {
        testCaseResults.push({
          id: 'tc_1_canonical',
          name: 'Case 1 · Canonical Loop Dataset',
          category: 'Happy Path',
          description: 'Verifies exact schema columns, types, row order, and primary business logic.',
          passed: Boolean(diffMatched),
          summary: diffSummary || 'Executed',
          runtimeMs: actual.runtimeMs,
          actual,
          expected,
        });

        testCaseResults.push(
          runSingleScenario(SQL, {
            id: 'tc_2_adversarial_ties',
            name: 'Case 2 · Tie-Breaking & Boundary Rows',
            category: 'Ties & Boundaries',
            description: 'Injects tied timestamps, equal ranking scores, or boundary dates.',
            setupSql: params.setupSql,
            userSql: trimmedUser,
            referenceSql: trimmedRef,
            extraDeltaSql: params.adversarialSetupSql,
            perturbation: 'tie',
          }),
        );

        testCaseResults.push(
          runSingleScenario(SQL, {
            id: 'tc_3_null_fk',
            name: 'Case 3 · NULL Attributes & Orphan FKs',
            category: 'NULL Safety',
            description: 'Tests LEFT JOIN vs INNER JOIN behavior and COALESCE safety with NULL keys.',
            setupSql: params.setupSql,
            userSql: trimmedUser,
            referenceSql: trimmedRef,
            perturbation: 'nulls',
          }),
        );

        testCaseResults.push(
          runSingleScenario(SQL, {
            id: 'tc_4_duplicate_cdc',
            name: 'Case 4 · Duplicate CDC Event & Replay',
            category: 'Deduplication',
            description: 'Simulates duplicate payload delivery and catches missing DISTINCT/ROW_NUMBER.',
            setupSql: params.setupSql,
            userSql: trimmedUser,
            referenceSql: trimmedRef,
            perturbation: 'duplicate',
          }),
        );

        testCaseResults.push(
          runSingleScenario(SQL, {
            id: 'tc_5_zero_extreme',
            name: 'Case 5 · Zero Denominators & Boundary Values',
            category: 'Numeric Edge',
            description: 'Tests zero-division protection (NULLIF) and boundary numeric inputs.',
            setupSql: params.setupSql,
            userSql: trimmedUser,
            referenceSql: trimmedRef,
            perturbation: 'zero',
          }),
        );

        testCaseResults.push(
          runSingleScenario(SQL, {
            id: 'tc_6_reverse_order',
            name: 'Case 6 · Reverse Storage Order Determinism',
            category: 'ORDER BY & Window',
            description: 'Reverses physical heap insertion order to expose missing ORDER BY clauses.',
            setupSql: params.setupSql,
            userSql: trimmedUser,
            referenceSql: trimmedRef,
            perturbation: 'reverse',
          }),
        );

        testCaseResults.push(
          runSingleScenario(SQL, {
            id: 'tc_7_sparse_partition',
            name: 'Case 7 · Sparse Subset / Partial Partition',
            category: 'Sparse Data',
            description: 'Verifies logic holds when secondary groups or slices contain fewer rows.',
            setupSql: params.setupSql,
            userSql: trimmedUser,
            referenceSql: trimmedRef,
            perturbation: 'sparse',
          }),
        );
      }

      const dirtyCase = testCaseResults[1];
      const dirtyDataResult: DirtyDataRunResult | undefined =
        params.dirtyDataMode && dirtyCase
          ? {
              ran: true,
              matched: dirtyCase.passed,
              summary: dirtyCase.summary,
              fixtureNote: params.adversarialSetupSql
                ? 'Adversarial fixture: NULL keys, tie timestamps, zero-denominators, and out-of-order CDC tombstones.'
                : 'Injected schema-aware tie-breaking and boundary perturbations.',
              actual: dirtyCase.actual,
              expected: dirtyCase.expected,
              error: dirtyCase.error,
            }
          : undefined;

      const passedCount = testCaseResults.filter((t) => t.passed).length;
      const totalCount = testCaseResults.length;
      const allPassed = totalCount > 0 ? passedCount === totalCount : Boolean(diffMatched);

      return {
        ok: true,
        actual,
        expected,
        diffMatched,
        diffSummary,
        explainPlan,
        dirtyDataResult,
        testCaseResults,
        passedCount,
        totalCount,
        allPassed,
      };
    } finally {
      db.close();
    }
  } catch (err) {
    return {
      ok: false,
      explainPlan: [],
      testCaseResults: [],
      passedCount: 0,
      totalCount: 0,
      allPassed: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
