declare module 'sql.js' {
  export interface QueryExecResult {
    columns: string[];
    values: (number | string | null | Uint8Array)[][];
  }

  export class Database {
    constructor(data?: ArrayLike<number> | Buffer | null);
    run(sql: string, params?: unknown): Database;
    exec(sql: string, params?: unknown): QueryExecResult[];
    close(): void;
  }

  export interface SqlJsStatic {
    Database: typeof Database;
  }

  export interface SqlJsConfig {
    locateFile?: (file: string) => string;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}
