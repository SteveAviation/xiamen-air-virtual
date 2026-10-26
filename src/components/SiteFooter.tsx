import Image from "next/image";
import { BRAND } from "@/lib/data";

/* Minimal footer for the Crew Center — brand mark, disclaimer, tagline. */
export function SiteFooter() {
  return (
    <footer className="border-t border-obsidian/40 bg-ink-900">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center">
            <Image src="/brand/xav-logo-light.png" alt="Xiamen Air Virtual" width={1080} height={287} className="logo-light-theme h-8 w-auto" />
            <Image src="/brand/xav-logo-dark.png" alt="Xiamen Air Virtual" width={1985} height={528} className="logo-dark-theme h-8 w-auto" />
          </div>
          <p className="shrink-0 font-mono text-xs tracking-wide text-cream-faint">
            {BRAND.tagline}
          </p>
        </div>
        <p className="mt-6 max-w-3xl border-t border-obsidian/40 pt-6 text-xs leading-relaxed text-cream-faint">
          {BRAND.disclaimer}
        </p>
      </div>
    </footer>
  );
}
