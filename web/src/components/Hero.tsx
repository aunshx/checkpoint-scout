import type { DashboardData } from '../types';
import { Funnel } from './Funnel';

interface Props {
  data: DashboardData;
}

export function Hero({ data }: Props) {
  return (
    <section className="py-16 text-center px-4">
      <div className="flex items-center justify-center gap-1 sm:gap-1">
        <img
          src="/watchtower/logo.png"
          alt="Watchtower logo"
          className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-12 object-contain"
        />
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-900">
          Watchtower
        </h1>
      </div>
      <p className="mt-2 text-xl text-blue-600">
        AI-coding pain moments in public OSS, surfaced for Entire's GTM team
      </p>
      <p className="mt-4 text-base text-stone-600 max-w-2xl mx-auto leading-relaxed">
        Scans public GitHub for moments where open-source maintainers struggle
        with AI-generated code. Drafts useful artifacts for review.
      </p>
      <Funnel funnel={data.funnel} runTimestamp={data.run_timestamp} />
    </section>
  );
}
