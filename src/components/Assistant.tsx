import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mic, MicOff, RotateCcw, Send, Volume2, ExternalLink } from "lucide-react";
import { evaluateAll, extractFacts, mergeFacts, nextQuestion, QUESTIONS, type Facts, type Result } from "@/lib/assistant-core";
import { extractWithAI, translateReply } from "@/lib/assistant.functions";
import { transcribeSpeech, synthesizeSpeech } from "@/lib/voice.functions";
import { supabase } from "@/integrations/supabase/client";

const LANGS = [
  ["en", "English", "en-IN"], ["hi", "हिन्दी", "hi-IN"], ["te", "తెలుగు", "te-IN"], ["mr", "मराठी", "mr-IN"],
  ["ta", "தமிழ்", "ta-IN"], ["kn", "ಕನ್ನಡ", "kn-IN"], ["bn", "বাংলা", "bn-IN"],
] as const;
type Lang = (typeof LANGS)[number][0];
type Msg = { role: "agent" | "user"; text: string; results?: Result[] };
const GREETING = "Namaste! Tell me what help you need — farming, studies, health, a business loan or a pension. You can speak or type.";
const STATUS_LABEL = { likely_eligible: "Likely eligible", ineligible: "Not eligible", needs_verification: "Needs verification" };

export function Assistant() {
  const [lang, setLang] = useState<Lang>("en");
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "agent", text: GREETING }]);
  const [facts, setFacts] = useState<Facts>({});
  const [expecting, setExpecting] = useState<keyof Facts | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakAloud, setSpeakAloud] = useState(true);
  const [alert, setAlert] = useState<string | null>(null);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const aiExtract = useServerFn(extractWithAI);
  const translate = useServerFn(translateReply);
  const stt = useServerFn(transcribeSpeech);
  const tts = useServerFn(synthesizeSpeech);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const locale = LANGS.find(l => l[0] === lang)![2];

  useEffect(() => { logRef.current?.scrollTo({ top: 1e6, behavior: "smooth" }); }, [msgs]);
  useEffect(() => () => { audioRef.current?.pause(); window.speechSynthesis?.cancel(); recRef.current?.stop(); }, []);

  // Load saved household facts for signed-in users.
  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: row } = await supabase.from("households").select("facts").eq("user_id", data.user.id).maybeSingle();
      if (row?.facts) setFacts(row.facts as Facts);
    });
  }, []);

  function stopAudio() { audioRef.current?.pause(); window.speechSynthesis?.cancel(); }

  async function speak(text: string) {
    if (!speakAloud) return;
    stopAudio();
    const { audio } = await tts({ data: { text: text.slice(0, 1500), lang } }).catch(() => ({ audio: null }));
    if (audio) { const a = new Audio(`data:audio/wav;base64,${audio}`); audioRef.current = a; void a.play(); return; }
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text.slice(0, 400));
    u.lang = locale;
    window.speechSynthesis.speak(u);
  }

  async function reply(text: string, results?: Result[]) {
    const { text: out } = await translate({ data: { text, lang } });
    setMsgs(m => [...m, { role: "agent", text: out, ...(results ? { results } : {}) }]);
    void speak(out);
  }

  async function handle(text: string) {
    const clean = text.trim().slice(0, 500);
    if (!clean || busy) return;
    stopAudio(); // interruption
    setMsgs(m => [...m, { role: "user", text: clean }]);
    setInput(""); setBusy(true); setAlert(null);
    try {
      let found = lang === "en" ? extractFacts(clean, expecting) : {};
      if (Object.keys(found).length === 0) {
        const r = await aiExtract({ data: { text: clean, expecting } });
        if (r.error) setAlert(r.error);
        found = r.facts as Facts;
      }
      const { facts: merged, conflicts } = mergeFacts(facts, found);
      setFacts(merged);
      void persist(merged);
      if (conflicts.length) {
        await reply(`You said something different earlier about: ${conflicts.join(", ")}. I've used your latest answer — tell me if that's wrong.`);
      }
      const tag = merged.occupation === "farmer" ? "farmer" : merged.occupation === "student" ? "student" : merged.occupation === "business" ? "business" : undefined;
      const results = evaluateAll(merged, tag);
      const q = nextQuestion(results);
      setExpecting(q);
      if (q) await reply(QUESTIONS[q]);
      else {
        const ok = results.filter(r => r.status === "likely_eligible");
        await reply(ok.length ? `Based on your answers, you are likely eligible for ${ok.map(r => r.scheme.name).join(", ")}. Final approval is decided by the government office.` : "Based on your answers, I could not find a scheme you're likely eligible for among the verified ones. See details below.", results);
      }
    } catch (e) {
      console.error(e);
      setAlert("Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  async function persist(f: Facts) {
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from("households").upsert({ user_id: data.user.id, facts: f as never, updated_at: new Date().toISOString() });
  }

  async function toggleMic() {
    if (listening) { recRef.current?.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setAlert("Voice input isn't supported in this browser. Please type instead."); return; }
    stopAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = e => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setListening(false);
        const blob = new Blob(chunks, { type: rec.mimeType });
        if (blob.size < 500) return;
        const buf = new Uint8Array(await blob.arrayBuffer());
        let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        setBusy(true); setInput("Listening…");
        const r = await stt({ data: { audio: btoa(bin), mime: rec.mimeType || "audio/webm", lang } }).catch(() => ({ text: "", error: "Voice service unavailable." }));
        setBusy(false); setInput("");
        if (r.error || !r.text) { setAlert(r.error ?? "I didn't catch that. Please try again."); return; }
        void handle(r.text);
      };
      recRef.current = rec; rec.start(); setListening(true); setAlert(null);
    } catch {
      setAlert("The microphone is unavailable. Check permission or type your reply.");
    }
  }

  function restart() {
    stopAudio();
    setMsgs([{ role: "agent", text: GREETING }]); setFacts({}); setExpecting(null); setAlert(null);
  }

  return (
    <section className="wrap page-section mx-auto">
      <div className="eyebrow items-center flex gap-[8px] tracking-[0.15em]"><span className="h-px w-[16px]" />YOUR SCHEME ASSISTANT</div>
      <h1 className="page-title">Talk to ARCEUS</h1>
      <p className="page-lead max-w-[530px]">Ask in your own words. ARCEUS will ask only for the details it still needs.</p>
      <div className="assistant-layout items-start grid gap-[16px] mt-[24px]">
        <aside className="assistant-sidebar rounded-[17px] text-center p-4 grid gap-3 [border:1px_solid_var(--line)]">
          <div className={`sidebar-orb ${listening ? "" : "idle"} border border-solid border-[#dbe8da] rounded-[50%] h-[140px] w-[140px] mx-auto grid place-items-center ${listening ? "animate-pulse" : ""}`}>
            <Mic size={44} aria-hidden />
          </div>
          <label className="grid gap-1 text-sm">Language
            <select className="rounded-md border p-2" value={lang} onChange={e => setLang(e.target.value as Lang)} aria-label="Language">
              {LANGS.map(l => <option key={l[0]} value={l[0]}>{l[1]}</option>)}
            </select>
          </label>
          <p>{busy ? "Thinking…" : listening ? "Listening…" : "Ready to listen"}</p>
          <button className="button primary items-center gap-[9px] justify-center" onClick={toggleMic}>
            {listening ? <MicOff size={18} /> : <Mic size={18} />}{listening ? "Stop microphone" : "Start microphone"}
          </button>
          <label className="read-toggle flex gap-2 justify-center"><input type="checkbox" checked={speakAloud} onChange={e => setSpeakAloud(e.target.checked)} />Read replies aloud</label>
          <small>Keep ID and bank numbers out of the chat. Results are guidance, not an application.</small>
        </aside>
        <div className="chat-shell rounded-[17px] min-w-0 overflow-hidden [border:1px_solid_var(--line)]">
          <div className="chat-header items-center flex gap-[10px] py-[12px] px-[16px] [border-bottom:1px_solid_var(--line)]">
            <div><b>ARCEUS</b><small className="block">Eligibility conversation</small></div>
            <button className="icon-button ml-auto p-2" onClick={restart} aria-label="Restart conversation"><RotateCcw size={18} /></button>
          </div>
          <div ref={logRef} className="transcript flex flex-col gap-[12px] overflow-auto p-4" role="log" aria-live="polite" tabIndex={0}>
            {msgs.map((m, i) => (
              <div key={i} className={`message ${m.role === "agent" ? "agent-message self-start" : "user-message self-end"} rounded-[12px] py-[11px] px-[14px] w-fit max-w-[90%]`}>
                <p className="wrap-anywhere">{m.text}</p>
                {m.role === "agent" && <button className="listen-button mt-1" aria-label="Read this reply aloud" onClick={() => void speak(m.text)}><Volume2 size={15} /></button>}
                {m.results && <div className="grid gap-2 mt-3">{m.results.map(r => (
                  <div key={r.scheme.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex justify-between gap-2"><b>{r.scheme.name}</b><span>{STATUS_LABEL[r.status]}</span></div>
                    <p>{r.scheme.benefit}</p>
                    {r.failed.length > 0 && <p>Why not: {r.failed.join("; ")}</p>}
                    {r.status !== "ineligible" && <><p>Documents: {r.scheme.documents.join(", ")}</p><p>Steps: {r.scheme.steps.join(" → ")}</p></>}
                    <a className="inline-flex items-center gap-1 underline" href={r.scheme.link} target="_blank" rel="noreferrer">Official website <ExternalLink size={13} /></a>
                  </div>))}</div>}
              </div>
            ))}
            {msgs.length === 1 && <div className="flex flex-wrap gap-[7px]">
              {["I'm a farmer", "I need a scholarship", "Healthcare for a parent", "I need a business loan"].map(c =>
                <button key={c} className="chip min-h-[36px] py-[7px] px-[12px]" onClick={() => void handle(c)}>{c}</button>)}
            </div>}
          </div>
          <div className="p-[12px] [border-top:1px_solid_var(--line)]">
            {alert && <p role="status" className="form-alert mb-2">{alert}</p>}
            <form className="composer items-center rounded-[12px] flex gap-[8px] p-[5px] [border:1px_solid_var(--line)]" onSubmit={e => { e.preventDefault(); void handle(input); }}>
              <button type="button" className="icon-button mic-button p-2" onClick={toggleMic} aria-label={listening ? "Stop microphone" : "Start microphone"}>{listening ? <MicOff size={20} /> : <Mic size={20} />}</button>
              <input className="flex-1 bg-transparent outline-none" maxLength={500} aria-label="Your message" placeholder="Ask a question or type your answer…" value={input} onChange={e => setInput(e.target.value)} />
              <button type="submit" className="icon-button send-button p-2" disabled={!input.trim() || busy} aria-label="Send message"><Send size={19} /></button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
