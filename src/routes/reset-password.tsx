import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Set a new password | ARCEUS" },
    { name: "description", content: "Choose a new password for your ARCEUS account." },
    { property: "og:title", content: "Set a new password | ARCEUS" },
    { property: "og:description", content: "Choose a new password for your ARCEUS account." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Reset,
});

function Reset() {
  const [password, setPassword] = useState(""); const [msg, setMsg] = useState<string | null>(null);
  const navigate = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMsg(error.message); else navigate({ to: "/workspace" });
  }
  return (
    <main className="min-h-screen grid place-items-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm grid gap-3 rounded-2xl border border-border bg-card p-6">
        <h1 className="text-2xl font-semibold text-foreground">Set a new password</h1>
        <input required minLength={8} type="password" aria-label="New password" className="rounded-md border border-input bg-background p-2" value={password} onChange={e => setPassword(e.target.value)} />
        {msg && <p className="text-sm text-destructive">{msg}</p>}
        <button className="rounded-md bg-primary p-2 text-primary-foreground">Save password</button>
      </form>
    </main>
  );
}
