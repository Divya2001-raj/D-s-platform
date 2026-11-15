import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import {
  ADMIN_BOOTSTRAP_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from './firebase';
import type {
  CopilotMessage,
  InterviewExperience,
  KnowledgeTopic,
  LiveJobPosting,
  MasterResumeProfile,
  MistakeVaultItem,
  Question,
  SM2Item,
  UserNote,
  UserProfile,
  UserProgress,
  UserSubmission,
} from '../types/platform';

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  return cleaned || `id_${Date.now()}`;
}

export function calculateNextSM2(item: SM2Item | undefined, quality: number, meta: { itemId: string; title: string; domain: string }): SM2Item {
  const q = Math.max(0, Math.min(5, quality));
  const prevReps = item?.repetitions ?? 0;
  const prevEF = item?.easeFactor ?? 2.5;
  const prevInterval = item?.intervalDays ?? 0;

  let repetitions = prevReps;
  let intervalDays = 1;
  if (q < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions = prevReps + 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(prevInterval * prevEF);
  }

  const easeFactor = Math.max(
    1.3,
    Number((prevEF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))).toFixed(2)),
  );

  return {
    itemId: meta.itemId,
    title: meta.title.slice(0, 180),
    domain: meta.domain.slice(0, 80),
    repetitions,
    easeFactor,
    intervalDays,
    nextReviewAt: Date.now() + intervalDays * 24 * 60 * 60 * 1000,
    lastQuality: q,
  };
}

export async function checkIsAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;
  if (user.email === ADMIN_BOOTSTRAP_EMAIL && user.emailVerified) return true;
  try {
    const snap = await getDoc(doc(db, 'admins', user.uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function ensureUserDocuments(user: User): Promise<{
  profile: UserProfile;
  progress: UserProgress;
}> {
  const uid = sanitizeId(user.uid);
  const userRef = doc(db, 'users', uid);
  const progRef = doc(db, 'user_progress', uid);

  let profile: UserProfile;
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const d = snap.data();
      profile = {
        uid,
        displayName: String(d.displayName || user.displayName || 'Data Engineer'),
        photoURL: d.photoURL ? String(d.photoURL) : user.photoURL || '',
        experienceTier: d.experienceTier || '4-6 yrs',
        targetPositions: Array.isArray(d.targetPositions) ? d.targetPositions : ['Senior Data Engineer'],
        targetCompanies: Array.isArray(d.targetCompanies) ? d.targetCompanies : ['Google', 'Databricks', 'Uber'],
        dailyStreak: Number(d.dailyStreak || 1),
        studyHours: Number(d.studyHours || 0),
        readinessMetrics: d.readinessMetrics || {},
      };
    } else {
      profile = {
        uid,
        displayName: (user.displayName || user.email?.split('@')[0] || 'Data Engineer').slice(0, 120),
        photoURL: (user.photoURL || '').slice(0, 512),
        experienceTier: '4-6 yrs',
        targetPositions: ['Senior Data Engineer', 'Data Engineer II'],
        targetCompanies: ['Google', 'Databricks', 'Uber', 'Snowflake', 'Flipkart'],
        dailyStreak: 1,
        studyHours: 0,
        readinessMetrics: { sql: 42, python: 38, spark: 35, systemDesign: 30 },
      };
      await setDoc(userRef, {
        ...profile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }

  let progress: UserProgress;
  try {
    const pSnap = await getDoc(progRef);
    if (pSnap.exists()) {
      const d = pSnap.data();
      progress = {
        uid,
        attemptedIds: Array.isArray(d.attemptedIds) ? d.attemptedIds : [],
        solvedIds: Array.isArray(d.solvedIds) ? d.solvedIds : [],
        bookmarks: Array.isArray(d.bookmarks) ? d.bookmarks : [],
        completedTopics: Array.isArray(d.completedTopics) ? d.completedTopics : [],
        topicAccuracy: d.topicAccuracy || {},
        sm2Queue: Array.isArray(d.sm2Queue) ? d.sm2Queue : [],
      };
    } else {
      progress = {
        uid,
        attemptedIds: [],
        solvedIds: [],
        bookmarks: [],
        completedTopics: [],
        topicAccuracy: {},
        sm2Queue: [],
      };
      await setDoc(progRef, {
        ...progress,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `user_progress/${uid}`);
  }

  return { profile, progress };
}

export async function updateUserProfile(
  uid: string,
  patch: Partial<Omit<UserProfile, 'uid'>>,
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const ref = doc(db, 'users', safeUid);
  const cleanPatch: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.displayName !== undefined) cleanPatch.displayName = patch.displayName.slice(0, 120);
  if (patch.photoURL !== undefined) cleanPatch.photoURL = patch.photoURL.slice(0, 512);
  if (patch.experienceTier !== undefined) cleanPatch.experienceTier = patch.experienceTier;
  if (patch.targetPositions !== undefined) cleanPatch.targetPositions = patch.targetPositions.slice(0, 10);
  if (patch.targetCompanies !== undefined) cleanPatch.targetCompanies = patch.targetCompanies.slice(0, 25);
  if (patch.dailyStreak !== undefined) cleanPatch.dailyStreak = Math.max(0, Math.min(10000, Math.round(patch.dailyStreak)));
  if (patch.studyHours !== undefined) cleanPatch.studyHours = Math.max(0, Math.min(100000, patch.studyHours));
  if (patch.readinessMetrics !== undefined) cleanPatch.readinessMetrics = patch.readinessMetrics;

  try {
    await updateDoc(ref, cleanPatch);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${safeUid}`);
  }
}

export async function updateUserProgress(
  uid: string,
  patch: Partial<Omit<UserProgress, 'uid'>>,
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const ref = doc(db, 'user_progress', safeUid);
  const cleanPatch: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.attemptedIds !== undefined) cleanPatch.attemptedIds = patch.attemptedIds.slice(-5000);
  if (patch.solvedIds !== undefined) cleanPatch.solvedIds = patch.solvedIds.slice(-5000);
  if (patch.bookmarks !== undefined) cleanPatch.bookmarks = patch.bookmarks.slice(-1000);
  if (patch.completedTopics !== undefined) cleanPatch.completedTopics = patch.completedTopics.slice(-500);
  if (patch.topicAccuracy !== undefined) cleanPatch.topicAccuracy = patch.topicAccuracy;
  if (patch.sm2Queue !== undefined) cleanPatch.sm2Queue = patch.sm2Queue.slice(-1000);

  try {
    await updateDoc(ref, cleanPatch);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `user_progress/${safeUid}`);
  }
}

export async function saveUserNote(
  uid: string,
  note: { title: string; content: string; topic: string; source: UserNote['source'] },
): Promise<UserNote> {
  const safeUid = sanitizeId(uid);
  const noteId = sanitizeId(`note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const ref = doc(db, 'user_progress', safeUid, 'notes', noteId);
  const payload = {
    uid: safeUid,
    title: note.title.slice(0, 200) || 'Untitled Note',
    content: note.content.slice(0, 20000),
    topic: note.topic.slice(0, 100),
    source: note.source,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  try {
    await setDoc(ref, payload);
    return {
      id: noteId,
      uid: safeUid,
      title: payload.title,
      content: payload.content,
      topic: payload.topic,
      source: payload.source,
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `user_progress/${safeUid}/notes/${noteId}`);
  }
}

export async function deleteUserNote(uid: string, noteId: string): Promise<void> {
  const safeUid = sanitizeId(uid);
  const safeNoteId = sanitizeId(noteId);
  try {
    await deleteDoc(doc(db, 'user_progress', safeUid, 'notes', safeNoteId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `user_progress/${safeUid}/notes/${safeNoteId}`);
  }
}

export async function saveUserSubmission(
  uid: string,
  sub: Omit<UserSubmission, 'id' | 'uid' | 'createdAt'>,
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const subId = sanitizeId(`sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  const ref = doc(db, 'user_progress', safeUid, 'submissions', subId);
  try {
    await setDoc(ref, {
      uid: safeUid,
      questionId: sanitizeId(sub.questionId),
      language: sub.language === 'design' ? 'yaml' : sub.language,
      code: sub.code.slice(0, 30000),
      passed: Boolean(sub.passed),
      runtimeMs: Math.max(0, Math.min(600000, sub.runtimeMs)),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `user_progress/${safeUid}/submissions/${subId}`);
  }
}

export async function saveCopilotTurn(
  uid: string,
  turn: { role: 'user' | 'assistant'; content: string; contextLabel?: string },
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const msgId = sanitizeId(`msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  const ref = doc(db, 'user_progress', safeUid, 'chat', msgId);
  try {
    await setDoc(ref, {
      uid: safeUid,
      role: turn.role,
      content: turn.content.slice(0, 24000) || '...',
      contextLabel: (turn.contextLabel || '').slice(0, 200),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `user_progress/${safeUid}/chat/${msgId}`);
  }
}

export function subscribeUserNotes(
  uid: string,
  onData: (notes: UserNote[]) => void,
): Unsubscribe {
  const safeUid = sanitizeId(uid);
  // Single-field where query without orderBy avoids requiring any composite Firestore index
  const q = query(
    collection(db, 'user_progress', safeUid, 'notes'),
    where('uid', '==', safeUid),
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: (UserNote & { _ts: number })[] = snap.docs.map((d) => {
        const data = d.data();
        const tsDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        return {
          id: d.id,
          uid: String(data.uid || safeUid),
          title: String(data.title || ''),
          content: String(data.content || ''),
          topic: String(data.topic || ''),
          source: data.source || 'manual',
          createdAt: tsDate.toISOString(),
          _ts: tsDate.getTime(),
        };
      });
      items.sort((a, b) => b._ts - a._ts);
      onData(items.map(({ _ts: _, ...rest }) => rest));
    },
    (err) => {
      console.warn('Notes listener fallback:', err instanceof Error ? err.message : err);
    },
  );
}

export function subscribeCopilotHistory(
  uid: string,
  onData: (messages: CopilotMessage[]) => void,
): Unsubscribe {
  const safeUid = sanitizeId(uid);
  // Single-field where query without orderBy avoids requiring any composite Firestore index
  const q = query(
    collection(db, 'user_progress', safeUid, 'chat'),
    where('uid', '==', safeUid),
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: (CopilotMessage & { _ts: number })[] = snap.docs.map((d) => {
        const data = d.data();
        const tsDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        return {
          id: d.id,
          role: data.role === 'assistant' ? 'assistant' : 'user',
          content: String(data.content || ''),
          contextLabel: String(data.contextLabel || ''),
          createdAt: tsDate.toISOString(),
          _ts: tsDate.getTime(),
        };
      });
      items.sort((a, b) => a._ts - b._ts);
      onData(items.map(({ _ts: _, ...rest }) => rest));
    },
    (err) => {
      console.warn('Copilot history listener fallback:', err instanceof Error ? err.message : err);
    },
  );
}

export async function saveBatchQuestionsToFirestore(
  questions: Question[],
  uid: string,
  onProgress?: (committed: number, total: number) => void,
): Promise<void> {
  const safeUid = sanitizeId(uid);

  const buildPayload = (q: Question, qId: string) => ({
    uniqueId: qId,
    title: q.title.slice(0, 240),
    problemStatement: q.problemStatement.slice(0, 15000),
    domain: q.domain.slice(0, 80),
    topic: q.topic.slice(0, 100),
    subtopic: (q.subtopic || q.topic).slice(0, 100),
    roadmapTracks: (q.roadmapTracks || []).slice(0, 15),
    difficulty: q.difficulty,
    experienceLevel: q.experienceLevel,
    companyTags: (q.companyTags || []).slice(0, 30),
    roundType: q.roundType.slice(0, 80),
    sourceType: q.sourceType,
    sourceReference: (q.askedContext || q.sourceReference || '').slice(0, 300),
    setupSchemaOrEnv: (q.setupSchemaOrEnv || '').slice(0, 20000),
    sampleInput: (q.sampleInput || '').slice(0, 8000),
    expectedOutput: (q.expectedOutput || '').slice(0, 8000),
    testCases: [...(q.testCases || []), ...(q.hiddenTestCases || [])].slice(0, 20),
    starterCode: (q.starterCode || '').slice(0, 10000),
    detailedSolution: (q.detailedSolution || '').slice(0, 15000),
    alternativeApproaches: (q.alternativeApproaches || '').slice(0, 8000),
    explanation: (q.explanation || '').slice(0, 10000),
    practicalRelevance: (q.practicalRelevance || '').slice(0, 2000),
    relatedLearningId: (q.relatedLearningId || '').slice(0, 128),
    executionPlanNotes: (q.executionPlanNotes || '').slice(0, 4000),
    updatedAt: serverTimestamp(),
  });

  try {
    if (questions.length === 1) {
      const q = questions[0];
      const qId = sanitizeId(q.uniqueId);
      const ref = doc(db, 'questions', qId);
      const snap = await getDoc(ref);
      const fields = buildPayload(q, qId);
      if (snap.exists()) {
        await updateDoc(ref, fields);
      } else {
        await setDoc(ref, {
          ...fields,
          createdBy: safeUid,
          createdAt: serverTimestamp(),
        });
      }
      onProgress?.(1, 1);
      return;
    }

    const CHUNK_SIZE = 500;
    for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
      const slice = questions.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const q of slice) {
        const qId = sanitizeId(q.uniqueId);
        const ref = doc(db, 'questions', qId);
        batch.set(ref, {
          ...buildPayload(q, qId),
          createdBy: safeUid,
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
      onProgress?.(Math.min(i + slice.length, questions.length), questions.length);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'questions');
  }
}

export async function fetchCustomQuestions(): Promise<Question[]> {
  try {
    const q = query(
      collection(db, 'questions'),
      where('sourceType', 'in', ['verified_interview', 'reported_experience', 'curated_track', 'ai_generated_practice']),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Question);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'questions');
  }
}

export async function deleteQuestionFromFirestore(questionId: string): Promise<void> {
  const safeId = sanitizeId(questionId);
  try {
    await deleteDoc(doc(db, 'questions', safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `questions/${safeId}`);
  }
}

export type ArenaStateKey =
  | '__scorecards__'
  | '__job_radar__'
  | '__quest_state__'
  | '__practical_lab__'
  | '__mcq_progress__'
  | '__mistake_vault__'
  | '__resume_profile__';

export async function saveUserArenaState<T>(
  uid: string | null,
  stateKey: ArenaStateKey,
  value: T,
): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`de360_state_${stateKey}`, JSON.stringify(value));
    } catch {
      // Ignore quota errors
    }
  }
  if (!uid) return;
  const safeUid = sanitizeId(uid);
  const noteId = sanitizeId(`state_${stateKey}`);
  const ref = doc(db, 'user_progress', safeUid, 'notes', noteId);
  try {
    const existing = await getDoc(ref);
    const serialized = JSON.stringify(value).slice(0, 19500);
    if (existing.exists()) {
      await updateDoc(ref, {
        title: stateKey,
        content: serialized,
        topic: stateKey,
        source: 'arena',
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        uid: safeUid,
        title: stateKey,
        content: serialized,
        topic: stateKey,
        source: 'arena',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch {
    // Fallback seamlessly via localStorage
  }
}

export async function loadUserArenaState<T>(
  uid: string | null,
  stateKey: ArenaStateKey,
  fallback: T,
): Promise<T> {
  let localVal: T = fallback;
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(`de360_state_${stateKey}`);
      if (raw) localVal = JSON.parse(raw) as T;
    } catch {
      localVal = fallback;
    }
  }
  if (!uid) return localVal;
  const safeUid = sanitizeId(uid);
  const noteId = sanitizeId(`state_${stateKey}`);
  try {
    const snap = await getDoc(doc(db, 'user_progress', safeUid, 'notes', noteId));
    if (snap.exists()) {
      const content = String(snap.data().content || '');
      if (content) {
        const parsed = JSON.parse(content) as T;
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(`de360_state_${stateKey}`, JSON.stringify(parsed));
        }
        return parsed;
      }
    }
  } catch {
    // Keep localVal cleanly
  }
  return localVal;
}

export interface FirestoreDiagnosticsResult {
  passed: boolean;
  latencyMs: number;
  connectionOk: boolean;
  questionsReadable: boolean;
  knowledgeReadable: boolean;
  writeRoundtripOk: boolean | null;
  details: string;
}

export async function runFirestoreDiagnostics(uid: string | null): Promise<FirestoreDiagnosticsResult> {
  const start = performance.now();
  let connectionOk = false;
  let questionsReadable = false;
  let knowledgeReadable = false;
  let writeRoundtripOk: boolean | null = null;
  const notes: string[] = [];

  try {
    await getDoc(doc(db, 'test', 'connection'));
    connectionOk = true;
    notes.push('test/connection reachable');
  } catch (err) {
    notes.push(`connection check error: ${err instanceof Error ? err.message : 'failed'}`);
  }

  try {
    const qSnap = await getDocs(
      query(
        collection(db, 'questions'),
        where('sourceType', 'in', ['verified_interview', 'reported_experience', 'curated_track', 'ai_generated_practice']),
      ),
    );
    questionsReadable = true;
    notes.push(`questions read (${qSnap.size} custom docs)`);
  } catch (err) {
    notes.push(`questions read error: ${err instanceof Error ? err.message : 'failed'}`);
  }

  try {
    const kSnap = await getDocs(collection(db, 'knowledge_topics'));
    knowledgeReadable = true;
    notes.push(`knowledge_topics read (${kSnap.size} docs)`);
  } catch (err) {
    notes.push(`knowledge_topics error: ${err instanceof Error ? err.message : 'failed'}`);
  }

  if (uid) {
    const safeUid = sanitizeId(uid);
    const diagNoteId = sanitizeId(`diag_${Date.now()}`);
    const ref = doc(db, 'user_progress', safeUid, 'notes', diagNoteId);
    try {
      await setDoc(ref, {
        uid: safeUid,
        title: '__e2e_diagnostic_probe__',
        content: 'Firestore write/read/delete probe ok',
        topic: 'diagnostics',
        source: 'arena',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const verifySnap = await getDoc(ref);
      await deleteDoc(ref);
      writeRoundtripOk = verifySnap.exists();
      notes.push(`auth write/read/delete probe ${writeRoundtripOk ? 'passed' : 'missing doc'}`);
    } catch (err) {
      writeRoundtripOk = false;
      notes.push(`write probe error: ${err instanceof Error ? err.message : 'failed'}`);
    }

    // Index-free list query check across all 4 user subcollections (chat, notes, mistake_vault, applications)
    const subCols = ['chat', 'notes', 'mistake_vault', 'applications'] as const;
    for (const sub of subCols) {
      try {
        await getDocs(query(collection(db, 'user_progress', safeUid, sub), where('uid', '==', safeUid)));
        notes.push(`${sub} index-free query ok`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes('index')) {
          writeRoundtripOk = false;
          notes.push(`${sub} COMPOSITE INDEX ERROR: ${msg}`);
        } else {
          notes.push(`${sub} query checked (fallback/rules active)`);
        }
      }
    }
  } else {
    notes.push('index-free subcollection listeners active · sign in to verify authenticated write/read roundtrip');
  }

  const latencyMs = Math.round(performance.now() - start);
  const passed = connectionOk && questionsReadable && knowledgeReadable && (writeRoundtripOk === null || writeRoundtripOk);
  return {
    passed,
    latencyMs,
    connectionOk,
    questionsReadable,
    knowledgeReadable,
    writeRoundtripOk,
    details: notes.join(' · '),
  };
}

/* ============================================================================
 * SPACED-REPETITION MISTAKE VAULT (1D -> 3D -> 7D -> 21D)
 * ============================================================================ */
export const MISTAKE_INTERVALS = [1, 3, 7, 21] as const;

export async function loadMistakeVault(uid: string | null): Promise<MistakeVaultItem[]> {
  const localItems = await loadUserArenaState<MistakeVaultItem[]>(null, '__mistake_vault__', []);
  if (!uid) return [...localItems].sort((a, b) => a.dueAt - b.dueAt);

  const safeUid = sanitizeId(uid);
  try {
    const snap = await getDocs(
      query(collection(db, 'user_progress', safeUid, 'mistake_vault'), where('uid', '==', safeUid)),
    );
    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ ...(d.data() as MistakeVaultItem), id: d.id }));
      items.sort((a, b) => a.dueAt - b.dueAt);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('de360_state___mistake_vault__', JSON.stringify(items));
      }
      return items;
    }
  } catch {
    // Fallback cleanly to arena note/localStorage store if subcollection rules are not deployed yet
  }
  const fallbackItems = await loadUserArenaState<MistakeVaultItem[]>(uid, '__mistake_vault__', localItems);
  return [...fallbackItems].sort((a, b) => a.dueAt - b.dueAt);
}

export async function saveMistakeVaultItem(uid: string | null, item: MistakeVaultItem): Promise<MistakeVaultItem[]> {
  const existing = await loadMistakeVault(uid);
  const merged = [item, ...existing.filter((x) => x.id !== item.id)].slice(0, 120);
  await saveUserArenaState(uid, '__mistake_vault__', merged);

  if (uid) {
    const safeUid = sanitizeId(uid);
    const safeId = sanitizeId(item.id);
    try {
      await setDoc(doc(db, 'user_progress', safeUid, 'mistake_vault', safeId), {
        ...item,
        id: safeId,
        uid: safeUid,
      });
    } catch {
      // Arena fallback already persisted
    }
  }
  return merged.sort((a, b) => a.dueAt - b.dueAt);
}

export async function deleteMistakeVaultItem(uid: string | null, itemId: string): Promise<MistakeVaultItem[]> {
  const existing = await loadMistakeVault(uid);
  const next = existing.filter((x) => x.id !== itemId);
  await saveUserArenaState(uid, '__mistake_vault__', next);
  if (uid) {
    const safeUid = sanitizeId(uid);
    const safeId = sanitizeId(itemId);
    try {
      await deleteDoc(doc(db, 'user_progress', safeUid, 'mistake_vault', safeId));
    } catch {
      // Ignore if stored in arena fallback
    }
  }
  return next;
}

/* ============================================================================
 * MASTER RESUME PROFILE & JOB APPLICATIONS TRACKER
 * ============================================================================ */
export const DEFAULT_MASTER_RESUME: MasterResumeProfile = {
  uid: 'guest',
  headline: 'Senior Data Engineer · Spark, Kafka, Iceberg, SQL & Cloud Lakehouse',
  yoe: '4.5+ YOE',
  coreSkills: 'SQL, Python, PySpark, Apache Iceberg, Apache Kafka, Apache Flink, dbt, Airflow, Snowflake, AWS',
  resumeText:
    'Senior Data Engineer with 4.5+ years building petabyte-scale batch and real-time Lakehouse pipelines.\n- Architected CDC ingestion from Postgres/MySQL into Apache Iceberg via Debezium + Kafka, reducing reporting latency from 6 hours to 4 minutes.\n- Resolved extreme PySpark data skew using AQE and 16x key salting, cutting EMR job runtime by 58% and saving $14K/month in cloud compute.\n- Modeled conformed Star Schema and SCD Type-2 dimensions in Snowflake + dbt with automated schema drift & reconciliation contracts.',
  updatedAt: new Date().toISOString(),
};

export async function loadMasterResume(uid: string | null): Promise<MasterResumeProfile> {
  const local = await loadUserArenaState<MasterResumeProfile>(null, '__resume_profile__', DEFAULT_MASTER_RESUME);
  if (!uid) return local;
  const safeUid = sanitizeId(uid);
  try {
    const snap = await getDoc(doc(db, 'user_progress', safeUid, 'resume_profile', 'master'));
    if (snap.exists()) {
      const data = snap.data() as MasterResumeProfile;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('de360_state___resume_profile__', JSON.stringify(data));
      }
      return data;
    }
  } catch {
    // Fallback smoothly to arena notes
  }
  return loadUserArenaState<MasterResumeProfile>(uid, '__resume_profile__', local);
}

export async function saveMasterResume(uid: string | null, profile: MasterResumeProfile): Promise<void> {
  const clean: MasterResumeProfile = {
    ...profile,
    uid: uid ? sanitizeId(uid) : 'guest',
    updatedAt: new Date().toISOString(),
  };
  await saveUserArenaState(uid, '__resume_profile__', clean);
  if (uid) {
    const safeUid = sanitizeId(uid);
    try {
      await setDoc(doc(db, 'user_progress', safeUid, 'resume_profile', 'master'), clean);
    } catch {
      // Arena notes fallback already synced
    }
  }
}

export async function loadJobApplications(uid: string | null): Promise<LiveJobPosting[]> {
  const local = await loadUserArenaState<LiveJobPosting[]>(null, '__job_radar__', []);
  if (!uid) return local;
  const safeUid = sanitizeId(uid);
  try {
    const snap = await getDocs(
      query(collection(db, 'user_progress', safeUid, 'applications'), where('uid', '==', safeUid)),
    );
    if (!snap.empty) {
      const rows = snap.docs.map((d) => d.data() as LiveJobPosting);
      rows.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('de360_state___job_radar__', JSON.stringify(rows));
      }
      return rows;
    }
  } catch {
    // Fallback cleanly to arena store
  }
  return loadUserArenaState<LiveJobPosting[]>(uid, '__job_radar__', local);
}

export async function saveJobApplications(uid: string | null, items: LiveJobPosting[]): Promise<void> {
  await saveUserArenaState(uid, '__job_radar__', items);
  if (!uid) return;
  const safeUid = sanitizeId(uid);
  try {
    const existingSnap = await getDocs(
      query(collection(db, 'user_progress', safeUid, 'applications'), where('uid', '==', safeUid)),
    );
    const keepIds = new Set(items.map((i) => sanitizeId(i.id)));
    const batch = writeBatch(db);
    for (const d of existingSnap.docs) {
      if (!keepIds.has(d.id)) batch.delete(d.ref);
    }
    for (const item of items.slice(0, 60)) {
      const appId = sanitizeId(item.id);
      batch.set(doc(db, 'user_progress', safeUid, 'applications', appId), {
        ...item,
        uid: safeUid,
      });
    }
    await batch.commit();
  } catch {
    // Arena fallback already persisted cleanly
  }
}

const LOCAL_GENERATED_TOPICS_KEY = 'de360_generated_topics_v1';

export function loadLocalGeneratedTopics(): KnowledgeTopic[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_GENERATED_TOPICS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as KnowledgeTopic[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalGeneratedTopic(topic: KnowledgeTopic): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadLocalGeneratedTopics().filter((t) => t.id !== topic.id);
    window.localStorage.setItem(LOCAL_GENERATED_TOPICS_KEY, JSON.stringify([topic, ...existing].slice(0, 50)));
  } catch {
    // Ignore storage quota errors
  }
}

function packSectionsWithMeta(topic: KnowledgeTopic): Record<string, unknown> {
  return {
    ...topic.sections,
    _metaSummary: topic.summary || '',
    _metaSlug: topic.slug || '',
    _metaEstimatedMinutes: topic.estimatedMinutes || 12,
    _metaDiagramNodes: topic.diagramNodes || [],
    _metaDiagramEdges: topic.diagramEdges || [],
    _metaFlashcards: topic.flashcards || [],
    _metaQuiz: topic.quiz || [],
    _metaRelatedQuestionIds: topic.relatedQuestionIds || [],
  };
}

function unpackKnowledgeTopic(raw: Record<string, unknown>, docId: string): KnowledgeTopic {
  const sec = (typeof raw.sections === 'object' && raw.sections !== null ? raw.sections : {}) as Record<string, unknown>;
  return {
    id: String(raw.id || docId),
    slug: sec._metaSlug ? String(sec._metaSlug) : undefined,
    title: String(raw.title || 'Data Engineering Topic'),
    domain: String(raw.domain || 'Data Engineering'),
    summary: String(raw.summary || sec._metaSummary || ''),
    officialDocRefAndVersion: String(raw.officialDocRefAndVersion || ''),
    estimatedMinutes: Number(raw.estimatedMinutes || sec._metaEstimatedMinutes || 12),
    sections: sec as unknown as KnowledgeTopic['sections'],
    diagramNodes: Array.isArray(raw.diagramNodes)
      ? (raw.diagramNodes as KnowledgeTopic['diagramNodes'])
      : Array.isArray(sec._metaDiagramNodes)
        ? (sec._metaDiagramNodes as KnowledgeTopic['diagramNodes'])
        : [],
    diagramEdges: Array.isArray(raw.diagramEdges)
      ? (raw.diagramEdges as KnowledgeTopic['diagramEdges'])
      : Array.isArray(sec._metaDiagramEdges)
        ? (sec._metaDiagramEdges as KnowledgeTopic['diagramEdges'])
        : [],
    flashcards: Array.isArray(raw.flashcards)
      ? (raw.flashcards as KnowledgeTopic['flashcards'])
      : Array.isArray(sec._metaFlashcards)
        ? (sec._metaFlashcards as KnowledgeTopic['flashcards'])
        : [],
    quiz: Array.isArray(raw.quiz)
      ? (raw.quiz as KnowledgeTopic['quiz'])
      : Array.isArray(sec._metaQuiz)
        ? (sec._metaQuiz as KnowledgeTopic['flashcards'] extends never ? never : KnowledgeTopic['quiz'])
        : [],
    relatedQuestionIds: Array.isArray(raw.relatedQuestionIds)
      ? (raw.relatedQuestionIds as string[])
      : Array.isArray(sec._metaRelatedQuestionIds)
        ? (sec._metaRelatedQuestionIds as string[])
        : [],
  };
}

export async function fetchKnowledgeTopics(): Promise<KnowledgeTopic[]> {
  try {
    const snap = await getDocs(collection(db, 'knowledge_topics'));
    return snap.docs.map((d) => unpackKnowledgeTopic(d.data() as Record<string, unknown>, d.id));
  } catch {
    return [];
  }
}

export async function upsertKnowledgeTopicFirestore(topic: KnowledgeTopic, uid: string): Promise<void> {
  const safeId = sanitizeId(topic.id);
  const safeUid = sanitizeId(uid);
  const ref = doc(db, 'knowledge_topics', safeId);
  const packedSections = packSectionsWithMeta(topic);
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, {
        title: topic.title.slice(0, 200),
        domain: topic.domain.slice(0, 80),
        officialDocRefAndVersion: (topic.officialDocRefAndVersion || '').slice(0, 300),
        sections: packedSections,
        updatedBy: safeUid,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        id: safeId,
        title: topic.title.slice(0, 200),
        domain: topic.domain.slice(0, 80),
        officialDocRefAndVersion: (topic.officialDocRefAndVersion || '').slice(0, 300),
        sections: packedSections,
        updatedBy: safeUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `knowledge_topics/${safeId}`);
  }
}

export async function saveGeneratedKnowledgeTopic(topic: KnowledgeTopic, uid: string | null): Promise<void> {
  saveLocalGeneratedTopic(topic);
  if (!uid) return;
  try {
    const safeId = sanitizeId(topic.id);
    const safeUid = sanitizeId(uid);
    const ref = doc(db, 'knowledge_topics', safeId);
    const packedSections = packSectionsWithMeta(topic);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, {
        title: topic.title.slice(0, 200),
        domain: topic.domain.slice(0, 80),
        officialDocRefAndVersion: (topic.officialDocRefAndVersion || '').slice(0, 300),
        sections: packedSections,
        updatedBy: safeUid,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        id: safeId,
        title: topic.title.slice(0, 200),
        domain: topic.domain.slice(0, 80),
        officialDocRefAndVersion: (topic.officialDocRefAndVersion || '').slice(0, 300),
        sections: packedSections,
        updatedBy: safeUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch {
    // Non-admin users persist generated topics via localStorage cache seamlessly
  }
}

export async function fetchInterviewExperiences(): Promise<InterviewExperience[]> {
  try {
    const q = query(
      collection(db, 'interview_experiences'),
      where('verificationStatus', 'in', ['verified', 'reported_experience']),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...(d.data() as InterviewExperience), id: d.id }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'interview_experiences');
  }
}

export async function fetchPendingExperiencesForAdmin(): Promise<InterviewExperience[]> {
  try {
    const snap = await getDocs(collection(db, 'interview_experiences'));
    return snap.docs.map((d) => ({ ...(d.data() as InterviewExperience), id: d.id }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'interview_experiences');
  }
}

export async function submitInterviewExperience(
  uid: string,
  exp: Omit<InterviewExperience, 'id' | 'authorId' | 'verificationStatus'>,
): Promise<string> {
  const safeUid = sanitizeId(uid);
  const expId = sanitizeId(`exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  const ref = doc(db, 'interview_experiences', expId);
  try {
    await setDoc(ref, {
      authorId: safeUid,
      company: exp.company.slice(0, 100),
      position: exp.position.slice(0, 120),
      experience: exp.experience.slice(0, 40),
      location: (exp.location || '').slice(0, 100),
      round: exp.round.slice(0, 80),
      technology: (exp.technology || '').slice(0, 160),
      difficulty: exp.difficulty,
      interviewDate: (exp.interviewDate || '').slice(0, 40),
      roundsDetail: (exp.roundsDetail || []).slice(0, 15),
      sourceAttribution: (exp.sourceAttribution || 'Community Candidate Submission').slice(0, 240),
      verificationStatus: 'pending_review',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return expId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `interview_experiences/${expId}`);
  }
}

export async function moderateInterviewExperience(
  expId: string,
  status: InterviewExperience['verificationStatus'],
): Promise<void> {
  const safeId = sanitizeId(expId);
  try {
    await updateDoc(doc(db, 'interview_experiences', safeId), {
      verificationStatus: status,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `interview_experiences/${safeId}`);
  }
}
