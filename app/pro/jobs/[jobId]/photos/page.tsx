import { redirect } from "next/navigation";

// Photos are now part of the per-tier checklist on
// /pro/jobs/[id]/checklist — this route stays as a redirect for old
// notification deep-links.
export default function PhotosRedirect({
  params,
}: {
  params: { jobId: string };
}) {
  redirect(`/pro/jobs/${params.jobId}/checklist`);
}
