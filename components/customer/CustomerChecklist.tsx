import { Eyebrow } from "@/components/brand/Eyebrow";

export type ChecklistItem = {
  id: string;
  label: string;
  hint: string | null;
  requires_photo: boolean;
  // null = base service item; non-null = belongs to an addon, value is
  // the addon display name. Drives the group headers in the list so
  // the customer sees what work belongs to which add-on they paid for.
  group?: string | null;
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
      <div className="space-y-2">
        {items.map((it, idx) => {
          const entry = progress[it.id];
          const isDone = !!entry?.done_at;
          const photoOk = !it.requires_photo || (isDone && !!entry?.photo_path);
          const fullyDone = isDone && photoOk;
          const photoUrl = entry?.photo_path ? signedPhotoUrls[entry.photo_path] : undefined;
          const prevGroup = idx === 0 ? "__none__" : items[idx - 1].group ?? null;
          const showHeader = (it.group ?? null) !== prevGroup;
          return (
            <div key={it.id}>
            {showHeader && (
              <div
                className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 mb-1.5 ${
                  it.group ? "bg-royal/10 text-royal" : "bg-mist text-smoke"
                } ${idx === 0 ? "" : "mt-3"}`}
              >
                {it.group ? `+ ${it.group}` : "Base wash"}
              </div>
            )}
            <div
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
                  className="shrink-0 block w-12 h-12 bg-mist overflow-hidden relative"
                  aria-label="View proof"
                >
                  {/^\S+\.(mp4|mov|webm|m4v|avi)(\?|$)/i.test(entry?.photo_path ?? "") ? (
                    <>
                      <video
                        src={photoUrl}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <span className="absolute bottom-0 right-0 bg-ink/70 text-bone font-mono text-[8px] uppercase tracking-wider px-1">
                        ▶
                      </span>
                    </>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={photoUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </a>
              )}
            </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
