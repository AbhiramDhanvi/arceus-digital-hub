// Needs-first, deterministic interview. Works with no AI at all.
import { SCHEMES, UNKNOWN, evaluateAll, findSchemeByName, neededFacts, schemesForGoal, type FactKey, type Facts, type FactValue, type Goal, type Result } from "./eligibility";
import { normalize, parseAge, parseAnnualAmount, parseMonthlyAmount, parseNumber, parseYesNo, isApprox } from "./parse";

export type UiLang = "en" | "hi";
export interface Choice { value: FactValue; en: string; hi: string }
export interface Question { key: FactKey | "goal"; kind: "goal" | "yesno" | "age" | "money" | "monthly" | "annual" | "pct" | "count" | "choice"; en: [string, string]; hi: [string, string]; options: Choice[] }

const YN: Choice[] = [{ value: true, en: "Yes", hi: "हाँ" }, { value: false, en: "No", hi: "नहीं" }, { value: UNKNOWN, en: "Don't know", hi: "पता नहीं" }];
export const GOALS: { goal: Goal; en: string; hi: string; re: RegExp }[] = [
  { goal: "farming", en: "Farming & crops", hi: "खेती और फसल", re: /farm|kisan|crop|kheti|agri|खेती|किसान|फसल/ },
  { goal: "health", en: "Health cover", hi: "स्वास्थ्य बीमा / इलाज", re: /health|hospital|treatment|ilaj|इलाज|अस्पताल|स्वास्थ्य|ayushman|आयुष्मान/ },
  { goal: "insurance", en: "Life / accident insurance", hi: "जीवन / दुर्घटना बीमा", re: /insurance|bima|बीमा|accident|life cover/ },
  { goal: "pension", en: "Pension", hi: "पेंशन", re: /pension|पेंशन|retire|old age|budhap|बुढ़ाप/ },
  { goal: "business", en: "Business loan", hi: "व्यापार के लिए लोन", re: /business|loan|shop|dukan|vyapar|व्यापार|दुकान|लोन|कारोबार|ऋण/ },
  { goal: "lpg", en: "Cooking gas (LPG)", hi: "रसोई गैस (LPG)", re: /gas|lpg|cylinder|सिलेंडर|गैस|ujjwala|उज्ज्वला/ },
  { goal: "education", en: "Scholarship / studies", hi: "छात्रवृत्ति / पढ़ाई", re: /scholar|study|studies|college|school|student|padhai|chhatravritti|छात्रवृत्ति|पढ़ाई|स्कॉलरशिप|कॉलेज|स्कूल/ },
  { goal: "housing", en: "House / housing", hi: "घर / आवास", re: /house|housing|home|ghar|makaan|awas|घर|मकान|आवास/ },
  { goal: "savings", en: "Savings for a daughter", hi: "बेटी के लिए बचत", re: /daughter|girl child|beti|बेटी|बच्ची|savings|बचत/ },
];

/** [self wording, other-person wording] per language. */
export const QUESTIONS: Record<FactKey, Question> = {
  subject: { key: "subject", kind: "choice", en: ["Who is this check for?", "Who is this check for?"], hi: ["यह जाँच किसके लिए है?", "यह जाँच किसके लिए है?"], options: [{ value: "self", en: "Me", hi: "मेरे लिए" }, { value: "other", en: "A family member", hi: "परिवार के सदस्य के लिए" }] },
  age: { key: "age", kind: "age", en: ["How old are you (as on Aadhaar)?", "How old are they (as on Aadhaar)?"], hi: ["आपकी उम्र कितनी है (आधार के अनुसार)?", "उनकी उम्र कितनी है (आधार के अनुसार)?"], options: [{ value: UNKNOWN, en: "Don't know", hi: "पता नहीं" }] },
  age_approx: { key: "age_approx", kind: "yesno", en: ["", ""], hi: ["", ""], options: YN },
  gender: { key: "gender", kind: "choice", en: ["Is the applicant a woman or a man?", "Is the applicant a woman or a man?"], hi: ["आवेदक महिला हैं या पुरुष?", "आवेदक महिला हैं या पुरुष?"], options: [{ value: "female", en: "Woman", hi: "महिला" }, { value: "male", en: "Man", hi: "पुरुष" }, { value: "other", en: "Other", hi: "अन्य" }] },
  hasBankAccount: { key: "hasBankAccount", kind: "yesno", en: ["Do you have a savings account in a bank or post office?", "Do they have a savings account in a bank or post office?"], hi: ["क्या आपका बैंक या डाकघर में बचत खाता है?", "क्या उनका बैंक या डाकघर में बचत खाता है?"], options: YN },
  ownsCultivableLand: { key: "ownsCultivableLand", kind: "yesno", en: ["Does your family own cultivable land in its name?", "Does their family own cultivable land in its name?"], hi: ["क्या आपके परिवार के नाम पर खेती की ज़मीन है?", "क्या उनके परिवार के नाम पर खेती की ज़मीन है?"], options: YN },
  institutionalLand: { key: "institutionalLand", kind: "yesno", en: ["Is the land held by an institution (trust, company, society) rather than the family?", "Is the land held by an institution (trust, company, society) rather than the family?"], hi: ["क्या ज़मीन किसी संस्था (ट्रस्ट, कंपनी, सोसाइटी) के नाम है?", "क्या ज़मीन किसी संस्था (ट्रस्ट, कंपनी, सोसाइटी) के नाम है?"], options: YN },
  incomeTaxLastAY: { key: "incomeTaxLastAY", kind: "yesno", en: ["Did anyone in your family pay income tax in the last assessment year?", "Did anyone in their family pay income tax in the last assessment year?"], hi: ["क्या पिछले आकलन वर्ष में आपके परिवार में किसी ने इनकम टैक्स भरा?", "क्या पिछले आकलन वर्ष में उनके परिवार में किसी ने इनकम टैक्स भरा?"], options: YN },
  pensionMonthly: { key: "pensionMonthly", kind: "monthly", en: ["Does anyone in the family get a retirement pension? If yes, how much per month?", "Does anyone in their family get a retirement pension? If yes, how much per month?"], hi: ["क्या परिवार में किसी को रिटायरमेंट पेंशन मिलती है? अगर हाँ, तो हर महीने कितनी?", "क्या उनके परिवार में किसी को रिटायरमेंट पेंशन मिलती है? अगर हाँ, तो हर महीने कितनी?"], options: [{ value: 0, en: "No pension", hi: "कोई पेंशन नहीं" }, { value: UNKNOWN, en: "Don't know", hi: "पता नहीं" }] },
  govtEmployee: { key: "govtEmployee", kind: "yesno", en: ["Is anyone in the family a serving or retired government officer or employee?", "Is anyone in their family a serving or retired government officer or employee?"], hi: ["क्या परिवार में कोई सरकारी अधिकारी/कर्मचारी है या रहा है?", "क्या उनके परिवार में कोई सरकारी अधिकारी/कर्मचारी है या रहा है?"], options: YN },
  registeredProfessional: { key: "registeredProfessional", kind: "yesno", en: ["Is anyone a practising doctor, engineer, lawyer, CA or architect registered with a professional body?", "Is anyone a practising doctor, engineer, lawyer, CA or architect registered with a professional body?"], hi: ["क्या कोई पंजीकृत डॉक्टर, इंजीनियर, वकील, CA या आर्किटेक्ट के रूप में काम करता है?", "क्या कोई पंजीकृत डॉक्टर, इंजीनियर, वकील, CA या आर्किटेक्ट के रूप में काम करता है?"], options: YN },
  incomeTaxPayer: { key: "incomeTaxPayer", kind: "yesno", en: ["Are you an income-tax payer now or in the past?", "Are they an income-tax payer now or in the past?"], hi: ["क्या आप अभी या पहले इनकम टैक्स भरते हैं/थे?", "क्या वे अभी या पहले इनकम टैक्स भरते हैं/थे?"], options: YN },
  householdHasLpg: { key: "householdHasLpg", kind: "yesno", en: ["Does your household already have an LPG connection?", "Does their household already have an LPG connection?"], hi: ["क्या आपके घर में पहले से LPG कनेक्शन है?", "क्या उनके घर में पहले से LPG कनेक्शन है?"], options: YN },
  poorHousehold: { key: "poorHousehold", kind: "yesno", en: ["Is your household poor enough to sign the Ujjwala deprivation declaration?", "Is their household poor enough to sign the Ujjwala deprivation declaration?"], hi: ["क्या आपका परिवार गरीब है और उज्ज्वला का 'वंचना घोषणा पत्र' भर सकता है?", "क्या उनका परिवार गरीब है और उज्ज्वला का 'वंचना घोषणा पत्र' भर सकता है?"], options: YN },
  nonFarmEnterprise: { key: "nonFarmEnterprise", kind: "yesno", en: ["Is the loan for a small non-farm business or a farm-allied activity like dairy, poultry or beekeeping?", "Is the loan for a small non-farm business or a farm-allied activity like dairy, poultry or beekeeping?"], hi: ["क्या लोन छोटे गैर-कृषि व्यापार या डेयरी, मुर्गी पालन, मधुमक्खी पालन जैसे काम के लिए है?", "क्या लोन छोटे गैर-कृषि व्यापार या डेयरी, मुर्गी पालन, मधुमक्खी पालन जैसे काम के लिए है?"], options: YN },
  loanAmount: { key: "loanAmount", kind: "money", en: ["Roughly how much loan do you need?", "Roughly how much loan do they need?"], hi: ["लगभग कितना लोन चाहिए?", "उन्हें लगभग कितना लोन चाहिए?"], options: [{ value: 50000, en: "Up to ₹50,000", hi: "₹50,000 तक" }, { value: 500000, en: "Up to ₹5 lakh", hi: "₹5 लाख तक" }, { value: 1000000, en: "Up to ₹10 lakh", hi: "₹10 लाख तक" }, { value: 2000000, en: "₹10–20 lakh", hi: "₹10–20 लाख" }] },
  priorTarunRepaid: { key: "priorTarunRepaid", kind: "yesno", en: ["Have you already taken and fully repaid a Mudra 'Tarun' loan?", "Have they already taken and fully repaid a Mudra 'Tarun' loan?"], hi: ["क्या आपने पहले मुद्रा 'तरुण' लोन लेकर पूरा चुका दिया है?", "क्या उन्होंने पहले मुद्रा 'तरुण' लोन लेकर पूरा चुका दिया है?"], options: YN },
  pmjayListed: { key: "pmjayListed", kind: "yesno", en: ["Have you checked beneficiary.nha.gov.in and found your family listed for Ayushman?", "Have you checked beneficiary.nha.gov.in and found their family listed for Ayushman?"], hi: ["क्या आपने beneficiary.nha.gov.in पर देखा है कि आपका परिवार आयुष्मान सूची में है?", "क्या आपने beneficiary.nha.gov.in पर देखा है कि उनका परिवार आयुष्मान सूची में है?"], options: [{ value: true, en: "Yes, listed", hi: "हाँ, नाम है" }, { value: false, en: "Checked, not listed", hi: "देखा, नाम नहीं है" }, { value: UNKNOWN, en: "Haven't checked", hi: "अभी नहीं देखा" }] },
  cultivatesCrops: { key: "cultivatesCrops", kind: "yesno", en: ["Do you grow crops — as owner, tenant or sharecropper?", "Do they grow crops — as owner, tenant or sharecropper?"], hi: ["क्या आप खेती करते हैं — मालिक, किरायेदार या बटाईदार के रूप में?", "क्या वे खेती करते हैं — मालिक, किरायेदार या बटाईदार के रूप में?"], options: YN },
  pensionMonthly_approx: { key: "pensionMonthly_approx", kind: "yesno", en: ["", ""], hi: ["", ""], options: YN },
  ageOnAadhaar: { key: "ageOnAadhaar", kind: "age", en: ["What age does your Aadhaar card show (from the date of birth)? Please don't tell me the Aadhaar number.", "What age does their Aadhaar card show (from the date of birth)? Please don't tell me the Aadhaar number."], hi: ["आधार कार्ड पर लिखी जन्मतिथि के अनुसार आपकी उम्र कितनी है? आधार नंबर न बताएँ।", "आधार कार्ड पर लिखी जन्मतिथि के अनुसार उनकी उम्र कितनी है? आधार नंबर न बताएँ।"], options: [{ value: UNKNOWN, en: "Don't know", hi: "पता नहीं" }] },
  ageOnAadhaar_approx: { key: "ageOnAadhaar_approx", kind: "yesno", en: ["", ""], hi: ["", ""], options: YN },
  indianCitizen: { key: "indianCitizen", kind: "yesno", en: ["Are you an Indian citizen?", "Are they an Indian citizen?"], hi: ["क्या आप भारत के नागरिक हैं?", "क्या वे भारत के नागरिक हैं?"], options: YN },
  govtStaffGroupD: { key: "govtStaffGroupD", kind: "yesno", en: ["Is (or was) that government job Multi Tasking Staff, Class IV or Group D?", "Is (or was) that government job Multi Tasking Staff, Class IV or Group D?"], hi: ["क्या वह सरकारी नौकरी मल्टी टास्किंग स्टाफ, चतुर्थ श्रेणी या ग्रुप D की है/थी?", "क्या वह सरकारी नौकरी मल्टी टास्किंग स्टाफ, चतुर्थ श्रेणी या ग्रुप D की है/थी?"], options: YN },
  constitutionalPost: { key: "constitutionalPost", kind: "yesno", en: ["Does anyone in the family hold, or has held, a constitutional post, or been a minister, MP, MLA/MLC, mayor or district panchayat chairperson?", "Does anyone in their family hold, or has held, a constitutional post, or been a minister, MP, MLA/MLC, mayor or district panchayat chairperson?"], hi: ["क्या परिवार में कोई संवैधानिक पद, मंत्री, सांसद, विधायक/MLC, मेयर या ज़िला पंचायत अध्यक्ष है या रहा है?", "क्या उनके परिवार में कोई संवैधानिक पद, मंत्री, सांसद, विधायक/MLC, मेयर या ज़िला पंचायत अध्यक्ष है या रहा है?"], options: YN },
  cropNotified: { key: "cropNotified", kind: "yesno", en: ["Is your crop notified for your area this season on pmfby.gov.in?", "Is their crop notified for their area this season on pmfby.gov.in?"], hi: ["क्या pmfby.gov.in पर इस मौसम में आपके क्षेत्र के लिए आपकी फसल अधिसूचित है?", "क्या pmfby.gov.in पर इस मौसम में उनके क्षेत्र के लिए उनकी फसल अधिसूचित है?"], options: [{ value: true, en: "Yes, notified", hi: "हाँ, अधिसूचित है" }, { value: false, en: "Not notified", hi: "अधिसूचित नहीं" }, { value: UNKNOWN, en: "Haven't checked", hi: "अभी नहीं देखा" }] },
  cultivationProof: { key: "cultivationProof", kind: "yesno", en: ["Do you have a land record, or a tenancy/sharecropping document your state accepts?", "Do they have a land record, or a tenancy/sharecropping document their state accepts?"], hi: ["क्या आपके पास ज़मीन का रिकॉर्ड या राज्य द्वारा मान्य किरायेदारी/बटाई का दस्तावेज़ है?", "क्या उनके पास ज़मीन का रिकॉर्ड या राज्य द्वारा मान्य किरायेदारी/बटाई का दस्तावेज़ है?"], options: YN },
  familyIncomeAnnual: { key: "familyIncomeAnnual", kind: "annual", en: ["What is the family's total income in a year? (You can say a monthly figure too.)", "What is their family's total income in a year? (You can say a monthly figure too.)"], hi: ["परिवार की कुल सालाना आय कितनी है? (महीने की आय भी बता सकते हैं।)", "उनके परिवार की कुल सालाना आय कितनी है? (महीने की आय भी बता सकते हैं।)"], options: [{ value: UNKNOWN, en: "Don't know", hi: "पता नहीं" }] },
  familyIncomeAnnual_approx: { key: "familyIncomeAnnual_approx", kind: "yesno", en: ["", ""], hi: ["", ""], options: YN },
  socialCategory: { key: "socialCategory", kind: "choice", en: ["Which category: SC, ST, OBC or General?", "Which category: SC, ST, OBC or General?"], hi: ["कौन सी श्रेणी: SC, ST, OBC या सामान्य?", "कौन सी श्रेणी: SC, ST, OBC या सामान्य?"], options: [{ value: "sc", en: "SC", hi: "SC" }, { value: "st", en: "ST", hi: "ST" }, { value: "obc", en: "OBC", hi: "OBC" }, { value: "general", en: "General", hi: "सामान्य" }, { value: UNKNOWN, en: "Prefer not to say", hi: "नहीं बताना" }] },
  class12Top20: { key: "class12Top20", kind: "yesno", en: ["Were your Class XII marks above your board's cut-off (top 20% of passed students in your stream)?", "Were their Class XII marks above the board's cut-off (top 20% of passed students in the stream)?"], hi: ["क्या 12वीं के अंक आपके बोर्ड की कट-ऑफ (अपनी स्ट्रीम के पास छात्रों में टॉप 20%) से ऊपर थे?", "क्या उनके 12वीं के अंक बोर्ड की कट-ऑफ (स्ट्रीम के पास छात्रों में टॉप 20%) से ऊपर थे?"], options: YN },
  regularDegree: { key: "regularDegree", kind: "yesno", en: ["Are you in a regular degree course at a recognised college (not distance, correspondence or diploma)?", "Are they in a regular degree course at a recognised college (not distance, correspondence or diploma)?"], hi: ["क्या आप मान्यता प्राप्त कॉलेज में नियमित डिग्री कोर्स कर रहे हैं (दूरस्थ/पत्राचार/डिप्लोमा नहीं)?", "क्या वे मान्यता प्राप्त कॉलेज में नियमित डिग्री कोर्स कर रहे हैं (दूरस्थ/पत्राचार/डिप्लोमा नहीं)?"], options: YN },
  otherScholarship: { key: "otherScholarship", kind: "yesno", en: ["Do you already get another scholarship, fee waiver or fee reimbursement?", "Do they already get another scholarship, fee waiver or fee reimbursement?"], hi: ["क्या आपको पहले से कोई और छात्रवृत्ति, फीस माफ़ी या फीस वापसी मिलती है?", "क्या उन्हें पहले से कोई और छात्रवृत्ति, फीस माफ़ी या फीस वापसी मिलती है?"], options: YN },
  inClass8: { key: "inClass8", kind: "yesno", en: ["Is the student in Class VIII now?", "Is the student in Class VIII now?"], hi: ["क्या छात्र अभी कक्षा 8 में है?", "क्या छात्र अभी कक्षा 8 में है?"], options: YN },
  class7Marks: { key: "class7Marks", kind: "pct", en: ["What percentage did the student get in Class VII?", "What percentage did the student get in Class VII?"], hi: ["छात्र को कक्षा 7 में कितने प्रतिशत अंक मिले?", "छात्र को कक्षा 7 में कितने प्रतिशत अंक मिले?"], options: [{ value: UNKNOWN, en: "Don't know", hi: "पता नहीं" }] },
  schoolType: { key: "schoolType", kind: "choice", en: ["What kind of school is it?", "What kind of school is it?"], hi: ["स्कूल किस प्रकार का है?", "स्कूल किस प्रकार का है?"], options: [{ value: "govt", en: "Government / aided / local body", hi: "सरकारी / सहायता प्राप्त / स्थानीय निकाय" }, { value: "kvs_nvs_res", en: "KVS / Navodaya / residential", hi: "केवी / नवोदय / आवासीय" }, { value: "private", en: "Private", hi: "प्राइवेट" }, { value: UNKNOWN, en: "Don't know", hi: "पता नहीं" }] },
  livesUrban: { key: "livesUrban", kind: "yesno", en: ["Does the family live in a town or city (urban area)?", "Does their family live in a town or city (urban area)?"], hi: ["क्या परिवार शहर या कस्बे (शहरी क्षेत्र) में रहता है?", "क्या उनका परिवार शहर या कस्बे (शहरी क्षेत्र) में रहता है?"], options: YN },
  ownsPuccaHouse: { key: "ownsPuccaHouse", kind: "yesno", en: ["Does anyone in the family (husband, wife, unmarried children) own a pucca house anywhere in India?", "Does anyone in their family (husband, wife, unmarried children) own a pucca house anywhere in India?"], hi: ["क्या परिवार (पति, पत्नी, अविवाहित बच्चे) में किसी के नाम भारत में कहीं पक्का घर है?", "क्या उनके परिवार (पति, पत्नी, अविवाहित बच्चे) में किसी के नाम भारत में कहीं पक्का घर है?"], options: YN },
  govtHouse20y: { key: "govtHouse20y", kind: "yesno", en: ["Was the family given a house under any government housing scheme in the last 20 years?", "Was their family given a house under any government housing scheme in the last 20 years?"], hi: ["क्या पिछले 20 वर्षों में परिवार को किसी सरकारी आवास योजना में घर मिला है?", "क्या पिछले 20 वर्षों में उनके परिवार को किसी सरकारी आवास योजना में घर मिला है?"], options: YN },
  unorganisedWorker: { key: "unorganisedWorker", kind: "yesno", en: ["Do you work in the unorganised sector (e.g. daily wage, domestic, construction, farm labour, home-based work)?", "Do they work in the unorganised sector (e.g. daily wage, domestic, construction, farm labour, home-based work)?"], hi: ["क्या आप असंगठित क्षेत्र में काम करते हैं (जैसे दिहाड़ी, घरेलू, निर्माण, खेत मज़दूरी, घर से काम)?", "क्या वे असंगठित क्षेत्र में काम करते हैं (जैसे दिहाड़ी, घरेलू, निर्माण, खेत मज़दूरी, घर से काम)?"], options: YN },
  monthlyIncome: { key: "monthlyIncome", kind: "monthly", en: ["How much do you earn in a month?", "How much do they earn in a month?"], hi: ["आप महीने में कितना कमाते हैं?", "वे महीने में कितना कमाते हैं?"], options: [{ value: UNKNOWN, en: "Don't know", hi: "पता नहीं" }] },
  monthlyIncome_approx: { key: "monthlyIncome_approx", kind: "yesno", en: ["", ""], hi: ["", ""], options: YN },
  coveredNpsEsicEpfo: { key: "coveredNpsEsicEpfo", kind: "yesno", en: ["Are you covered by NPS, ESIC or EPFO (PF)?", "Are they covered by NPS, ESIC or EPFO (PF)?"], hi: ["क्या आप NPS, ESIC या EPFO (PF) में शामिल हैं?", "क्या वे NPS, ESIC या EPFO (PF) में शामिल हैं?"], options: YN },
  traditionalTrade: { key: "traditionalTrade", kind: "yesno", en: ["Are you a self-employed artisan in a traditional trade — carpenter, boat maker, blacksmith, potter, goldsmith, sculptor, cobbler, mason, tailor, barber, washerman, basket/mat maker, doll/toy maker, garland maker, fishing-net maker, locksmith, armourer or hammer/tool kit maker?", "Are they a self-employed artisan in one of the 18 traditional trades (carpenter, potter, tailor, barber, cobbler, mason, etc.)?"], hi: ["क्या आप पारंपरिक काम करने वाले स्व-रोज़गार कारीगर हैं — बढ़ई, नाव बनाने वाले, लोहार, कुम्हार, सुनार, मूर्तिकार, मोची, राजमिस्त्री, दर्ज़ी, नाई, धोबी, टोकरी/चटाई, खिलौना, माला, मछली जाल, ताला, अस्त्र या औज़ार बनाने वाले?", "क्या वे 18 पारंपरिक कामों (बढ़ई, कुम्हार, दर्ज़ी, नाई, मोची, राजमिस्त्री आदि) में स्व-रोज़गार कारीगर हैं?"], options: YN },
  govtLoan5y: { key: "govtLoan5y", kind: "choice", en: ["In the last 5 years, did you take a PMEGP, PM SVANidhi or MUDRA loan?", "In the last 5 years, did they take a PMEGP, PM SVANidhi or MUDRA loan?"], hi: ["पिछले 5 साल में क्या आपने PMEGP, PM स्वनिधि या मुद्रा लोन लिया?", "पिछले 5 साल में क्या उन्होंने PMEGP, PM स्वनिधि या मुद्रा लोन लिया?"], options: [{ value: "none", en: "No such loan", hi: "ऐसा कोई लोन नहीं" }, { value: "repaid_mudra_svanidhi", en: "MUDRA/SVANidhi, fully repaid", hi: "मुद्रा/स्वनिधि, पूरा चुका दिया" }, { value: "other", en: "Yes, not repaid / PMEGP", hi: "हाँ, बाकी है / PMEGP" }, { value: UNKNOWN, en: "Don't know", hi: "पता नहीं" }] },
  familyInPmv: { key: "familyInPmv", kind: "yesno", en: ["Is your husband/wife or an unmarried child already registered under PM Vishwakarma?", "Is their spouse or an unmarried child already registered under PM Vishwakarma?"], hi: ["क्या आपके पति/पत्नी या अविवाहित बच्चे पहले से PM विश्वकर्मा में पंजीकृत हैं?", "क्या उनके पति/पत्नी या अविवाहित बच्चे पहले से PM विश्वकर्मा में पंजीकृत हैं?"], options: YN },
  govtServiceFamily: { key: "govtServiceFamily", kind: "yesno", en: ["Is anyone in your family (husband, wife, unmarried children) in government service?", "Is anyone in their family (spouse, unmarried children) in government service?"], hi: ["क्या आपके परिवार (पति, पत्नी, अविवाहित बच्चे) में कोई सरकारी नौकरी में है?", "क्या उनके परिवार (पति/पत्नी, अविवाहित बच्चे) में कोई सरकारी नौकरी में है?"], options: YN },
  girlAge: { key: "girlAge", kind: "age", en: ["How old is the girl?", "How old is the girl?"], hi: ["बच्ची की उम्र कितनी है?", "बच्ची की उम्र कितनी है?"], options: [{ value: UNKNOWN, en: "Don't know", hi: "पता नहीं" }] },
  girlHasSsy: { key: "girlHasSsy", kind: "yesno", en: ["Does she already have a Sukanya Samriddhi account?", "Does she already have a Sukanya Samriddhi account?"], hi: ["क्या उसका पहले से सुकन्या समृद्धि खाता है?", "क्या उसका पहले से सुकन्या समृद्धि खाता है?"], options: YN },
  familySsyGirls: { key: "familySsyGirls", kind: "count", en: ["How many other girls in the family already have a Sukanya account?", "How many other girls in the family already have a Sukanya account?"], hi: ["परिवार की कितनी और बेटियों का पहले से सुकन्या खाता है?", "परिवार की कितनी और बेटियों का पहले से सुकन्या खाता है?"], options: [{ value: 0, en: "None", hi: "कोई नहीं" }, { value: 1, en: "One", hi: "एक" }, { value: 2, en: "Two or more", hi: "दो या ज़्यादा" }] },
  streetVendor: { key: "streetVendor", kind: "yesno", en: ["Do you sell goods or offer services on the street, footpath or by moving around (street vendor)?", "Do they sell goods or offer services on the street, footpath or by moving around (street vendor)?"], hi: ["क्या आप सड़क, फुटपाथ या घूम-घूमकर सामान बेचते या सेवा देते हैं (रेहड़ी-पटरी)?", "क्या वे सड़क, फुटपाथ या घूम-घूमकर सामान बेचते या सेवा देते हैं (रेहड़ी-पटरी)?"], options: YN },
  vendingCertificate: { key: "vendingCertificate", kind: "yesno", en: ["Do you have a Certificate of Vending or a Letter of Recommendation from the municipality?", "Do they have a Certificate of Vending or a Letter of Recommendation from the municipality?"], hi: ["क्या आपके पास नगर निकाय का वेंडिंग प्रमाणपत्र या सिफ़ारिश पत्र है?", "क्या उनके पास नगर निकाय का वेंडिंग प्रमाणपत्र या सिफ़ारिश पत्र है?"], options: YN },
  greenfield: { key: "greenfield", kind: "yesno", en: ["Is this a new enterprise being set up for the first time?", "Is this a new enterprise being set up for the first time?"], hi: ["क्या यह पहली बार शुरू हो रहा नया उद्यम है?", "क्या यह पहली बार शुरू हो रहा नया उद्यम है?"], options: YN },
};
export const GOAL_QUESTION: Question = { key: "goal", kind: "goal", en: ["What do you need help with? You can also name a scheme.", ""], hi: ["आपको किस चीज़ में मदद चाहिए? आप किसी योजना का नाम भी बोल सकते हैं।", ""], options: GOALS.map(g => ({ value: g.goal, en: g.en, hi: g.hi })) };

export function questionText(q: Question, lang: UiLang, subject: FactValue | undefined) { return q[lang][subject === "other" ? 1 : 0] || q[lang][0]; }

export interface Interview { goal: Goal | null; schemeIds: string[]; facts: Facts; conflicts: FactKey[]; fromAI: Partial<Record<FactKey, true>> }
export const newInterview = (): Interview => ({ goal: null, schemeIds: [], facts: {}, conflicts: [], fromAI: {} });

/** Facts used for the verdict: conflicted facts are removed until confirmed. */
export function effectiveFacts(iv: Interview): Facts {
  const f = { ...iv.facts };
  for (const k of iv.conflicts) delete f[k];
  return f;
}

/** Pick schemes from a goal choice or a free-text need / scheme name. */
export function chooseNeed(iv: Interview, text: string, goal?: Goal): Interview | null {
  const named = goal ? null : findSchemeByName(text);
  if (named) return { ...iv, goal: named.goals[0] ?? null, schemeIds: [named.id] };
  const g = goal ?? GOALS.find(x => x.re.test(normalize(text)))?.goal;
  if (!g) return null;
  return { ...iv, goal: g, schemeIds: schemesForGoal(g).map(s => s.id) };
}

export function nextQuestion(iv: Interview): Question | null {
  if (!iv.schemeIds.length) return GOAL_QUESTION;
  if (iv.facts.subject === undefined) return QUESTIONS.subject;
  if (iv.conflicts.length) return QUESTIONS[iv.conflicts[0]!];
  const f = effectiveFacts(iv);
  for (const id of iv.schemeIds) {
    const s = SCHEMES.find(x => x.id === id)!;
    const k = neededFacts(s, f)[0];
    if (k) return QUESTIONS[k];
  }
  return null;
}

export function results(iv: Interview): Result[] { return evaluateAll(effectiveFacts(iv), iv.schemeIds); }

export type Parsed = { ok: true; facts: Facts } | { ok: false };
/** Deterministic parse of an answer to `q`. */
export function parseAnswer(q: Question, text: string, lang: UiLang): Parsed {
  if (q.key === "goal") return { ok: false };
  const t = normalize(text);
  const opt = q.options.find(o => t === normalize(o.en) || t === normalize(o.hi));
  if (opt) return { ok: true, facts: { [q.key]: opt.value } as Facts };
  switch (q.kind) {
    case "yesno": { const v = parseYesNo(text); return v === null ? { ok: false } : { ok: true, facts: { [q.key]: v === "unknown" ? UNKNOWN : v } as Facts }; }
    case "age": {
      if (parseYesNo(text) === "unknown") return { ok: true, facts: { [q.key]: UNKNOWN } as Facts };
      const a = parseAge(text); return a ? { ok: true, facts: { [q.key]: a.value, ...(a.approx && q.key !== "girlAge" ? { [`${q.key}_approx`]: true } : {}) } as Facts } : { ok: false };
    }
    case "money": { const n = parseNumber(text); return n === null ? { ok: false } : { ok: true, facts: { [q.key]: n } as Facts }; }
    case "pct": case "count": {
      if (parseYesNo(text) === "unknown") return { ok: true, facts: { [q.key]: UNKNOWN } as Facts };
      const n = parseNumber(text) ?? (q.kind === "count" && parseYesNo(text) === false ? 0 : null);
      return n === null || n < 0 || (q.kind === "pct" && n > 100) ? { ok: false } : { ok: true, facts: { [q.key]: n } as Facts };
    }
    case "monthly": case "annual": {
      if (parseYesNo(text) === "unknown") return { ok: true, facts: { [q.key]: UNKNOWN } as Facts };
      const m = q.kind === "annual" ? parseAnnualAmount(text) : parseMonthlyAmount(text);
      return m ? { ok: true, facts: { [q.key]: m.value, ...(m.approx ? { [`${q.key}_approx`]: true } : {}) } as Facts } : { ok: false };
    }
    case "choice": {
      if (q.key === "gender") { if (/female|woman|mahila|महिला|औरत|स्त्री/.test(t)) return { ok: true, facts: { gender: "female" } }; if (/\bmale\b|\bman\b|purush|पुरुष|आदमी/.test(t)) return { ok: true, facts: { gender: "male" } }; }
      if (q.key === "socialCategory") { const m = t.match(/\b(sc|st|obc)\b|general|samanya|सामान्य|अनुसूचित जाति|अनुसूचित जनजाति|पिछड़ा/); if (m) return { ok: true, facts: { socialCategory: m[1] ?? (/जनजाति/.test(m[0]) ? "st" : /जाति/.test(m[0]) ? "sc" : /पिछड़ा/.test(m[0]) ? "obc" : "general") } }; }
      if (q.key === "schoolType") { if (/kendriya|kvs|navodaya|nvs|residential|केंद्रीय|नवोदय|आवासीय/.test(t)) return { ok: true, facts: { schoolType: "kvs_nvs_res" } }; if (/private|प्राइवेट|निजी/.test(t)) return { ok: true, facts: { schoolType: "private" } }; if (/government|govt|sarkari|aided|सरकारी/.test(t)) return { ok: true, facts: { schoolType: "govt" } }; }
      if (q.key === "govtLoan5y") { const yn = parseYesNo(text); if (yn === false) return { ok: true, facts: { govtLoan5y: "none" } }; if (yn === "unknown") return { ok: true, facts: { govtLoan5y: UNKNOWN } }; if (/repaid|chuka|चुका/.test(t) && !/not|nahi|नहीं/.test(t)) return { ok: true, facts: { govtLoan5y: "repaid_mudra_svanidhi" } }; }
      if (q.key === "subject") { if (/\b(me|myself|self|mere|main)\b|मेरे|मैं|ख़ुद|खुद/.test(t)) return { ok: true, facts: { subject: "self" } }; if (/family|mother|father|wife|husband|son|daughter|maa|papa|परिवार|माँ|पिता|पत्नी|पति|बेटा|बेटी/.test(t)) return { ok: true, facts: { subject: "other" } }; }
      return { ok: false };
    }
  }
  void lang; return { ok: false };
}

/** Free-text age statement on any question ("I am 38"), used for contradiction checks. */
export function statedAge(text: string): { value: number; approx: boolean } | null {
  const t = normalize(text);
  const m = t.match(/(?:i am|i'm|age is|age|umar|umra|उम्र|आयु)\D{0,12}(\d{1,3})|(\d{1,3})\s*(?:years|yrs|saal|साल|वर्ष)/);
  const v = m ? Number(m[1] ?? m[2]) : NaN;
  return Number.isFinite(v) && v > 0 && v < 121 ? { value: v, approx: isApprox(text) } : null;
}

/** Apply facts. Explicit edits overwrite; implicit restatements that differ create a conflict. */
export function applyFacts(iv: Interview, found: Facts, opts: { explicit?: boolean; fromAI?: boolean } = {}): Interview {
  const facts: Facts = { ...iv.facts };
  let conflicts = iv.conflicts.filter(k => !(k in found));
  const fromAI = { ...iv.fromAI };
  for (const [k, v] of Object.entries(found) as [FactKey, FactValue][]) {
    const prev = iv.facts[k];
    if (!opts.explicit && prev !== undefined && prev !== UNKNOWN && v !== UNKNOWN && prev !== v && !iv.conflicts.includes(k) && !k.endsWith("_approx")) {
      conflicts = [...conflicts, k]; // keep old value but drop from verdict until confirmed
      continue;
    }
    facts[k] = v;
    const ak = `${k}_approx` as FactKey;
    if (!k.endsWith("_approx") && ak in QUESTIONS && !(ak in found)) delete facts[ak];
    if (opts.fromAI) fromAI[k] = true; else delete fromAI[k];
  }
  return { ...iv, facts, conflicts, fromAI };
}
export function skip(iv: Interview, key: FactKey): Interview { return applyFacts(iv, { [key]: UNKNOWN } as Facts, { explicit: true }); }
