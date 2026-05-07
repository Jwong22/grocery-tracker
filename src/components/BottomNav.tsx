import { createClient } from "@/lib/supabase/server";
import { BottomNavBar } from "./BottomNavBar";

export async function BottomNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return <BottomNavBar />;
}
