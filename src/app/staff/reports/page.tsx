import { listReports } from "@/lib/db";
import { ReportAdmin } from "@/components/ReportAdmin";

export const dynamic = "force-dynamic";

export default async function CrewReports() {
  const all = await listReports();
  const open = all.filter((r) => r.status === "open");
  const resolved = all.filter((r) => r.status !== "open");

  return (
    <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <ReportAdmin open={open} resolved={resolved} />
    </section>
  );
}
