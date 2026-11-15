import React, { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { ExperienceTier, Question } from '../types/platform';

interface GenerateBatchButtonProps {
  domain: string;
  topic: string;
  roadmapTrack: string;
  company?: string;
  experienceLevel: ExperienceTier;
  roundType: string;
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
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to generate AI practice batch');
      }
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        await onGenerated(data.questions as Question[]);
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
        <div className="flex rounded-lg border border-white/10 bg-[#07080C]/80 p-0.5 text-xs">
          {([5, 10] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              className={`rounded-md px-2 py-1 font-mono transition-colors ${
                count === n ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
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
          className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-xl bg-gradient-to-r from-[#2DD4BF] to-[#818CF8] px-4 py-2 text-xs font-semibold text-[#07080C] shadow-lg shadow-[#2DD4BF]/10 transition-opacity hover:opacity-95 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          <span>{loading ? `Generating ${count} Problems...` : compact ? `AI Batch (${count})` : `Generate Practice Batch (${count})`}</span>
        </button>
      </div>
      {error && <p className="text-xs text-[#FB7185]">{error}</p>}
    </div>
  );
}
