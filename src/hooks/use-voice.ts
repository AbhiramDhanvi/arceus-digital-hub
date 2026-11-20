import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceState = "ready" | "listening" | "transcribing" | "thinking" | "speaking" | "error";
const PREFERRED = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4", "audio/wav"];

/** Browser capture + playback with lifecycle cleanup. Provider calls are injected. */
export function useVoice(opts: {
  synth: (text: string) => Promise<{ audio: string | null; mime: string | null; error: string | null }>;
  onCaptured: (b64: string, mime: string) => void;
  onError: (msg: string) => void;
  locale: string;
}) {
  const [state, setState] = useState<VoiceState>("ready");
  const [level, setLevel] = useState(0);
  const [needsPlay, setNeedsPlay] = useState(false);
  const [usedDeviceVoice, setUsedDeviceVoice] = useState(false);
  const token = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timers = useRef<number[]>([]);
  const ctx = useRef<AudioContext | null>(null);
  const pendingDone = useRef<(() => void) | null>(null);
  const discard = useRef(false);
  const o = useRef(opts); o.current = opts;

  const clearTimers = () => { timers.current.forEach(t => window.clearInterval(t)); timers.current = []; };
  const stopCapture = (keep: boolean) => {
    discard.current = !keep;
    clearTimers();
    if (rec.current?.state === "recording") rec.current.stop();
    else { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; }
    void ctx.current?.close().catch(() => undefined); ctx.current = null;
    setLevel(0);
  };
  const cancel = useCallback(() => {
    token.current++;
    stopCapture(false);
    if (audio.current) { audio.current.onended = null; audio.current.pause(); audio.current = null; }
    window.speechSynthesis?.cancel();
    pendingDone.current = null; setNeedsPlay(false);
    setState("ready");
  }, []);

  /** Speak; resolves true when playback finished, false when cancelled or blocked. */
  const speak = useCallback(async (text: string): Promise<boolean> => {
    cancel();
    const my = token.current;
    setState("speaking");
    const r = await o.current.synth(text).catch(() => ({ audio: null, mime: null, error: "unavailable" }));
    if (my !== token.current) return false;
    if (r.audio && r.mime) {
      setUsedDeviceVoice(false);
      const a = new Audio(`data:${r.mime};base64,${r.audio}`); audio.current = a;
      return await new Promise<boolean>(res => {
        a.onended = () => { if (my === token.current) setState("ready"); res(true); };
        a.onerror = () => { if (my === token.current) setState("ready"); res(false); };
        a.play().catch(() => { // autoplay blocked: wait for an explicit Play tap
          if (my !== token.current) return res(false);
          setNeedsPlay(true); setState("ready");
          pendingDone.current = () => res(true);
        });
      });
    }
    if (r.error === "quota" || r.error === "not_configured" || r.error === "auth") o.current.onError(r.error === "quota" ? "Daily voice limit reached — the device voice is used instead." : "Natural voice is not available — the device voice is used instead.");
    if (!("speechSynthesis" in window)) { setState("ready"); return false; }
    setUsedDeviceVoice(true);
    return await new Promise<boolean>(res => {
      const u = new SpeechSynthesisUtterance(text); u.lang = o.current.locale;
      u.onend = () => { if (my === token.current) setState("ready"); res(true); };
      u.onerror = () => { if (my === token.current) setState("ready"); res(false); };
      window.speechSynthesis.speak(u);
    });
  }, [cancel]);

  const play = useCallback(() => {
    const a = audio.current; if (!a) return;
    const my = token.current;
    setNeedsPlay(false); setState("speaking");
    const done = pendingDone.current; pendingDone.current = null;
    a.onended = () => { if (my === token.current) setState("ready"); done?.(); };
    void a.play().catch(() => { setState("ready"); o.current.onError("Audio could not play on this device."); });
  }, []);

  const listen = useCallback(async () => {
    if (rec.current?.state === "recording") { stopCapture(true); return; }
    cancel();
    const my = token.current;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setState("error"); o.current.onError("Voice input isn't supported in this browser. Please type or tap an answer."); return; }
    let s: MediaStream;
    try { s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch (e) {
      setState("error");
      o.current.onError(e instanceof DOMException && e.name === "NotAllowedError" ? "Microphone permission was denied. Allow it in your browser settings, or type your answer." : "No microphone found. Please type your answer.");
      return;
    }
    if (my !== token.current) { s.getTracks().forEach(t => t.stop()); return; }
    stream.current = s;
    const mime = PREFERRED.find(m => MediaRecorder.isTypeSupported?.(m)) ?? "";
    const r = mime ? new MediaRecorder(s, { mimeType: mime }) : new MediaRecorder(s);
    rec.current = r; discard.current = false;
    const chunks: Blob[] = []; let spoke = false;
    r.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    r.onstop = async () => {
      s.getTracks().forEach(t => t.stop()); stream.current = null;
      if (discard.current || my !== token.current) return;
      const type = r.mimeType || mime || "audio/webm";
      const blob = new Blob(chunks, { type });
      if (!spoke || blob.size < 1200) { setState("ready"); o.current.onError("I didn't hear anything. Tap the mic and speak a little louder."); return; }
      setState("transcribing");
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      o.current.onCaptured(btoa(bin), type);
    };
    // Voice activity detection: noise floor from the first 300 ms, stop after 1.2 s of silence.
    const ac = new AudioContext(); ctx.current = ac;
    await ac.resume().catch(() => undefined);
    const an = ac.createAnalyser(); an.fftSize = 2048; ac.createMediaStreamSource(s).connect(an);
    const data = new Float32Array(an.fftSize);
    const t0 = Date.now(); let last = t0, floor = 0.004, n = 0;
    timers.current.push(window.setInterval(() => {
      if (r.state !== "recording") return;
      an.getFloatTimeDomainData(data);
      let sum = 0; for (const v of data) sum += v * v;
      const rms = Math.sqrt(sum / data.length), now = Date.now();
      if (now - t0 < 300) { floor = (floor * n + rms) / ++n; return; }
      setLevel(Math.min(1, rms * 12));
      if (rms > Math.max(0.01, floor * 3)) { spoke = true; last = now; }
      if ((spoke && now - last > 1200) || (!spoke && now - t0 > 8000) || now - t0 > 20000) stopCapture(true);
    }, 80));
    r.start(250); setState("listening");
  }, [cancel]);

  // Lifecycle: stop everything when the tab is hidden or the component unmounts.
  useEffect(() => {
    const hide = () => { if (document.hidden) cancel(); };
    document.addEventListener("visibilitychange", hide);
    return () => { document.removeEventListener("visibilitychange", hide); cancel(); };
  }, [cancel]);

  return { state, setState, level, needsPlay, usedDeviceVoice, speak, play, listen, cancel, stopListening: () => stopCapture(true) };
}
