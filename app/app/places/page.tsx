import { Eyebrow } from "@/components/brand/Eyebrow";
import { createClient } from "@/lib/supabase/server";

export default async function PlacesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: addresses } = await supabase
    .from("addresses")
    .select("id, tag, street, city, state, zip, notes, is_default")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow>Saved places</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-6">Places</h1>

      {addresses && addresses.length > 0 ? (
        <div className="space-y-3">
          {addresses.map((a) => (
            <div key={a.id} className="bg-mist/40 p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono text-[10px] text-smoke uppercase">{a.tag ?? "ADDRESS"}</div>
                  <div className="text-sm font-semibold mt-1">{a.street}</div>
                  <div className="text-xs text-smoke">
                    {a.city}, {a.state} {a.zip}
                  </div>
                  {a.notes && <div className="text-xs text-smoke mt-1">{a.notes}</div>}
                </div>
                {a.is_default && <span className="font-mono text-[10px] text-cobalt uppercase">Default</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-smoke">No places saved yet.</p>
      )}
    </div>
  );
}
