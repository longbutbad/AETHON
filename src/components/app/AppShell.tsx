import { type Profile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/app/Sidebar";
import Rightbar from "@/components/app/Rightbar";
import AppShellClient from "@/components/app/AppShellClient";

/**
 * Shared chrome for the authenticated app. Renders the (server) Sidebar and
 * Rightbar and hands them to the client shell, which handles the responsive
 * layout and the mobile drawer.
 */
export default async function AppShell({
  profile,
  active,
  showRightbar = false,
  children,
}: {
  profile: Profile;
  active: string;
  showRightbar?: boolean;
  children: React.ReactNode;
}) {
  // Unread notification count for the badges. Degrades to 0 if the table
  // doesn't exist yet (notifications.sql not run).
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("read", false);
  const unread = count ?? 0;

  return (
    <AppShellClient
      profile={profile}
      unread={unread}
      sidebar={<Sidebar profile={profile} active={active} unread={unread} />}
      rightbar={showRightbar ? <Rightbar /> : null}
    >
      {children}
    </AppShellClient>
  );
}
