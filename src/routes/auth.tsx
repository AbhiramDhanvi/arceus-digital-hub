import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in | MiraiAi" },
    { name: "description", content: "Sign in or create your MiraiAi account to save your household details and schemes." },
    { property: "og:title", content: "Sign in | MiraiAi" },
    { property: "og:description", content: "Save your household details and eligible schemes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/workspace` } });
        setMsg(error ? error.message : "Check your email to confirm your account, then sign in.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        setMsg(error ? error.message : "If that email has an account, a reset link is on its way.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMsg(error.message.includes("not confirmed") ? "Please confirm your email first." : "Wrong email or password.");
        else navigate({ to: "/workspace" });
      }
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm grid gap-3 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <Link to="/" className="font-bold text-xl text-foreground">MiraiAi<span className="text-primary">.</span></Link>
        <h1 className="text-2xl font-semibold text-foreground">{mode === "up" ? "Create account" : mode === "forgot" ? "Reset password" : "Sign in"}</h1>
        <label className="grid gap-1 text-sm text-foreground">Email<input required type="email" className="rounded-md border border-input bg-background p-2" value={email} onChange={e => setEmail(e.target.value)} /></label>
        {mode !== "forgot" && <label className="grid gap-1 text-sm text-foreground">Password<input required minLength={8} type="password" className="rounded-md border border-input bg-background p-2" value={password} onChange={e => setPassword(e.target.value)} /></label>}
        {msg && <p role="status" className="text-sm text-muted-foreground">{msg}</p>}
        <button disabled={busy} className="rounded-md bg-primary p-2 font-medium text-primary-foreground disabled:opacity-60">{busy ? "Please wait…" : mode === "up" ? "Sign up" : mode === "forgot" ? "Send reset link" : "Sign in"}</button>
        <div className="flex justify-between text-sm text-muted-foreground">
          <button type="button" className="underline" onClick={() => setMode(mode === "up" ? "in" : "up")}>{mode === "up" ? "Have an account? Sign in" : "New here? Sign up"}</button>
          {mode === "in" && <button type="button" className="underline" onClick={() => setMode("forgot")}>Forgot password?</button>}
        </div>
      </form>
    </main>
  );
}
