import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  ExternalLink,
  GitBranch,
  HelpCircle,
  Mic,
  Play,
  RotateCcw,
  Send,
  SkipForward,
  Square,
  UserPlus,
  Volume2,
  X,
} from "lucide-react";
import { SCHEMES, UNKNOWN, type FactKey, type Goal } from "@/lib/eligibility";
import {
  GOALS,
  QUESTIONS,
  chooseNeed,
  newInterview,
  type Choice,
  type UiLang,
} from "@/lib/interview";
import { synthesizeSpeech, transcribeSpeech } from "@/lib/voice.functions";
import { useVoice } from "@/hooks/use-voice";
import { useAutoVoice } from "@/hooks/use-auto-voice";
import {
  confirmBatch,
  confirmEarlyClaim,
  createPlannerState,
  getOpeningQuestion,
  next_question,
  skipCurrentQuestion,
  submitUtterance,
  type AdaptiveVerdict,
  type PlannerState,
  type SchemeEvaluation,
} from "@/lib/adaptive-planner";
import { formatClaimValue, resolveConflict, type ClaimEntry } from "@/lib/claim-ledger";
import { transcribeWithNirantarEndpoint } from "@/lib/nirantar-voice";

const LANGS = [
  ["en", "English", "en-IN"],
  ["hi", "हिन्दी", "hi-IN"],
  ["te", "తెలుగు", "te-IN"],
  ["mr", "मराठी", "mr-IN"],
  ["ta", "தமிழ்", "ta-IN"],
  ["kn", "ಕನ್ನಡ", "kn-IN"],
  ["bn", "বাংলা", "bn-IN"],
] as const;
type Lang = (typeof LANGS)[number][0];
type VoiceId = "ishita" | "ratan";
type Turn = { role: "agent" | "user"; text: string };

const VERDICT_LABEL: Record<UiLang, Record<AdaptiveVerdict, string>> = {
  en: {
    ELIGIBLE: "Eligible",
    INELIGIBLE: "Not eligible",
    UNDECIDED: "Undecided",
    CONDITIONAL: "Conditional",
  },
  hi: {
    ELIGIBLE: "पात्र",
    INELIGIBLE: "पात्र नहीं",
    UNDECIDED: "अनिश्चित",
    CONDITIONAL: "सशर्त",
  },
};

export function AdaptiveAssistant() {
  const [lang, setLang] = useState<Lang>("en");
  const ui: UiLang = lang === "hi" ? "hi" : "en";
  const [voiceId, setVoiceId] = useState<VoiceId>("ishita");
  // Hands-free auto-mic is ON by default so clicking "Talk to ARCEUS" opens mic automatically.
  const [handsFree, setHandsFree] = useState(true);
  const [readAloud, setReadAloud] = useState(true);
  const [started, setStarted] = useState(false);
  const [startTick, setStartTick] = useState(0);
  const [goalSelected, setGoalSelected] = useState(false);
  const [planner, setPlanner] = useState<PlannerState>(() => createPlannerState());
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [alert, setAlert] = useState<string | null>(null);

  const logRef = useRef<HTMLDivElement>(null);
  const handsFreeRef = useRef(true);
  handsFreeRef.current = handsFree;
  const handleRef = useRef<(text: string, confidence?: number, choice?: Choice) => void>(
    () => undefined,
  );

  const synthFn = useServerFn(synthesizeSpeech);
  const sttFn = useServerFn(transcribeSpeech);
  const locale = LANGS.find((l) => l[0] === lang)![2];

  const voice = useVoice({
    locale,
    synth: (text) => synthFn({ data: { text: text.slice(0, 1200), lang, voice: voiceId } }),
    onError: (msg) => setAlert(msg),
    onCaptured: (audio, mime) => {
      const run = async () => {
        // 1) Try configured AI4Bharat/Nirantar ASR endpoint first if present
        const nirantar = await transcribeWithNirantarEndpoint(audio, mime, lang);
        if (nirantar && !nirantar.error && nirantar.text) {
          voice.setState("ready");
          handleRef.current(nirantar.text, nirantar.confidence);
          return;
        }
        // 2) Fallback to existing Sarvam STT server function
        const r = await Promise.race([
          sttFn({ data: { audio, mime, lang } }),
          new Promise<never>((_, rej) =>
            window.setTimeout(() => rej(new Error("timeout")), 30_000),
          ),
        ]);
        voice.setState("ready");
        if (r.error) {
          setAlert("Voice recognition could not transcribe audio. You can speak again or type.");
          return;
        }
        handleRef.current(r.text, 0.9);
      };
      void run().catch(() => {
        voice.setState("ready");
        setAlert("Voice service unavailable. You can still type or tap answers.");
      });
    },
  });

  const autoVoice = useAutoVoice({
    locale,
    onFinalTranscript: (txt, conf) => handleRef.current(txt, conf),
    onFallbackListen: () => void voice.listen(),
    onError: (msg) => setAlert(msg),
    onResetVoiceState: () => voice.setState("ready"),
  });
  const { autoListening, interim } = autoVoice;

  const openMicAutomatically = useCallback(() => {
    setAlert(null);
    voice.cancel();
    autoVoice.openMic();
  }, [autoVoice, voice]);

  const stopAllVoice = useCallback(() => {
    autoVoice.stopAutoListen();
    voice.cancel();
  }, [autoVoice, voice]);

  const step = useMemo(() => next_question(planner), [planner]);

  const say = useCallback(
    async (text: string, reopenMic: boolean) => {
      setTurns((m) => [...m, { role: "agent", text }]);
      if (readAloud) {
        await autoVoice.speakBounded(voice.speak, text);
      }
      if (reopenMic && handsFreeRef.current) {
        void autoVoice.openMic();
      }
    },
    [autoVoice, readAloud, voice],
  );

  // Ask current question (or speak final summary) automatically
  const lastSig = useRef("");
  useEffect(() => {
    if (!started) return;

    if (!goalSelected) {
      const sig = `goal:${ui}:${startTick}`;
      if (sig === lastSig.current) return;
      lastSig.current = sig;
      void say(getOpeningQuestion(ui), true);
      return;
    }

    if (step.early_confirmation) {
      const c = step.early_confirmation;
      const sig = `early:${c.key}:${c.turn}:${ui}:${startTick}`;
      if (sig === lastSig.current) return;
      lastSig.current = sig;
      const valStr = formatClaimValue(c, c.key);
      const prompt =
        ui === "hi"
          ? `कृपया पुष्टि करें — क्या ${c.key} के लिए "${valStr}" सही है?`
          : `Quick check because this is close to a rule limit or uncertain: is ${valStr} right?`;
      void say(prompt, true);
      return;
    }

    if (step.question) {
      const q = step.question;
      const sig = `q:${q.kind}:${q.key ?? ""}:${q.straddle?.schemeId ?? ""}:${q.conflict?.id ?? ""}:${ui}:${startTick}`;
      if (sig === lastSig.current) return;
      lastSig.current = sig;
      void say(q.question[ui], true);
      return;
    }

    if (step.needs_batch_confirmation) {
      const sig = `batch:${planner.ledger.turn}:${ui}:${startTick}`;
      if (sig === lastSig.current) return;
      lastSig.current = sig;
      const prompt =
        ui === "hi"
          ? "मैंने आपकी सारी जानकारी नोट कर ली है। कृपया एक बार पुष्टि करें ताकि अंतिम परिणाम दिखा सकूँ।"
          : "I have noted all your details. Please review and confirm once to see your final eligibility results.";
      void say(prompt, false);
      return;
    }

    const verdicts = Object.values(step.statuses);
    const sig = `done:${verdicts.map((v) => `${v.scheme.id}:${v.verdict}`).join(",")}:${ui}:${startTick}`;
    if (sig === lastSig.current) return;
    lastSig.current = sig;
    const eligibleNames = verdicts
      .filter((v) => v.verdict === "ELIGIBLE")
      .map((v) => v.scheme.name);
    const msg =
      eligibleNames.length > 0
        ? ui === "hi"
          ? `जाँच पूरी हुई। आप इन योजनाओं के लिए पात्र दिखते हैं: ${eligibleNames.join(", ")}।`
          : `Check complete. You look eligible for: ${eligibleNames.join(", ")}.`
        : ui === "hi"
          ? "जाँच पूरी हुई। नीचे हर योजना का विस्तृत परिणाम देखें।"
          : "Check complete. Review the detailed eligibility breakdown below.";
    void say(msg, false);
  }, [goalSelected, planner.ledger.turn, say, started, startTick, step, ui]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: 1e6 });
  }, [turns]);

  const begin = useCallback(() => {
    setHandsFree(true);
    handsFreeRef.current = true;
    void autoVoice.primeMic();
    setStarted(true);
    setStartTick((t) => t + 1);
    setAlert(null);
    lastSig.current = "";
  }, [autoVoice]);

  // Listen for "Talk to ARCEUS" (`arceus:start`) and scheme quick-picks
  useEffect(() => {
    const onStart = () => {
      setHandsFree(true);
      begin();
    };
    const onPickScheme = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const s = SCHEMES.find((x) => x.id === id);
      if (!s) return;
      setPlanner(createPlannerState([s.id]));
      setGoalSelected(true);
      setTurns([{ role: "user", text: s.name }]);
      begin();
    };
    const onHash = () => {
      if (window.location.hash !== "#assistant") stopAllVoice();
    };
    window.addEventListener("arceus:start", onStart);
    window.addEventListener("arceus:scheme", onPickScheme);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("arceus:start", onStart);
      window.removeEventListener("arceus:scheme", onPickScheme);
      window.removeEventListener("hashchange", onHash);
    };
  }, [begin, stopAllVoice]);

  const handleUtterance = useCallback(
    (text: string, confidence = 0.92, choice?: Choice) => {
      const clean = text.trim().slice(0, 400);
      if (!clean) return;
      setTurns((m) => [...m, { role: "user", text: clean }]);
      setInput("");
      setAlert(null);

      // Step 0: goal / need selection (also accepts multi-field intro right away!)
      if (!goalSelected) {
        const picked = chooseNeed(
          newInterview(),
          clean,
          choice ? (choice.value as Goal) : undefined,
        );
        const schemeIds = picked ? picked.schemeIds : SCHEMES.map((s) => s.id);
        const initial = createPlannerState(schemeIds);
        // Extract any facts already volunteered in the opening sentence
        const res = submitUtterance(initial, clean, { lang: ui, confidence });
        setPlanner(res.state);
        setGoalSelected(true);
        lastSig.current = "";
        return;
      }

      // Early single-field confirmation handling
      if (step.early_confirmation) {
        const lower = clean.toLowerCase();
        const isYes = /\b(yes|yeah|correct|right|haan|han|ji)\b|हाँ|सही/.test(lower);
        const isNo = /\b(no|wrong|nahi|nahin)\b|नहीं|गलत/.test(lower);
        if (isYes || isNo) {
          setPlanner((p) => confirmEarlyClaim(p, step.early_confirmation!.key, isYes));
          lastSig.current = "";
          return;
        }
      }

      const res = submitUtterance(planner, clean, { lang: ui, confidence, currentStep: step });
      if (
        res.extracted.length === 0 &&
        res.conflicts.length === 0 &&
        step.question?.kind !== "straddle"
      ) {
        void say(
          ui === "hi"
            ? `माफ़ कीजिए, समझ नहीं आया। कृपया फिर से बोलें या नीचे विकल्प चुनें। ${step.question?.question.hi ?? ""}`
            : `Sorry, I didn't catch that. Please repeat or pick an option below. ${step.question?.question.en ?? ""}`,
          true,
        );
        return;
      }
      setPlanner(res.state);
      lastSig.current = "";
    },
    [goalSelected, planner, say, step, ui],
  );

  handleRef.current = handleUtterance;

  const resetAll = () => {
    stopAllVoice();
    setPlanner(createPlannerState());
    setGoalSelected(false);
    setTurns([]);
    setAlert(null);
    lastSig.current = "";
    setStarted(true);
  };

  const claimsList = Object.values(planner.ledger.claims).filter(
    (c): c is ClaimEntry => c !== undefined && c.value !== UNKNOWN,
  );
  const verdictsList: SchemeEvaluation[] = Object.values(step.statuses);
  const isListening = autoListening || voice.state === "listening";

  return (
    <section className="wrap page-section mx-auto assistant-v2">
      <div className="eyebrow items-center flex gap-[8px] tracking-[0.15em]">
        <span className="h-px w-[16px]" />
        ADAPTIVE SCHEME ASSISTANT
      </div>
      <h1 className="page-title">Talk to ARCEUS</h1>
      <p className="page-lead max-w-[560px]">
        Speak naturally — you can share multiple details in one sentence. ARCEUS asks the fewest
        high-impact questions, tracks ranges and contradictions, and checks official rules
        deterministically.
      </p>

      <div className="av-toolbar">
        <label>
          Language
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            aria-label="Assistant language"
          >
            {LANGS.map((l) => (
              <option key={l[0]} value={l[0]}>
                {l[1]}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="av-voices">
          <legend>Voice</legend>
          {(["ishita", "ratan"] as const).map((v) => (
            <label key={v} className={voiceId === v ? "on" : ""}>
              <input
                type="radio"
                name="voice"
                value={v}
                checked={voiceId === v}
                onChange={() => setVoiceId(v)}
              />
              {v === "ishita" ? "Ishita" : "Ratan"}
            </label>
          ))}
        </fieldset>
        <label className="av-check">
          <input
            type="checkbox"
            checked={readAloud}
            onChange={(e) => setReadAloud(e.target.checked)}
          />
          Read aloud
        </label>
        <label className="av-check">
          <input
            type="checkbox"
            checked={handsFree}
            onChange={(e) => setHandsFree(e.target.checked)}
          />
          Auto-mic (reopens automatically)
        </label>
        <button type="button" className="av-chip" onClick={resetAll}>
          <UserPlus size={16} aria-hidden />
          New person
        </button>
      </div>

      <div className="av-grid">
        <div className="av-main">
          <div className="av-status" role="status" aria-live="polite">
            <span className={`av-dot s-${isListening ? "listening" : voice.state}`} aria-hidden />
            {isListening
              ? "Listening automatically… speak now"
              : voice.state === "speaking"
                ? "Speaking…"
                : "Ready"}
            {goalSelected && (
              <small>
                {" "}
                · Asked: {step.questions_asked.length} · Skipped: {step.questions_skipped.length} ·
                Open schemes: {step.schemes_open.length}
              </small>
            )}
            {voice.needsPlay && (
              <button type="button" className="av-chip" onClick={voice.play}>
                <Play size={16} aria-hidden />
                Play
              </button>
            )}
          </div>
          {alert && (
            <p className="form-alert" role="alert">
              {alert}
            </p>
          )}
          {interim && <p className="av-muted">Hearing: “{interim}”</p>}

          {!started ? (
            <div className="av-card">
              <p className="av-q">{getOpeningQuestion(ui)}</p>
              <button type="button" className="button primary" onClick={begin}>
                <Mic size={18} aria-hidden />
                Start talking
              </button>
            </div>
          ) : !goalSelected ? (
            <div className="av-card">
              <p className="av-q">{getOpeningQuestion(ui)}</p>
              <div className="av-options">
                {GOALS.map((g) => (
                  <button
                    key={g.goal}
                    type="button"
                    className="av-opt"
                    onClick={() =>
                      handleUtterance(ui === "hi" ? g.hi : g.en, 1, {
                        value: g.goal,
                        en: g.en,
                        hi: g.hi,
                      })
                    }
                  >
                    {ui === "hi" ? g.hi : g.en}
                  </button>
                ))}
                <button
                  type="button"
                  className="av-opt"
                  onClick={() => {
                    setPlanner(createPlannerState());
                    setGoalSelected(true);
                    lastSig.current = "";
                  }}
                >
                  {ui === "hi" ? "सभी योजनाएँ जाँचें" : "Check all schemes"}
                </button>
              </div>
              <Composer
                ui={ui}
                input={input}
                setInput={setInput}
                isListening={isListening}
                onMic={() => (isListening ? stopAllVoice() : openMicAutomatically())}
                onSend={() => handleUtterance(input, 0.95)}
              />
            </div>
          ) : step.early_confirmation ? (
            <div className="av-card">
              <small className="av-muted">Confirm near-threshold / low-confidence detail</small>
              <p className="av-q">
                I recorded{" "}
                <b>
                  {step.early_confirmation.key}:{" "}
                  {formatClaimValue(step.early_confirmation, step.early_confirmation.key)}
                </b>{" "}
                (from “{step.early_confirmation.source_quote}”). Is that right?
              </p>
              <div className="av-options">
                <button
                  type="button"
                  className="av-opt"
                  onClick={() => {
                    setPlanner((p) => confirmEarlyClaim(p, step.early_confirmation!.key, true));
                    lastSig.current = "";
                  }}
                >
                  Yes, correct
                </button>
                <button
                  type="button"
                  className="av-opt"
                  onClick={() => {
                    setPlanner((p) => confirmEarlyClaim(p, step.early_confirmation!.key, false));
                    lastSig.current = "";
                  }}
                >
                  No, let me re-answer
                </button>
              </div>
            </div>
          ) : step.question ? (
            <div className="av-card">
              <p className="av-q">{step.question.question[ui]}</p>

              {step.question.kind === "conflict" && step.question.conflict ? (
                <div className="av-options">
                  <button
                    type="button"
                    className="av-opt"
                    onClick={() => {
                      setPlanner((p) => ({
                        ...p,
                        ledger: resolveConflict(p.ledger, step.question!.conflict!.id, "A"),
                      }));
                      lastSig.current = "";
                    }}
                  >
                    Use turn {step.question.conflict.claimA.turn}:{" "}
                    {step.question.conflict.claimA.label}
                  </button>
                  <button
                    type="button"
                    className="av-opt"
                    onClick={() => {
                      setPlanner((p) => ({
                        ...p,
                        ledger: resolveConflict(p.ledger, step.question!.conflict!.id, "B"),
                      }));
                      lastSig.current = "";
                    }}
                  >
                    Use turn {step.question.conflict.claimB.turn}:{" "}
                    {step.question.conflict.claimB.label}
                  </button>
                  <button
                    type="button"
                    className="av-opt ghost"
                    onClick={() => {
                      setPlanner((p) => ({
                        ...p,
                        ledger: resolveConflict(
                          p.ledger,
                          step.question!.conflict!.id,
                          "unresolved",
                        ),
                      }));
                      lastSig.current = "";
                    }}
                  >
                    Not sure — show both outcomes
                  </button>
                </div>
              ) : step.question.kind === "straddle" && step.question.straddle ? (
                <div className="av-options">
                  <button
                    type="button"
                    className="av-opt"
                    onClick={() => handleUtterance("Yes", 1)}
                  >
                    {ui === "hi" ? "हाँ" : "Yes"}
                  </button>
                  <button type="button" className="av-opt" onClick={() => handleUtterance("No", 1)}>
                    {ui === "hi" ? "नहीं" : "No"}
                  </button>
                  <button
                    type="button"
                    className="av-opt ghost"
                    onClick={() => {
                      const next = skipCurrentQuestion(planner);
                      setPlanner(next.state);
                      lastSig.current = "";
                    }}
                  >
                    <SkipForward size={15} aria-hidden />
                    {ui === "hi" ? "छोड़ें" : "Not sure"}
                  </button>
                </div>
              ) : (
                <div className="av-options">
                  {step.question.baseQuestion?.options.map((o) => (
                    <button
                      key={String(o.value)}
                      type="button"
                      className="av-opt"
                      onClick={() => handleUtterance(ui === "hi" ? o.hi : o.en, 1, o)}
                    >
                      {ui === "hi" ? o.hi : o.en}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="av-opt ghost"
                    onClick={() => {
                      const next = skipCurrentQuestion(planner);
                      setPlanner(next.state);
                      lastSig.current = "";
                    }}
                  >
                    <SkipForward size={15} aria-hidden />
                    {ui === "hi" ? "छोड़ें" : "Skip"}
                  </button>
                </div>
              )}

              <Composer
                ui={ui}
                input={input}
                setInput={setInput}
                isListening={isListening}
                onMic={() => (isListening ? stopAllVoice() : openMicAutomatically())}
                onSend={() => handleUtterance(input, 0.95)}
              />
            </div>
          ) : step.needs_batch_confirmation ? (
            <div className="av-card">
              <p className="av-q">
                {ui === "hi"
                  ? "कृपया एक बार अपने सभी विवरण की पुष्टि करें:"
                  : "Please confirm your answers once:"}
              </p>
              <ul className="av-criteria">
                {claimsList.map((c) => (
                  <li key={c.key}>
                    <b>{QUESTIONS[c.key]?.en[0] ? c.key : c.key}</b>: {formatClaimValue(c, c.key)}{" "}
                    <small>
                      (turn {c.turn}, “{c.source_quote}”)
                    </small>
                  </li>
                ))}
              </ul>
              <div className="av-options">
                <button
                  type="button"
                  className="button primary"
                  onClick={() => {
                    setPlanner((p) => confirmBatch(p));
                    lastSig.current = "";
                  }}
                >
                  <Check size={16} aria-hidden />
                  {ui === "hi" ? "सब सही है, परिणाम दिखाएँ" : "Confirm all & view results"}
                </button>
              </div>
            </div>
          ) : (
            <div className="av-results">
              <h2>{ui === "hi" ? "आपका परिणाम" : "Your adaptive eligibility results"}</h2>
              {verdictsList.map((ev) => (
                <article
                  key={ev.scheme.id}
                  className={`av-result st-${ev.verdict === "ELIGIBLE" ? "likely_eligible" : ev.verdict === "INELIGIBLE" ? "ineligible" : "needs_verification"}`}
                >
                  <header>
                    <div>
                      <small>{ev.scheme.ministry}</small>
                      <h3>{ev.scheme.name}</h3>
                      <p>{ev.scheme.benefit}</p>
                    </div>
                    <span className="av-badge">{VERDICT_LABEL[ui][ev.verdict]}</span>
                  </header>
                  {ev.decisiveReason && <p className="av-reason">{ev.decisiveReason}</p>}
                  {ev.officeVerificationNote && (
                    <p className="av-muted">
                      Office verification required: {ev.officeVerificationNote}
                    </p>
                  )}
                  {ev.verdict === "CONDITIONAL" && ev.branches && (
                    <div className="av-apply">
                      <p>
                        <GitBranch size={14} aria-hidden />{" "}
                        <b>Conditional verdict (unresolved conflict):</b>
                      </p>
                      <ol>
                        {ev.branches.map((b, i) => (
                          <li key={i}>
                            <b>If {b.assumption}</b> (turn {b.turn}: “{b.source_quote}”) →{" "}
                            <b>{VERDICT_LABEL[ui][b.verdict]}</b> — {b.reason}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <a
                      className="av-official"
                      href={ev.scheme.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Official website <ExternalLink size={13} aria-hidden />
                    </a>
                    <button
                      type="button"
                      className="av-link"
                      onClick={() =>
                        void voice.speak(`${ev.scheme.name}: ${VERDICT_LABEL[ui][ev.verdict]}`)
                      }
                    >
                      <Volume2 size={14} aria-hidden /> Read aloud
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {started && turns.length > 0 && (
            <details className="av-transcript">
              <summary>Conversation transcript</summary>
              <div ref={logRef} role="log" aria-live="off">
                {turns.map((t, i) => (
                  <p key={i} className={t.role}>
                    {t.role === "agent" ? "ARCEUS: " : "You: "}
                    {t.text}
                  </p>
                ))}
              </div>
            </details>
          )}
        </div>

        <aside className="av-side" aria-label="Claim Ledger">
          <h2>Claim Ledger</h2>
          {claimsList.length === 0 ? (
            <p className="av-muted">
              Facts, ranges, and provenance quotes appear here as you speak.
            </p>
          ) : (
            <dl>
              {claimsList.map((c) => (
                <div key={c.key}>
                  <dt>
                    {c.key} · {Math.round(c.confidence * 100)}%
                  </dt>
                  <dd>
                    {formatClaimValue(c, c.key)}
                    <br />
                    <small>
                      Turn {c.turn}: “{c.source_quote}”
                    </small>
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {goalSelected && (
            <button
              type="button"
              className="av-link"
              onClick={() => {
                setGoalSelected(false);
                lastSig.current = "";
              }}
            >
              <RotateCcw size={13} aria-hidden />
              Choose a different need
            </button>
          )}
        </aside>
      </div>
    </section>
  );
}

function Composer({
  ui,
  input,
  setInput,
  isListening,
  onMic,
  onSend,
}: {
  ui: UiLang;
  input: string;
  setInput: (v: string) => void;
  isListening: boolean;
  onMic: () => void;
  onSend: () => void;
}) {
  return (
    <form
      className="av-composer"
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
    >
      <button
        type="button"
        className={`av-mic ${isListening ? "live" : ""}`}
        onClick={onMic}
        aria-label={isListening ? "Stop listening" : "Answer by voice"}
        aria-pressed={isListening}
      >
        {isListening ? <Square size={20} aria-hidden /> : <Mic size={22} aria-hidden />}
      </button>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        maxLength={400}
        aria-label="Type your answer"
        placeholder={
          ui === "hi"
            ? "बोलें या लिखें (एक साथ कई जानकारी दे सकते हैं)…"
            : "Speak or type (multiple details ok)…"
        }
      />
      <button type="submit" className="av-send" disabled={!input.trim()} aria-label="Send">
        <Send size={19} aria-hidden />
      </button>
    </form>
  );
}
