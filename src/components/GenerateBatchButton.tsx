import React, { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { ExperienceTier, Question } from '../types/platform';

import { enrichQuestionBank } from '../lib/questionEnricher';

interface GenerateBatchButtonProps {
  domain: string;
  topic: string;
  roadmapTrack: string;
  company?: string;
  experienceLevel: ExperienceTier;
  roundType: string;
  excludeTitles?: string[];
  onGenerated: (questions: Question[]) => Promise<void> | void;
  compact?: boolean;
}

export function GenerateBatchButton({
  domain,
  topic,
  roadmapTrack,
  company = 'Tier 1 Product',
  experienceLevel,
  roundType,
  excludeTitles = [],
  onGenerated,
  compact = false,
}: GenerateBatchButtonProps) {
  const [count, setCount] = useState<5 | 10>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/ai/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count,
          domain,
          topic,
          roadmapTrack,
          company,
          experienceLevel,
          roundType,
          excludeTitles,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to generate AI practice batch');
      }
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        const enriched = enrichQuestionBank(data.questions as Question[]);
        await onGenerated(enriched);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <div className="inset-surface flex rounded-lg p-0.5 text-xs">
          {([5, 10] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              className={`rounded-md px-2 py-1 font-mono transition-colors ${
                count === n ? 'tab-active' : 'text-slate-400 hover:text-white'
              }`}
            >
              {n}Q
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="btn-primary inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-xl px-4 py-2 text-xs font-semibold shadow-lg transition-opacity disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          <span>{loading ? `Generating ${count} Problems...` : compact ? `AI Batch (${count})` : `Generate Practice Batch (${count})`}</span>
        </button>
      </div>
      {error && <p className="text-xs text-slate-300">{error}</p>}
    </div>
  );
}
