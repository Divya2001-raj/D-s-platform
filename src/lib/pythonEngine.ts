export interface PythonTestResult {
  name: string;
  passed: boolean;
  detail: string;
}

export interface PythonExecutionResponse {
  ok: boolean;
  stdout: string;
  stderr: string;
  runtimeMs: number;
  tests: PythonTestResult[];
  allPassed: boolean;
  engineMode: 'pyodide-wasm' | 'fallback';
}

const PYODIDE_WORKER_SOURCE = `
let pyodideReady = null;

async function ensurePyodide() {
  if (!pyodideReady) {
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.js');
    pyodideReady = loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/'
    });
  }
  return pyodideReady;
}

const PYSPARK_SHIM = \`
import json, math, statistics, collections, heapq, itertools, functools, re
from datetime import datetime, timedelta

class Row(dict):
    def __getattr__(self, key):
        try:
            return self[key]
        except KeyError:
            raise AttributeError(key)
    def asDict(self):
        return dict(self)

class Column:
    def __init__(self, expr, alias_name=None):
        self.expr = expr
        self.alias_name = alias_name
    def alias(self, name):
        return Column(self.expr, name)
    def desc(self):
        return (self.expr, True)
    def asc(self):
        return (self.expr, False)
    def __gt__(self, other):
        return lambda r: (r.get(self.expr) is not None) and r.get(self.expr) > other
    def __lt__(self, other):
        return lambda r: (r.get(self.expr) is not None) and r.get(self.expr) < other
    def __eq__(self, other):
        return lambda r: r.get(self.expr) == other

class F:
    @staticmethod
    def col(name):
        return Column(name)
    @staticmethod
    def lit(val):
        return Column(lambda r: val)

class DataFrame:
    def __init__(self, rows):
        self._rows = [dict(r) for r in rows]
    def collect(self):
        return [Row(r) for r in self._rows]
    def count(self):
        return len(self._rows)
    def select(self, *cols):
        out = []
        names = [c.expr if isinstance(c, Column) else c for c in cols]
        for r in self._rows:
            out.append({k: r.get(k) for k in names})
        return DataFrame(out)
    def filter(self, cond):
        if callable(cond):
            return DataFrame([r for r in self._rows if cond(r)])
        return DataFrame(self._rows)
    where = filter
    def withColumn(self, name, fn):
        out = []
        for r in self._rows:
            nr = dict(r)
            nr[name] = fn(nr) if callable(fn) else fn
            out.append(nr)
        return DataFrame(out)
    def show(self, n=20):
        for r in self._rows[:n]:
            print(r)
    def toPandas(self):
        return self._rows

class SparkSession:
    class Builder:
        def appName(self, name): return self
        def config(self, k, v): return self
        def getOrCreate(self): return SparkSession()
    builder = Builder()
    def createDataFrame(self, data, schema=None):
        if schema and data and isinstance(data[0], (list, tuple)):
            rows = [dict(zip(schema, row)) for row in data]
            return DataFrame(rows)
        return DataFrame(data)
\`;

self.onmessage = async (event) => {
  const { id, setupCode, userCode, testCases } = event.data;
  const start = performance.now();
  try {
    const pyodide = await ensurePyodide();
    let stdoutLines = [];
    let stderrLines = [];
    pyodide.setStdout({ batched: (msg) => stdoutLines.push(msg) });
    pyodide.setStderr({ batched: (msg) => stderrLines.push(msg) });

    await pyodide.runPythonAsync(PYSPARK_SHIM);
    if (setupCode && setupCode.trim()) {
      await pyodide.runPythonAsync(setupCode);
    }
    await pyodide.runPythonAsync(userCode);

    const testResults = [];
    for (const tc of (testCases || [])) {
      try {
        const harness = \`
__tc_input__ = \${JSON.stringify(tc.input || '')}
__tc_expected__ = \${JSON.stringify(tc.expected || '')}
\${tc.input && tc.input.includes('assert') ? tc.input : ''}
\`;
        if (tc.input && tc.input.trim().startsWith('assert')) {
          await pyodide.runPythonAsync(tc.input);
          testResults.push({ name: tc.name || 'Test Case', passed: true, detail: 'Assertion passed' });
        } else if (tc.input && tc.expected) {
          const evalExpr = \`repr(eval(\${JSON.stringify(tc.input)}))\`;
          const actualVal = await pyodide.runPythonAsync(evalExpr);
          const normActual = String(actualVal).trim();
          const normExp = String(tc.expected).trim();
          const passed = normActual === normExp;
          testResults.push({
            name: tc.name || 'Test Case',
            passed,
            detail: passed ? \`Matched: \${normActual}\` : \`Got \${normActual}, expected \${normExp}\`
          });
        }
      } catch (tcErr) {
        testResults.push({
          name: tc.name || 'Test Case',
          passed: false,
          detail: tcErr.message || String(tcErr)
        });
      }
    }

    self.postMessage({
      id,
      ok: true,
      stdout: stdoutLines.join('\\n'),
      stderr: stderrLines.join('\\n'),
      runtimeMs: Number((performance.now() - start).toFixed(1)),
      tests: testResults,
      allPassed: testResults.length === 0 ? true : testResults.every(t => t.passed),
      engineMode: 'pyodide-wasm'
    });
  } catch (err) {
    self.postMessage({
      id,
      ok: false,
      stdout: '',
      stderr: err.message || String(err),
      runtimeMs: Number((performance.now() - start).toFixed(1)),
      tests: [],
      allPassed: false,
      engineMode: 'pyodide-wasm'
    });
  }
};
`;

let workerInstance: Worker | null = null;

function getPythonWorker(): Worker {
  if (!workerInstance) {
    const blob = new Blob([PYODIDE_WORKER_SOURCE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    workerInstance = new Worker(url);
  }
  return workerInstance;
}

export async function executePythonInWorker(params: {
  setupCode: string;
  userCode: string;
  testCases: Array<{ name: string; input: string; expected: string }>;
  timeoutMs?: number;
}): Promise<PythonExecutionResponse> {
  const id = Math.random().toString(36).slice(2);
  const timeoutMs = params.timeoutMs ?? 25000;

  return new Promise((resolve) => {
    const worker = getPythonWorker();

    const timer = window.setTimeout(() => {
      if (workerInstance) {
        workerInstance.terminate();
        workerInstance = null;
      }
      resolve({
        ok: false,
        stdout: '',
        stderr: `Execution timed out after ${timeoutMs / 1000}s (possible infinite loop or slow Pyodide CDN download).`,
        runtimeMs: timeoutMs,
        tests: [],
        allPassed: false,
        engineMode: 'pyodide-wasm',
      });
    }, timeoutMs);

    const handler = (event: MessageEvent) => {
      if (event.data?.id !== id) return;
      window.clearTimeout(timer);
      worker.removeEventListener('message', handler);
      resolve(event.data as PythonExecutionResponse);
    };

    worker.addEventListener('message', handler);
    worker.postMessage({
      id,
      setupCode: params.setupCode,
      userCode: params.userCode,
      testCases: params.testCases,
    });
  });
}
