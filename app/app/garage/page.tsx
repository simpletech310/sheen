import { Eyebrow } from "@/components/brand/Eyebrow";
import { createClient } from "@/lib/supabase/server";

export default async function GaragePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("*")
    .eq("user_id", user?.id ?? "");

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow>Your garage</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-6">Garage</h1>

      {vehicles && vehicles.length > 0 ? (
        <div className="space-y-3">
          {vehicles.map((v) => (
            <div key={v.id} className="bg-mist/40 p-4 flex justify-between items-start">
              <div>
                <div className="text-sm font-semibold">
                  {v.year} {v.make} {v.model}
                </div>
                <div className="text-xs text-smoke">{v.color} · plate {v.plate}</div>
              </div>
              {v.is_default && <span className="font-mono text-[10px] text-cobalt uppercase">Default</span>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-smoke">No vehicles saved yet.</p>
      )}
    </div>
  );
}
