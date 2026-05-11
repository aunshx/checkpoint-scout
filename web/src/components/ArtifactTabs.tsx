import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExternalLink } from 'lucide-react';
import type { PainMoment } from '../types';

interface Props {
  moment: PainMoment;
}

type Tab = 'comment' | 'outreach' | 'case_study';

const TABS: { key: Tab; label: string }[] = [
  { key: 'comment', label: 'Public Comment' },
  { key: 'outreach', label: 'Outreach' },
  { key: 'case_study', label: 'Case Study' },
];

const mdClass = [
  'prose prose-invert prose-sm max-w-none',
  'prose-headings:text-slate-100 prose-headings:font-semibold',
  'prose-p:text-slate-300 prose-p:leading-relaxed',
  'prose-a:text-[#0091FF] prose-a:no-underline hover:prose-a:underline',
  'prose-code:text-slate-200 prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono',
  'prose-pre:bg-slate-800 prose-pre:border prose-pre:border-slate-700 prose-pre:rounded-lg',
  'prose-blockquote:border-l-[#0091FF] prose-blockquote:text-slate-400',
  'prose-li:text-slate-300',
  'prose-hr:border-slate-700',
  'prose-strong:text-slate-100',
].join(' ');

export function ArtifactTabs({ moment }: Props) {
  const [active, setActive] = useState<Tab>('comment');

  return (
    <div className="mt-4 border-t border-slate-800 pt-4">
      {/* Source link */}
      <a
        href={moment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#0091FF] transition-colors mb-4"
      >
        <ExternalLink size={12} />
        <span className="font-medium text-slate-500">Source:</span>
        <span className="font-mono truncate max-w-xs">{moment.url}</span>
      </a>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-800 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              active === tab.key
                ? 'border-[#0091FF] text-[#0091FF]'
                : 'border-transparent text-slate-500 hover:text-slate-300',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={mdClass}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {moment.artifacts[active]}
        </ReactMarkdown>
      </div>

      {/* Disclaimer */}
      <p className="mt-4 text-xs text-slate-600 italic">
        Draft only — not posted to GitHub or sent to anyone.
      </p>
    </div>
  );
}
