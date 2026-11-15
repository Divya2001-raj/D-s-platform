import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { AnimatePresence, motion } from 'motion/react';
import {
  BookOpen,
  Briefcase,
  Building2,
  Code2,
  Cpu,
  Database,
  FileSearch,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  Mic,
  NotebookPen,
  Search,
  Settings,
  UserCircle2,
  X,
} from 'lucide-react';
import {
  ALL_COMPANY_PORTALS,
  ALL_SEED_QUESTIONS,
  SEED_EXPERIENCES,
  SEED_KNOWLEDGE_TOPICS,
  SEED_PRODUCTION_SCENARIOS,
} from './data';
import type {
  AppRoute,
  CopilotContext,
  CopilotMessage,
  ExperienceTier,
  InterviewExperience,
  Question,
  SM2Item,
  UserNote,
  UserProfile,
  UserProgress,
} from './types/platform';
import { auth, testFirestoreConnection } from './lib/firebase';
import {
  calculateNextSM2,
  checkIsAdmin,
  deleteQuestionFromFirestore,
  deleteUserNote,
  ensureUserDocuments,
  fetchCustomQuestions,
  fetchInterviewExperiences,
  fetchPendingExperiencesForAdmin,
  moderateInterviewExperience,
  saveBatchQuestionsToFirestore,
  saveCopilotTurn,
  saveUserNote,
  saveUserSubmission,
  submitInterviewExperience,
  subscribeCopilotHistory,
  subscribeUserNotes,
  updateUserProfile,
  updateUserProgress,
} from './lib/firestoreService';
import { BrandMark } from './components/BrandMark';
import { AuthModal } from './components/AuthModal';
import { CommandPalette } from './components/CommandPalette';
import { CopilotDrawer } from './components/CopilotDrawer';
import { DashboardView } from './components/DashboardView';
import { RoadmapsView } from './components/RoadmapsView';
import { SqlArenaView } from './components/SqlArenaView';
import { PythonArenaView } from './components/PythonArenaView';
import { KnowledgeHubView } from './components/KnowledgeHubView';
import { CompanyHubsView } from './components/CompanyHubsView';
import { SystemDesignStudioView } from './components/SystemDesignStudioView';
import { MockInterviewView } from './components/MockInterviewView';
import { JdAnalyzerView } from './components/JdAnalyzerView';
import { NotebookView } from './components/NotebookView';
import { AdminCmsView } from './components/AdminCmsView';

const DEFAULT_PROFILE: UserProfile = {
  uid: 'guest',
  displayName: 'Guest Engineer',
  experienceTier: '4-6 yrs',
  targetPositions: ['Senior Data Engineer', 'Data Engineer II'],
  targetCompanies: ['Google', 'Databricks', 'Uber', 'Snowflake', 'PhonePe'],
  dailyStreak: 1,
  studyHours: 2.5,
  readinessMetrics: {},
};

const DEFAULT_PROGRESS: UserProgress = {
  uid: 'guest',
  attemptedIds: [],
  solvedIds: [],
  bookmarks: [],
  completedTopics: [],
  topicAccuracy: {},
  sm2Queue: [],
};

const NAV_ITEMS: Array<{ id: AppRoute; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Readiness Hub', icon: LayoutDashboard },
  { id: 'roadmaps', label: 'Study Roadmaps', icon: MapIcon },
  { id: 'sql-arena', label: 'SQL Arena', icon: Database },
  { id: 'python-arena', label: 'Python & DSA', icon: Code2 },
  { id: 'labs', label: 'PySpark & Labs', icon: FlaskConical },
  { id: 'knowledge', label: 'Knowledge Hub', icon: BookOpen },
  { id: 'companies', label: 'Company Portals', icon: Building2 },
  { id: 'system-design', label: 'System Design', icon: Cpu },
  { id: 'scenarios', label: 'Incident Labs', icon: Briefcase },
  { id: 'mock-interview', label: 'AI Voice Mock', icon: Mic },
  { id: 'jd-analyzer', label: 'JD Analyser', icon: FileSearch },
  { id: 'notebook', label: 'Answer Notebook', icon: NotebookPen },
];

export default function App() {
  const initialRoute: AppRoute =
    typeof window !== 'undefined' && window.location.pathname === '/admin' ? 'admin' : 'dashboard';

  const [route, setRoute] = useState<AppRoute>(initialRoute);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [customQuestions, setCustomQuestions] = useState<Question[]>([]);
  const [experiences, setExperiences] = useState<InterviewExperience[]>(SEED_EXPERIENCES);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([]);

  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(ALL_SEED_QUESTIONS[0]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>(SEED_KNOWLEDGE_TOPICS[0].id);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(ALL_COMPANY_PORTALS[0].id);
  const [liveCode, setLiveCode] = useState('');
  const [liveError, setLiveError] = useState('');

  // Merge launch seed (126 questions) + Firestore custom/AI questions without duplicates
  const allQuestions = useMemo(() => {
    const map = new Map<string, Question>();
    for (const q of ALL_SEED_QUESTIONS) map.set(q.uniqueId, q);
    for (const q of customQuestions) map.set(q.uniqueId, q);
    return Array.from(map.values());
  }, [customQuestions]);

  // Boot Firestore connection check + load public curriculum extensions
  useEffect(() => {
    testFirestoreConnection();
    fetchCustomQuestions()
      .then((qs) => {
        if (qs.length > 0) setCustomQuestions(qs);
      })
      .catch(() => {});
    fetchInterviewExperiences()
      .then((exps) => {
        if (exps.length > 0) {
          const merged = new Map<string, InterviewExperience>();
          for (const e of SEED_EXPERIENCES) merged.set(e.id, e);
          for (const e of exps) merged.set(e.id, e);
          setExperiences(Array.from(merged.values()));
        }
      })
      .catch(() => {});
  }, []);

  // Keyboard shortcuts: Cmd+K (Search), Cmd+J (AI Copilot)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((o) => !o);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setCopilotOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Firebase Auth subscription & Firestore state sync
  useEffect(() => {
    let unsubNotes: (() => void) | undefined;
    let unsubChat: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (unsubNotes) unsubNotes();
      if (unsubChat) unsubChat();

      if (!fbUser) {
        setIsAdmin(false);
        setProfile(DEFAULT_PROFILE);
        setProgress(DEFAULT_PROGRESS);
        return;
      }

      try {
        const [{ profile: prof, progress: prog }, adminFlag] = await Promise.all([
          ensureUserDocuments(fbUser),
          checkIsAdmin(fbUser),
        ]);
        setProfile(prof);
        setProgress(prog);
        setIsAdmin(adminFlag);

        if (adminFlag) {
          fetchPendingExperiencesForAdmin()
            .then((allExps) => {
              const merged = new Map<string, InterviewExperience>();
              for (const e of SEED_EXPERIENCES) merged.set(e.id, e);
              for (const e of allExps) merged.set(e.id, e);
              setExperiences(Array.from(merged.values()));
            })
            .catch(() => {});
        }

        unsubNotes = subscribeUserNotes(fbUser.uid, setNotes);
        unsubChat = subscribeCopilotHistory(fbUser.uid, setCopilotMessages);
      } catch (err) {
        console.error('Auth sync error:', err);
      }
    });

    return () => {
      unsubAuth();
      if (unsubNotes) unsubNotes();
      if (unsubChat) unsubChat();
    };
  }, []);

  const navigate = (next: AppRoute) => {
    setRoute(next);
    setMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
      const nextPath = next === 'admin' ? '/admin' : '/';
      if (window.location.pathname !== nextPath) {
        window.history.pushState({}, '', nextPath);
      }
    }
  };

  const handleSelectQuestion = (q: Question) => {
    setSelectedQuestion(q);
    if (q.domain === 'Analytical SQL') {
      navigate('sql-arena');
    } else if (q.domain === 'PySpark & Distributed' || q.domain === 'Engineering Labs') {
      navigate('labs');
    } else {
      navigate('python-arena');
    }
  };

  const handleChangeExperienceTier = async (tier: ExperienceTier) => {
    setProfile((p) => ({ ...p, experienceTier: tier }));
    if (user) {
      await updateUserProfile(user.uid, { experienceTier: tier }).catch(() => {});
    }
  };

  const handleMarkSolved = async (q: Question, code: string, runtimeMs: number) => {
    const nextAttempted = Array.from(new Set([...progress.attemptedIds, q.uniqueId]));
    const nextSolved = Array.from(new Set([...progress.solvedIds, q.uniqueId]));
    const nextHours = Number((profile.studyHours + 0.25).toFixed(2));
    setProgress((p) => ({ ...p, attemptedIds: nextAttempted, solvedIds: nextSolved }));
    setProfile((p) => ({ ...p, studyHours: nextHours }));

    if (user) {
      await Promise.all([
        updateUserProgress(user.uid, { attemptedIds: nextAttempted, solvedIds: nextSolved }),
        updateUserProfile(user.uid, { studyHours: nextHours }),
        saveUserSubmission(user.uid, {
          questionId: q.uniqueId,
          language: q.domain === 'Analytical SQL' ? 'sql' : 'python',
          code,
          passed: true,
          runtimeMs,
        }),
      ]).catch(() => {});
    }
  };

  const handleToggleBookmark = async (id: string) => {
    const exists = progress.bookmarks.includes(id);
    const next = exists ? progress.bookmarks.filter((b) => b !== id) : [...progress.bookmarks, id];
    setProgress((p) => ({ ...p, bookmarks: next }));
    if (user) {
      await updateUserProgress(user.uid, { bookmarks: next }).catch(() => {});
    }
  };

  const handleToggleCompleteTopic = async (id: string) => {
    const exists = progress.completedTopics.includes(id);
    const next = exists ? progress.completedTopics.filter((t) => t !== id) : [...progress.completedTopics, id];
    setProgress((p) => ({ ...p, completedTopics: next }));
    if (user) {
      await updateUserProgress(user.uid, { completedTopics: next }).catch(() => {});
    }
  };

  const handleScheduleSM2 = async (q: Question) => {
    const existing = progress.sm2Queue.find((item) => item.itemId === q.uniqueId);
    const updatedItem = calculateNextSM2(existing, 4, {
      itemId: q.uniqueId,
      title: q.title,
      domain: q.domain,
    });
    // Set first scheduled review immediately due if brand new so user sees it in queue
    if (!existing) {
      updatedItem.nextReviewAt = Date.now() - 1000;
    }
    const nextQueue = [
      ...progress.sm2Queue.filter((item) => item.itemId !== q.uniqueId),
      updatedItem,
    ];
    setProgress((p) => ({ ...p, sm2Queue: nextQueue }));
    if (user) {
      await updateUserProgress(user.uid, { sm2Queue: nextQueue }).catch(() => {});
    }
  };

  const handleRateSM2 = async (item: SM2Item, quality: number) => {
    const updated = calculateNextSM2(item, quality, {
      itemId: item.itemId,
      title: item.title,
      domain: item.domain,
    });
    const nextQueue = [
      ...progress.sm2Queue.filter((x) => x.itemId !== item.itemId),
      updated,
    ];
    setProgress((p) => ({ ...p, sm2Queue: nextQueue }));
    if (user) {
      await updateUserProgress(user.uid, { sm2Queue: nextQueue }).catch(() => {});
    }
  };

  const handleAddGeneratedQuestions = async (qs: Question[]) => {
    setCustomQuestions((prev) => [...qs, ...prev]);
    if (user) {
      await saveBatchQuestionsToFirestore(qs, user.uid).catch(() => {});
    }
    if (qs[0]) {
      handleSelectQuestion(qs[0]);
    }
  };

  const handleSaveToNotebook = async (
    title: string,
    content: string,
    topic: string,
    source: UserNote['source'] = 'ai_copilot',
  ) => {
    if (user) {
      await saveUserNote(user.uid, { title, content, topic, source });
    } else {
      const localNote: UserNote = {
        id: `local_${Date.now()}`,
        uid: 'guest',
        title,
        content,
        topic,
        source,
        createdAt: new Date().toISOString(),
      };
      setNotes((prev) => [localNote, ...prev]);
    }
  };

  const handleCopilotTurn = async (userMsg: string, assistantMsg: string, contextLabel: string) => {
    const nowIso = new Date().toISOString();
    const uTurn: CopilotMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: userMsg,
      contextLabel,
      createdAt: nowIso,
    };
    const aTurn: CopilotMessage = {
      id: `a_${Date.now() + 1}`,
      role: 'assistant',
      content: assistantMsg,
      contextLabel,
      createdAt: nowIso,
    };
    setCopilotMessages((prev) => [...prev, uTurn, aTurn]);
    if (user) {
      await saveCopilotTurn(user.uid, { role: 'user', content: userMsg, contextLabel }).catch(() => {});
      await saveCopilotTurn(user.uid, { role: 'assistant', content: assistantMsg, contextLabel }).catch(() => {});
    }
  };

  const activeCopilotContext: CopilotContext = useMemo(() => {
    if (route === 'sql-arena' || route === 'python-arena' || route === 'labs') {
      return {
        view: route,
        title: selectedQuestion?.title || 'Coding Arena',
        domain: selectedQuestion?.domain || 'Data Engineering',
        experienceTier: profile.experienceTier,
        code: liveCode,
        errorOutput: liveError,
        schema: selectedQuestion?.setupSchemaOrEnv || '',
      };
    }
    if (route === 'knowledge') {
      const t = SEED_KNOWLEDGE_TOPICS.find((x) => x.id === selectedTopicId);
      return {
        view: 'Knowledge Hub',
        title: t?.title || 'Technical Documentation',
        domain: t?.domain || 'Architecture',
        experienceTier: profile.experienceTier,
        extra: t?.summary,
      };
    }
    if (route === 'companies') {
      const c = ALL_COMPANY_PORTALS.find((x) => x.id === selectedCompanyId);
      return {
        view: 'Company Portal',
        title: `${c?.name || 'Company'} Data Engineering Loop`,
        domain: c?.primaryStack.join(', ') || 'Tier 1 Loop',
        experienceTier: profile.experienceTier,
        extra: c?.interviewPhilosophy,
      };
    }
    return {
      view: route,
      title: 'D\'s platforms — DATA ENGINEER 360',
      domain: 'Full-Stack Data Engineering',
      experienceTier: profile.experienceTier,
    };
  }, [route, selectedQuestion, profile.experienceTier, liveCode, liveError, selectedTopicId, selectedCompanyId]);

  const currentNavLabel =
    NAV_ITEMS.find((n) => n.id === route)?.label || (route === 'admin' ? 'Admin CMS' : 'Workspace');

  return (
    <div className="aurora-canvas min-h-screen text-[#F1F5F9]">
      <div className="flex min-h-screen">
        {/* Desktop Collapsible Sidebar */}
        <aside
          className={`hidden shrink-0 border-r border-white/[0.08] bg-[#07080C]/85 backdrop-blur-xl transition-all duration-200 lg:flex lg:flex-col ${
            sidebarOpen ? 'w-64' : 'w-[74px]'
          }`}
        >
          <div className="flex h-16 items-center justify-between border-b border-white/[0.08] px-4">
            <button
              onClick={() => navigate('dashboard')}
              className="flex min-w-0 items-center gap-3 text-left"
            >
              <BrandMark size={32} />
              {sidebarOpen && (
                <div className="min-w-0">
                  <div className="truncate font-display text-sm font-bold text-white">D&apos;s platforms</div>
                  <div className="truncate font-mono text-[10px] tracking-wider text-[#2DD4BF]">
                    DATA ENGINEER 360
                  </div>
                </div>
              )}
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-4">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = route === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  title={item.label}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-gradient-to-r from-[#2DD4BF]/15 to-[#818CF8]/15 text-white border border-[#2DD4BF]/30'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#2DD4BF]' : ''}`} />
                  {sidebarOpen && <span className="truncate whitespace-nowrap">{item.label}</span>}
                </button>
              );
            })}

            {isAdmin && (
              <button
                onClick={() => navigate('admin')}
                title="Admin CMS"
                className={`mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors ${
                  route === 'admin'
                    ? 'bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-white border border-transparent'
                }`}
              >
                <Settings className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span className="truncate whitespace-nowrap">Admin CMS</span>}
              </button>
            )}
          </nav>

          <div className="border-t border-white/[0.08] p-3">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.02] py-2 text-xs text-slate-400 transition-colors hover:text-white"
            >
              {sidebarOpen ? 'Collapse Sidebar' : '»'}
            </button>
          </div>
        </aside>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className="flex h-full w-72 flex-col border-r border-white/10 bg-[#07080C] p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <BrandMark size={28} />
                    <span className="font-display text-sm font-bold text-white">DATA ENGINEER 360</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <nav className="flex-1 space-y-1 overflow-y-auto">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium ${
                          route === item.id ? 'bg-white/10 text-[#2DD4BF]' : 'text-slate-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                  {isAdmin && (
                    <button
                      onClick={() => navigate('admin')}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-[#FBBF24]"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Admin CMS</span>
                    </button>
                  )}
                </nav>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Viewport */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Clean Top Bar Contract: Zone 1 (Mobile trigger + Workspace) — Zone 2 (Search Cmd+K) — Zone 3 (Account CTA) */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-8 border-b border-white/[0.08] bg-[#07080C]/75 px-4 backdrop-blur-xl sm:px-6">
            <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/5 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <span className="font-display text-sm font-semibold text-white">{currentNavLabel}</span>
            </div>

            <button
              onClick={() => setCmdOpen(true)}
              className="hidden max-w-md flex-1 items-center justify-between rounded-xl border border-white/10 bg-[#10121A]/80 px-3.5 py-2 text-xs text-slate-400 transition-colors hover:border-white/25 md:flex"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 text-[#2DD4BF]" />
                <span>Search 126+ SQL/Python problems, companies, Knowledge Hub...</span>
              </span>
              <span className="ml-3 shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-slate-400">
                ⌘K
              </span>
            </button>

            <div className="flex items-center gap-3 shrink-0">
              {user ? (
                <div className="flex items-center gap-2.5">
                  <span className="hidden text-xs font-medium text-slate-300 sm:inline whitespace-nowrap">
                    {profile.displayName}
                  </span>
                  <button
                    onClick={() => signOut(auth)}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#2DD4BF] to-[#818CF8] px-4 py-2 text-xs font-semibold text-[#07080C] hover:opacity-95"
                >
                  <UserCircle2 className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 pb-24 sm:p-6">
            {route === 'dashboard' && (
              <DashboardView
                profile={profile}
                progress={progress}
                questions={allQuestions}
                onChangeExperienceTier={handleChangeExperienceTier}
                onNavigate={navigate}
                onSelectQuestion={handleSelectQuestion}
                onRateSM2={handleRateSM2}
              />
            )}

            {route === 'roadmaps' && (
              <RoadmapsView
                questions={allQuestions}
                solvedIds={progress.solvedIds}
                experienceTier={profile.experienceTier}
                onSelectQuestion={handleSelectQuestion}
                onAddGeneratedQuestions={handleAddGeneratedQuestions}
              />
            )}

            {route === 'sql-arena' && (
              <SqlArenaView
                questions={allQuestions}
                selectedQuestion={selectedQuestion}
                onSelectQuestion={setSelectedQuestion}
                solvedIds={progress.solvedIds}
                bookmarks={progress.bookmarks}
                experienceTier={profile.experienceTier}
                onMarkSolved={handleMarkSolved}
                onToggleBookmark={handleToggleBookmark}
                onScheduleSM2={handleScheduleSM2}
                onAddGeneratedQuestions={handleAddGeneratedQuestions}
                onContextUpdate={(c, e) => {
                  setLiveCode(c);
                  setLiveError(e);
                }}
                onOpenCopilotWithPrompt={() => setCopilotOpen(true)}
              />
            )}

            {route === 'python-arena' && (
              <PythonArenaView
                mode="python"
                questions={allQuestions}
                selectedQuestion={selectedQuestion}
                onSelectQuestion={setSelectedQuestion}
                solvedIds={progress.solvedIds}
                bookmarks={progress.bookmarks}
                experienceTier={profile.experienceTier}
                onMarkSolved={handleMarkSolved}
                onToggleBookmark={handleToggleBookmark}
                onScheduleSM2={handleScheduleSM2}
                onAddGeneratedQuestions={handleAddGeneratedQuestions}
                onContextUpdate={(c, e) => {
                  setLiveCode(c);
                  setLiveError(e);
                }}
                onOpenCopilotWithPrompt={() => setCopilotOpen(true)}
              />
            )}

            {route === 'labs' && (
              <PythonArenaView
                mode="labs"
                questions={allQuestions}
                selectedQuestion={selectedQuestion}
                onSelectQuestion={setSelectedQuestion}
                solvedIds={progress.solvedIds}
                bookmarks={progress.bookmarks}
                experienceTier={profile.experienceTier}
                onMarkSolved={handleMarkSolved}
                onToggleBookmark={handleToggleBookmark}
                onScheduleSM2={handleScheduleSM2}
                onAddGeneratedQuestions={handleAddGeneratedQuestions}
                onContextUpdate={(c, e) => {
                  setLiveCode(c);
                  setLiveError(e);
                }}
                onOpenCopilotWithPrompt={() => setCopilotOpen(true)}
              />
            )}

            {route === 'knowledge' && (
              <KnowledgeHubView
                topics={SEED_KNOWLEDGE_TOPICS}
                selectedTopicId={selectedTopicId}
                onSelectTopic={setSelectedTopicId}
                questions={allQuestions}
                completedTopics={progress.completedTopics}
                bookmarks={progress.bookmarks}
                onToggleCompleteTopic={handleToggleCompleteTopic}
                onToggleBookmark={handleToggleBookmark}
                onSelectQuestion={handleSelectQuestion}
                onSaveToNotebook={(title, content, topic) =>
                  handleSaveToNotebook(title, content, topic, 'knowledge_hub')
                }
              />
            )}

            {route === 'companies' && (
              <CompanyHubsView
                companies={ALL_COMPANY_PORTALS}
                selectedCompanyId={selectedCompanyId}
                onSelectCompany={setSelectedCompanyId}
                questions={allQuestions}
                experiences={experiences}
                experienceTier={profile.experienceTier}
                onSelectQuestion={handleSelectQuestion}
                onAddGeneratedQuestions={handleAddGeneratedQuestions}
                onSubmitExperience={async (exp) => {
                  if (!user) {
                    setAuthModalOpen(true);
                    return;
                  }
                  const id = await submitInterviewExperience(user.uid, exp);
                  setExperiences((prev) => [
                    { ...exp, id, authorId: user.uid, verificationStatus: 'pending_review' },
                    ...prev,
                  ]);
                }}
              />
            )}

            {(route === 'system-design' || route === 'scenarios') && (
              <SystemDesignStudioView
                key={route}
                scenarios={SEED_PRODUCTION_SCENARIOS}
                initialTab={route === 'scenarios' ? 'scenarios' : 'studio'}
                onSaveToNotebook={(title, content, topic) =>
                  handleSaveToNotebook(title, content, topic, 'ai_copilot')
                }
              />
            )}

            {route === 'mock-interview' && (
              <MockInterviewView
                experienceTier={profile.experienceTier}
                onSaveToNotebook={(title, content, topic) =>
                  handleSaveToNotebook(title, content, topic, 'ai_copilot')
                }
              />
            )}

            {route === 'jd-analyzer' && (
              <JdAnalyzerView
                experienceTier={profile.experienceTier}
                onSaveToNotebook={(title, content, topic) =>
                  handleSaveToNotebook(title, content, topic, 'ai_copilot')
                }
              />
            )}

            {route === 'notebook' && (
              <NotebookView
                notes={notes}
                onCreateNote={(t, c, top) => handleSaveToNotebook(t, c, top, 'manual')}
                onDeleteNote={async (id) => {
                  setNotes((prev) => prev.filter((n) => n.id !== id));
                  if (user && !id.startsWith('local_')) {
                    await deleteUserNote(user.uid, id).catch(() => {});
                  }
                }}
              />
            )}

            {route === 'admin' && (
              <AdminCmsView
                isAdmin={isAdmin}
                questions={allQuestions}
                experiences={experiences}
                onSaveQuestion={async (q) => {
                  setCustomQuestions((prev) =>
                    prev.some((x) => x.uniqueId === q.uniqueId)
                      ? prev.map((x) => (x.uniqueId === q.uniqueId ? q : x))
                      : [q, ...prev],
                  );
                  if (user) {
                    await saveBatchQuestionsToFirestore([q], user.uid);
                  }
                }}
                onDeleteQuestion={async (id) => {
                  setCustomQuestions((prev) => prev.filter((q) => q.uniqueId !== id));
                  await deleteQuestionFromFirestore(id).catch(() => {});
                }}
                onBulkImportQuestions={async (qs) => {
                  setCustomQuestions((prev) => [...qs, ...prev]);
                  if (user) {
                    await saveBatchQuestionsToFirestore(qs, user.uid);
                  }
                }}
                onModerateExperience={async (id, status) => {
                  setExperiences((prev) =>
                    prev.map((e) => (e.id === id ? { ...e, verificationStatus: status } : e)),
                  );
                  await moderateInterviewExperience(id, status).catch(() => {});
                }}
              />
            )}
          </main>
        </div>
      </div>

      {/* Global Modals & Persistent Slide-Over AI Copilot */}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        questions={allQuestions}
        topics={SEED_KNOWLEDGE_TOPICS}
        companies={ALL_COMPANY_PORTALS}
        scenarios={SEED_PRODUCTION_SCENARIOS}
        onNavigate={navigate}
        onSelectQuestion={handleSelectQuestion}
        onSelectTopic={(id) => {
          setSelectedTopicId(id);
          navigate('knowledge');
        }}
        onSelectCompany={(id) => {
          setSelectedCompanyId(id);
          navigate('companies');
        }}
      />

      <CopilotDrawer
        open={copilotOpen}
        onToggle={() => setCopilotOpen((o) => !o)}
        context={activeCopilotContext}
        messages={copilotMessages}
        onSendUserTurn={handleCopilotTurn}
        onSaveToNotebook={(title, content, topic) =>
          handleSaveToNotebook(title, content, topic, 'ai_copilot')
        }
      />
    </div>
  );
}
