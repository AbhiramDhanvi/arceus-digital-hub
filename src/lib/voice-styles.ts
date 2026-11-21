// Multilingual voice support (English, Hindi, Telugu, Marathi, Tamil, Kannada, Bengali)
// and expressive voice style profiles (Normal, Funny, Interactive).
// Purely presentational/conversational: never modifies eligibility rules or verdicts.
import { UNKNOWN, type FactKey, type FactValue, type Goal } from "./eligibility";
import type { Choice, Question } from "./interview";

export const VOICE_LANGS = [
  ["en", "English", "en-IN"],
  ["hi", "हिन्दी (Hindi)", "hi-IN"],
  ["te", "తెలుగు (Telugu)", "te-IN"],
  ["mr", "मराठी (Marathi)", "mr-IN"],
  ["ta", "தமிழ் (Tamil)", "ta-IN"],
  ["kn", "ಕನ್ನಡ (Kannada)", "kn-IN"],
  ["bn", "বাংলা (Bengali)", "bn-IN"],
] as const;

export type VoiceLang = (typeof VOICE_LANGS)[number][0];
export type VoiceStyleId = "normal" | "funny" | "interactive";

export interface VoiceStyleProfile {
  id: VoiceStyleId;
  label: string;
  description: string;
  /** Browser SpeechSynthesisUtterance rate (0.5 - 2.0) */
  speechRate: number;
  /** Browser SpeechSynthesisUtterance pitch (0.5 - 2.0) */
  speechPitch: number;
  /** Sarvam bulbul:v3 pace parameter (0.5 - 2.0) */
  sarvamPace: number;
}

export const VOICE_STYLES: Record<VoiceStyleId, VoiceStyleProfile> = {
  normal: {
    id: "normal",
    label: "Normal",
    description: "Clear, calm, and direct",
    speechRate: 1.0,
    speechPitch: 1.0,
    sarvamPace: 1.0,
  },
  funny: {
    id: "funny",
    label: "Funny",
    description: "Playful, upbeat, and witty",
    speechRate: 1.12,
    speechPitch: 1.22,
    sarvamPace: 1.12,
  },
  interactive: {
    id: "interactive",
    label: "Interactive",
    description: "Warm, energetic, and conversational",
    speechRate: 1.04,
    speechPitch: 1.08,
    sarvamPace: 1.05,
  },
};

export const VOICE_STYLE_LIST: VoiceStyleProfile[] = [
  VOICE_STYLES.normal,
  VOICE_STYLES.funny,
  VOICE_STYLES.interactive,
];

/** Voice samples in all 7 languages across all 3 voice styles. */
export const VOICE_SAMPLES: Record<VoiceLang, Record<VoiceStyleId, string>> = {
  en: {
    normal:
      "Namaste! I'm MiraiAi. Tell me what you need, and I'll check the official scheme rules with you.",
    funny:
      "Namaste! I'm MiraiAi — your friendly scheme detective! No endless queues, no missing stamps, just fast official answers with a smile!",
    interactive:
      "Hey there! I'm MiraiAi, and I'm right here with you! Ready to discover schemes made for your family? Just speak up and let's check together!",
  },
  hi: {
    normal: "नमस्ते! मैं MiraiAi हूँ। बताइए आपको क्या चाहिए, मैं आपके साथ सरकारी नियम जाँचूँगी।",
    funny:
      "नमस्ते जी! मैं MiraiAi हूँ — सरकारी योजनाओं का सबसे तेज़ जासूस! न लंबी लाइन, न काग़ज़ों का झंझट, बस मुस्कुराइए और फटाफट फायदे जानिए!",
    interactive:
      "नमस्ते! मैं MiraiAi हूँ, और हम इसे साथ मिलकर आसान बनाएंगे! तैयार हैं? बस बोलिए आपको किस मदद की ज़रूरत है, चलिए अभी शुरू करते हैं!",
  },
  te: {
    normal: "నమస్కారం! నేను MiraiAi. మీకు ఏ సహాయం కావాలో చెప్పండి, అధికారిక ప్రభుత్వ పథకాల నియమాలను కలిసి చూద్దాం.",
    funny:
      "నమస్కారం అండీ! నేను MiraiAi — మీ స్మార్ట్ పథకాల డిటెక్టివ్! పెద్ద క్యూలు లేవు, కాగితాల తలనొప్పి లేదు, నవ్వుతూ మీ లాభాలు తెలుసుకుందాం!",
    interactive:
      "హలో! నేను MiraiAi, మీతో పాటు ఉన్నాను! మీ కుటుంబానికి సరిపోయే పథకాలను వెతకడానికి సిద్ధమా? మాట్లాడండి, ఇప్పుడే మొదలుపెడదాం!",
  },
  mr: {
    normal:
      "नमस्कार! मी MiraiAi आहे. तुम्हाला कोणती मदत हवी आहे ते सांगा, आपण अधिकृत सरकारी योजनांचे नियम तपासूया.",
    funny:
      "नमस्कार मंडळी! मी MiraiAi — सरकारी योजनांचा झटपट गुप्तहेर! ना लांबलचक रांगा, ना कागदांचा गोंधळ, हसतखेळत तुमचे फायदे शोधूया!",
    interactive:
      "हॅलो! मी MiraiAi आहे, आणि आपण हे एकत्र सोपे करूया! तयार आहात का? फक्त बोला तुम्हाला कशासाठी मदत हवी आहे, चला आत्ताच सुरू करूया!",
  },
  ta: {
    normal:
      "வணக்கம்! நான் MiraiAi. உங்களுக்கு என்ன உதவி வேண்டும் என்று சொல்லுங்கள், அதிகாரப்பூர்வ அரசு திட்ட விதிகளை ஒன்றாக சரிபார்ப்போம்.",
    funny:
      "வணக்கம் நண்பரே! நான் MiraiAi — உங்கள் சுறுசுறுப்பான திட்டத் துப்பறிவாளர்! நீண்ட வரிசை இல்லை, காகிதத் தலைவலி இல்லை, சிரித்தபடி பலன்களைப் பார்ப்போம்!",
    interactive:
      "வணக்கம்! நான் MiraiAi, உங்களுடன் இருக்கிறேன்! உங்கள் குடும்பத்திற்கான திட்டங்களைக் கண்டுபிடிக்கத் தயாரா? பேசுங்கள், இப்போதே தொடங்கலாம்!",
  },
  kn: {
    normal:
      "ನಮಸ್ಕಾರ! ನಾನು MiraiAi. ನಿಮಗೆ ಯಾವ ಸಹಾಯ ಬೇಕು ಎಂದು ಹೇಳಿ, ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳ ನಿಯಮಗಳನ್ನು ಒಟ್ಟಿಗೆ ಪರಿಶೀಲಿಸೋಣ.",
    funny:
      "ನಮಸ್ಕಾರ ರೀ! ನಾನು MiraiAi — ನಿಮ್ಮ ಸ್ಮಾರ್ಟ್ ಯೋಜನಾ ಪತ್ತೇದಾರ! ಉದ್ದನೆಯ ಕ್ಯೂ ಇಲ್ಲ, ಕಾಗದದ ತಲೆನೋವು ಇಲ್ಲ, ನಗುನಗುತ್ತಾ ನಿಮ್ಮ ಲಾಭ ತಿಳಿಯೋಣ!",
    interactive:
      "ಹಲೋ! ನಾನು MiraiAi, ನಿಮ್ಮ ಜೊತೆಗಿದ್ದೇನೆ! ನಿಮ್ಮ ಕುಟುಂಬಕ್ಕೆ ಸೂಕ್ತವಾದ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಲು ಸಿದ್ಧರಿದ್ದೀರಾ? ಮಾತನಾಡಿ, ಈಗಲೇ ಶುರು ಮಾಡೋಣ!",
  },
  bn: {
    normal:
      "নমস্কার! আমি MiraiAi। আপনার কী সাহায্য দরকার বলুন, আমরা একসাথে সরকারি প্রকল্পের নিয়ম যাচাই করব।",
    funny:
      "নমস্কার! আমি MiraiAi — আপনার মজার প্রকল্প গোয়েন্দা! লম্বা লাইন নেই, কাগজপত্রের ঝামেলা নেই, হাসিমুখে চটপট আপনার সুবিধা জেনে নিন!",
    interactive:
      "হ্যালো! আমি MiraiAi, আমি আপনার সাথেই আছি! আপনার পরিবারের জন্য সেরা প্রকল্প খুঁজতে তৈরি তো? কথা বলুন, এখনই শুরু করা যাক!",
  },
};

/** Opening goal prompt in all 7 languages. */
export const LOCALIZED_GOAL_QUESTION: Record<VoiceLang, string> = {
  en: "What do you need help with? You can also name a scheme.",
  hi: "आपको किस चीज़ में मदद चाहिए? आप किसी योजना का नाम भी बोल सकते हैं।",
  te: "మీకు ఏ విషయంలో సహాయం కావాలి? మీరు ఏదైనా పథకం పేరు కూడా చెప్పవచ్చు.",
  mr: "तुम्हाला कशासाठी मदत हवी आहे? तुम्ही एखाद्या योजनेचे नावही सांगू शकता.",
  ta: "உங்களுக்கு எந்த விஷயத்தில் உதவி வேண்டும்? ஒரு திட்டத்தின் பெயரையும் சொல்லலாம்.",
  kn: "ನಿಮಗೆ ಯಾವ ವಿಷಯದಲ್ಲಿ ಸಹಾಯ ಬೇಕು? ನೀವು ಯಾವುದೇ ಯೋಜನೆಯ ಹೆಸರನ್ನೂ ಹೇಳಬಹುದು.",
  bn: "আপনার কোন বিষয়ে সাহায্য দরকার? আপনি কোনো প্রকল্পের নামও বলতে পারেন।",
};

/** Goal chip labels in all 7 languages. */
export const LOCALIZED_GOAL_LABELS: Record<VoiceLang, Record<Goal, string>> = {
  en: {
    farming: "Farming & crops",
    health: "Health cover",
    insurance: "Life / accident insurance",
    pension: "Pension",
    business: "Business loan",
    lpg: "Cooking gas (LPG)",
    education: "Scholarship / studies",
    housing: "House / housing",
    savings: "Savings for a daughter",
  },
  hi: {
    farming: "खेती और फसल",
    health: "स्वास्थ्य बीमा / इलाज",
    insurance: "जीवन / दुर्घटना बीमा",
    pension: "पेंशन",
    business: "व्यापार के लिए लोन",
    lpg: "रसोई गैस (LPG)",
    education: "छात्रवृत्ति / पढ़ाई",
    housing: "घर / आवास",
    savings: "बेटी के लिए बचत",
  },
  te: {
    farming: "వ్యవసాయం & పంటలు",
    health: "ఆరోగ్య బీమా / వైద్యం",
    insurance: "జీవిత / ప్రమాద బీమా",
    pension: "పెన్షన్",
    business: "వ్యాపార రుణం",
    lpg: "వంట గ్యాస్ (LPG)",
    education: "స్కాలర్‌షిప్ / చదువు",
    housing: "ఇల్లు / గృహనిర్మాణం",
    savings: "కూతురి కోసం పొదుపు",
  },
  mr: {
    farming: "शेती व पिके",
    health: "आरोग्य विमा / उपचार",
    insurance: "जीवन / अपघात विमा",
    pension: "पेन्शन",
    business: "व्यवसाय कर्ज",
    lpg: "स्वयंपाकाचा गॅस (LPG)",
    education: "शिष्यवृत्ती / शिक्षण",
    housing: "घर / आवास",
    savings: "मुलीसाठी बचत",
  },
  ta: {
    farming: "விவசாயம் & பயிர்கள்",
    health: "மருத்துவக் காப்பீடு",
    insurance: "ஆயுள் / விபத்து காப்பீடு",
    pension: "ஓய்வூதியம் (பென்ஷன்)",
    business: "தொழில் கடன்",
    lpg: "சமையல் எரிவாயு (LPG)",
    education: "கல்வி உதவித்தொகை",
    housing: "வீடு / வீட்டுவசதி",
    savings: "மகளுக்கான சேமிப்பு",
  },
  kn: {
    farming: "ಕೃಷಿ ಮತ್ತು ಬೆಳೆಗಳು",
    health: "ಆರೋಗ್ಯ ವಿಮೆ / ಚಿಕಿತ್ಸೆ",
    insurance: "ಜೀವ / ಅಪಘಾತ ವಿಮೆ",
    pension: "ಪಿಂಚಣಿ (ಪೆನ್ಷನ್)",
    business: "ವ್ಯಾಪಾರ ಸಾಲ",
    lpg: "ಅಡುಗೆ ಅನಿಲ (LPG)",
    education: "ವಿದ್ಯಾರ್ಥಿವೇತನ / ಶಿಕ್ಷಣ",
    housing: "ಮನೆ / ವಸತಿ",
    savings: "ಮಗಳಿಗಾಗಿ ಉಳಿತಾಯ",
  },
  bn: {
    farming: "কৃষি ও ফসল",
    health: "স্বাস্থ্য বীমা / চিকিৎসা",
    insurance: "জীবন / দুর্ঘটনা বীমা",
    pension: "পেনশন",
    business: "ব্যবসায়িক ঋণ",
    lpg: "রান্নার গ্যাস (LPG)",
    education: "বৃত্তি / পড়াশোনা",
    housing: "বাড়ি / আবাসন",
    savings: "মেয়ের জন্য সঞ্চয়",
  },
};

/** Common choice labels across all 7 languages. */
const COMMON_LABELS: Record<
  VoiceLang,
  {
    yes: string;
    no: string;
    unknown: string;
    skip: string;
    self: string;
    other: string;
    female: string;
    male: string;
    confirmYes: string;
    resultHeading: string;
  }
> = {
  en: {
    yes: "Yes",
    no: "No",
    unknown: "Don't know",
    skip: "Skip",
    self: "Me",
    other: "A family member",
    female: "Woman",
    male: "Man",
    confirmYes: "Yes, correct",
    resultHeading: "Your result",
  },
  hi: {
    yes: "हाँ",
    no: "नहीं",
    unknown: "पता नहीं",
    skip: "छोड़ें",
    self: "मेरे लिए",
    other: "परिवार के सदस्य के लिए",
    female: "महिला",
    male: "पुरुष",
    confirmYes: "हाँ, सही है",
    resultHeading: "आपका परिणाम",
  },
  te: {
    yes: "అవును",
    no: "కాదు",
    unknown: "తెలియదు",
    skip: "దాటవేయి",
    self: "నా కోసం",
    other: "కుటుంబ సభ్యుడి కోసం",
    female: "మహిళ",
    male: "పురుషుడు",
    confirmYes: "అవును, సరైనదే",
    resultHeading: "మీ ఫలితం",
  },
  mr: {
    yes: "होय",
    no: "नाही",
    unknown: "माहित नाही",
    skip: "वगळा",
    self: "माझ्यासाठी",
    other: "कुटुंबातील सदस्यासाठी",
    female: "महिला",
    male: "पुरुष",
    confirmYes: "होय, बरोबर आहे",
    resultHeading: "तुमचा निकाल",
  },
  ta: {
    yes: "ஆம்",
    no: "இல்லை",
    unknown: "தெரியாது",
    skip: "தவிர்",
    self: "எனக்காக",
    other: "குடும்ப உறுப்பினருக்காக",
    female: "பெண்",
    male: "ஆண்",
    confirmYes: "ஆம், சரிதான்",
    resultHeading: "உங்கள் முடிவு",
  },
  kn: {
    yes: "ಹೌದು",
    no: "ಇಲ್ಲ",
    unknown: "ಗೊತ್ತಿಲ್ಲ",
    skip: "ಬಿಟ್ಟುಬಿಡಿ",
    self: "ನನಗಾಗಿ",
    other: "ಕುಟುಂಬದ ಸದಸ್ಯರಿಗಾಗಿ",
    female: "ಮಹಿಳೆ",
    male: "ಪುರುಷ",
    confirmYes: "ಹೌದು, ಸರಿ ಇದೆ",
    resultHeading: "ನಿಮ್ಮ ಫಲಿತಾಂಶ",
  },
  bn: {
    yes: "হ্যাঁ",
    no: "না",
    unknown: "জানি না",
    skip: "এড়িয়ে যান",
    self: "আমার জন্য",
    other: "পরিবারের সদস্যের জন্য",
    female: "মহিলা",
    male: "পুরুষ",
    confirmYes: "হ্যাঁ, ঠিক আছে",
    resultHeading: "আপনার ফলাফল",
  },
};

/** Built-in native question wording for key questions in Telugu, Marathi, Tamil, Kannada, and Bengali. */
const REGIONAL_QUESTIONS: Record<
  Exclude<VoiceLang, "en" | "hi">,
  Partial<Record<FactKey, string>>
> = {
  te: {
    subject: "ఈ తనిఖీ ఎవరి కోసం?",
    age: "మీ వయస్సు ఎంత (ఆధార్ ప్రకారం)?",
    ageOnAadhaar: "ఆధార్ కార్డు ప్రకారం మీ వయస్సు ఎంత? దయచేసి ఆధార్ నంబర్ చెప్పకండి.",
    gender: "దరఖాస్తుదారు మహిళనా లేక పురుషుడా?",
    indianCitizen: "మీరు భారతదేశ పౌరులా?",
    hasBankAccount: "మీకు బ్యాంకు లేదా పోస్టాఫీసులో సేవింగ్స్ ఖాతా ఉందా?",
    ownsCultivableLand: "మీ కుటుంబం పేరుమీద సాగు భూమి ఉందా?",
    cultivatesCrops: "మీరు పంటలు సాగు చేస్తారా?",
    incomeTaxPayer: "మీరు ఆదాయపు పన్ను (ఇన్‌కమ్ ట్యాక్స్) చెల్లిస్తారా?",
    incomeTaxLastAY: "గత సంవత్సరం మీ కుటుంబంలో ఎవరైనా ఆదాయపు పన్ను చెల్లించారా?",
    govtEmployee: "మీ కుటుంబంలో ఎవరైనా ప్రభుత్వ ఉద్యోగి ఉన్నారా?",
    familyIncomeAnnual: "మీ కుటుంబం మొత్తం వార్షిక ఆదాయం ఎంత?",
    monthlyIncome: "మీ నెలవారీ ఆదాయం ఎంత?",
    householdHasLpg: "మీ ఇంట్లో ఇప్పటికే LPG గ్యాస్ కనెక్షన్ ఉందా?",
    poorHousehold: "మీ కుటుంబం ఉజ్వల పథకం పేదరిక ప్రకటనకు అర్హులా?",
    livesUrban: "మీ కుటుంబం పట్టణం లేదా నగరంలో నివసిస్తుందా?",
    ownsPuccaHouse: "మీ కుటుంబంలో ఎవరికైనా పక్కా ఇల్లు ఉందా?",
    nonFarmEnterprise: "ఈ రుణం చిన్న వ్యాపారం లేదా డెయిరీ, పౌల్ట్రీ వంటి పనుల కోసమా?",
    loanAmount: "మీకు సుమారు ఎంత రుణం కావాలి?",
    girlAge: "బాలిక వయస్సు ఎంత?",
    streetVendor: "మీరు వీధి వ్యాపారిగా పనిచేస్తారా?",
    unorganisedWorker: "మీరు అసంఘటిత రంగంలో పనిచేస్తారా?",
    inClass8: "విద్యార్థి ప్రస్తుతం 8వ తరగతిలో చదువుతున్నారా?",
  },
  mr: {
    subject: "ही तपासणी कोणासाठी आहे?",
    age: "तुमचे वय किती आहे (आधारनुसार)?",
    ageOnAadhaar: "आधार कार्डनुसार तुमचे वय किती आहे? कृपया आधार क्रमांक सांगू नका.",
    gender: "अर्जदार महिला आहेत की पुरुष?",
    indianCitizen: "तुम्ही भारताचे नागरिक आहात का?",
    hasBankAccount: "तुमचे बँकेत किंवा पोस्ट ऑफिसमध्ये बचत खाते आहे का?",
    ownsCultivableLand: "तुमच्या कुटुंबाच्या नावावर शेतीची जमीन आहे का?",
    cultivatesCrops: "तुम्ही शेती करता का?",
    incomeTaxPayer: "तुम्ही आयकर (इन्कम टॅक्स) भरता का?",
    incomeTaxLastAY: "मागील वर्षी तुमच्या कुटुंबातील कोणी आयकर भरला का?",
    govtEmployee: "तुमच्या कुटुंबात कोणी सरकारी कर्मचारी आहे का?",
    familyIncomeAnnual: "तुमच्या कुटुंबाचे एकूण वार्षिक उत्पन्न किती आहे?",
    monthlyIncome: "तुमचे मासिक उत्पन्न किती आहे?",
    householdHasLpg: "तुमच्या घरात आधीपासून LPG गॅस कनेक्शन आहे का?",
    poorHousehold: "तुमचे कुटुंब उज्ज्वला गरीब घोषणापत्रासाठी पात्र आहे का?",
    livesUrban: "तुमचे कुटुंब शहर किंवा नगरात राहते का?",
    ownsPuccaHouse: "तुमच्या कुटुंबात कोणाच्या नावावर पक्के घर आहे का?",
    nonFarmEnterprise: "हे कर्ज लहान व्यवसाय किंवा डेअरी, कुक्कुटपालन यासाठी आहे का?",
    loanAmount: "तुम्हाला अंदाजे किती कर्ज हवे आहे?",
    girlAge: "मुलीचे वय किती आहे?",
    streetVendor: "तुम्ही पथविक्रेते (फेरीवाले) आहात का?",
    unorganisedWorker: "तुम्ही असंघटित क्षेत्रात काम करता का?",
    inClass8: "विद्यार्थी सध्या इयत्ता 8 वी मध्ये शिकत आहे का?",
  },
  ta: {
    subject: "இந்த சரிபார்ப்பு யாருக்காக?",
    age: "உங்கள் வயது என்ன (ஆதார் படி)?",
    ageOnAadhaar: "ஆதார் அட்டையின் படி உங்கள் வயது என்ன? தயவுசெய்து ஆதார் எண்ணைச் சொல்ல வேண்டாம்.",
    gender: "விண்ணப்பதாரர் பெண்ணா அல்லது ஆணா?",
    indianCitizen: "நீங்கள் இந்தியக் குடிமகனா?",
    hasBankAccount: "வங்கி அல்லது அஞ்சல் அலுவலகத்தில் சேமிப்புக் கணக்கு உள்ளதா?",
    ownsCultivableLand: "உங்கள் குடும்பப் பெயரில் விவசாய நிலம் உள்ளதா?",
    cultivatesCrops: "நீங்கள் பயிர் சாகுபடி செய்கிறீர்களா?",
    incomeTaxPayer: "நீங்கள் வருமான வரி செலுத்துகிறீர்களா?",
    incomeTaxLastAY: "கடந்த ஆண்டு உங்கள் குடும்பத்தில் யாராவது வருமான வரி செலுத்தினார்களா?",
    govtEmployee: "உங்கள் குடும்பத்தில் யாராவது அரசு ஊழியர் உள்ளார்களா?",
    familyIncomeAnnual: "உங்கள் குடும்பத்தின் மொத்த ஆண்டு வருமானம் எவ்வளவு?",
    monthlyIncome: "உங்கள் மாத வருமானம் எவ்வளவு?",
    householdHasLpg: "உங்கள் வீட்டில் ஏற்கனவே LPG எரிவாயு இணைப்பு உள்ளதா?",
    poorHousehold: "உங்கள் குடும்பம் உஜ்வாலா ஏழைக் குடும்ப அறிவிப்புக்குத் தகுதியானதா?",
    livesUrban: "உங்கள் குடும்பம் நகரம் அல்லது பேரூராட்சியில் வசிக்கிறதா?",
    ownsPuccaHouse: "உங்கள் குடும்பத்தில் யாருக்காவது சொந்த கான்கிரீட் வீடு உள்ளதா?",
    nonFarmEnterprise: "இந்தக் கடன் சிறு தொழில் அல்லது பால், கோழி வளர்ப்பு போன்ற தொழிலுக்கா?",
    loanAmount: "உங்களுக்கு சுமார் எவ்வளவு கடன் தேவை?",
    girlAge: "பெண் குழந்தையின் வயது என்ன?",
    streetVendor: "நீங்கள் தெரு வியாபாரியாக வேலை செய்கிறீர்களா?",
    unorganisedWorker: "நீங்கள் அமைப்புசாராத் துறையில் வேலை செய்கிறீர்களா?",
    inClass8: "மாணவர் தற்போது 8-ஆம் வகுப்பில் படிக்கிறாரா?",
  },
  kn: {
    subject: "ಈ ಪರಿಶೀಲನೆ ಯಾರಿಗಾಗಿ?",
    age: "ನಿಮ್ಮ ವಯಸ್ಸು ಎಷ್ಟು (ಆಧಾರ್ ಪ್ರಕಾರ)?",
    ageOnAadhaar: "ಆಧಾರ್ ಕಾರ್ಡ್ ಪ್ರಕಾರ ನಿಮ್ಮ ವಯಸ್ಸು ಎಷ್ಟು? ದಯವಿಟ್ಟು ಆಧಾರ್ ಸಂಖ್ಯೆ ಹೇಳಬೇಡಿ.",
    gender: "ಅರ್ಜಿದಾರರು ಮಹಿಳೆಯೇ ಅಥವಾ ಪುರುಷರೇ?",
    indianCitizen: "ನೀವು ಭಾರತೀಯ ಪ್ರಜೆಯೇ?",
    hasBankAccount: "ನಿಮಗೆ ಬ್ಯಾಂಕ್ ಅಥವಾ ಅಂಚೆ ಕಚೇರಿಯಲ್ಲಿ ಉಳಿತಾಯ ಖಾತೆ ಇದೆಯೇ?",
    ownsCultivableLand: "ನಿಮ್ಮ ಕುಟುಂಬದ ಹೆಸರಿನಲ್ಲಿ ಕೃಷಿ ಭೂಮಿ ಇದೆಯೇ?",
    cultivatesCrops: "ನೀವು ಬೆಳೆ ಬೆಳೆಯುತ್ತೀರಾ?",
    incomeTaxPayer: "ನೀವು ಆದಾಯ ತೆರಿಗೆ (ಇನ್‌ಕಮ್ ಟ್ಯಾಕ್ಸ್) ಪಾವತಿಸುತ್ತೀರಾ?",
    incomeTaxLastAY: "ಕಳೆದ ವರ್ಷ ನಿಮ್ಮ ಕುಟುಂಬದಲ್ಲಿ ಯಾರಾದರೂ ಆದಾಯ ತೆರಿಗೆ ಪಾವತಿಸಿದ್ದಾರೆಯೇ?",
    govtEmployee: "ನಿಮ್ಮ ಕುಟುಂಬದಲ್ಲಿ ಯಾರಾದರೂ ಸರ್ಕಾರಿ ನೌಕರರು ಇದ್ದಾರೆಯೇ?",
    familyIncomeAnnual: "ನಿಮ್ಮ ಕುಟುಂಬದ ಒಟ್ಟು ವಾರ್ಷಿಕ ಆದಾಯ ಎಷ್ಟು?",
    monthlyIncome: "ನಿಮ್ಮ ತಿಂಗಳ ಆದಾಯ ಎಷ್ಟು?",
    householdHasLpg: "ನಿಮ್ಮ ಮನೆಯಲ್ಲಿ ಈಗಾಗಲೇ LPG ಗ್ಯಾಸ್ ಸಂಪರ್ಕ ಇದೆಯೇ?",
    poorHousehold: "ನಿಮ್ಮ ಕುಟುಂಬ ಉಜ್ವಲ ಬಡತನ ಘೋಷಣೆಗೆ ಅರ್ಹವಾಗಿದೆಯೇ?",
    livesUrban: "ನಿಮ್ಮ ಕುಟುಂಬ ಪಟ್ಟಣ ಅಥವಾ ನಗರದಲ್ಲಿ ವಾಸಿಸುತ್ತದೆಯೇ?",
    ownsPuccaHouse: "ನಿಮ್ಮ ಕುಟುಂಬದಲ್ಲಿ ಯಾರಿಗಾದರೂ ಪಕ್ಕಾ ಮನೆ ಇದೆಯೇ?",
    nonFarmEnterprise: "ಈ ಸಾಲ ಸಣ್ಣ ವ್ಯಾಪಾರ ಅಥವಾ ಡೈರಿ, ಕೋಳಿ ಸಾಕಾಣಿಕೆಗಾಗಿ ಬೇಕೇ?",
    loanAmount: "ನಿಮಗೆ ಅಂದಾಜು ಎಷ್ಟು ಸಾಲ ಬೇಕು?",
    girlAge: "ಹೆಣ್ಣು ಮಗುವಿನ ವಯಸ್ಸು ಎಷ್ಟು?",
    streetVendor: "ನೀವು ಬೀದಿ ಬದಿ ವ್ಯಾಪಾರಿಯೇ?",
    unorganisedWorker: "ನೀವು ಅಸಂಘಟಿತ ವಲಯದಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತೀರಾ?",
    inClass8: "ವಿದ್ಯಾರ್ಥಿ ಈಗ 8ನೇ ತರಗತಿಯಲ್ಲಿ ಓದುತ್ತಿದ್ದಾರೆಯೇ?",
  },
  bn: {
    subject: "এই যাচাইটি কার জন্য?",
    age: "আপনার বয়স কত (আধার অনুযায়ী)?",
    ageOnAadhaar: "আধার কার্ড অনুযায়ী আপনার বয়স কত? দয়া করে আধার নম্বর বলবেন না।",
    gender: "আবেদনকারী মহিলা নাকি পুরুষ?",
    indianCitizen: "আপনি কি ভারতের নাগরিক?",
    hasBankAccount: "ব্যাংক বা পোস্ট অফিসে আপনার কি সেভিংস অ্যাকাউন্ট আছে?",
    ownsCultivableLand: "আপনার পরিবারের নামে কি চাষযোগ্য জমি আছে?",
    cultivatesCrops: "আপনি কি ফসল চাষ করেন?",
    incomeTaxPayer: "আপনি কি আয়কর (ইনকাম ট্যাক্স) দেন?",
    incomeTaxLastAY: "গত বছর আপনার পরিবারের কেউ কি আয়কর দিয়েছেন?",
    govtEmployee: "আপনার পরিবারে কি কোনো সরকারি কর্মচারী আছেন?",
    familyIncomeAnnual: "আপনার পরিবারের মোট বার্ষিক আয় কত?",
    monthlyIncome: "আপনার মাসিক আয় কত?",
    householdHasLpg: "আপনার বাড়িতে কি আগে থেকেই LPG গ্যাস সংযোগ আছে?",
    poorHousehold: "আপনার পরিবার কি উজ্জ্বলা দারিদ্র্য ঘোষণাপত্রের জন্য উপযুক্ত?",
    livesUrban: "আপনার পরিবার কি শহর বা নগরে বসবাস করে?",
    ownsPuccaHouse: "আপনার পরিবারের কারো নামে কি পাকা বাড়ি আছে?",
    nonFarmEnterprise: "এই ঋণ কি ছোট ব্যবসা বা ডেয়ারি, পোল্ট্রি কাজের জন্য?",
    loanAmount: "আপনার আনুমানিক কত টাকা ঋণ দরকার?",
    girlAge: "মেয়েটির বয়স কত?",
    streetVendor: "আপনি কি রাস্তার হকার বা বিক্রেতা?",
    unorganisedWorker: "আপনি কি অসংগঠিত ক্ষেত্রে কাজ করেন?",
    inClass8: "শিক্ষার্থী কি এখন অষ্টম শ্রেণিতে পড়ছে?",
  },
};

export function getCommonLabels(lang: VoiceLang) {
  return COMMON_LABELS[lang];
}

/** Returns localized text for a Question in any of the 7 languages (falls back to English for untranslated edge questions). */
export function localizedQuestionText(
  q: Question,
  lang: VoiceLang,
  subject: FactValue | undefined,
): string {
  if (q.key === "goal") return LOCALIZED_GOAL_QUESTION[lang];
  if (lang === "en" || lang === "hi") return q[lang][subject === "other" ? 1 : 0] || q[lang][0];
  const regional = REGIONAL_QUESTIONS[lang][q.key];
  if (regional) return regional;
  return q.en[subject === "other" ? 1 : 0] || q.en[0];
}

/** Returns localized label for a choice chip in any of the 7 languages. */
export function localizedChoiceLabel(
  choice: Choice,
  qKey: Question["key"],
  lang: VoiceLang,
): string {
  if (lang === "en") return choice.en;
  if (lang === "hi") return choice.hi;
  if (qKey === "goal") {
    const goalLabel = LOCALIZED_GOAL_LABELS[lang][choice.value as Goal];
    if (goalLabel) return goalLabel;
  }
  const c = COMMON_LABELS[lang];
  if (choice.value === true && choice.en === "Yes") return c.yes;
  if (choice.value === false && choice.en === "No") return c.no;
  if (choice.value === UNKNOWN && choice.en === "Don't know") return c.unknown;
  if (qKey === "subject") {
    if (choice.value === "self") return c.self;
    if (choice.value === "other") return c.other;
  }
  if (qKey === "gender") {
    if (choice.value === "female") return c.female;
    if (choice.value === "male") return c.male;
  }
  return choice.en;
}

const FUNNY_PREFIX: Record<VoiceLang, { question: string; retry: string; result: string }> = {
  en: {
    question: "Quick detective question — ",
    retry: "Haha, my ears missed that one! ",
    result: "Drumroll please! ",
  },
  hi: {
    question: "एक मज़ेदार सवाल — ",
    retry: "अरे वाह, मेरे कान थोड़ा चूक गए! ",
    result: "लीजिए, धमाकेदार नतीजा तैयार है! ",
  },
  te: {
    question: "ఒక సరదా ప్రశ్న — ",
    retry: "అయ్యో, నా చెవులు కొంచెం మిస్ అయ్యాయి! ",
    result: "ఇదిగో, ఫలితం సిద్ధమైంది! ",
  },
  mr: {
    question: "एक मजेशीर प्रश्न — ",
    retry: "अरेरे, माझ्या कानांनी ते जरा चुकवलं! ",
    result: "चला, निकाल तयार आहे! ",
  },
  ta: {
    question: "ஒரு ஜாலியான கேள்வி — ",
    retry: "அச்சச்சோ, என் காது கொஞ்சம் தவறவிட்டுவிட்டது! ",
    result: "இதோ, உங்கள் முடிவு தயார்! ",
  },
  kn: {
    question: "ಒಂದು ತಮಾಷೆಯ ಪ್ರಶ್ನೆ — ",
    retry: "ಅಯ್ಯೋ, ನನ್ನ ಕಿವಿ ಸ್ವಲ್ಪ ಮಿಸ್ ಆಯ್ತು! ",
    result: "ಇಗೋ, ಫಲಿತಾಂಶ ಸಿದ್ಧವಾಗಿದೆ! ",
  },
  bn: {
    question: "একটা মজার প্রশ্ন — ",
    retry: "আরে বাবা, আমার কান একটু ফসকে গেল! ",
    result: "এই যে, ফলাফল একদম তৈরি! ",
  },
};

const INTERACTIVE_WRAP: Record<
  VoiceLang,
  { questionPrefix: string; questionSuffix: string; retry: string; result: string }
> = {
  en: {
    questionPrefix: "Let's check this together: ",
    questionSuffix: " Go ahead and tell me!",
    retry: "No worries at all — let's try that once more! ",
    result: "Awesome, we finished checking! Here is what I found for you: ",
  },
  hi: {
    questionPrefix: "चलिए साथ मिलकर देखते हैं: ",
    questionSuffix: " बताइए, मैं सुन रही हूँ!",
    retry: "कोई बात नहीं, एक बार फिर से बताइए! ",
    result: "बहुत बढ़िया! हमने जाँच पूरी कर ली है: ",
  },
  te: {
    questionPrefix: "కలిసి చూద్దాం: ",
    questionSuffix: " చెప్పండి, నేను వింటున్నాను!",
    retry: "పర్వాలేదు, మరోసారి చెప్పండి! ",
    result: "చాలా బాగుంది! మనం తనిఖీ పూర్తి చేశాము: ",
  },
  mr: {
    questionPrefix: "चला एकत्र तपासूया: ",
    questionSuffix: " बोला, मी ऐकत आहे!",
    retry: "काही हरकत नाही, पुन्हा एकदा सांगा! ",
    result: "छान! आपली तपासणी पूर्ण झाली आहे: ",
  },
  ta: {
    questionPrefix: "ஒன்றாகப் பார்ப்போம்: ",
    questionSuffix: " சொல்லுங்கள், நான் கேட்கிறேன்!",
    retry: "பரவாயில்லை, இன்னொரு முறை சொல்லுங்கள்! ",
    result: "அருமை! சரிபார்ப்பு முடிந்தது: ",
  },
  kn: {
    questionPrefix: "ಒಟ್ಟಿಗೆ ನೋಡೋಣ: ",
    questionSuffix: " ಹೇಳಿ, ನಾನು ಕೇಳುತ್ತಿದ್ದೇನೆ!",
    retry: "ಪರವಾಗಿಲ್ಲ, ಇನ್ನೊಮ್ಮೆ ಹೇಳಿ! ",
    result: "ಅದ್ಭುತ! ಪರಿಶೀಲನೆ ಮುಗಿಯಿತು: ",
  },
  bn: {
    questionPrefix: "চলুন একসাথে দেখি: ",
    questionSuffix: " বলুন, আমি শুনছি!",
    retry: "কোনো সমস্যা নেই, আরেকবার বলুন! ",
    result: "দারুণ! আমাদের যাচাই শেষ হয়েছে: ",
  },
};

/**
 * Applies the selected voice style ("normal", "funny", "interactive") to spoken text
 * in the chosen language while keeping every official fact, rule, and number intact.
 */
export function styleSpokenText(
  text: string,
  lang: VoiceLang,
  style: VoiceStyleId,
  kind: "question" | "retry" | "result" | "confirm" = "question",
): string {
  const clean = text.trim();
  if (!clean || style === "normal" || kind === "confirm") return clean;
  if (style === "funny") {
    const p = FUNNY_PREFIX[lang];
    return `${p[kind]}${clean}`;
  }
  const w = INTERACTIVE_WRAP[lang];
  if (kind === "question") return `${w.questionPrefix}${clean}${w.questionSuffix}`;
  if (kind === "retry") return `${w.retry}${clean}`;
  return `${w.result}${clean}`;
}

/**
 * Native multilingual retry / fallback message when an utterance isn't understood.
 */
export function localizedRetryMessage(lang: VoiceLang, qText: string, style: VoiceStyleId): string {
  const base: Record<VoiceLang, string> = {
    en: `Sorry, I didn't get that. Please tap an option below or answer again. ${qText}`,
    hi: `माफ़ कीजिए, समझ नहीं आया। कृपया नीचे से चुनें या फिर से बोलें। ${qText}`,
    te: `క్షమించండి, నాకు అర్థం కాలేదు. దయచేసి కింది ఎంపికను ఎంచుకోండి లేదా మళ్ళీ చెప్పండి. ${qText}`,
    mr: `माफ करा, समजले नाही. कृपया खालील पर्याय निवडा किंवा पुन्हा सांगा. ${qText}`,
    ta: `மன்னிக்கவும், புரியவில்லை. கீழே உள்ள விருப்பத்தைத் தேர்ந்தெடுக்கவும் அல்லது மீண்டும் சொல்லவும். ${qText}`,
    kn: `ಕ್ಷಮಿಸಿ, ಅರ್ಥವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಕೆಳಗಿನ ಆಯ್ಕೆಯನ್ನು ಆರಿಸಿ ಅಥವಾ ಮತ್ತೆ ಹೇಳಿ. ${qText}`,
    bn: `দুঃখিত, বুঝতে পারিনি। নিচের বিকল্পটি বেছে নিন বা আবার বলুন। ${qText}`,
  };
  return styleSpokenText(base[lang], lang, style, "retry");
}

/**
 * Deterministic regional keyword matcher for Telugu, Marathi, Tamil, Kannada, and Bengali
 * so voice answers in these languages work offline without requiring sign-in or AI.
 */
const REGIONAL_GOAL_REGEX: Array<{ goal: Goal; re: RegExp }> = [
  { goal: "farming", re: /వ్యవసాయ|రైతు|పంట|शेती|शेतकरी|पीक|விவசாய|பயிர்|ಕೃಷಿ|ರೈತ|ಬೆಳೆ|কৃষি|চাষ|ফসল/ },
  {
    goal: "health",
    re: /ఆరోగ్య|వైద్య|ఆసుపత్రి|आरोग्य|उपचार|रुग्णालय|மருத்துவ|சுகாதார|ಆರೋಗ್ಯ|ಚಿಕಿತ್ಸೆ|ಆಸ್ಪತ್ರೆ|স্বাস্থ্য|চিকিৎসা|হাসপাতাল/,
  },
  { goal: "insurance", re: /బీమా|ప్రమాద|विमा|अपघात|காப்பீடு|விபத்து|ವಿಮೆ|ಅಪಘಾತ|বীমা|দুর্ঘটনা/ },
  { goal: "pension", re: /పెన్షన్|పింఛను|पेन्शन|निवृत्ती|ஓய்வூதியம்|பென்ஷன்|ಪಿಂಚಣಿ|ಪೆನ್ಷನ್|পেনশন/ },
  { goal: "business", re: /వ్యాపార|రుణం|లోన్|व्यवसाय|कर्ज|दुकान|தொழில்|கடன்|ವ್ಯಾಪಾರ|ಸಾಲ|ব্যবসা|ঋণ/ },
  { goal: "lpg", re: /గ్యాస్|వంట|गॅस|सिलिंडर|எரிவாயு|சமையல்|ಅಡುಗೆ|ಗ್ಯಾಸ್|গ্যাস|রান্না/ },
  {
    goal: "education",
    re: /స్కాలర్|చదువు|విద్య|शिष्यवृत्ती|शिक्षण|शाळा|கல்வி|படிப்பு|ವಿದ್ಯಾರ್ಥಿ|ಶಿಕ್ಷಣ|বৃত্তি|পড়াশোনা|শিক্ষা/,
  },
  { goal: "housing", re: /ఇల్లు|గృహ|घर|आवास|வீடு|ಮನೆ|ವಸತಿ|বাড়ি|আবাসন/ },
  {
    goal: "savings",
    re: /కూతురు|కూతురి|పొదుపు|मुलगी|मुलीसाठी|बचत|மகள்|மகளுக்கான|சேமிப்பு|ಮಗಳು|ಮಗಳಿಗಾಗಿ|ಉಳಿತಾಯ|মেয়ে|সঞ্চয়/,
  },
];

export function matchRegionalGoal(text: string): Goal | null {
  const clean = text.trim();
  if (!clean) return null;
  for (const item of REGIONAL_GOAL_REGEX) {
    if (item.re.test(clean)) return item.goal;
  }
  return null;
}

export function matchRegionalYesNo(text: string): boolean | "unknown" | null {
  const clean = text.trim();
  if (!clean) return null;
  if (/తెలియదు|మాహిత नाही|माहित नाही|தெரியாது|ಗೊತ್ತಿಲ್ಲ|জানি না/.test(clean)) return "unknown";
  if (/కాదు|లేదు|వద్దు|नाही|नको|இல்லை|வேண்டாம்|ಇಲ್ಲ|ಬೇಡ|না|নেই/.test(clean)) return false;
  if (/అవును|ఉంది|సరే|होय|हो|आहे|ஆம்|ஆமாம்|உள்ளது|ಹೌದು|ಇದೆ|হ্যাঁ|আছে/.test(clean)) return true;
  return null;
}

export function matchRegionalChoice(qKey: Question["key"], text: string): FactValue | null {
  const clean = text.trim();
  if (!clean) return null;
  if (qKey === "subject") {
    if (/నా కోసం|నేను|माझ्यासाठी|मी|எனக்காக|நான்|ನನಗಾಗಿ|ನಾನು|আমার জন্য|আমি/.test(clean)) return "self";
    if (/కుటుంబ|నాన్న|అమ్మ|कुटुंब|आई|वडील|குடும்ப|அம்மா|அப்பா|ಕುಟುಂಬ|ತಾಯಿ|ತಂದೆ|পরিবার|মা|বাবা/.test(clean)) {
      return "other";
    }
  }
  if (qKey === "gender") {
    if (/మహిళ|స్త్రీ|महिला|स्त्री|பெண்|ಮಹಿಳೆ|মহিলা|নারী/.test(clean)) return "female";
    if (/పురుష|पुरुष|ஆண்|ಪುರುಷ|পুরুষ/.test(clean)) return "male";
  }
  return null;
}

/**
 * Picks the best available browser SpeechSynthesisVoice for a target Indian locale
 * (en-IN, hi-IN, te-IN, mr-IN, ta-IN, kn-IN, bn-IN) and speaker preference.
 */
export function pickBrowserVoice(
  voices: SpeechSynthesisVoice[],
  locale: string,
  speaker: "ishita" | "ratan",
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const target = locale.toLowerCase();
  const baseLang = target.split("-")[0] ?? target;
  const exact = voices.filter((v) => v.lang.toLowerCase() === target);
  const prefix = voices.filter(
    (v) => v.lang.toLowerCase().startsWith(`${baseLang}-`) || v.lang.toLowerCase() === baseLang,
  );
  const pool = exact.length ? exact : prefix;
  if (!pool.length) return null;

  const preferMale = speaker === "ratan";
  const gendered = pool.find((v) => {
    const n = v.name.toLowerCase();
    return preferMale
      ? /male|ravi|prabhat|valluvar|madhur|mohan|gagan|bashkar|manohar|hemant/.test(n)
      : /female|heera|swara|shruti|pallavi|sapna|tanishaa|aarohi|neerja|kalpana|lekha/.test(n);
  });
  return gendered ?? pool[0] ?? null;
}
