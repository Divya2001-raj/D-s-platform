import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  BookMarked,
  BookOpen,
  BrainCircuit,
  Briefcase,
  Building2,
  Code2,
  Compass,
  Cpu,
  Database,
  FileSearch,
  FlaskConical,
  Layers,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  Mic,
  Moon,
  NotebookPen,
  Radar,
  Search,
  Settings,
  Sun,
  UserCircle2,
  Wrench,
  X,
} from 'lucide-react';
import {
  ALL_COMPANY_PORTALS,
  ALL_SEED_QUESTIONS,
  INTERVIEW_ROUNDS,
  SEED_EXPERIENCES,
  SEED_KNOWLEDGE_TOPICS,
  SEED_PRODUCTION_SCENARIOS,
  enrichQuestionBank,
  getQuestionEvalType,
  getQuestionRound,
  getTopicSlug,
  resolveTopicBySlug,
} from './data';
import { useTheme } from './lib/themeContext';
import type {
  AppRoute,
  CopilotContext,
  CopilotMessage,
  ExperienceTier,
  InterviewExperience,
  KnowledgeTopic,
  MistakeSourceType,
  MistakeVaultItem,
  Question,
  SM2Item,
  UserNote,
  UserProfile,
  UserProgress,
} from './types/platform';
import { auth, testFirestoreConnection } from './lib/firebase';
import {
  MISTAKE_INTERVALS,
  calculateNextSM2,
  checkIsAdmin,
  deleteMistakeVaultItem,
  deleteQuestionFromFirestore,
  deleteUserNote,
  ensureUserDocuments,
  fetchCustomQuestions,
  fetchInterviewExperiences,
  fetchKnowledgeTopics,
  fetchPendingExperiencesForAdmin,
  loadLocalGeneratedTopics,
  loadMistakeVault,
  loadUserArenaState,
  moderateInterviewExperience,
  saveBatchQuestionsToFirestore,
  saveCopilotTurn,
  saveGeneratedKnowledgeTopic,
  saveMistakeVaultItem,
  saveUserArenaState,
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
import { CheatSheetDrawer } from './components/CheatSheetDrawer';
import { CommandPalette } from './components/CommandPalette';
import { CopilotDrawer } from './components/CopilotDrawer';
import { DashboardView } from './components/DashboardView';
import { InterviewRoundsView } from './components/InterviewRoundsView';
import { JobRadarView } from './components/JobRadarView';
import { MistakeVaultView } from './components/MistakeVaultView';
import { ProblemWorkspaceView } from './components/ProblemWorkspaceView';
import { QuestRoadmapView } from './components/QuestRoadmapView';
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
import { PracticalAssignmentsView } from './components/PracticalAssignmentsView';
import { SystemDiagnosticsSuite } from './components/SystemDiagnosticsSuite';

const DEFAULT_PROFILE: UserProfile = {
  uid: 'guest',
  displayName: 'Di Platform',
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
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'quest-roadmap', label: 'Quest Roadmap', icon: Compass },
  { id: 'mistake-vault', label: 'Mistake Vault', icon: BrainCircuit },
  { id: 'rounds', label: '8 Interview Rounds', icon: Layers },
  { id: 'practical-lab', label: 'Practical Lab', icon: Wrench },
  { id: 'roadmaps', label: 'Study Roadmaps', icon: MapIcon },
  { id: 'sql-arena', label: 'SQL Arena', icon: Database },
  { id: 'python-arena', label: 'Python & DSA', icon: Code2 },
  { id: 'labs', label: 'PySpark & Labs', icon: FlaskConical },
  { id: 'knowledge', label: 'DE Concepts & MCQs', icon: BookOpen },
  { id: 'companies', label: 'Company Portals', icon: Building2 },
  { id: 'system-design', label: 'System Design', icon: Cpu },
  { id: 'scenarios', label: 'Incident Labs', icon: Briefcase },
  { id: 'mock-interview', label: 'Live AI Interview', icon: Mic },
  { id: 'job-radar', label: 'Live Job Radar', icon: Radar },
  { id: 'jd-analyzer', label: 'JD Analyser', icon: FileSearch },
  { id: 'notebook', label: 'Answer Notebook', icon: NotebookPen },
];

type SidebarSectionKey = 'rounds' | 'labs' | 'career';

const SIDEBAR_GROUPS: Array<{
  key: SidebarSectionKey;
  heading: string;
  routes: AppRoute[];
}> = [
  {
    key: 'rounds',
    heading: 'INTERVIEW ROUNDS',
    routes: ['dashboard', 'rounds', 'knowledge', 'companies', 'mock-interview'],
  },
  {
    key: 'labs',
    heading: 'PRACTICE LABS',
    routes: ['practical-lab', 'sql-arena', 'python-arena', 'labs', 'system-design', 'scenarios'],
  },
  {
    key: 'career',
    heading: 'CAREER',
    routes: ['quest-roadmap', 'mistake-vault', 'roadmaps', 'job-radar', 'jd-analyzer', 'notebook'],
  },
];

interface ParsedPath {
  route: AppRoute;
  questionId?: string;
  roundSlug?: string;
  topicSlug?: string;
}

function parseLocationPath(pathname: string): ParsedPath {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean.startsWith('/problem/')) {
    return { route: 'problem', questionId: decodeURIComponent(clean.slice('/problem/'.length)) };
  }
  if (clean === '/rounds') {
    return { route: 'rounds', roundSlug: INTERVIEW_ROUNDS[0].slug };
  }
  if (clean.startsWith('/rounds/')) {
    return { route: 'rounds', roundSlug: decodeURIComponent(clean.slice('/rounds/'.length)) };
  }
  if (clean === '/topics') {
    return { route: 'knowledge', topicSlug: getTopicSlug(SEED_KNOWLEDGE_TOPICS[0]) };
  }
  if (clean.startsWith('/topics/')) {
    return { route: 'knowledge', topicSlug: decodeURIComponent(clean.slice('/topics/'.length)) };
  }
  const simpleRoutes: Record<string, AppRoute> = {
    '/quest-roadmap': 'quest-roadmap',
    '/mistake-vault': 'mistake-vault',
    '/practical-lab': 'practical-lab',
    '/roadmaps': 'roadmaps',
    '/sql-arena': 'sql-arena',
    '/python-arena': 'python-arena',
    '/labs': 'labs',
    '/companies': 'companies',
    '/system-design': 'system-design',
    '/scenarios': 'scenarios',
    '/mock-interview': 'mock-interview',
    '/job-radar': 'job-radar',
    '/jd-analyzer': 'jd-analyzer',
    '/notebook': 'notebook',
    '/admin': 'admin',
  };
  if (simpleRoutes[clean]) {
    return { route: simpleRoutes[clean] };
  }
  return { route: 'dashboard' };
}

export default function App() {
  const initialParsed = useMemo(
    () => parseLocationPath(typeof window !== 'undefined' ? window.location.pathname : '/'),
    [],
  );

  const { isDark, toggleTheme } = useTheme();
  const [route, setRoute] = useState<AppRoute>(initialParsed.route);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState<Record<SidebarSectionKey, boolean>>({
    rounds: true,
    labs: true,
    career: true,
  });

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false);
  const [diagnosticsModalOpen, setDiagnosticsModalOpen] = useState(false);
  const [mockCompanyPreset, setMockCompanyPreset] = useState<string>('Uber');

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [mistakeVault, setMistakeVault] = useState<MistakeVaultItem[]>([]);
  const [freeRoam, setFreeRoam] = useState(false);
  const [coldSolveMode, setColdSolveMode] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<Question[]>([]);
  const [customTopics, setCustomTopics] = useState<KnowledgeTopic[]>(() => loadLocalGeneratedTopics());
  const [experiences, setExperiences] = useState<InterviewExperience[]>(SEED_EXPERIENCES);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([]);

  const [urlQuestionId, setUrlQuestionId] = useState<string | null>(initialParsed.questionId ?? null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(() => {
    if (initialParsed.questionId) {
      return ALL_SEED_QUESTIONS.find((q) => q.uniqueId === initialParsed.questionId) || ALL_SEED_QUESTIONS[0];
    }
    return ALL_SEED_QUESTIONS[0];
  });
  const [activeRoundSlug, setActiveRoundSlug] = useState<string>(
    initialParsed.roundSlug || INTERVIEW_ROUNDS[0].slug,
  );
  const [activeTopicSlug, setActiveTopicSlug] = useState<string>(
    initialParsed.topicSlug || getTopicSlug(SEED_KNOWLEDGE_TOPICS[0]),
  );
  const [selectedTopicId, setSelectedTopicId] = useState<string>(SEED_KNOWLEDGE_TOPICS[0].id);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(ALL_COMPANY_PORTALS[0].id);
  const [liveCode, setLiveCode] = useState('');
  const [liveError, setLiveError] = useState('');

  // Merge launch seed + Firestore custom/AI questions without duplicates
  const allQuestions = useMemo(() => {
    const map = new Map<string, Question>();
    for (const q of ALL_SEED_QUESTIONS) map.set(q.uniqueId, q);
    for (const q of customQuestions) map.set(q.uniqueId, q);
    return Array.from(map.values());
  }, [customQuestions]);

  // Merge seed Knowledge Topics + locally cached/Firestore-generated topics
  const allTopics = useMemo(() => {
    const map = new Map<string, KnowledgeTopic>();
    for (const t of SEED_KNOWLEDGE_TOPICS) map.set(t.id, t);
    for (const t of customTopics) map.set(t.id, t);
    return Array.from(map.values());
  }, [customTopics]);

  // Sync deep-linked /problem/:questionId once custom questions finish loading
  useEffect(() => {
    if (route === 'problem' && urlQuestionId) {
      const found = allQuestions.find((q) => q.uniqueId === urlQuestionId);
      if (found) {
        setSelectedQuestion(found);
      }
    }
  }, [route, urlQuestionId, allQuestions]);

  // Listen to browser back/forward history navigation
  useEffect(() => {
    const onPopState = () => {
      const parsed = parseLocationPath(window.location.pathname);
      setRoute(parsed.route);
      if (parsed.questionId) {
        setUrlQuestionId(parsed.questionId);
        const found = allQuestions.find((q) => q.uniqueId === parsed.questionId);
        if (found) setSelectedQuestion(found);
      }
      if (parsed.roundSlug) setActiveRoundSlug(parsed.roundSlug);
      if (parsed.topicSlug) setActiveTopicSlug(parsed.topicSlug);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [allQuestions]);

  // Boot Firestore connection check + load public curriculum extensions
  useEffect(() => {
    testFirestoreConnection();
    fetchCustomQuestions()
      .then((qs) => {
        if (qs.length > 0) setCustomQuestions(enrichQuestionBank(qs));
      })
      .catch(() => {});
    fetchKnowledgeTopics()
      .then((topics) => {
        if (topics.length > 0) {
          setCustomTopics((prev) => {
            const map = new Map<string, KnowledgeTopic>();
            for (const t of prev) map.set(t.id, t);
            for (const t of topics) map.set(t.id, t);
            return Array.from(map.values());
          });
        }
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
        setProfile({ ...prof, displayName: 'Di Platform' });
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

  // Sync Mistake Vault & Free Roam state whenever active user changes
  useEffect(() => {
    const uid = user?.uid ?? null;
    loadMistakeVault(uid).then(setMistakeVault).catch(() => {});
    loadUserArenaState<{ freeRoam: boolean }>(uid, '__quest_state__', { freeRoam: false })
      .then((st) => setFreeRoam(Boolean(st?.freeRoam)))
      .catch(() => {});
  }, [user?.uid]);

  const handleToggleFreeRoam = async () => {
    const next = !freeRoam;
    setFreeRoam(next);
    await saveUserArenaState(user?.uid ?? null, '__quest_state__', { freeRoam: next });
  };

  const handleCaptureMistake = async (payload: {
    id: string;
    sourceType: MistakeSourceType;
    questionId?: string;
    topicSlug?: string;
    title: string;
    domain: string;
    reason: string;
  }) => {
    const existing = mistakeVault.find((m) => m.id === payload.id);
    const nowIso = new Date().toISOString();
    const item: MistakeVaultItem = {
      id: payload.id,
      uid: user?.uid || 'guest',
      sourceType: payload.sourceType,
      questionId: payload.questionId ?? existing?.questionId,
      topicSlug: payload.topicSlug ?? existing?.topicSlug,
      title: payload.title,
      domain: payload.domain,
      reason: payload.reason.slice(0, 600),
      stage: 0,
      intervalDays: 1,
      dueAt: Date.now(),
      failures: (existing?.failures || 0) + 1,
      lastFailedAt: nowIso,
      createdAt: existing?.createdAt || nowIso,
      mastered: false,
    };
    const nextList = await saveMistakeVaultItem(user?.uid ?? null, item);
    setMistakeVault(nextList);
  };

  const handleAdvanceMistakeItem = async (item: MistakeVaultItem) => {
    const nextStageIdx = Math.min(3, item.stage + 1) as 0 | 1 | 2 | 3;
    const isNowMastered = item.stage >= 3;
    const nextDays = MISTAKE_INTERVALS[nextStageIdx];
    const updated: MistakeVaultItem = {
      ...item,
      stage: nextStageIdx,
      intervalDays: nextDays,
      dueAt: Date.now() + nextDays * 24 * 60 * 60 * 1000,
      mastered: isNowMastered,
    };
    const nextList = await saveMistakeVaultItem(user?.uid ?? null, updated);
    setMistakeVault(nextList);
  };

  const handleResetMistakeItem = async (item: MistakeVaultItem) => {
    const updated: MistakeVaultItem = {
      ...item,
      stage: 0,
      intervalDays: 1,
      dueAt: Date.now(),
      failures: item.failures + 1,
      lastFailedAt: new Date().toISOString(),
      mastered: false,
    };
    const nextList = await saveMistakeVaultItem(user?.uid ?? null, updated);
    setMistakeVault(nextList);
  };

  const handleDeleteMistakeItem = async (itemId: string) => {
    const nextList = await deleteMistakeVaultItem(user?.uid ?? null, itemId);
    setMistakeVault(nextList);
  };

  const handleColdSolveResult = async (questionId: string, passedFirstTry: boolean) => {
    const match = mistakeVault.find((m) => m.questionId === questionId || m.id === `q_${questionId}`);
    if (!match) return;
    if (passedFirstTry) {
      await handleAdvanceMistakeItem(match);
    } else {
      await handleResetMistakeItem(match);
    }
  };

  const pushPath = (nextPath: string) => {
    if (typeof window !== 'undefined' && window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  };

  const closeAllOverlays = () => {
    setMobileMenuOpen(false);
    setAuthModalOpen(false);
    setCmdOpen(false);
    setCheatSheetOpen(false);
    setDiagnosticsModalOpen(false);
    setCopilotOpen(false);
  };

  const navigate = (next: AppRoute) => {
    setRoute(next);
    setColdSolveMode(false);
    closeAllOverlays();
    const routePathMap: Record<AppRoute, string> = {
      dashboard: '/',
      'quest-roadmap': '/quest-roadmap',
      'mistake-vault': '/mistake-vault',
      rounds: `/rounds/${encodeURIComponent(activeRoundSlug)}`,
      'practical-lab': '/practical-lab',
      problem: `/problem/${encodeURIComponent(selectedQuestion?.uniqueId || ALL_SEED_QUESTIONS[0].uniqueId)}`,
      roadmaps: '/roadmaps',
      'sql-arena': '/sql-arena',
      'python-arena': '/python-arena',
      labs: '/labs',
      knowledge: `/topics/${encodeURIComponent(activeTopicSlug)}`,
      companies: '/companies',
      'system-design': '/system-design',
      scenarios: '/scenarios',
      'mock-interview': '/mock-interview',
      'job-radar': '/job-radar',
      'jd-analyzer': '/jd-analyzer',
      notebook: '/notebook',
      admin: '/admin',
    };
    pushPath(routePathMap[next] || '/');
  };

  const handleSelectRound = (roundSlug: string) => {
    setActiveRoundSlug(roundSlug);
    setColdSolveMode(false);
    setRoute('rounds');
    closeAllOverlays();
    pushPath(`/rounds/${encodeURIComponent(roundSlug)}`);
  };

  const handleSelectQuestion = (q: Question) => {
    setSelectedQuestion(q);
    setUrlQuestionId(q.uniqueId);
    setColdSolveMode(false);
    setRoute('problem');
    closeAllOverlays();
    pushPath(`/problem/${encodeURIComponent(q.uniqueId)}`);
  };

  const handleColdSolveQuestion = (q: Question) => {
    setSelectedQuestion(q);
    setUrlQuestionId(q.uniqueId);
    setColdSolveMode(true);
    setRoute('problem');
    closeAllOverlays();
    pushPath(`/problem/${encodeURIComponent(q.uniqueId)}`);
  };

  const handleSelectTopic = (topicNameOrId: string) => {
    const resolved = resolveTopicBySlug(topicNameOrId, allTopics);
    setActiveTopicSlug(resolved.slug);
    setSelectedTopicId(resolved.topic?.id || resolved.slug);
    setColdSolveMode(false);
    setRoute('knowledge');
    closeAllOverlays();
    pushPath(`/topics/${encodeURIComponent(resolved.slug)}`);
  };

  const handleSaveGeneratedTopic = async (topic: KnowledgeTopic) => {
    setCustomTopics((prev) => [topic, ...prev.filter((t) => t.id !== topic.id)]);
    await saveGeneratedKnowledgeTopic(topic, user?.uid ?? null);
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

    const evalType = getQuestionEvalType(q);
    const lang = evalType === 'sql' ? 'sql' : evalType === 'design_rubric' ? 'design' : 'python';

    if (user) {
      await Promise.all([
        updateUserProgress(user.uid, { attemptedIds: nextAttempted, solvedIds: nextSolved }),
        updateUserProfile(user.uid, { studyHours: nextHours }),
        saveUserSubmission(user.uid, {
          questionId: q.uniqueId,
          language: lang,
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
    const enriched = enrichQuestionBank(qs);
    setCustomQuestions((prev) => [...enriched, ...prev]);
    if (user) {
      await saveBatchQuestionsToFirestore(enriched, user.uid).catch(() => {});
    }
    if (enriched[0]) {
      handleSelectQuestion(enriched[0]);
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
    if (route === 'problem' || route === 'sql-arena' || route === 'python-arena' || route === 'labs') {
      return {
        view: route === 'problem' ? `Round ${selectedQuestion ? getQuestionRound(selectedQuestion) : 1} Workspace` : route,
        title: selectedQuestion?.title || 'Coding Arena',
        domain: selectedQuestion?.domain || 'Data Engineering',
        experienceTier: profile.experienceTier,
        code: liveCode,
        errorOutput: liveError,
        schema: selectedQuestion?.setupSchemaOrEnv || '',
      };
    }
    if (route === 'knowledge') {
      const resolved = resolveTopicBySlug(activeTopicSlug || selectedTopicId, allTopics);
      const t = resolved.topic;
      return {
        view: 'Knowledge Hub',
        title: t?.title || resolved.displayName,
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
      title: 'Di Platform — DATA ENGINEER 360',
      domain: 'Full-Stack Data Engineering',
      experienceTier: profile.experienceTier,
    };
  }, [route, selectedQuestion, profile.experienceTier, liveCode, liveError, activeTopicSlug, selectedTopicId, allTopics, selectedCompanyId]);

  const currentNavLabel =
    NAV_ITEMS.find((n) => n.id === route)?.label || (route === 'admin' ? 'Admin CMS' : 'Workspace');

  const isFullScreenProblem = route === 'problem' && selectedQuestion !== null;
  const dueMistakeCount = useMemo(
    () => mistakeVault.filter((m) => !m.mastered && m.dueAt <= Date.now()).length,
    [mistakeVault],
  );
  const recommendedDockQuestion = useMemo(() => {
    const solvedSet = new Set(progress.solvedIds);
    return (
      allQuestions.find((q) => !solvedSet.has(q.uniqueId) && q.experienceLevel === profile.experienceTier) ||
      allQuestions.find((q) => !solvedSet.has(q.uniqueId)) ||
      allQuestions[0] ||
      null
    );
  }, [allQuestions, progress.solvedIds, profile.experienceTier]);

  return (
    <div className="aurora-canvas min-h-screen">
      {isFullScreenProblem && selectedQuestion ? (
        <ProblemWorkspaceView
          question={selectedQuestion}
          allQuestions={allQuestions}
          solvedIds={progress.solvedIds}
          bookmarks={progress.bookmarks}
          experienceTier={profile.experienceTier}
          coldSolve={coldSolveMode}
          onColdSolveResult={handleColdSolveResult}
          onCaptureMistake={handleCaptureMistake}
          onBackToRound={(rSlug) => handleSelectRound(rSlug)}
          onSelectQuestion={handleSelectQuestion}
          onSelectTopic={handleSelectTopic}
          onMarkSolved={handleMarkSolved}
          onToggleBookmark={handleToggleBookmark}
          onScheduleSM2={handleScheduleSM2}
          onContextUpdate={(c, e) => {
            setLiveCode(c);
            setLiveError(e);
          }}
          onOpenCopilot={() => setCopilotOpen(true)}
        />
      ) : (
      <div className="flex min-h-screen gap-4 p-0 lg:p-4">
        {/* Desktop Floating Pitch-Black Bento Sidebar Menu */}
        <aside
          className={`glass-surface sticky top-4 hidden h-[calc(100vh-2rem)] shrink-0 overflow-hidden transition-all duration-200 lg:flex lg:flex-col ${
            sidebarOpen ? 'w-[272px]' : 'w-[82px]'
          }`}
        >
          <div className="flex h-[72px] items-center justify-between border-b bento-divider px-4">
            <button
              type="button"
              data-nav-home="crest"
              onClick={() => navigate('dashboard')}
              className="flex min-w-0 items-center gap-3 text-left"
              title="Return to Dashboard"
            >
              <BrandMark size={40} variant="avatar" showOnlineDot />
              {sidebarOpen && (
                <div className="min-w-0">
                  <div className="truncate font-display text-sm font-bold text-white">Di Platform</div>
                  <div className="truncate font-mono text-[10px] tracking-wider text-slate-400">
                    DATA ENGINEER 360
                  </div>
                </div>
              )}
            </button>
          </div>

          <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {sidebarOpen ? (
              <>
                {SIDEBAR_GROUPS.map((group) => {
                  const isOpen = accordionOpen[group.key];
                  const items = group.routes
                    .map((id) => NAV_ITEMS.find((n) => n.id === id))
                    .filter((x): x is (typeof NAV_ITEMS)[number] => Boolean(x));
                  return (
                    <div
                      key={group.key}
                      className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-inset)]/55"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setAccordionOpen((prev) => ({ ...prev, [group.key]: !prev[group.key] }))
                        }
                        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
                      >
                        <span className="font-display text-[11px] font-bold tracking-wider text-white uppercase">
                          {group.heading}
                        </span>
                        <span
                          className={`text-xs leading-none text-white transition-transform duration-150 ${
                            isOpen ? 'rotate-0' : '-rotate-90'
                          }`}
                          aria-hidden="true"
                        >
                          ▾
                        </span>
                      </button>

                      {isOpen && (
                        <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                          {items.map((item) => {
                            const Icon = item.icon;
                            const active = route === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                data-nav-home={item.id === 'dashboard' ? 'sidebar' : undefined}
                                onClick={() => navigate(item.id)}
                                title={item.label}
                                className={`flex w-full items-center justify-between gap-2.5 px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                                  active
                                    ? 'tab-active'
                                    : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                                }`}
                              >
                                <span className="flex min-w-0 items-center gap-2.5">
                                  <Icon className="h-4 w-4 shrink-0" />
                                  <span className="truncate whitespace-nowrap">{item.label}</span>
                                </span>
                                {item.id === 'mistake-vault' && dueMistakeCount > 0 && (
                                  <span className="keep-white rounded-full bg-[#EF4444] px-1.5 py-0.5 font-mono text-[10px] font-bold">
                                    {dueMistakeCount}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                          {group.key === 'career' && isAdmin && (
                            <button
                              type="button"
                              onClick={() => navigate('admin')}
                              title="Admin CMS"
                              className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                                route === 'admin'
                                  ? 'tab-active'
                                  : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                              }`}
                            >
                              <Settings className="h-4 w-4 shrink-0" />
                              <span className="truncate whitespace-nowrap">Admin CMS</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-inset)]/40">
                  <div className="border-b border-[var(--border-subtle)] px-3.5 py-2 font-mono text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Tier-1 Rounds (1–8)
                  </div>
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {INTERVIEW_ROUNDS.map((r) => {
                      const active = route === 'rounds' && activeRoundSlug === r.slug;
                      return (
                        <button
                          key={r.roundNumber}
                          type="button"
                          onClick={() => handleSelectRound(r.slug)}
                          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left text-[11px] font-medium transition-colors ${
                            active
                              ? 'tab-active'
                              : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#A78BFA]" />
                          <span className="truncate">{r.shortTitle}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = route === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-nav-home={item.id === 'dashboard' ? 'sidebar' : undefined}
                      onClick={() => navigate(item.id)}
                      title={item.label}
                      className={`flex w-full items-center justify-center rounded-2xl p-2.5 transition-colors ${
                        active
                          ? 'tab-active'
                          : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                    </button>
                  );
                })}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => navigate('admin')}
                    title="Admin CMS"
                    className={`flex w-full items-center justify-center rounded-2xl p-2.5 transition-colors ${
                      route === 'admin'
                        ? 'tab-active'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <Settings className="h-4 w-4 shrink-0" />
                  </button>
                )}
              </div>
            )}
          </nav>

          {/* Bottom Menu Pill Switch Controls: Dark/Light + Free Roam + Collapse */}
          <div className="space-y-2.5 border-t bento-divider p-3.5">
            {sidebarOpen && (
              <>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex w-full items-center justify-between rounded-2xl px-2 py-1 text-xs font-medium text-slate-300 hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    {isDark ? <Moon className="h-3.5 w-3.5 text-[#A78BFA]" /> : <Sun className="h-3.5 w-3.5 text-[#7C3AED]" />}
                    <span>{isDark ? 'Borahae Obsidian' : 'Lavender Light'}</span>
                  </span>
                  <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${isDark ? 'bg-[#8B5CF6]' : 'bg-[#C4B5FD]'}`}>
                    <span className={`h-4 w-4 rounded-full bg-white transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0'}`} />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleFreeRoam}
                  className="flex w-full items-center justify-between rounded-2xl px-2 py-1 text-xs font-medium text-slate-300 hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Compass className="h-3.5 w-3.5 text-[#D946EF]" />
                    <span>Free Roam</span>
                  </span>
                  <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${freeRoam ? 'bg-[#22C55E]' : 'bg-[var(--bg-track)]'}`}>
                    <span className={`h-4 w-4 rounded-full bg-white transition-transform ${freeRoam ? 'translate-x-4' : 'translate-x-0'}`} />
                  </span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="btn-secondary w-full rounded-full py-2 text-xs font-semibold"
            >
              {sidebarOpen ? 'Collapse Menu' : '»'}
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
              className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className="flex h-full w-72 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <button
                    type="button"
                    data-nav-home="mobile-crest"
                    onClick={() => navigate('dashboard')}
                    className="flex items-center gap-2.5 text-left"
                  >
                    <BrandMark size={32} variant="avatar" showOnlineDot />
                    <span className="font-display text-sm font-bold text-white">Di Platform</span>
                  </button>
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
                        type="button"
                        onClick={() => navigate(item.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-full px-3.5 py-2 text-xs font-semibold ${
                          route === item.id ? 'tab-active' : 'text-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </span>
                        {item.id === 'mistake-vault' && dueMistakeCount > 0 && (
                          <span className="keep-white rounded-full bg-[#EF4444] px-1.5 py-0.5 font-mono text-[10px]">
                            {dueMistakeCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  <div className="mt-3 border-t bento-divider pt-3">
                    <div className="px-3 pb-1 font-mono text-[10px] text-slate-500 uppercase">
                      8 Interview Rounds
                    </div>
                    {INTERVIEW_ROUNDS.map((r) => (
                      <button
                        key={r.roundNumber}
                        type="button"
                        onClick={() => handleSelectRound(r.slug)}
                        className={`flex w-full items-center gap-2 rounded-full px-3 py-1.5 text-left text-xs ${
                          route === 'rounds' && activeRoundSlug === r.slug
                            ? 'tab-active'
                            : 'text-slate-400'
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                        <span className="truncate">{r.shortTitle}</span>
                      </button>
                    ))}
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => navigate('admin')}
                      className={`mt-2 flex w-full items-center gap-3 rounded-full px-3.5 py-2.5 text-xs font-semibold ${
                        route === 'admin' ? 'tab-active' : 'text-slate-300'
                      }`}
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
          {/* Clean Top Bar Contract */}
          <header className="glass-surface sticky top-0 z-30 flex h-16 items-center justify-between gap-4 rounded-none border-x-0 border-t-0 px-4 backdrop-blur-xl sm:px-6 lg:rounded-[24px] lg:border">
            <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/5 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <button
                type="button"
                data-nav-home="header"
                onClick={() => navigate('dashboard')}
                className="font-display text-sm font-bold text-white hover:text-[#C4B5FD]"
              >
                {currentNavLabel}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="inset-surface hidden max-w-md flex-1 items-center justify-between rounded-full px-4 py-2 text-xs text-slate-400 transition-colors hover:border-[#8B5CF6] md:flex"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 text-[#A78BFA]" />
                <span>Search {allQuestions.length}+ questions across 8 Rounds, Vault, MCQs...</span>
              </span>
              <span className="ml-3 shrink-0 rounded-full border border-[var(--border-subtle)] px-2 py-0.5 font-mono text-[11px] text-slate-400">
                ⌘K
              </span>
            </button>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setCheatSheetOpen(true)}
                className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold"
                title="Open Data Engineer Quick Cheat Sheet"
              >
                <BookMarked className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">DE Cheat Sheet</span>
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold"
                title={isDark ? 'Switch to Soft Lavender Light Mode' : 'Switch to Pitch-Black Dark Mode'}
                aria-label="Toggle color theme"
              >
                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                <span className="hidden xl:inline">{isDark ? 'Light UI' : 'Dark UI'}</span>
              </button>

              {user ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => signOut(auth)}
                    className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="btn-luminous inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs"
                >
                  <UserCircle2 className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6">
            {route === 'dashboard' && (
              <DashboardView
                profile={{ ...profile, displayName: 'Di Platform' }}
                progress={progress}
                questions={allQuestions}
                mistakeVault={mistakeVault}
                onChangeExperienceTier={handleChangeExperienceTier}
                onNavigate={navigate}
                onSelectRound={handleSelectRound}
                onSelectQuestion={handleSelectQuestion}
                onColdSolveQuestion={handleColdSolveQuestion}
                onSelectTopic={handleSelectTopic}
                onRateSM2={handleRateSM2}
              />
            )}

            {route === 'mistake-vault' && (
              <MistakeVaultView
                items={mistakeVault}
                questions={allQuestions}
                onColdSolveQuestion={handleColdSolveQuestion}
                onSelectTopic={handleSelectTopic}
                onLaunchMockInterview={() => navigate('mock-interview')}
                onMarkReverified={handleAdvanceMistakeItem}
                onResetItem={handleResetMistakeItem}
                onDeleteItem={handleDeleteMistakeItem}
              />
            )}

            {route === 'quest-roadmap' && (
              <QuestRoadmapView
                userId={user?.uid ?? null}
                questions={allQuestions}
                solvedIds={progress.solvedIds}
                experienceTier={profile.experienceTier}
                freeRoam={freeRoam}
                onToggleFreeRoam={handleToggleFreeRoam}
                onSelectQuestion={handleSelectQuestion}
                onSelectRound={handleSelectRound}
                onSelectTopic={handleSelectTopic}
              />
            )}

            {route === 'practical-lab' && (
              <PracticalAssignmentsView
                userId={user?.uid ?? null}
                onSelectTopic={handleSelectTopic}
              />
            )}

            {route === 'rounds' && (
              <InterviewRoundsView
                questions={allQuestions}
                solvedIds={progress.solvedIds}
                experienceTier={profile.experienceTier}
                activeRoundSlug={activeRoundSlug}
                onSelectRoundSlug={handleSelectRound}
                onSelectQuestion={handleSelectQuestion}
                onSelectTopic={handleSelectTopic}
                onAddGeneratedQuestions={handleAddGeneratedQuestions}
              />
            )}

            {route === 'roadmaps' && (
              <RoadmapsView
                questions={allQuestions}
                solvedIds={progress.solvedIds}
                experienceTier={profile.experienceTier}
                onSelectQuestion={handleSelectQuestion}
                onSelectTopic={handleSelectTopic}
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
                onCaptureMistake={handleCaptureMistake}
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
                onCaptureMistake={handleCaptureMistake}
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
                onCaptureMistake={handleCaptureMistake}
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
                userId={user?.uid ?? null}
                topics={allTopics}
                selectedTopicId={selectedTopicId}
                activeTopicSlug={activeTopicSlug}
                onSelectTopic={handleSelectTopic}
                questions={allQuestions}
                completedTopics={progress.completedTopics}
                bookmarks={progress.bookmarks}
                onToggleCompleteTopic={handleToggleCompleteTopic}
                onToggleBookmark={handleToggleBookmark}
                onSelectQuestion={handleSelectQuestion}
                onCaptureMistake={handleCaptureMistake}
                onSaveToNotebook={(title, content, topic) =>
                  handleSaveToNotebook(title, content, topic, 'knowledge_hub')
                }
                onSaveGeneratedTopic={handleSaveGeneratedTopic}
                onOpenPracticalLab={() => navigate('practical-lab')}
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
                onSelectTopic={handleSelectTopic}
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
                userId={user?.uid ?? null}
                questions={allQuestions}
                experienceTier={profile.experienceTier}
                initialCompany={mockCompanyPreset}
                onSaveToNotebook={(title, content, topic) =>
                  handleSaveToNotebook(title, content, topic, 'ai_copilot')
                }
                onNavigateToQuest={() => navigate('quest-roadmap')}
                onSelectRound={handleSelectRound}
                onSelectTopic={handleSelectTopic}
                onCaptureMistake={handleCaptureMistake}
              />
            )}

            {route === 'job-radar' && (
              <JobRadarView
                userId={user?.uid ?? null}
                onPracticeCompanyLoop={(companyName) => {
                  setMockCompanyPreset(companyName);
                  navigate('mock-interview');
                }}
                onSelectTopic={handleSelectTopic}
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
                userId={user?.uid ?? null}
                questions={allQuestions}
                topics={allTopics}
                experiences={experiences}
                onAutoRepairQuestions={async () => {
                  const under = customQuestions.filter(
                    (q) => (q.testCases?.length || 0) + (q.hiddenTestCases?.length || 0) < 6,
                  );
                  const repaired = enrichQuestionBank(customQuestions);
                  setCustomQuestions(repaired);
                  if (user && under.length > 0) {
                    await saveBatchQuestionsToFirestore(enrichQuestionBank(under), user.uid).catch(() => {});
                  }
                  return under.length;
                }}
                onSaveQuestion={async (q) => {
                  const enriched = enrichQuestionBank([q]);
                  setCustomQuestions((prev) =>
                    prev.some((x) => x.uniqueId === enriched[0].uniqueId)
                      ? prev.map((x) => (x.uniqueId === enriched[0].uniqueId ? enriched[0] : x))
                      : [enriched[0], ...prev],
                  );
                  if (user) {
                    await saveBatchQuestionsToFirestore(enriched, user.uid);
                  }
                }}
                onDeleteQuestion={async (id) => {
                  setCustomQuestions((prev) => prev.filter((q) => q.uniqueId !== id));
                  await deleteQuestionFromFirestore(id).catch(() => {});
                }}
                onBulkImportQuestions={async (qs, onProgress) => {
                  const enriched = enrichQuestionBank(qs);
                  setCustomQuestions((prev) => [...enriched, ...prev]);
                  if (user) {
                    await saveBatchQuestionsToFirestore(enriched, user.uid, onProgress);
                  } else {
                    onProgress?.(enriched.length, enriched.length);
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

          {/* Quiet Minimal Footer with E2E System Diagnostics Modal Trigger */}
          <footer className="border-t border-[var(--border-subtle)] px-6 pt-4 pb-24 text-[11px] text-slate-400">
            <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
              <span>Di Platform — DATA ENGINEER 360 · Master Every Skill. Understand Every Concept. Crack Every Round.</span>
              <button
                type="button"
                onClick={() => setDiagnosticsModalOpen(true)}
                className="btn-secondary inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[11px]"
              >
                <Activity className="h-3.5 w-3.5" />
                <span>System Health / E2E Diagnostics</span>
              </button>
            </div>
          </footer>
        </div>
      </div>
      )}

      {/* Global Modals & Persistent Slide-Over AI Copilot */}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {diagnosticsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setDiagnosticsModalOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between px-4 pt-3">
              <span className="font-display text-sm font-bold text-white">
                Platform Verification &amp; Health Diagnostics
              </span>
              <button
                onClick={() => setDiagnosticsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SystemDiagnosticsSuite
              userId={user?.uid ?? null}
              questions={allQuestions}
              topics={allTopics}
            />
          </div>
        </div>
      )}

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        questions={allQuestions}
        topics={allTopics}
        companies={ALL_COMPANY_PORTALS}
        scenarios={SEED_PRODUCTION_SCENARIOS}
        onNavigate={navigate}
        onSelectQuestion={handleSelectQuestion}
        onSelectTopic={(idOrSlug) => handleSelectTopic(idOrSlug)}
        onSelectCompany={(id) => {
          setSelectedCompanyId(id);
          navigate('companies');
        }}
      />

      <CheatSheetDrawer open={cheatSheetOpen} onClose={() => setCheatSheetOpen(false)} />

      <CopilotDrawer
        open={copilotOpen}
        onToggle={() => setCopilotOpen((o) => !o)}
        context={activeCopilotContext}
        messages={copilotMessages}
        onSendUserTurn={handleCopilotTurn}
        onSaveToNotebook={(title, content, topic) =>
          handleSaveToNotebook(title, content, topic, 'ai_copilot')
        }
        showFloatingBar={!isFullScreenProblem}
        floatingDock={
          <nav
            aria-label="Quick Dock Navigation"
            data-bento-dock="true"
            className="glass-surface flex items-center gap-1.5 overflow-visible rounded-[22px] p-1.5 sm:gap-2 sm:p-2"
          >
            <button
              type="button"
              data-nav-home="dock"
              onClick={() => navigate('dashboard')}
              title="Dashboard Home"
              aria-label="Dashboard Home"
              className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-transform hover:scale-105 sm:h-12 sm:w-12 ${
                route === 'dashboard'
                  ? 'borahae-squircle-active'
                  : 'border border-[var(--border-subtle)] bg-[var(--bg-card)] text-white hover:border-[#8B5CF6]'
              }`}
            >
              <LayoutDashboard className="h-5 w-5" strokeWidth={route === 'dashboard' ? 2 : 1.5} />
            </button>

            <button
              type="button"
              onClick={() => navigate('mock-interview')}
              title="Live AI Interview Room"
              aria-label="Live AI Interview Room"
              className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-transform hover:scale-105 sm:h-12 sm:w-12 ${
                route === 'mock-interview'
                  ? 'borahae-squircle-active'
                  : 'border border-[var(--border-subtle)] bg-[var(--bg-card)] text-white hover:border-[#8B5CF6]'
              }`}
            >
              <Mic className="h-5 w-5" strokeWidth={route === 'mock-interview' ? 2 : 1.5} />
            </button>

            <button
              type="button"
              onClick={() => navigate('mistake-vault')}
              title="Mistake Vault (Spaced Repetition)"
              aria-label="Mistake Vault"
              className={`relative flex h-10 w-10 items-center justify-center overflow-visible rounded-2xl transition-transform hover:scale-105 sm:h-12 sm:w-12 ${
                route === 'mistake-vault'
                  ? 'borahae-squircle-active'
                  : 'border border-[var(--border-subtle)] bg-[var(--bg-card)] text-white hover:border-[#8B5CF6]'
              }`}
            >
              <BrainCircuit className="h-5 w-5" strokeWidth={route === 'mistake-vault' ? 2 : 1.5} />
              {dueMistakeCount > 0 && (
                <span
                  data-bento-dock-badge="true"
                  className="keep-white pointer-events-none absolute -top-1.5 -right-1.5 z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#EF4444] px-1 font-mono text-[10px] font-bold ring-2 ring-[var(--bg-card)]"
                >
                  {dueMistakeCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                recommendedDockQuestion
                  ? handleSelectQuestion(recommendedDockQuestion)
                  : navigate('sql-arena')
              }
              title="Open Code Workspace"
              aria-label="Open Code Workspace"
              className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-transform hover:scale-105 sm:h-12 sm:w-12 ${
                route === 'sql-arena' || route === 'python-arena' || route === 'labs'
                  ? 'borahae-squircle-active'
                  : 'border border-[var(--border-subtle)] bg-[var(--bg-card)] text-white hover:border-[#8B5CF6]'
              }`}
            >
              <Compass
                className="h-5 w-5"
                strokeWidth={route === 'sql-arena' || route === 'python-arena' || route === 'labs' ? 2 : 1.5}
              />
            </button>
          </nav>
        }
      />
    </div>
  );
}
