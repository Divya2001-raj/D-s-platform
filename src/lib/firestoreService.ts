import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
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
      language: sub.language,
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
  const q = query(
    collection(db, 'user_progress', safeUid, 'notes'),
    where('uid', '==', safeUid),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: UserNote[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: String(data.uid),
          title: String(data.title || ''),
          content: String(data.content || ''),
          topic: String(data.topic || ''),
          source: data.source || 'manual',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        };
      });
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, `user_progress/${safeUid}/notes`),
  );
}

export function subscribeCopilotHistory(
  uid: string,
  onData: (messages: CopilotMessage[]) => void,
): Unsubscribe {
  const safeUid = sanitizeId(uid);
  const q = query(
    collection(db, 'user_progress', safeUid, 'chat'),
    where('uid', '==', safeUid),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: CopilotMessage[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          role: data.role === 'assistant' ? 'assistant' : 'user',
          content: String(data.content || ''),
          contextLabel: String(data.contextLabel || ''),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        };
      });
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, `user_progress/${safeUid}/chat`),
  );
}

export async function saveBatchQuestionsToFirestore(
  questions: Question[],
  uid: string,
): Promise<void> {
  const safeUid = sanitizeId(uid);

  try {
    if (questions.length === 1) {
      const q = questions[0];
      const qId = sanitizeId(q.uniqueId);
      const ref = doc(db, 'questions', qId);
      const snap = await getDoc(ref);
      const fields = {
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
        sourceReference: (q.sourceReference || '').slice(0, 300),
        setupSchemaOrEnv: (q.setupSchemaOrEnv || '').slice(0, 20000),
        sampleInput: (q.sampleInput || '').slice(0, 8000),
        expectedOutput: (q.expectedOutput || '').slice(0, 8000),
        testCases: (q.testCases || []).slice(0, 20),
        starterCode: (q.starterCode || '').slice(0, 10000),
        detailedSolution: (q.detailedSolution || '').slice(0, 15000),
        alternativeApproaches: (q.alternativeApproaches || '').slice(0, 8000),
        explanation: (q.explanation || '').slice(0, 10000),
        practicalRelevance: (q.practicalRelevance || '').slice(0, 2000),
        relatedLearningId: (q.relatedLearningId || '').slice(0, 128),
        executionPlanNotes: (q.executionPlanNotes || '').slice(0, 4000),
        updatedAt: serverTimestamp(),
      };
      if (snap.exists()) {
        await updateDoc(ref, fields);
      } else {
        await setDoc(ref, {
          ...fields,
          createdBy: safeUid,
          createdAt: serverTimestamp(),
        });
      }
      return;
    }

    const CHUNK_SIZE = 400;
    for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
      const slice = questions.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const q of slice) {
        const qId = sanitizeId(q.uniqueId);
        const ref = doc(db, 'questions', qId);
        batch.set(ref, {
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
          sourceReference: (q.sourceReference || '').slice(0, 300),
          setupSchemaOrEnv: (q.setupSchemaOrEnv || '').slice(0, 20000),
          sampleInput: (q.sampleInput || '').slice(0, 8000),
          expectedOutput: (q.expectedOutput || '').slice(0, 8000),
          testCases: (q.testCases || []).slice(0, 20),
          starterCode: (q.starterCode || '').slice(0, 10000),
          detailedSolution: (q.detailedSolution || '').slice(0, 15000),
          alternativeApproaches: (q.alternativeApproaches || '').slice(0, 8000),
          explanation: (q.explanation || '').slice(0, 10000),
          practicalRelevance: (q.practicalRelevance || '').slice(0, 2000),
          relatedLearningId: (q.relatedLearningId || '').slice(0, 128),
          executionPlanNotes: (q.executionPlanNotes || '').slice(0, 4000),
          createdBy: safeUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
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

export async function upsertKnowledgeTopicFirestore(topic: KnowledgeTopic, uid: string): Promise<void> {
  const safeId = sanitizeId(topic.id);
  const safeUid = sanitizeId(uid);
  const ref = doc(db, 'knowledge_topics', safeId);
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, {
        title: topic.title.slice(0, 200),
        domain: topic.domain.slice(0, 80),
        officialDocRefAndVersion: (topic.officialDocRefAndVersion || '').slice(0, 300),
        sections: topic.sections,
        updatedBy: safeUid,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        id: safeId,
        title: topic.title.slice(0, 200),
        domain: topic.domain.slice(0, 80),
        officialDocRefAndVersion: (topic.officialDocRefAndVersion || '').slice(0, 300),
        sections: topic.sections,
        updatedBy: safeUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `knowledge_topics/${safeId}`);
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
