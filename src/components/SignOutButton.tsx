"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.replace("/signin");
      }}
      className="text-xs text-gray-500 hover:text-red-600 shrink-0"
    >
      Sign out
    </button>
  );
}
