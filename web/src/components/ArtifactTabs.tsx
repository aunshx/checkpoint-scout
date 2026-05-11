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
  { key: 'comment', label: 'Public comment' },
  { key: 'outreach', label: 'Outreach' },
  { key: 'case_study', label: 'Case study' },
];

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function ArtifactTabs({ moment }: Props) {
  const [active, setActive] = useState<Tab>('comment');

  return (
    <div
      className="mt-0"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Divider */}
      <div className="border-t border-stone-200 my-6" />

      {/* Source line */}
      <div className="flex items-center gap-1.5 mb-5">
        <ExternalLink size={13} className="text-stone-400 shrink-0" />
        <span className="text-sm text-stone-500 shrink-0">Source:</span>
        <a
          href={moment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-700 transition-colors truncate"
          title={moment.url}
        >
          {moment.url}
        </a>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-stone-200">
        {TABS.map((tab) => {
          const words = wordCount(moment.artifacts[tab.key]);
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={[
                'px-4 py-3 text-sm border-b-2 -mb-px transition-colors flex items-center gap-1.5',
                isActive
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-stone-600 hover:text-stone-900',
              ].join(' ')}
            >
              {tab.label}
              <span className="text-xs text-stone-400 font-normal">{words}w</span>
            </button>
          );
        })}
      </div>

      {/* Artifact content */}
      <div className="bg-stone-50 rounded-lg p-6 mt-4 border border-stone-200">
        <div className="prose prose-stone max-w-none prose-sm
          prose-headings:text-stone-900 prose-headings:font-semibold
          prose-p:text-stone-700 prose-p:leading-relaxed
          prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-a:no-underline hover:prose-a:underline
          prose-code:text-stone-800 prose-code:bg-stone-200 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
          prose-pre:bg-stone-200 prose-pre:border prose-pre:border-stone-300
          prose-blockquote:border-l-blue-400 prose-blockquote:text-stone-600
          prose-li:text-stone-700
          prose-hr:border-stone-300
          prose-strong:text-stone-900">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {moment.artifacts[active]}
          </ReactMarkdown>
        </div>
      </div>

      {/* Footer note */}
      <p className="mt-4 text-sm text-stone-500 italic">
        Draft only — not posted to GitHub or sent.
      </p>
    </div>
  );
}
