import { useState } from 'react';
import type { PainMoment } from '../types';
import { ArtifactTabs } from './ArtifactTabs';

interface Props {
  moment: PainMoment;
}

const PAIN_TYPE_STYLES: Record<string, string> = {
  review_burden:        'bg-red-50 text-red-700 border border-red-200',
  intent_unclear:       'bg-amber-50 text-amber-800 border border-amber-200',
  ai_authorship_concern:'bg-purple-50 text-purple-700 border border-purple-200',
  context_loss:         'bg-blue-50 text-blue-700 border border-blue-200',
  oversized_pr:         'bg-orange-50 text-orange-700 border border-orange-200',
  merge_conflict_ai:    'bg-pink-50 text-pink-700 border border-pink-200',
  ai_quality_complaint: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
  other:                'bg-stone-100 text-stone-700 border border-stone-200',
};

function scoreBadgeClass(score: number) {
  if (score >= 8) return 'bg-blue-600 text-white';
  return 'bg-blue-50 text-blue-700 border border-blue-200';
}

function painTypeLabel(t: string) {
  return t.replace(/_/g, ' ');
}

export function PainMomentCard({ moment }: Props) {
  const [expanded, setExpanded] = useState(false);
  const chipStyle = PAIN_TYPE_STYLES[moment.pain_type] ?? PAIN_TYPE_STYLES.other;

  return (
    <div
      className={[
        'bg-white border border-stone-200 rounded-xl p-5',
        'shadow-sm transition-shadow duration-200',
        expanded ? '' : 'hover:shadow-md hover:bg-stone-50 cursor-pointer',
      ].join(' ')}
      onClick={!expanded ? () => setExpanded(true) : undefined}
    >
      {/* Badges row */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-stone-900 text-white text-xs font-bold shrink-0">
          {moment.rank}
        </span>
        <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${scoreBadgeClass(moment.score)}`}>
          {moment.score}/10
        </span>
        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${chipStyle}`}>
          {painTypeLabel(moment.pain_type)}
        </span>
      </div>

      {/* Repo */}
      <p className="font-mono text-sm text-stone-800 mb-2">{moment.repo}</p>

      {/* Signal — visual hero */}
      <p className="text-base text-stone-900 leading-relaxed">{moment.signal}</p>

      {/* Rationale */}
      <p className="mt-2 text-xs text-stone-500 italic leading-snug">
        {moment.classification.rationale}
      </p>

      {/* Expand/collapse hint */}
      <p className="mt-3 text-sm text-stone-500">
        {expanded ? 'Collapse ↑' : 'Click to view artifacts →'}
      </p>

      {/* Expanded detail */}
      {expanded && <ArtifactTabs moment={moment} />}
    </div>
  );
}
