import React, { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Layers,
  Loader2,
  MapPin,
  Mic,
  Radar,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type {
  JobApplicationStatus,
  JobTier,
  LiveJobPosting,
  MasterResumeProfile,
  ResumeTailorResult,
} from '../types/platform';
import {
  DEFAULT_MASTER_RESUME,
  loadJobApplications,
  loadMasterResume,
  saveJobApplications,
  saveMasterResume,
} from '../lib/firestoreService';

interface JobRadarViewProps {
  userId: string | null;
  onPracticeCompanyLoop: (companyName: string) => void;
  onSelectTopic?: (topicNameOrSlug: string) => void;
}

interface RadarScanCache {
  scannedAt: string;
  postings: GroundedJobCard[];
  groundingSources: Array<{ title: string; uri: string }>;
}

interface GroundedJobCard {
  id: string;
  company: string;
  tier: JobTier;
  roleCategory?: string;
  title: string;
  location: string;
  workMode: 'Remote' | 'Hybrid' | 'Onsite';
  yoeRequired: string;
  postedLabel: string;
  skills: string[];
  applyUrl: string;
  sourceDomain: string;
  salaryOrBand?: string;
  practiceCompany: string;
  verifiedGrounded?: boolean;
}

const LAST_SCAN_KEY = 'de360_job_radar_last_scan_v2';
const CACHE_PAYLOAD_KEY = 'de360_job_radar_cache_v2';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const ROLE_TRACK_OPTIONS = [
  'All Roles',
  'Core Data Engineer',
  'Snowflake / Analytics Engineer',
  'Big Data / Spark Engineer',
  'Cloud / Streaming / Platform DE',
] as const;

const COMPANY_TIER_OPTIONS: Array<'All' | JobTier> = [
  'All',
  'Tier 1',
  'Tier 2',
  'High-Growth / GCC',
];

const WORK_MODE_OPTIONS = [
  'All India',
  'Bengaluru',
  'Hyderabad / NCR / Pune',
  'Remote',
  'Hybrid',
] as const;

const TECH_STACK_CHIPS = [
  'All Stack',
  'Snowflake',
  'Databricks',
  'PySpark',
  'AWS',
  'Azure',
  'GCP',
  'dbt',
  'SQL',
  'Kafka',
  'Airflow',
] as const;

const RECENCY_OPTIONS = [
  'Anytime',
  'Last 24 Hours',
  'Last 7 Days',
  'Last 30 Days',
] as const;

const ATS_QUICK_LAUNCH_LINKS = [
  {
    label: 'LinkedIn Last 24h (3+ YOE India)',
    url: 'https://www.linkedin.com/jobs/search/?keywords=Data%20Engineer%20Spark%20OR%20Snowflake&location=India&f_TPR=r86400&f_E=4',
  },
  {
    label: 'Greenhouse Active DE Boards',
    url: 'https://www.google.com/search?q=site%3Aboards.greenhouse.io+%22Data+Engineer%22+India',
  },
  {
    label: 'Lever Active DE Boards',
    url: 'https://www.google.com/search?q=site%3Ajobs.lever.co+%22Data+Engineer%22+India',
  },
  {
    label: 'Ashby Active DE Boards',
    url: 'https://www.google.com/search?q=site%3Ajobs.ashbyhq.com+%22Data+Engineer%22+India',
  },
  {
    label: 'Instahyre DE 3-8 YOE',
    url: 'https://www.instahyre.com/data-engineering-jobs/',
  },
  {
    label: 'Naukri Senior Data Engineer',
    url: 'https://www.naukri.com/senior-data-engineer-jobs-in-bangalore-bengaluru',
  },
];

const PIPELINE_STATUSES: JobApplicationStatus[] = [
  'Saved',
  'Applied',
  'OA / Tech Screen',
  'On-Site',
  'Offer',
];

export function JobRadarView({
  userId,
  onPracticeCompanyLoop,
  onSelectTopic,
}: JobRadarViewProps) {
  const [activeTab, setActiveTab] = useState<'feed' | 'pipeline'>('feed');
  const [roleTrack, setRoleTrack] = useState<string>('All Roles');
  const [tierFilter, setTierFilter] = useState<'All' | JobTier>('All');
  const [locationFilter, setLocationFilter] = useState<string>('All India');
  const [techStackFilter, setTechStackFilter] = useState<string>('All Stack');
  const [postedRecency, setPostedRecency] = useState<string>('Anytime');
  const [searchQuery, setSearchQuery] = useState('');

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scannedAt, setScannedAt] = useState<string>('');
  const [postings, setPostings] = useState<GroundedJobCard[]>([]);
  const [groundingSources, setGroundingSources] = useState<Array<{ title: string; uri: string }>>([]);
  const [savedPipeline, setSavedPipeline] = useState<LiveJobPosting[]>([]);

  // Master Resume & AI ATS Tailor state
  const [resumeProfile, setResumeProfile] = useState<MasterResumeProfile>(DEFAULT_MASTER_RESUME);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [savingResume, setSavingResume] = useState(false);
  const [resumeSavedToast, setResumeSavedToast] = useState(false);

  const [tailorModalOpen, setTailorModalOpen] = useState(false);
  const [tailorTarget, setTailorTarget] = useState<{
    company: string;
    title: string;
    location: string;
    skills: string[];
  } | null>(null);
  const [tailoring, setTailoring] = useState(false);
  const [tailorError, setTailorError] = useState('');
  const [tailorResult, setTailorResult] = useState<ResumeTailorResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    loadJobApplications(userId)
      .then((items) => {
        if (Array.isArray(items)) setSavedPipeline(items);
      })
      .catch(() => {});
    loadMasterResume(userId)
      .then((res) => {
        if (res) setResumeProfile(res);
      })
      .catch(() => {});
  }, [userId]);

  const persistPipeline = async (next: LiveJobPosting[]) => {
    setSavedPipeline(next);
    await saveJobApplications(userId, next);
  };

  const handleSaveResume = async () => {
    setSavingResume(true);
    try {
      await saveMasterResume(userId, resumeProfile);
      setResumeSavedToast(true);
      setTimeout(() => setResumeSavedToast(false), 2200);
    } finally {
      setSavingResume(false);
    }
  };

  const handleCopyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const openTailorForJob = async (target: {
    company: string;
    title: string;
    location: string;
    skills: string[];
    summary?: string;
  }) => {
    setTailorTarget({
      company: target.company,
      title: target.title,
      location: target.location,
      skills: target.skills,
    });
    setTailorModalOpen(true);
    setTailoring(true);
    setTailorError('');
    setTailorResult(null);
    try {
      const resp = await fetch('/api/ai/tailor-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: resumeProfile.resumeText,
          coreSkills: resumeProfile.coreSkills,
          yoe: resumeProfile.yoe,
          jobTitle: target.title,
          company: target.company,
          jobLocation: target.location,
          jobSkills: target.skills,
          jobSummary: target.summary || `${target.company} — ${target.title} (${target.location})`,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to tailor resume');
      }
      setTailorResult(data as ResumeTailorResult);
    } catch (err) {
      setTailorError(err instanceof Error ? err.message : 'Unable to reach ATS Tailor service.');
    } finally {
      setTailoring(false);
    }
  };

  const runLiveScan = async () => {
    setScanning(true);
    setScanError('');
    try {
      const resp = await fetch('/api/jobs/radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleTrack,
          companyTier: tierFilter === 'All' ? 'All Employers' : tierFilter,
          workMode: locationFilter,
          techStack: techStackFilter === 'All Stack' ? [] : [techStackFilter],
          postedRecency,
          yoe: '3-6+ YOE',
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Live Google Search job scan failed');
      }
      const nextPostings: GroundedJobCard[] = Array.isArray(data.postings) ? data.postings : [];
      const nextSources: Array<{ title: string; uri: string }> = Array.isArray(data.groundingSources)
        ? data.groundingSources
        : [];
      const nowIso = data.scannedAt || new Date().toISOString();

      setPostings(nextPostings);
      setGroundingSources(nextSources);
      setScannedAt(nowIso);

      try {
        window.localStorage.setItem(LAST_SCAN_KEY, String(Date.now()));
        const cache: RadarScanCache = {
          scannedAt: nowIso,
          postings: nextPostings,
          groundingSources: nextSources,
        };
        window.localStorage.setItem(CACHE_PAYLOAD_KEY, JSON.stringify(cache));
      } catch {
        // Ignore storage errors
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Unable to fetch live grounded jobs right now.');
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const lastMs = Number(window.localStorage.getItem(LAST_SCAN_KEY) || '0');
      const cachedRaw = window.localStorage.getItem(CACHE_PAYLOAD_KEY);
      if (cachedRaw && Date.now() - lastMs < TWENTY_FOUR_HOURS_MS) {
        const parsed = JSON.parse(cachedRaw) as RadarScanCache;
        if (Array.isArray(parsed.postings) && parsed.postings.length > 0) {
          setPostings(parsed.postings);
          setGroundingSources(parsed.groundingSources || []);
          setScannedAt(parsed.scannedAt || '');
          return;
        }
      }
    } catch {
      // Proceed to fresh scan
    }
    runLiveScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPostings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return postings.filter((p) => {
      if (tierFilter !== 'All' && p.tier !== tierFilter) return false;
      if (roleTrack !== 'All Roles') {
        const hay = `${p.roleCategory || ''} ${p.title}`.toLowerCase();
        if (roleTrack.includes('Snowflake') && !/(snowflake|analytics|dbt|etl)/i.test(hay)) return false;
        if (roleTrack.includes('Big Data') && !/(big data|spark|pyspark|databricks|hadoop)/i.test(hay)) return false;
        if (roleTrack.includes('Cloud') && !/(cloud|streaming|kafka|flink|platform|azure|aws|gcp)/i.test(hay)) return false;
      }
      if (locationFilter === 'Bengaluru' && !/bengaluru|bangalore/i.test(p.location)) return false;
      if (locationFilter.includes('Hyderabad') && !/hyderabad|gurgaon|gurugram|noida|ncr|pune|delhi/i.test(p.location)) {
        return false;
      }
      if (locationFilter === 'Remote' && p.workMode !== 'Remote' && !/remote/i.test(p.location)) return false;
      if (locationFilter === 'Hybrid' && p.workMode !== 'Hybrid') return false;
      if (techStackFilter !== 'All Stack') {
        const combined = `${p.title} ${p.skills.join(' ')}`.toLowerCase();
        if (!combined.includes(techStackFilter.toLowerCase())) return false;
      }
      if (
        q &&
        !p.company.toLowerCase().includes(q) &&
        !p.title.toLowerCase().includes(q) &&
        !p.skills.some((s) => s.toLowerCase().includes(q)) &&
        !p.location.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [postings, tierFilter, roleTrack, locationFilter, techStackFilter, searchQuery]);

  const savedIds = useMemo(() => new Set(savedPipeline.map((j) => j.id)), [savedPipeline]);

  const handleSaveJob = async (job: GroundedJobCard) => {
    if (savedIds.has(job.id)) {
      setActiveTab('pipeline');
      return;
    }
    const mappedMode: LiveJobPosting['workMode'] =
      job.workMode === 'Remote'
        ? 'Remote'
        : /bengaluru|bangalore/i.test(job.location)
          ? 'Bengaluru'
          : job.workMode === 'Hybrid'
            ? 'Hybrid'
            : 'All India';
    const nextItem: LiveJobPosting = {
      id: job.id,
      company: job.company,
      tier: job.tier,
      roleCategory: job.roleCategory,
      role: job.title,
      experienceReq: job.yoeRequired,
      location: job.location,
      workMode: mappedMode,
      techStack: job.skills,
      postedHint: job.postedLabel,
      applyUrl: job.applyUrl,
      sourceTitle: job.sourceDomain,
      status: 'Saved',
      savedAt: new Date().toISOString(),
    };
    await persistPipeline([nextItem, ...savedPipeline]);
  };

  const handleStatusChange = async (id: string, status: JobApplicationStatus) => {
    await persistPipeline(savedPipeline.map((j) => (j.id === id ? { ...j, status } : j)));
  };

  const handleRemoveSaved = async (id: string) => {
    await persistPipeline(savedPipeline.filter((j) => j.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-surface rounded-[18px] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-300">
              <Radar className="h-4 w-4 text-white" />
              <span>BROAD GOOGLE SEARCH GROUNDED · PRODUCT, ENTERPRISE, GCCs &amp; STARTUPS (3+ YOE)</span>
            </div>
            <h1 className="mt-1.5 font-display text-2xl font-bold text-white">
              Live Data Engineer &amp; Adjacent Roles Job Radar
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Discovers real active openings across Data Engineer, Senior/Big Data, Snowflake, Analytics Engineer, Cloud DE, and ETL/Streaming roles via live web search — never fabricated links.
            </p>
            {scannedAt && (
              <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-slate-400">
                <Clock className="h-3.5 w-3.5 text-white" />
                <span>Last live scan: {new Date(scannedAt).toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <div className="inset-surface flex rounded-xl p-1 text-xs">
              <button
                onClick={() => setActiveTab('feed')}
                className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 font-semibold transition-colors ${
                  activeTab === 'feed' ? 'tab-active' : 'text-slate-400 hover:text-white'
                }`}
              >
                Live Discovery ({filteredPostings.length})
              </button>
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 font-semibold transition-colors ${
                  activeTab === 'pipeline' ? 'tab-active' : 'text-slate-400 hover:text-white'
                }`}
              >
                Application Pipeline ({savedPipeline.length})
              </button>
            </div>

            <button
              onClick={runLiveScan}
              disabled={scanning}
              className="btn-primary inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs disabled:opacity-60"
            >
              {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span>{scanning ? 'Scanning Web...' : 'Scan Live Jobs Now'}</span>
            </button>
          </div>
        </div>

        {/* 1-Click Live 24-Hour ATS Quick-Launch Bar */}
        <div className="mt-5 border-t border-white/[0.08] pt-4">
          <div className="mb-2 text-xs font-semibold text-slate-300">
            1-Click Live 24-Hour ATS &amp; Job Board Quick-Launch (Real External Queries)
          </div>
          <div className="flex flex-wrap gap-2">
            {ATS_QUICK_LAUNCH_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>{link.label}</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* My Master Resume Editor (Synced to Firestore & Used by ATS Tailor) */}
      <div className="glass-surface rounded-[18px] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="gradient-violet keep-white flex h-9 w-9 items-center justify-center rounded-xl">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-white">
                My Master Resume &amp; ATS Profile ({resumeProfile.yoe})
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-2xl">
                {resumeProfile.headline} · Stack: {resumeProfile.coreSkills}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setResumeOpen((o) => !o)}
            className="btn-secondary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold"
          >
            <span>{resumeOpen ? 'Hide Resume Editor' : 'Edit Master Resume'}</span>
            {resumeOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {resumeOpen && (
          <div className="mt-4 space-y-3 border-t border-white/[0.08] pt-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-400">Headline</label>
                <input
                  value={resumeProfile.headline}
                  onChange={(e) => setResumeProfile((p) => ({ ...p, headline: e.target.value }))}
                  className="inset-surface w-full rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-400">Experience (YOE)</label>
                <input
                  value={resumeProfile.yoe}
                  onChange={(e) => setResumeProfile((p) => ({ ...p, yoe: e.target.value }))}
                  className="inset-surface w-full rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-400">Core Skills</label>
                <input
                  value={resumeProfile.coreSkills}
                  onChange={(e) => setResumeProfile((p) => ({ ...p, coreSkills: e.target.value }))}
                  className="inset-surface w-full rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-400">
                Resume Experience Bullets &amp; Projects (used strictly as ground truth for ATS matching)
              </label>
              <textarea
                rows={5}
                value={resumeProfile.resumeText}
                onChange={(e) => setResumeProfile((p) => ({ ...p, resumeText: e.target.value }))}
                className="inset-surface w-full rounded-xl p-3 font-mono text-xs leading-relaxed text-white outline-none focus:border-[var(--accent-primary)]"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleSaveResume}
                disabled={savingResume}
                className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs"
              >
                {savingResume ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : resumeSavedToast ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>{resumeSavedToast ? 'Saved to Firestore' : 'Save Master Resume'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'feed' && (
        <>
          {/* 5 Smart Filter Controls */}
          <div className="glass-surface rounded-[18px] p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="relative">
                <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Company, role, location or skill..."
                  className="inset-surface w-full rounded-xl py-2 pr-3 pl-9 text-xs text-white placeholder-slate-500 outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <select
                value={roleTrack}
                onChange={(e) => setRoleTrack(e.target.value)}
                aria-label="Role Track Filter"
                className="inset-surface rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-[var(--accent-primary)]"
              >
                {ROLE_TRACK_OPTIONS.map((rt) => (
                  <option key={rt} value={rt}>
                    Role: {rt}
                  </option>
                ))}
              </select>

              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                aria-label="Work Mode and City Filter"
                className="inset-surface rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-[var(--accent-primary)]"
              >
                {WORK_MODE_OPTIONS.map((wm) => (
                  <option key={wm} value={wm}>
                    Location: {wm}
                  </option>
                ))}
              </select>

              <select
                value={postedRecency}
                onChange={(e) => setPostedRecency(e.target.value)}
                aria-label="Posted Recency Filter"
                className="inset-surface rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-[var(--accent-primary)]"
              >
                {RECENCY_OPTIONS.map((rec) => (
                  <option key={rec} value={rec}>
                    Recency: {rec}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Company Tiers */}
              <div className="inset-surface flex flex-wrap rounded-xl p-0.5 text-xs">
                {COMPANY_TIER_OPTIONS.map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setTierFilter(tier)}
                    className={`whitespace-nowrap rounded-lg px-3 py-1 font-medium transition-colors ${
                      tierFilter === tier ? 'tab-active' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tier === 'All' ? 'All Tiers' : tier}
                  </button>
                ))}
              </div>

              {/* Tech Stack Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {TECH_STACK_CHIPS.map((chip) => {
                  const active = techStackFilter === chip;
                  return (
                    <button
                      key={chip}
                      onClick={() => setTechStackFilter(chip)}
                      className={`whitespace-nowrap rounded-lg border px-2.5 py-1 font-mono text-[11px] font-medium transition-colors ${
                        active
                          ? 'tab-active border-transparent'
                          : 'inset-surface text-slate-300 hover:border-[var(--border-strong)]'
                      }`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {scanError && (
            <div className="inset-surface rounded-2xl p-4 text-xs text-slate-300">
              <div className="font-semibold text-white">Live Grounded Search Notice</div>
              <p className="mt-1">{scanError}</p>
            </div>
          )}

          {scanning && postings.length === 0 ? (
            <div className="glass-surface flex flex-col items-center justify-center rounded-[18px] py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <p className="mt-3 font-display text-sm font-semibold text-white">
                Querying live Google Search grounding for active 3+ YOE Data Engineering roles...
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Inspecting verified career portals, Greenhouse, Lever, and Ashby boards across Product, SaaS &amp; GCCs
              </p>
            </div>
          ) : filteredPostings.length === 0 ? (
            <div className="glass-surface rounded-[18px] p-8 text-center">
              <Briefcase className="mx-auto h-8 w-8 text-slate-500" />
              <p className="mt-3 text-sm font-medium text-white">
                No grounded postings matched your active filter combination.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Reset Stack/Role filters, use the 1-Click Live 24h ATS links above, or click &ldquo;Scan Live Jobs Now&rdquo;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredPostings.map((job) => {
                const isSaved = savedIds.has(job.id);
                return (
                  <div key={job.id} className="glass-surface glass-surface-hover flex flex-col justify-between space-y-4 rounded-[18px] p-5">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 font-semibold text-white">
                              <Building2 className="h-3.5 w-3.5" />
                              {job.company}
                            </span>
                            <span className="inset-surface rounded-md px-2 py-0.5 font-mono text-[10px] font-bold text-slate-300">
                              {job.tier}
                            </span>
                            {job.roleCategory && (
                              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-slate-200">
                                {job.roleCategory}
                              </span>
                            )}
                            <span className="font-mono text-[11px] text-slate-300">
                              {job.yoeRequired}
                            </span>
                          </div>
                          <h2 className="mt-1.5 font-display text-base font-bold text-white">{job.title}</h2>
                        </div>

                        <span className="inset-surface shrink-0 rounded-lg px-2 py-1 font-mono text-[10px] text-slate-300">
                          {job.sourceDomain}
                        </span>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-white" />
                          {job.location} ({job.workMode})
                        </span>
                        <span>· {job.postedLabel}</span>
                        {job.salaryOrBand && <span className="font-semibold text-slate-300">· {job.salaryOrBand}</span>}
                      </div>

                      {/* Clickable Tech Stack Buttons -> DE Concepts & MCQs */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {job.skills.map((sk) => (
                          <button
                            key={sk}
                            type="button"
                            onClick={() => onSelectTopic?.(sk)}
                            title={`Study ${sk} concepts & MCQs`}
                            className="btn-secondary inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px]"
                          >
                            <Layers className="h-2.5 w-2.5" />
                            <span>{sk}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.08] pt-3">
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs"
                      >
                        <span>Apply Directly</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>

                      <button
                        onClick={() =>
                          openTailorForJob({
                            company: job.company,
                            title: job.title,
                            location: `${job.location} (${job.workMode})`,
                            skills: job.skills,
                            summary: `${job.roleCategory || ''} · ${job.yoeRequired} · ${job.salaryOrBand || ''}`,
                          })
                        }
                        className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-[#C084FC]" />
                        <span>Tailor Resume &amp; Outreach</span>
                      </button>

                      <button
                        onClick={() => onPracticeCompanyLoop(job.practiceCompany || job.company)}
                        className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold"
                      >
                        <Mic className="h-3.5 w-3.5" />
                        <span>Practice {job.practiceCompany || job.company} Loop</span>
                      </button>

                      <button
                        onClick={() => handleSaveJob(job)}
                        className={`ml-auto inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                          isSaved
                            ? 'tab-active border-transparent'
                            : 'btn-secondary'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{isSaved ? 'In Pipeline' : 'Save & Track'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Grounding Citations */}
          {groundingSources.length > 0 && (
            <div className="glass-surface rounded-[18px] p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white">
                <ShieldCheck className="h-4 w-4" />
                <span>Verified Google Search Grounding Sources ({groundingSources.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {groundingSources.slice(0, 12).map((src, i) => (
                  <a
                    key={`${src.uri}-${i}`}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px]"
                  >
                    <span className="max-w-[220px] truncate">{src.title}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'pipeline' && (
        <div className="glass-surface rounded-[18px] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-white">Saved &amp; Application Pipeline</h2>
              <p className="text-xs text-slate-400">
                Track applications from Saved → Applied → OA / Tech Screen → On-Site → Offer (synced to Firestore)
              </p>
            </div>
          </div>

          {savedPipeline.length === 0 ? (
            <div className="inset-surface rounded-xl p-8 text-center text-xs text-slate-400">
              No saved jobs yet. Click &ldquo;Save &amp; Track&rdquo; on any live job card in Discovery to track your funnel.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {savedPipeline.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-white">{item.company}</span>
                      <span className="font-mono text-[10px] text-slate-400">{item.tier}</span>
                      <span className="text-slate-400">· {item.location}</span>
                    </div>
                    <div className="mt-0.5 truncate text-sm font-bold text-white">{item.role}</div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <select
                      value={item.status || 'Saved'}
                      onChange={(e) => handleStatusChange(item.id, e.target.value as JobApplicationStatus)}
                      className="inset-surface rounded-xl px-3 py-1.5 text-xs font-medium text-white outline-none focus:border-[var(--accent-primary)]"
                    >
                      {PIPELINE_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() =>
                        openTailorForJob({
                          company: item.company,
                          title: item.role,
                          location: item.location,
                          skills: item.techStack || [],
                        })
                      }
                      className="btn-secondary inline-flex items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#C084FC]" />
                      <span>Tailor Resume</span>
                    </button>

                    <button
                      onClick={() => onPracticeCompanyLoop(item.company)}
                      className="btn-secondary inline-flex items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                    >
                      <Mic className="h-3.5 w-3.5" />
                      <span>Mock Loop</span>
                    </button>

                    <a
                      href={item.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary inline-flex items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs"
                    >
                      <span>Link</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>

                    <button
                      onClick={() => handleRemoveSaved(item.id)}
                      className="btn-secondary rounded-xl p-1.5 text-slate-400 hover:text-white"
                      title="Remove from pipeline"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Resume ATS Matcher & LinkedIn Outreach Modal */}
      {tailorModalOpen && tailorTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setTailorModalOpen(false)}
        >
          <div
            className="glass-surface max-h-[88vh] w-full max-w-2xl overflow-y-auto p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b bento-divider pb-3">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-[#C084FC]">
                  AI Resume &amp; ATS Matcher + Cold Outreach
                </div>
                <h2 className="mt-0.5 font-display text-lg font-bold text-white">
                  {tailorTarget.company} — {tailorTarget.title}
                </h2>
                <p className="text-xs text-slate-400">{tailorTarget.location}</p>
              </div>
              <button
                type="button"
                onClick={() => setTailorModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {tailoring ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Loader2 className="h-7 w-7 animate-spin text-[#8B5CF6]" />
                <p className="mt-3 text-sm font-semibold text-white">
                  Scoring ATS alignment against {tailorTarget.company}&apos;s stack...
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Generating zero-fabrication resume bullets and 3-sentence recruiter outreach
                </p>
              </div>
            ) : tailorError ? (
              <div className="rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 p-4 text-xs text-[#EF4444]">
                {tailorError}
              </div>
            ) : tailorResult ? (
              <div className="space-y-4">
                {/* Score & Keywords */}
                <div className="inset-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4">
                  <div>
                    <div className="text-xs text-slate-400">ATS Resume Alignment Score</div>
                    <div className="mt-0.5 font-mono text-3xl font-bold text-white tabular-nums">
                      {tailorResult.atsScore}%
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 min-w-[220px]">
                    {tailorResult.matchedKeywords.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-[#22C55E]">MATCHED:</span>
                        {tailorResult.matchedKeywords.slice(0, 8).map((kw) => (
                          <span
                            key={kw}
                            className="rounded-full border border-[#22C55E]/35 bg-[#22C55E]/10 px-2 py-0.5 font-mono text-[10px] text-[#22C55E]"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                    {tailorResult.missingKeywords.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-[#F59E0B]">GAPS (CLICK TO STUDY):</span>
                        {tailorResult.missingKeywords.slice(0, 8).map((kw) => (
                          <button
                            key={kw}
                            type="button"
                            onClick={() => {
                              setTailorModalOpen(false);
                              onSelectTopic?.(kw);
                            }}
                            className="rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-2 py-0.5 font-mono text-[10px] text-[#F59E0B] hover:bg-[#F59E0B]/20"
                          >
                            {kw} →
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tailored Resume Bullets */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-white">
                    ATS-Ready Rewritten Bullets (Zero-Fabrication)
                  </div>
                  {tailorResult.tailoredBullets.map((b, i) => (
                    <div key={i} className="inset-surface rounded-xl p-3 text-xs space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#C084FC]">
                          {b.originalFocus}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(`bullet_${i}`, b.rewrittenBullet)}
                          className="btn-secondary inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px]"
                        >
                          {copiedKey === `bullet_${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedKey === `bullet_${i}` ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <p className="leading-relaxed text-white">{b.rewrittenBullet}</p>
                    </div>
                  ))}
                </div>

                {/* LinkedIn Cold Outreach Message */}
                <div className="inset-surface rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white">
                      3-Sentence LinkedIn Cold Outreach Note ({tailorTarget.company})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText('outreach', tailorResult.outreachMessage)}
                      className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs"
                    >
                      {copiedKey === 'outreach' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedKey === 'outreach' ? 'Copied Note' : 'Copy Outreach Note'}</span>
                    </button>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-200">{tailorResult.outreachMessage}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
