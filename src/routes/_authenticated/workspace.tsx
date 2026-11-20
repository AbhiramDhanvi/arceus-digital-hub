import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { evaluateAll, type Facts, type Result } from "@/lib/eligibility";
import { decisionSentence } from "@/lib/decision-text";

export const Route = createFileRoute("/_authenticated/workspace")({
  head: () => ({ meta: [
    { title: "My workspace | ARCEUS" },
    { name: "description", content: "Your saved household details and scheme eligibility results." },
    { property: "og:title", content: "My workspace | ARCEUS" },
    { property: "og:description", content: "Your saved household details and scheme eligibility." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Workspace,
});

const LABEL = { likely_eligible: "Likely eligible", ineligible: "Not eligible", needs_verification: "Needs verification" };

function Workspace() {
  const [email, setEmail] = useState(""); const [facts, setFacts] = useState<Facts>({});
  const navigate = useNavigate();
  useEffect(() => { void (async () => {
    const { data } = await supabase.auth.getUser(); if (!data.user) return;
    setEmail(data.user.email ?? "");
    const { data: row } = await supabase.from("households").select("facts").eq("user_id", data.user.id).maybeSingle();
    setFacts((row?.facts as Facts) ?? {});
  })(); }, []);
  const results: Result[] = evaluateAll(facts);
  async function signOut() { await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); }
  async function clear() {
    const { data } = await supabase.auth.getUser(); if (!data.user) return;
    await supabase.from("households").delete().eq("user_id", data.user.id); setFacts({});
  }
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl grid gap-6">
        <header className="flex items-center justify-between">
          <Link to="/" className="font-bold text-xl text-foreground">ARCEUS<span className="text-primary">.</span></Link>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">{email}<button onClick={signOut} className="underline">Sign out</button></div>
        </header>
        <h1 className="text-3xl font-semibold text-foreground">My workspace</h1>
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex justify-between"><h2 className="font-semibold text-foreground">Household details</h2><button onClick={clear} className="text-sm underline text-muted-foreground">Clear</button></div>
          {Object.keys(facts).length === 0 ? <p className="text-muted-foreground mt-2">Nothing saved yet. <a href="/#assistant" className="underline">Talk to ARCEUS</a> to get started.</p> :
            <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">{Object.entries(facts).map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="text-foreground">{String(v)}</dd></div>)}</dl>}
        </section>
        <section className="grid gap-3">
          <h2 className="font-semibold text-foreground">Verified schemes</h2>
          {results.map(r => (
            <div key={r.scheme.id} className="rounded-xl border border-border bg-card p-4 text-sm">
              <div className="flex justify-between"><b className="text-foreground">{r.scheme.name}</b><span className="text-primary">{LABEL[r.status]}</span></div>
              <p className="text-muted-foreground">{r.scheme.benefit}</p>
              <p className="text-foreground">{decisionSentence(r, "en")}</p>
              <a className="underline" href={r.scheme.link} target="_blank" rel="noreferrer">Official website</a>
            </div>))}
        </section>
      </div>
    </main>
  );
}
