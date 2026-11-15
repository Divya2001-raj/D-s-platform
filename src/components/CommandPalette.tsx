import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, BookOpen, Building2, Code2, Cpu, Search, Terminal, X } from 'lucide-react';
import type { AppRoute, CompanyPortal, KnowledgeTopic, ProductionScenario, Question } from '../types/platform';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  questions: Question[];
  topics: KnowledgeTopic[];
  companies: CompanyPortal[];
  scenarios: ProductionScenario[];
  onNavigate: (route: AppRoute) => void;
  onSelectQuestion: (q: Question) => void;
  onSelectTopic: (id: string) => void;
  onSelectCompany: (id: string) => void;
}

export function CommandPalette({
  open,
  onClose,
  questions,
  topics,
  companies,
  scenarios,
  onNavigate,
  onSelectQuestion,
  onSelectTopic,
  onSelectCompany,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedQuestions = questions
      .filter(
        (item) =>
          !q ||
          item.title.toLowerCase().includes(q) ||
          item.topic.toLowerCase().includes(q) ||
          item.domain.toLowerCase().includes(q) ||
          item.companyTags.some((c) => c.toLowerCase().includes(q)),
      )
      .slice(0, 7);

    const matchedTopics = topics
      .filter((t) => !q || t.title.toLowerCase().includes(q) || t.domain.toLowerCase().includes(q))
      .slice(0, 4);

    const matchedCompanies = companies
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.primaryStack.some((s) => s.toLowerCase().includes(q)))
      .slice(0, 4);

    const matchedScenarios = scenarios
      .filter((s) => !q || s.title.toLowerCase().includes(q) || s.domain.toLowerCase().includes(q))
      .slice(0, 3);

    return { matchedQuestions, matchedTopics, matchedCompanies, matchedScenarios };
  }, [query, questions, topics, companies, scenarios]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-20 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-surface w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
              <Search className="h-4 w-4 shrink-0 text-[#2DD4BF]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search 126+ SQL/Python/PySpark problems, companies, Knowledge Hub, or views..."
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"
              />
              <button
                onClick={onClose}
                className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-white"
                aria-label="Close command palette"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-3 space-y-4">
              <div>
                <div className="px-2 pb-1.5 text-xs font-medium text-slate-500">Quick Workspaces</div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {[
                    { id: 'sql-arena' as AppRoute, label: 'SQL Arena' },
                    { id: 'python-arena' as AppRoute, label: 'Python & DSA' },
                    { id: 'system-design' as AppRoute, label: 'System Design' },
                    { id: 'mock-interview' as AppRoute, label: 'AI Mock Interview' },
                  ].map((nav) => (
                    <button
                      key={nav.id}
                      onClick={() => {
                        onNavigate(nav.id);
                        onClose();
                      }}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-[#2DD4BF]/40 hover:text-[#2DD4BF]"
                    >
                      <span className="truncate">{nav.label}</span>
                      <ArrowRight className="h-3 w-3 shrink-0 opacity-60" />
                    </button>
                  ))}
                </div>
              </div>

              {results.matchedQuestions.length > 0 && (
                <div>
                  <div className="px-2 pb-1.5 text-xs font-medium text-slate-500">Coding &amp; SQL Questions</div>
                  <div className="space-y-1">
                    {results.matchedQuestions.map((q) => (
                      <button
                        key={q.uniqueId}
                        onClick={() => {
                          onSelectQuestion(q);
                          onClose();
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          {q.domain === 'Analytical SQL' ? (
                            <Terminal className="h-4 w-4 shrink-0 text-[#2DD4BF]" />
                          ) : (
                            <Code2 className="h-4 w-4 shrink-0 text-[#818CF8]" />
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-100">{q.title}</div>
                            <div className="truncate text-xs text-slate-400">
                              {q.domain} · {q.topic} · {q.difficulty}
                            </div>
                          </div>
                        </div>
                        <span className="ml-2 shrink-0 font-mono text-xs text-slate-500">{q.experienceLevel}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.matchedTopics.length > 0 && (
                <div>
                  <div className="px-2 pb-1.5 text-xs font-medium text-slate-500">Knowledge Hub Modules</div>
                  <div className="space-y-1">
                    {results.matchedTopics.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          onSelectTopic(t.id);
                          onClose();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5"
                      >
                        <BookOpen className="h-4 w-4 shrink-0 text-[#A78BFA]" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-100">{t.title}</div>
                          <div className="truncate text-xs text-slate-400">{t.domain}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.matchedCompanies.length > 0 && (
                <div>
                  <div className="px-2 pb-1.5 text-xs font-medium text-slate-500">Company Preparation Portals</div>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {results.matchedCompanies.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          onSelectCompany(c.id);
                          onClose();
                        }}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5"
                      >
                        <Building2 className="h-4 w-4 shrink-0 text-[#FBBF24]" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-100">{c.name}</div>
                          <div className="truncate text-xs text-slate-400">{c.primaryStack.slice(0, 3).join(' · ')}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.matchedScenarios.length > 0 && (
                <div>
                  <div className="px-2 pb-1.5 text-xs font-medium text-slate-500">Production Scenario Labs</div>
                  <div className="space-y-1">
                    {results.matchedScenarios.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          onNavigate('scenarios');
                          onClose();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5"
                      >
                        <Cpu className="h-4 w-4 shrink-0 text-[#FB7185]" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-100">{s.title}</div>
                          <div className="truncate text-xs text-slate-400">{s.severity} · {s.domain}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
