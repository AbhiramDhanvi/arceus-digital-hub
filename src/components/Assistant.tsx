import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mic, MicOff, RotateCcw, Send, Volume2, ExternalLink, Check, X, Sparkles } from "lucide-react";
import {
  evaluateAll, extractFacts, mergeFacts, nextQuestionnaireItem, questionProgress,
  type Facts, type Result, type Question, type Option,
} from "@/lib/assistant-core";
import { extractWithAI, translateReply, personalizeAnswer } from "@/lib/assistant.functions";
import { transcribeSpeech, synthesizeSpeech } from "@/lib/voice.functions";
import { supabase } from "@/integrations/supabase/client";

const LANGS = [
  ["en", "English", "en-IN"], ["hi", "हिन्दी", "hi-IN"], ["te", "తెలుగు", "te-IN"], ["mr", "मराठी", "mr-IN"],
  ["ta", "தமிழ்", "ta-IN"], ["kn", "ಕನ್ನಡ", "kn-IN"], ["bn", "বাংলা", "bn-IN"],
] as const;
type Lang = (typeof LANGS)[number][0];
type Msg = { role: "agent" | "user"; text: string; options?: Option[]; results?: Result[]; advice?: Record<string, string> };
const GREETING = "Namaste! I'm ARCEUS. I'll ask you a few short questions and then show which government schemes fit you, with a match score and what to do next. You can speak, type, or tap an answer.";
const STATUS_LABEL = { likely_eligible: "Likely eligible", ineligible: "Not eligible", needs_verification: "Needs verification" };

export function Assistant() {
  const [lang, setLang] = useState<Lang>("en");
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "agent", text: GREETING }]);
  const [facts, setFacts] = useState<Facts>({});
  const [current, setCurrent] = useState<Question | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [speakAloud, setSpeakAloud] = useState(true);
  const [handsFree, setHandsFree] = useState(true);
  const [alert, setAlert] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const handsFreeRef = useRef(handsFree); handsFreeRef.current = handsFree;
  const aiExtract = useServerFn(extractWithAI);
  const translate = useServerFn(translateReply);
  const personalize = useServerFn(personalizeAnswer);
  const stt = useServerFn(transcribeSpeech);
  const tts = useServerFn(synthesizeSpeech);
  const locale = LANGS.find(l => l[0] === lang)![2];
  const progress = questionProgress(facts);

  useEffect(() => { logRef.current?.scrollTo({ top: 1e6, behavior: "smooth" }); }, [msgs]);
  useEffect(() => () => { audioRef.current?.pause(); window.speechSynthesis?.cancel(); if (recRef.current?.state === "recording") recRef.current.stop(); }, []);

  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: row } = await supabase.from("households").select("facts").eq("user_id", data.user.id).maybeSingle();
      if (row?.facts) setFacts(row.facts as Facts);
    });
  }, []);

  function stopAudio() { audioRef.current?.pause(); window.speechSynthesis?.cancel(); }

  /** Speak text; resolves when playback ends. */
  async function speak(text: string): Promise<void> {
    if (!speakAloud) return;
    stopAudio();
    const { audio } = await tts({ data: { text: text.slice(0, 1500), lang } }).catch(() => ({ audio: null }));
    if (audio) {
      const a = new Audio(`data:audio/wav;base64,${audio}`); audioRef.current = a;
      await new Promise<void>(res => { a.onended = () => res(); a.onerror = () => res(); a.onpause = () => res(); void a.play().catch(() => res()); });
      return;
    }
    if (!("speechSynthesis" in window)) return;
    await new Promise<void>(res => {
      const u = new SpeechSynthesisUtterance(text.slice(0, 400)); u.lang = locale; u.onend = () => res(); u.onerror = () => res();
      window.speechSynthesis.speak(u);
    });
  }

  async function say(text: string, extra: Omit<Msg, "role" | "text"> = {}, listenAfter = false) {
    const { text: out } = await translate({ data: { text, lang } });
    setMsgs(m => [...m, { role: "agent", text: out, ...extra }]);
    await speak(out);
    if (listenAfter && handsFreeRef.current && speakAloud) void startMic();
  }

  async function ask(q: Question) {
    setCurrent(q);
    const spoken = q.options.length <= 7 ? `${q.text} (${q.options.map(o => o.label).join(", ")})` : q.text;
    await say(spoken, { options: q.options }, true);
  }

  async function report(f: Facts) {
    setCurrent(null);
    const results = evaluateAll(f);
    const p = await personalize({ data: {
      facts: f as Record<string, string | number | boolean>, lang,
      results: results.map(r => ({ id: r.scheme.id, name: r.scheme.name, status: r.status, score: r.score, met: r.met, failed: r.failed, missing: r.missing })),
    } }).catch(() => ({ text: null, advice: {} as Record<string, string> }));
    const ok = results.filter(r => r.status === "likely_eligible");
    const text = p.text ?? (ok.length ? `You are likely eligible for ${ok.map(r => r.scheme.name).join(", ")}. Final approval is decided by the government office.` : "I could not find a scheme you're likely eligible for among the verified ones. See the details below.");
    const out = p.text ? text : (await translate({ data: { text, lang } })).text;
    setMsgs(m => [...m, { role: "agent", text: out, results, advice: p.advice }]);
    await speak(out);
  }

  function matchOption(text: string, q: Question): Option | null {
    const t = text.toLowerCase().trim().replace(/[.!?।]/g, "");
    const n = Number(t);
    if (q.key === "age" && Number.isFinite(n) && n > 0 && n < 120) return { label: t, value: n };
    return q.options.find(o => t === o.label.toLowerCase() || t.includes(o.label.toLowerCase().split(" (")[0]!)) ?? null;
  }

  async function handle(text: string, chosen?: Option) {
    const clean = text.trim().slice(0, 500);
    if (!clean || busy) return;
    stopAudio();
    setMsgs(m => [...m, { role: "user", text: clean }]);
    setInput(""); setBusy(true); setAlert(null);
    try {
      const q = current;
      let found: Facts = {};
      if (chosen && q) found = { [q.key]: chosen.value } as Facts;
      else {
        const opt = q ? matchOption(clean, q) : null;
        if (opt && q) found = { [q.key]: opt.value } as Facts;
        else {
          found = lang === "en" ? extractFacts(clean, q?.key ?? null) : {};
          if (q && found[q.key] === undefined || Object.keys(found).length === 0) {
            const r = await aiExtract({ data: { text: clean, expecting: q?.key ?? null, options: q?.options.map(o => o.label) } });
            if (r.error) setAlert(r.error);
            found = { ...found, ...(r.facts as Facts) };
          }
        }
      }
      if (q && Object.keys(found).length === 0) { await say(`Sorry, I didn't catch that. ${q.text}`, { options: q.options }, true); return; }
      const { facts: merged, conflicts } = mergeFacts(facts, found);
      setFacts(merged);
      void persist(merged);
      if (conflicts.length) await say(`You said something different earlier about ${conflicts.join(", ")}. I've used your latest answer.`);
      const next = nextQuestionnaireItem(merged);
      if (next) await ask(next); else await report(merged);
    } catch (e) {
      console.error(e);
      setAlert("Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  async function persist(f: Facts) {
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from("households").upsert({ user_id: data.user.id, facts: f as never, updated_at: new Date().toISOString() });
  }

  async function startMic() {
    if (recRef.current?.state === "recording") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setAlert("Voice input isn't supported in this browser. Please type instead."); return; }
    stopAudio();
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch { setAlert("Microphone permission is blocked. Allow the microphone in your browser, or type your answer."); return; }
    const rec = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    let spoke = false;
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      setListening(false); setLevel(0);
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      if (!spoke || blob.size < 1500) { setAlert("I didn't hear anything. Tap the mic and speak a little louder."); return; }
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      setInput("Understanding…");
      const r = await stt({ data: { audio: btoa(bin), mime: rec.mimeType || "audio/webm", lang } }).catch(() => ({ text: "", error: "Voice service unavailable." }));
      setInput("");
      if (r.error || !r.text.trim()) { setAlert(r.error ?? "I didn't catch that. Please try again."); return; }
      void handle(r.text);
    };

    // Voice activity detection: stop ~1.2s after the speaker goes quiet.
    const ctx = new AudioContext();
    await ctx.resume().catch(() => undefined);
    const an = ctx.createAnalyser(); an.fftSize = 2048;
    ctx.createMediaStreamSource(stream).connect(an);
    const data = new Float32Array(an.fftSize);
    const t0 = Date.now(); let lastLoud = t0; let floor = 0.005; let samples = 0;
    const timer = window.setInterval(() => {
      if (rec.state !== "recording") { window.clearInterval(timer); void ctx.close(); return; }
      an.getFloatTimeDomainData(data);
      let sum = 0; for (const v of data) sum += v * v;
      const rms = Math.sqrt(sum / data.length);
      const now = Date.now();
      if (now - t0 < 300) { floor = (floor * samples + rms) / ++samples; return; }
      setLevel(Math.min(1, rms * 12));
      if (rms > Math.max(0.01, floor * 3)) { spoke = true; lastLoud = now; }
      if ((spoke && now - lastLoud > 1200) || now - t0 > 20000 || (!spoke && now - t0 > 8000)) { window.clearInterval(timer); rec.stop(); void ctx.close(); }
    }, 80);
    recRef.current = rec; rec.start(250); setListening(true); setAlert(null);
  }

  function toggleMic() {
    if (recRef.current?.state === "recording") { recRef.current.stop(); return; }
    void startMic();
  }

  function begin() {
    const q = nextQuestionnaireItem(facts);
    if (q) void ask(q); else void report(facts);
  }

  function restart() {
    stopAudio();
    setMsgs([{ role: "agent", text: GREETING }]); setFacts({}); setCurrent(null); setAlert(null);
    void persist({});
  }

  const lastAgent = [...msgs].reverse().find(m => m.role === "agent");
  return (
    <section className="wrap page-section mx-auto">
      <div className="eyebrow items-center flex gap-[8px] tracking-[0.15em]"><span className="h-px w-[16px]" />YOUR SCHEME ASSISTANT</div>
      <h1 className="page-title">Talk to ARCEUS</h1>
      <p className="page-lead max-w-[530px]">Answer a few short questions by voice, text or tap. ARCEUS scores every scheme against your profile and explains the gaps.</p>
      <div className="assistant-layout items-start grid gap-[16px] mt-[24px]">
        <aside className="assistant-sidebar rounded-[17px] text-center p-4 grid gap-3 [border:1px_solid_var(--line)]">
          <button type="button" onClick={toggleMic} aria-label={listening ? "Stop microphone" : "Start microphone"}
            className={`sidebar-orb ${listening ? "" : "idle"} rounded-[50%] h-[140px] w-[140px] mx-auto grid place-items-center transition-transform`}
            style={{ transform: `scale(${1 + level * 0.25})` }}>
            {listening ? <MicOff size={44} aria-hidden /> : <Mic size={44} aria-hidden />}
          </button>
          <label className="grid gap-1 text-sm">Language
            <select className="rounded-md border p-2" value={lang} onChange={e => setLang(e.target.value as Lang)} aria-label="Language">
              {LANGS.map(l => <option key={l[0]} value={l[0]}>{l[1]}</option>)}
            </select>
          </label>
          <p>{busy ? "Thinking…" : listening ? "Listening… speak now" : "Tap the mic to speak"}</p>
          <div className="text-sm">Question {Math.min(progress.done + 1, progress.total)} of {progress.total}
            <div className="h-1.5 rounded bg-muted mt-1 overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
          </div>
          <label className="read-toggle flex gap-2 justify-center"><input type="checkbox" checked={speakAloud} onChange={e => setSpeakAloud(e.target.checked)} />Read replies aloud</label>
          <label className="read-toggle flex gap-2 justify-center"><input type="checkbox" checked={handsFree} onChange={e => setHandsFree(e.target.checked)} />Listen after each question</label>
          <small>Keep ID and bank numbers out of the chat. Results are guidance, not an application.</small>
        </aside>
        <div className="chat-shell rounded-[17px] min-w-0 overflow-hidden [border:1px_solid_var(--line)]">
          <div className="chat-header items-center flex gap-[10px] py-[12px] px-[16px] [border-bottom:1px_solid_var(--line)]">
            <div><b>ARCEUS</b><small className="block">Eligibility questionnaire</small></div>
            <button className="icon-button ml-auto p-2" onClick={restart} aria-label="Restart conversation"><RotateCcw size={18} /></button>
          </div>
          <div ref={logRef} className="transcript flex flex-col gap-[12px] overflow-auto p-4" role="log" aria-live="polite" tabIndex={0}>
            {msgs.map((m, i) => (
              <div key={i} className={`message ${m.role === "agent" ? "agent-message self-start" : "user-message self-end"} rounded-[12px] py-[11px] px-[14px] w-fit max-w-[95%]`}>
                <p className="wrap-anywhere">{m.text}</p>
                {m.role === "agent" && <button className="listen-button mt-1" aria-label="Read this reply aloud" onClick={() => void speak(m.text)}><Volume2 size={15} /></button>}
                {m.options && m === lastAgent && current && <div className="flex flex-wrap gap-[7px] mt-2">
                  {m.options.map(o => <button key={o.label} disabled={busy} className="chip min-h-[36px] py-[7px] px-[12px]" onClick={() => void handle(o.label, o)}>{o.label}</button>)}
                </div>}
                {m.results && <div className="grid gap-3 mt-3">{m.results.map(r => <ReportCard key={r.scheme.id} r={r} advice={m.advice?.[r.scheme.id]} />)}</div>}
              </div>
            ))}
            {msgs.length === 1 && <button className="button primary self-start" onClick={begin}>Start the questionnaire</button>}
          </div>
          <div className="p-[12px] [border-top:1px_solid_var(--line)]">
            {alert && <p role="status" className="form-alert mb-2">{alert}</p>}
            <form className="composer items-center rounded-[12px] flex gap-[8px] p-[5px] [border:1px_solid_var(--line)]" onSubmit={e => { e.preventDefault(); void handle(input); }}>
              <button type="button" className="icon-button mic-button p-2" onClick={toggleMic} aria-label={listening ? "Stop microphone" : "Start microphone"}>{listening ? <MicOff size={20} /> : <Mic size={20} />}</button>
              <input className="flex-1 bg-transparent outline-none" maxLength={500} aria-label="Your message" placeholder="Type your answer or describe your situation…" value={input} onChange={e => setInput(e.target.value)} />
              <button type="submit" className="icon-button send-button p-2" disabled={!input.trim() || busy} aria-label="Send message"><Send size={19} /></button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportCard({ r, advice }: { r: Result; advice?: string | undefined }) {
  return (
    <div className="rounded-lg border p-3 text-sm grid gap-2">
      <div className="flex justify-between items-start gap-3">
        <div><small className="uppercase tracking-wider opacity-70">{r.scheme.ministry}</small><b className="block text-base">{r.scheme.name}</b></div>
        <div className="text-right shrink-0"><small className="opacity-70">MATCH</small><b className="block text-xl">{r.score}%</b></div>
      </div>
      <span className="text-xs font-semibold">{STATUS_LABEL[r.status]}</span>
      <p>{r.scheme.benefit}</p>
      {r.met.length > 0 && <div><small className="font-semibold">MATCHED CRITERIA</small>{r.met.map(c => <p key={c} className="flex gap-1 items-center"><Check size={14} />{c}</p>)}</div>}
      {(r.failed.length > 0 || r.missing.length > 0) && <div><small className="font-semibold">MISSING CRITERIA</small>
        {r.failed.map(c => <p key={c} className="flex gap-1 items-center"><X size={14} />{c}</p>)}
        {r.missing.map(c => <p key={c} className="flex gap-1 items-center opacity-70"><X size={14} />Not answered: {c}</p>)}
      </div>}
      {advice && <p className="rounded-md border border-dashed p-2 flex gap-2"><Sparkles size={14} className="shrink-0 mt-0.5" /><span><b>AI advice:</b> {advice}</span></p>}
      {r.status !== "ineligible" && <><p><b>Documents:</b> {r.scheme.documents.join(", ")}</p><p><b>How to apply:</b> {r.scheme.steps.join(" → ")}</p></>}
      <a className="inline-flex items-center gap-1 underline" href={r.scheme.link} target="_blank" rel="noreferrer">Official website <ExternalLink size={13} /></a>
    </div>
  );
}
