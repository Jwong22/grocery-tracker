"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function SignInButton() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={onClick}
        disabled={loading}
        className="inline-flex items-center justify-center gap-3 h-12 px-6 rounded-full bg-white border border-gray-300 text-gray-800 font-medium shadow-sm hover:bg-gray-50 disabled:opacity-60"
      >
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#FFC107"
            d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
          />
          <path
            fill="#FF3D00"
            d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.2-.1-2.3-.4-3.5z"
          />
        </svg>
        {loading ? "Redirecting…" : "Continue with Google"}
      </button>
      {error && (
        <p className="text-sm text-red-600 mt-3" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center text-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-green-600 text-white flex items-center justify-center text-3xl mb-6">
        🛒
      </div>
      <h1 className="text-2xl font-semibold text-gray-900">Grocery Tracker</h1>
      <p className="text-sm text-gray-600 mt-2 max-w-sm">
        Sign in to record prices, search the cheapest store nearby, and track
        your purchases.
      </p>
      <div className="mt-8">
        <Suspense fallback={null}>
          <SignInButton />
        </Suspense>
      </div>
    </div>
  );
}
