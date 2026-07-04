import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type Profile } from "@/lib/profile";
import NeonShell from "@/components/NeonShell";
import AppHeader from "@/components/AppHeader";
import ProfileForm from "@/components/ProfileForm";
import SignOutButton from "@/components/SignOutButton";

export default async function SettingsPage() {
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

  return (
    <NeonShell>
      <AppHeader backHref="/dashboard" right={<SignOutButton />} />

      <div className="flex flex-1 flex-col px-5 pb-6 pt-2">
        <h1 className="mb-0.5 font-display text-xl font-bold tracking-[2px] text-gray-50">
          ACCOUNT SETTINGS
        </h1>
        <p className="mb-2 text-[11px] text-gray-600">
          Update how other operators see you.
        </p>

        <ProfileForm
          userId={user.id}
          email={user.email}
          initial={profile ?? null}
          submitLabel="SAVE CHANGES"
        />
      </div>
    </NeonShell>
  );
}
