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
  sourceType: QuestionSourceType;
  sourceReference: string;
  setupSchemaOrEnv: string;
  sampleInput: string;
  expectedOutput: string;
  testCases: QuestionTestCase[];
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
  language: 'sql' | 'python' | 'pyspark' | 'yaml' | 'terraform';
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

export type AppRoute =
  | 'dashboard'
  | 'roadmaps'
  | 'sql-arena'
  | 'python-arena'
  | 'labs'
  | 'knowledge'
  | 'companies'
  | 'system-design'
  | 'scenarios'
  | 'mock-interview'
  | 'jd-analyzer'
  | 'notebook'
  | 'admin';
