import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { ChecklistClient } from "./ChecklistClient";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function JobChecklistPage({
  params,
}: {
  params: { jobId: string };
}) {
  const t = await getTranslations("proJobs");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?role=washer");

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, status, assigned_washer_id, service_id, checklist_progress, services(tier_name, category)"
    )
    .eq("id", params.jobId)
    .maybeSingle();
  if (!booking) notFound();
  if (booking.assigned_washer_id !== user.id) {
    return (
      <div className="px-5 pt-10 pb-8">
        <p className="text-sm text-bone/65">
          {t("notAssigned")}
        </p>
      </div>
    );
  }

  const { data: items } = await supabase
    .from("service_checklist_items")
    .select("id, label, hint, requires_photo, sort_order")
    .eq("service_id", booking.service_id)
    .order("sort_order");

  const progress = (booking.checklist_progress as Record<
    string,
    { done_at?: string; photo_path?: string }
  >) ?? {};

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/pro/jobs/${params.jobId}/timer`} className="text-bone/60 text-sm">
          ← {t("backToTimer")}
        </Link>
      </div>
      <Eyebrow className="!text-bone/60" prefix={null}>
        {t("checklistEyebrow")}
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">
        {(booking as any).services?.tier_name?.toUpperCase() ?? t("jobFallback")}
      </h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-5" />
      <p className="text-sm text-bone/60 mb-6 leading-relaxed">
        {t("checklistInstructions")}
      </p>

      <ChecklistClient
        jobId={params.jobId}
        items={
          (items ?? []).map((i: any) => ({
            id: i.id,
            label: i.label,
            hint: i.hint,
            requires_photo: i.requires_photo,
          }))
        }
        initialProgress={progress}
      />
    </div>
  );
}
