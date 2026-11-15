import { SEED_SQL_QUESTIONS } from './seedSqlQuestions';
import { SEED_DSA_PYTHON_QUESTIONS } from './seedDsaPythonQuestions';
import { SEED_DE_CORE_QUESTIONS } from './seedDeCoreQuestions';
import { SEED_KNOWLEDGE_TOPICS } from './seedKnowledge';
import { ALL_COMPANY_PORTALS, SEED_EXPERIENCES } from './seedCompanies';
import { SEED_PRODUCTION_SCENARIOS } from './seedScenarios';
import type { Question } from '../types/platform';

export const ALL_SEED_QUESTIONS: Question[] = [
  ...SEED_SQL_QUESTIONS,
  ...SEED_DSA_PYTHON_QUESTIONS,
  ...SEED_DE_CORE_QUESTIONS,
];

export {
  SEED_SQL_QUESTIONS,
  SEED_DSA_PYTHON_QUESTIONS,
  SEED_DE_CORE_QUESTIONS,
  SEED_KNOWLEDGE_TOPICS,
  ALL_COMPANY_PORTALS,
  SEED_EXPERIENCES,
  SEED_PRODUCTION_SCENARIOS,
};

export const ROADMAP_TRACKS = [
  {
    id: 'Analytical SQL Mastery',
    subtitle: 'LeetCode SQL 50 + DataLemur / StrataScratch Style',
    description: 'Window functions, Gaps & Islands, Sessionization, Rolling Date Spines, Point-in-Time ASOF joins, Funnels, Cohorts, Recursive CTEs, and SARGable Query Optimization.',
    targetCount: 42,
    accent: '#2DD4BF',
  },
  {
    id: 'DSA Pattern Roadmap',
    subtitle: 'NeetCode 150 / Blind 75 Style for Data Engineers',
    description: 'Arrays & Hashing, Two Pointers, Sliding Window, Stack, Binary Search, Linked List, Trees, Tries, Heap/Priority Queue, Backtracking, Graphs, DAG Topo Sort, DP, Greedy, Intervals, Bit Manipulation.',
    targetCount: 42,
    accent: '#818CF8',
  },
  {
    id: 'Data Engineering Core',
    subtitle: 'DataVidhya 850+ Style Core, PySpark & Engineering Labs',
    description: 'Nested JSON/XML flattening, Log P95, Memory Generators, PySpark Joins & Skew Salting, AQE, Delta/Iceberg MERGE & Time Travel, SCD Types 1-3, CDC Watermarks, Data Contracts, Schema Evolution & CI/CD.',
    targetCount: 42,
    accent: '#FBBF24',
  },
] as const;
