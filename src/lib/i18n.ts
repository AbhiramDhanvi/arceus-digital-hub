import { useEffect, useState } from "react";
import type { VoiceLang, VoiceStyleId } from "./voice-styles";
import { VOICE_LANGS } from "./voice-styles";

const LANG_EVENT = "arceus:lang";
const STORAGE_KEY = "miraiai:lang";

export const VALID_LANGS: readonly VoiceLang[] = VOICE_LANGS.map((l) => l[0]);

export function isVoiceLang(value: string): value is VoiceLang {
  return (VALID_LANGS as readonly string[]).includes(value);
}

/** Broadcasts a language change to all mounted components and persists preference locally. */
export function setAppLanguage(lang: VoiceLang) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Ignore storage quota / private mode restrictions
  }
  document.documentElement.lang = lang;
  window.dispatchEvent(new CustomEvent<VoiceLang>(LANG_EVENT, { detail: lang }));
}

/**
 * SSR-safe global language hook. Always starts with "en" on server/initial hydration
 * to prevent hydration mismatches, then syncs with localStorage and "arceus:lang" events.
 */
export function useAppLanguage(): [VoiceLang, (next: VoiceLang) => void] {
  const [lang, setLang] = useState<VoiceLang>("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && isVoiceLang(saved) && saved !== "en") {
        setLang(saved);
        document.documentElement.lang = saved;
      }
    } catch {
      // Ignore storage access errors
    }

    const onLang = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail && isVoiceLang(detail)) {
        setLang(detail);
      }
    };
    window.addEventListener(LANG_EVENT, onLang);
    return () => window.removeEventListener(LANG_EVENT, onLang);
  }, []);

  const update = (next: VoiceLang) => {
    setLang(next);
    setAppLanguage(next);
  };

  return [lang, update];
}

export interface SiteStrings {
  langNativeName: string;
  skipToContent: string;
  nav: {
    home: string;
    voiceAssistant: string;
    exploreSchemes: string;
    myWorkspace: string;
    getStarted: string;
    menu: string;
  };
  hero: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    lead: string;
    talkCta: string;
    exploreCta: string;
    sourceLine: string;
    evidenceScheme: string;
    evidenceAge: string;
    evidenceBank: string;
    evidenceTax: string;
    evidenceSource: string;
    assistantRole: string;
    askAboutScheme: string;
    seeHowItWorks: string;
  };
  valueBand: {
    languagesVoice: string;
    verifiedChecks: (n: number) => string;
    voiceAndText: string;
    wholeFamily: string;
  };
  howItWorks: {
    eyebrow: string;
    heading: string;
    quote: string;
    card2Title: string;
    card2Rule1: string;
    card2Rule2: string;
    card3Title: string;
    card3Item1: string;
    card3Item2: string;
    step1Title: string;
    step1Body: string;
    step2Title: string;
    step2Body: string;
    step3Title: string;
    step3Body: string;
    cta: string;
  };
  categories: {
    eyebrow: string;
    heading: string;
    viewAll: string;
    verifiedChecks: (n: number) => string;
    discoveryOnly: string;
    agriculture: string;
    education: string;
    healthcare: string;
    business: string;
    marriage: string;
    insurance: string;
    savings: string;
    utilities: string;
  };
  directory: {
    eyebrow: string;
    heading: (count: string | null) => string;
    note: (count: number) => string;
    searchLabel: string;
    searchPlaceholder: string;
    levelLabel: string;
    all: string;
    central: string;
    stateUt: string;
    stateShort: string;
    ministry: string;
    stateOrMinistry: string;
    loadError: string;
    loading: string;
    resultsCount: (n: number) => string;
    canCheck: string;
    showMore: (n: number) => string;
  };
  life: {
    eyebrow: string;
    heading: string;
    lead: string;
    openWorkspace: string;
    svgHousehold: string;
    svgParent: string;
    svgAdult: string;
    svgWoman: string;
    card1Title: string;
    card1Body: string;
    card2Title: string;
    card2Body: string;
    card3Title: string;
    card3Body: string;
    card4Title: string;
    card4Body: string;
    card5Title: string;
    card5Body: string;
  };
  footer: {
    tagline: string;
    visitMyScheme: string;
  };
  assistant: {
    eyebrow: string;
    adaptiveEyebrow: string;
    title: string;
    lead: string;
    adaptiveLead: string;
    languageLabel: string;
    voiceLabel: string;
    voiceStyleLabel: string;
    styleNames: Record<VoiceStyleId, string>;
    styleSuffix: string;
    playSample: string;
    readAloud: string;
    handsFree: string;
    autoMic: string;
    newPerson: string;
    status: {
      ready: string;
      listening: string;
      autoListening: string;
      transcribing: string;
      thinking: string;
      speaking: string;
      error: string;
    };
    deviceVoice: string;
    play: string;
    hearing: string;
    start: string;
    startTalking: string;
    changingEarlier: string;
    heardHint: (heard: string) => string;
    confirmPrompt: (label: string) => string;
    typePlaceholder: string;
    adaptivePlaceholder: string;
    cancelRecording: string;
    transcript: string;
    youPrefix: string;
    yourAnswers: string;
    answersEmpty: string;
    claimLedger: string;
    ledgerEmpty: string;
    change: string;
    chooseDifferentNeed: string;
    checkAllSchemes: string;
    privacyNote: string;
    rulesChecked: (n: number) => string;
    yourAnswer: string;
    documents: string;
    officialWebsite: string;
    alsoWorth: string;
    unverifiedNote: string;
    adaptiveResultsHeading: string;
    confirmBatchHeading: string;
    confirmBatchBtn: string;
    statusBadge: Record<
      "likely_eligible" | "possibly_eligible" | "ineligible" | "needs_verification",
      string
    >;
    verdictBadge: Record<"ELIGIBLE" | "INELIGIBLE" | "UNDECIDED" | "CONDITIONAL", string>;
  };
}

export const SITE_STRINGS: Record<VoiceLang, SiteStrings> = {
  en: {
    langNativeName: "English",
    skipToContent: "Skip to content",
    nav: {
      home: "Home",
      voiceAssistant: "Voice assistant",
      exploreSchemes: "Explore schemes",
      myWorkspace: "My workspace",
      getStarted: "Get started",
      menu: "Menu",
    },
    hero: {
      eyebrow: "INDIAN GOVERNMENT SCHEMES",
      titleLine1: "Your voice.",
      titleLine2: "Your benefits.",
      lead: "Find schemes for you and your family. Speak or type in English, Hindi, Telugu, Marathi, Tamil, Kannada, or Bengali to check eligibility and learn how to apply.",
      talkCta: "Talk to MiraiAi",
      exploreCta: "Explore schemes",
      sourceLine: "Guidance based on official government sources",
      evidenceScheme: "Atal Pension Yojana",
      evidenceAge: "Age 18 to 39 — you said 32",
      evidenceBank: "Savings account — yes",
      evidenceTax: "Income-tax status — confirm",
      evidenceSource: "Source: financialservices.gov.in · checked 2026-11-20",
      assistantRole: "Scheme assistant",
      askAboutScheme: "Ask about a scheme",
      seeHowItWorks: "See how it works",
    },
    valueBand: {
      languagesVoice: "7 Indian languages in voice",
      verifiedChecks: (n) => `${n} schemes checked against official sources`,
      voiceAndText: "Voice and text",
      wholeFamily: "Support for the whole family",
    },
    howItWorks: {
      eyebrow: "HOW IT WORKS",
      heading: "From a question to the next step",
      quote: "“Can my father get health cover?”",
      card2Title: "Ayushman Vay Vandana",
      card2Rule1: "Age 70 or above on Aadhaar",
      card2Rule2: "Lives in India",
      card3Title: "Prepare to apply",
      card3Item1: "Aadhaar for e-KYC",
      card3Item2: "NHA beneficiary portal",
      step1Title: "Ask in your own words",
      step1Body:
        "Tell MiraiAi what you need, such as healthcare for a parent. Speak or type in the language you prefer.",
      step2Title: "Check the rules that apply",
      step2Body:
        "Answer the few questions that affect your result. If two answers disagree, MiraiAi asks you to confirm before making a recommendation.",
      step3Title: "Apply through the official portal",
      step3Body:
        "See why you may qualify, prepare your documents, and follow the steps to the official website. Save the reference in your workspace after applying.",
      cta: "Start an eligibility check",
    },
    categories: {
      eyebrow: "SCHEME DIRECTORY",
      heading: "Explore by category",
      viewAll: "View all schemes",
      verifiedChecks: (n) => `${n} verified check${n > 1 ? "s" : ""}`,
      discoveryOnly: "Discovery links only",
      agriculture: "Agriculture",
      education: "Education",
      healthcare: "Healthcare",
      business: "Business & loans",
      marriage: "Marriage",
      insurance: "Insurance",
      savings: "Savings",
      utilities: "Utilities",
    },
    directory: {
      eyebrow: "ALL SCHEMES",
      heading: (count) => `Search ${count ?? "the"} schemes listed on myScheme`,
      note: (count) =>
        `This list is for finding schemes only — MiraiAi does not decide eligibility for these. MiraiAi has source-cited rules for ${count} schemes; the ones in this list are marked “MiraiAi can check”.`,
      searchLabel: "Search by name or topic",
      searchPlaceholder: "e.g. scholarship, pension, farmer",
      levelLabel: "Level",
      all: "All",
      central: "Central",
      stateUt: "State / UT",
      stateShort: "State",
      ministry: "Ministry",
      stateOrMinistry: "State / ministry",
      loadError: "The scheme list could not load. Try myscheme.gov.in directly.",
      loading: "Loading the list…",
      resultsCount: (n) => `${n.toLocaleString("en-IN")} result${n === 1 ? "" : "s"}`,
      canCheck: "MiraiAi can check",
      showMore: (n) => `Show ${n} more`,
    },
    life: {
      eyebrow: "FAMILY PLANNING",
      heading: "Planning a life event?",
      lead: "Check benefits for family members and keep their application records and reminders together.",
      openWorkspace: "Open my workspace",
      svgHousehold: "Household",
      svgParent: "Parent 70+",
      svgAdult: "Adult",
      svgWoman: "Woman",
      card1Title: "Starting a business",
      card1Body: "Explore working capital and microenterprise loans.",
      card2Title: "Preparing for marriage",
      card2Body: "Find state marriage assistance on official portals.",
      card3Title: "Continuing school",
      card3Body: "Check scholarship screening criteria and selection steps.",
      card4Title: "Welcoming a daughter",
      card4Body: "Explore a savings account for your daughter’s future.",
      card5Title: "Turning 70",
      card5Body: "Check senior healthcare eligibility and enrolment steps.",
    },
    footer: {
      tagline: "Independent scheme guidance for citizens.",
      visitMyScheme: "Visit myScheme",
    },
    assistant: {
      eyebrow: "YOUR SCHEME ASSISTANT",
      adaptiveEyebrow: "ADAPTIVE SCHEME ASSISTANT",
      title: "Talk to MiraiAi",
      lead: "Tell MiraiAi what you need. It asks only the questions that decide the official rules, and shows the exact rule and source behind every answer.",
      adaptiveLead:
        "Speak naturally — you can share multiple details in one sentence. MiraiAi asks the fewest high-impact questions, tracks ranges and contradictions, and checks official rules deterministically.",
      languageLabel: "Language",
      voiceLabel: "Voice",
      voiceStyleLabel: "Voice style",
      styleNames: { normal: "Normal", funny: "Funny", interactive: "Interactive" },
      styleSuffix: "style",
      playSample: "Play voice sample",
      readAloud: "Read aloud",
      handsFree: "Hands-free (mic reopens after each question)",
      autoMic: "Auto-mic (reopens automatically)",
      newPerson: "New person",
      status: {
        ready: "Ready",
        listening: "Listening… speak now",
        autoListening: "Listening automatically… speak now",
        transcribing: "Transcribing…",
        thinking: "Checking…",
        speaking: "Speaking…",
        error: "Something needs attention",
      },
      deviceVoice: "device voice",
      play: "Play",
      hearing: "Hearing:",
      start: "Start",
      startTalking: "Start talking",
      changingEarlier: "Changing an earlier answer",
      heardHint: (h) => `I heard: “${h}” — edit below and send, or tap an answer.`,
      confirmPrompt: (label) => `I understood: ${label}. Is that right?`,
      typePlaceholder: "Type your answer…",
      adaptivePlaceholder: "Speak or type (multiple details ok)…",
      cancelRecording: "Cancel recording",
      transcript: "Conversation transcript",
      youPrefix: "You: ",
      yourAnswers: "Your answers",
      answersEmpty: "Answers appear here. You can change any of them.",
      claimLedger: "Claim Ledger",
      ledgerEmpty: "Facts, ranges, and provenance quotes appear here as you speak.",
      change: "Change",
      chooseDifferentNeed: "Choose a different need",
      checkAllSchemes: "Check all schemes",
      privacyNote:
        "Never share Aadhaar, bank or phone numbers here. Results are guidance, not an application. Voice audio and transcripts are not stored.",
      rulesChecked: (n) => `Rules checked (${n})`,
      yourAnswer: "Your answer:",
      documents: "Documents:",
      officialWebsite: "Official website",
      alsoWorth: "Also worth looking at (not checked by MiraiAi):",
      unverifiedNote:
        "MiraiAi could not retrieve this scheme's official guideline on the check date, so it never shows “likely eligible” — confirm on the official site.",
      adaptiveResultsHeading: "Your adaptive eligibility results",
      confirmBatchHeading: "Please confirm your answers once:",
      confirmBatchBtn: "Confirm all & view results",
      statusBadge: {
        likely_eligible: "Likely eligible",
        possibly_eligible: "May qualify — confirm",
        ineligible: "Does not match",
        needs_verification: "Needs verification",
      },
      verdictBadge: {
        ELIGIBLE: "Eligible",
        INELIGIBLE: "Not eligible",
        UNDECIDED: "Undecided",
        CONDITIONAL: "Conditional",
      },
    },
  },

  hi: {
    langNativeName: "हिन्दी",
    skipToContent: "मुख्य सामग्री पर जाएँ",
    nav: {
      home: "होम",
      voiceAssistant: "वॉइस असिस्टेंट",
      exploreSchemes: "योजनाएँ देखें",
      myWorkspace: "मेरा वर्कस्पेस",
      getStarted: "शुरू करें",
      menu: "मेनू",
    },
    hero: {
      eyebrow: "भारतीय सरकारी योजनाएँ",
      titleLine1: "आपकी आवाज़।",
      titleLine2: "आपके लाभ।",
      lead: "अपने और अपने परिवार के लिए योजनाएँ खोजें। अंग्रेज़ी, हिन्दी, तेलुगु, मराठी, तमिल, कन्नड़ या बांग्ला में बोलें या लिखें और पात्रता व आवेदन प्रक्रिया जानें।",
      talkCta: "MiraiAi से बात करें",
      exploreCta: "योजनाएँ देखें",
      sourceLine: "आधिकारिक सरकारी स्रोतों पर आधारित मार्गदर्शन",
      evidenceScheme: "अटल पेंशन योजना",
      evidenceAge: "आयु 18 से 39 — आपने 32 बताया",
      evidenceBank: "बचत खाता — हाँ",
      evidenceTax: "आयकर स्थिति — पुष्टि करें",
      evidenceSource: "स्रोत: financialservices.gov.in · जाँच 2026-11-20",
      assistantRole: "योजना सहायक",
      askAboutScheme: "किसी योजना के बारे में पूछें",
      seeHowItWorks: "देखें यह कैसे काम करता है",
    },
    valueBand: {
      languagesVoice: "7 भारतीय भाषाओं में आवाज़",
      verifiedChecks: (n) => `${n} योजनाएँ आधिकारिक स्रोतों से जाँची गईं`,
      voiceAndText: "आवाज़ और टेक्स्ट",
      wholeFamily: "पूरे परिवार के लिए सहायता",
    },
    howItWorks: {
      eyebrow: "यह कैसे काम करता है",
      heading: "एक सवाल से अगले कदम तक",
      quote: "“क्या मेरे पिता को स्वास्थ्य बीमा मिल सकता है?”",
      card2Title: "आयुष्मान वय वंदना",
      card2Rule1: "आधार पर आयु 70 वर्ष या अधिक",
      card2Rule2: "भारत के निवासी",
      card3Title: "आवेदन की तैयारी",
      card3Item1: "ई-केवाईसी के लिए आधार",
      card3Item2: "NHA लाभार्थी पोर्टल",
      step1Title: "अपने शब्दों में पूछें",
      step1Body:
        "MiraiAi को बताएँ आपको क्या चाहिए, जैसे माता-पिता का इलाज। अपनी पसंदीदा भाषा में बोलें या लिखें।",
      step2Title: "लागू नियम जाँचें",
      step2Body:
        "केवल वही जरूरी सवालों के जवाब दें जो परिणाम तय करते हैं। यदि दो जवाब मेल न खाएँ, तो MiraiAi पहले आपसे पुष्टि करता है।",
      step3Title: "आधिकारिक पोर्टल से आवेदन करें",
      step3Body:
        "जानें आप पात्र क्यों हो सकते हैं, दस्तावेज़ तैयार करें और आधिकारिक वेबसाइट के चरणों का पालन करें। आवेदन के बाद संदर्भ अपने वर्कस्पेस में सहेजें।",
      cta: "पात्रता जाँच शुरू करें",
    },
    categories: {
      eyebrow: "योजना निर्देशिका",
      heading: "श्रेणी के अनुसार खोजें",
      viewAll: "सभी योजनाएँ देखें",
      verifiedChecks: (n) => `${n} सत्यापित जाँच`,
      discoveryOnly: "केवल जानकारी लिंक",
      agriculture: "कृषि",
      education: "शिक्षा",
      healthcare: "स्वास्थ्य सेवा",
      business: "व्यापार और ऋण",
      marriage: "विवाह",
      insurance: "बीमा",
      savings: "बचत",
      utilities: "सुविधाएँ",
    },
    directory: {
      eyebrow: "सभी योजनाएँ",
      heading: (count) => `myScheme पर सूचीबद्ध ${count ?? "सभी"} योजनाएँ खोजें`,
      note: (count) =>
        `यह सूची केवल योजनाएँ खोजने के लिए है — MiraiAi इन पर पात्रता तय नहीं करता। MiraiAi के पास ${count} योजनाओं के आधिकारिक नियम हैं; इस सूची में उन पर “MiraiAi जाँच सकता है” लिखा है।`,
      searchLabel: "नाम या विषय से खोजें",
      searchPlaceholder: "जैसे छात्रवृत्ति, पेंशन, किसान",
      levelLabel: "स्तर",
      all: "सभी",
      central: "केंद्र",
      stateUt: "राज्य / केंद्रशासित",
      stateShort: "राज्य",
      ministry: "मंत्रालय",
      stateOrMinistry: "राज्य / मंत्रालय",
      loadError: "योजना सूची लोड नहीं हो सकी। सीधे myscheme.gov.in पर जाएँ।",
      loading: "सूची लोड हो रही है…",
      resultsCount: (n) => `${n.toLocaleString("en-IN")} परिणाम`,
      canCheck: "MiraiAi जाँच सकता है",
      showMore: (n) => `${n} और दिखाएँ`,
    },
    life: {
      eyebrow: "परिवार नियोजन",
      heading: "जीवन के बड़े पड़ाव की तैयारी?",
      lead: "परिवार के सदस्यों के लाभ जाँचें और उनके आवेदन रिकॉर्ड व रिमाइंडर एक साथ रखें।",
      openWorkspace: "मेरा वर्कस्पेस खोलें",
      svgHousehold: "परिवार",
      svgParent: "अभिभावक 70+",
      svgAdult: "वयस्क",
      svgWoman: "महिला",
      card1Title: "नया व्यवसाय शुरू करना",
      card1Body: "कार्यशील पूँजी और सूक्ष्म उद्यम ऋण देखें।",
      card2Title: "विवाह की तैयारी",
      card2Body: "आधिकारिक पोर्टल पर राज्य विवाह सहायता खोजें।",
      card3Title: "पढ़ाई जारी रखना",
      card3Body: "छात्रवृत्ति की पात्रता शर्तें और चयन प्रक्रिया जाँचें।",
      card4Title: "बेटी का स्वागत",
      card4Body: "बेटी के भविष्य के लिए बचत खाता योजना जानें।",
      card5Title: "70 वर्ष की आयु",
      card5Body: "वरिष्ठ नागरिक स्वास्थ्य बीमा पात्रता और नामांकन चरण देखें।",
    },
    footer: {
      tagline: "नागरिकों के लिए स्वतंत्र योजना मार्गदर्शन।",
      visitMyScheme: "myScheme पर जाएँ",
    },
    assistant: {
      eyebrow: "आपका योजना सहायक",
      adaptiveEyebrow: "स्मार्ट योजना सहायक",
      title: "MiraiAi से बात करें",
      lead: "MiraiAi को बताएँ आपको क्या चाहिए। यह केवल वही सवाल पूछता है जो आधिकारिक नियम तय करते हैं, और हर जवाब के पीछे सही नियम व स्रोत दिखाता है।",
      adaptiveLead:
        "स्वाभाविक रूप से बोलें — आप एक वाक्य में कई जानकारी दे सकते हैं। MiraiAi सबसे कम ज़रूरी सवाल पूछता है और आधिकारिक नियमों की सटीक जाँच करता है।",
      languageLabel: "भाषा",
      voiceLabel: "आवाज़",
      voiceStyleLabel: "आवाज़ की शैली",
      styleNames: { normal: "सामान्य", funny: "मज़ेदार", interactive: "संवादात्मक" },
      styleSuffix: "शैली",
      playSample: "आवाज़ का नमूना सुनें",
      readAloud: "बोलकर सुनाएँ",
      handsFree: "हैंड्स-फ़्री (हर सवाल के बाद माइक अपने-आप खुलेगा)",
      autoMic: "ऑटो-माइक (अपने-आप खुलता है)",
      newPerson: "नया व्यक्ति",
      status: {
        ready: "तैयार",
        listening: "सुन रहे हैं… अब बोलें",
        autoListening: "अपने-आप सुन रहे हैं… अब बोलें",
        transcribing: "लिखा जा रहा है…",
        thinking: "जाँच रहे हैं…",
        speaking: "बोल रहे हैं…",
        error: "कृपया ध्यान दें",
      },
      deviceVoice: "डिवाइस आवाज़",
      play: "चलाएँ",
      hearing: "सुना जा रहा है:",
      start: "शुरू करें",
      startTalking: "बातचीत शुरू करें",
      changingEarlier: "पुराना उत्तर बदल रहे हैं",
      heardHint: (h) => `मैंने सुना: “${h}” — नीचे सुधारकर भेजें, या कोई विकल्प चुनें।`,
      confirmPrompt: (label) => `मैंने समझा: ${label}। क्या यह सही है?`,
      typePlaceholder: "अपना जवाब लिखें…",
      adaptivePlaceholder: "बोलें या लिखें (एक साथ कई जानकारी दे सकते हैं)…",
      cancelRecording: "रिकॉर्डिंग रद्द करें",
      transcript: "बातचीत का विवरण",
      youPrefix: "आप: ",
      yourAnswers: "आपके उत्तर",
      answersEmpty: "आपके उत्तर यहाँ दिखेंगे। आप किसी भी उत्तर को बदल सकते हैं।",
      claimLedger: "तथ्य रजिस्टर",
      ledgerEmpty: "आपके बोले गए तथ्य, सीमाएँ और संदर्भ यहाँ दिखेंगे।",
      change: "बदलें",
      chooseDifferentNeed: "दूसरी आवश्यकता चुनें",
      checkAllSchemes: "सभी योजनाएँ जाँचें",
      privacyNote:
        "यहाँ आधार, बैंक या फ़ोन नंबर कभी न दें। परिणाम केवल मार्गदर्शन हैं, आवेदन नहीं। ऑडियो और ट्रांसक्रिप्ट सहेजे नहीं जाते।",
      rulesChecked: (n) => `जाँचे गए नियम (${n})`,
      yourAnswer: "आपका उत्तर:",
      documents: "दस्तावेज़:",
      officialWebsite: "आधिकारिक वेबसाइट",
      alsoWorth: "इन्हें भी देखें (MiraiAi द्वारा जाँचे नहीं गए):",
      unverifiedNote:
        "MiraiAi जाँच की तारीख पर इस योजना की आधिकारिक मार्गदर्शिका प्राप्त नहीं कर सका — कृपया आधिकारिक वेबसाइट पर पुष्टि करें।",
      adaptiveResultsHeading: "आपका स्मार्ट पात्रता परिणाम",
      confirmBatchHeading: "कृपया एक बार अपने सभी विवरण की पुष्टि करें:",
      confirmBatchBtn: "सब सही है, परिणाम दिखाएँ",
      statusBadge: {
        likely_eligible: "पात्र होने की संभावना",
        possibly_eligible: "पात्र हो सकते हैं — पुष्टि करें",
        ineligible: "पात्र नहीं",
        needs_verification: "सत्यापन आवश्यक",
      },
      verdictBadge: {
        ELIGIBLE: "पात्र",
        INELIGIBLE: "पात्र नहीं",
        UNDECIDED: "अनिश्चित",
        CONDITIONAL: "सशर्त",
      },
    },
  },

  te: {
    langNativeName: "తెలుగు",
    skipToContent: "ప్రధాన విషయానికి వెళ్ళండి",
    nav: {
      home: "హోమ్",
      voiceAssistant: "వాయిస్ అసిస్టెంట్",
      exploreSchemes: "పథకాలు చూడండి",
      myWorkspace: "నా వర్క్‌స్పేస్",
      getStarted: "ప్రారంభించండి",
      menu: "మెనూ",
    },
    hero: {
      eyebrow: "భారత ప్రభుత్వ పథకాలు",
      titleLine1: "మీ గొంతు.",
      titleLine2: "మీ ప్రయోజనాలు.",
      lead: "మీకు మరియు మీ కుటుంబానికి సరిపోయే పథకాలను కనుగొనండి. తెలుగు, హిందీ, ఇంగ్లీష్, మరాఠీ, తమిళం, కన్నడ లేదా బెంగాలీలో మాట్లాడి లేదా టైప్ చేసి అర్హతను తనిఖీ చేయండి.",
      talkCta: "MiraiAi తో మాట్లాడండి",
      exploreCta: "పథకాలు చూడండి",
      sourceLine: "అధికారిక ప్రభుత్వ ఆధారాలతో మార్గదర్శకం",
      evidenceScheme: "అటల్ పెన్షన్ యోజన",
      evidenceAge: "వయస్సు 18 నుండి 39 — మీరు 32 చెప్పారు",
      evidenceBank: "సేవింగ్స్ ఖాతా — అవును",
      evidenceTax: "ఆదాయపు పన్ను స్థితి — నిర్ధారించండి",
      evidenceSource: "మూలం: financialservices.gov.in · తనిఖీ 2026-11-20",
      assistantRole: "పథకాల సహాయకుడు",
      askAboutScheme: "పథకం గురించి అడగండి",
      seeHowItWorks: "ఇది ఎలా పనిచేస్తుందో చూడండి",
    },
    valueBand: {
      languagesVoice: "7 భారతీయ భాషలలో వాయిస్",
      verifiedChecks: (n) => `${n} పథకాలు అధికారిక నియమాలతో తనిఖీ`,
      voiceAndText: "వాయిస్ మరియు టెక్స్ట్",
      wholeFamily: "మొత్తం కుటుంబానికి సహాయం",
    },
    howItWorks: {
      eyebrow: "ఇది ఎలా పనిచేస్తుంది",
      heading: "ఒక ప్రశ్న నుండి తదుపరి అడుగు వరకు",
      quote: "“మా నాన్నకు ఆరోగ్య బీమా లభిస్తుందా?”",
      card2Title: "ఆయుష్మాన్ వయ్ వందన",
      card2Rule1: "ఆధార్ ప్రకారం 70 ఏళ్లు లేదా అంతకంటే ఎక్కువ",
      card2Rule2: "భారతదేశంలో నివసిస్తున్నారు",
      card3Title: "దరఖాస్తుకు సిద్ధమవ్వండి",
      card3Item1: "e-KYC కోసం ఆధార్",
      card3Item2: "NHA లబ్ధిదారుల పోర్టల్",
      step1Title: "మీ స్వంత మాటల్లో అడగండి",
      step1Body: "తల్లిదండ్రుల ఆరోగ్య బీమా వంటి మీ అవసరాన్ని MiraiAi కి చెప్పండి. మీకు నచ్చిన భాషలో మాట్లాడండి లేదా టైప్ చేయండి.",
      step2Title: "వర్తించే నియమాలను తనిఖీ చేయండి",
      step2Body:
        "మీ ఫలితాన్ని నిర్ణయించే కొన్ని ప్రశ్నలకు మాత్రమే సమాధానం ఇవ్వండి. రెండు సమాధానాలు విభేదిస్తే MiraiAi ముందుగా మిమ్మల్ని నిర్ధారించుకుంటుంది.",
      step3Title: "అధికారిక పోర్టల్ ద్వారా దరఖాస్తు చేయండి",
      step3Body: "మీరు ఎందుకు అర్హులో తెలుసుకోండి, పత్రాలను సిద్ధం చేసుకోండి మరియు అధికారిక వెబ్‌సైట్ దశలను అనుసరించండి.",
      cta: "అర్హత తనిఖీ ప్రారంభించండి",
    },
    categories: {
      eyebrow: "పథకాల డైరెక్టరీ",
      heading: "విభాగం వారీగా చూడండి",
      viewAll: "అన్ని పథకాలు చూడండి",
      verifiedChecks: (n) => `${n} ధృవీకరించిన తనిఖీలు`,
      discoveryOnly: "సమాచార లింకులు మాత్రమే",
      agriculture: "వ్యవసాయం",
      education: "విద్య",
      healthcare: "ఆరోగ్య సంరక్షణ",
      business: "వ్యాపారం & రుణాలు",
      marriage: "వివాహం",
      insurance: "బీమా",
      savings: "పొదుపు",
      utilities: "గృహ సదుపాయాలు",
    },
    directory: {
      eyebrow: "అన్ని పథకాలు",
      heading: (count) => `myScheme లోని ${count ?? "అన్ని"} పథకాలను వెతకండి`,
      note: (count) =>
        `ఈ జాబితా పథకాలను కనుగొనడానికి మాత్రమే. MiraiAi వద్ద ${count} పథకాలకు అధికారిక నియమాలు ఉన్నాయి; ఈ జాబితాలో వాటిపై “MiraiAi తనిఖీ చేయగలదు” అని ఉంటుంది.`,
      searchLabel: "పేరు లేదా అంశంతో వెతకండి",
      searchPlaceholder: "ఉదా. స్కాలర్‌షిప్, పెన్షన్, రైతు",
      levelLabel: "స్థాయి",
      all: "అన్నీ",
      central: "కేంద్రం",
      stateUt: "రాష్ట్రం / UT",
      stateShort: "రాష్ట్రం",
      ministry: "మంత్రిత్వ శాఖ",
      stateOrMinistry: "రాష్ట్రం / మంత్రిత్వ శాఖ",
      loadError: "పథకాల జాబితా లోడ్ కాలేదు. నేరుగా myscheme.gov.in చూడండి.",
      loading: "జాబితా లోడ్ అవుతోంది…",
      resultsCount: (n) => `${n.toLocaleString("en-IN")} ఫలితాలు`,
      canCheck: "MiraiAi తనిఖీ చేయగలదు",
      showMore: (n) => `మరో ${n} చూపించు`,
    },
    life: {
      eyebrow: "కుటుంబ ప్రణాళిక",
      heading: "జీవితంలో ముఖ్య ఘట్టానికి సిద్ధమవుతున్నారా?",
      lead: "కుటుంబ సభ్యుల ప్రయోజనాలను తనిఖీ చేయండి మరియు వారి దరఖాస్తు వివరాలను ఒకే చోట ఉంచండి.",
      openWorkspace: "నా వర్క్‌స్పేస్ తెరవండి",
      svgHousehold: "కుటుంబం",
      svgParent: "తల్లిదండ్రులు 70+",
      svgAdult: "వయోజనులు",
      svgWoman: "మహిళ",
      card1Title: "వ్యాపారం ప్రారంభించడం",
      card1Body: "వర్కింగ్ క్యాపిటల్ మరియు చిన్న వ్యాపార రుణాలను చూడండి.",
      card2Title: "వివాహ సన్నాహాలు",
      card2Body: "అధికారిక పోర్టళ్లలో రాష్ట్ర వివాహ సహాయ పథకాలను కనుగొనండి.",
      card3Title: "చదువు కొనసాగించడం",
      card3Body: "స్కాలర్‌షిప్ అర్హత నియమాలు మరియు ఎంపిక దశలను తనిఖీ చేయండి.",
      card4Title: "కూతురి భవిష్యత్తు",
      card4Body: "మీ కూతురి భవిష్యత్తు కోసం పొదుపు ఖాతాను తెలుసుకోండి.",
      card5Title: "70 ఏళ్లు నిండడం",
      card5Body: "సీనియర్ ఆరోగ్య బీమా అర్హత మరియు నమోదు దశలను చూడండి.",
    },
    footer: {
      tagline: "పౌరుల కోసం స్వతంత్ర పథకాల మార్గదర్శకం.",
      visitMyScheme: "myScheme సందర్శించండి",
    },
    assistant: {
      eyebrow: "మీ పథకాల సహాయకుడు",
      adaptiveEyebrow: "స్మార్ట్ పథకాల సహాయకుడు",
      title: "MiraiAi తో మాట్లాడండి",
      lead: "మీకు ఏ సహాయం కావాలో MiraiAi కి చెప్పండి. అధికారిక నియమాలను నిర్ణయించే ప్రశ్నలను మాత్రమే అడిగి, ప్రతి సమాధానం వెనుక ఉన్న నియమం మరియు మూలాన్ని చూపిస్తుంది.",
      adaptiveLead:
        "సహజంగా మాట్లాడండి — ఒకే వాక్యంలో అనేక వివరాలు చెప్పవచ్చు. MiraiAi తక్కువ ప్రశ్నలతో అధికారిక నియమాలను ఖచ్చితంగా తనిఖీ చేస్తుంది.",
      languageLabel: "భాష",
      voiceLabel: "గొంతు",
      voiceStyleLabel: "వాయిస్ శైలి",
      styleNames: { normal: "సాధారణం", funny: "సరదా", interactive: "సంభాషణ" },
      styleSuffix: "శైలి",
      playSample: "వాయిస్ నమూనా వినండి",
      readAloud: "బిగ్గరగా చదువు",
      handsFree: "హ్యాండ్స్-ఫ్రీ (ప్రతి ప్రశ్న తర్వాత మైక్ తెరుచుకుంటుంది)",
      autoMic: "ఆటో-మైక్ (స్వయంచాలకంగా తెరుచుకుంటుంది)",
      newPerson: "కొత్త వ్యక్తి",
      status: {
        ready: "సిద్ధంగా ఉంది",
        listening: "వింటున్నాను… ఇప్పుడు మాట్లాడండి",
        autoListening: "స్వయంచాలకంగా వింటున్నాను… మాట్లాడండి",
        transcribing: "రాస్తున్నాము…",
        thinking: "తనిఖీ చేస్తున్నాము…",
        speaking: "మాట్లాడుతున్నాము…",
        error: "దయచేసి గమనించండి",
      },
      deviceVoice: "డివైస్ వాయిస్",
      play: "ప్లే",
      hearing: "వినిపిస్తోంది:",
      start: "ప్రారంభించండి",
      startTalking: "మాట్లాడటం ప్రారంభించండి",
      changingEarlier: "మునుపటి సమాధానాన్ని మారుస్తున్నారు",
      heardHint: (h) => `నేను విన్నది: “${h}” — కింద సరిచేసి పంపండి లేదా ఎంపికను ఎంచుకోండి.`,
      confirmPrompt: (label) => `నేను అర్థం చేసుకున్నది: ${label}. ఇది సరైనదేనా?`,
      typePlaceholder: "మీ సమాధానం టైప్ చేయండి…",
      adaptivePlaceholder: "మాట్లాడండి లేదా టైప్ చేయండి (అనేక వివరాలు చెప్పవచ్చు)…",
      cancelRecording: "రికార్డింగ్ రద్దు చేయండి",
      transcript: "సంభాషణ వివరాలు",
      youPrefix: "మీరు: ",
      yourAnswers: "మీ సమాధానాలు",
      answersEmpty: "మీ సమాధానాలు ఇక్కడ కనిపిస్తాయి. మీరు ఏదైనా మార్చుకోవచ్చు.",
      claimLedger: "వివరాల పట్టిక",
      ledgerEmpty: "మీరు చెప్పిన వివరాలు ఇక్కడ నమోదవుతాయి.",
      change: "మార్చు",
      chooseDifferentNeed: "వేరే అవసరాన్ని ఎంచుకోండి",
      checkAllSchemes: "అన్ని పథకాలు తనిఖీ చేయండి",
      privacyNote:
        "ఇక్కడ ఆధార్, బ్యాంక్ లేదా ఫోన్ నంబర్లు ఎప్పుడూ చెప్పకండి. ఫలితాలు మార్గదర్శకం మాత్రమే. వాయిస్ ఆడియో నిల్వ చేయబడదు.",
      rulesChecked: (n) => `తనిఖీ చేసిన నియమాలు (${n})`,
      yourAnswer: "మీ సమాధానం:",
      documents: "పత్రాలు:",
      officialWebsite: "అధికారిక వెబ్‌సైట్",
      alsoWorth: "ఇవి కూడా చూడండి (MiraiAi తనిఖీ చేయలేదు):",
      unverifiedNote: "తనిఖీ తేదీన అధికారిక మార్గదర్శకాలు అందుబాటులో లేవు — దయచేసి అధికారిక వెబ్‌సైట్‌లో నిర్ధారించుకోండి.",
      adaptiveResultsHeading: "మీ స్మార్ట్ అర్హత ఫలితాలు",
      confirmBatchHeading: "దయచేసి మీ వివరాలను ఒకసారి నిర్ధారించండి:",
      confirmBatchBtn: "అన్నీ సరైనవే, ఫలితాలు చూపించు",
      statusBadge: {
        likely_eligible: "అర్హులయ్యే అవకాశం ఉంది",
        possibly_eligible: "అర్హులు కావచ్చు — నిర్ధారించండి",
        ineligible: "అర్హత లేదు",
        needs_verification: "ధృవీకరణ అవసరం",
      },
      verdictBadge: {
        ELIGIBLE: "అర్హులు",
        INELIGIBLE: "అర్హత లేదు",
        UNDECIDED: "నిర్ణయించబడలేదు",
        CONDITIONAL: "షరతులతో",
      },
    },
  },

  mr: {
    langNativeName: "मराठी",
    skipToContent: "मुख्य मजकुरावर जा",
    nav: {
      home: "मुख्यपृष्ठ",
      voiceAssistant: "व्हॉइस सहाय्यक",
      exploreSchemes: "योजना पहा",
      myWorkspace: "माझे वर्कस्पेस",
      getStarted: "सुरू करा",
      menu: "मेनू",
    },
    hero: {
      eyebrow: "भारतीय सरकारी योजना",
      titleLine1: "तुमचा आवाज.",
      titleLine2: "तुमचे लाभ.",
      lead: "तुमच्या आणि तुमच्या कुटुंबासाठी योजना शोधा. मराठी, हिंदी, इंग्रजी, तेलुगू, तमिळ, कन्नड किंवा बंगालीमध्ये बोला किंवा टाइप करा आणि पात्रता व अर्ज प्रक्रिया जाणून घ्या.",
      talkCta: "MiraiAi शी बोला",
      exploreCta: "योजना पहा",
      sourceLine: "अधिकृत सरकारी स्रोतांवर आधारित मार्गदर्शन",
      evidenceScheme: "अटल पेन्शन योजना",
      evidenceAge: "वय 18 ते 39 — तुम्ही 32 सांगितले",
      evidenceBank: "बचत खाते — होय",
      evidenceTax: "आयकर स्थिती — खात्री करा",
      evidenceSource: "स्रोत: financialservices.gov.in · तपासणी 2026-11-20",
      assistantRole: "योजना सहाय्यक",
      askAboutScheme: "एखाद्या योजनेबद्दल विचारा",
      seeHowItWorks: "हे कसे कार्य करते पहा",
    },
    valueBand: {
      languagesVoice: "7 भारतीय भाषांमध्ये आवाज",
      verifiedChecks: (n) => `${n} योजना अधिकृत नियमांनुसार तपासल्या`,
      voiceAndText: "आवाज आणि मजकूर",
      wholeFamily: "संपूर्ण कुटुंबासाठी मदत",
    },
    howItWorks: {
      eyebrow: "हे कसे कार्य करते",
      heading: "एका प्रश्नापासून पुढच्या टप्प्यापर्यंत",
      quote: "“माझ्या वडिलांना आरोग्य विमा मिळू शकतो का?”",
      card2Title: "आयुष्मान वय वंदना",
      card2Rule1: "आधारनुसार वय 70 वर्षे किंवा अधिक",
      card2Rule2: "भारताचे रहिवासी",
      card3Title: "अर्जाची तयारी करा",
      card3Item1: "ई-केवायसीसाठी आधार",
      card3Item2: "NHA लाभार्थी पोर्टल",
      step1Title: "तुमच्या शब्दांत विचारा",
      step1Body:
        "MiraiAi ला तुम्हाला काय हवे ते सांगा, जसे पालकांसाठी आरोग्य विमा. तुमच्या आवडत्या भाषेत बोला किंवा लिहा.",
      step2Title: "लागू नियम तपासा",
      step2Body:
        "निकाल ठरवणाऱ्या काही निवडक प्रश्नांची उत्तरे द्या. दोन उत्तरे वेगळी असल्यास MiraiAi आधी तुमची खात्री करून घेते.",
      step3Title: "अधिकृत पोर्टलवरून अर्ज करा",
      step3Body: "तुम्ही का पात्र ठरू शकता ते पहा, कागदपत्रे तयार ठेवा आणि अधिकृत वेबसाइटवरील टप्पे पूर्ण करा.",
      cta: "पात्रता तपासणी सुरू करा",
    },
    categories: {
      eyebrow: "योजना निर्देशिका",
      heading: "श्रेणीनुसार शोधा",
      viewAll: "सर्व योजना पहा",
      verifiedChecks: (n) => `${n} सत्यापित तपासण्या`,
      discoveryOnly: "केवळ माहिती दुवे",
      agriculture: "शेती",
      education: "शिक्षण",
      healthcare: "आरोग्य सेवा",
      business: "व्यवसाय व कर्ज",
      marriage: "विवाह",
      insurance: "विमा",
      savings: "बचत",
      utilities: "सुविधा",
    },
    directory: {
      eyebrow: "सर्व योजना",
      heading: (count) => `myScheme वरील ${count ?? "सर्व"} योजना शोधा`,
      note: (count) =>
        `ही यादी केवळ योजना शोधण्यासाठी आहे. MiraiAi कडे ${count} योजनांचे अधिकृत नियम आहेत; या यादीत त्यांवर “MiraiAi तपासू शकते” असे लिहिले आहे.`,
      searchLabel: "नाव किंवा विषयानुसार शोधा",
      searchPlaceholder: "उदा. शिष्यवृत्ती, पेन्शन, शेतकरी",
      levelLabel: "स्तर",
      all: "सर्व",
      central: "केंद्र",
      stateUt: "राज्य / केंद्रशासित",
      stateShort: "राज्य",
      ministry: "मंत्रालय",
      stateOrMinistry: "राज्य / मंत्रालय",
      loadError: "योजनांची यादी लोड झाली नाही. थेट myscheme.gov.in पहा.",
      loading: "यादी लोड होत आहे…",
      resultsCount: (n) => `${n.toLocaleString("en-IN")} निकाल`,
      canCheck: "MiraiAi तपासू शकते",
      showMore: (n) => `आणखी ${n} दाखवा`,
    },
    life: {
      eyebrow: "कुटुंब नियोजन",
      heading: "जीवनातील महत्त्वाच्या टप्प्याची तयारी?",
      lead: "कुटुंबातील सदस्यांचे लाभ तपासा आणि त्यांचे अर्ज तपशील व स्मरणपत्रे एकत्र ठेवा.",
      openWorkspace: "माझे वर्कस्पेस उघडा",
      svgHousehold: "कुटुंब",
      svgParent: "पालक 70+",
      svgAdult: "प्रौढ",
      svgWoman: "महिला",
      card1Title: "व्यवसाय सुरू करणे",
      card1Body: "खेळते भांडवल आणि सूक्ष्म उद्योग कर्जे पहा.",
      card2Title: "विवाहाची तयारी",
      card2Body: "अधिकृत पोर्टलवर राज्य विवाह सहाय्य योजना शोधा.",
      card3Title: "शिक्षण सुरू ठेवणे",
      card3Body: "शिष्यवृत्ती पात्रता निकष आणि निवड टप्पे तपासा.",
      card4Title: "मुलीचे स्वागत",
      card4Body: "मुलीच्या भविष्यासाठी बचत खाते योजना पहा.",
      card5Title: "वय 70 पूर्ण होणे",
      card5Body: "ज्येष्ठ नागरिक आरोग्य विमा पात्रता आणि नोंदणी टप्पे तपासा.",
    },
    footer: {
      tagline: "नागरिकांसाठी स्वतंत्र योजना मार्गदर्शन.",
      visitMyScheme: "myScheme ला भेट द्या",
    },
    assistant: {
      eyebrow: "तुमचा योजना सहाय्यक",
      adaptiveEyebrow: "स्मार्ट योजना सहाय्यक",
      title: "MiraiAi शी बोला",
      lead: "MiraiAi ला तुम्हाला काय हवे ते सांगा. हे फक्त अधिकृत नियम ठरवणारे प्रश्न विचारते आणि प्रत्येक उत्तरामागील नियम व स्रोत दाखवते.",
      adaptiveLead:
        "सहज बोला — एका वाक्यात अनेक माहिती सांगू शकता. MiraiAi कमीत कमी प्रश्न विचारून अधिकृत नियम अचूक तपासते.",
      languageLabel: "भाषा",
      voiceLabel: "आवाज",
      voiceStyleLabel: "आवाजाची शैली",
      styleNames: { normal: "सामान्य", funny: "मजेशीर", interactive: "संवादात्मक" },
      styleSuffix: "शैली",
      playSample: "आवाजाचा नमुना ऐका",
      readAloud: "मोठ्याने वाचा",
      handsFree: "हँड्स-फ्री (प्रत्येक प्रश्नानंतर माइक आपोआप उघडेल)",
      autoMic: "ऑटो-माइक (आपोआप सुरू होतो)",
      newPerson: "नवीन व्यक्ती",
      status: {
        ready: "तयार",
        listening: "ऐकत आहे… आता बोला",
        autoListening: "आपोआप ऐकत आहे… आता बोला",
        transcribing: "लिहीत आहे…",
        thinking: "तपासत आहे…",
        speaking: "बोलत आहे…",
        error: "कृपया लक्ष द्या",
      },
      deviceVoice: "डिव्हाइस आवाज",
      play: "चालवा",
      hearing: "ऐकू येत आहे:",
      start: "सुरू करा",
      startTalking: "बोलणे सुरू करा",
      changingEarlier: "आधीचे उत्तर बदलत आहे",
      heardHint: (h) => `मी ऐकले: “${h}” — खाली दुरुस्त करून पाठवा किंवा पर्याय निवडा.`,
      confirmPrompt: (label) => `मला समजले: ${label}. हे बरोबर आहे का?`,
      typePlaceholder: "तुमचे उत्तर लिहा…",
      adaptivePlaceholder: "बोला किंवा लिहा (अनेक माहिती एकत्र चालेल)…",
      cancelRecording: "रेकॉर्डिंग रद्द करा",
      transcript: "संभाषणाचा तपशील",
      youPrefix: "तुम्ही: ",
      yourAnswers: "तुमची उत्तरे",
      answersEmpty: "तुमची उत्तरे येथे दिसतील. तुम्ही कोणतेही उत्तर बदलू शकता.",
      claimLedger: "माहिती नोंद",
      ledgerEmpty: "तुम्ही सांगितलेली माहिती येथे दिसेल.",
      change: "बदला",
      chooseDifferentNeed: "दुसरी गरज निवडा",
      checkAllSchemes: "सर्व योजना तपासा",
      privacyNote:
        "येथे आधार, बँक किंवा फोन नंबर कधीही देऊ नका. निकाल केवळ मार्गदर्शन आहे, अर्ज नाही. आवाज जतन केला जात नाही.",
      rulesChecked: (n) => `तपासलेले नियम (${n})`,
      yourAnswer: "तुमचे उत्तर:",
      documents: "कागदपत्रे:",
      officialWebsite: "अधिकृत वेबसाइट",
      alsoWorth: "हेही पहा (MiraiAi ने तपासलेले नाही):",
      unverifiedNote:
        "तपासणीच्या तारखेला अधिकृत मार्गदर्शक तत्त्वे मिळाली नाहीत — कृपया अधिकृत वेबसाइटवर खात्री करा.",
      adaptiveResultsHeading: "तुमचा स्मार्ट पात्रता निकाल",
      confirmBatchHeading: "कृपया एकदा तुमची सर्व माहिती तपासा:",
      confirmBatchBtn: "सर्व बरोबर आहे, निकाल पहा",
      statusBadge: {
        likely_eligible: "पात्र होण्याची शक्यता",
        possibly_eligible: "पात्र ठरू शकता — खात्री करा",
        ineligible: "पात्र नाही",
        needs_verification: "पडताळणी आवश्यक",
      },
      verdictBadge: {
        ELIGIBLE: "पात्र",
        INELIGIBLE: "पात्र नाही",
        UNDECIDED: "अनिश्चित",
        CONDITIONAL: "सशर्त",
      },
    },
  },

  ta: {
    langNativeName: "தமிழ்",
    skipToContent: "முக்கிய உள்ளடக்கத்திற்குச் செல்லவும்",
    nav: {
      home: "முகப்பு",
      voiceAssistant: "குரல் உதவியாளர்",
      exploreSchemes: "திட்டங்களைப் பார்க்கவும்",
      myWorkspace: "எனது பணியிடம்",
      getStarted: "தொடங்கவும்",
      menu: "மெனு",
    },
    hero: {
      eyebrow: "இந்திய அரசு திட்டங்கள்",
      titleLine1: "உங்கள் குரல்.",
      titleLine2: "உங்கள் பலன்கள்.",
      lead: "உங்களுக்கும் உங்கள் குடும்பத்திற்கும் ஏற்ற திட்டங்களைக் கண்டறியுங்கள். தமிழ், ஆங்கிலம், இந்தி, தெலுங்கு, மராத்தி, கன்னடம் அல்லது வங்காளத்தில் பேசி அல்லது தட்டச்சு செய்து தகுதியைச் சரிபார்க்கவும்.",
      talkCta: "MiraiAi உடன் பேசுங்கள்",
      exploreCta: "திட்டங்களைப் பார்க்கவும்",
      sourceLine: "அதிகாரப்பூர்வ அரசு ஆதாரங்களின் அடிப்படையில் வழிகாட்டல்",
      evidenceScheme: "அடல் ஓய்வூதியத் திட்டம்",
      evidenceAge: "வயது 18 முதல் 39 — நீங்கள் 32 என்றீர்கள்",
      evidenceBank: "சேமிப்புக் கணக்கு — ஆம்",
      evidenceTax: "வருமான வரி நிலை — உறுதிப்படுத்தவும்",
      evidenceSource: "ஆதாரம்: financialservices.gov.in · சரிபார்ப்பு 2026-11-20",
      assistantRole: "திட்ட உதவியாளர்",
      askAboutScheme: "ஒரு திட்டத்தைப் பற்றி கேளுங்கள்",
      seeHowItWorks: "இது எப்படி செயல்படுகிறது",
    },
    valueBand: {
      languagesVoice: "7 இந்திய மொழிகளில் குரல்",
      verifiedChecks: (n) => `${n} திட்டங்கள் அதிகாரப்பூர்வ விதிகளுடன் சரிபார்க்கப்பட்டன`,
      voiceAndText: "குரல் மற்றும் உரை",
      wholeFamily: "முழு குடும்பத்திற்கும் உதவி",
    },
    howItWorks: {
      eyebrow: "இது எப்படி செயல்படுகிறது",
      heading: "ஒரு கேள்வியிலிருந்து அடுத்த படி வரை",
      quote: "“என் தந்தைக்கு மருத்துவக் காப்பீடு கிடைக்குமா?”",
      card2Title: "ஆயுஷ்மான் வய வந்தனா",
      card2Rule1: "ஆதாரில் வயது 70 அல்லது அதற்கு மேல்",
      card2Rule2: "இந்தியாவில் வசிக்கிறார்",
      card3Title: "விண்ணப்பிக்கத் தயாராகுங்கள்",
      card3Item1: "e-KYC-க்கு ஆதார்",
      card3Item2: "NHA பயனாளி தளம்",
      step1Title: "உங்கள் சொந்த வார்த்தைகளில் கேளுங்கள்",
      step1Body:
        "பெற்றோருக்கான மருத்துவக் காப்பீடு போன்ற உங்கள் தேவையை MiraiAi-யிடம் சொல்லுங்கள். விருப்பமான மொழியில் பேசுங்கள் அல்லது தட்டச்சு செய்யுங்கள்.",
      step2Title: "பொருந்தும் விதிகளைச் சரிபார்க்கவும்",
      step2Body:
        "முடிவைத் தீர்மானிக்கும் சில கேள்விகளுக்கு மட்டும் பதிலளிக்கவும். இரண்டு பதில்கள் முரண்பட்டால் MiraiAi முதலில் உங்களிடம் உறுதிப்படுத்தும்.",
      step3Title: "அதிகாரப்பூர்வ தளத்தில் விண்ணப்பிக்கவும்",
      step3Body:
        "நீங்கள் ஏன் தகுதியானவர் என்பதை அறிந்து, ஆவணங்களைத் தயார் செய்து, அதிகாரப்பூர்வ இணையதளப் படிகளைப் பின்பற்றுங்கள்.",
      cta: "தகுதி சரிபார்ப்பைத் தொடங்கவும்",
    },
    categories: {
      eyebrow: "திட்டங்களின் பட்டியல்",
      heading: "பிரிவு வாரியாகப் பார்க்கவும்",
      viewAll: "அனைத்து திட்டங்களையும் பார்க்கவும்",
      verifiedChecks: (n) => `${n} சரிபார்க்கப்பட்ட திட்டங்கள்`,
      discoveryOnly: "தகவல் இணைப்புகள் மட்டும்",
      agriculture: "விவசாயம்",
      education: "கல்வி",
      healthcare: "மருத்துவம்",
      business: "தொழில் & கடன்",
      marriage: "திருமணம்",
      insurance: "காப்பீடு",
      savings: "சேமிப்பு",
      utilities: "வசதிகள்",
    },
    directory: {
      eyebrow: "அனைத்து திட்டங்கள்",
      heading: (count) => `myScheme-இல் உள்ள ${count ?? "அனைத்து"} திட்டங்களைத் தேடுங்கள்`,
      note: (count) =>
        `இந்தப் பட்டியல் திட்டங்களைத் தேடுவதற்கு மட்டுமே. MiraiAi-யிடம் ${count} திட்டங்களுக்கான அதிகாரப்பூர்வ விதிகள் உள்ளன; அவற்றில் “MiraiAi சரிபார்க்கும்” எனக் குறிக்கப்பட்டுள்ளது.`,
      searchLabel: "பெயர் அல்லது தலைப்பால் தேடுங்கள்",
      searchPlaceholder: "எ.கா. கல்வி உதவித்தொகை, ஓய்வூதியம், விவசாயி",
      levelLabel: "நிலை",
      all: "அனைத்தும்",
      central: "மத்திய அரசு",
      stateUt: "மாநிலம் / யூனியன் பிரதேசம்",
      stateShort: "மாநிலம்",
      ministry: "அமைச்சகம்",
      stateOrMinistry: "மாநிலம் / அமைச்சகம்",
      loadError: "திட்டப் பட்டியலை ஏற்ற முடியவில்லை. myscheme.gov.in தளத்தைப் பார்க்கவும்.",
      loading: "பட்டியல் ஏற்றப்படுகிறது…",
      resultsCount: (n) => `${n.toLocaleString("en-IN")} முடிவுகள்`,
      canCheck: "MiraiAi சரிபார்க்கும்",
      showMore: (n) => `மேலும் ${n} காட்டு`,
    },
    life: {
      eyebrow: "குடும்பத் திட்டமிடல்",
      heading: "வாழ்க்கையின் முக்கிய நிகழ்வுக்குத் தயாராகிறீர்களா?",
      lead: "குடும்ப உறுப்பினர்களின் பலன்களைச் சரிபார்த்து, விண்ணப்ப விவரங்களை ஒன்றாகச் சேமித்து வையுங்கள்.",
      openWorkspace: "எனது பணியிடத்தைத் திறக்கவும்",
      svgHousehold: "குடும்பம்",
      svgParent: "பெற்றோர் 70+",
      svgAdult: "பெரியவர்",
      svgWoman: "பெண்",
      card1Title: "தொழில் தொடங்குதல்",
      card1Body: "நடைமுறை மூலதனம் மற்றும் சிறு தொழில் கடன்களைப் பார்க்கவும்.",
      card2Title: "திருமணத் தயாரிப்பு",
      card2Body: "அதிகாரப்பூர்வ தளங்களில் மாநில திருமண உதவித் திட்டங்களைக் கண்டறியவும்.",
      card3Title: "கல்வியைத் தொடருதல்",
      card3Body: "கல்வி உதவித்தொகை தகுதி விதிகள் மற்றும் தேர்வுப் படிகளைச் சரிபார்க்கவும்.",
      card4Title: "மகளை வரவேற்றல்",
      card4Body: "உங்கள் மகளின் எதிர்காலத்திற்கான சேமிப்புத் திட்டத்தைப் பார்க்கவும்.",
      card5Title: "70 வயதை எட்டுதல்",
      card5Body: "மூத்த குடிமக்கள் மருத்துவக் காப்பீடு தகுதி மற்றும் பதிவு படிகளைப் பார்க்கவும்.",
    },
    footer: {
      tagline: "குடிமக்களுக்கான சுயாதீன திட்ட வழிகாட்டல்.",
      visitMyScheme: "myScheme தளத்திற்குச் செல்லவும்",
    },
    assistant: {
      eyebrow: "உங்கள் திட்ட உதவியாளர்",
      adaptiveEyebrow: "ஸ்மார்ட் திட்ட உதவியாளர்",
      title: "MiraiAi உடன் பேசுங்கள்",
      lead: "உங்களுக்கு என்ன உதவி வேண்டும் என்று MiraiAi-யிடம் சொல்லுங்கள். அதிகாரப்பூர்வ விதிகளைத் தீர்மானிக்கும் கேள்விகளை மட்டுமே கேட்டு, ஒவ்வொரு பதிலுக்கும் ஆதாரத்தைக் காட்டும்.",
      adaptiveLead:
        "இயல்பாகப் பேசுங்கள் — ஒரே வாக்கியத்தில் பல விவரங்களைச் சொல்லலாம். MiraiAi குறைந்த கேள்விகளில் அதிகாரப்பூர்வ விதிகளைத் துல்லியமாகச் சரிபார்க்கும்.",
      languageLabel: "மொழி",
      voiceLabel: "குரல்",
      voiceStyleLabel: "குரல் பாணி",
      styleNames: { normal: "சாதாரணம்", funny: "நகைச்சுவை", interactive: "உரையாடல்" },
      styleSuffix: "பாணி",
      playSample: "குரல் மாதிரியைக் கேளுங்கள்",
      readAloud: "சத்தமாகப் படி",
      handsFree: "ஹேண்ட்ஸ்-ஃப்ரீ (ஒவ்வொரு கேள்விக்கும் பிறகு மைக் திறக்கும்)",
      autoMic: "ஆட்டோ-மைக் (தானாகத் திறக்கும்)",
      newPerson: "புதிய நபர்",
      status: {
        ready: "தயார்",
        listening: "கேட்கிறேன்… இப்போது பேசுங்கள்",
        autoListening: "தானாகக் கேட்கிறேன்… பேசுங்கள்",
        transcribing: "எழுதுகிறது…",
        thinking: "சரிபார்க்கிறது…",
        speaking: "பேசுகிறது…",
        error: "கவனம் தேவை",
      },
      deviceVoice: "சாதனக் குரல்",
      play: "இயக்கு",
      hearing: "கேட்பது:",
      start: "தொடங்கு",
      startTalking: "பேசத் தொடங்குங்கள்",
      changingEarlier: "முந்தைய பதிலை மாற்றுகிறது",
      heardHint: (h) => `நான் கேட்டது: “${h}” — கீழே திருத்தி அனுப்பவும் அல்லது விருப்பத்தைத் தட்டவும்.`,
      confirmPrompt: (label) => `நான் புரிந்துகொண்டது: ${label}. இது சரியா?`,
      typePlaceholder: "உங்கள் பதிலைத் தட்டச்சு செய்யவும்…",
      adaptivePlaceholder: "பேசுங்கள் அல்லது தட்டச்சு செய்யவும்…",
      cancelRecording: "பதிவை ரத்து செய்",
      transcript: "உரையாடல் பதிவு",
      youPrefix: "நீங்கள்: ",
      yourAnswers: "உங்கள் பதில்கள்",
      answersEmpty: "உங்கள் பதில்கள் இங்கே தோன்றும். எதையும் மாற்றலாம்.",
      claimLedger: "தகவல் பதிவேடு",
      ledgerEmpty: "நீங்கள் கூறும் விவரங்கள் இங்கே தோன்றும்.",
      change: "மாற்று",
      chooseDifferentNeed: "வேறு தேவையைத் தேர்ந்தெடு",
      checkAllSchemes: "அனைத்து திட்டங்களையும் சரிபார்",
      privacyNote:
        "ஆதார், வங்கி அல்லது தொலைபேசி எண்களை இங்கே பகிர வேண்டாம். முடிவுகள் வழிகாட்டல் மட்டுமே. குரல் பதிவு சேமிக்கப்படாது.",
      rulesChecked: (n) => `சரிபார்க்கப்பட்ட விதிகள் (${n})`,
      yourAnswer: "உங்கள் பதில்:",
      documents: "ஆவணங்கள்:",
      officialWebsite: "அதிகாரப்பூர்வ இணையதளம்",
      alsoWorth: "இவற்றையும் பார்க்கவும் (MiraiAi சரிபார்க்கவில்லை):",
      unverifiedNote:
        "சரிபார்த்த தேதியில் அதிகாரப்பூர்வ வழிகாட்டி கிடைக்கவில்லை — அதிகாரப்பூர்வ தளத்தில் உறுதிப்படுத்தவும்.",
      adaptiveResultsHeading: "உங்கள் ஸ்மார்ட் தகுதி முடிவுகள்",
      confirmBatchHeading: "உங்கள் விவரங்களை ஒருமுறை உறுதிப்படுத்தவும்:",
      confirmBatchBtn: "அனைத்தும் சரி, முடிவுகளைக் காட்டு",
      statusBadge: {
        likely_eligible: "தகுதி இருக்கலாம்",
        possibly_eligible: "தகுதி பெறலாம் — உறுதிப்படுத்தவும்",
        ineligible: "பொருந்தவில்லை",
        needs_verification: "சரிபார்ப்பு தேவை",
      },
      verdictBadge: {
        ELIGIBLE: "தகுதியானவர்",
        INELIGIBLE: "தகுதியற்றவர்",
        UNDECIDED: "முடிவாகவில்லை",
        CONDITIONAL: "நிபந்தனையுடன்",
      },
    },
  },

  kn: {
    langNativeName: "ಕನ್ನಡ",
    skipToContent: "ಮುಖ್ಯ ವಿಷಯಕ್ಕೆ ಹೋಗಿ",
    nav: {
      home: "ಮುಖಪುಟ",
      voiceAssistant: "ಧ್ವನಿ ಸಹಾಯಕ",
      exploreSchemes: "ಯೋಜನೆಗಳನ್ನು ನೋಡಿ",
      myWorkspace: "ನನ್ನ ಕಾರ್ಯಸ್ಥಳ",
      getStarted: "ಪ್ರಾರಂಭಿಸಿ",
      menu: "ಮೆನು",
    },
    hero: {
      eyebrow: "ಭಾರತ ಸರ್ಕಾರದ ಯೋಜನೆಗಳು",
      titleLine1: "ನಿಮ್ಮ ಧ್ವನಿ.",
      titleLine2: "ನಿಮ್ಮ ಸೌಲಭ್ಯಗಳು.",
      lead: "ನಿಮಗೆ ಮತ್ತು ನಿಮ್ಮ ಕುಟುಂಬಕ್ಕೆ ಸೂಕ್ತವಾದ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ. ಕನ್ನಡ, ಇಂಗ್ಲಿಷ್, ಹಿಂದಿ, ತೆಲುಗು, ಮರಾಠಿ, ತಮಿಳು ಅಥವಾ ಬಂಗಾಳಿಯಲ್ಲಿ ಮಾತನಾಡಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಿ.",
      talkCta: "MiraiAi ಜೊತೆ ಮಾತನಾಡಿ",
      exploreCta: "ಯೋಜನೆಗಳನ್ನು ನೋಡಿ",
      sourceLine: "ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಮೂಲಗಳ ಆಧಾರಿತ ಮಾರ್ಗದರ್ಶನ",
      evidenceScheme: "ಅಟಲ್ ಪಿಂಚಣಿ ಯೋಜನೆ",
      evidenceAge: "ವಯಸ್ಸು 18 ರಿಂದ 39 — ನೀವು 32 ಹೇಳಿದಿರಿ",
      evidenceBank: "ಉಳಿತಾಯ ಖಾತೆ — ಹೌದು",
      evidenceTax: "ಆದಾಯ ತೆರಿಗೆ ಸ್ಥಿತಿ — ದೃಢೀಕರಿಸಿ",
      evidenceSource: "ಮೂಲ: financialservices.gov.in · ಪರಿಶೀಲನೆ 2026-11-20",
      assistantRole: "ಯೋಜನಾ ಸಹಾಯಕ",
      askAboutScheme: "ಯೋಜನೆಯ ಬಗ್ಗೆ ಕೇಳಿ",
      seeHowItWorks: "ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ",
    },
    valueBand: {
      languagesVoice: "7 ಭಾರತೀಯ ಭಾಷೆಗಳಲ್ಲಿ ಧ್ವನಿ",
      verifiedChecks: (n) => `${n} ಯೋಜನೆಗಳು ಅಧಿಕೃತ ಮೂಲಗಳಿಂದ ಪರಿಶೀಲನೆ`,
      voiceAndText: "ಧ್ವನಿ ಮತ್ತು ಪಠ್ಯ",
      wholeFamily: "ಇಡೀ ಕುಟುಂಬಕ್ಕೆ ಬೆಂಬಲ",
    },
    howItWorks: {
      eyebrow: "ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ",
      heading: "ಒಂದು ಪ್ರಶ್ನೆಯಿಂದ ಮುಂದಿನ ಹಂತದವರೆಗೆ",
      quote: "“ನನ್ನ ತಂದೆಗೆ ಆರೋಗ್ಯ ವಿಮೆ ಸಿಗುತ್ತದೆಯೇ?”",
      card2Title: "ಆಯುಷ್ಮಾನ್ ವಯ್ ವಂದನ",
      card2Rule1: "ಆಧಾರ್ ಪ್ರಕಾರ 70 ವರ್ಷ ಅಥವಾ ಮೇಲ್ಪಟ್ಟವರು",
      card2Rule2: "ಭಾರತದಲ್ಲಿ ವಾಸಿಸುತ್ತಿದ್ದಾರೆ",
      card3Title: "ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಸಿದ್ಧರಾಗಿ",
      card3Item1: "e-KYC ಗಾಗಿ ಆಧಾರ್",
      card3Item2: "NHA ಫಲಾನುಭವಿ ಪೋರ್ಟಲ್",
      step1Title: "ನಿಮ್ಮ ಸ್ವಂತ ಮಾತುಗಳಲ್ಲಿ ಕೇಳಿ",
      step1Body:
        "ಪೋಷಕರ ಆರೋಗ್ಯ ವಿಮೆಯಂತಹ ನಿಮ್ಮ ಅಗತ್ಯವನ್ನು MiraiAi ಗೆ ತಿಳಿಸಿ. ನಿಮಗೆ ಬೇಕಾದ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ.",
      step2Title: "ಅನ್ವಯವಾಗುವ ನಿಯಮಗಳನ್ನು ಪರಿಶೀಲಿಸಿ",
      step2Body:
        "ಫಲಿತಾಂಶವನ್ನು ನಿರ್ಧರಿಸುವ ಕೆಲವು ಪ್ರಶ್ನೆಗಳಿಗೆ ಮಾತ್ರ ಉತ್ತರಿಸಿ. ಎರಡು ಉತ್ತರಗಳು ಭಿನ್ನವಾಗಿದ್ದರೆ MiraiAi ಮೊದಲು ನಿಮ್ಮನ್ನು ದೃಢೀಕರಿಸುತ್ತದೆ.",
      step3Title: "ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಮೂಲಕ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ",
      step3Body: "ನೀವು ಏಕೆ ಅರ್ಹರು ಎಂಬುದನ್ನು ನೋಡಿ, ದಾಖಲೆಗಳನ್ನು ಸಿದ್ಧಪಡಿಸಿ ಮತ್ತು ಅಧಿಕೃತ ವೆಬ್‌ಸೈಟ್ ಹಂತಗಳನ್ನು ಅನುಸರಿಸಿ.",
      cta: "ಅರ್ಹತೆ ಪರಿಶೀಲನೆ ಪ್ರಾರಂಭಿಸಿ",
    },
    categories: {
      eyebrow: "ಯೋಜನೆಗಳ ಪಟ್ಟಿ",
      heading: "ವರ್ಗದ ಪ್ರಕಾರ ಹುಡುಕಿ",
      viewAll: "ಎಲ್ಲಾ ಯೋಜನೆಗಳನ್ನು ನೋಡಿ",
      verifiedChecks: (n) => `${n} ಪರಿಶೀಲಿಸಿದ ಯೋಜನೆಗಳು`,
      discoveryOnly: "ಮಾಹಿತಿ ಲಿಂಕ್‌ಗಳು ಮಾತ್ರ",
      agriculture: "ಕೃಷಿ",
      education: "ಶಿಕ್ಷಣ",
      healthcare: "ಆರೋಗ್ಯ ಸೇವೆ",
      business: "ವ್ಯಾಪಾರ ಮತ್ತು ಸಾಲ",
      marriage: "ವಿವಾಹ",
      insurance: "ವಿಮೆ",
      savings: "ಉಳಿತಾಯ",
      utilities: "ಸೌಲಭ್ಯಗಳು",
    },
    directory: {
      eyebrow: "ಎಲ್ಲಾ ಯೋಜನೆಗಳು",
      heading: (count) => `myScheme ನಲ್ಲಿರುವ ${count ?? "ಎಲ್ಲಾ"} ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ`,
      note: (count) =>
        `ಈ ಪಟ್ಟಿ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಲು ಮಾತ್ರ. MiraiAi ಬಳಿ ${count} ಯೋಜನೆಗಳ ಅಧಿಕೃತ ನಿಯಮಗಳಿವೆ; ಈ ಪಟ್ಟಿಯಲ್ಲಿ ಅವುಗಳಿಗೆ “MiraiAi ಪರಿಶೀಲಿಸಬಹುದು” ಎಂದು ಗುರುತಿಸಲಾಗಿದೆ.`,
      searchLabel: "ಹೆಸರು ಅಥವಾ ವಿಷಯದಿಂದ ಹುಡುಕಿ",
      searchPlaceholder: "ಉದಾ. ವಿದ್ಯಾರ್ಥಿವೇತನ, ಪಿಂಚಣಿ, ರೈತ",
      levelLabel: "ಹಂತ",
      all: "ಎಲ್ಲಾ",
      central: "ಕೇಂದ್ರ",
      stateUt: "ರಾಜ್ಯ / ಕೇಂದ್ರಾಡಳಿತ",
      stateShort: "ರಾಜ್ಯ",
      ministry: "ಸಚಿವಾಲಯ",
      stateOrMinistry: "ರಾಜ್ಯ / ಸಚಿವಾಲಯ",
      loadError: "ಯೋಜನೆಗಳ ಪಟ್ಟಿ ಲೋಡ್ ಆಗಲಿಲ್ಲ. ನೇರವಾಗಿ myscheme.gov.in ನೋಡಿ.",
      loading: "ಪಟ್ಟಿ ಲೋಡ್ ಆಗುತ್ತಿದೆ…",
      resultsCount: (n) => `${n.toLocaleString("en-IN")} ಫಲಿತಾಂಶಗಳು`,
      canCheck: "MiraiAi ಪರಿಶೀಲಿಸಬಹುದು",
      showMore: (n) => `ಇನ್ನೂ ${n} ತೋರಿಸಿ`,
    },
    life: {
      eyebrow: "ಕುಟುಂಬ ಯೋಜನೆ",
      heading: "ಜೀವನದ ಪ್ರಮುಖ ಘಟ್ಟಕ್ಕೆ ಸಿದ್ಧತೆ ನಡೆಸುತ್ತಿದ್ದೀರಾ?",
      lead: "ಕುಟುಂಬದ ಸದಸ್ಯರ ಸೌಲಭ್ಯಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಅವರ ಅರ್ಜಿ ವಿವರಗಳನ್ನು ಒಂದೇ ಕಡೆ ಸಂಗ್ರಹಿಸಿ.",
      openWorkspace: "ನನ್ನ ಕಾರ್ಯಸ್ಥಳ ತೆರೆಯಿರಿ",
      svgHousehold: "ಕುಟುಂಬ",
      svgParent: "ಪೋಷಕರು 70+",
      svgAdult: "ವಯಸ್ಕರು",
      svgWoman: "ಮಹಿಳೆ",
      card1Title: "ವ್ಯಾಪಾರ ಪ್ರಾರಂಭಿಸುವುದು",
      card1Body: "ಕಾರ್ಯನಿರತ ಬಂಡವಾಳ ಮತ್ತು ಸಣ್ಣ ಉದ್ಯಮ ಸಾಲಗಳನ್ನು ನೋಡಿ.",
      card2Title: "ವಿವಾಹದ ಸಿದ್ಧತೆ",
      card2Body: "ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ಗಳಲ್ಲಿ ರಾಜ್ಯ ವಿವಾಹ ಸಹಾಯ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ.",
      card3Title: "ಶಿಕ್ಷಣ ಮುಂದುವರಿಸುವುದು",
      card3Body: "ವಿದ್ಯಾರ್ಥಿವೇತನ ಅರ್ಹತಾ ನಿಯಮಗಳು ಮತ್ತು ಆಯ್ಕೆ ಹಂತಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
      card4Title: "ಮಗಳನ್ನು ಸ್ವಾಗತಿಸುವುದು",
      card4Body: "ನಿಮ್ಮ ಮಗಳ ಭವಿಷ್ಯಕ್ಕಾಗಿ ಉಳಿತಾಯ ಖಾತೆ ಯೋಜನೆಯನ್ನು ತಿಳಿಯಿರಿ.",
      card5Title: "70 ವರ್ಷ ತುಂಬುವುದು",
      card5Body: "ಹಿರಿಯ ನಾಗರಿಕರ ಆರೋಗ್ಯ ವಿಮೆ ಅರ್ಹತೆ ಮತ್ತು ನೋಂದಣಿ ಹಂತಗಳನ್ನು ನೋಡಿ.",
    },
    footer: {
      tagline: "ನಾಗರಿಕರಿಗಾಗಿ ಸ್ವತಂತ್ರ ಯೋಜನಾ ಮಾರ್ಗದರ್ಶನ.",
      visitMyScheme: "myScheme ಭೇಟಿ ನೀಡಿ",
    },
    assistant: {
      eyebrow: "ನಿಮ್ಮ ಯೋಜನಾ ಸಹಾಯಕ",
      adaptiveEyebrow: "ಸ್ಮಾರ್ಟ್ ಯೋಜನಾ ಸಹಾಯಕ",
      title: "MiraiAi ಜೊತೆ ಮಾತನಾಡಿ",
      lead: "ನಿಮಗೆ ಯಾವ ಸಹಾಯ ಬೇಕು ಎಂದು MiraiAi ಗೆ ಹೇಳಿ. ಅಧಿಕೃತ ನಿಯಮಗಳನ್ನು ನಿರ್ಧರಿಸುವ ಪ್ರಶ್ನೆಗಳನ್ನು ಮಾತ್ರ ಕೇಳಿ, ಪ್ರತಿ ಉತ್ತರದ ಹಿಂದಿನ ನಿಯಮ ಮತ್ತು ಮೂಲವನ್ನು ತೋರಿಸುತ್ತದೆ.",
      adaptiveLead:
        "ಸಹಜವಾಗಿ ಮಾತನಾಡಿ — ಒಂದೇ ವಾಕ್ಯದಲ್ಲಿ ಹಲವು ವಿವರಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳಬಹುದು. MiraiAi ಕಡಿಮೆ ಪ್ರಶ್ನೆಗಳಲ್ಲಿ ಅಧಿಕೃತ ನಿಯಮಗಳನ್ನು ನಿಖರವಾಗಿ ಪರಿಶೀಲಿಸುತ್ತದೆ.",
      languageLabel: "ಭಾಷೆ",
      voiceLabel: "ಧ್ವನಿ",
      voiceStyleLabel: "ಧ್ವನಿ ಶೈಲಿ",
      styleNames: { normal: "ಸಾಮಾನ್ಯ", funny: "ತಮಾಷೆ", interactive: "ಸಂವಾದಾತ್ಮಕ" },
      styleSuffix: "ಶೈಲಿ",
      playSample: "ಧ್ವನಿ ಮಾದರಿ ಕೇಳಿ",
      readAloud: "ಗಟ್ಟಿಯಾಗಿ ಓದಿ",
      handsFree: "ಹ್ಯಾಂಡ್ಸ್-ಫ್ರೀ (ಪ್ರತಿ ಪ್ರಶ್ನೆಯ ನಂತರ ಮೈಕ್ ತೆರೆಯುತ್ತದೆ)",
      autoMic: "ಆಟೋ-ಮೈಕ್ (ಸ್ವಯಂಚಾಲಿತವಾಗಿ ತೆರೆಯುತ್ತದೆ)",
      newPerson: "ಹೊಸ ವ್ಯಕ್ತಿ",
      status: {
        ready: "ಸಿದ್ಧ",
        listening: "ಕೇಳುತ್ತಿದ್ದೇನೆ… ಈಗ ಮಾತನಾಡಿ",
        autoListening: "ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಕೇಳುತ್ತಿದ್ದೇನೆ… ಮಾತನಾಡಿ",
        transcribing: "ಬರೆಯಲಾಗುತ್ತಿದೆ…",
        thinking: "ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…",
        speaking: "ಮಾತನಾಡಲಾಗುತ್ತಿದೆ…",
        error: "ದಯವಿಟ್ಟು ಗಮನಿಸಿ",
      },
      deviceVoice: "ಸಾಧನದ ಧ್ವನಿ",
      play: "ಪ್ಲೇ",
      hearing: "ಕೇಳಿಸುತ್ತಿದೆ:",
      start: "ಪ್ರಾರಂಭಿಸಿ",
      startTalking: "ಮಾತನಾಡಲು ಪ್ರಾರಂಭಿಸಿ",
      changingEarlier: "ಹಿಂದಿನ ಉತ್ತರವನ್ನು ಬದಲಾಯಿಸಲಾಗುತ್ತಿದೆ",
      heardHint: (h) => `ನಾನು ಕೇಳಿದ್ದು: “${h}” — ಕೆಳಗೆ ಸರಿಪಡಿಸಿ ಕಳುಹಿಸಿ ಅಥವಾ ಆಯ್ಕೆಯನ್ನು ಆರಿಸಿ.`,
      confirmPrompt: (label) => `ನನಗೆ ಅರ್ಥವಾಗಿದ್ದು: ${label}. ಇದು ಸರಿ ಇದೆಯೇ?`,
      typePlaceholder: "ನಿಮ್ಮ ಉತ್ತರವನ್ನು ಟೈಪ್ ಮಾಡಿ…",
      adaptivePlaceholder: "ಮಾತನಾಡಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ…",
      cancelRecording: "ರೆಕಾರ್ಡಿಂಗ್ ರದ್ದುಮಾಡಿ",
      transcript: "ಸಂಭಾಷಣೆ ವಿವರ",
      youPrefix: "ನೀವು: ",
      yourAnswers: "ನಿಮ್ಮ ಉತ್ತರಗಳು",
      answersEmpty: "ನಿಮ್ಮ ಉತ್ತರಗಳು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ. ಯಾವುದನ್ನಾದರೂ ಬದಲಾಯಿಸಬಹುದು.",
      claimLedger: "ಮಾಹಿತಿ ಪಟ್ಟಿ",
      ledgerEmpty: "ನೀವು ಹೇಳಿದ ವಿವರಗಳು ಇಲ್ಲಿ ದಾಖಲಾಗುತ್ತವೆ.",
      change: "ಬದಲಿಸಿ",
      chooseDifferentNeed: "ಬೇರೆ ಅಗತ್ಯವನ್ನು ಆರಿಸಿ",
      checkAllSchemes: "ಎಲ್ಲಾ ಯೋಜನೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ",
      privacyNote:
        "ಇಲ್ಲಿ ಆಧಾರ್, ಬ್ಯಾಂಕ್ ಅಥವಾ ಫೋನ್ ಸಂಖ್ಯೆಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳಬೇಡಿ. ಫಲಿತಾಂಶಗಳು ಮಾರ್ಗದರ್ಶನ ಮಾತ್ರ. ಧ್ವನಿ ಆಡಿಯೊ ಉಳಿಸಲಾಗುವುದಿಲ್ಲ.",
      rulesChecked: (n) => `ಪರಿಶೀಲಿಸಿದ ನಿಯಮಗಳು (${n})`,
      yourAnswer: "ನಿಮ್ಮ ಉತ್ತರ:",
      documents: "ದಾಖಲೆಗಳು:",
      officialWebsite: "ಅಧಿಕೃತ ವೆಬ್‌ಸೈಟ್",
      alsoWorth: "ಇವನ್ನೂ ನೋಡಿ (MiraiAi ಪರಿಶೀಲಿಸಿಲ್ಲ):",
      unverifiedNote: "ಪರಿಶೀಲನೆ ದಿನಾಂಕದಂದು ಅಧಿಕೃತ ಮಾರ್ಗಸೂಚಿ ಲಭ್ಯವಿರಲಿಲ್ಲ — ಅಧಿಕೃತ ವೆಬ್‌ಸೈಟ್‌ನಲ್ಲಿ ದೃಢೀಕರಿಸಿ.",
      adaptiveResultsHeading: "ನಿಮ್ಮ ಸ್ಮಾರ್ಟ್ ಅರ್ಹತಾ ಫಲಿತಾಂಶಗಳು",
      confirmBatchHeading: "ದಯವಿಟ್ಟು ಒಮ್ಮೆ ನಿಮ್ಮ ವಿವರಗಳನ್ನು ದೃಢೀಕರಿಸಿ:",
      confirmBatchBtn: "ಎಲ್ಲಾ ಸರಿ ಇದೆ, ಫಲಿತಾಂಶ ನೋಡಿ",
      statusBadge: {
        likely_eligible: "ಅರ್ಹರಾಗುವ ಸಾಧ್ಯತೆ ಇದೆ",
        possibly_eligible: "ಅರ್ಹರಾಗಬಹುದು — ದೃಢೀಕರಿಸಿ",
        ineligible: "ಅರ್ಹರಲ್ಲ",
        needs_verification: "ಪರಿಶೀಲನೆ ಅಗತ್ಯ",
      },
      verdictBadge: {
        ELIGIBLE: "ಅರ್ಹರು",
        INELIGIBLE: "ಅರ್ಹರಲ್ಲ",
        UNDECIDED: "ನಿರ್ಧರಿಸಲಾಗಿಲ್ಲ",
        CONDITIONAL: "ಷರತ್ತುಬದ್ಧ",
      },
    },
  },

  bn: {
    langNativeName: "বাংলা",
    skipToContent: "মূল বিষয়বস্তুতে যান",
    nav: {
      home: "হোম",
      voiceAssistant: "ভয়েস অ্যাসিস্ট্যান্ট",
      exploreSchemes: "প্রকল্প দেখুন",
      myWorkspace: "আমার ওয়ার্কস্পেস",
      getStarted: "শুরু করুন",
      menu: "মেনু",
    },
    hero: {
      eyebrow: "ভারত সরকারের প্রকল্প",
      titleLine1: "আপনার কণ্ঠস্বর।",
      titleLine2: "আপনার সুবিধা।",
      lead: "আপনার এবং আপনার পরিবারের জন্য প্রকল্প খুঁজুন। বাংলা, ইংরেজি, হিন্দি, তেলুগু, মারাঠি, তামিল বা কন্নড় ভাষায় বলে বা লিখে যোগ্যতা যাচাই করুন ও আবেদনের নিয়ম জানুন।",
      talkCta: "MiraiAi-এর সাথে কথা বলুন",
      exploreCta: "প্রকল্প দেখুন",
      sourceLine: "সরকারি অফিসিয়াল সূত্রের উপর ভিত্তি করে নির্দেশিকা",
      evidenceScheme: "অটল পেনশন যোজনা",
      evidenceAge: "বয়স ১৮ থেকে ৩৯ — আপনি ৩২ বলেছেন",
      evidenceBank: "সেভিংস অ্যাকাউন্ট — হ্যাঁ",
      evidenceTax: "আয়কর অবস্থা — নিশ্চিত করুন",
      evidenceSource: "সূত্র: financialservices.gov.in · যাচাই ২০২৬-১১-২০",
      assistantRole: "প্রকল্প সহায়ক",
      askAboutScheme: "কোনো প্রকল্প সম্পর্কে জিজ্ঞাসা করুন",
      seeHowItWorks: "এটি কীভাবে কাজ করে দেখুন",
    },
    valueBand: {
      languagesVoice: "৭টি ভারতীয় ভাষায় ভয়েস",
      verifiedChecks: (n) => `${n}টি প্রকল্প সরকারি নিয়ম অনুযায়ী যাচাইকৃত`,
      voiceAndText: "ভয়েস এবং টেক্সট",
      wholeFamily: "পুরো পরিবারের জন্য সহায়তা",
    },
    howItWorks: {
      eyebrow: "কীভাবে কাজ করে",
      heading: "একটি প্রশ্ন থেকে পরবর্তী ধাপ পর্যন্ত",
      quote: "“আমার বাবা কি স্বাস্থ্য বীমা পেতে পারেন?”",
      card2Title: "আয়ুষ্মান বয় বন্দনা",
      card2Rule1: "আধার অনুযায়ী বয়স ৭০ বছর বা তার বেশি",
      card2Rule2: "ভারতের বাসিন্দা",
      card3Title: "আবেদনের প্রস্তুতি নিন",
      card3Item1: "ই-কেওয়াইসি-এর জন্য আধার",
      card3Item2: "NHA বেনিফিশিয়ারি পোর্টাল",
      step1Title: "আপনার নিজের ভাষায় জিজ্ঞাসা করুন",
      step1Body:
        "বাবা-মায়ের চিকিৎসার মতো আপনার প্রয়োজন MiraiAi-কে জানান। আপনার পছন্দের ভাষায় বলুন বা লিখুন।",
      step2Title: "প্রযোজ্য নিয়ম যাচাই করুন",
      step2Body:
        "শুধুমাত্র ফলাফল নির্ধারণকারী কয়েকটি প্রশ্নের উত্তর দিন। দুটি উত্তরে অমিল থাকলে MiraiAi আগে নিশ্চিত করে নেয়।",
      step3Title: "অফিসিয়াল পোর্টাল থেকে আবেদন করুন",
      step3Body:
        "কেন আপনি যোগ্য হতে পারেন তা দেখুন, নথিপত্র প্রস্তুত করুন এবং অফিসিয়াল ওয়েবসাইটের ধাপগুলি অনুসরণ করুন।",
      cta: "যোগ্যতা যাচাই শুরু করুন",
    },
    categories: {
      eyebrow: "প্রকল্পের তালিকা",
      heading: "বিভাগ অনুযায়ী খুঁজুন",
      viewAll: "সব প্রকল্প দেখুন",
      verifiedChecks: (n) => `${n}টি যাচাইকৃত প্রকল্প`,
      discoveryOnly: "শুধুমাত্র তথ্য লিংক",
      agriculture: "কৃষি",
      education: "শিক্ষা",
      healthcare: "স্বাস্থ্যসেবা",
      business: "ব্যবসা ও ঋণ",
      marriage: "বিবাহ",
      insurance: "বীমা",
      savings: "সঞ্চয়",
      utilities: "গৃহস্থালি সুবিধা",
    },
    directory: {
      eyebrow: "সব প্রকল্প",
      heading: (count) => `myScheme-এ তালিকাভুক্ত ${count ?? "সব"} প্রকল্প খুঁজুন`,
      note: (count) =>
        `এই তালিকাটি কেবল প্রকল্প খোঁজার জন্য। MiraiAi-তে ${count}টি প্রকল্পের অফিসিয়াল নিয়ম রয়েছে; তালিকায় সেগুলির পাশে “MiraiAi যাচাই করতে পারে” লেখা আছে।`,
      searchLabel: "নাম বা বিষয় দিয়ে খুঁজুন",
      searchPlaceholder: "যেমন বৃত্তি, পেনশন, কৃষক",
      levelLabel: "স্তর",
      all: "সব",
      central: "কেন্দ্রীয়",
      stateUt: "রাজ্য / কেন্দ্রশাসিত",
      stateShort: "রাজ্য",
      ministry: "মন্ত্রণালয়",
      stateOrMinistry: "রাজ্য / মন্ত্রণালয়",
      loadError: "প্রকল্পের তালিকা লোড করা যায়নি। সরাসরি myscheme.gov.in দেখুন।",
      loading: "তালিকা লোড হচ্ছে…",
      resultsCount: (n) => `${n.toLocaleString("en-IN")}টি ফলাফল`,
      canCheck: "MiraiAi যাচাই করতে পারে",
      showMore: (n) => `আরও ${n}টি দেখান`,
    },
    life: {
      eyebrow: "পরিবার পরিকল্পনা",
      heading: "জীবনের গুরুত্বপূর্ণ ধাপের প্রস্তুতি নিচ্ছেন?",
      lead: "পরিবারের সদস্যদের সুবিধা যাচাই করুন এবং তাঁদের আবেদনের তথ্য ও রিমাইন্ডার একসাথে রাখুন।",
      openWorkspace: "আমার ওয়ার্কস্পেস খুলুন",
      svgHousehold: "পরিবার",
      svgParent: "অভিভাবক ৭০+",
      svgAdult: "প্রাপ্তবয়স্ক",
      svgWoman: "মহিলা",
      card1Title: "ব্যবসা শুরু করা",
      card1Body: "কার্যকরী মূলধন ও ক্ষুদ্র উদ্যোক্তা ঋণ দেখুন।",
      card2Title: "বিয়ের প্রস্তুতি",
      card2Body: "অফিসিয়াল পোর্টালে রাজ্যের বিবাহ সহায়তা প্রকল্প খুঁজুন।",
      card3Title: "পড়াশোনা চালিয়ে যাওয়া",
      card3Body: "বৃত্তির যোগ্যতার শর্তাবলি ও নির্বাচনের ধাপ যাচাই করুন।",
      card4Title: "কন্যাসন্তানের ভবিষ্যৎ",
      card4Body: "মেয়ের ভবিষ্যতের জন্য সঞ্চয় অ্যাকাউন্ট প্রকল্প জানুন।",
      card5Title: "৭০ বছর পূর্ণ হওয়া",
      card5Body: "প্রবীণ নাগরিকদের স্বাস্থ্য বীমার যোগ্যতা ও নথিভুক্তির ধাপ দেখুন।",
    },
    footer: {
      tagline: "নাগরিকদের জন্য নিরপেক্ষ প্রকল্প নির্দেশিকা।",
      visitMyScheme: "myScheme দেখুন",
    },
    assistant: {
      eyebrow: "আপনার প্রকল্প সহায়ক",
      adaptiveEyebrow: "স্মার্ট প্রকল্প সহায়ক",
      title: "MiraiAi-এর সাথে কথা বলুন",
      lead: "আপনার কী দরকার MiraiAi-কে বলুন। এটি শুধু সেই প্রশ্নগুলোই করে যেগুলো সরকারি নিয়ম নির্ধারণ করে, এবং প্রতিটি উত্তরের পেছনের নিয়ম ও সূত্র দেখায়।",
      adaptiveLead:
        "স্বাভাবিকভাবে বলুন — এক বাক্যে একাধিক তথ্য দিতে পারেন। MiraiAi সবচেয়ে কম প্রশ্ন করে অফিসিয়াল নিয়ম সঠিকভাবে যাচাই করে।",
      languageLabel: "ভাষা",
      voiceLabel: "কণ্ঠস্বর",
      voiceStyleLabel: "ভয়েস স্টাইল",
      styleNames: { normal: "সাধারণ", funny: "মজার", interactive: "আলাপচারিতা" },
      styleSuffix: "স্টাইল",
      playSample: "ভয়েস নমুনা শুনুন",
      readAloud: "জোরে পড়ুন",
      handsFree: "হ্যান্ডস-ফ্রি (প্রতি প্রশ্নের পর মাইক নিজেই খুলবে)",
      autoMic: "অটো-মাইক (স্বয়ংক্রিয়ভাবে চালু হয়)",
      newPerson: "নতুন ব্যক্তি",
      status: {
        ready: "প্রস্তুত",
        listening: "শুনছি… এখন বলুন",
        autoListening: "স্বয়ংক্রিয়ভাবে শুনছি… এখন বলুন",
        transcribing: "লিখে নিচ্ছি…",
        thinking: "যাচাই করছি…",
        speaking: "বলছি…",
        error: "অনুগ্রহ করে দেখুন",
      },
      deviceVoice: "ডিভাইস ভয়েস",
      play: "চালান",
      hearing: "শুনতে পাচ্ছি:",
      start: "শুরু করুন",
      startTalking: "কথা বলা শুরু করুন",
      changingEarlier: "আগের উত্তর পরিবর্তন করা হচ্ছে",
      heardHint: (h) => `আমি শুনেছি: “${h}” — নিচে ঠিক করে পাঠান বা একটি বিকল্প বেছে নিন।`,
      confirmPrompt: (label) => `আমি বুঝেছি: ${label}। এটি কি ঠিক?`,
      typePlaceholder: "আপনার উত্তর লিখুন…",
      adaptivePlaceholder: "বলুন বা লিখুন (একাধিক তথ্য দেওয়া যাবে)…",
      cancelRecording: "রেকর্ডিং বাতিল করুন",
      transcript: "কথোপকথনের বিবরণ",
      youPrefix: "আপনি: ",
      yourAnswers: "আপনার উত্তর",
      answersEmpty: "আপনার উত্তর এখানে দেখা যাবে। আপনি যেকোনো উত্তর বদলাতে পারবেন।",
      claimLedger: "তথ্য তালিকা",
      ledgerEmpty: "আপনার বলা তথ্যগুলো এখানে জমা হবে।",
      change: "পরিবর্তন",
      chooseDifferentNeed: "অন্য প্রয়োজন বেছে নিন",
      checkAllSchemes: "সব প্রকল্প যাচাই করুন",
      privacyNote:
        "এখানে কখনো আধার, ব্যাংক বা ফোন নম্বর দেবেন না। ফলাফল কেবল নির্দেশিকা, আবেদন নয়। ভয়েস অডিও সংরক্ষণ করা হয় না।",
      rulesChecked: (n) => `যাচাইকৃত নিয়ম (${n})`,
      yourAnswer: "আপনার উত্তর:",
      documents: "নথিপত্র:",
      officialWebsite: "অফিসিয়াল ওয়েবসাইট",
      alsoWorth: "এগুলোও দেখতে পারেন (MiraiAi দ্বারা যাচাইকৃত নয়):",
      unverifiedNote:
        "যাচাইয়ের তারিখে অফিসিয়াল নির্দেশিকা পাওয়া যায়নি — অনুগ্রহ করে অফিসিয়াল ওয়েবসাইটে নিশ্চিত করুন।",
      adaptiveResultsHeading: "আপনার স্মার্ট যোগ্যতার ফলাফল",
      confirmBatchHeading: "অনুগ্রহ করে একবার আপনার সমস্ত তথ্য নিশ্চিত করুন:",
      confirmBatchBtn: "সব ঠিক আছে, ফলাফল দেখুন",
      statusBadge: {
        likely_eligible: "যোগ্য হওয়ার সম্ভাবনা",
        possibly_eligible: "যোগ্য হতে পারেন — নিশ্চিত করুন",
        ineligible: "যোগ্য নয়",
        needs_verification: "যাচাই প্রয়োজন",
      },
      verdictBadge: {
        ELIGIBLE: "যোগ্য",
        INELIGIBLE: "যোগ্য নয়",
        UNDECIDED: "অনিশ্চিত",
        CONDITIONAL: "শর্তসাপেক্ষ",
      },
    },
  },
};

export function getSiteStrings(lang: VoiceLang): SiteStrings {
  return SITE_STRINGS[lang];
}
