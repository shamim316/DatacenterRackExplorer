"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Server, Mail, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.1 3.7-8.6z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.9-5L1.2 17.3C3.2 21.3 7.3 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.1 14.4c-.3-.7-.4-1.5-.4-2.4s.2-1.7.4-2.4L1.2 6.7C.4 8.3 0 10.1 0 12s.4 3.7 1.2 5.3l3.9-2.9z"
      />
      <path
        fill="#EA4335"
        d="M12 4.7c2.3 0 3.8 1 4.7 1.8L20.1 3C18 1.1 15.2 0 12 0 7.3 0 3.2 2.7 1.2 6.7l3.9 3C6.1 6.7 8.8 4.7 12 4.7z"
      />
    </svg>
  );
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const supabase = createClient();
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy("password");
    setError(null);
    setNotice(null);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) setError(error.message);
      else if (data.session) router.push(next);
      else setNotice("Check your inbox — we sent you a confirmation link.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else {
        router.push(next);
        router.refresh();
      }
    }
    setBusy(null);
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Enter your email first, then request a magic link.");
      return;
    }
    setBusy("magic");
    setError(null);
    setNotice(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) setError(error.message);
    else setNotice("Magic link sent — check your inbox.");
    setBusy(null);
  }

  async function handleGoogle() {
    setBusy("google");
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-2 font-semibold text-lg mb-8">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-ink">
            <Server size={18} />
          </span>
          RackDoc
        </Link>

        <div className="card p-6">
          <h1 className="text-lg font-semibold mb-1">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-ink-muted mb-5">
            {mode === "login"
              ? "Sign in to your workspace."
              : "Start documenting your datacenter in minutes."}
          </p>

          <button
            onClick={handleGoogle}
            disabled={busy !== null}
            className="btn btn-secondary w-full justify-center mb-3"
          >
            {busy === "google" ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-4 text-xs text-ink-faint">
            <div className="h-px flex-1 bg-edge" />
            or with email
            <div className="h-px flex-1 bg-edge" />
          </div>

          <form onSubmit={handlePassword} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="label" htmlFor="name">Full name</label>
                <input
                  id="name"
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ada Lovelace"
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}
            {notice && <p className="text-sm text-success">{notice}</p>}

            <button type="submit" disabled={busy !== null} className="btn btn-primary w-full justify-center">
              {busy === "password" && <Loader2 size={16} className="animate-spin" />}
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            onClick={handleMagicLink}
            disabled={busy !== null}
            className="btn btn-ghost w-full justify-center mt-3 !text-sm"
          >
            {busy === "magic" ? <Loader2 size={16} className="animate-spin" /> : <Mail size={15} />}
            Email me a magic link instead
          </button>
        </div>

        <p className="text-center text-sm text-ink-muted mt-5">
          {mode === "login" ? (
            <>
              No account?{" "}
              <Link href="/signup" className="text-accent font-medium">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already registered?{" "}
              <Link href="/login" className="text-accent font-medium">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
