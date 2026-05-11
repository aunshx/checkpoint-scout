import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { PainMoment } from '../types';
import { ArtifactTabs } from './ArtifactTabs';

interface Props {
  moment: PainMoment;
}

const PAIN_TYPE_STYLES: Record<string, string> = {
  review_burden: 'bg-red-900/40 text-red-300 border-red-800',
  intent_unclear: 'bg-amber-900/40 text-amber-300 border-amber-800',
  ai_authorship_concern: 'bg-purple-900/40 text-purple-300 border-purple-800',
  context_loss: 'bg-blue-900/40 text-blue-300 border-blue-800',
  oversized_pr: 'bg-orange-900/40 text-orange-300 border-orange-800',
  merge_conflict_ai: 'bg-pink-900/40 text-pink-300 border-pink-800',
  ai_quality_complaint: 'bg-yellow-900/40 text-yellow-300 border-yellow-800',
  other: 'bg-slate-800 text-slate-400 border-slate-700',
};

function painTypeLabel(t: string) {
  return t.replace(/_/g, ' ');
}

export function PainMomentCard({ moment }: Props) {
  const [expanded, setExpanded] = useState(false);
  const chipStyle = PAIN_TYPE_STYLES[moment.pain_type] ?? PAIN_TYPE_STYLES.other;

  return (
    <div
      className={[
        'bg-slate-900 border border-slate-800 rounded-xl p-5',
        'transition-colors duration-200',
        expanded ? 'hover:bg-slate-900' : 'hover:bg-slate-800 cursor-pointer',
      ].join(' ')}
      onClick={!expanded ? () => setExpanded(true) : undefined}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Rank badge */}
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-400 shrink-0">
            {moment.rank}
          </span>
          {/* Score badge */}
          <span className="inline-flex items-center gap-1 bg-[#0091FF]/10 border border-[#0091FF]/30 text-[#0091FF] text-xs font-bold px-2 py-0.5 rounded-full">
            {moment.score}/10
          </span>
          {/* Pain type chip */}
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${chipStyle}`}>
            {painTypeLabel(moment.pain_type)}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Repo */}
      <p className="mt-2 text-sm font-mono text-slate-300">{moment.repo}</p>

      {/* Signal */}
      <p className="mt-1 text-sm text-slate-400 leading-snug">{moment.signal}</p>

      {/* Rationale (always shown) */}
      <p className="mt-2 text-xs text-slate-500 italic leading-snug">
        {moment.classification.rationale}
      </p>

      {/* Expanded: artifact tabs */}
      {expanded && <ArtifactTabs moment={moment} />}
    </div>
  );
}
