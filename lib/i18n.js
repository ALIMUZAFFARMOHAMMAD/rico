// HiTony i18n — languages, UI strings, helpers.
// Used by both client pages and API routes (language names for prompts).

export const LANGS = {
  en: { native: "English",  name: "English", speech: "en-US" },
  hi: { native: "हिन्दी",    name: "Hindi",   speech: "hi-IN" },
  te: { native: "తెలుగు",   name: "Telugu",  speech: "te-IN" },
  es: { native: "Español",  name: "Spanish", speech: "es-ES" },
};

export const DEFAULT_LANG = "en";

const STRINGS = {
  en: {
    call: "📞 CALL",
    signIn: "SIGN IN",
    banner: "🤍 SIGN IN SO TONY REMEMBERS YOU!",
    join: "JOIN!",
    placeholder: "Say something to Tony...",
    send: "SEND! →",
    thinking: "TONY IS THINKING...",
    revealTitle: "✦ TONY HAS READ YOU ✦",
    revealSub: "See your full personality reveal & career matches",
    revealBtn: "REVEAL! →",
    keepTalking: "← KEEP TALKING TO TONY",
    saved: "✓ RESULTS SAVED TO YOUR PROFILE",
    loadingMsgs: ["Tony is thinking...","Reading between the lines...","Mapping your personality...","Finding your career matches...","Almost ready..."],
    // voice page
    back: "← BACK",
    callTony: "CALL TONY",
    ready: "🔊 READY",
    loadingVoices: "LOADING...",
    yourPerson: "YOUR PERSON. ALWAYS.",
    stIdle: "TAP TO CALL TONY!",
    stConnecting: "CALLING...",
    stActive: "PAUSED — TAP ▶ TO RESUME",
    stListening: "I'M LISTENING — JUST TALK!",
    stThinking: "HMMMM...",
    stSpeaking: "TONY SAYS...",
    stEnded: "CALL ENDED",
    callBtn: "📞 CALL TONY!",
    ringing: "☎ RINGING...",
    callAgain: "CALL AGAIN!",
    chatBtn: "CHAT →",
    tapBelow: "TAP THE BUTTON BELOW TO START!",
    waiting: "TONY IS WAITING FOR YOUR CALL!",
    speakBtn: "RESUME",
    doneBtn: "DONE",
    useChrome: "Use Chrome for voice.",
    connIssue: "Connection issue",
    noConnect: "Could not connect.",
    noVoice: "No voice for this language on your device — Tony will reply as text during the call.",
    // computer display
    knowsTitle: "TONY KNOWS YOU",
    remembersYou: "✓ TONY REMEMBERS YOU",
    signInMemory: "SIGN IN FOR MEMORY",
    moodLabel: "YOUR VIBE",
    moodUp: "UP!",
    moodFlat: "STEADY",
    moodDown: "HEAVY",
    controls: "CONTROLS",
    transcript: "TRANSCRIPT",
    shortcutHint: "Enter = send · / = type",
    voiceHuman: "✨ REAL VOICE",
    voiceClassic: "🤖 ROBO VOICE",
    voiceDisclosure: "Tony's voice is AI-generated from a human recording.",
  },
  hi: {
    call: "📞 कॉल",
    signIn: "साइन इन",
    banner: "🤍 साइन इन करो ताकि टोनी तुम्हें याद रखे!",
    join: "जुड़ो!",
    placeholder: "टोनी से कुछ कहो...",
    send: "भेजो! →",
    thinking: "टोनी सोच रहा है...",
    revealTitle: "✦ टोनी ने तुम्हें पढ़ लिया ✦",
    revealSub: "अपनी पूरी पर्सनैलिटी और करियर मैच देखो",
    revealBtn: "देखो! →",
    keepTalking: "← टोनी से बात जारी रखो",
    saved: "✓ नतीजे तुम्हारी प्रोफ़ाइल में सेव हो गए",
    loadingMsgs: ["टोनी सोच रहा है...","लाइनों के बीच पढ़ रहा है...","तुम्हारी पर्सनैलिटी मैप कर रहा है...","करियर मैच ढूंढ रहा है...","बस तैयार है..."],
    back: "← वापस",
    callTony: "टोनी को कॉल",
    ready: "🔊 तैयार",
    loadingVoices: "लोड हो रहा...",
    yourPerson: "तुम्हारा अपना। हमेशा।",
    stIdle: "कॉल करने के लिए टैप करो!",
    stConnecting: "कॉल हो रही है...",
    stActive: "रुका है — ▶ दबाओ",
    stListening: "सुन रहा हूँ — बोलो!",
    stThinking: "हम्म...",
    stSpeaking: "टोनी कह रहा है...",
    stEnded: "कॉल खत्म",
    callBtn: "📞 टोनी को कॉल करो!",
    ringing: "☎ घंटी बज रही है...",
    callAgain: "फिर कॉल करो!",
    chatBtn: "चैट →",
    tapBelow: "शुरू करने के लिए नीचे बटन दबाओ!",
    waiting: "टोनी तुम्हारे कॉल का इंतज़ार कर रहा है!",
    speakBtn: "जारी रखो",
    doneBtn: "हो गया",
    useChrome: "वॉइस के लिए Chrome इस्तेमाल करो।",
    connIssue: "कनेक्शन में दिक्कत",
    noConnect: "कनेक्ट नहीं हो पाया।",
    noVoice: "इस डिवाइस पर हिन्दी आवाज़ नहीं है — कॉल में टोनी टेक्स्ट में जवाब देगा।",
    knowsTitle: "टोनी तुम्हें जानता है",
    remembersYou: "✓ टोनी तुम्हें याद रखता है",
    signInMemory: "मेमोरी के लिए साइन इन करो",
    moodLabel: "तुम्हारा मूड",
    moodUp: "मस्त!",
    moodFlat: "ठीक-ठाक",
    moodDown: "भारी",
    controls: "कंट्रोल्स",
    transcript: "बातचीत",
    shortcutHint: "Enter = भेजो · / = लिखो",
    voiceHuman: "✨ असली आवाज़",
    voiceClassic: "🤖 रोबो आवाज़",
    voiceDisclosure: "टोनी की आवाज़ एक इंसानी रिकॉर्डिंग से AI द्वारा बनाई गई है।",
  },
  te: {
    call: "📞 కాల్",
    signIn: "సైన్ ఇన్",
    banner: "🤍 సైన్ ఇన్ చేయండి — టోనీ మిమ్మల్ని గుర్తుంచుకుంటాడు!",
    join: "చేరండి!",
    placeholder: "టోనీతో ఏదైనా చెప్పండి...",
    send: "పంపండి! →",
    thinking: "టోనీ ఆలోచిస్తున్నాడు...",
    revealTitle: "✦ టోనీ మిమ్మల్ని చదివేశాడు ✦",
    revealSub: "మీ పూర్తి పర్సనాలిటీ & కెరీర్ మ్యాచ్‌లు చూడండి",
    revealBtn: "చూడండి! →",
    keepTalking: "← టోనీతో మాట్లాడుతూ ఉండండి",
    saved: "✓ ఫలితాలు మీ ప్రొఫైల్‌లో సేవ్ అయ్యాయి",
    loadingMsgs: ["టోనీ ఆలోచిస్తున్నాడు...","లైన్ల మధ్య చదువుతున్నాడు...","మీ పర్సనాలిటీ మ్యాప్ చేస్తున్నాడు...","కెరీర్ మ్యాచ్‌లు వెతుకుతున్నాడు...","దాదాపు సిద్ధం..."],
    back: "← వెనక్కి",
    callTony: "టోనీకి కాల్",
    ready: "🔊 సిద్ధం",
    loadingVoices: "లోడ్ అవుతోంది...",
    yourPerson: "మీ సొంత మనిషి. ఎప్పటికీ.",
    stIdle: "కాల్ చేయడానికి టాప్ చేయండి!",
    stConnecting: "కాల్ అవుతోంది...",
    stActive: "పాజ్ — ▶ నొక్కండి",
    stListening: "వింటున్నాను — మాట్లాడండి!",
    stThinking: "హ్మ్...",
    stSpeaking: "టోనీ చెబుతున్నాడు...",
    stEnded: "కాల్ ముగిసింది",
    callBtn: "📞 టోనీకి కాల్ చేయండి!",
    ringing: "☎ రింగ్ అవుతోంది...",
    callAgain: "మళ్ళీ కాల్ చేయండి!",
    chatBtn: "చాట్ →",
    tapBelow: "మొదలుపెట్టడానికి కింది బటన్ నొక్కండి!",
    waiting: "టోనీ మీ కాల్ కోసం ఎదురుచూస్తున్నాడు!",
    speakBtn: "కొనసాగించండి",
    doneBtn: "అయింది",
    useChrome: "వాయిస్ కోసం Chrome వాడండి.",
    connIssue: "కనెక్షన్ సమస్య",
    noConnect: "కనెక్ట్ కాలేదు.",
    noVoice: "ఈ డివైస్‌లో తెలుగు వాయిస్ లేదు — కాల్‌లో టోనీ టెక్స్ట్‌గా జవాబిస్తాడు.",
    knowsTitle: "టోనీకి మీరు తెలుసు",
    remembersYou: "✓ టోనీ మిమ్మల్ని గుర్తుంచుకుంటాడు",
    signInMemory: "మెమరీ కోసం సైన్ ఇన్ చేయండి",
    moodLabel: "మీ మూడ్",
    moodUp: "సూపర్!",
    moodFlat: "ఓకే",
    moodDown: "బరువుగా",
    controls: "కంట్రోల్స్",
    transcript: "సంభాషణ",
    shortcutHint: "Enter = పంపు · / = టైప్",
    voiceHuman: "✨ నిజమైన వాయిస్",
    voiceClassic: "🤖 రోబో వాయిస్",
    voiceDisclosure: "టోనీ వాయిస్ ఒక మనిషి రికార్డింగ్ నుండి AI ద్వారా తయారైంది.",
  },
  es: {
    call: "📞 LLAMAR",
    signIn: "ENTRAR",
    banner: "🤍 ¡INICIA SESIÓN PARA QUE TONY TE RECUERDE!",
    join: "¡ÚNETE!",
    placeholder: "Dile algo a Tony...",
    send: "¡ENVIAR! →",
    thinking: "TONY ESTÁ PENSANDO...",
    revealTitle: "✦ TONY YA TE CONOCE ✦",
    revealSub: "Mira tu personalidad completa y tus carreras ideales",
    revealBtn: "¡REVELAR! →",
    keepTalking: "← SIGUE HABLANDO CON TONY",
    saved: "✓ RESULTADOS GUARDADOS EN TU PERFIL",
    loadingMsgs: ["Tony está pensando...","Leyendo entre líneas...","Mapeando tu personalidad...","Buscando tus carreras ideales...","Casi listo..."],
    back: "← VOLVER",
    callTony: "LLAMA A TONY",
    ready: "🔊 LISTO",
    loadingVoices: "CARGANDO...",
    yourPerson: "TU PERSONA. SIEMPRE.",
    stIdle: "¡TOCA PARA LLAMAR A TONY!",
    stConnecting: "LLAMANDO...",
    stActive: "EN PAUSA — TOCA ▶",
    stListening: "TE ESCUCHO — ¡HABLA!",
    stThinking: "HMMM...",
    stSpeaking: "TONY DICE...",
    stEnded: "LLAMADA TERMINADA",
    callBtn: "📞 ¡LLAMA A TONY!",
    ringing: "☎ SONANDO...",
    callAgain: "¡LLAMA OTRA VEZ!",
    chatBtn: "CHAT →",
    tapBelow: "¡TOCA EL BOTÓN DE ABAJO PARA EMPEZAR!",
    waiting: "¡TONY ESPERA TU LLAMADA!",
    speakBtn: "SEGUIR",
    doneBtn: "LISTO",
    useChrome: "Usa Chrome para la voz.",
    connIssue: "Problema de conexión",
    noConnect: "No se pudo conectar.",
    noVoice: "No hay voz en español en este dispositivo — Tony responderá como texto en la llamada.",
    knowsTitle: "TONY TE CONOCE",
    remembersYou: "✓ TONY TE RECUERDA",
    signInMemory: "INICIA SESIÓN PARA MEMORIA",
    moodLabel: "TU ÁNIMO",
    moodUp: "¡ARRIBA!",
    moodFlat: "ESTABLE",
    moodDown: "PESADO",
    controls: "CONTROLES",
    transcript: "TRANSCRIPCIÓN",
    shortcutHint: "Enter = enviar · / = escribir",
    voiceHuman: "✨ VOZ REAL",
    voiceClassic: "🤖 VOZ ROBOT",
    voiceDisclosure: "La voz de Tony es generada por IA a partir de una grabación humana.",
  },
};

export function t(lang, key) {
  return (STRINGS[lang] && STRINGS[lang][key]) ?? STRINGS.en[key] ?? key;
}

// ---- language preference: "auto" (default) or a fixed code ----

export function getStoredPref() {
  if (typeof window === "undefined") return "auto";
  const l = window.localStorage.getItem("hitony_lang");
  return LANGS[l] ? l : "auto";
}

export function storePref(v) {
  if (typeof window === "undefined") return;
  if (v === "auto" || LANGS[v]) window.localStorage.setItem("hitony_lang", v);
}

export function getDetectedLang() {
  if (typeof window === "undefined") return null;
  const l = window.localStorage.getItem("hitony_lang_detected");
  return LANGS[l] ? l : null;
}

export function storeDetectedLang(l) {
  if (typeof window !== "undefined" && LANGS[l]) window.localStorage.setItem("hitony_lang_detected", l);
}

// Back-compat aliases (older callers)
export const getStoredLang = () => { const p = getStoredPref(); return p === "auto" ? (getDetectedLang() || DEFAULT_LANG) : p; };
export const storeLang = storePref;

// ---- automatic language detection ----
// Scripts are definitive; romanized Hindi/Telugu and Spanish use word evidence.
// Returns a lang code, or null when unsure (caller should keep the current language).

const ES_WORDS = ["hola","gracias","cómo","estoy","qué","porque","trabajo","quiero","necesito","bien","muy","pero","también","tengo","está","soy","eres","hacer","tiempo","ayuda","hablar","amigo","vida","hoy","mañana","nuevo","empresa","puedo","dime","bueno"];
const HI_WORDS = ["hai","hain","nahi","nahin","kya","kyun","yaar","bhai","mujhe","mera","meri","tum","aap","kaise","kaisa","accha","acha","bahut","karna","karo","raha","rahi","hoon","hun","kuch","matlab","lekin","abhi","theek","thik","batao","chahiye","milega","naukri"];
const TE_WORDS = ["nenu","nuvvu","meeru","ela","emi","enti","unnanu","unnavu","bagunnanu","bagunnava","cheppu","chala","kani","ledu","undi","avunu","kaadu","eppudu","ekkada","kavali","chestunnanu","telusu","manchi","pani","udyogam"];
const EN_WORDS = ["the","is","are","was","what","how","you","my","want","need","work","today","good","have","not","but","and","this","that","with","about","feel","job","really","just"];

export function detectLang(text) {
  if (!text || typeof text !== "string") return null;
  if (/[ऀ-ॿ]/.test(text)) return "hi"; // Devanagari
  if (/[ఀ-౿]/.test(text)) return "te"; // Telugu script
  const count = (words) => { let c = 0; for (const w of words) { if (new RegExp("(^|[^a-záéíóúñü])" + w + "($|[^a-záéíóúñü])", "i").test(text)) c++; } return c; };
  const scores = {
    es: count(ES_WORDS) + (/[¿¡áéíóúñ]/i.test(text) ? 2 : 0),
    hi: count(HI_WORDS),
    te: count(TE_WORDS),
    en: count(EN_WORDS),
  };
  const [bestLang, bestScore] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return bestScore >= 2 ? bestLang : null; // unsure → stay in current language
}

// Prompt block shared by chat + voice APIs.
export function languagePrompt(langCode) {
  const lang = LANGS[langCode] || LANGS.en;
  return `LANGUAGE:
- The user's current language is ${lang.name}.
- Default every reply to natural, native ${lang.name} — never phrasing that reads like a translation.
- ALWAYS follow the user's LATEST message: if they switch to another language (English, Hindi, Telugu, Spanish), switch fully and reply in that language immediately — no need to mention the switch.
- If they MIX languages (Hinglish, Tenglish, Spanglish), mirror their exact mix — that's how friends talk.
- Keep any hidden JSON keys and values in English exactly as specified.`;
}
