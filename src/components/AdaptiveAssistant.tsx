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
import {
  LOCALIZED_GOAL_LABELS,
  LOCALIZED_GOAL_QUESTION,
  VOICE_LANGS,
  VOICE_SAMPLES,
  VOICE_STYLES,
  VOICE_STYLE_LIST,
  getCommonLabels,
  localizedChoiceLabel,
  localizedQuestionText,
  localizedRetryMessage,
  matchRegionalGoal,
  matchRegionalYesNo,
  styleSpokenText,
  type VoiceLang,
  type VoiceStyleId,
} from "@/lib/voice-styles";
import { getSiteStrings, useAppLanguage } from "@/lib/i18n";
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
  type PlannerState,
  type SchemeEvaluation,
} from "@/lib/adaptive-planner";
import { formatClaimValue, resolveConflict, type ClaimEntry } from "@/lib/claim-ledger";
import { transcribeWithNirantarEndpoint } from "@/lib/nirantar-voice";

const LANGS = VOICE_LANGS;
type Lang = VoiceLang;
type VoiceId = "ishita" | "ratan";
type Turn = { role: "agent" | "user"; text: string };

export function AdaptiveAssistant() {
  const [lang, setLang] = useAppLanguage();
  const ui: UiLang = lang === "hi" ? "hi" : "en";
  const a = getSiteStrings(lang).assistant;
  const [voiceId, setVoiceId] = useState<VoiceId>("ishita");
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyleId>("normal");
  const styleProfile = VOICE_STYLES[voiceStyle];
  const commonLabels = getCommonLabels(lang);
  // Hands-free auto-mic is ON by default so clicking "Talk to MiraiAi" opens mic automatically.
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
    rate: styleProfile.speechRate,
    pitch: styleProfile.speechPitch,
    speaker: voiceId,
    synth: (text) =>
      synthFn({ data: { text: text.slice(0, 1200), lang, voice: voiceId, style: voiceStyle } }),
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
    async (
      text: string,
      reopenMic: boolean,
      kind: "question" | "retry" | "result" | "confirm" = "question",
    ) => {
      const spoken = kind === "retry" ? text : styleSpokenText(text, lang, voiceStyle, kind);
      setTurns((m) => [...m, { role: "agent", text: spoken }]);
      if (readAloud) {
        await autoVoice.speakBounded(voice.speak, spoken);
      }
      if (reopenMic && handsFreeRef.current) {
        void autoVoice.openMic();
      }
    },
    [autoVoice, lang, readAloud, voice, voiceStyle],
  );

  const currentQuestionDisplay = step.question
    ? step.question.baseQuestion
      ? localizedQuestionText(step.question.baseQuestion, lang, undefined)
      : step.question.question[ui]
    : "";

  const openingDisplay =
    lang === "en" || lang === "hi" ? getOpeningQuestion(ui) : LOCALIZED_GOAL_QUESTION[lang];

  // Ask current question (or speak final summary) automatically
  const lastSig = useRef("");
  useEffect(() => {
    if (!started) return;

    if (!goalSelected) {
      const sig = `goal:${lang}:${voiceStyle}:${startTick}`;
      if (sig === lastSig.current) return;
      lastSig.current = sig;
      void say(openingDisplay, true, "question");
      return;
    }

    if (step.early_confirmation) {
      const c = step.early_confirmation;
      const sig = `early:${c.key}:${c.turn}:${lang}:${voiceStyle}:${startTick}`;
      if (sig === lastSig.current) return;
      lastSig.current = sig;
      const valStr = formatClaimValue(c, c.key);
      const prompt =
        ui === "hi"
          ? `कृपया पुष्टि करें — क्या ${c.key} के लिए "${valStr}" सही है?`
          : `Quick check because this is close to a rule limit or uncertain: is ${valStr} right?`;
      void say(prompt, true, "confirm");
      return;
    }

    if (step.question) {
      const q = step.question;
      const sig = `q:${q.kind}:${q.key ?? ""}:${q.straddle?.schemeId ?? ""}:${q.conflict?.id ?? ""}:${lang}:${voiceStyle}:${startTick}`;
      if (sig === lastSig.current) return;
      lastSig.current = sig;
      void say(currentQuestionDisplay, true, "question");
      return;
    }

    if (step.needs_batch_confirmation) {
      const sig = `batch:${planner.ledger.turn}:${lang}:${voiceStyle}:${startTick}`;
      if (sig === lastSig.current) return;
      lastSig.current = sig;
      const prompt =
        ui === "hi"
          ? "मैंने आपकी सारी जानकारी नोट कर ली है। कृपया एक बार पुष्टि करें ताकि अंतिम परिणाम दिखा सकूँ।"
          : "I have noted all your details. Please review and confirm once to see your final eligibility results.";
      void say(prompt, false, "confirm");
      return;
    }

    const verdicts = Object.values(step.statuses);
    const sig = `done:${verdicts.map((v) => `${v.scheme.id}:${v.verdict}`).join(",")}:${lang}:${voiceStyle}:${startTick}`;
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
    void say(msg, false, "result");
  }, [
    currentQuestionDisplay,
    goalSelected,
    lang,
    openingDisplay,
    planner.ledger.turn,
    say,
    started,
    startTick,
    step,
    ui,
    voiceStyle,
  ]);

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

  // Listen for "Talk to MiraiAi" (`arceus:start`) and scheme quick-picks
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
        const regGoal = !choice ? matchRegionalGoal(clean) : null;
        const picked = chooseNeed(
          newInterview(),
          clean,
          choice ? (choice.value as Goal) : (regGoal ?? undefined),
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
        const regYn = matchRegionalYesNo(clean);
        const isYes =
          regYn === true || /\b(yes|yeah|correct|right|haan|han|ji)\b|हाँ|सही/.test(lower);
        const isNo = regYn === false || /\b(no|wrong|nahi|nahin)\b|नहीं|गलत/.test(lower);
        if (isYes || isNo) {
          setPlanner((p) => confirmEarlyClaim(p, step.early_confirmation!.key, isYes));
          lastSig.current = "";
          return;
        }
      }

      const normalizedInput = (() => {
        if (choice) return choice.en;
        const regYn = matchRegionalYesNo(clean);
        if (regYn === true) return "Yes";
        if (regYn === false) return "No";
        return clean;
      })();

      const res = submitUtterance(planner, normalizedInput, {
        lang: ui,
        confidence,
        currentStep: step,
      });
      if (
        res.extracted.length === 0 &&
        res.conflicts.length === 0 &&
        step.question?.kind !== "straddle"
      ) {
        void say(localizedRetryMessage(lang, currentQuestionDisplay, voiceStyle), true, "retry");
        return;
      }
      setPlanner(res.state);
      lastSig.current = "";
    },
    [currentQuestionDisplay, goalSelected, lang, planner, say, step, ui, voiceStyle],
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
        {a.adaptiveEyebrow}
      </div>
      <h1 className="page-title">{a.title}</h1>
      <p className="page-lead max-w-[560px]">{a.adaptiveLead}</p>

      <div className="av-toolbar">
        <label>
          {a.languageLabel}
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            aria-label={a.languageLabel}
          >
            {LANGS.map((l) => (
              <option key={l[0]} value={l[0]}>
                {l[1]}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="av-voices">
          <legend>{a.voiceLabel}</legend>
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
        <fieldset className="av-voices">
          <legend>{a.voiceStyleLabel}</legend>
          {VOICE_STYLE_LIST.map((st) => (
            <label key={st.id} className={voiceStyle === st.id ? "on" : ""} title={st.description}>
              <input
                type="radio"
                name="voice-style"
                value={st.id}
                checked={voiceStyle === st.id}
                onChange={() => setVoiceStyle(st.id)}
              />
              {a.styleNames[st.id]}
            </label>
          ))}
          <button
            type="button"
            className="av-chip"
            onClick={() => void voice.speak(VOICE_SAMPLES[lang][voiceStyle])}
          >
            <Volume2 size={16} aria-hidden />
            {a.playSample}
          </button>
        </fieldset>
        <label className="av-check">
          <input
            type="checkbox"
            checked={readAloud}
            onChange={(e) => setReadAloud(e.target.checked)}
          />
          {a.readAloud}
        </label>
        <label className="av-check">
          <input
            type="checkbox"
            checked={handsFree}
            onChange={(e) => setHandsFree(e.target.checked)}
          />
          {a.autoMic}
        </label>
        <button type="button" className="av-chip" onClick={resetAll}>
          <UserPlus size={16} aria-hidden />
          {a.newPerson}
        </button>
      </div>

      <div className="av-grid">
        <div className="av-main">
          <div className="av-status" role="status" aria-live="polite">
            <span className={`av-dot s-${isListening ? "listening" : voice.state}`} aria-hidden />
            {isListening
              ? a.status.autoListening
              : voice.state === "speaking"
                ? a.status.speaking
                : a.status.ready}
            <small>
              {" "}
              · {LANGS.find((l) => l[0] === lang)![1]} · {a.styleNames[voiceStyle]} {a.styleSuffix}
            </small>
            {goalSelected && (
              <small>
                {" "}
                · {step.questions_asked.length} / {step.questions_skipped.length} /{" "}
                {step.schemes_open.length}
              </small>
            )}
            {voice.needsPlay && (
              <button type="button" className="av-chip" onClick={voice.play}>
                <Play size={16} aria-hidden />
                {a.play}
              </button>
            )}
          </div>
          {alert && (
            <p className="form-alert" role="alert">
              {alert}
            </p>
          )}
          {interim && (
            <p className="av-muted">
              {a.hearing} “{interim}”
            </p>
          )}

          {!started ? (
            <div className="av-card">
              <p className="av-q">{openingDisplay}</p>
              <button type="button" className="button primary" onClick={begin}>
                <Mic size={18} aria-hidden />
                {a.startTalking}
              </button>
            </div>
          ) : !goalSelected ? (
            <div className="av-card">
              <p className="av-q">{openingDisplay}</p>
              <div className="av-options">
                {GOALS.map((g) => (
                  <button
                    key={g.goal}
                    type="button"
                    className="av-opt"
                    onClick={() =>
                      handleUtterance(LOCALIZED_GOAL_LABELS[lang][g.goal] ?? g.en, 1, {
                        value: g.goal,
                        en: g.en,
                        hi: g.hi,
                      })
                    }
                  >
                    {LOCALIZED_GOAL_LABELS[lang][g.goal] ?? g.en}
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
                  {a.checkAllSchemes}
                </button>
              </div>
              <Composer
                placeholder={a.adaptivePlaceholder}
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
              <p className="av-q">{currentQuestionDisplay}</p>

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
                    {commonLabels.yes}
                  </button>
                  <button type="button" className="av-opt" onClick={() => handleUtterance("No", 1)}>
                    {commonLabels.no}
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
                    {commonLabels.skip}
                  </button>
                </div>
              ) : (
                <div className="av-options">
                  {step.question.baseQuestion?.options.map((o) => (
                    <button
                      key={String(o.value)}
                      type="button"
                      className="av-opt"
                      onClick={() =>
                        handleUtterance(
                          localizedChoiceLabel(o, step.question!.baseQuestion!.key, lang),
                          1,
                          o,
                        )
                      }
                    >
                      {localizedChoiceLabel(o, step.question!.baseQuestion!.key, lang)}
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
                    {commonLabels.skip}
                  </button>
                </div>
              )}

              <Composer
                placeholder={a.adaptivePlaceholder}
                input={input}
                setInput={setInput}
                isListening={isListening}
                onMic={() => (isListening ? stopAllVoice() : openMicAutomatically())}
                onSend={() => handleUtterance(input, 0.95)}
              />
            </div>
          ) : step.needs_batch_confirmation ? (
            <div className="av-card">
              <p className="av-q">{a.confirmBatchHeading}</p>
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
                  {a.confirmBatchBtn}
                </button>
              </div>
            </div>
          ) : (
            <div className="av-results">
              <h2>{a.adaptiveResultsHeading}</h2>
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
                    <span className="av-badge">{a.verdictBadge[ev.verdict]}</span>
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
                            <b>{a.verdictBadge[b.verdict]}</b> — {b.reason}
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
                      {a.officialWebsite} <ExternalLink size={13} aria-hidden />
                    </a>
                    <button
                      type="button"
                      className="av-link"
                      onClick={() =>
                        void voice.speak(`${ev.scheme.name}: ${a.verdictBadge[ev.verdict]}`)
                      }
                    >
                      <Volume2 size={14} aria-hidden /> {a.readAloud}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {started && turns.length > 0 && (
            <details className="av-transcript">
              <summary>{a.transcript}</summary>
              <div ref={logRef} role="log" aria-live="off">
                {turns.map((t, i) => (
                  <p key={i} className={t.role}>
                    {t.role === "agent" ? "MiraiAi: " : a.youPrefix}
                    {t.text}
                  </p>
                ))}
              </div>
            </details>
          )}
        </div>

        <aside className="av-side" aria-label={a.claimLedger}>
          <h2>{a.claimLedger}</h2>
          {claimsList.length === 0 ? (
            <p className="av-muted">{a.ledgerEmpty}</p>
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
              {a.chooseDifferentNeed}
            </button>
          )}
        </aside>
      </div>
    </section>
  );
}

function Composer({
  placeholder,
  input,
  setInput,
  isListening,
  onMic,
  onSend,
}: {
  placeholder: string;
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
        aria-label={placeholder}
        placeholder={placeholder}
      />
      <button type="submit" className="av-send" disabled={!input.trim()} aria-label="Send">
        <Send size={19} aria-hidden />
      </button>
    </form>
  );
}
