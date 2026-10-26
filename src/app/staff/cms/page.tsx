import { getSiteConfig } from "@/lib/siteConfig";
import { SiteCmsForm } from "@/components/SiteCmsForm";

export const metadata = { title: "Site CMS", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CmsPage() {
  const config = await getSiteConfig();
  return (
    <div className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
      <header className="mb-6">
        <p className="eyebrow">Super-admin</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-cream">Site CMS</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream-dim">
          Edit live site content without a redeploy. Changes save to the database and apply immediately across the public site. This config can also be driven remotely from the Aileron control plane.
        </p>
      </header>
      <SiteCmsForm initial={config} />
    </div>
  );
}
