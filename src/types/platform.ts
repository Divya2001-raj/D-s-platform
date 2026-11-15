export type ExperienceTier = '3-4 yrs' | '4-6 yrs' | '6+ yrs';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type QuestionSourceType =
  | 'verified_interview'
  | 'reported_experience'
  | 'curated_track'
  | 'ai_generated_practice';

export type VerificationStatus =
  | 'verified'
  | 'reported_experience'
  | 'pending_review'
  | 'rejected';

export interface QuestionTestCase {
  name: string;
  input: string;
  expected: string;
}

export type RoundNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type EvaluationType = 'sql' | 'python' | 'design_rubric';

export interface Question {
  uniqueId: string;
  title: string;
  problemStatement: string;
  domain: string;
  topic: string;
  subtopic: string;
  roadmapTracks: string[];
  difficulty: Difficulty;
  experienceLevel: ExperienceTier;
  companyTags: string[];
  roundType: string;
  roundNumber?: RoundNumber;
  evaluationType?: EvaluationType;
  sourceType: QuestionSourceType;
  sourceReference: string;
  askedContext?: string;
  xpReward?: number;
  setupSchemaOrEnv: string;
  adversarialSetupSql?: string;
  sampleInput: string;
  expectedOutput: string;
  testCases: QuestionTestCase[];
  hiddenTestCases?: QuestionTestCase[];
  starterCode: string;
  detailedSolution: string;
  alternativeApproaches: string;
  explanation: string;
  practicalRelevance: string;
  relatedLearningId: string;
  executionPlanNotes: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArchitectureNode {
  id: string;
  label: string;
  layer: 'Source' | 'Ingest' | 'Compute' | 'Storage' | 'Serving' | 'Governance';
  detail: string;
}

export interface ArchitectureEdge {
  from: string;
  to: string;
  label: string;
}

export interface KnowledgeFlashcard {
  front: string;
  back: string;
}

export interface KnowledgeQuizItem {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  optionRationales?: string[];
  topicTag?: string;
}

export interface KnowledgeSections {
  introAndDefinition: string;
  whyItExists: string;
  problemsSolved: string;
  underlyingPrinciples: string;
  architectureAndComponents: string;
  internalWorking: string;
  executionFlow: string;
  typesAndClassifications: string;
  variationsComparison: string;
  industryUseCases: string;
  productionImplementation: string;
  codeAndConfigExamples: string;
  architectureDiagramMermaid: string;
  stepByStepGuide: string;
  expectedOutputs: string;
  advantagesLimitations: string;
  performanceScalabilityCost: string;
  techComparisons: string;
  bestPractices: string;
  commonMistakes: string;
  troubleshooting: string;
  productionChallenges: string;
  advancedConcepts: string;
  interviewQaAndFollowups: string;
  companySpecificNotes: string;
  quickRevisionCheatSheet: string;
  terminology: string;
}

export interface KnowledgeTopic {
  id: string;
  slug?: string;
  title: string;
  domain: string;
  summary: string;
  officialDocRefAndVersion: string;
  estimatedMinutes: number;
  sections: KnowledgeSections;
  diagramNodes: ArchitectureNode[];
  diagramEdges: ArchitectureEdge[];
  flashcards: KnowledgeFlashcard[];
  quiz: KnowledgeQuizItem[];
  relatedQuestionIds: string[];
}

export interface CompanyRound {
  roundNumber: number;
  name: string;
  durationMins: number;
  focus: string;
  weightage: string;
}

export interface CompanyPortal {
  id: string;
  name: string;
  tierLabel: string;
  region: 'Global' | 'India' | 'Global & India';
  primaryStack: string[];
  interviewPhilosophy: string;
  barExpectation: string;
  rounds: CompanyRound[];
  topTopics: string[];
}

export interface InterviewRoundDetail {
  roundName: string;
  summary: string;
  questionsAsked: string[];
}

export interface InterviewExperience {
  id: string;
  authorId: string;
  company: string;
  position: string;
  experience: string;
  location: string;
  round: string;
  technology: string;
  difficulty: Difficulty;
  interviewDate: string;
  roundsDetail: InterviewRoundDetail[];
  sourceAttribution: string;
  verificationStatus: VerificationStatus;
}

export interface ProductionScenario {
  id: string;
  title: string;
  domain: string;
  severity: 'SEV-1' | 'SEV-2' | 'Cost Spike';
  environment: string;
  problem: string;
  telemetryClues: string[];
  investigationSteps: string[];
  rootCause: string;
  solution: string;
  tradeOffs: string;
  preventionChecklist: string[];
}

export interface SM2Item {
  itemId: string;
  title: string;
  domain: string;
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: number;
  lastQuality: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  experienceTier: ExperienceTier;
  targetPositions: string[];
  targetCompanies: string[];
  dailyStreak: number;
  studyHours: number;
  readinessMetrics: Record<string, number>;
}

export interface UserProgress {
  uid: string;
  attemptedIds: string[];
  solvedIds: string[];
  bookmarks: string[];
  completedTopics: string[];
  topicAccuracy: Record<string, number>;
  sm2Queue: SM2Item[];
}

export interface UserNote {
  id: string;
  uid: string;
  title: string;
  content: string;
  topic: string;
  source: 'manual' | 'ai_copilot' | 'knowledge_hub' | 'arena';
  createdAt: string;
}

export interface UserSubmission {
  id: string;
  uid: string;
  questionId: string;
  language: 'sql' | 'python' | 'pyspark' | 'yaml' | 'terraform' | 'design';
  code: string;
  passed: boolean;
  runtimeMs: number;
  createdAt: string;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contextLabel?: string;
  createdAt: string;
}

export interface CopilotContext {
  view: string;
  title: string;
  domain: string;
  experienceTier: ExperienceTier;
  code?: string;
  errorOutput?: string;
  schema?: string;
  extra?: string;
}

export type MockVerdict = 'Strong Hire' | 'Hire' | 'Lean Hire' | 'No Hire';

export interface MockInterviewScorecard {
  id: string;
  company: string;
  role: string;
  mode: 'single_round' | 'full_loop';
  roundName: string;
  verdict: MockVerdict;
  axes: {
    technicalDepth: number;
    codingSqlAccuracy: number;
    edgeCasesScale: number;
    architectureModeling: number;
    communicationTradeoffs: number;
  };
  overallScore: number;
  companyBarFeedback: string;
  weakAreas: string[];
  recommendedRoundSlugs: string[];
  createdAt: string;
}

export type JobTier = 'Tier 1' | 'Tier 2' | 'High-Growth / GCC';
export type JobApplicationStatus = 'Saved' | 'Applied' | 'OA / Tech Screen' | 'On-Site' | 'Offer';

export interface LiveJobPosting {
  id: string;
  company: string;
  tier: JobTier;
  role: string;
  roleCategory?: string;
  experienceReq: string;
  location: string;
  workMode: 'Bengaluru' | 'Remote' | 'Hybrid' | 'All India';
  techStack: string[];
  postedHint: string;
  applyUrl: string;
  sourceTitle?: string;
  status?: JobApplicationStatus;
  savedAt?: string;
}

export type AppRoute =
  | 'dashboard'
  | 'rounds'
  | 'quest-roadmap'
  | 'mistake-vault'
  | 'practical-lab'
  | 'problem'
  | 'roadmaps'
  | 'sql-arena'
  | 'python-arena'
  | 'labs'
  | 'knowledge'
  | 'companies'
  | 'system-design'
  | 'scenarios'
  | 'mock-interview'
  | 'job-radar'
  | 'jd-analyzer'
  | 'notebook'
  | 'admin';

export type MistakeSourceType = 'coding_fail' | 'mcq_low_score' | 'mock_weak_area';

export interface MistakeVaultItem {
  id: string;
  uid: string;
  sourceType: MistakeSourceType;
  questionId?: string;
  topicSlug?: string;
  title: string;
  domain: string;
  reason: string;
  stage: 0 | 1 | 2 | 3; // 0 -> 1d, 1 -> 3d, 2 -> 7d, 3 -> 21d
  intervalDays: 1 | 3 | 7 | 21;
  dueAt: number;
  failures: number;
  lastFailedAt: string;
  createdAt: string;
  mastered?: boolean;
}

export interface MasterResumeProfile {
  uid: string;
  headline: string;
  yoe: string;
  coreSkills: string;
  resumeText: string;
  updatedAt: string;
}

export interface ResumeTailorBullet {
  originalFocus: string;
  rewrittenBullet: string;
  addedKeywords: string[];
}

export interface ResumeTailorResult {
  atsScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  tailoredBullets: ResumeTailorBullet[];
  outreachMessage: string;
}

