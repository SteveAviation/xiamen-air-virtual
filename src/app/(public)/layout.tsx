import Link from "next/link";
import Image from "next/image";
import { PublicNav } from "@/components/public/PublicNav";
import { Egret } from "@/components/public/Egret";
import { SITE } from "@/lib/site";
import { getSiteConfig } from "@/lib/siteConfig";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const cfg = await getSiteConfig();
  const banner = cfg.flags.maintenance
    ? { text: "Xiamen Air Virtual is undergoing scheduled maintenance — some features may be unavailable.", tone: "warn" as const }
    : cfg.announcement.enabled && cfg.announcement.text
      ? { text: cfg.announcement.text, tone: cfg.announcement.tone }
      : null;

  return (
    <div className="flex min-h-full flex-col">
      {banner && (
        <div className={`px-4 py-2 text-center text-sm font-medium ${banner.tone === "warn" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-gold/12 text-gold-soft"}`}>
          {banner.text}
        </div>
      )}
      <PublicNav />
      <main className="flex-1">{children}</main>
      {cfg.flags.finnixEnabled && <Egret />}

      <footer className="border-t border-obsidian bg-ink-900">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="flex items-center">
                <Image src="/brand/xav-logo-light.png" alt="Xiamen Air Virtual" width={1080} height={287} className="logo-light-theme h-9 w-auto" />
                <Image src="/brand/xav-logo-dark.png" alt="Xiamen Air Virtual" width={1985} height={528} className="logo-dark-theme h-9 w-auto" />
              </div>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-cream-faint">{cfg.brand.mission}</p>
            </div>
            <div>
              <h3 className="eyebrow">Connect</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><a href="https://community.infiniteflight.com" target="_blank" rel="noopener noreferrer" className="text-cream-dim transition-colors hover:text-gold">Infinite Flight Community ↗</a></li>
                <li><Link href="/join" className="text-cream-dim transition-colors hover:text-gold">Join the airline</Link></li>
                <li><Link href="/crew" className="text-gold transition-colors hover:text-cream">Crew Centre →</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-obsidian/60 pt-6 text-xs leading-relaxed text-cream-faint">
            <p className="max-w-4xl">{cfg.brand.copyright}</p>
            <p className="mt-2">{SITE.madeBy}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
