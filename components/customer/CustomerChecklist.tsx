import { Eyebrow } from "@/components/brand/Eyebrow";

export type ChecklistItem = {
  id: string;
  label: string;
  hint: string | null;
  requires_photo: boolean;
};

export type ChecklistEntry = { done_at?: string; photo_path?: string | null };

export function CustomerChecklist({
  items,
  progress,
  signedPhotoUrls,
}: {
  items: ChecklistItem[];
  progress: Record<string, ChecklistEntry>;
  signedPhotoUrls: Record<string, string>;
}) {
  if (items.length === 0) return null;

  const total = items.length;
  const done = items.filter((it) => {
    const e = progress[it.id];
    if (!e?.done_at) return false;
    if (it.requires_photo && !e.photo_path) return false;
    return true;
  }).length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="bg-mist/40 p-4 mt-3">
      <div className="flex items-baseline justify-between mb-3">
        <Eyebrow>Service checklist</Eyebrow>
        <span className="font-mono text-[10px] uppercase tracking-wider text-smoke tabular">
          {done}/{total} · {pct}%
        </span>
      </div>
      <div className="h-[2px] bg-mist mb-3 overflow-hidden">
        <div className="h-full bg-good transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-2">
        {items.map((it) => {
          const entry = progress[it.id];
          const isDone = !!entry?.done_at;
          const photoOk = !it.requires_photo || (isDone && !!entry?.photo_path);
          const fullyDone = isDone && photoOk;
          const photoUrl = entry?.photo_path ? signedPhotoUrls[entry.photo_path] : undefined;
          return (
            <li
              key={it.id}
              className={`flex items-start gap-3 px-2.5 py-2 border-l-2 ${
                fullyDone ? "border-good bg-good/5" : "border-mist bg-white/40"
              }`}
            >
              <span
                className={`shrink-0 inline-flex items-center justify-center w-4 h-4 mt-0.5 text-[10px] ${
                  fullyDone ? "bg-good text-bone" : "bg-mist text-smoke"
                }`}
                aria-hidden
              >
                {fullyDone ? "✓" : ""}
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm leading-tight ${
                    fullyDone ? "text-ink" : "text-smoke"
                  }`}
                >
                  {it.label}
                </div>
                {entry?.done_at && (
                  <div className="text-[10px] font-mono text-smoke/70 mt-0.5">
                    {new Date(entry.done_at).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                )}
              </div>
              {photoUrl && (
                <a
                  href={photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 block w-12 h-12 bg-mist overflow-hidden"
                  aria-label="View proof photo"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
