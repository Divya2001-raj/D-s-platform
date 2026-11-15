import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';

let sqlPromise: Promise<SqlJsStatic> | null = null;

async function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: () => '/sql-wasm.wasm',
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

export interface ExplainPlanNode {
  id: number;
  parent: number;
  detail: string;
  nodeType: 'SCAN' | 'SEARCH' | 'INDEX' | 'TEMP_BTREE' | 'SUBQUERY' | 'JOIN' | 'OTHER';
  warning?: string;
}

export interface SqlExecutionResponse {
  ok: boolean;
  actual?: SqlQueryResult;
  expected?: SqlQueryResult;
  diffMatched?: boolean;
  diffSummary?: string;
  explainPlan: ExplainPlanNode[];
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
  if (upper.includes('CORRELATED') || upper.includes('SUBQUERY') || upper.includes('CO-ROUTINE') || upper.includes('MATERIALIZE')) {
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
    summary: `All ${expected.rows.length} rows and ${expected.columns.length} columns match expected output.`,
  };
}

export async function executeSqlInBrowser(params: {
  setupSql: string;
  userSql: string;
  referenceSql?: string;
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
        // Non-SELECT statements or syntax error will be caught on actual execution
      }

      // 2. Run User Query
      const actual = extractFirstResult(db, trimmedUser);

      // 3. Run Reference Query in fresh isolated DB to guarantee zero side-effects
      let expected: SqlQueryResult | undefined;
      let diffMatched: boolean | undefined;
      let diffSummary: string | undefined;

      if (params.referenceSql && params.referenceSql.trim()) {
        const refDb = new SQL.Database();
        try {
          if (params.setupSql.trim()) {
            refDb.run(params.setupSql);
          }
          expected = extractFirstResult(refDb, params.referenceSql.trim().replace(/;+\s*$/, ''));
          const cmp = compareResults(actual, expected);
          diffMatched = cmp.matched;
          diffSummary = cmp.summary;
        } finally {
          refDb.close();
        }
      }

      return {
        ok: true,
        actual,
        expected,
        diffMatched,
        diffSummary,
        explainPlan,
      };
    } finally {
      db.close();
    }
  } catch (err) {
    return {
      ok: false,
      explainPlan: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
