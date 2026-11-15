/**
 * Converts a Python solution snippet into a clean, spoiler-free starter skeleton
 * containing only imports, top-level function signatures, and public class method stubs.
 */
export function buildPythonStarterSkeleton(solutionCode: string, todoComment = 'TODO: Implement your solution'): string {
  const lines = solutionCode.split('\n');
  const imports: string[] = [];
  const blocks: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!line.startsWith(' ') && (trimmed.startsWith('import ') || trimmed.startsWith('from '))) {
      imports.push(trimmed);
      i++;
      continue;
    }

    if (line.startsWith('def ')) {
      let sig = line.trimEnd();
      while (!sig.endsWith(':') && i + 1 < lines.length) {
        i++;
        sig += '\n' + lines[i].trimEnd();
      }
      blocks.push(`${sig}\n    # ${todoComment}\n    pass`);
      i++;
      continue;
    }

    if (line.startsWith('class ')) {
      const classHeader = line.trimEnd();
      const methods: string[] = [];
      let j = i + 1;
      while (j < lines.length && (lines[j].startsWith(' ') || lines[j].trim() === '')) {
        const mLine = lines[j];
        if (mLine.startsWith('    def ')) {
          const methodName = mLine.slice(8).split('(')[0].trim();
          if (methodName === '__init__' || !methodName.startsWith('_')) {
            let mSig = mLine.trimEnd();
            while (!mSig.endsWith(':') && j + 1 < lines.length) {
              j++;
              mSig += '\n' + lines[j].trimEnd();
            }
            methods.push(`${mSig}\n        # ${todoComment}\n        pass`);
          }
        }
        j++;
      }
      if (methods.length === 0) {
        methods.push(`    # ${todoComment}\n    pass`);
      }
      blocks.push(`${classHeader}\n${methods.join('\n\n')}`);
      i = j;
      continue;
    }

    i++;
  }

  const parts: string[] = [];
  if (imports.length > 0) parts.push(imports.join('\n'));
  if (blocks.length > 0) parts.push(blocks.join('\n\n'));
  return parts.join('\n\n') || `# ${todoComment}\npass`;
}
