/**
 * Local Rule-Based Triage Engine (Offline Mode)
 * Provides deterministic, offline clinical triage when internet connection is unavailable.
 * DO NOT claim Gemini AI works offline; clearly indicate "Offline Basic Triage".
 */

export const EMERGENCY_KEYWORDS = [
  'chest pain', 'severe breathing', 'difficulty breathing', 'unconsciousness',
  'unconscious', 'heavy bleeding', 'uncontrolled bleeding', 'severe allergic',
  'seizure', 'convulsion', 'head injury', 'snake bite', 'snakebite', 'venom',
  'poison', 'stroke', 'paralysis', 'severe facial swelling', 'lockjaw',
  'dental trauma', 'fractured jaw', 'can\'t swallow', 'cannot swallow'
];

export const PRIORITY_KEYWORDS = [
  'high fever', 'persistent vomiting', 'severe abdominal pain', 'fracture',
  'deep cut', 'abscess', 'dental abscess', 'broken tooth', 'chipped tooth',
  'loose tooth', 'jaw pain', 'severe toothache', 'dehydration', 'burn'
];

export function performOfflineTriage(userMessage, preferredLang = 'English') {
  const text = (userMessage || '').toLowerCase();

  const isEmergency = EMERGENCY_KEYWORDS.some(kw => text.includes(kw));
  const isPriority = !isEmergency && PRIORITY_KEYWORDS.some(kw => text.includes(kw));

  let category = 'ROUTINE';
  let categoryLabel = 'Routine Consultation';
  let urgency = 'Low';
  let badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';

  if (isEmergency) {
    category = 'EMERGENCY';
    categoryLabel = 'Emergency Care (Immediate Action Required)';
    urgency = 'Critical Emergency';
    badgeColor = 'bg-rose-50 text-rose-800 border-rose-300';
  } else if (isPriority) {
    category = 'PRIORITY';
    categoryLabel = 'Priority Consultation Recommended';
    urgency = 'Moderate';
    badgeColor = 'bg-amber-50 text-amber-800 border-amber-300';
  }

  let textResponse = '';

  if (preferredLang === 'Hindi') {
    if (category === 'EMERGENCY') {
      textResponse = `🚨 **ऑफ़लाइन बेसिक ट्राइएज (आपातकाल):**\n\nतत्काल चिकित्सा सहायता लें! तुरंत **108 एम्बुलेंस** पर कॉल करें या नजदीकी आपातकालीन केंद्र जाएं।\n• स्वयं दवा न लें।\n• आपातकालीन स्थिति में Golden Hour SOS बटन दबाएं।\n\n*(सूचना: यह स्थानीय नियम-आधारित बेसिक ट्राइएज है। जेमिनी एआई केवल ऑनलाइन रहने पर सक्रिय रहता है।)*`;
    } else if (category === 'PRIORITY') {
      textResponse = `⚠️ **ऑफ़लाइन बेसिक ट्राइएज (प्राथमिकता परामर्श):**\n\nआपके लक्षण जल्द ही डॉक्टर या दंत चिकित्सक के परामर्श की सलाह देते हैं।\n• नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) या सामुदायिक स्वास्थ्य केंद्र (CHC) जाएं।\n• ओपीडी पास बुक करने के लिए "बुक ओपीडी टोकन" का उपयोग करें (सिंक लंबित के रूप में सहेजा जाएगा)।\n\n*(सूचना: यह स्थानीय नियम-आधारित बेसिक ट्राइएज है।)*`;
    } else {
      textResponse = `🩺 **ऑफ़लाइन बेसिक ट्राइएज (नियमित परामर्श):**\n\nसामान्य स्वास्थ्य मार्गदर्शन:\n• पर्याप्त पानी पीएं और आराम करें।\n• यदि लक्षण 2 दिनों से अधिक समय तक बने रहते हैं, तो अपने नजदीकी PHC का दौरा करें।\n\n*(सूचना: यह स्थानीय नियम-आधारित बेसिक ट्राइएज है।)*`;
    }
  } else if (preferredLang === 'Telugu') {
    if (category === 'EMERGENCY') {
      textResponse = `🚨 **ఆఫ్‌లైన్ ప్రాథమిక ట్రియాజ్ (అత్యవసరం):**\n\nవెంటనే వైద్య సహాయం పొందండి! వెంటనే **108 అంబులెన్స్** కి కాల్ చేయండి లేదా సమీప అత్యవసర ఆసుపత్రికి వెళ్లండి.\n\n*(గమనిక: ఇది స్థానిక నిబంధనల ఆధారిత ట్రియాజ్. జెమినీ AI ఆన్‌లైన్‌లో ఉన్నప్పుడు మాత్రమే పనిచేస్తుంది.)*`;
    } else if (category === 'PRIORITY') {
      textResponse = `⚠️ **ఆఫ్‌లైన్ ప్రాథమిక ట్రియాజ్ (ప్రాధాన్యత సంప్రదింపు):**\n\nమీ లక్షణాలు త్వరలో వైద్యుడిని లేదా దంత వైద్యుడిని కలవాలని సూచిస్తున్నాయి.\n• సమీప PHC లేదా CHC ని సందర్శించండి.\n\n*(గమనిక: ఇది స్థానిక నిబంధనల ఆధారిత ఆఫ్‌లైన్ ట్రియాజ్.)*`;
    } else {
      textResponse = `🩺 **ఆఫ్‌లైన్ ప్రాథమిక ట్రియాజ్ (సాధారణ సంప్రదింపు):**\n\nసాధారణ ఆరోగ్య సూచన:\n• తగినంత విశ్రాంతి తీసుకోండి. పంటి నొప్పి లేదా సాధారణ జ్వరం ఉంటే సమీప PHC ని సంప్రదించండి.\n\n*(గమనిక: ఇది స్థానిక నిబంధనల ఆధారిత ఆఫ్‌లైన్ ట్రియాజ్.)*`;
    }
  } else if (preferredLang === 'Marathi') {
    if (category === 'EMERGENCY') {
      textResponse = `🚨 **ऑफलाइन बेसिक ट्रायज (आपत्कालीन):**\n\nत्वरित वैद्यकीय मदत घ्या! तत्काळ **१०८ रुग्णवाहिका** ला कॉल करा किंवा जवळच्या आपत्कालीन केंद्रात जा.\n\n*(टीप: हे स्थानिक नियमांवर आधारित ऑफलाइन ट्रायज आहे. जेमिनी एआय फक्त ऑनलाइन असताना कार्यरत असते.)*`;
    } else if (category === 'PRIORITY') {
      textResponse = `⚠️ **ऑफलाइन बेसिक ट्रायज (प्राधान्य सल्ला):**\n\nतुमची लक्षणे लवकरच डॉक्टरांचा किंवा दंतवैद्याचा सल्ला घेण्याची शिफारस करतात.\n• जवळच्या प्राथमिक किंवा समुदाय आरोग्य केंद्राला भेट द्या.\n\n*(टीप: हे स्थानिक नियमांवर आधारित ऑफलाइन ट्रायज आहे.)*`;
    } else {
      textResponse = `🩺 **ऑफलाइन बेसिक ट्रायज (नियमित सल्ला):**\n\nसामान्य आरोग्य मार्गदर्शन:\n• विश्रांती घ्या आणि स्वच्छ पाणी प्या. लक्षणे कायम राहिल्यास जवळच्या PHC ला भेट द्या.\n\n*(टीप: हे स्थानिक नियमांवर आधारित ऑफलाइन ट्रायज आहे.)*`;
    }
  } else {
    if (category === 'EMERGENCY') {
      textResponse = `🚨 **Offline Basic Triage (EMERGENCY):**\n\nSeek immediate medical assistance! Contact **108 Ambulance** immediately or go to the nearest emergency room.\n• Do not self-medicate.\n• Use the Golden Hour SOS beacon if transport is required.\n\n*(Notice: Offline Rule-Based Triage active. Gemini AI requires active internet connectivity.)*`;
    } else if (category === 'PRIORITY') {
      textResponse = `⚠️ **Offline Basic Triage (Priority Consultation Recommended):**\n\nYour symptoms suggest a prompt evaluation by a medical officer or dentist.\n• Visit your nearest Primary Health Centre (PHC) or CHC OPD.\n• You can create an OPD Token request offline (saved as Pending Sync).\n\n*(Notice: Offline Rule-Based Triage active. Gemini AI requires active internet connectivity.)*`;
    } else {
      textResponse = `🩺 **Offline Basic Triage (Routine Consultation):**\n\nGeneral rural healthcare guidance:\n• Rest, stay hydrated, and maintain good personal hygiene.\n• If symptoms persist for more than 48 hours, visit your local PHC.\n\n*(Notice: Offline Rule-Based Triage active. Gemini AI requires active internet connectivity.)*`;
    }
  }

  return {
    category,
    categoryLabel,
    urgency,
    badgeColor,
    reply: textResponse,
    isOfflineTriage: true,
    engineName: 'Offline Basic Rule Engine'
  };
}
