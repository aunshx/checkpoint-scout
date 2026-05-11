import type { DashboardData } from '../types';
import { Funnel } from './Funnel';

interface Props {
  data: DashboardData;
}

export function Hero({ data }: Props) {
  return (
    <section className="py-16 text-center px-4">
      <h1 className="text-4xl font-bold text-slate-100 tracking-tight">
        Checkpoint Scout
      </h1>
      <p className="mt-3 text-lg text-[#0091FF] font-medium">
        AI-coding pain moments in public OSS, surfaced for Entire's GTM team
      </p>
      <p className="mt-3 text-slate-400 max-w-xl mx-auto text-base leading-relaxed">
        Scans public GitHub for moments where open-source maintainers struggle
        with AI-generated code. Drafts useful artifacts for review.
      </p>
      <Funnel funnel={data.funnel} runTimestamp={data.run_timestamp} />
    </section>
  );
}
