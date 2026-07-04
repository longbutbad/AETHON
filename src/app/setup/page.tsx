import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type Profile } from "@/lib/profile";
import NeonShell from "@/components/NeonShell";
import SetupProfileForm from "@/components/SetupProfileForm";
import { Wordmark } from "@/components/ui";

export default async function SetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  // Already set up? Skip straight to the app.
  if (profile?.username) redirect("/dashboard");

  return (
    <NeonShell>
      <div className="flex items-center justify-center px-[18px] pb-1.5 pt-4">
        <Wordmark size="sm" />
      </div>

      <div className="flex flex-1 flex-col px-5 pb-6 pt-2">
        <div className="mb-3 mt-1 text-center">
          <span className="font-display text-[9px] tracking-[3px] text-cyan/60">
            STEP 2 · OPERATOR PROFILE
          </span>
        </div>

        <h1 className="mb-0.5 text-center font-display text-xl font-bold tracking-[2px] text-gray-50">
          SET UP PROFILE
        </h1>
        <p className="mb-3 text-center text-[11px] text-gray-600">
          How other operators will find you.
        </p>

        <SetupProfileForm userId={user.id} initial={profile ?? null} />
      </div>
    </NeonShell>
  );
}
