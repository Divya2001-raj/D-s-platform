import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileUp,
  ImagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import type {
  Difficulty,
  ExperienceTier,
  InterviewExperience,
  KnowledgeTopic,
  Question,
  QuestionSourceType,
} from '../types/platform';
import { ensureMinimumTestCases } from '../lib/questionEnricher';
import { BrandMark, getCustomBrandLogo, setCustomBrandLogo } from './BrandMark';
import { SystemDiagnosticsSuite } from './SystemDiagnosticsSuite';

interface AdminCmsViewProps {
  isAdmin: boolean;
  userId?: string | null;
  questions: Question[];
  topics?: KnowledgeTopic[];
  experiences: InterviewExperience[];
  onSaveQuestion: (q: Question) => Promise<void>;
  onDeleteQuestion: (id: string) => Promise<void>;
  onBulkImportQuestions: (
    qs: Question[],
    onProgress?: (committed: number, total: number) => void,
  ) => Promise<void>;
  onModerateExperience: (id: string, status: InterviewExperience['verificationStatus']) => Promise<void>;
  onAutoRepairQuestions?: () => Promise<number>;
}

function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

export function AdminCmsView({
  isAdmin,
  userId = null,
  questions,
  topics = [],
  experiences,
  onSaveQuestion,
  onDeleteQuestion,
  onBulkImportQuestions,
  onModerateExperience,
  onAutoRepairQuestions,
}: AdminCmsViewProps) {
  const [tab, setTab] = useState<'questions' | 'import' | 'testAudit' | 'diagnostics' | 'moderation' | 'duplicates'>('questions');
  const [hasCustomLogo, setHasCustomLogo] = useState<boolean>(() => Boolean(getCustomBrandLogo()));
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState('Analytical SQL');
  const [topic, setTopic] = useState('Window Functions');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [expLevel, setExpLevel] = useState<ExperienceTier>('4-6 yrs');
  const [sourceType, setSourceType] = useState<QuestionSourceType>('verified_interview');
  const [companies, setCompanies] = useState('Google, Databricks');
  const [problemStatement, setProblemStatement] = useState('');
  const [setupSchema, setSetupSchema] = useState('');
  const [starterCode, setStarterCode] = useState('');
  const [solution, setSolution] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [auditReport, setAuditReport] = useState<{
    checkedAt: string;
    total: number;
    passing6Plus: number;
    under6: Array<{ id: string; title: string; count: number }>;
  } | null>(null);

  const duplicates = useMemo(() => {
    const byNormTitle = new Map<string, Question[]>();
    for (const q of questions) {
      const key = q.title.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const list = byNormTitle.get(key) || [];
      list.push(q);
      byNormTitle.set(key, list);
    }
    return Array.from(byNormTitle.values()).filter((grp) => grp.length > 1);
  }, [questions]);

  if (!isAdmin) {
    return (
      <div className="glass-surface rounded-2xl p-8 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-white" />
        <h1 className="mt-3 font-display text-xl font-bold text-white">Admin CMS Access Required</h1>
        <p className="mt-1 text-xs text-slate-400">
          Sign in with an authorized administrator account (`divyaraj8861@gmail.com` or an entry in `/admins/{'{uid}'}`) to manage questions, bulk imports, and interview moderation.
        </p>
      </div>
    );
  }

  const startEditQuestion = (q: Question) => {
    setEditingId(q.uniqueId);
    setTitle(q.title);
    setDomain(q.domain);
    setTopic(q.topic);
    setDifficulty(q.difficulty);
    setExpLevel(q.experienceLevel);
    setSourceType(q.sourceType);
    setCompanies(q.companyTags.join(', '));
    setProblemStatement(q.problemStatement);
    setSetupSchema(q.setupSchemaOrEnv);
    setStarterCode(q.starterCode);
    setSolution(q.detailedSolution);
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setProblemStatement('');
    setSetupSchema('');
    setStarterCode('');
    setSolution('');
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !problemStatement.trim()) return;
    const newQ: Question = {
      uniqueId: editingId || `cms_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      problemStatement: problemStatement.trim(),
      domain,
      topic,
      subtopic: topic,
      roadmapTracks: [
        domain === 'Analytical SQL'
          ? 'Analytical SQL Mastery'
          : domain === 'Python & DSA'
            ? 'DSA Pattern Roadmap'
            : 'Data Engineering Core',
      ],
      difficulty,
      experienceLevel: expLevel,
      companyTags: companies.split(',').map((s) => s.trim()).filter(Boolean),
      roundType: domain === 'Analytical SQL' ? 'SQL Coding' : 'Python & DSA Coding',
      sourceType,
      sourceReference: 'Admin CMS Curated Entry',
      setupSchemaOrEnv: setupSchema,
      sampleInput: '',
      expectedOutput: '',
      testCases: [],
      starterCode,
      detailedSolution: solution,
      alternativeApproaches: '',
      explanation: 'Added via Admin CMS.',
      practicalRelevance: '',
      relatedLearningId: '',
      executionPlanNotes: '',
    };
    await onSaveQuestion(newQ);
    resetForm();
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('Parsing file...');
    try {
      const text = await file.text();
      let parsed: Question[] = [];
      if (file.name.toLowerCase().endsWith('.json')) {
        const arr = JSON.parse(text) as Array<Partial<Question>>;
        parsed = arr.map((item, i) => ({
          uniqueId: item.uniqueId || `bulk_${Date.now()}_${i}`,
          title: item.title || `Imported Question ${i + 1}`,
          problemStatement: item.problemStatement || 'Imported problem statement.',
          domain: item.domain || 'Analytical SQL',
          topic: item.topic || 'General',
          subtopic: item.subtopic || 'General',
          roadmapTracks: item.roadmapTracks || ['Analytical SQL Mastery'],
          difficulty: item.difficulty || 'Medium',
          experienceLevel: item.experienceLevel || '4-6 yrs',
          companyTags: item.companyTags || ['Google'],
          roundType: item.roundType || 'SQL Coding',
          sourceType: item.sourceType || 'curated_track',
          sourceReference: item.sourceReference || 'Bulk JSON Import',
          setupSchemaOrEnv: item.setupSchemaOrEnv || '',
          sampleInput: item.sampleInput || '',
          expectedOutput: item.expectedOutput || '',
          testCases: item.testCases || [],
          starterCode: item.starterCode || '',
          detailedSolution: item.detailedSolution || '',
          alternativeApproaches: item.alternativeApproaches || '',
          explanation: item.explanation || '',
          practicalRelevance: item.practicalRelevance || '',
          relatedLearningId: item.relatedLearningId || '',
          executionPlanNotes: item.executionPlanNotes || '',
        }));
      } else {
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        const headers = parseCsvRow(lines[0]).map((h) => h.toLowerCase());
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvRow(lines[i]);
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            row[h] = cols[idx] || '';
          });
          parsed.push({
            uniqueId: row.uniqueid || `csv_${Date.now()}_${i}`,
            title: row.title || `CSV Question ${i}`,
            problemStatement: row.problemstatement || row.problem || 'CSV imported problem.',
            domain: row.domain || 'Analytical SQL',
            topic: row.topic || 'General',
            subtopic: row.subtopic || row.topic || 'General',
            roadmapTracks: row.roadmaptracks ? row.roadmaptracks.split('|') : ['Analytical SQL Mastery'],
            difficulty: (row.difficulty as Difficulty) || 'Medium',
            experienceLevel: (row.experiencelevel as ExperienceTier) || '4-6 yrs',
            companyTags: row.companytags ? row.companytags.split('|') : ['Amazon'],
            roundType: row.roundtype || 'SQL Coding',
            sourceType: (row.sourcetype as QuestionSourceType) || 'curated_track',
            sourceReference: 'Bulk CSV Import',
            setupSchemaOrEnv: row.setupschemaorenv || '',
            sampleInput: '',
            expectedOutput: '',
            testCases: [],
            starterCode: row.startercode || '',
            detailedSolution: row.detailedsolution || '',
            alternativeApproaches: '',
            explanation: row.explanation || '',
            practicalRelevance: '',
            relatedLearningId: '',
            executionPlanNotes: '',
          });
        }
      }
      const enrichedBatch = parsed.map(ensureMinimumTestCases);
      setImportProgress({ done: 0, total: enrichedBatch.length });
      await onBulkImportQuestions(enrichedBatch, (done, total) => {
        setImportProgress({ done, total });
      });
      setImportStatus(
        `Committed ${enrichedBatch.length.toLocaleString()} enriched questions (500-doc Firestore WriteBatch chunks). Every question guaranteed >= 6 executable test cases.`,
      );
    } catch (err) {
      setImportStatus(`Import error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleRun6PlusAudit = () => {
    const under6 = questions
      .map((q) => ({
        id: q.uniqueId,
        title: q.title,
        count: (q.testCases?.length || 0) + (q.hiddenTestCases?.length || 0),
      }))
      .filter((x) => x.count < 6);
    setAuditReport({
      checkedAt: new Date().toLocaleTimeString(),
      total: questions.length,
      passing6Plus: questions.length - under6.length,
      under6,
    });
  };

  const handleUploadBrandAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomBrandLogo(reader.result);
        setHasCustomLogo(true);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="glass-surface flex flex-wrap items-center justify-between gap-4 rounded-[18px] p-5">
        <div>
          <h1 className="font-display text-xl font-bold text-white">Admin CMS &amp; Platform Controls (`/admin`)</h1>
          <p className="text-xs text-slate-400">
            Manage {questions.length} authentic questions, 500-doc bulk JSON/CSV scaling (3,700+ ready), Brand Husky Avatar, E2E Diagnostics, and moderation
          </p>
        </div>

        <div className="inset-surface flex flex-wrap rounded-xl p-1 text-xs">
          {[
            { id: 'questions' as const, label: 'Questions Bank' },
            { id: 'import' as const, label: 'Bulk JSON / CSV (500/batch)' },
            { id: 'testAudit' as const, label: '6+ Test Auditor' },
            { id: 'diagnostics' as const, label: 'E2E Diagnostics' },
            { id: 'moderation' as const, label: `Moderation (${experiences.filter((e) => e.verificationStatus === 'pending_review').length})` },
            { id: 'duplicates' as const, label: `Duplicates (${duplicates.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-medium transition-colors ${
                tab === t.id ? 'tab-active' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Brand & Husky Avatar Settings */}
      <div className="glass-surface flex flex-wrap items-center justify-between gap-4 rounded-[28px] p-5">
        <div className="flex items-center gap-3.5">
          <BrandMark size={48} variant="avatar" showOnlineDot />
          <div>
            <div className="font-display text-sm font-bold text-white">
              Brand Mascot &amp; Husky Emblem Settings
            </div>
            <p className="text-xs text-slate-400">
              {hasCustomLogo
                ? 'Using your custom uploaded avatar across Sidebar, Hero Card, Auth Modal & Brand Header.'
                : 'Default Copper-Red Siberian Husky vector SVG inside luminous cyan-violet circular crest.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <label className="btn-primary inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold">
            <ImagePlus className="h-3.5 w-3.5" />
            <span>Upload Custom Avatar</span>
            <input type="file" accept="image/*" onChange={handleUploadBrandAvatar} className="hidden" />
          </label>
          {hasCustomLogo && (
            <button
              type="button"
              onClick={() => {
                setCustomBrandLogo(null);
                setHasCustomLogo(false);
              }}
              className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset to Copper Husky SVG</span>
            </button>
          )}
        </div>
      </div>

      {tab === 'questions' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <form onSubmit={handleAddQuestion} className="glass-surface rounded-2xl p-5 space-y-3 xl:col-span-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-white">
                {editingId ? `Edit Question (${editingId})` : 'Add Question to Firestore'}
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel Edit
                </button>
              )}
            </div>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Question Title"
              className="inset-surface w-full rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--border-strong)]"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="inset-surface rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--border-strong)]"
              >
                <option>Analytical SQL</option>
                <option>Python &amp; DSA</option>
                <option>PySpark &amp; Distributed</option>
                <option>Engineering Labs</option>
              </select>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Topic"
                className="inset-surface rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--border-strong)]"
              />
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="inset-surface rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--border-strong)]"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
              <select
                value={expLevel}
                onChange={(e) => setExpLevel(e.target.value as ExperienceTier)}
                className="inset-surface rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--border-strong)]"
              >
                <option value="3-4 yrs">3-4 yrs</option>
                <option value="4-6 yrs">4-6 yrs</option>
                <option value="6+ yrs">6+ yrs</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                value={companies}
                onChange={(e) => setCompanies(e.target.value)}
                placeholder="Company tags (comma-sep)"
                className="inset-surface rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--border-strong)]"
              />
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as QuestionSourceType)}
                className="inset-surface rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--border-strong)]"
              >
                <option value="curated_track">Curated Track</option>
                <option value="verified_interview">Verified Interview</option>
                <option value="reported_experience">Reported Experience</option>
              </select>
            </div>
            <textarea
              required
              rows={3}
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              placeholder="Problem Statement (Markdown)"
              className="inset-surface w-full rounded-xl p-3 text-xs text-white outline-none focus:border-[var(--border-strong)]"
            />
            <textarea
              rows={2}
              value={setupSchema}
              onChange={(e) => setSetupSchema(e.target.value)}
              placeholder="Setup Schema DDL / Python Setup"
              className="inset-surface w-full rounded-xl p-3 font-mono text-xs text-white outline-none focus:border-[var(--border-strong)]"
            />
            <textarea
              rows={2}
              value={starterCode}
              onChange={(e) => setStarterCode(e.target.value)}
              placeholder="Starter Code"
              className="inset-surface w-full rounded-xl p-3 font-mono text-xs text-white outline-none focus:border-[var(--border-strong)]"
            />
            <textarea
              rows={3}
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="Detailed Reference Solution"
              className="inset-surface w-full rounded-xl p-3 font-mono text-xs text-white outline-none focus:border-[var(--border-strong)]"
            />
            <button
              type="submit"
              className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{editingId ? 'Save Updated Question' : 'Publish Question'}</span>
            </button>
          </form>

          <div className="glass-surface rounded-2xl p-5 xl:col-span-7">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-white">
                Active Question Catalog ({questions.length})
              </h2>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Filter catalog..."
                  className="inset-surface rounded-lg py-1.5 pl-8 pr-3 text-xs text-white outline-none focus:border-[var(--border-strong)]"
                />
              </div>
            </div>
            <div className="max-h-[540px] divide-y divide-white/[0.06] overflow-y-auto pr-2">
              {questions
                .filter((q) => {
                  const s = catalogSearch.trim().toLowerCase();
                  if (!s) return true;
                  return (
                    q.title.toLowerCase().includes(s) ||
                    q.topic.toLowerCase().includes(s) ||
                    q.uniqueId.toLowerCase().includes(s)
                  );
                })
                .slice(0, 100)
                .map((q) => (
                  <div key={q.uniqueId} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-white">{q.title}</div>
                      <div className="truncate text-slate-400">
                        {q.uniqueId} · {q.domain} · {q.sourceType}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => startEditQuestion(q)}
                        className="btn-secondary rounded-lg p-1.5 text-slate-400 hover:text-white"
                        title="Edit question"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteQuestion(q.uniqueId)}
                        className="btn-secondary rounded-lg p-1.5 text-slate-400 hover:text-white"
                        title="Delete from Firestore"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'import' && (
        <div className="glass-surface rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Database className="h-4 w-4 text-white" />
            <span>Bulk JSON / CSV Question Importer (500-Doc Batched Commit · 3,700+ Ready)</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            Upload a `.json` array of Question objects or a `.csv` file with columns:
            <code className="mx-1 rounded bg-neutral-500/15 px-1.5 py-0.5 text-white">
              title,domain,topic,difficulty,experienceLevel,companyTags,problemStatement,setupSchemaOrEnv,starterCode,detailedSolution
            </code>
          </p>
          <label className="btn-primary inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold">
            <FileUp className="h-4 w-4" />
            <span>Select JSON or CSV File</span>
            <input type="file" accept=".json,.csv" onChange={handleBulkUpload} className="hidden" />
          </label>
          {importProgress && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between font-mono text-xs text-slate-300">
                <span>Firestore 500-Doc Batch Progress</span>
                <span>
                  {importProgress.done.toLocaleString()} / {importProgress.total.toLocaleString()} (
                  {Math.round((importProgress.done / Math.max(1, importProgress.total)) * 100)}%)
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-500/20">
                <div
                  className="h-full rounded-full bg-[var(--accent-primary)] transition-all"
                  style={{ width: `${Math.round((importProgress.done / Math.max(1, importProgress.total)) * 100)}%` }}
                />
              </div>
            </div>
          )}
          {importStatus && <p className="text-xs text-slate-300">{importStatus}</p>}
        </div>
      )}

      {tab === 'testAudit' && (
        <div className="glass-surface rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-white">
                6+ Executable Test Case Coverage Verifier
              </h2>
              <p className="text-xs text-slate-400">
                Inspects all {questions.length} active questions to guarantee minimum 6 executable test assertions or rubric checks per question.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRun6PlusAudit}
              className="btn-primary inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Verify 6+ Test Cases Across All Questions</span>
            </button>
          </div>

          {auditReport && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="inset-surface rounded-xl p-3">
                  <div className="text-xs text-slate-400">Questions Audited</div>
                  <div className="mt-1 font-mono text-lg font-bold text-white">{auditReport.total}</div>
                </div>
                <div className="inset-surface rounded-xl p-3">
                  <div className="text-xs text-slate-400">Passing 6+ Coverage</div>
                  <div className="mt-1 font-mono text-lg font-bold text-[#10B981]">
                    {auditReport.passing6Plus} / {auditReport.total}
                  </div>
                </div>
                <div className="inset-surface rounded-xl p-3">
                  <div className="text-xs text-slate-400">Gaps Found</div>
                  <div className={`mt-1 font-mono text-lg font-bold ${auditReport.under6.length === 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                    {auditReport.under6.length}
                  </div>
                </div>
              </div>

              {auditReport.under6.length === 0 ? (
                <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-3 text-xs text-[#10B981]">
                  Audit passed at {auditReport.checkedAt}: 100% of active questions ({auditReport.total}/{auditReport.total}) carry 6+ executable test cases or rubric checks.
                </div>
              ) : (
                <div className="space-y-2">
                  {auditReport.under6.map((u) => (
                    <div key={u.id} className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-xs text-[#EF4444]">
                      {u.title} ({u.id}) — {u.count} test cases
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'diagnostics' && (
        <SystemDiagnosticsSuite
          userId={userId}
          questions={questions}
          topics={topics}
          onAutoRepairQuestions={onAutoRepairQuestions}
        />
      )}

      {tab === 'moderation' && (
        <div className="glass-surface rounded-2xl p-5 space-y-3">
          <h2 className="font-display text-base font-bold text-white">Interview Experience Moderation Queue</h2>
          {experiences.map((exp) => (
            <div key={exp.id} className="inset-surface rounded-xl p-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-white">{exp.company}</span> · {exp.position} ({exp.experience})
                  <span className="ml-2 font-mono text-slate-300">[{exp.verificationStatus}]</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onModerateExperience(exp.id, 'verified')}
                    className="btn-secondary inline-flex items-center gap-1 rounded-lg px-2.5 py-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Verify</span>
                  </button>
                  <button
                    onClick={() => onModerateExperience(exp.id, 'reported_experience')}
                    className="btn-secondary rounded-lg px-2.5 py-1"
                  >
                    Approve Reported
                  </button>
                  <button
                    onClick={() => onModerateExperience(exp.id, 'rejected')}
                    className="btn-secondary inline-flex items-center gap-1 rounded-lg px-2.5 py-1"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
              <p className="mt-2 text-slate-300">{exp.roundsDetail[0]?.summary}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'duplicates' && (
        <div className="glass-surface rounded-2xl p-5">
          <h2 className="mb-3 font-display text-base font-bold text-white">Duplicate Detection Report</h2>
          {duplicates.length === 0 ? (
            <p className="text-xs text-slate-300">Zero duplicate question titles detected across {questions.length} entries.</p>
          ) : (
            <div className="space-y-3">
              {duplicates.map((grp, i) => (
                <div key={i} className="inset-surface rounded-xl p-3 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Collision: {grp[0].title}</span>
                  </div>
                  <div className="mt-1 text-slate-300">IDs: {grp.map((x) => x.uniqueId).join(', ')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
