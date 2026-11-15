import React, { useMemo, useState } from 'react';
import { ArrowRight, Building2, CheckCircle2, ExternalLink, Plus, Search, ShieldCheck, X } from 'lucide-react';
import type {
  CompanyPortal,
  Difficulty,
  ExperienceTier,
  InterviewExperience,
  Question,
} from '../types/platform';
import { GenerateBatchButton } from './GenerateBatchButton';

interface CompanyHubsViewProps {
  companies: CompanyPortal[];
  selectedCompanyId: string;
  onSelectCompany: (id: string) => void;
  questions: Question[];
  experiences: InterviewExperience[];
  experienceTier: ExperienceTier;
  onSelectQuestion: (q: Question) => void;
  onSelectTopic: (topicNameOrId: string) => void;
  onAddGeneratedQuestions: (qs: Question[]) => Promise<void>;
  onSubmitExperience: (exp: Omit<InterviewExperience, 'id' | 'authorId' | 'verificationStatus'>) => Promise<void>;
}

export function CompanyHubsView({
  companies,
  selectedCompanyId,
  onSelectCompany,
  questions,
  experiences,
  experienceTier,
  onSelectQuestion,
  onSelectTopic,
  onAddGeneratedQuestions,
  onSubmitExperience,
}: CompanyHubsViewProps) {
  const [companySearch, setCompanySearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<'All' | 'Global' | 'India'>('All');
  const [showExpModal, setShowExpModal] = useState(false);

  // Submission form state
  const [expRole, setExpRole] = useState('Senior Data Engineer');
  const [expYears, setExpYears] = useState('4-6 yrs');
  const [expLocation, setExpLocation] = useState('Bengaluru / Remote');
  const [expRound, setExpRound] = useState('System Design & Spark');
  const [expTech, setExpTech] = useState('Spark, Kafka, Iceberg, SQL');
  const [expDiff, setExpDiff] = useState<Difficulty>('Hard');
  const [expSummary, setExpSummary] = useState('');
  const [expQuestions, setExpQuestions] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredCompanies = useMemo(() => {
    const q = companySearch.trim().toLowerCase();
    return companies.filter((c) => {
      if (regionFilter === 'India' && !c.region.includes('India')) return false;
      if (regionFilter === 'Global' && c.region === 'India') return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.primaryStack.some((s) => s.toLowerCase().includes(q))) {
        return false;
      }
      return true;
    });
  }, [companies, companySearch, regionFilter]);

  const activeCompany = companies.find((c) => c.id === selectedCompanyId) || companies[0];

  const companyQuestions = useMemo(() => {
    if (!activeCompany) return [];
    return questions.filter((q) =>
      q.companyTags.some((tag) => tag.toLowerCase() === activeCompany.name.toLowerCase()),
    );
  }, [questions, activeCompany]);

  const companyExperiences = useMemo(() => {
    if (!activeCompany) return [];
    return experiences.filter((e) => e.company.toLowerCase() === activeCompany.name.toLowerCase());
  }, [experiences, activeCompany]);

  const handleExperienceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !expSummary.trim()) return;
    setSubmitting(true);
    try {
      await onSubmitExperience({
        company: activeCompany.name,
        position: expRole,
        experience: expYears,
        location: expLocation,
        round: expRound,
        technology: expTech,
        difficulty: expDiff,
        interviewDate: new Date().toISOString().slice(0, 10),
        sourceAttribution: 'Community Candidate Submission · Pending Moderation',
        roundsDetail: [
          {
            roundName: expRound,
            summary: expSummary,
            questionsAsked: expQuestions
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean),
          },
        ],
      });
      setExpSummary('');
      setExpQuestions('');
      setShowExpModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeCompany) return null;

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="glass-surface flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
            <input
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              placeholder="Search 24 Tier-1 companies or tech..."
              className="inset-surface w-full rounded-xl py-2 pr-3 pl-9 text-xs text-white placeholder-slate-500 outline-none focus:border-[var(--border-strong)]"
            />
          </div>
          <div className="inset-surface flex rounded-xl p-0.5 text-xs">
            {(['All', 'Global', 'India'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRegionFilter(r)}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  regionFilter === r ? 'tab-active' : 'text-slate-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="text-xs text-slate-400">
          Showing {filteredCompanies.length} Tier-1 Preparation Portals
        </div>
      </div>

      {/* Horizontal Company Carousel */}
      <div className="flex gap-2.5 overflow-x-auto pb-2">
        {filteredCompanies.map((c) => {
          const active = c.id === activeCompany.id;
          return (
            <button
              key={c.id}
              onClick={() => onSelectCompany(c.id)}
              className={`shrink-0 rounded-xl border px-4 py-2.5 text-left transition-all ${
                active
                  ? 'tab-active border-transparent'
                  : 'inset-surface text-slate-300 hover:border-[var(--border-strong)]'
              }`}
            >
              <div className="font-display text-sm font-bold whitespace-nowrap">{c.name}</div>
              <div className={`text-[11px] whitespace-nowrap ${active ? 'opacity-75' : 'text-slate-400'}`}>{c.region}</div>
            </button>
          );
        })}
      </div>

      {/* Active Company Portal */}
      <div className="glass-surface rounded-2xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Building2 className="h-3.5 w-3.5 text-white" />
              <span>{activeCompany.tierLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{activeCompany.region}</span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold text-white">
              {activeCompany.name} Data Engineering Loop
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {activeCompany.interviewPhilosophy}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              <span className="font-semibold text-white">Core Stack:</span>{' '}
              {activeCompany.primaryStack.join(' · ')}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              <span className="font-semibold text-white">Bar Calibration:</span>{' '}
              {activeCompany.barExpectation}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-300">Key Topics:</span>
              {activeCompany.topTopics.map((tp) => (
                <button
                  key={tp}
                  onClick={() => onSelectTopic(tp)}
                  className="btn-secondary rounded-lg px-2.5 py-1 text-xs font-medium"
                >
                  {tp}
                </button>
              ))}
            </div>
          </div>

          <GenerateBatchButton
            domain="Analytical SQL"
            topic={activeCompany.topTopics[0] || 'Data Engineering'}
            roadmapTrack="Analytical SQL Mastery"
            company={activeCompany.name}
            experienceLevel={experienceTier}
            roundType="SQL Coding"
            excludeTitles={questions.map((q) => q.title)}
            onGenerated={onAddGeneratedQuestions}
          />
        </div>

        {/* Interview Rounds Breakdown */}
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {activeCompany.rounds.map((r) => (
            <div key={r.roundNumber} className="inset-surface rounded-xl p-4">
              <div className="flex items-center justify-between font-mono text-xs text-slate-400">
                <span>Round {r.roundNumber}</span>
                <span>{r.durationMins}m</span>
              </div>
              <div className="mt-1.5 text-sm font-semibold text-white">{r.name}</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{r.focus}</p>
              <div className="mt-2 font-mono text-[11px] text-slate-500">Weight: {r.weightage}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Columns: Tagged Practice Questions & Moderated Interview Experiences */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="glass-surface rounded-2xl p-5 lg:col-span-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-white">
                {activeCompany.name}-Style Practice Problems ({companyQuestions.length})
              </h2>
              <p className="text-xs text-slate-400">
                Strict attribution badges distinguish curated tracks from AI-Generated Practice
              </p>
            </div>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {companyQuestions.length === 0 ? (
              <p className="py-6 text-xs text-slate-400">
                No tagged questions yet for {activeCompany.name}. Click &ldquo;Generate Practice Batch&rdquo; above to create 5 or 10 runnable {activeCompany.name}-style questions!
              </p>
            ) : (
              companyQuestions.map((q) => (
                <div
                  key={q.uniqueId}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.02]"
                >
                  <button
                    onClick={() => onSelectQuestion(q)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="truncate text-sm font-medium text-white hover:underline">{q.title}</div>
                    <div className="mt-0.5 truncate text-xs text-slate-400">
                      {q.askedContext || `${q.domain} · ${q.topic}`} ·{' '}
                      <span className="font-medium text-slate-300">
                        {q.sourceType === 'ai_generated_practice' ? 'AI-Generated Practice' : 'Verified Loop'}
                      </span>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <span className="font-mono text-xs text-slate-300">{q.difficulty}</span>
                    <a
                      href={`/problem/${encodeURIComponent(q.uniqueId)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in New Tab"
                      className="btn-secondary rounded-lg p-1.5 text-slate-400 hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button
                      onClick={() => onSelectQuestion(q)}
                      className="text-slate-400 hover:text-white"
                      aria-label={`Open ${q.title}`}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-surface rounded-2xl p-5 lg:col-span-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-white">
                Moderated Interview Experiences
              </h2>
              <p className="text-xs text-slate-400">Verified &amp; community-reported round debriefs</p>
            </div>
            <button
              onClick={() => setShowExpModal(true)}
              className="btn-secondary inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Share Experience</span>
            </button>
          </div>

          <div className="space-y-3">
            {companyExperiences.length === 0 ? (
              <p className="py-6 text-xs text-slate-400">
                No published interview experiences for {activeCompany.name} yet. Be the first to submit a round debrief for moderation!
              </p>
            ) : (
              companyExperiences.map((exp) => (
                <div key={exp.id} className="inset-surface rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-white">
                      {exp.position} · {exp.experience}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-[11px] ${
                        exp.verificationStatus === 'verified' ? 'font-semibold text-white' : 'text-slate-400'
                      }`}
                    >
                      {exp.verificationStatus === 'verified' ? (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      {exp.verificationStatus === 'verified' ? 'Verified Interview' : 'Reported Experience'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {exp.location} · {exp.technology} · {exp.interviewDate}
                  </div>
                  <div className="mt-3 space-y-2">
                    {exp.roundsDetail.map((rd, idx) => (
                      <div key={idx} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2.5 text-xs">
                        <div className="font-semibold text-white">{rd.roundName}</div>
                        <p className="mt-0.5 text-slate-300">{rd.summary}</p>
                        {rd.questionsAsked.length > 0 && (
                          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-slate-400">
                            {rd.questionsAsked.map((qStr, qi) => (
                              <li key={qi}>{qStr}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Submit Experience Modal */}
      {showExpModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setShowExpModal(false)}
        >
          <form
            onSubmit={handleExperienceSubmit}
            onClick={(e) => e.stopPropagation()}
            className="glass-surface w-full max-w-lg rounded-2xl p-6 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-white">
                Submit {activeCompany.name} Interview Debrief
              </h3>
              <button type="button" onClick={() => setShowExpModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Submissions enter the moderation queue (`pending_review`) before public listing in the Company Portal.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={expRole}
                onChange={(e) => setExpRole(e.target.value)}
                placeholder="Position (e.g. Senior DE)"
                required
                className="inset-surface rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--border-strong)]"
              />
              <input
                value={expYears}
                onChange={(e) => setExpYears(e.target.value)}
                placeholder="Experience (e.g. 4-6 yrs)"
                required
                className="inset-surface rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--border-strong)]"
              />
              <input
                value={expLocation}
                onChange={(e) => setExpLocation(e.target.value)}
                placeholder="Location"
                className="inset-surface rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--border-strong)]"
              />
              <select
                value={expDiff}
                onChange={(e) => setExpDiff(e.target.value as Difficulty)}
                className="inset-surface rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--border-strong)]"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <input
              value={expRound}
              onChange={(e) => setExpRound(e.target.value)}
              placeholder="Round Name (e.g. Streaming System Design)"
              required
              className="inset-surface w-full rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--border-strong)]"
            />
            <input
              value={expTech}
              onChange={(e) => setExpTech(e.target.value)}
              placeholder="Technologies Tested (e.g. Spark, Kafka, Iceberg)"
              className="inset-surface w-full rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--border-strong)]"
            />
            <textarea
              rows={3}
              required
              value={expSummary}
              onChange={(e) => setExpSummary(e.target.value)}
              placeholder="Round summary & bar expectations..."
              className="inset-surface w-full rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--border-strong)]"
            />
            <textarea
              rows={2}
              value={expQuestions}
              onChange={(e) => setExpQuestions(e.target.value)}
              placeholder="Key questions asked (one per line)..."
              className="inset-surface w-full rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--border-strong)]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExpModal(false)}
                className="btn-secondary rounded-xl px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary rounded-xl px-4 py-2 text-xs font-semibold"
              >
                {submitting ? 'Submitting...' : 'Submit for Moderation'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
