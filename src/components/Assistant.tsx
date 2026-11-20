import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mic, Square, RotateCcw, Send, Volume2, ExternalLink, Check, X, HelpCircle, Play, UserPlus, Pencil, SkipForward } from "lucide-react";
import { DISCOVERY, UNKNOWN, type FactKey, type FactValue, type Facts, type Result } from "@/lib/eligibility";
import {
  GOAL_QUESTION, QUESTIONS, applyFacts, chooseNeed, newInterview, nextQuestion, parseAnswer, questionText, results as getResults,
  skip, statedAge, type Choice, type Interview, type Question, type UiLang,
} from "@/lib/interview";
import { STATUS_TEXT, decisionSentence, summarySpeech } from "@/lib/decision-text";
import { extractAnswer, translateReply } from "@/lib/assistant.functions";
import { transcribeSpeech, synthesizeSpeech } from "@/lib/voice.functions";
import { useVoice } from "@/hooks/use-voice";
import { supabase } from "@/integrations/supabase/client";

const LANGS = [
  ["en", "English", "en-IN"], ["hi", "हिन्दी", "hi-IN"], ["te", "తెలుగు", "te-IN"], ["mr", "मराठी", "mr-IN"],
  ["ta", "தமிழ்", "ta-IN"], ["kn", "ಕನ್ನಡ", "kn-IN"], ["bn", "বাংলা", "bn-IN"],
] as const;
type Lang = (typeof LANGS)[number][0];
type VoiceId = "ishita" | "ratan";
type Turn = { role: "agent" | "user"; text: string };
const SAMPLE = { en: "Namaste! I'm ARCEUS. Tell me what you need, and I'll check the official rules with you.", hi: "नमस्ते! मैं ARCEUS हूँ। बताइए आपको क्या चाहिए, मैं आपके साथ सरकारी नियम जाँचूँगी।" };
const STATE_TEXT = { ready: "Ready", listening: "Listening… speak now", transcribing: "Transcribing…", thinking: "Checking…", speaking: "Speaking…", error: "Something needs attention" };
const ERR: Record<string, string> = {
  not_configured: "Voice service is not set up. You can still type or tap answers.",
  auth: "Voice service rejected the request. You can still type or tap answers.",
  busy: "Voice service is busy. Please try again in a moment.",
  quota: "Today's voice limit is reached. You can still type or tap answers.",
  no_speech: "I couldn't hear any words. Please try again.",
  too_long: "That recording was too long. Please answer in under 20 seconds.",
  bad_audio: "That recording couldn't be read. Please try again.",
  unavailable: "Voice service is unavailable right now. You can still type or tap answers.",
};
const FACT_LABEL: Partial<Record<FactKey, string>> = {
  subject: "For", age: "Age", gender: "Applicant", hasBankAccount: "Savings account", ownsCultivableLand: "Family owns cultivable land",
  institutionalLand: "Institutional land", incomeTaxLastAY: "Income tax last year (family)", pensionMonthly: "Pension per month", govtEmployee: "Govt officer/employee in family",
  registeredProfessional: "Registered professional", incomeTaxPayer: "Income-tax payer", householdHasLpg: "LPG already at home", poorHousehold: "Poor household (declaration)",
  nonFarmEnterprise: "Non-farm / allied business", loanAmount: "Loan needed", priorTarunRepaid: "Repaid Tarun loan", pmjayListed: "Found in PM-JAY list", cultivatesCrops: "Grows crops",
};
function show(k: FactKey, v: FactValue, f: Facts): string {
  if (v === UNKNOWN) return "Don't know / skipped";
  if (k === "subject") return v === "self" ? "Me" : "A family member";
  if (k === "age") return `${f.age_approx ? "about " : ""}${v} years`;
  if (k === "pensionMonthly") return v === 0 ? "None" : `${f.pensionMonthly_approx ? "about " : ""}₹${Number(v).toLocaleString("en-IN")}`;
  if (k === "loanAmount") return `₹${Number(v).toLocaleString("en-IN")}`;
  if (k === "gender") return v === "female" ? "Woman" : v === "male" ? "Man" : "Other";
  return v === true ? "Yes" : v === false ? "No" : String(v);
}
const SAVEABLE: FactKey[] = ["age", "gender", "hasBankAccount", "ownsCultivableLand", "incomeTaxPayer", "cultivatesCrops"];

export function Assistant() {
  const [lang, setLang] = useState<Lang>("en");
  const ui: UiLang = lang === "hi" ? "hi" : "en";
  const [voiceId, setVoiceId] = useState<VoiceId>("ishita");
  const [handsFree, setHandsFree] = useState(false);
  const [readAloud, setReadAloud] = useState(true);
  const [iv, setIv] = useState<Interview>(newInterview);
  const [editing, setEditing] = useState<FactKey | null>(null);
  const [confirm, setConfirm] = useState<{ key: FactKey; facts: Facts; label: string } | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [alert, setAlert] = useState<string | null>(null);
  const [saved, setSaved] = useState<Facts | null>(null);
  const [started, setStarted] = useState(false);
  const [translated, setTranslated] = useState<Record<string, string>>({});
  const logRef = useRef<HTMLDivElement>(null);

  const synthFn = useServerFn(synthesizeSpeech);
  const sttFn = useServerFn(transcribeSpeech);
  const aiFn = useServerFn(extractAnswer);
  const trFn = useServerFn(translateReply);
  const locale = LANGS.find(l => l[0] === lang)![2];
  const handleRef = useRef<(t: string, fromVoice?: boolean) => void>(() => undefined);

  const voice = useVoice({
    locale,
    synth: text => synthFn({ data: { text: text.slice(0, 1200), lang, voice: voiceId } }),
    onError: msg => setAlert(msg),
    onCaptured: (audio, mime) => {
      void Promise.race([sttFn({ data: { audio, mime, lang } }), new Promise<never>((_, rej) => window.setTimeout(() => rej(new Error("timeout")), 30000))]).then(r => {
        voice.setState("ready");
        if (r.error) { setAlert(ERR[r.error] ?? ERR["unavailable"]!); return; }
        handleRef.current(r.text, true);
      }).catch(() => { voice.setState("ready"); setAlert(ERR["unavailable"]!); });
    },
  });

  // Saved household (signed-in "me" only); never overwritten by a new-person check.
  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: row } = await supabase.from("households").select("facts").eq("user_id", data.user.id).maybeSingle();
      const raw = (row?.facts ?? {}) as Record<string, FactValue>;
      const f: Facts = {};
      if (typeof raw["age"] === "number") f.age = raw["age"];
      if (raw["gender"] === "female" || raw["gender"] === "male") f.gender = raw["gender"];
      for (const k of ["hasBankAccount", "ownsCultivableLand", "incomeTaxPayer", "cultivatesCrops"] as const) if (typeof raw[k] === "boolean") f[k] = raw[k];
      if (Object.keys(f).length) setSaved(f);
    });
  }, []);

  async function persist(next: Interview) {
    if (next.facts.subject !== "self") return;
    const { data } = await supabase.auth.getUser(); if (!data.user) return;
    const keep: Record<string, FactValue> = {};
    for (const k of SAVEABLE) { const v = next.facts[k]; if (v !== undefined && v !== UNKNOWN && !next.conflicts.includes(k) && !next.fromAI[k]) keep[k] = v; }
    if (!Object.keys(keep).length) return;
    const { data: row } = await supabase.from("households").select("facts").eq("user_id", data.user.id).maybeSingle();
    await supabase.from("households").upsert({ user_id: data.user.id, facts: { ...((row?.facts as object) ?? {}), ...keep } as never, updated_at: new Date().toISOString() });
  }

  const current: Question | null = useMemo(() => editing ? QUESTIONS[editing] : nextQuestion(iv), [iv, editing]);
  const res: Result[] = useMemo(() => (iv.schemeIds.length && !current ? getResults(iv) : []), [iv, current]);
  const qText = current ? questionText(current, ui, iv.facts.subject) : "";

  // Translate wording for languages without built-in text (falls back to English).
  const tr = useCallback(async (text: string) => {
    if (lang === "en" || lang === "hi") return text;
    const k = `${lang}:${text}`;
    if (translated[k]) return translated[k]!;
    const r = await trFn({ data: { text, lang } }).catch(() => ({ text, translated: false }));
    setTranslated(m => ({ ...m, [k]: r.text }));
    return r.text;
  }, [lang, translated, trFn]);

  async function say(text: string, reopen: boolean) {
    const t = await tr(text);
    setTurns(m => [...m, { role: "agent", text: t }]);
    if (!readAloud) return;
    const done = await voice.speak(t);
    if (done && reopen && handsFree) void voice.listen();
  }

  // Ask the current question (or speak the decision) whenever it changes.
  const lastAsked = useRef<string>("");
  useEffect(() => {
    if (!started) return;
    const sig = current ? `${current.key}:${ui}:${iv.facts.subject ?? ""}:${confirm ? "c" : ""}` : `done:${res.map(r => r.status).join()}`;
    if (sig === lastAsked.current || confirm) return;
    lastAsked.current = sig;
    if (current) void say(qText, true);
    else if (res.length) void say(summarySpeech(res, ui), false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, res, started, ui, confirm]);

  useEffect(() => { logRef.current?.scrollTo({ top: 1e6 }); }, [turns]);
  useEffect(() => { voice.cancel(); lastAsked.current = ""; /* re-ask in the new language */ }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const go = () => begin();
    const away = () => { if (window.location.hash !== "#assistant") voice.cancel(); };
    window.addEventListener("arceus:start", go); window.addEventListener("hashchange", away);
    return () => { window.removeEventListener("arceus:start", go); window.removeEventListener("hashchange", away); };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  function begin() { setStarted(true); setAlert(null); lastAsked.current = ""; }

  function commit(next: Interview) {
    setIv(next); setEditing(null); setConfirm(null); setHeard(null);
    void persist(next);
  }

  function setSubject(next: Interview, subject: FactValue): Interview {
    let n = applyFacts(next, { subject }, { explicit: true });
    if (subject === "self" && saved) n = applyFacts(n, Object.fromEntries(Object.entries(saved).filter(([k]) => n.facts[k as FactKey] === undefined)) as Facts, { explicit: true });
    return n;
  }

  async function handle(text: string, fromVoice = false, choice?: Choice) {
    const clean = text.trim().slice(0, 300);
    if (!clean) return;
    setTurns(m => [...m, { role: "user", text: clean }]);
    setInput(""); setAlert(null);
    const q = current;
    if (!q) return;
    if (q.key === "goal") {
      const n = chooseNeed(iv, clean, choice ? (choice.value as never) : undefined);
      if (!n) { if (fromVoice) setHeard(clean); void say(ui === "hi" ? "माफ़ कीजिए, समझ नहीं आया। कृपया नीचे से चुनें या योजना का नाम बोलें।" : "Sorry, I didn't get that. Please pick an option below or say a scheme name.", true); return; }
      commit(n); return;
    }
    const key = q.key as FactKey;
    let parsed = choice ? { ok: true as const, facts: { [key]: choice.value } as Facts } : parseAnswer(q, clean, ui);
    if (parsed.ok) {
      let n = key === "subject" ? setSubject(iv, parsed.facts.subject!) : applyFacts(iv, parsed.facts, { explicit: true });
      // A restated age while answering something else is a possible contradiction.
      if (key !== "age") { const a = statedAge(clean); if (a && typeof iv.facts.age === "number" && a.value !== iv.facts.age) n = applyFacts(n, { age: a.value }); }
      commit(n); return;
    }
    // Deterministic parse failed: show transcript for correction, then try AI extraction for this one answer.
    if (fromVoice) setHeard(clean);
    voice.setState("thinking");
    const choices = q.options.filter(o => o.value !== UNKNOWN).map(o => o.en);
    const r = await aiFn({ data: { text: clean, kind: q.kind === "goal" ? "choice" : q.kind, choices } }).catch(() => ({ value: null, error: "unavailable" }));
    voice.setState("ready");
    if (r.value === null) {
      void say(ui === "hi" ? `माफ़ कीजिए, समझ नहीं आया। ${qText}` : `Sorry, I didn't catch that. ${qText}`, true);
      return;
    }
    let value: FactValue = r.value;
    if (q.kind === "choice") value = q.options.find(o => o.en === r.value)?.value ?? value;
    if (q.kind === "yesno" && value === "unknown") value = UNKNOWN;
    const facts = { [key]: value } as Facts;
    const label = show(key, value, facts);
    setConfirm({ key, facts, label });
    void say(ui === "hi" ? `मैंने समझा: ${label}। क्या यह सही है?` : `I understood: ${label}. Is that right?`, false);
  }
  handleRef.current = (t, v) => void handle(t, v);

  function acceptConfirm(ok: boolean) {
    if (!confirm) return;
    if (ok) { const n = applyFacts(iv, confirm.facts, { explicit: true, fromAI: true }); commit(n); }
    else { setConfirm(null); lastAsked.current = ""; }
  }

  function newPerson() {
    voice.cancel();
    setIv(newInterview()); setEditing(null); setConfirm(null); setHeard(null); setTurns([]); setAlert(null);
    lastAsked.current = ""; setStarted(true);
  }

  function doSkip() { if (current && current.key !== "goal") { setTurns(m => [...m, { role: "user", text: ui === "hi" ? "छोड़ें" : "Skip" }]); commit(skip(iv, current.key as FactKey)); } }

  const answered = (Object.entries(iv.facts) as [FactKey, FactValue][]).filter(([k]) => FACT_LABEL[k]);
  const label = (c: Choice) => (ui === "hi" ? c.hi : c.en);
  const busy = voice.state === "transcribing" || voice.state === "thinking";
  const progress = iv.schemeIds.length ? Math.round((answered.length / (answered.length + (current ? 1 : 0) || 1)) * 100) : 0;

  return (
    <section className="wrap page-section mx-auto assistant-v2">
      <div className="eyebrow items-center flex gap-[8px] tracking-[0.15em]"><span className="h-px w-[16px]" />YOUR SCHEME ASSISTANT</div>
      <h1 className="page-title">Talk to ARCEUS</h1>
      <p className="page-lead max-w-[560px]">Tell ARCEUS what you need. It asks only the questions that decide the official rules, and shows the exact rule and source behind every answer.</p>

      <div className="av-toolbar">
        <label>Language
          <select value={lang} onChange={e => setLang(e.target.value as Lang)} aria-label="Assistant language">
            {LANGS.map(l => <option key={l[0]} value={l[0]}>{l[1]}{l[0] !== "en" && l[0] !== "hi" ? " (AI translated)" : ""}</option>)}
          </select>
        </label>
        <fieldset className="av-voices"><legend>Voice</legend>
          {(["ishita", "ratan"] as const).map(v => (
            <label key={v} className={voiceId === v ? "on" : ""}><input type="radio" name="voice" value={v} checked={voiceId === v} onChange={() => setVoiceId(v)} />{v === "ishita" ? "Ishita" : "Ratan"}</label>
          ))}
          <button type="button" className="av-chip" onClick={() => void voice.speak(SAMPLE[ui])}><Volume2 size={16} aria-hidden />Play voice sample</button>
        </fieldset>
        <label className="av-check"><input type="checkbox" checked={readAloud} onChange={e => setReadAloud(e.target.checked)} />Read aloud</label>
        <label className="av-check"><input type="checkbox" checked={handsFree} onChange={e => setHandsFree(e.target.checked)} />Hands-free (mic reopens after each question)</label>
        <button type="button" className="av-chip" onClick={newPerson}><UserPlus size={16} aria-hidden />New person</button>
      </div>

      <div className="av-grid">
        <div className="av-main">
          <div className="av-status" role="status" aria-live="polite">
            <span className={`av-dot s-${voice.state}`} aria-hidden />{STATE_TEXT[voice.state]}
            {voice.usedDeviceVoice && <small> · device voice</small>}
            {voice.needsPlay && <button type="button" className="av-chip" onClick={voice.play}><Play size={16} aria-hidden />Play</button>}
          </div>
          {alert && <p className="form-alert" role="alert">{alert}</p>}

          {!started ? (
            <div className="av-card">
              <p className="av-q">{ui === "hi" ? GOAL_QUESTION.hi[0] : GOAL_QUESTION.en[0]}</p>
              <button type="button" className="button primary" onClick={begin}><Mic size={18} aria-hidden />Start</button>
            </div>
          ) : current ? (
            <div className="av-card">
              {iv.schemeIds.length > 0 && <div className="av-progress" aria-label={`Progress ${progress}%`}><span style={{ width: `${progress}%` }} /></div>}
              {editing && <small className="av-muted">Changing an earlier answer</small>}
              <p className="av-q" id="av-question">{confirm ? (ui === "hi" ? `मैंने समझा: ${confirm.label}। क्या यह सही है?` : `I understood: ${confirm.label}. Is that right?`) : qText}</p>
              {heard && <p className="av-muted">I heard: “{heard}” — edit below and send, or tap an answer.</p>}
              <div className="av-options" role="group" aria-labelledby="av-question">
                {confirm ? <>
                  <button type="button" className="av-opt" onClick={() => acceptConfirm(true)}>{ui === "hi" ? "हाँ, सही है" : "Yes, correct"}</button>
                  <button type="button" className="av-opt" onClick={() => acceptConfirm(false)}>{ui === "hi" ? "नहीं" : "No"}</button>
                </> : current.options.map(o => <button key={String(o.value)} type="button" className="av-opt" disabled={busy} onClick={() => void handle(label(o), false, o)}>{label(o)}</button>)}
                {!confirm && current.key !== "goal" && current.key !== "subject" && <button type="button" className="av-opt ghost" onClick={doSkip}><SkipForward size={15} aria-hidden />{ui === "hi" ? "छोड़ें" : "Skip"}</button>}
              </div>
              <form className="av-composer" onSubmit={e => { e.preventDefault(); void handle(input || heard || ""); }}>
                <button type="button" className={`av-mic ${voice.state === "listening" ? "live" : ""}`} onClick={() => void voice.listen()} aria-label={voice.state === "listening" ? "Stop and send recording" : "Answer by voice"} aria-pressed={voice.state === "listening"} style={{ boxShadow: voice.state === "listening" ? `0 0 0 ${4 + voice.level * 10}px var(--av-ring)` : undefined }}>
                  {voice.state === "listening" ? <Square size={20} aria-hidden /> : <Mic size={22} aria-hidden />}
                </button>
                <input value={input} onChange={e => setInput(e.target.value)} maxLength={300} aria-label="Type your answer" placeholder={ui === "hi" ? "जवाब लिखें…" : "Type your answer…"} />
                <button type="submit" className="av-send" disabled={busy || !(input || heard)} aria-label="Send"><Send size={19} aria-hidden /></button>
              </form>
              {voice.state === "listening" && <button type="button" className="av-link" onClick={() => voice.cancel()}>Cancel recording</button>}
            </div>
          ) : (
            <Results results={res} ui={ui} onSpeak={t => void voice.speak(t)} goal={iv.goal} />
          )}

          {started && turns.length > 0 && (
            <details className="av-transcript">
              <summary>Conversation transcript</summary>
              <div ref={logRef} role="log" aria-live="off">{turns.map((t, i) => <p key={i} className={t.role}>{t.role === "agent" ? "ARCEUS: " : "You: "}{t.text}</p>)}</div>
            </details>
          )}
        </div>

        <aside className="av-side" aria-label="Your answers">
          <h2>Your answers</h2>
          {answered.length === 0 ? <p className="av-muted">Answers appear here. You can change any of them.</p> :
            <dl>{answered.map(([k, v]) => (
              <div key={k} className={iv.conflicts.includes(k) ? "conflict" : ""}>
                <dt>{FACT_LABEL[k]}{iv.fromAI[k] ? " · confirmed AI reading" : ""}</dt>
                <dd>{show(k, v, iv.facts)}{iv.conflicts.includes(k) && <em> — conflicting answer, not used until confirmed</em>}
                  {k !== "subject" && <button type="button" className="av-link" onClick={() => { setEditing(k); setConfirm(null); lastAsked.current = ""; }} aria-label={`Change ${FACT_LABEL[k]}`}><Pencil size={13} aria-hidden />Change</button>}
                </dd>
              </div>))}</dl>}
          {iv.schemeIds.length > 0 && <button type="button" className="av-link" onClick={() => commit({ ...iv, goal: null, schemeIds: [] })}><RotateCcw size={13} aria-hidden />Choose a different need</button>}
          <p className="av-muted small">Never share Aadhaar, bank or phone numbers here. Results are guidance, not an application. Voice audio and transcripts are not stored.</p>
        </aside>
      </div>
    </section>
  );
}

function Results({ results, ui, onSpeak, goal }: { results: Result[]; ui: UiLang; onSpeak: (t: string) => void; goal: string | null }) {
  const extra = DISCOVERY.filter(d => d.goal === goal);
  return (
    <div className="av-results">
      <h2>{ui === "hi" ? "आपका परिणाम" : "Your result"}</h2>
      {results.map(r => (
        <article key={r.scheme.id} className={`av-result st-${r.status}`}>
          <header>
            <div><small>{r.scheme.ministry}</small><h3>{r.scheme.name}</h3><p>{r.scheme.benefit}</p></div>
            <span className="av-badge">{STATUS_TEXT[ui][r.status]}</span>
          </header>
          <p className="av-reason">{decisionSentence(r, ui)} <button type="button" className="av-link" onClick={() => onSpeak(decisionSentence(r, ui))} aria-label="Read this result aloud"><Volume2 size={14} aria-hidden /></button></p>
          {r.nearMiss && <p className="av-muted">{r.nearMiss}</p>}
          {!r.scheme.verified && <p className="av-muted">ARCEUS could not retrieve this scheme's official guideline on the check date, so it never shows “likely eligible” — confirm on the official site.</p>}
          <details>
            <summary>Rules checked ({r.criteria.length})</summary>
            <ul className="av-criteria">{r.criteria.map(c => (
              <li key={c.id} className={`o-${c.outcome}`}>
                <span className="av-ico" aria-hidden>{c.outcome === "pass" ? <Check size={15} /> : c.outcome === "fail" ? <X size={15} /> : <HelpCircle size={15} />}</span>
                <div>
                  <b>{c.requirement}</b> <span className="sr-only">{c.outcome}</span>
                  <p>Your answer: {c.answer}{c.note ? ` — ${c.note}` : ""}</p>
                  <blockquote>“{c.excerpt}”</blockquote>
                  <small><a href={c.source.url} target="_blank" rel="noreferrer">{c.source.citation}</a> · {c.source.checked ? `checked ${c.source.checked}` : "not verified by ARCEUS"}</small>
                </div>
              </li>))}</ul>
          </details>
          {r.status !== "ineligible" && <div className="av-apply"><p><b>Documents:</b> {r.scheme.documents.join(", ")}</p><ol>{r.scheme.steps.map(s => <li key={s}>{s}</li>)}</ol></div>}
          <a className="av-official" href={r.scheme.link} target="_blank" rel="noreferrer">Official website <ExternalLink size={13} aria-hidden /></a>
        </article>
      ))}
      {extra.length > 0 && <div className="av-discovery"><b>Also worth looking at (not checked by ARCEUS):</b>{extra.map(d => <a key={d.name} href={d.link} target="_blank" rel="noreferrer">{d.name} <ExternalLink size={12} aria-hidden /></a>)}</div>}
    </div>
  );
}
