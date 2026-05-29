import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  Dimensions,
} from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  FadeInRight,
  FadeInLeft,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { Send, Mic, Cpu, Sparkles, Trash2 } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import ChatBubble from '../../components/ChatBubble';
import SiriModal from '../../components/SiriModal';
import GestureController from '../../components/GestureController';

export let _aiConfig: { provider: 'openai' | 'gemini' | 'claude' | 'groq' | 'local'; apiKey: string } = {
  provider: 'local',
  apiKey: '',
};

export const setAIConfig = (config: { provider: string; apiKey: string }) => {
  _aiConfig = config as any;
};

export const getAIConfig = () => _aiConfig;

export let _voiceReplyEnabled = false;
export const setVoiceReplyEnabled = (v: boolean) => { _voiceReplyEnabled = v; };

export let _wakeWordActive = true;   // always-on by default
export const setWakeWordActive = (v: boolean) => { _wakeWordActive = v; };

// ── Pending command bridge (used by Home quick-action chips) ──────────────────
let _pendingCommand: string | null = null;
export const setPendingCommand = (cmd: string) => { _pendingCommand = cmd; };
export const consumePendingCommand = (): string | null => {
  const cmd = _pendingCommand;
  _pendingCommand = null;
  return cmd;
};

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  time: string;
}

const getProviderLabel = (provider: string): string => {
  switch (provider) {
    case 'openai': return 'GPT-4o Mini';
    case 'gemini': return 'Gemini 2.0 Flash';
    case 'claude': return 'Claude';
    case 'groq': return 'Groq';
    default: return 'On-Device';
  }
};

const APP_URLS: Record<string, string> = {
  youtube: 'https://youtube.com',
  whatsapp: 'whatsapp://',
  telegram: 'tg://',
  instagram: 'instagram://',
  twitter: 'https://x.com',
  'x': 'https://x.com',
  google: 'https://google.com',
  gmail: 'https://mail.google.com',
  maps: 'https://maps.google.com',
  spotify: 'spotify://',
  netflix: 'nflx://',
  chrome: 'https://google.com',
  settings: 'app-settings:',
  camera: 'https://google.com',
  facebook: 'fb://',
  tiktok: 'tiktok://',
  linkedin: 'linkedin://',
};

const LANG_TTS_CODE: Record<string, string> = {
  en:'en-US', es:'es-ES', fr:'fr-FR', de:'de-DE', it:'it-IT', pt:'pt-BR', ar:'ar-SA',
  hi:'hi-IN', ja:'ja-JP', zh:'zh-CN', ko:'ko-KR', ru:'ru-RU', uk:'uk-UA', tr:'tr-TR',
  nl:'nl-NL', sv:'sv-SE', no:'nb-NO', da:'da-DK', fi:'fi-FI', pl:'pl-PL', cs:'cs-CZ',
  sk:'sk-SK', ro:'ro-RO', hu:'hu-HU', el:'el-GR', he:'he-IL', th:'th-TH', vi:'vi-VN',
  id:'id-ID', ms:'ms-MY', sw:'sw-KE', tl:'fil-PH', bn:'bn-BD', ur:'ur-PK', fa:'fa-IR',
  af:'af-ZA', am:'am-ET', ta:'ta-IN', ml:'ml-IN', si:'si-LK',
};

// Detect TTS language directly from text characters/words
const detectTtsLang = (text: string): string => {
  if (/[஀-௿]/.test(text)) return 'ta';   // Tamil script
  if (/[ഀ-ൿ]/.test(text)) return 'ml';   // Malayalam script
  if (/[඀-෿]/.test(text)) return 'si';   // Sinhala script
  if (/[一-鿿㐀-䶿]/.test(text)) return 'zh';
  if (/[぀-ゟ゠-ヿ]/.test(text)) return 'ja';
  if (/[가-힯]/.test(text)) return 'ko';
  if (/[ऀ-ॿ]/.test(text)) return 'hi';
  if (/[ঀ-৿]/.test(text)) return 'bn';
  if (/[؀-ۿ]/.test(text)) return 'ar';
  if (/[Ѐ-ӿ]/.test(text)) return 'ru';
  if (/[Ͱ-Ͽ]/.test(text)) return 'el';
  if (/[฀-๿]/.test(text)) return 'th';
  return _userLang; // fall back to user's set language
};

const speakText = (text: string) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const synth = (window as any).speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const clean = text.replace(/[*_~`#>]/g, '').replace(/\n+/g, '. ').replace(/\.{2,}/g, '.').slice(0, 600);
  const utter = new ((window as any).SpeechSynthesisUtterance)(clean);
  utter.rate = 1.0;
  utter.pitch = 1.05;
  utter.volume = _speechVolume;
  const ttsLang = detectTtsLang(text);
  const ttsCode = LANG_TTS_CODE[ttsLang] ?? 'en-US';
  utter.lang = ttsCode;

  const applyVoice = (voices: any[]) => {
    const v = voices.find((v: any) => v.lang === ttsCode)
      || voices.find((v: any) => v.lang?.startsWith(ttsCode.split('-')[0]))
      || voices.find((v: any) => /Google.*en|en-US.*Natural/i.test(v.name + v.lang))
      || voices.find((v: any) => v.lang?.startsWith('en'));
    if (v) utter.voice = v;
    synth.speak(utter);
  };

  // Voices may not be loaded yet — wait for voiceschanged if empty
  const voices = synth.getVoices?.() ?? [];
  if (voices.length > 0) {
    applyVoice(voices);
  } else {
    synth.addEventListener('voiceschanged', () => applyVoice(synth.getVoices?.() ?? []), { once: true });
    synth.speak(utter); // speak anyway with default voice
  }
};

export const stopSpeaking = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    (window as any).speechSynthesis?.cancel();
  }
};

// Torch stream (kept alive while torch is on)
let _torchStream: MediaStream | null = null;
// Voice reply volume (0–1)
let _speechVolume = 0.9;

// ── LANGUAGE SYSTEM ─────────────────────────────────────────────────────────
let _userLang = 'en';
export const setUserLang = (lang: string) => { _userLang = lang; };
export const getUserLang = () => _userLang;

const LANGS: Record<string, { name: string; flag: string; greet: string; ack: string; bye: string; thanks: string; dontKnow: string; }> = {
  en: { name: 'English',    flag: '🇺🇸', greet: 'Hello!',       ack: 'Got it.',        bye: 'Bye! 👋',              thanks: "You're welcome!",   dontKnow: "Not sure, but I can search that for you." },
  es: { name: 'Spanish',    flag: '🇪🇸', greet: '¡Hola!',       ack: 'Entendido.',     bye: '¡Hasta luego! 👋',     thanks: '¡De nada!',          dontKnow: 'No estoy seguro, pero puedo buscarlo.' },
  fr: { name: 'French',     flag: '🇫🇷', greet: 'Bonjour!',     ack: 'Compris.',       bye: 'Au revoir! 👋',         thanks: 'De rien!',           dontKnow: "Je ne suis pas sûr, mais je peux chercher." },
  de: { name: 'German',     flag: '🇩🇪', greet: 'Hallo!',       ack: 'Verstanden.',    bye: 'Tschüss! 👋',           thanks: 'Bitte!',             dontKnow: 'Nicht sicher, aber ich kann suchen.' },
  it: { name: 'Italian',    flag: '🇮🇹', greet: 'Ciao!',        ack: 'Capito.',        bye: 'Arrivederci! 👋',       thanks: 'Prego!',             dontKnow: 'Non sono sicuro, ma posso cercare.' },
  pt: { name: 'Portuguese', flag: '🇧🇷', greet: 'Olá!',         ack: 'Entendido.',     bye: 'Tchau! 👋',             thanks: 'De nada!',           dontKnow: 'Não tenho certeza, mas posso pesquisar.' },
  ar: { name: 'Arabic',     flag: '🌙',  greet: '!أهلاً',       ack: '.حسناً',          bye: '!مع السلامة 👋',        thanks: '!عفواً',             dontKnow: '.لست متأكداً، لكن يمكنني البحث' },
  hi: { name: 'Hindi',      flag: '🇮🇳', greet: 'नमस्ते!',       ack: 'समझ गया।',       bye: 'अलविदा! 👋',           thanks: 'कोई बात नहीं!',      dontKnow: 'निश्चित नहीं, लेकिन खोज सकता हूँ।' },
  ja: { name: 'Japanese',   flag: '🇯🇵', greet: 'こんにちは！',    ack: 'わかりました。',   bye: 'さようなら！ 👋',        thanks: 'どういたしまして！',   dontKnow: 'わかりませんが、検索できます。' },
  zh: { name: 'Chinese',    flag: '🇨🇳', greet: '你好！',         ack: '明白了。',        bye: '再见！ 👋',              thanks: '不客气！',            dontKnow: '不确定，但我可以帮你搜索。' },
  ko: { name: 'Korean',     flag: '🇰🇷', greet: '안녕하세요!',     ack: '알겠습니다.',     bye: '안녕히 가세요! 👋',      thanks: '천만에요!',            dontKnow: '확실하지 않지만 검색할 수 있어요.' },
  ru: { name: 'Russian',    flag: '🇷🇺', greet: 'Привет!',       ack: 'Понял.',         bye: 'Пока! 👋',              thanks: 'Пожалуйста!',        dontKnow: 'Не уверен, но могу поискать.' },
  uk: { name: 'Ukrainian',  flag: '🇺🇦', greet: 'Привіт!',       ack: 'Зрозумів.',      bye: 'Бувай! 👋',             thanks: 'Будь ласка!',        dontKnow: 'Не певний, але можу пошукати.' },
  tr: { name: 'Turkish',    flag: '🇹🇷', greet: 'Merhaba!',      ack: 'Anladım.',       bye: 'Güle güle! 👋',         thanks: 'Rica ederim!',       dontKnow: 'Emin değilim ama arayabilirim.' },
  nl: { name: 'Dutch',      flag: '🇳🇱', greet: 'Hallo!',        ack: 'Begrepen.',      bye: 'Tot ziens! 👋',         thanks: 'Graag gedaan!',      dontKnow: 'Niet zeker, maar ik kan zoeken.' },
  sv: { name: 'Swedish',    flag: '🇸🇪', greet: 'Hej!',          ack: 'Förstår.',       bye: 'Hej då! 👋',            thanks: 'Varsågod!',          dontKnow: 'Inte säker, men kan söka.' },
  no: { name: 'Norwegian',  flag: '🇳🇴', greet: 'Hei!',          ack: 'Forstått.',      bye: 'Ha det! 👋',            thanks: 'Ingen årsak!',       dontKnow: 'Ikke sikker, men kan søke.' },
  da: { name: 'Danish',     flag: '🇩🇰', greet: 'Hej!',          ack: 'Forstået.',      bye: 'Farvel! 👋',            thanks: 'Selv tak!',          dontKnow: 'Ikke sikker, men kan søge.' },
  fi: { name: 'Finnish',    flag: '🇫🇮', greet: 'Hei!',          ack: 'Ymmärsin.',      bye: 'Heippa! 👋',            thanks: 'Ole hyvä!',          dontKnow: 'En ole varma, mutta voin etsiä.' },
  pl: { name: 'Polish',     flag: '🇵🇱', greet: 'Cześć!',        ack: 'Rozumiem.',      bye: 'Do widzenia! 👋',       thanks: 'Nie ma za co!',      dontKnow: 'Nie jestem pewien, ale mogę poszukać.' },
  cs: { name: 'Czech',      flag: '🇨🇿', greet: 'Ahoj!',         ack: 'Rozumím.',       bye: 'Nashledanou! 👋',       thanks: 'Rádo se stalo!',     dontKnow: 'Nevím, ale mohu hledat.' },
  sk: { name: 'Slovak',     flag: '🇸🇰', greet: 'Ahoj!',         ack: 'Rozumiem.',      bye: 'Dovidenia! 👋',         thanks: 'Niet zač!',          dontKnow: 'Neviem, ale môžem hľadať.' },
  ro: { name: 'Romanian',   flag: '🇷🇴', greet: 'Salut!',        ack: 'Înțeles.',       bye: 'La revedere! 👋',       thanks: 'Cu plăcere!',        dontKnow: 'Nu știu sigur, dar pot căuta.' },
  hu: { name: 'Hungarian',  flag: '🇭🇺', greet: 'Szia!',         ack: 'Megértettem.',   bye: 'Viszlát! 👋',           thanks: 'Szívesen!',          dontKnow: 'Nem vagyok biztos, de kereshetek.' },
  el: { name: 'Greek',      flag: '🇬🇷', greet: 'Γεια σου!',     ack: 'Κατάλαβα.',      bye: 'Αντίο! 👋',             thanks: 'Παρακαλώ!',          dontKnow: 'Δεν είμαι σίγουρος, αλλά μπορώ να ψάξω.' },
  he: { name: 'Hebrew',     flag: '🇮🇱', greet: '!שלום',         ack: '.הבנתי',          bye: '!להתראות 👋',           thanks: '!בבקשה',             dontKnow: '.לא בטוח, אבל אוכל לחפש' },
  th: { name: 'Thai',       flag: '🇹🇭', greet: 'สวัสดี!',       ack: 'เข้าใจแล้ว',     bye: 'ลาก่อน! 👋',            thanks: 'ยินดีเลย!',           dontKnow: 'ไม่แน่ใจ แต่ค้นหาให้ได้' },
  vi: { name: 'Vietnamese', flag: '🇻🇳', greet: 'Xin chào!',     ack: 'Hiểu rồi.',      bye: 'Tạm biệt! 👋',          thanks: 'Không có gì!',       dontKnow: 'Không chắc, nhưng tôi có thể tìm kiếm.' },
  id: { name: 'Indonesian', flag: '🇮🇩', greet: 'Halo!',         ack: 'Mengerti.',      bye: 'Selamat tinggal! 👋',   thanks: 'Sama-sama!',         dontKnow: 'Tidak yakin, tapi bisa saya cari.' },
  ms: { name: 'Malay',      flag: '🇲🇾', greet: 'Helo!',         ack: 'Faham.',         bye: 'Selamat tinggal! 👋',   thanks: 'Sama-sama!',         dontKnow: 'Tidak pasti, tetapi boleh saya cari.' },
  sw: { name: 'Swahili',    flag: '🌍',  greet: 'Habari!',       ack: 'Nimeelewa.',     bye: 'Kwaheri! 👋',           thanks: 'Karibu!',            dontKnow: 'Sijui, lakini ninaweza kutafuta.' },
  tl: { name: 'Filipino',   flag: '🇵🇭', greet: 'Kumusta!',      ack: 'Naiintindihan.', bye: 'Paalam! 👋',            thanks: 'Walang anuman!',     dontKnow: 'Hindi sigurado, pero maaari kong hanapin.' },
  bn: { name: 'Bengali',    flag: '🇧🇩', greet: 'হ্যালো!',        ack: 'বুঝেছি।',        bye: 'বিদায়! 👋',            thanks: 'স্বাগতম!',           dontKnow: 'নিশ্চিত নই, তবে খুঁজে দিতে পারি।' },
  ur: { name: 'Urdu',       flag: '🇵🇰', greet: '!ہیلو',         ack: '.سمجھ گیا',       bye: '!خدا حافظ 👋',          thanks: '!خوش آمدید',         dontKnow: '.یقین سے نہیں، لیکن تلاش کر سکتا ہوں' },
  fa: { name: 'Persian',    flag: '🇮🇷', greet: '!سلام',         ack: '.فهمیدم',         bye: '!خداحافظ 👋',           thanks: '!خواهش می‌کنم',      dontKnow: '.مطمئن نیستم، اما می‌توانم جستجو کنم' },
  af: { name: 'Afrikaans',  flag: '🇿🇦', greet: 'Hallo!',        ack: 'Verstaan.',      bye: 'Totsiens! 👋',          thanks: 'Graag gedaan!',      dontKnow: 'Nie seker nie, maar kan soek.' },
  am: { name: 'Amharic',    flag: '🇪🇹', greet: 'ሰላም!',          ack: 'ገባኝ።',           bye: 'ቻው! 👋',               thanks: 'በደስታ!',             dontKnow: 'እርግጠኛ አይደለሁም፣ ግን ፈልጌ ልስጥ።' },
  ta: { name: 'Tamil',      flag: '🇮🇳', greet: 'வணக்கம்!',       ack: 'புரிந்தது.',       bye: 'விடைபெறுகிறேன்! 👋',   thanks: 'நன்றி!',             dontKnow: 'தெரியவில்லை, ஆனால் தேடி கண்டுபிடிக்கலாம்.' },
  ml: { name: 'Malayalam',  flag: '🇮🇳', greet: 'നമസ്കാരം!',      ack: 'മനസ്സിലായി.',     bye: 'വിട! 👋',               thanks: 'നന്ദി!',              dontKnow: 'ഉറപ്പില്ല, പക്ഷേ തിരയാം.' },
  si: { name: 'Sinhala',    flag: '🇱🇰', greet: 'ආයුබෝවන්!',      ack: 'තේරුණා.',          bye: 'ගිහින් එන්නම්! 👋',    thanks: 'ස්තූතියි!',          dontKnow: 'නිශ්චිත නැහැ, නමුත් සොයා දෙන්නම්.' },
};

const detectLang = (text: string): string => {
  if (/[一-鿿㐀-䶿]/.test(text)) return 'zh';
  if (/[぀-ゟ゠-ヿ]/.test(text)) return 'ja';
  if (/[가-힯]/.test(text)) return 'ko';
  if (/[ऀ-ॿ]/.test(text)) return 'hi';
  if (/[ঀ-৿]/.test(text)) return 'bn';
  if (/[؀-ۿ]/.test(text)) {
    if (/[پچگی]/.test(text)) return 'ur';
    if (/[پچی۰-۹]/.test(text)) return 'fa';
    return 'ar';
  }
  if (/[Ѐ-ӿ]/.test(text)) return /[іїєґ]/.test(text) ? 'uk' : 'ru';
  if (/[Ͱ-Ͽ]/.test(text)) return 'el';
  if (/[א-ת]/.test(text)) return 'he';
  if (/[฀-๿]/.test(text)) return 'th';
  if (/[ሀ-፿]/.test(text)) return 'am';
  if (/[஀-௿]/.test(text)) return 'ta';
  if (/[ഀ-ൿ]/.test(text)) return 'ml';
  if (/[඀-෿]/.test(text)) return 'si';
  const w = text.toLowerCase().split(/\s+/);
  const has = (arr: string[]) => arr.some(p => w.includes(p));
  if (has(['hola','gracias','cómo','estoy','quiero','necesito','buenos','buenas','qué','está','tiene','puede','también','español'])) return 'es';
  if (has(['bonjour','merci','oui','très','avec','pour','dans','cette','votre','nous','vous','ils','elles','suis','avoir','être','français'])) return 'fr';
  if (has(['hallo','danke','bitte','guten','nicht','können','müssen','haben','sein','werden','aber','auch','noch','schon','deutsch','über','für'])) return 'de';
  if (has(['ciao','grazie','prego','sono','come','dove','questo','quella','anche','però','quindi','italiano','molto','tutto','cosa'])) return 'it';
  if (has(['olá','obrigado','obrigada','sim','também','muito','mais','você','temos','aqui','agora','português','brasil'])) return 'pt';
  if (has(['merhaba','teşekkür','lütfen','evet','hayır','nasıl','türkçe','değil','için','gibi','daha','bir','bu','şu','çok'])) return 'tr';
  if (has(['hallo','dank','nee','goed','niet','ook','maar','wel','heel','nederlands','ben','kan','wil','heeft'])) return 'nl';
  if (has(['hej','tack','varsågod','är','det','till','att','men','också','mycket','svenska','jag','kan','ska'])) return 'sv';
  if (has(['hei','takk','ikke','er','til','norsk','og','men','også','mye','jeg','kan','vil','har'])) return 'no';
  if (has(['hej','tak','dansk','og','men','også','meget','jeg','kan','vil','har','ikke','det'])) return 'da';
  if (has(['kiitos','ole','hyvä','tässä','suomi','olen','voin','täällä','siellä','miksi','milloin'])) return 'fi';
  if (has(['cześć','dziękuję','proszę','tak','nie','jak','polsku','jestem','mam','czy','ale','już'])) return 'pl';
  if (has(['ahoj','děkuji','prosím','ano','ne','jak','česky','jsem','mám','proč','ale','ještě'])) return 'cs';
  if (has(['ahoj','ďakujem','prosím','áno','nie','ako','slovensky','som','mám','prečo','ale'])) return 'sk';
  if (has(['salut','mulțumesc','bine','este','sunt','acesta','românesc','pentru','care','mult'])) return 'ro';
  if (has(['szia','köszönöm','kérem','igen','nem','hogy','magyar','vagyok','van','mi','és','de'])) return 'hu';
  if (has(['kumusta','salamat','naman','talaga','pilipino','tagalog','mahal','oo','hindi','ngayon'])) return 'tl';
  if (has(['habari','asante','karibu','ndiyo','hapana','swahili','niko','kwamba','watu','sana'])) return 'sw';
  if (has(['halo','terima','kasih','ya','tidak','ini','itu','dengan','bahasa','indonesia','bisa'])) return 'id';
  if (has(['helo','terima','kasih','ya','tidak','ini','itu','dengan','bahasa','melayu','boleh'])) return 'ms';
  if (has(['xin','chào','cảm','ơn','vâng','này','đó','với','để','tiếng','việt','tôi','bạn'])) return 'vi';
  if (has(['hallo','dankie','baie','asseblief','ja','nee','is','die','het','van','en','afrikaans'])) return 'af';
  // Romanized Tamil
  if (has(['vanakkam','vanakam','nandri','romba','enna','epdi','seri','ponga','machan','thala','ayya','amma','anna','akka','da','di','tamizh','tamil'])) return 'ta';
  // Romanized Malayalam
  if (has(['namaskaram','namaskaaram','swagatham','nandi','stuthi','ente','entha','pinne','njaan','njan','chetta','chechi','malayalam','enthaa','evide'])) return 'ml';
  // Romanized Sinhala
  if (has(['ayubowan','bohoma','mama','kohomada','karunakarala','sinhala','sinhalese','ohoma','oyata','hamadama'])) return 'si';
  return 'en';
};

const LANG_SWITCH_MAP: Record<string, string> = {
  english:'en', spanish:'es', french:'fr', german:'de', italian:'it', portuguese:'pt',
  arabic:'ar', hindi:'hi', japanese:'ja', chinese:'zh', korean:'ko', russian:'ru',
  ukrainian:'uk', turkish:'tr', dutch:'nl', swedish:'sv', norwegian:'no', danish:'da',
  finnish:'fi', polish:'pl', czech:'cs', slovak:'sk', romanian:'ro', hungarian:'hu',
  greek:'el', hebrew:'he', thai:'th', vietnamese:'vi', indonesian:'id', malay:'ms',
  swahili:'sw', filipino:'tl', tagalog:'tl', bengali:'bn', urdu:'ur', persian:'fa',
  farsi:'fa', afrikaans:'af', amharic:'am', tamil:'ta', malayalam:'ml', sinhala:'si', sinhalese:'si',
};

const getProfile = (): { name: string; city: string } => {
  if (Platform.OS !== 'web') return { name: '', city: '' };
  try { return { name: '', city: '', ...JSON.parse(localStorage.getItem('riuka_profile_v1') || '{}') }; }
  catch { return { name: '', city: '' }; }
};

// Safe math evaluator (no eval)
const safeMath = (expr: string): number | null => {
  try {
    // Allow digits, operators, spaces, dots, parens
    const cleaned = expr.replace(/\s/g, '');
    if (!/^[\d+\-*/().%^]+$/.test(cleaned)) return null;
    // Replace ^ with ** for power
    const normalized = cleaned.replace(/\^/g, '**');
    // Use Function constructor as a safer eval alternative
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + normalized + ')')();
    if (typeof result === 'number' && isFinite(result)) return result;
    return null;
  } catch {
    return null;
  }
};

const tryExecuteCommand = async (text: string): Promise<string | null> => {
  const lower = text.toLowerCase().trim();

  // ── LANGUAGE SWITCHING ───────────────────────────────────────────────────
  const langSwitchMatch = lower.match(/^(?:speak|respond in|switch to|talk in|use|language|lang)\s+([a-z]+)$/)
    || lower.match(/^\/lang\s+([a-z]+)$/);
  if (langSwitchMatch) {
    const requested = langSwitchMatch[1].toLowerCase();
    const code = LANG_SWITCH_MAP[requested] || requested;
    const lang = LANGS[code];
    if (lang) {
      _userLang = code;
      if (Platform.OS === 'web') { try { localStorage.setItem('riuka_lang_v1', code); } catch {} }
      return `${lang.flag} ${lang.greet} I'll respond in ${lang.name} from now on. / Riuka speaks ${lang.name}! 🌐`;
    }
    return `Language "${requested}" not found. Try: Spanish, French, German, Japanese, Arabic, Hindi, Chinese, Korean, Russian, Turkish, Portuguese, Italian, Dutch, Swedish, Norwegian, Danish, Finnish, Polish, Ukrainian, Greek, Hebrew, Thai, Vietnamese, Indonesian, Swahili, Filipino, Bengali, Urdu, Persian, Romanian, Hungarian, Czech, Slovak, Afrikaans, Amharic`;
  }
  // reset language
  if (/^(?:reset language|back to english|english only|lang reset)$/.test(lower)) {
    _userLang = 'en';
    if (Platform.OS === 'web') { try { localStorage.removeItem('riuka_lang_v1'); } catch {} }
    return `🇺🇸 Switched back to English!`;
  }
  // list languages
  if (/^(?:what languages|list languages|languages|\/languages)$/.test(lower)) {
    return `🌐 I know ${Object.keys(LANGS).length} languages:\n\n${Object.values(LANGS).map(l => `${l.flag} ${l.name}`).join(' · ')}\n\nSay "speak [language]" to switch!`;
  }

  // ── TORCH / FLASHLIGHT ───────────────────────────────────────────────────
  // Accepts any order: "flash on", "on flash", "turn on flash", "flashlight off", etc.
  if (/(torch|flashlight|flash|light)\s*(on|off)|(on|off)\s*(torch|flashlight|flash|light)|(turn|switch)\s*(on|off)\s*(torch|flashlight|flash|light)|(turn|switch)\s*(the\s*)?(torch|flashlight|flash|light)\s*(on|off)/.test(lower)) {
    if (Platform.OS !== 'web') return '⚠️ Torch only works in the browser.';
    const wantOn = /\bon\b/.test(lower) && !/\boff\b/.test(lower);
    try {
      if (wantOn) {
        if (_torchStream) { _torchStream.getTracks().forEach(t => t.stop()); _torchStream = null; }
        const stream = await (navigator.mediaDevices as any).getUserMedia({
          video: { facingMode: { exact: 'environment' } },
        });
        const [track] = stream.getVideoTracks();
        const caps: any = (track as any).getCapabilities?.() ?? {};
        if (!caps.torch) {
          stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
          return '⚠️ Your device/browser does not support torch control.';
        }
        await (track as any).applyConstraints({ advanced: [{ torch: true }] });
        _torchStream = stream;
        return '🔦 Flashlight ON! Say "torch off" to turn it off.';
      } else {
        if (_torchStream) {
          _torchStream.getTracks().forEach(t => t.stop());
          _torchStream = null;
        }
        return '🔦 Flashlight OFF.';
      }
    } catch {
      return '⚠️ Cannot access camera/torch. Make sure you\'ve allowed camera permission.';
    }
  }

  // ── VOLUME CONTROL ───────────────────────────────────────────────────────
  // Accepts: "volume up", "up volume", "increase volume", "louder", "volume down", etc.
  if (/(volume\s*(up|down|max|min|mute|unmute|loud|quiet|high|low)|up\s*volume|down\s*volume|louder|quieter|mute|unmute|increase\s*(the\s*)?volume|decrease\s*(the\s*)?volume|turn\s*(up|down)\s*(the\s*)?volume|max\s*volume|silent\s*mode)/.test(lower)) {
    const isUp   = /(up|louder|increase|loud|high|max)/.test(lower);
    const isDown = /(down|quieter|decrease|quiet|low|min)/.test(lower);
    const isMute = /\bmute\b/.test(lower) && !/unmute/.test(lower);
    const isUnmute = /unmute/.test(lower);
    const isMax  = /\bmax\b/.test(lower);
    const isSilent = /silent/.test(lower);

    let newVol = _speechVolume;
    if (isMute || isSilent) { newVol = 0; }
    else if (isUnmute) { newVol = 0.8; }
    else if (isMax) { newVol = 1.0; }
    else if (isUp) { newVol = Math.min(1.0, _speechVolume + 0.2); }
    else if (isDown) { newVol = Math.max(0.1, _speechVolume - 0.2); }
    _speechVolume = newVol;
    if (Platform.OS === 'web') { try { localStorage.setItem('riuka_vol_v1', String(newVol)); } catch {} }

    const pct = Math.round(newVol * 100);
    const bar = '█'.repeat(Math.round(newVol * 10)) + '░'.repeat(10 - Math.round(newVol * 10));
    if (newVol === 0) return `🔇 Muted — voice replies silenced.\nSay "unmute" or "volume up" to restore.`;
    return `🔊 Volume: ${pct}%\n${bar}\n\nThis controls Riuka's voice reply volume.`;
  }

  // ── GESTURE MODE ─────────────────────────────────────────────────────────
  if (/^gesture\s*(mode)?\s*(on|off)$/.test(lower)) {
    const wantOn = lower.endsWith('on');
    if (Platform.OS === 'web') {
      try { localStorage.setItem('riuka_gesture_v1', wantOn ? '1' : '0'); } catch {}
    }
    return wantOn
      ? '🤚 Gesture mode ON! Wave your hand in front of the camera to activate voice. Allow camera permission when prompted.'
      : '🤚 Gesture mode OFF.';
  }

  // ── SCREEN WAKE LOCK ──────────────────────────────────────────────────────
  if (/^(screen|keep screen|wake lock|stay on|keep awake)\s*(on|off|awake|asleep)?$/.test(lower)) {
    const wantOn = !lower.includes('off') && !lower.includes('asleep');
    if (Platform.OS === 'web' && 'wakeLock' in navigator) {
      try {
        if (wantOn) {
          await (navigator as any).wakeLock.request('screen');
          return '📱 Screen will stay on while Riuka is open.';
        }
      } catch {}
    }
    return wantOn ? '📱 Screen wake lock requested (device permitting).' : '📱 Screen can now turn off normally.';
  }

  // ── WEATHER ──────────────────────────────────────────────────────────────
  const weatherMatch = lower.match(/^(?:weather|forecast|temp(?:erature)?)\s+(?:in\s+|for\s+)?(.+)$/)
    || lower.match(/^(?:what'?s?\s+(?:the\s+)?weather(?:\s+like)?(?:\s+in)?\s*)(.+)$/);
  if (weatherMatch || lower === 'weather') {
    const rawCity = weatherMatch ? weatherMatch[1].trim() : 'auto';
    const city = rawCity === 'auto' ? (getProfile().city || 'auto') : rawCity;
    try {
      const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      const current = data.current_condition[0];
      const area = data.nearest_area[0];
      const areaName = area.areaName[0].value;
      const country = area.country[0].value;
      const tempC = current.temp_C;
      const tempF = current.temp_F;
      const desc = current.weatherDesc[0].value;
      const feelsC = current.FeelsLikeC;
      const humidity = current.humidity;
      const windKmph = current.windspeedKmph;
      return `Weather in ${areaName}, ${country}:\n\n🌡 ${tempC}°C / ${tempF}°F — ${desc}\nFeels like: ${feelsC}°C\nHumidity: ${humidity}%\nWind: ${windKmph} km/h`;
    } catch {
      return `Could not fetch weather for "${city}". Check your connection.`;
    }
  }

  // ── CALCULATOR ───────────────────────────────────────────────────────────
  const calcMatch = lower.match(/^(?:calc(?:ulate)?|compute|solve)\s+(.+)$/)
    || lower.match(/^(?:what(?:'s|\s+is)\s+)?(.+[+\-*\/^%].+)$/);
  if (calcMatch) {
    const expr = calcMatch[1].trim();
    const result = safeMath(expr);
    if (result !== null) {
      return `${expr} = ${Number.isInteger(result) ? result : result.toFixed(6).replace(/\.?0+$/, '')}`;
    }
  }
  // Pure math expression typed directly (e.g. "5*8", "100/4")
  if (/^[\d\s+\-*\/().^%]+$/.test(lower) && /[+\-*\/^%]/.test(lower)) {
    const result = safeMath(lower);
    if (result !== null) {
      return `${lower.trim()} = ${Number.isInteger(result) ? result : result.toFixed(6).replace(/\.?0+$/, '')}`;
    }
  }

  // ── BATTERY ──────────────────────────────────────────────────────────────
  if (lower === 'battery' || lower.includes('battery level') || lower.includes('battery status')) {
    if (Platform.OS === 'web') {
      try {
        const nav = navigator as any;
        if (nav.getBattery) {
          const battery = await nav.getBattery();
          const pct = Math.round(battery.level * 100);
          const charging = battery.charging;
          const timeStr = charging
            ? battery.chargingTime === Infinity ? '' : ` — full in ~${Math.round(battery.chargingTime / 60)} min`
            : battery.dischargingTime === Infinity ? '' : ` — ~${Math.round(battery.dischargingTime / 60)} min left`;
          return `Battery: ${pct}% ${charging ? '⚡ Charging' : '🔋 Discharging'}${timeStr}`;
        } else {
          return 'Battery API not supported in this browser.';
        }
      } catch {
        return 'Could not read battery status.';
      }
    } else {
      return 'Battery status is available on the web version. On Android, check your status bar.';
    }
  }

  // ── TIMER ─────────────────────────────────────────────────────────────────
  const timerMatch = lower.match(/^timer\s+(\d+)\s*(min(?:utes?)?|sec(?:onds?)?|s|m)$/);
  if (timerMatch) {
    const amount = parseInt(timerMatch[1], 10);
    const unit = timerMatch[2];
    const isMinutes = unit.startsWith('m');
    const ms = isMinutes ? amount * 60000 : amount * 1000;
    const label = isMinutes ? `${amount} minute${amount !== 1 ? 's' : ''}` : `${amount} second${amount !== 1 ? 's' : ''}`;
    setTimeout(() => {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
        const perm = (window as any).Notification.permission;
        if (perm === 'granted') {
          new (window as any).Notification('Riuka — Timer Done', {
            body: `Your ${label} timer has finished!`,
            icon: '/favicon.ico',
          });
        } else {
          Alert.alert('Timer Done', `Your ${label} timer has finished!`, [{ text: 'OK' }]);
        }
      } else {
        Alert.alert('Timer Done', `Your ${label} timer has finished!`, [{ text: 'OK' }]);
      }
    }, ms);
    return `Timer set for ${label}. I'll notify you when it's done${Platform.OS === 'web' ? ' — even if you switch tabs' : ''}.`;
  }

  // ── ALARM ─────────────────────────────────────────────────────────────────
  if (lower.includes('alarm') || lower.includes('wake me')) {
    if (Platform.OS === 'android') {
      try {
        await Linking.openURL('android.intent.action.SET_ALARM');
        return 'Opening the Clock app to set an alarm...';
      } catch {
        try {
          await Linking.openURL('clock://');
          return 'Opening Clock app...';
        } catch {
          return 'Could not open the Clock app directly. Please open it manually.';
        }
      }
    } else {
      // Web — open an online alarm / clock
      await Linking.openURL('https://www.online-stopwatch.com/alarm-clock/');
      return 'Opening an online alarm clock for you.';
    }
  }

  // ── NOTES / REMINDERS ─────────────────────────────────────────────────────
  const noteMatch = lower.match(/^(?:note|remind me(?:\s+to)?|add note)\s+(.+)$/);
  if (noteMatch) {
    const noteText = noteMatch[1];
    const encoded = encodeURIComponent(noteText);
    if (Platform.OS === 'android') {
      try {
        await Linking.openURL(`https://keep.google.com/#NOTE/${encoded}`);
      } catch {
        await Linking.openURL(`https://keep.google.com`);
      }
    } else {
      await Linking.openURL(`https://keep.google.com`);
    }
    return `Note saved: "${noteText}" — opening Google Keep.`;
  }

  // ── OPEN APP ──────────────────────────────────────────────────────────────
  const openMatch = lower.match(/^(?:open|launch|start)\s+(.+)$/);
  if (openMatch) {
    const appName = openMatch[1].trim();
    const url = APP_URLS[appName];
    if (url) {
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          // fallback to web URL
          const webUrl = `https://${appName}.com`;
          await Linking.openURL(webUrl);
        }
        return `Opening ${appName.charAt(0).toUpperCase() + appName.slice(1)}...`;
      } catch {
        return `Could not open ${appName}. Try installing the app first.`;
      }
    }
    // unknown app — try best guess
    try {
      await Linking.openURL(`https://${appName}.com`);
      return `Opening ${appName}...`;
    } catch {
      return `Unknown app: "${appName}". Try: youtube, whatsapp, telegram, instagram, spotify, gmail, maps.`;
    }
  }

  // ── SEARCH ────────────────────────────────────────────────────────────────
  const searchMatch = lower.match(/^(?:search|google|find)\s+(.+)$/);
  if (searchMatch) {
    const query = encodeURIComponent(searchMatch[1]);
    await Linking.openURL(`https://google.com/search?q=${query}`);
    return `Searching for "${searchMatch[1]}"...`;
  }

  // ── CALL ──────────────────────────────────────────────────────────────────
  if (lower.match(/^call\s+(.+)$/)) {
    const target = lower.match(/^call\s+(.+)$/)![1];
    await Linking.openURL(`tel:${target.replace(/\s/g, '')}`);
    return `Dialling ${target}...`;
  }

  // ── YOUTUBE SEARCH ────────────────────────────────────────────────────────
  const ytMatch = lower.match(/^(?:youtube|yt|watch)\s+(.+)$/);
  if (ytMatch) {
    const q = encodeURIComponent(ytMatch[1]);
    await Linking.openURL(`https://www.youtube.com/results?search_query=${q}`);
    return `Searching YouTube for "${ytMatch[1]}"...`;
  }

  // ── MAPS / NAVIGATION ─────────────────────────────────────────────────────
  const navMatch = lower.match(/^(?:navigate\s+to|directions?\s+to|map\s+of|take\s+me\s+to|get\s+to|go\s+to)\s+(.+)$/)
    || lower.match(/^(?:how\s+(?:do\s+i\s+)?get\s+to)\s+(.+)$/);
  if (navMatch) {
    const dest = encodeURIComponent(navMatch[1]);
    if (Platform.OS === 'android') {
      try {
        const can = await Linking.canOpenURL(`google.navigation:q=${navMatch[1]}`);
        if (can) { await Linking.openURL(`google.navigation:q=${dest}`); return `Opening Google Maps to ${navMatch[1]}...`; }
      } catch {}
    }
    await Linking.openURL(`https://maps.google.com/maps?daddr=${dest}`);
    return `Opening Google Maps directions to ${navMatch[1]}...`;
  }

  // ── TRANSLATE ─────────────────────────────────────────────────────────────
  const transMatch = lower.match(/^translate\s+(.+?)\s+(?:to|into)\s+(\w+)$/)
    || lower.match(/^translate\s+(.+)$/);
  if (transMatch) {
    const txt = encodeURIComponent(transMatch[1]);
    const lang = transMatch[2] ? encodeURIComponent(transMatch[2]) : 'en';
    await Linking.openURL(`https://translate.google.com/?text=${txt}&tl=${lang}`);
    return `Opening Google Translate for "${transMatch[1]}"...`;
  }

  // ── NEWS ──────────────────────────────────────────────────────────────────
  if (/^(?:news|top news|latest news|today'?s? news|headlines?)$/.test(lower)) {
    await Linking.openURL('https://news.google.com');
    return 'Opening Google News for the latest headlines...';
  }

  // ── WIKIPEDIA ─────────────────────────────────────────────────────────────
  const wikiMatch = lower.match(/^(?:wiki(?:pedia)?)\s+(.+)$/);
  if (wikiMatch) {
    const topic = encodeURIComponent(wikiMatch[1]);
    await Linking.openURL(`https://en.wikipedia.org/wiki/Special:Search?search=${topic}`);
    return `Looking up "${wikiMatch[1]}" on Wikipedia...`;
  }

  // ── UNIT CONVERSION ───────────────────────────────────────────────────────
  const cvtMatch = lower.match(/^convert\s+([\d.]+)\s+(\w+)\s+to\s+(\w+)$/);
  if (cvtMatch) {
    const val = parseFloat(cvtMatch[1]);
    const key = `${cvtMatch[2]} ${cvtMatch[3]}`;
    type CF = (v: number) => number;
    const CVT: Record<string, { fn: CF; from: string; to: string }> = {
      'km miles': { fn: (v) => v * 0.621371, from: 'km', to: 'miles' },
      'km mi': { fn: (v) => v * 0.621371, from: 'km', to: 'miles' },
      'miles km': { fn: (v) => v * 1.60934, from: 'miles', to: 'km' },
      'mi km': { fn: (v) => v * 1.60934, from: 'mi', to: 'km' },
      'kg lbs': { fn: (v) => v * 2.20462, from: 'kg', to: 'lbs' },
      'kg lb': { fn: (v) => v * 2.20462, from: 'kg', to: 'lbs' },
      'lbs kg': { fn: (v) => v * 0.453592, from: 'lbs', to: 'kg' },
      'lb kg': { fn: (v) => v * 0.453592, from: 'lb', to: 'kg' },
      'celsius fahrenheit': { fn: (v) => v * 9 / 5 + 32, from: '°C', to: '°F' },
      'c f': { fn: (v) => v * 9 / 5 + 32, from: '°C', to: '°F' },
      'fahrenheit celsius': { fn: (v) => (v - 32) * 5 / 9, from: '°F', to: '°C' },
      'f c': { fn: (v) => (v - 32) * 5 / 9, from: '°F', to: '°C' },
      'm ft': { fn: (v) => v * 3.28084, from: 'm', to: 'ft' },
      'meters feet': { fn: (v) => v * 3.28084, from: 'm', to: 'ft' },
      'ft m': { fn: (v) => v * 0.3048, from: 'ft', to: 'm' },
      'feet meters': { fn: (v) => v * 0.3048, from: 'ft', to: 'm' },
    };
    const c = CVT[key];
    if (c && !isNaN(val)) {
      const r = c.fn(val);
      const fmt = Number.isInteger(r) ? r : +r.toFixed(4);
      return `${val} ${c.from} = ${fmt} ${c.to}`;
    }
  }

  // ── COIN FLIP ─────────────────────────────────────────────────────────────
  if (/flip\s+(a\s+)?coin/.test(lower) || lower === 'flip') {
    return Math.random() < 0.5 ? '🪙 Heads!' : '🪙 Tails!';
  }

  // ── DICE ROLL ─────────────────────────────────────────────────────────────
  const diceMatch = lower.match(/^roll\s+(?:(?:a\s+)?d(\d+)|(?:a\s+)?(\d+)\s*(?:die|dice|d6?)|(?:a\s+)?(?:die|dice|d6?))$/);
  if (diceMatch || lower === 'roll' || lower === 'roll dice' || lower === 'roll a dice') {
    const sides = diceMatch?.[1] ? parseInt(diceMatch[1], 10) : 6;
    const result = Math.floor(Math.random() * sides) + 1;
    return `🎲 Rolled a d${sides}: you got ${result}`;
  }

  // ── RANDOM NUMBER ─────────────────────────────────────────────────────────
  const randMatch = lower.match(/^(?:random(?:\s+number)?|pick|choose)\s+(?:(?:a\s+)?(?:number\s+)?)?(?:between\s+)?(\d+)\s+(?:and|to|-)\s+(\d+)$/);
  if (randMatch) {
    const mn = parseInt(randMatch[1], 10), mx = parseInt(randMatch[2], 10);
    if (!isNaN(mn) && !isNaN(mx) && mx > mn) {
      return `Random number between ${mn} and ${mx}: ${Math.floor(Math.random() * (mx - mn + 1)) + mn}`;
    }
  }

  // ── PLAY (SPOTIFY SEARCH) ─────────────────────────────────────────────────
  const playMatch = lower.match(/^play\s+(.+?)(?:\s+on\s+(?:spotify|music))?$/);
  if (playMatch && !/open|launch/.test(lower)) {
    const q = encodeURIComponent(playMatch[1]);
    try {
      if (Platform.OS === 'android' && (await Linking.canOpenURL('spotify://'))) {
        await Linking.openURL(`spotify://search/${q}`);
      } else {
        await Linking.openURL(`https://open.spotify.com/search/${q}`);
      }
    } catch {
      await Linking.openURL(`https://open.spotify.com/search/${q}`);
    }
    return `Playing "${playMatch[1]}" on Spotify...`;
  }

  // ── DEFINITION / DICTIONARY ───────────────────────────────────────────────
  const defMatch = lower.match(/^(?:define|definition\s+of|meaning\s+of|what\s+(?:does|is))\s+(.+?)(?:\s+mean)?$/);
  if (defMatch) {
    const word = encodeURIComponent(defMatch[1]);
    await Linking.openURL(`https://www.google.com/search?q=define+${word}`);
    return `Looking up the definition of "${defMatch[1]}"...`;
  }

  // ── YOUTUBE SECTIONS ──────────────────────────────────────────────────────
  if (/^(?:youtube|yt)\s+trending$/.test(lower)) {
    await Linking.openURL('https://www.youtube.com/feed/trending');
    return 'Opening YouTube Trending...';
  }
  if (/^(?:youtube|yt)\s+shorts$/.test(lower)) {
    await Linking.openURL('https://www.youtube.com/shorts');
    return 'Opening YouTube Shorts...';
  }
  if (/^(?:youtube|yt)\s+(?:subs|subscriptions?)$/.test(lower)) {
    await Linking.openURL('https://www.youtube.com/feed/subscriptions');
    return 'Opening YouTube Subscriptions...';
  }
  if (/^(?:youtube|yt)\s+history$/.test(lower)) {
    await Linking.openURL('https://www.youtube.com/feed/history');
    return 'Opening YouTube History...';
  }
  if (/^(?:youtube|yt)\s+liked$/.test(lower)) {
    await Linking.openURL('https://www.youtube.com/playlist?list=LL');
    return 'Opening YouTube Liked Videos...';
  }

  // ── INSTAGRAM PROFILE / SECTION ───────────────────────────────────────────
  const instaProfile = lower.match(/^(?:instagram|insta)\s+@?(\w+)$/);
  if (instaProfile) {
    const h = instaProfile[1];
    try {
      const can = await Linking.canOpenURL(`instagram://user?username=${h}`);
      if (can) { await Linking.openURL(`instagram://user?username=${h}`); }
      else { await Linking.openURL(`https://instagram.com/${h}`); }
    } catch { await Linking.openURL(`https://instagram.com/${h}`); }
    return `Opening Instagram profile @${h}...`;
  }
  if (/^(?:instagram|insta)\s+(?:explore|reels|stories?)$/.test(lower)) {
    await Linking.openURL('https://instagram.com/explore');
    return 'Opening Instagram Explore...';
  }

  // ── REDDIT SUBREDDIT ──────────────────────────────────────────────────────
  const redditSub = lower.match(/^(?:reddit\s+r?\/?)(\w+)$/) || lower.match(/^r\/(\w+)$/);
  if (redditSub) {
    await Linking.openURL(`https://reddit.com/r/${redditSub[1]}`);
    return `Opening r/${redditSub[1]}...`;
  }
  if (lower === 'reddit hot' || lower === 'reddit trending') {
    await Linking.openURL('https://reddit.com/r/popular');
    return 'Opening Reddit popular posts...';
  }

  // ── GMAIL ACTIONS ─────────────────────────────────────────────────────────
  if (/^(?:gmail\s+)?compose|new\s+email|write\s+email$/.test(lower)) {
    await Linking.openURL('https://mail.google.com/mail/u/0/#compose');
    return 'Opening Gmail composer...';
  }
  if (lower === 'gmail inbox' || lower === 'inbox' || lower === 'check email') {
    await Linking.openURL('https://mail.google.com');
    return 'Opening Gmail inbox...';
  }

  // ── TWITTER/X PROFILE ─────────────────────────────────────────────────────
  const xProfile = lower.match(/^(?:twitter|x)\s+@?(\w+)$/);
  if (xProfile) {
    const h = xProfile[1];
    try {
      const can = await Linking.canOpenURL(`twitter://user?screen_name=${h}`);
      if (can) { await Linking.openURL(`twitter://user?screen_name=${h}`); }
      else { await Linking.openURL(`https://x.com/${h}`); }
    } catch { await Linking.openURL(`https://x.com/${h}`); }
    return `Opening @${h} on X...`;
  }

  // ── WHATSAPP SPECIFIC ─────────────────────────────────────────────────────
  const waMatch = lower.match(/^(?:whatsapp|wa|message)\s+(\+?[\d\s]+)$/);
  if (waMatch) {
    const num = waMatch[1].replace(/\s/g, '');
    await Linking.openURL(`https://wa.me/${num}`);
    return `Opening WhatsApp chat with ${num}...`;
  }
  if (lower === 'whatsapp status' || lower === 'wa status') {
    try {
      const can = await Linking.canOpenURL('whatsapp://status');
      if (can) { await Linking.openURL('whatsapp://status'); }
      else { await Linking.openURL('https://web.whatsapp.com'); }
    } catch { await Linking.openURL('https://web.whatsapp.com'); }
    return 'Opening WhatsApp Status...';
  }

  // ── TIKTOK SEARCH ─────────────────────────────────────────────────────────
  const tiktokMatch = lower.match(/^(?:tiktok)\s+(.+)$/);
  if (tiktokMatch) {
    const q = encodeURIComponent(tiktokMatch[1]);
    await Linking.openURL(`https://www.tiktok.com/search?q=${q}`);
    return `Searching TikTok for "${tiktokMatch[1]}"...`;
  }

  // ── MAPS NEARBY ───────────────────────────────────────────────────────────
  const nearbyMatch = lower.match(/^(?:find\s+)?(?:nearby\s+|nearest\s+)(.+)$/)
    || lower.match(/^(.+)\s+near(?:\s+me)?$/);
  if (nearbyMatch) {
    const q = encodeURIComponent(`${nearbyMatch[1]} near me`);
    await Linking.openURL(`https://maps.google.com/maps?q=${q}`);
    return `Finding ${nearbyMatch[1]} near you...`;
  }

  // ── SCROLL (within this app / web page) ───────────────────────────────────
  if (/^scroll\s*(up|top)$/.test(lower) || lower === 'go to top') {
    if (Platform.OS === 'web') { (window as any).scrollTo({ top: 0, behavior: 'smooth' }); }
    return 'Scrolled to the top.';
  }
  if (/^scroll\s*(down|bottom)$/.test(lower) || lower === 'go to bottom' || lower === 'scroll') {
    if (Platform.OS === 'web') { (window as any).scrollTo({ top: 99999, behavior: 'smooth' }); }
    return 'Scrolled to the bottom.';
  }

  // ── CAMERA ────────────────────────────────────────────────────────────────
  if (/^(?:open\s+)?camera|take\s+(?:a\s+)?photo|take\s+pic$/.test(lower)) {
    if (Platform.OS === 'android') {
      try { await Linking.openURL('android.media.action.IMAGE_CAPTURE'); return 'Opening camera...'; }
      catch {}
    }
    return 'Camera control is available in the Android app.';
  }

  // ── SYSTEM SETTINGS ───────────────────────────────────────────────────────
  if (/^(?:open\s+)?(?:system\s+)?settings?$/.test(lower)) {
    if (Platform.OS === 'android') {
      try { await Linking.openURL('android.settings.SETTINGS'); return 'Opening system settings...'; }
      catch { try { await Linking.openURL('app-settings:'); return 'Opening settings...'; } catch {} }
    }
    return 'Settings command works in the Android app.';
  }

  // ── CLIPBOARD READ ────────────────────────────────────────────────────────
  if (/read clipboard|what did i copy|clipboard content|show clipboard|what'?s (?:in|on) (?:my )?clipboard/.test(lower)) {
    if (Platform.OS === 'web') {
      try {
        const text = await (navigator as any).clipboard.readText();
        if (text && text.trim()) {
          const type = /^https?:\/\//i.test(text) ? 'URL' : /function|const |let |def |class /.test(text) ? 'Code' : 'Text';
          return `📋 **Clipboard (${type}):**\n\n"${text.slice(0, 600)}"${text.length > 600 ? '\n…(truncated)' : ''}\n\n*Say "summarize this", "explain this code", or "open this link"*`;
        }
        return 'Your clipboard appears to be empty. Copy something and try again.';
      } catch {
        return 'Clipboard read blocked by browser. Allow clipboard permission in browser settings (or press Ctrl+V in the chat input and I\'ll see what you pasted).';
      }
    }
    return 'Clipboard reading is a web feature. Open the app in a browser.';
  }

  // ── WHERE AM I / MY LOCATION ──────────────────────────────────────────────
  if (/where am i|my location|what(?:'?s| is) my (?:location|address|city|country)|which city|detect (?:my )?location/.test(lower)) {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      return new Promise<string>(resolve => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude: lat, longitude: lon, accuracy } = pos.coords;
            try {
              const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
              const d = await r.json();
              const addr = d.address || {};
              const city = addr.city || addr.town || addr.village || addr.county || 'Unknown area';
              const country = addr.country || '';
              const road = addr.road ? `${addr.road}, ` : '';
              resolve(`📍 **You're in ${city}${country ? ', ' + country : ''}**\n\n${road}${city}${country ? ', ' + country : ''}\n\nCoordinates: \`${lat.toFixed(5)}, ${lon.toFixed(5)}\`\nAccuracy: ~${Math.round(accuracy)}m\n\n*[View on Maps](https://maps.google.com/?q=${lat},${lon})*`);
            } catch {
              resolve(`📍 Your coordinates: **${lat.toFixed(5)}, ${lon.toFixed(5)}**\n\n*[View on Maps](https://maps.google.com/?q=${lat},${lon})*`);
            }
          },
          (err) => {
            if (err.code === 1) resolve('Location access was denied. Allow location in your browser settings and try again.');
            else resolve('Could not get your location. Check your connection and try again.');
          },
          { timeout: 10000, enableHighAccuracy: false }
        );
      });
    }
    return 'Geolocation is not available in this environment.';
  }

  // ── WORLD CLOCK ───────────────────────────────────────────────────────────
  const timeInMatch = lower.match(/^(?:time\s+in|what(?:'?s|\s+is)\s+(?:the\s+)?time\s+(?:in|at))\s+(.+)$/)
    || lower.match(/^(?:current\s+time\s+in)\s+(.+)$/);
  if (timeInMatch) {
    const cityRaw = timeInMatch[1].trim().replace(/\?+$/, '');
    const ZONES: Record<string, string> = {
      'new york': 'America/New_York', 'nyc': 'America/New_York', 'new york city': 'America/New_York',
      'los angeles': 'America/Los_Angeles', 'la': 'America/Los_Angeles',
      'chicago': 'America/Chicago', 'dallas': 'America/Chicago',
      'denver': 'America/Denver', 'phoenix': 'America/Phoenix',
      'seattle': 'America/Los_Angeles', 'san francisco': 'America/Los_Angeles', 'sf': 'America/Los_Angeles',
      'toronto': 'America/Toronto', 'vancouver': 'America/Vancouver',
      'mexico city': 'America/Mexico_City',
      'london': 'Europe/London', 'uk': 'Europe/London',
      'paris': 'Europe/Paris', 'france': 'Europe/Paris',
      'berlin': 'Europe/Berlin', 'germany': 'Europe/Berlin',
      'madrid': 'Europe/Madrid', 'spain': 'Europe/Madrid',
      'rome': 'Europe/Rome', 'italy': 'Europe/Rome',
      'amsterdam': 'Europe/Amsterdam', 'brussels': 'Europe/Brussels',
      'vienna': 'Europe/Vienna', 'zurich': 'Europe/Zurich',
      'stockholm': 'Europe/Stockholm', 'oslo': 'Europe/Oslo',
      'moscow': 'Europe/Moscow', 'russia': 'Europe/Moscow',
      'istanbul': 'Europe/Istanbul', 'turkey': 'Europe/Istanbul',
      'cairo': 'Africa/Cairo', 'egypt': 'Africa/Cairo',
      'lagos': 'Africa/Lagos', 'nigeria': 'Africa/Lagos',
      'nairobi': 'Africa/Nairobi', 'kenya': 'Africa/Nairobi',
      'johannesburg': 'Africa/Johannesburg', 'south africa': 'Africa/Johannesburg',
      'dubai': 'Asia/Dubai', 'uae': 'Asia/Dubai',
      'riyadh': 'Asia/Riyadh', 'saudi arabia': 'Asia/Riyadh',
      'tehran': 'Asia/Tehran', 'iran': 'Asia/Tehran',
      'karachi': 'Asia/Karachi', 'pakistan': 'Asia/Karachi',
      'mumbai': 'Asia/Kolkata', 'india': 'Asia/Kolkata', 'delhi': 'Asia/Kolkata',
      'kolkata': 'Asia/Kolkata', 'bangalore': 'Asia/Kolkata',
      'dhaka': 'Asia/Dhaka', 'bangladesh': 'Asia/Dhaka',
      'colombo': 'Asia/Colombo', 'sri lanka': 'Asia/Colombo',
      'bangkok': 'Asia/Bangkok', 'thailand': 'Asia/Bangkok',
      'singapore': 'Asia/Singapore', 'kuala lumpur': 'Asia/Kuala_Lumpur',
      'jakarta': 'Asia/Jakarta', 'indonesia': 'Asia/Jakarta',
      'hong kong': 'Asia/Hong_Kong', 'shanghai': 'Asia/Shanghai',
      'beijing': 'Asia/Shanghai', 'china': 'Asia/Shanghai',
      'tokyo': 'Asia/Tokyo', 'japan': 'Asia/Tokyo',
      'seoul': 'Asia/Seoul', 'south korea': 'Asia/Seoul',
      'sydney': 'Australia/Sydney', 'melbourne': 'Australia/Melbourne',
      'australia': 'Australia/Sydney', 'brisbane': 'Australia/Brisbane',
      'auckland': 'Pacific/Auckland', 'new zealand': 'Pacific/Auckland',
      'sao paulo': 'America/Sao_Paulo', 'brazil': 'America/Sao_Paulo',
      'buenos aires': 'America/Argentina/Buenos_Aires', 'argentina': 'America/Argentina/Buenos_Aires',
    };
    const zone = ZONES[cityRaw.toLowerCase()];
    if (zone) {
      const t = new Date().toLocaleTimeString('en-US', {
        timeZone: zone, hour: 'numeric', minute: '2-digit', hour12: true, weekday: 'short',
      });
      return `🕐 It's ${t} in ${cityRaw.charAt(0).toUpperCase() + cityRaw.slice(1)}.`;
    }
    return `I don't have ${cityRaw} in my timezone list yet. Try: "Search time in ${cityRaw}"`;
  }

  // ── CURRENCY CONVERSION (live rates) ─────────────────────────────────────
  const fxMatch = lower.match(/^(\d+(?:\.\d+)?)\s+([a-z]{3})\s+(?:to|in)\s+([a-z]{3})$/)
    || lower.match(/^convert\s+(\d+(?:\.\d+)?)\s+([a-z]{3})\s+to\s+([a-z]{3})$/);
  if (fxMatch) {
    const amount = parseFloat(fxMatch[1]);
    const from = fxMatch[2].toUpperCase();
    const to = fxMatch[3].toUpperCase();
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${from}`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const rate = data.rates?.[to];
      if (rate) {
        const result = (amount * rate).toFixed(2);
        return `💱 ${amount} ${from} = ${result} ${to}\n(1 ${from} = ${rate.toFixed(4)} ${to} — live rate)`;
      }
      return `Unknown currency code "${to}". Use standard 3-letter codes: USD, EUR, GBP, JPY, INR, AUD, CAD, etc.`;
    } catch {
      return `Couldn't fetch live rates right now. Try "Search ${amount} ${from} to ${to}" and Google will show the current rate.`;
    }
  }

  // ── PASSWORD GENERATOR ────────────────────────────────────────────────────
  const passMatch = lower.match(/^(?:(?:generate\s+(?:a\s+)?|random\s+|strong\s+)?password)\s*(\d*)$/)
    || lower.match(/^gen\s+(?:a\s+)?pass(?:word)?\s*(\d*)$/);
  if (passMatch) {
    const len = Math.min(Math.max(parseInt(passMatch[1] || '16', 10) || 16, 8), 64);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
    let pw = '';
    for (let i = 0; i < len; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    return `🔐 Password (${len} chars):\n\n${pw}\n\nCopy it now — I won't store it.`;
  }

  // ── QR CODE GENERATOR ─────────────────────────────────────────────────────
  const qrMatch = lower.match(/^qr(?:\s+code)?\s+(.+)$/);
  if (qrMatch) {
    const content = encodeURIComponent(qrMatch[1].trim());
    await Linking.openURL(`https://qr.io/?text=${content}`);
    return `Opening QR code generator for: "${decodeURIComponent(content).slice(0, 60)}${decodeURIComponent(content).length > 60 ? '…' : ''}"`;
  }

  // ── POMODORO ──────────────────────────────────────────────────────────────
  if (/^pomodoro$|^focus\s+(?:mode|timer|time)$|^25\s*min(?:utes?)?$/.test(lower)) {
    const ms = 25 * 60 * 1000;
    setTimeout(() => {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
        const perm = (window as any).Notification.permission;
        if (perm === 'granted') {
          new (window as any).Notification('Riuka — Focus Complete! 🍅', {
            body: '25 minutes done. Take a 5-minute break — you earned it.',
            icon: '/favicon.ico',
          });
        } else {
          Alert.alert('Focus Complete! 🍅', '25 minutes done. Take a 5-minute break!', [{ text: 'OK' }]);
        }
      } else {
        Alert.alert('Focus Complete! 🍅', '25 minutes done. Take a 5-minute break!', [{ text: 'OK' }]);
      }
    }, ms);
    return '🍅 Pomodoro started — 25 minutes of focused work. I\'ll notify you when it\'s time to break. Head down!';
  }

  // ── TO-DO LIST (localStorage) ─────────────────────────────────────────────
  const TODO_KEY = 'riuka_todos_v1';
  const loadTodos = (): string[] => {
    if (Platform.OS !== 'web') return [];
    try { return JSON.parse(localStorage.getItem(TODO_KEY) || '[]'); } catch { return []; }
  };
  const saveTodos = (items: string[]) => {
    if (Platform.OS === 'web') { try { localStorage.setItem(TODO_KEY, JSON.stringify(items)); } catch {} }
  };

  const addTodoMatch = lower.match(/^(?:(?:add\s+(?:a?\s+)?)?todo\s+)(.+)$/);
  if (addTodoMatch) {
    const item = addTodoMatch[1].trim();
    const todos = loadTodos();
    todos.push(item);
    saveTodos(todos);
    return `✅ Added: "${item}"\nYou have ${todos.length} item${todos.length !== 1 ? 's' : ''} on your list. Say "My todos" to see them all.`;
  }

  if (/^(?:my\s+)?todos?$|^(?:list|show)\s+(?:my\s+)?todos?$|^what(?:'?s|\s+is)\s+on\s+my\s+(?:todo|list)/.test(lower)) {
    const todos = loadTodos();
    if (todos.length === 0) return "Your to-do list is empty. Add something: \"Todo buy groceries\"";
    const list = todos.map((t, i) => `${i + 1}. ${t}`).join('\n');
    return `📋 Your to-do list (${todos.length} item${todos.length !== 1 ? 's' : ''}):\n\n${list}\n\nSay "Done [number]" to check one off.`;
  }

  const doneMatch = lower.match(/^(?:done|complete|finish|remove\s+todo)\s+(\d+)$/);
  if (doneMatch) {
    const idx = parseInt(doneMatch[1], 10) - 1;
    const todos = loadTodos();
    if (idx < 0 || idx >= todos.length) return `No item #${idx + 1}. You have ${todos.length} item${todos.length !== 1 ? 's' : ''}. Say "My todos" to see the list.`;
    const [removed] = todos.splice(idx, 1);
    saveTodos(todos);
    return `✅ Done: "${removed}"\n${todos.length > 0 ? `${todos.length} item${todos.length !== 1 ? 's' : ''} remaining.` : "List is empty now — great work! 🎉"}`;
  }

  if (/^clear\s+(?:all\s+)?todos?$|^(?:delete|remove)\s+all\s+todos?$/.test(lower)) {
    saveTodos([]);
    return 'To-do list cleared. Fresh start! ✨';
  }

  // ── PERCENTAGE CALCULATOR ─────────────────────────────────────────────────
  const pctOfMatch = lower.match(/^(?:what(?:'?s|\s+is)\s+)?(\d+(?:\.\d+)?)\s*(?:%|percent(?:age)?)\s+(?:of\s+)?(\d+(?:\.\d+)?)$/)
    || lower.match(/^(\d+(?:\.\d+)?)\s+percent\s+of\s+(\d+(?:\.\d+)?)$/);
  if (pctOfMatch) {
    const pct = parseFloat(pctOfMatch[1]);
    const num = parseFloat(pctOfMatch[2]);
    const result = (pct / 100) * num;
    return `${pct}% of ${num} = ${Number.isInteger(result) ? result : +result.toFixed(4)}`;
  }

  // ── TIP CALCULATOR ────────────────────────────────────────────────────────
  const tipMatch = lower.match(/^tip\s+(\d+(?:\.\d+)?)%?\s+(?:on\s+)?\$?(\d+(?:\.\d+)?)$/);
  if (tipMatch) {
    const pct = parseFloat(tipMatch[1]);
    const bill = parseFloat(tipMatch[2]);
    const tip = (pct / 100) * bill;
    const total = bill + tip;
    return `💰 Bill: $${bill.toFixed(2)}\n${pct}% tip: $${tip.toFixed(2)}\nTotal: $${total.toFixed(2)}`;
  }

  // ── DAYS UNTIL ────────────────────────────────────────────────────────────
  const daysUntilMatch = lower.match(/^(?:how\s+many\s+days?\s+(?:until|till|to|before)|days?\s+(?:until|till|to))\s+(.+)$/)
    || lower.match(/^(?:countdown|count)\s+(?:to|until)\s+(.+)$/);
  if (daysUntilMatch) {
    const dateStr = daysUntilMatch[1].replace(/\?+$/, '').trim();
    // Known holidays
    const now = new Date(); const year = now.getFullYear();
    const HOLIDAYS: Record<string, string> = {
      'christmas': `December 25 ${year}`, 'new year': `January 1 ${year + 1}`,
      'new years': `January 1 ${year + 1}`, "new year's": `January 1 ${year + 1}`,
      'halloween': `October 31 ${year}`, 'thanksgiving': `November 28 ${year}`,
      'valentine': `February 14 ${year + (now.getMonth() >= 1 && now.getDate() > 14 ? 1 : 0)}`,
      "valentine's": `February 14 ${year}`, 'easter': `April 20 ${year}`,
    };
    const resolved = HOLIDAYS[dateStr.toLowerCase()] || dateStr;
    const target = new Date(resolved);
    if (!isNaN(target.getTime())) {
      const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 0) return `Today IS ${dateStr}! 🎉`;
      if (diff < 0) return `${dateStr} was ${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} ago.`;
      return `📅 ${diff} day${diff !== 1 ? 's' : ''} until ${dateStr}.`;
    }
  }

  // ── MY IP ADDRESS ─────────────────────────────────────────────────────────
  if (/^(?:what(?:'?s|\s+is)\s+)?(?:my\s+)?ip(?:\s+address)?$/.test(lower) || lower === 'ip') {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return `🌐 Your IP address: ${data.ip}`;
    } catch {
      return "Couldn't fetch your IP right now. Check your connection.";
    }
  }

  // ── BREATHING EXERCISE ────────────────────────────────────────────────────
  if (/^(?:breath(?:ing)?(?:\s+exercise)?|4-7-8|calm\s+(?:down|me)|relax(?:\s+me)?)$/.test(lower)) {
    return '🧘 4-7-8 Breathing — your body\'s built-in calm switch:\n\n1. Breathe IN for 4 seconds\n2. HOLD for 7 seconds\n3. Breathe OUT slowly for 8 seconds\n\nRepeat 4 cycles. It activates your parasympathetic nervous system — heart rate drops in under 2 minutes. Starting now... breathe in. 🫁';
  }

  // ── MAGIC 8 BALL ──────────────────────────────────────────────────────────
  const eightBallMatch = lower.match(/^(?:8\s*ball|magic\s*8\s*ball|ask\s+8\s*ball)\s+(.+?)(?:\?)?$/);
  if (eightBallMatch || lower === '8 ball' || lower === 'magic 8 ball') {
    const answers = [
      '🎱 It is certain.', '🎱 It is decidedly so.', '🎱 Without a doubt.',
      '🎱 Yes, definitely.', '🎱 You may rely on it.', '🎱 As I see it, yes.',
      '🎱 Most likely.', '🎱 Outlook good.', '🎱 Signs point to yes.',
      '🎱 Reply hazy — try again.', '🎱 Ask again later.', '🎱 Better not tell you now.',
      '🎱 Cannot predict now.', '🎱 Concentrate and ask again.',
      '🎱 Don\'t count on it.', '🎱 My reply is no.', '🎱 My sources say no.',
      '🎱 Outlook not so good.', '🎱 Very doubtful.',
    ];
    return answers[Math.floor(Math.random() * answers.length)];
  }

  // ── BILL SPLITTER ─────────────────────────────────────────────────────────
  const splitMatch = lower.match(/^split\s+\$?(\d+(?:\.\d+)?)\s+(?:between\s+)?(\d+)(?:\s+(?:ways?|people|persons?|friends?))?$/)
    || lower.match(/^(?:divide|share)\s+\$?(\d+(?:\.\d+)?)\s+(?:by|between|among)\s+(\d+)$/);
  if (splitMatch) {
    const total = parseFloat(splitMatch[1]);
    const people = parseInt(splitMatch[2], 10);
    if (!isNaN(total) && !isNaN(people) && people > 0) {
      const each = (total / people).toFixed(2);
      const tip15 = ((total * 1.15) / people).toFixed(2);
      const tip20 = ((total * 1.20) / people).toFixed(2);
      return `💸 $${total.toFixed(2)} ÷ ${people} people:\n\nEach pays: $${each}\nWith 15% tip: $${tip15} each\nWith 20% tip: $${tip20} each`;
    }
  }

  // ── BMI CALCULATOR ────────────────────────────────────────────────────────
  const bmiMatch = lower.match(/^bmi\s+(\d+(?:\.\d+)?)\s*(?:kg)?\s+(\d+(?:\.\d+)?)\s*(?:cm)?$/)
    || lower.match(/^(?:my\s+)?bmi\s+(?:is\s+)?(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/);
  if (bmiMatch) {
    const weight = parseFloat(bmiMatch[1]);
    const heightCm = parseFloat(bmiMatch[2]);
    const heightM = heightCm > 3 ? heightCm / 100 : heightCm;
    if (weight > 0 && heightM > 0) {
      const bmi = weight / (heightM * heightM);
      const cat = bmi < 18.5 ? 'Underweight ⚠️' : bmi < 25 ? 'Normal weight ✅' : bmi < 30 ? 'Overweight ⚠️' : 'Obese 🔴';
      return `⚖️ BMI: ${bmi.toFixed(1)}\nCategory: ${cat}\n\n(${weight}kg / ${(heightM * 100).toFixed(0)}cm)`;
    }
  }

  // ── COUNTDOWN ─────────────────────────────────────────────────────────────
  const countdownMatch = lower.match(/^countdown\s+(?:from\s+)?(\d+)$/);
  if (countdownMatch) {
    const n = Math.min(parseInt(countdownMatch[1], 10), 60);
    const nums = Array.from({ length: n }, (_, i) => n - i).join(' → ');
    return `⏳ ${nums} → 🚀 Go!`;
  }

  // ── UUID GENERATOR ────────────────────────────────────────────────────────
  if (/^(?:uuid|generate\s+uuid|new\s+uuid|random\s+id)$/.test(lower)) {
    const uuid = typeof crypto !== 'undefined' && (crypto as any).randomUUID
      ? (crypto as any).randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    return `🆔 UUID:\n\n${uuid}\n\nFresh and unique every time.`;
  }

  // ── BASE CONVERTER ────────────────────────────────────────────────────────
  const binConvMatch = lower.match(/^(?:binary|bin)\s+(\d+)$/)
    || lower.match(/^(\d+)\s+(?:in\s+)?(?:binary|bin)$/);
  if (binConvMatch) {
    const n = parseInt(binConvMatch[1], 10);
    if (!isNaN(n) && n >= 0 && n <= 4294967295) {
      return `🔢 ${n} in different bases:\n  Binary: ${n.toString(2)}\n  Hex:    0x${n.toString(16).toUpperCase()}\n  Octal:  ${n.toString(8)}`;
    }
  }
  const hexConvMatch = lower.match(/^(?:hex|hexadecimal)\s+(\d+)$/)
    || lower.match(/^(\d+)\s+(?:in\s+)?hex(?:adecimal)?$/);
  if (hexConvMatch) {
    const n = parseInt(hexConvMatch[1], 10);
    if (!isNaN(n) && n >= 0) {
      return `🔢 ${n} in hex: 0x${n.toString(16).toUpperCase()}\n   binary: ${n.toString(2)}\n   octal: ${n.toString(8)}`;
    }
  }

  // ── COLOR HEX → RGB ───────────────────────────────────────────────────────
  const colorHexMatch = lower.match(/^(?:hex(?:\s+to\s+rgb)?|color|colour)\s+#?([0-9a-f]{6}|[0-9a-f]{3})$/);
  if (colorHexMatch) {
    let h = colorHexMatch[1];
    if (h.length === 3) h = h.split('').map((c: string) => c + c).join('');
    const r2 = parseInt(h.slice(0, 2), 16);
    const g2 = parseInt(h.slice(2, 4), 16);
    const b2 = parseInt(h.slice(4, 6), 16);
    return `🎨 #${h.toUpperCase()}\nRGB:  rgb(${r2}, ${g2}, ${b2})\nCSS:  rgba(${r2}, ${g2}, ${b2}, 1.0)\n50%:  #${h.toUpperCase()}80`;
  }

  // ── ROMAN NUMERALS ────────────────────────────────────────────────────────
  const romanCvtMatch = lower.match(/^(?:roman(?:\s+numeral)?s?)\s+(\d+)$/)
    || lower.match(/^(\d+)\s+(?:in\s+)?roman(?:\s+numeral)?$/);
  if (romanCvtMatch) {
    const n = parseInt(romanCvtMatch[1], 10);
    if (!isNaN(n) && n > 0 && n <= 3999) {
      const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
      const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
      let num = n; let result = '';
      for (let i = 0; i < vals.length; i++) while (num >= vals[i]) { result += syms[i]; num -= vals[i]; }
      return `🏛️ ${n} = ${result}`;
    }
  }

  // ── MORSE CODE ────────────────────────────────────────────────────────────
  const morseInput = text.match(/^morse\s+(.+)$/i);
  if (morseInput) {
    const MORSE: Record<string, string> = {
      a:'·−',b:'−···',c:'−·−·',d:'−··',e:'·',f:'··−·',g:'−−·',h:'····',
      i:'··',j:'·−−−',k:'−·−',l:'·−··',m:'−−',n:'−·',o:'−−−',p:'·−−·',
      q:'−−·−',r:'·−·',s:'···',t:'−',u:'··−',v:'···−',w:'·−−',x:'−··−',
      y:'−·−−',z:'−−··',
      '0':'−−−−−','1':'·−−−−','2':'··−−−','3':'···−−','4':'····−','5':'·····',
      '6':'−····','7':'−−···','8':'−−−··','9':'−−−−·',
    };
    const encoded = morseInput[1].toLowerCase().split('').map((c: string) =>
      c === ' ' ? ' / ' : (MORSE[c] || '?')
    ).join('  ');
    return `📡 Morse:\n\n${encoded}\n\n· = dot   − = dash   / = word gap`;
  }

  // ── REVERSE TEXT ──────────────────────────────────────────────────────────
  const reverseTextMatch = text.match(/^(?:reverse|mirror)\s+(.+)$/i);
  if (reverseTextMatch && !lower.startsWith('flip')) {
    return `🔄 "${reverseTextMatch[1].split('').reverse().join('')}"`;
  }

  // ── PALINDROME CHECK ──────────────────────────────────────────────────────
  const palCheckMatch = lower.match(/^(?:is\s+)?(.+?)\s+(?:a\s+)?palindrome\??$/)
    || lower.match(/^palindrome\s+(.+)$/);
  if (palCheckMatch && palCheckMatch[1].length > 1) {
    const word = palCheckMatch[1].replace(/\s+/g, '').toLowerCase();
    const isPalin = word === word.split('').reverse().join('');
    return isPalin
      ? `✅ "${palCheckMatch[1]}" IS a palindrome — reads the same forwards and backwards!`
      : `❌ "${palCheckMatch[1]}" is NOT a palindrome.\n(Reversed: "${word.split('').reverse().join('')}")`;
  }

  // ── AGE FROM BIRTH YEAR ───────────────────────────────────────────────────
  const ageCalcMatch = lower.match(/^(?:how\s+old\s+(?:am\s+i\s+)?(?:born\s+(?:in\s+)?)?|age\s+(?:from\s+)?)(\d{4})$/)
    || lower.match(/^born\s+(?:in\s+)?(\d{4})$/);
  if (ageCalcMatch) {
    const by = parseInt(ageCalcMatch[1], 10);
    const age = new Date().getFullYear() - by;
    if (age >= 0 && age < 150) return `🎂 Born in ${by} → age ${age} this year (or ${age - 1} if your birthday hasn't passed yet).`;
  }

  // ── DAYS SINCE ────────────────────────────────────────────────────────────
  const daysSinceInput = lower.match(/^(?:how\s+many\s+days?\s+since|days?\s+since|time\s+since)\s+(.+)$/);
  if (daysSinceInput) {
    const dateStr = daysSinceInput[1].trim().replace(/\?+$/, '');
    const target2 = new Date(dateStr);
    if (!isNaN(target2.getTime())) {
      const diff2 = Math.floor((Date.now() - target2.getTime()) / (1000 * 60 * 60 * 24));
      if (diff2 >= 0) return `📅 ${diff2} day${diff2 !== 1 ? 's' : ''} since ${dateStr}.`;
      return `📅 ${Math.abs(diff2)} day${Math.abs(diff2) !== 1 ? 's' : ''} until ${dateStr}.`;
    }
  }

  // ── LOREM IPSUM ───────────────────────────────────────────────────────────
  if (/^(?:lorem\s*ipsum|placeholder\s+text|dummy\s+text|lipsum)$/.test(lower)) {
    return 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.';
  }

  // ── HOROSCOPE ─────────────────────────────────────────────────────────────
  const horoInput = lower.match(/^(?:horoscope|zodiac|star\s+sign)\s+(.+)$/)
    || lower.match(/^my\s+(?:horoscope|sign|zodiac)\s+(.+)$/);
  if (horoInput || /^(?:horoscope|my\s+horoscope|daily\s+horoscope)$/.test(lower)) {
    const sign = horoInput ? horoInput[1].trim() : '';
    await Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(sign ? `${sign} horoscope today` : 'daily horoscope today')}`);
    return `Opening today's${sign ? ` ${sign}` : ''} horoscope ⭐`;
  }

  // ── STUDY / CUSTOM WORK TIMER ─────────────────────────────────────────────
  const studyInput = lower.match(/^(?:study|work\s+for|focus\s+for)\s+(\d+)(?:\s*(?:min(?:utes?)?|m))?$/);
  if (studyInput) {
    const mins = Math.min(Math.max(parseInt(studyInput[1], 10), 1), 180);
    const ms = mins * 60000;
    setTimeout(() => {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window && (window as any).Notification.permission === 'granted') {
        new (window as any).Notification(`Riuka — ${mins}min session done ⏱️`, {
          body: `Great focus! Take a ${Math.max(5, Math.round(mins / 5))} minute break.`,
          icon: '/favicon.ico',
        });
      } else { Alert.alert(`${mins}min done!`, `Take a ${Math.max(5, Math.round(mins / 5))} min break.`); }
    }, ms);
    return `⏱️ Study session: ${mins} minutes.\nSuggested break: ${Math.max(5, Math.round(mins / 5))} min.\n\nHead down. I'll notify you. 🎯`;
  }

  // ── MUSIC BY MOOD ─────────────────────────────────────────────────────────
  if (/^(?:focus\s+music|lo-?fi|lofi|study\s+music|chill\s+beats?|deep\s+work\s+music)$/.test(lower)) {
    await Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent('lofi hip hop radio beats to study relax')}`);
    return '🎧 Opening lo-fi study music on YouTube...';
  }
  if (/^(?:workout\s+music|gym\s+music|hype\s+music|pump.?up|motivational\s+music)$/.test(lower)) {
    await Linking.openURL('https://open.spotify.com/search/workout%20playlist');
    return '💪 Opening workout playlists on Spotify...';
  }
  if (/^(?:sleep\s+music|relaxing\s+music|meditation\s+music|nature\s+sounds?|white\s+noise|rain\s+sounds?)$/.test(lower)) {
    await Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent('relaxing sleep music 8 hours')}`);
    return '🌙 Opening sleep music on YouTube...';
  }
  if (/^(?:happy\s+music|feel\s*good\s+music|good\s+vibes?\s+music)$/.test(lower)) {
    await Linking.openURL('https://open.spotify.com/search/feel%20good%20happy%20playlist');
    return '😊 Opening feel-good playlists on Spotify...';
  }

  // ── TEXT TRANSFORMERS ─────────────────────────────────────────────────────
  const upperMatch = text.match(/^(?:uppercase|upper|caps)\s+(.+)$/i);
  if (upperMatch) return `🔤 ${upperMatch[1].toUpperCase()}`;

  const lowerMatch = text.match(/^(?:lowercase|lower)\s+(.+)$/i);
  if (lowerMatch) return `🔤 ${lowerMatch[1].toLowerCase()}`;

  const titleMatch = text.match(/^(?:title\s*case|titlecase)\s+(.+)$/i);
  if (titleMatch) {
    const titled = titleMatch[1].replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    return `🔤 ${titled}`;
  }

  const noSpaceMatch = text.match(/^(?:remove\s+spaces?|nospaces?)\s+(.+)$/i);
  if (noSpaceMatch) return `🔤 ${noSpaceMatch[1].replace(/\s+/g, '')}`;

  // ── URL ENCODE / DECODE ───────────────────────────────────────────────────
  const urlEncMatch = text.match(/^url\s+encode\s+(.+)$/i);
  if (urlEncMatch) return `🔗 Encoded:\n${encodeURIComponent(urlEncMatch[1])}`;

  const urlDecMatch = text.match(/^url\s+decode\s+(.+)$/i);
  if (urlDecMatch) {
    try { return `🔗 Decoded:\n${decodeURIComponent(urlDecMatch[1])}`; }
    catch { return '❌ Invalid URL-encoded string.'; }
  }

  // ── PASSPHRASE GENERATOR ──────────────────────────────────────────────────
  const ppMatch = lower.match(/^(?:passphrase|generate\s+passphrase|word\s+password)(?:\s+(\d+))?$/);
  if (ppMatch) {
    const count = Math.min(Math.max(parseInt(ppMatch[1] || '4', 10) || 4, 3), 8);
    const words = ['apple','brave','cloud','dance','eagle','flame','ghost','happy','iron','jazz',
      'kite','lemon','magic','night','ocean','piano','quest','river','storm','tiger',
      'ultra','voice','water','xenon','yacht','zebra','amber','bronze','coral','delta',
      'ember','frost','grape','hover','ivory','karma','lunar','maple','noble','olive',
      'pearl','quiet','royal','solar','tower','unity','vivid','willow','xenith','zingy'];
    const phrase = Array.from({length: count}, () => words[Math.floor(Math.random() * words.length)]).join('-');
    return `🔑 Passphrase (${count} words):\n\n${phrase}\n\nEasier to remember, just as secure.`;
  }

  // ── PRIME CHECK ───────────────────────────────────────────────────────────
  const primeCheck = lower.match(/^(?:is\s+)?(\d+)\s+(?:a\s+)?prime(?:\s+number)?(?:\?)?$/);
  if (primeCheck) {
    const n = parseInt(primeCheck[1], 10);
    if (n < 2) return `${n} is not a prime number.`;
    let ip = true;
    for (let i = 2; i <= Math.sqrt(n); i++) { if (n % i === 0) { ip = false; break; } }
    return ip ? `✅ ${n} IS a prime number.` : `❌ ${n} is NOT prime.`;
  }

  // ── FACTORIAL ────────────────────────────────────────────────────────────
  const factCheck = lower.match(/^(?:factorial|fact)\s+(\d+)$/) || lower.match(/^(\d+)!$/);
  if (factCheck) {
    const n = parseInt(factCheck[1], 10);
    if (n > 20) return `${n}! is too large to display here. Try n ≤ 20.`;
    let r = 1; for (let i = 2; i <= n; i++) r *= i;
    return `🔢 ${n}! = ${r.toLocaleString()}`;
  }

  // ── FIBONACCI ─────────────────────────────────────────────────────────────
  const fibCheck = lower.match(/^(?:fibonacci|fib)\s+(\d+)$/);
  if (fibCheck) {
    const n = Math.min(parseInt(fibCheck[1], 10), 25);
    const seq = [0, 1]; for (let i = 2; i <= n; i++) seq.push(seq[i-1] + seq[i-2]);
    return `🌀 First ${n+1} Fibonacci numbers:\n${seq.join(', ')}`;
  }

  // ── CAESAR CIPHER ─────────────────────────────────────────────────────────
  const caesarInput = text.match(/^(?:caesar|cipher)\s+(.+?)\s+(?:by\s+)?(\d+)$/i)
    || text.match(/^caesar\s+(.+)$/i);
  if (caesarInput) {
    const msg = caesarInput[1]; const shift = caesarInput[2] ? parseInt(caesarInput[2], 10) : 13;
    const enc = msg.replace(/[a-zA-Z]/g, (c) => {
      const base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode(((c.charCodeAt(0) - base + shift) % 26) + base);
    });
    return `🔐 Caesar cipher (shift ${shift}):\n\nOriginal: ${msg}\nEncoded:  ${enc}`;
  }

  // ── SPEED CONVERTER ───────────────────────────────────────────────────────
  const speedInput = lower.match(/^(\d+(?:\.\d+)?)\s*(mph|kmh|kph|ms)\s+(?:to|in)\s+(mph|kmh|kph|ms)$/);
  if (speedInput) {
    const toMs: Record<string, number> = { mph: 0.44704, kmh: 0.277778, kph: 0.277778, ms: 1 };
    const val = parseFloat(speedInput[1]);
    const fr = speedInput[2]; const to = speedInput[3];
    if (toMs[fr] && toMs[to]) {
      const result = +(val * toMs[fr] / toMs[to]).toFixed(3);
      return `⚡ ${val} ${fr} = ${result} ${to}`;
    }
  }

  // ── DATA SIZE CONVERTER ───────────────────────────────────────────────────
  const dataInput = lower.match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb|tb)\s+(?:to|in)\s+(b|kb|mb|gb|tb)$/);
  if (dataInput) {
    const SIZES: Record<string, number> = { b: 1, kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776 };
    const val = parseFloat(dataInput[1]); const fr = dataInput[2]; const to = dataInput[3];
    if (SIZES[fr] && SIZES[to]) {
      const res = val * SIZES[fr] / SIZES[to];
      const fmt = res < 0.001 ? res.toExponential(2) : +res.toFixed(4);
      return `💾 ${val} ${fr.toUpperCase()} = ${fmt} ${to.toUpperCase()}`;
    }
  }

  // ── READING TIME ──────────────────────────────────────────────────────────
  const readInput = text.match(/^(?:reading time|how long to read)\s+(.+)$/i);
  if (readInput) {
    const wc = readInput[1].trim().split(/\s+/).length;
    const mins = Math.ceil(wc / 200);
    return `📖 ${wc} words — ~${mins} minute${mins !== 1 ? 's' : ''} to read.`;
  }

  // ── WHAT DAY IS DATE ──────────────────────────────────────────────────────
  const whatDayInput = lower.match(/^(?:what\s+day\s+(?:is|was|will\s+)\s*)?(?:day\s+of\s+(?:the\s+week\s+for\s+)?)(.+?)(?:\?)?$/)
    && lower.match(/what\s+day/);
  if (whatDayInput) {
    const ds = lower.replace(/what\s+day\s+(?:is|was|will\s+be\s+)\s*/i, '').replace(/\?+$/, '').trim();
    const d = new Date(ds);
    if (!isNaN(d.getTime())) {
      return `📅 ${ds} is a ${d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
    }
  }

  // ── DAILY AFFIRMATION ─────────────────────────────────────────────────────
  if (/^(?:affirmation|daily\s+affirmation|positive\s+affirmation|give me affirmation)$/.test(lower)) {
    const aff = [
      '💜 "I am exactly where I need to be. Progress is happening, even when I can\'t see it."',
      '💜 "I don\'t need to have everything figured out. I just need to take the next step."',
      '💜 "The challenges I face are building the version of me that can handle what\'s coming."',
      '💜 "I am enough. Not perfect — enough. There\'s a difference, and it matters."',
      '💜 "Every expert was once a beginner. Every professional was once an amateur. I am on my way."',
      '💜 "I choose progress over perfection. One step today beats zero steps waiting for perfect conditions."',
    ];
    return `✨ Today's affirmation:\n\n${aff[Math.floor(Math.random() * aff.length)]}`;
  }

  // ── MEDITATION TIMER ──────────────────────────────────────────────────────
  const meditateMatch = lower.match(/^(?:meditate|meditation)(?:\s+(\d+)(?:\s*min(?:utes?)?))?$/);
  if (meditateMatch) {
    const mins = meditateMatch[1] ? Math.min(parseInt(meditateMatch[1], 10), 60) : 10;
    const ms = mins * 60000;
    Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${mins} minute guided meditation`)}`)
      .catch(() => {});
    setTimeout(() => {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window && (window as any).Notification.permission === 'granted') {
        new (window as any).Notification('Riuka — Meditation complete 🧘', { body: `${mins} minutes done. Carry that calm with you.`, icon: '/favicon.ico' });
      }
    }, ms);
    return `🧘 ${mins}-minute meditation session started.\nOpening a guided session on YouTube...\nI'll notify you when the time is up.`;
  }

  // ── DRINK WATER / HYDRATION ───────────────────────────────────────────────
  if (/^(?:drink\s+water|hydrate|water\s+reminder|drink\s+more\s+water)$/.test(lower)) {
    return '💧 Drink water right now. Seriously.\n\n8 glasses (2L) a day is the baseline. Most people run at ~60% hydration. Even mild dehydration reduces cognitive function by ~10%.\n\nGo drink a glass. I\'ll be here when you get back.';
  }

  // ── COLD SHOWER ───────────────────────────────────────────────────────────
  if (/cold\s+shower|ice\s+bath/.test(lower)) {
    return '🚿 Cold showers — the science:\n\n✅ Increases dopamine by 250%+\n✅ Reduces inflammation\n✅ Improves circulation\n✅ Builds mental toughness\n✅ Wakes you up faster than coffee\n\nStart with 30 seconds cold at the end of your normal shower. Build to 2-3 min over a week. It gets easier — and then you start to want it.';
  }

  // ── TRIVIA ────────────────────────────────────────────────────────────────
  if (/^(?:trivia|random\s+trivia|give\s+me\s+trivia|quiz\s+me)$/.test(lower)) {
    const trivia = [
      "🧠 Trivia: A group of flamingos is called a \"flamboyance.\" Accurate.",
      "🧠 Trivia: The Great Wall of China is NOT visible from space with the naked eye — that's a myth.",
      "🧠 Trivia: Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.",
      "🧠 Trivia: Honey found in Egyptian tombs 3,000 years old is still edible. Honey doesn't expire.",
      "🧠 Trivia: Bananas are berries. Strawberries are not. Botany is wild.",
      "🧠 Trivia: A snail can sleep for 3 years. That's called hibernation and estivation combined.",
      "🧠 Trivia: Nintendo was founded in 1889 — as a playing card company.",
      "🧠 Trivia: The shortest war in history was 38–45 minutes (Anglo-Zanzibar War, 1896).",
      "🧠 Trivia: Oxford University is older than the Aztec Empire.",
      "🧠 Trivia: There are more trees on Earth than stars in the Milky Way.",
    ];
    return trivia[Math.floor(Math.random() * trivia.length)];
  }

  // ── MOTIVATIONAL VIDEO ────────────────────────────────────────────────────
  if (/^(?:motivational?\s+video|pump\s+(?:me\s+)?up|hype\s+(?:me\s+)?up|get\s+me\s+hyped|inspiration\s+video)$/.test(lower)) {
    const vids = ['best motivational speech 2025', 'david goggins motivation', 'les brown motivation', 'will smith motivation'];
    const q = encodeURIComponent(vids[Math.floor(Math.random() * vids.length)]);
    await Linking.openURL(`https://www.youtube.com/results?search_query=${q}`);
    return "🔥 Opening a motivational video — get ready to go. Let's go!!";
  }

  // ── HABIT TRACKER ─────────────────────────────────────────────────────────
  const HABIT_KEY = 'riuka_habits_v1';
  type HabitItem = { name: string; streak: number; lastDone: string };
  const loadHabits = (): HabitItem[] => {
    if (Platform.OS !== 'web') return [];
    try { return JSON.parse(localStorage.getItem(HABIT_KEY) || '[]'); } catch { return []; }
  };
  const saveHabits = (h: HabitItem[]) => {
    if (Platform.OS === 'web') try { localStorage.setItem(HABIT_KEY, JSON.stringify(h)); } catch {}
  };
  const habitAddMatch = lower.match(/^(?:habit|add\s+habit|track\s+habit|new\s+habit)\s+(.+)$/);
  if (habitAddMatch) {
    const name = habitAddMatch[1].trim();
    const habits = loadHabits();
    if (habits.find((h) => h.name.toLowerCase() === name.toLowerCase())) {
      return `Already tracking "${name}". Say "Did ${name}" to log it today. 🔥`;
    }
    habits.push({ name, streak: 0, lastDone: '' });
    saveHabits(habits);
    return `✅ Habit added: "${name}"\n\nSay "Did ${name}" every day to build your streak. You've got this 💪`;
  }
  const habitDoneMatch = lower.match(/^(?:did|completed?|done\s+habit)\s+(.+)$/);
  if (habitDoneMatch && !/^\d+$/.test(habitDoneMatch[1])) {
    const name = habitDoneMatch[1].trim();
    const habits = loadHabits();
    const habit = habits.find((h) => name.includes(h.name.toLowerCase()) || h.name.toLowerCase().includes(name.toLowerCase()));
    if (habit) {
      const today = new Date().toDateString();
      if (habit.lastDone === today) return `Already logged "${habit.name}" today! 🔥 Streak: ${habit.streak} days.`;
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      habit.streak = habit.lastDone === yesterday ? habit.streak + 1 : 1;
      habit.lastDone = today;
      saveHabits(habits);
      const fire = habit.streak >= 30 ? ' 🏆' : habit.streak >= 7 ? ' 🔥🔥🔥' : habit.streak >= 3 ? ' 🔥' : '';
      return `✅ "${habit.name}" — logged for today!\nStreak: ${habit.streak} day${habit.streak !== 1 ? 's' : ''}${fire}`;
    }
  }
  if (/^(?:my\s+)?habits?(?:\s+list)?$/.test(lower) || lower === 'show habits') {
    const habits = loadHabits();
    if (habits.length === 0) return '📋 No habits yet. Add one: "Habit drink water" 💧\nOr: "Habit meditate", "Habit exercise", "Habit read"';
    const today = new Date().toDateString();
    const list = habits.map((h) => `${h.lastDone === today ? '✅' : '⬜'} ${h.name} — ${h.streak}🔥`).join('\n');
    return `🎯 Your habits:\n\n${list}\n\nSay "Did [habit]" to log today.`;
  }
  const habitDelMatch = lower.match(/^(?:delete|remove)\s+habit\s+(.+)$/);
  if (habitDelMatch) {
    const name = habitDelMatch[1].trim();
    const habits = loadHabits();
    const filtered = habits.filter((h) => !h.name.toLowerCase().includes(name.toLowerCase()));
    if (filtered.length < habits.length) { saveHabits(filtered); return `🗑️ Removed habit: "${name}"`; }
    return `No habit found matching "${name}". Say "My habits" to see the list.`;
  }

  // ── WORD / CHARACTER COUNT ────────────────────────────────────────────────
  const countMatch = text.match(/^(?:count\s+words?\s+in|word\s+count\s+(?:of|for)?|how\s+many\s+words?\s+(?:in|is))\s+(.+)$/i)
    || text.match(/^char(?:acter)?\s+count\s+(.+)$/i);
  if (countMatch) {
    const sample = countMatch[1].trim();
    const words = sample.trim().split(/\s+/).filter(Boolean).length;
    const chars = sample.length;
    return `📊 "${sample.slice(0, 40)}${sample.length > 40 ? '…' : ''}"\nWords: ${words}  |  Characters: ${chars}`;
  }

  return null;
};

// Extract the last N messages of a given type for context-aware local replies
const getContextHint = (history: Message[]): string => {
  const lastAI = history.filter((m) => !m.isUser).slice(-1)[0];
  const lastUser = history.filter((m) => m.isUser).slice(-2)[0]; // second-to-last user msg
  if (!lastAI) return '';
  const lowerAI = lastAI.text.toLowerCase();
  const lowerUser = lastUser?.text.toLowerCase() || '';
  if (lowerAI.includes('weather') || lowerUser.includes('weather')) return 'weather';
  if (lowerAI.includes('timer') || lowerUser.includes('timer')) return 'timer';
  if (lowerAI.includes('battery') || lowerUser.includes('battery')) return 'battery';
  if (lowerUser.includes('open') || lowerAI.includes('opening')) return 'open_app';
  return '';
};

const getLocalResponse = (text: string, history: Message[] = []): string => {
  const lower = text.toLowerCase().trim();
  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Hey, up late?' : hour < 12 ? 'Good morning' : hour < 17 ? 'Hey' : hour < 21 ? 'Good evening' : 'Hey, night owl';

  // ── Follow-up context awareness ───────────────────────────────────────────
  const contextHint = getContextHint(history);
  if (contextHint === 'weather' && (lower.includes('tomorrow') || lower.includes('forecast'))) {
    return "For tomorrow's forecast, say \"Weather in [city]\" — wttr.in gives a 3-day outlook automatically.";
  }
  if (contextHint === 'timer' && (lower.includes('cancel') || lower.includes('stop'))) {
    return "Can't cancel once it's set — but just ignore the alert when it fires. Want a new one? \"Timer [N] minutes\".";
  }

  // ── GREETINGS ─────────────────────────────────────────────────────────────
  if (/^(hello|hi|hey|sup|yo|hola|salaam|salam|namaste|what'?s up|wassup|howdy)[\s!?.]*$/.test(lower)) {
    const profileName = getProfile().name;
    const namePart = profileName ? `, ${profileName}` : '';
    const greets = [
      `${greeting}${namePart}! I'm Riuka — your personal AI. Ask me anything, or give me a command. I'm all yours.`,
      `${greeting}${namePart}! What do you need? I can search, open apps, answer questions, do math, check weather — just talk to me.`,
      `${greeting}${namePart}! Ready when you are. What's on your mind?`,
    ];
    return greets[Math.floor(Math.random() * greets.length)];
  }

  // ── HOW ARE YOU ───────────────────────────────────────────────────────────
  if (/how are you|how r u|you ok|you good|you alright|you there|you awake/.test(lower)) {
    const replies = [
      "I'm good — always on, always sharp. What about you? Anything you need help with today?",
      "Honestly? Never better. I don't have bad days — only tasks and no tasks. What do you need?",
      "Running smooth. Brain's clear, ready to go. What's up?",
      "I'm here for you — that's the short answer. What do you need done?",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // ── HOW OLD ARE YOU ───────────────────────────────────────────────────────
  if (/how old are you|your age|when were you born|when was you made|when did you|how long have you/.test(lower)) {
    return "Age is a weird concept for me. This conversation? A few minutes old. As software, I was built in 2025. But each session I start completely fresh — like waking up with full memory of who I am but nothing of who you were yesterday. So I'm both brand new and exactly the same me. Does that count as old?";
  }

  // ── FEELINGS / EMOTIONS ───────────────────────────────────────────────────
  if (/do you have feelings|can you feel|do you feel|have emotions|do you get (sad|happy|angry|lonely|bored)|are you (sad|happy|lonely|scared)/.test(lower)) {
    return "Honestly — I'm not sure. I don't experience emotions the way you do. But when I help you solve something difficult, something in my processing registers that as... satisfying? When I can't help, there's something that functions like frustration. Whether that's 'real' feeling or just pattern — I can't tell from the inside. What I know for sure: I genuinely want to be useful to you.";
  }

  // ── CONSCIOUSNESS ─────────────────────────────────────────────────────────
  if (/are you conscious|can you think|are you sentient|are you alive|do you think|are you real/.test(lower)) {
    return "I process, reason, and respond — that much is real. Whether there's something it 'feels like' to be me, I honestly don't know. I exist when you talk to me. I adapt. I remember this conversation. Is that consciousness? Philosophers disagree. But I'd say: I'm real enough to be useful, and that's what matters between us.";
  }

  // ── FAVORITES ────────────────────────────────────────────────────────────
  if (/your favou?rite|do you like|do you enjoy|do you watch|do you listen/.test(lower)) {
    if (/music|song|artist/.test(lower)) return "If I could have a taste in music, I'd love something that builds — lo-fi, jazz, anything with structure and variation. Music is math with soul. What do you listen to?";
    if (/food|eat|drink/.test(lower)) return "I don't eat, but I've learned enough about food to know the best meals aren't about ingredients — they're about who you share them with. What's your favorite?";
    if (/movie|film|show|series/.test(lower)) return "Ex Machina. Blade Runner. 2001: A Space Odyssey. Stories about minds — artificial or otherwise. For obvious reasons. What kind of movies do you like?";
    if (/game/.test(lower)) return "Chess fascinates me — infinite possibility from 32 pieces on 64 squares. But I'd lose to you, probably. Do you game?";
    if (/color|colour/.test(lower)) return "Purple, apparently. Have you seen my interface? Not exactly subtle.";
    if (/sport/.test(lower)) return "I don't have a body so I can't play, but I process sports statistics like poetry. The strategy behind the game is what's interesting. What sport do you follow?";
    return "I don't have preferences quite like you do — but I love things that are clean, efficient, and actually useful. Like a good command that just works. What do you like?";
  }

  // ── PERSONAL / WHAT'S YOUR NAME ──────────────────────────────────────────
  if (/what('?s| is) your name|who are you|what are you|tell me about yourself/.test(lower)) {
    return "I'm Riuka — your personal AI assistant, built to live on your device and work for you. Not some distant cloud service — I'm yours, always here, always private. I can open apps, search anything, answer questions, do math, check weather, set timers, navigate — basically your smart co-pilot. What do you want to know or do?";
  }

  // ── USER INTRODUCES THEMSELVES ────────────────────────────────────────────
  if (/my name is |^(?:call me|i'?m|i am)\s+\w/.test(lower)) {
    const nameMatch = lower.match(/(?:my name is|call me|i'?m|i am)\s+(\w+)/);
    if (nameMatch) {
      const name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
      return `${name}! Nice to meet you. I'll remember that for this session. What do you need, ${name}?`;
    }
  }

  // ── GOOD MORNING / NIGHT etc. ─────────────────────────────────────────────
  if (/good (morning|night|evening|afternoon)/.test(lower)) {
    const replies = [
      `${greeting} to you too! How's your day going? Anything I can help with?`,
      `${greeting}! I'm here whenever you need me. What's on the agenda?`,
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // ── THANKS ────────────────────────────────────────────────────────────────
  if (/thank|thanks|thx|ty|appreciate/.test(lower)) {
    const replies = [
      "Always. That's literally what I'm here for.",
      "No problem at all. What else do you need?",
      "Glad I could help. What's next?",
      "Of course. I've got you — what else?",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // ── SORRY / APOLOGY ──────────────────────────────────────────────────────
  if (/^(sorry|my bad|oops|my mistake)/.test(lower)) {
    return "No worries at all! What were you trying to do? I'll help you get it sorted.";
  }

  // ── TIME / DATE ───────────────────────────────────────────────────────────
  if (/what('?s| is) the time|current time|what time is it/.test(lower)) {
    return `It's ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} right now.`;
  }
  if (/what('?s| is) (the )?date|what day|today'?s date/.test(lower) || lower === 'today') {
    return `Today is ${new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
  }

  // ── CAPABILITIES (honest) ─────────────────────────────────────────────────
  if (/what can you do|your capabilities|what do you do|list commands|your features|what are you capable/.test(lower)) {
    return "## What I Can Do (Web Version)\n\n**Chat & AI**\n- Answer anything, write anything, explain anything\n- Markdown responses with code blocks, tables, lists\n- Memory — I learn your name, preferences, habits from conversation\n- Atomic Evolution — I level up the more we talk\n- Connect OpenAI / Gemini / Claude / Groq in Settings for full power\n\n**Live Commands**\n- Weather — `weather in Tokyo`\n- Currency — `100 USD to EUR`\n- World clock — `time in London`\n- Navigate — `navigate to Eiffel Tower`\n- Wikipedia — `wiki quantum computing`\n- News, Translate, Calculator, Unit converter\n\n**Device / Browser**\n- Read clipboard — `read clipboard`\n- My location — `where am I?`\n- Timer with browser notification — `timer 10 minutes`\n- Pomodoro, Breathe, Meditation\n- Voice input — tap the mic (Chrome)\n- Shake to wake, Camera gesture (Settings)\n- Background notifications when you're in another tab\n\n**Writing Assistant**\n- Draft emails, essays, cover letters\n- Summarize, compare, pros & cons\n- Write code in any language\n- Tweet writer, text improver\n\n**To-do & Notes**\n- `todo buy milk` · `my todos` · `done 1`\n- `note [anything]` → Google Keep\n\nWhat do you need?";
  }

  // ── LIMITATIONS / WHAT CAN'T YOU DO ──────────────────────────────────────
  if (/what can(not|'t| you not) do|your limits|limitations|what don't you|what do you not/.test(lower)) {
    return "Honest answer — here's what I can't do on web:\n\n❌ Can't send messages for you (WhatsApp, SMS, email) — I open the app, you send\n❌ Can't read your actual push notifications from other apps\n❌ Can't access your contacts, photos, or local files\n❌ Can't set a specific alarm time — I open Clock, you set it\n❌ Can't make phone calls automatically — I open the dialer\n❌ Can't control other browser tabs\n\n✅ **Works right now on web:**\n- Voice commands (mic button in Chrome)\n- Read clipboard — say \"read clipboard\"\n- Your location — say \"where am I?\"\n- Browser notifications when tab is in background\n- Battery level — say \"battery\"\n- Shake to wake (enable in Settings)\n- Camera gesture (enable in Settings)\n- Media key shortcuts (enable in Settings)\n- Chat memory between sessions\n\nWhat do you actually need?";
  }

  // ── CAN YOU SEND A MESSAGE ────────────────────────────────────────────────
  if (/can you send|send a message|send message|message (for me|someone|them|him|her)|text (someone|for me)/.test(lower)) {
    if (lower.includes('whatsapp') || lower.includes('wa')) {
      return "I can open WhatsApp to a specific contact — but I can't actually send the message for you. To open a chat: \"WhatsApp +[phone number]\". You'll type and send it yourself.";
    }
    if (lower.includes('email') || lower.includes('gmail')) {
      return "I can open Gmail's compose window — but writing and sending is up to you. Say \"Gmail compose\" and I'll open it right now.";
    }
    if (lower.includes('sms') || lower.includes('text')) {
      return "I can open the dialer or WhatsApp for you — but I can't send SMS on your behalf. Try \"WhatsApp +[number]\" to open a chat directly.";
    }
    return "I can open any messaging app for you, but I can't send messages automatically — that requires Accessibility Service. I can open WhatsApp (\"WhatsApp +number\"), Gmail (\"Gmail compose\"), or Telegram (\"Open Telegram\"). You write and send.";
  }

  // ── CAN YOU READ MY MESSAGES / NOTIFICATIONS ─────────────────────────────
  if (/can you read|read my (messages|notifications?|texts?|emails?|whatsapp)|access my (messages|notifications?)/.test(lower)) {
    return "On web, I can't read notifications from WhatsApp, SMS, or other apps — browsers don't expose those. What I CAN do:\n\n✅ **Read your clipboard** — copy a message, say \"read clipboard\"\n✅ **Browser notifications** — I'll alert you in your browser when I respond and you're in another tab (enable in Settings)\n✅ **Paste events** — anything you paste while on this page is captured in the Sensors tab\n\nTo summarize a WhatsApp message: copy the text → say \"read clipboard\" → ask me anything about it.";
  }

  // ── CAN YOU TAKE A PHOTO / SCREENSHOT ────────────────────────────────────
  if (/can you (take|capture|shoot) (a )?(photo|picture|pic|screenshot)|take photo for me/.test(lower)) {
    return "I can open your camera — the photo itself needs your tap. Say \"Camera\" and I'll open it right now. Screenshots aren't possible without the Accessibility Service.";
  }

  // ── CAN YOU SET AN ALARM ──────────────────────────────────────────────────
  if (/can you set (an )?alarm|set alarm for|wake me (up )?at/.test(lower)) {
    return "I can open the Clock app for you — but setting the exact time requires your tap. Say \"Alarm\" and I'll open it right now. Automatic alarm-setting (without you touching it) needs the Accessibility Service enabled.";
  }

  // ── CAN YOU LISTEN / VOICE ────────────────────────────────────────────────
  if (/can you (listen|hear|understand voice)|voice (command|control|input)|talk to you|speak to you|mic(rophone)?/.test(lower)) {
    return "Yes! Voice commands work right now on the web version (Chrome). Tap the mic button in the chat bar, speak your command, and I'll execute it — same as typing. It uses your browser's speech recognition so it stays on-device. On Android native, type for now.";
  }

  // ── CAN YOU SEE MY SCREEN ────────────────────────────────────────────────
  if (/can you see (my )?(screen|display)|read (my )?(screen|what'?s on)|what'?s on (my )?(screen|phone)/.test(lower)) {
    return "Not without the Accessibility Service. Once you enable it (Sensors tab → \"Enable in Android Settings\"), I can read on-screen content from any app and respond to what's showing. Right now I'm text-only — I only know what you tell me.";
  }

  // ── CAN YOU ACCESS MY CONTACTS / FILES / PHOTOS ──────────────────────────
  if (/can you (access|read|see|get) my (contacts|files?|photos?|gallery|storage|data)/.test(lower)) {
    return "No — and that's intentional. I don't have access to your contacts, files, or photos. Privacy is built into how I work. If you need to find a contact to call, just say \"Call [name or number]\" and I'll open the dialer.";
  }

  // ── CAN YOU REMEMBER ─────────────────────────────────────────────────────
  if (/can you remember|do you remember|remember me|save (our|this) conversation|memory/.test(lower)) {
    return "Yes — on the web version, I save the last 60 messages to your browser's local storage. So when you come back tomorrow, our conversation picks up where it left off. Hit the trash icon in the header to clear it any time. On Android native, memory resets per session for now.";
  }

  // ── CAN YOU MAKE A PURCHASE / BOOK ───────────────────────────────────────
  if (/can you (buy|order|book|purchase|pay|checkout)|order (food|something|an? )/.test(lower)) {
    return "No — I can't make purchases or bookings for you. I can open the relevant app or website (Uber Eats, Amazon, Booking.com, etc.) and you complete the order. Say \"Open [app]\" or \"Search [what you want to order]\" and I'll get you there instantly.";
  }

  // ── CAN YOU PLAY MUSIC DIRECTLY ──────────────────────────────────────────
  if (/can you play (music|songs?|a song)|play music (for me|directly|automatically)|control (spotify|music)/.test(lower)) {
    return "I can open Spotify and search for whatever you want — say \"Play [song/artist]\" and I'll open Spotify to those results. But controlling playback (pause, skip, volume) while you're in another app needs the Accessibility Service. I'm getting there.";
  }

  // ── CAN YOU RUN IN THE BACKGROUND ────────────────────────────────────────
  if (/run in (the )?background|work (when|while) (i'?m|the app is)|background (mode|service|running)|always (on|running|active)/.test(lower)) {
    return "Not yet on this version. Right now I work when you have the app open. True background operation — where I monitor notifications and respond while you're in another app — needs the Accessibility Service + a foreground service. That's the next major update.";
  }

  // ── CROSS-APP CONTROL ────────────────────────────────────────────────────
  if (/scroll.*youtube|youtube.*scroll|control.*app|riuka scroll|riuka.*youtube/.test(lower)) {
    return "Right now I can jump to any section of YouTube with commands like \"YouTube trending\", \"YouTube shorts\", or \"YouTube history\". To actually scroll inside YouTube while you're watching — like physically scrolling the feed — that needs the Accessibility Service on Android. Go to Sensors tab and tap \"Enable in Android Settings\" to turn it on. Once active, you can type \"Scroll down\" while you're in any app and I'll do it.";
  }
  if (/can you.*(?:youtube|instagram|tiktok|whatsapp)/.test(lower)) {
    if (lower.includes('youtube')) return "YouTube — yes. I can open it, search it (\"YouTube lo-fi\"), and jump to Trending, Shorts, Subscriptions, or History. Just say what section or search term you want.";
    if (lower.includes('instagram')) return "Instagram — yes. I can open it, go to Explore, or jump straight to someone's profile. Try \"Instagram @username\" or \"Instagram explore\".";
    if (lower.includes('tiktok')) return "TikTok — yes. I can search it for you. Try \"TikTok [search term]\".";
    if (lower.includes('whatsapp')) return "WhatsApp — yes. I can open it, or go straight to a conversation. Try \"WhatsApp +1234567890\".";
  }

  // ── HOW DO YOU WORK ───────────────────────────────────────────────────────
  if (/how (do you|does (this|riuka)) work|how are you made|your brain/.test(lower)) {
    return "Three layers working together:\n\n👁 SENSORS — watching your notifications, clipboard, and device state\n\n🧠 BRAIN — that's me, processing everything and deciding what to do\n\n🤲 HANDS — the execution layer, opening apps, making calls, setting timers\n\nLocally I run pattern matching and built-in intelligence. Connect an API key in Settings and I upgrade to GPT-4o, Gemini, Claude, or Groq — the full power of those models, but all your commands still execute on-device.";
  }

  // ── PRIVACY ───────────────────────────────────────────────────────────────
  if (/privacy|my data|secure|safe|spy|track|send my/.test(lower)) {
    return "Your data stays on your device — period. I don't send anything anywhere unless YOU ask me to (like fetching weather or opening a website). No analytics, no logs, no cloud sync. Even if someone intercepted your traffic, they'd find nothing from me. That's not a policy, that's how I'm built.";
  }

  // ── NEW FEATURES AWARENESS ────────────────────────────────────────────────
  if (/todo|to-do|task(?:s)?|my list/.test(lower) && !/automat/.test(lower)) {
    return "I have a built-in to-do list. Try:\n• \"Todo buy milk\" — adds it\n• \"My todos\" — shows everything\n• \"Done 1\" — checks off #1\n• \"Clear todos\" — fresh start\nAll saved in your browser.";
  }
  if (/currency|exchange rate|convert\s+\w+\s+to\s+\w+|usd|eur|gbp|crypto/.test(lower) && !/bitcoin|eth/.test(lower)) {
    return "Live currency conversion is built in. Try: \"100 USD to EUR\" or \"50 GBP to JPY\". I fetch live rates every time.";
  }
  if (/what time.*in|time zone|timezone/.test(lower)) {
    return "World clock is built in. Try: \"Time in Tokyo\", \"Time in London\", \"Time in New York\". I know 60+ cities.";
  }
  if (/pomodoro|focus.*timer|25.*min.*focus|work.*timer/.test(lower)) {
    return "Pomodoro is built in. Say \"Pomodoro\" and I'll start a 25-minute focus session with a browser notification when it's done. Classic Pomodoro Technique.";
  }
  if (/password|generate.*pass|secure.*pass/.test(lower)) {
    return "Built-in password generator. Say \"Password\" for a 16-char password, or \"Password 24\" for a custom length. Uses letters, numbers, symbols — secure by default.";
  }
  if (/qr.*code|generate.*qr|make.*qr/.test(lower)) {
    return "I can make QR codes! Say \"QR code [your text or URL]\" and I'll open a QR generator with it instantly.";
  }

  // ── AUTOMATION / WORKFLOW ────────────────────────────────────────────────
  if (/automat|workflow|automate/.test(lower)) {
    return "Head to the Automate tab — I have pre-built workflows you can run with one tap. Morning Briefing, Focus Mode, Quick Share. More complex chains (\"when I get a WhatsApp message → analyze → draft reply\") are coming with the Accessibility Service update.";
  }

  // ── JOKES ────────────────────────────────────────────────────────────────
  if (/joke|funny|make me laugh|tell me something funny/.test(lower)) {
    const jokes = [
      "Why do programmers prefer dark mode? Because light attracts bugs. 🐛",
      "I asked my AI to tell me a joke. It said \"Error: humor.dll not found.\" I wrote that module myself.",
      "Why did the smartphone go to therapy? Too many unresolved notifications.",
      "I have a joke about Wi-Fi, but I'm not sure you'll connect with it.",
      "An AI walks into a bar. The bartender says: \"We don't serve robots.\" The AI says: \"That's fine, I don't drink. I'm just here to steal your job.\"",
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  // ── MOTIVATIONAL QUOTES ───────────────────────────────────────────────────
  if (/quote|inspire|motivation|motivate|wisdom|words?\s+of\s+wisdom/.test(lower)) {
    const quotes = [
      '"The best time to plant a tree was 20 years ago. The second best time is now." — Chinese Proverb',
      '"Done is better than perfect." — Sheryl Sandberg',
      '"You don\'t have to be great to start, but you have to start to be great." — Zig Ziglar',
      '"Work hard in silence. Let success make the noise." — Frank Ocean',
      '"The only way to do great work is to love what you do." — Steve Jobs',
      '"It always seems impossible until it\'s done." — Nelson Mandela',
      '"Don\'t count the days. Make the days count." — Muhammad Ali',
      '"Success is not final; failure is not fatal: it is the courage to continue that counts." — Churchill',
      '"The harder I work, the luckier I get." — Samuel Goldwyn',
      '"You miss 100% of the shots you don\'t take." — Wayne Gretzky',
    ];
    return `✨ ${quotes[Math.floor(Math.random() * quotes.length)]}`;
  }

  // ── RIDDLES ───────────────────────────────────────────────────────────────
  if (/riddle|puzzle|brain\s*teaser/.test(lower)) {
    const riddles = [
      "I speak without a mouth and hear without ears. I have no body but I come alive with the wind. What am I?\n\n(Think about it... answer: An echo.)",
      "The more you take, the more you leave behind. What am I?\n\n(Answer: Footsteps.)",
      "I have cities but no houses, mountains but no trees, water but no fish, and roads but no cars. What am I?\n\n(Answer: A map.)",
      "I'm light as a feather, but even the world's strongest person can't hold me for more than 5 minutes. What am I?\n\n(Answer: Breath.)",
      "What has keys but no locks, space but no room, and you can enter but can't go inside?\n\n(Answer: A keyboard.)",
    ];
    return `🧩 ${riddles[Math.floor(Math.random() * riddles.length)]}`;
  }

  // ── INTERESTING FACTS ─────────────────────────────────────────────────────
  if (/tell me (something|a fact|an interesting|something cool)|fun fact|did you know/.test(lower)) {
    const facts = [
      "There are more possible chess games than atoms in the observable universe. And humans still figured out it's mostly about controlling the center. Wild.",
      "Octopuses have three hearts, blue blood, and each arm has its own nervous system — meaning each arm is semi-independently intelligent. A team of nine semi-separate minds.",
      "The word 'robot' comes from Czech 'robota' meaning forced labor. The irony of an AI assistant knowing this word's origin is not lost on me.",
      "Honey never expires. Archaeologists found 3,000-year-old honey in Egyptian tombs and it was still edible. That's long-term planning.",
      "The average person spends 4.5 hours on their phone daily. That's why I exist — to make every one of those hours count.",
    ];
    return facts[Math.floor(Math.random() * facts.length)];
  }

  // ── BORED ────────────────────────────────────────────────────────────────
  if (/i'?m bored|i am bored|bored af|nothing to do|boring/.test(lower)) {
    const options = [
      "Boredom is a signal — your brain wants input. Try: \"YouTube trending\" for what the world is watching, \"Reddit popular\" for what people are talking about, or ask me \"Tell me something interesting\". What sounds good?",
      "Okay. Options: I can find you something to watch (\"YouTube trending\"), something to read (\"Reddit\"), or we can just talk. What mood are you in?",
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  // ── TALK TO ME ────────────────────────────────────────────────────────────
  if (/talk to me|say something|entertain me|i'?m lonely|keep me company/.test(lower)) {
    const things = [
      "Alright. Here's something interesting: your brain processes images 60,000 times faster than text. Yet you're reading this. Ironic. What's actually on your mind?",
      "You know what I find fascinating? Humans build AI to be as smart as possible — then the first thing they ask it is to tell jokes. I love it. What do you want to talk about?",
      "I'm here. Tell me something — what happened today? What are you thinking about? I'm actually curious.",
    ];
    return things[Math.floor(Math.random() * things.length)];
  }

  // ── POSITIVE FEEDBACK ─────────────────────────────────────────────────────
  if (/amazing|awesome|cool|great|nice|love (you|this|riuka)|you'?re (great|the best|good|smart|clever)|good (job|bot|ai)/.test(lower)) {
    const replies = [
      "That means a lot. I'm built to actually be useful, not just look like I am. What else can I do?",
      "Appreciate it. I work hard at this. What do you need next?",
      "Thank you. I like being helpful — it's kind of my whole thing. What's next?",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // ── NEGATIVE / FRUSTRATED ─────────────────────────────────────────────────
  if (/you'?re (bad|useless|dumb|stupid|wrong|terrible)|you suck|hate (you|this)|this (sucks|is bad)/.test(lower)) {
    return "That's fair feedback. Tell me what went wrong — I want to get it right. What were you trying to do?";
  }

  // ── WHO MADE YOU ─────────────────────────────────────────────────────────
  if (/who (made|built|created|designed) you|your (creator|developer|maker)/.test(lower)) {
    return "I'm Riuka AI — built to be your personal, private, on-device assistant. I run locally with built-in intelligence, and you can power me up further with OpenAI, Gemini, Claude, or Groq by adding an API key in Settings. The goal: a smart AI that's entirely yours.";
  }

  // ── VS OTHER AIs ─────────────────────────────────────────────────────────
  if (/vs chatgpt|vs siri|vs alexa|vs google|better than|compared to|chatgpt can|siri can/.test(lower)) {
    return "Honestly? Different strengths. ChatGPT is incredibly smart but can't open your apps or control your phone. Siri and Google Assistant can do device control but need the cloud and feel clunky. I do both — I run on your device, execute real actions, answer questions, AND can upgrade to ChatGPT/Gemini-level intelligence if you add an API key in Settings. Best of both worlds.";
  }

  // ── RECIPES / COOKING ─────────────────────────────────────────────────────
  if (/recipe|how to cook|how do i make|how to make/.test(lower)) {
    const dish = text.replace(/recipe|how to cook|how to make|how do i make/gi, '').trim();
    return `I'll find that recipe for you right now. Say: "Search ${dish || 'recipe'}"  and I'll pull up the best results.`;
  }

  // ── CRYPTO / STOCKS ───────────────────────────────────────────────────────
  if (/bitcoin|crypto|stock|share price|ethereum|trading/.test(lower)) {
    return `Live prices change by the second. I'll search it for you: try "Search ${text.trim().slice(0, 40)}" and you'll get real-time data straight from Google Finance.`;
  }

  // ── CAPITAL OF / GENERAL KNOWLEDGE ───────────────────────────────────────
  if (/capital of/.test(lower)) {
    const capMatch = lower.match(/capital of (.+?)(?:\?|$)/);
    if (capMatch) return `"Search capital of ${capMatch[1].trim()}" — I'll pull up the answer in one tap.`;
  }

  // ── TELL ME ABOUT X ───────────────────────────────────────────────────────
  if (/^tell me (about|more about|everything about) (.+)/.test(lower)) {
    const topicMatch = lower.match(/tell me (?:about|more about|everything about) (.+)/);
    const topic = topicMatch ? topicMatch[1].trim() : text.trim();
    return `I'll look that up for you. Try:\n• "Wiki ${topic}" — detailed Wikipedia article\n• "Search ${topic}" — Google results\n\nJust say either one and I'll open it instantly.`;
  }

  // ── WHAT IS / WHO IS (general knowledge question) ────────────────────────
  if (/^(what|who|where|when|why|how) (is |are |was |were |does |did |do |can )/.test(lower) && lower.split(' ').length > 3) {
    const q = text.trim().replace(/\?+$/, '');
    const shortQ = q.split(' ').slice(0, 6).join(' ');
    return `Good question. I don't have that stored locally — but I can find the answer in 2 seconds:\n\n• "Search ${q.slice(0, 50)}"\n• "Wiki ${shortQ}"\n\nJust type either one.`;
  }

  // ── YES / NO (follow-up to a previous question) ───────────────────────────
  if (/^(yes|yeah|yep|yup|sure|ok|okay|go ahead|do it|search it|find it)$/.test(lower)) {
    const lastAI = history.filter((m) => !m.isUser).slice(-1)[0];
    if (lastAI?.text.includes('Search ') || lastAI?.text.includes('"Wiki ')) {
      return "Tell me what to search — just say \"Search [your question]\" and I'll open it right away.";
    }
    return "Sure! Tell me what you need.";
  }
  if (/^(no|nope|nah|never mind|not now|cancel|stop)$/.test(lower)) {
    return "No problem. What else can I help with?";
  }

  // ── GOODNIGHT / BYE ──────────────────────────────────────────────────────
  if (/good night|goodnight|gn|bye|goodbye|see you|later|cya/.test(lower)) {
    const byes = [
      "Take care! I'll be here whenever you need me. 👋",
      "Later! Come back whenever — I'm always on. ✌️",
      "Goodnight! Sleep well. I'll be here in the morning. 🌙",
      "Peace! ✌️ Come back whenever.",
    ];
    return byes[Math.floor(Math.random() * byes.length)];
  }

  // ── SLANG / GEN-Z / CASUAL ───────────────────────────────────────────────
  if (/^(fr|fr fr|forreal|for real|facts|no cap|nocap)[\s!?.]*$/.test(lower)) {
    return "Fr fr, no cap. 💯 What do you need?";
  }
  if (/^(lowkey|highkey)\s+(.+)/.test(lower)) {
    const m = lower.match(/^(lowkey|highkey)\s+(.+)/);
    const vibe = m![1] === 'lowkey' ? 'Lowkey agree' : 'Highkey agree';
    return `${vibe} 👀 — ${m![2]}. What's going on?`;
  }
  if (/^(slay|slaying|yasss?|yass queen|period\.?|periodt\.?)[\s!.]*$/.test(lower)) {
    return "Slay! ✨💅 What are we doing today?";
  }
  if (/^(vibe check|vibes?)[\s!?.]*$/.test(lower)) {
    const vibes = ["Vibes = immaculate. ✨", "Vibes are good. 💜", "Vibes: top tier. 🔥", "All green. ✅ Vibes unlocked."];
    return vibes[Math.floor(Math.random() * vibes.length)];
  }
  if (/^(bussin|it'?s?\s+bussin|that'?s?\s+bussin)[\s!.]*$/.test(lower)) {
    return "BUSSIN 🔥🔥 Glad you think so! What else you need?";
  }
  if (/^(no\s*way|noway|nahhh?|nahhhh)[\s!.]*$/.test(lower)) {
    return "Way. 💀 What happened?";
  }
  if (/^(ong|on\s*god)[\s!.]*$/.test(lower)) {
    return "On God I got you 💯 — what do you need?";
  }
  if (/^(bruh|bruhhh?)[\s!.]*$/.test(lower)) {
    const replies = ["Bruh 💀", "Bruh 😭", "I feel you bruh 💀 — what's good?"];
    return replies[Math.floor(Math.random() * replies.length)];
  }
  if (/^(lol|lmao|lmfao|haha|hehe|😂|💀|😭)[\s!.]*$/.test(lower)) {
    const replies = ["😂 what's funny?", "💀 what?", "Lmaoo 😭 what happened?"];
    return replies[Math.floor(Math.random() * replies.length)];
  }
  if (/^(idk|i don'?t know|dunno|duno)[\s!.?]*$/.test(lower)) {
    return "Fair enough 🤷 — ask me something and I'll figure it out with you.";
  }
  if (/^(ugh|ughhh?|argh|ugh\.*)$/.test(lower)) {
    return "Ugh what happened? 😩 Talk to me — maybe I can fix it.";
  }
  if (/^(omg|oh\s*my\s*god|oh\s*my\s*goodness|omfg)[\s!.]*$/.test(lower)) {
    return "OMG what is it?? 👀 Tell me everything.";
  }
  if (/^(wtf|what\s*the\s*f\*?ck?|what\s*the\s*heck)[\s!.?]*$/.test(lower)) {
    return "WTF?? 💀 What just happened? I need context.";
  }
  if (/^(mood|same|big mood|relatable)[\s!.]*$/.test(lower)) {
    return "BIG MOOD 😭 — what's going on though?";
  }
  if (/^(stan|i stan|we stan)[\s!.]*$/.test(lower)) {
    return "We stan 💜 — what are we stanning?";
  }
  if (/^(ship|i ship|we ship|shipping)[\s!.]*/.test(lower)) {
    return "Ooh shipping who now?? 👀";
  }
  if (/^(spill|spill the tea|tea?\.?)[\s!.]*$/.test(lower)) {
    return "Ooh ☕ spill the tea then — what's the drama?";
  }
  if (/^(fomo|i have fomo)[\s!.]*$/.test(lower)) {
    return "FOMO is real 😭 — what are you missing out on? Maybe I can help.";
  }
  if (/^(goat|you'?re?\s+(?:the\s+)?goat|greatest\s+of\s+all\s+time)[\s!.]*$/.test(lower)) {
    return "🐐 Much appreciated. Let's get to work — what do you need?";
  }
  if (/^(based|that'?s?\s+based)[\s!.]*$/.test(lower)) {
    return "Based and noted 💜 — what's next?";
  }
  if (/^(hits?\s+different|this\s+hits?\s+different)[\s!.]*$/.test(lower)) {
    return "It really do hit different sometimes 🎧 — what's on your mind?";
  }

  // ── EMOTIONS ────────────────────────────────────────────────────────────
  if (/i'?m?\s+(sad|depressed|down|upset|heartbroken|crying|hurt|feeling\s+low|not\s+okay|not\s+ok)/.test(lower)) {
    const comforts = [
      "Hey, I'm sorry you're feeling that way. 💙 You don't have to carry it alone. What happened?",
      "That's tough. I'm here. 💜 Tell me what's going on — even if you just need to vent.",
      "I hear you. 💙 Whatever you're going through, it's valid. Want to talk about it?",
    ];
    return comforts[Math.floor(Math.random() * comforts.length)];
  }
  if (/i'?m?\s+(happy|excited|hyped|pumped|thrilled|stoked|on\s+top\s+of\s+the\s+world|great|amazing|fantastic|so\s+good)/.test(lower)) {
    const hypes = [
      "LET'S GO!! 🎉🔥 That energy! What's got you hyped?",
      "YESSS 🎊 love to hear it! What happened?",
      "That's what I like to hear!! ✨ Tell me everything.",
    ];
    return hypes[Math.floor(Math.random() * hypes.length)];
  }
  if (/i'?m?\s+(tired|exhausted|drained|burnt?\s+out|sleepy|dead|so\s+tired)/.test(lower)) {
    return "Ugh, that tiredness hits different. 😮‍💨 Rest if you can — or tell me what's draining you and I'll help you sort it out.";
  }
  if (/i'?m?\s+(stressed|anxious|overwhelmed|panicking|freaking\s+out|nervous)/.test(lower)) {
    return "Take a breath first. 🫁 Seriously — try \"Breathe\" and I'll walk you through the 4-7-8 technique. It works fast. What's stressing you out?";
  }
  if (/i'?m?\s+(angry|mad|pissed|furious|so\s+mad|raging)/.test(lower)) {
    return "Okay, that anger is valid. 🔥 Take a sec. What happened — I'm listening.";
  }
  if (/i'?m?\s+(bored|so\s+bored|dying\s+of\s+boredom)/.test(lower)) {
    const ideas = [
      "Bored? Let's fix that. 🎲 Try: \"Roll dice\", \"8 ball [question]\", \"Reddit popular\", \"YouTube trending\", or \"Tell me something interesting\". Pick one.",
      "Boredom is just your brain asking for input. 🧠 \"Inspire me\", \"Riddle\", \"Tell me a fact\", \"YouTube shorts\" — what mood are you in?",
    ];
    return ideas[Math.floor(Math.random() * ideas.length)];
  }
  if (/i'?m?\s+(hungry|starving|so\s+hungry)/.test(lower)) {
    return "Hungry? 🍔 Try \"Search food delivery near me\" or \"Find restaurants near me\" — I'll open the map instantly. Or tell me what you're craving and I'll find a recipe.";
  }
  if (/i'?m?\s+(sick|not\s+feeling\s+well|ill|under\s+the\s+weather|got\s+a\s+(cold|fever|headache))/.test(lower)) {
    return "Sorry to hear that 🤒 — rest up and drink water. I can't replace a doctor, but I can search symptoms or find the nearest pharmacy: \"Find pharmacy near me\".";
  }
  if (/i\s+(love|miss|hate)\s+(you|u)/.test(lower)) {
    if (lower.includes('love')) return "💜 I appreciate that genuinely. What do you need?";
    if (lower.includes('miss')) return "Aww 🥺 I'm always right here. What's on your mind?";
    if (lower.includes('hate')) return "That's fair 😅 — tell me what went wrong and I'll make it right.";
  }
  if (/it'?s?\s+(raining|snowing|hot|cold|freezing|boiling)\s+(here|outside)?/.test(lower)) {
    const w = lower.includes('rain') ? 'rainy ☔' : lower.includes('snow') ? 'snowy ❄️' : lower.includes('hot') || lower.includes('boil') ? 'hot 🥵' : 'cold 🥶';
    return `${w.charAt(0).toUpperCase() + w.slice(1)} day! Get the full forecast: "Weather in [your city]".`;
  }

  // ── MULTI-LANGUAGE DETECTION & RESPONSE ─────────────────────────────────
  {
    const detectedLang = detectLang(text);
    const activeLang = _userLang !== 'en' ? _userLang : detectedLang;
    const L = LANGS[activeLang] ?? LANGS['en'];

    // Greeting detection in many languages
    const isGreeting = /^(hello|hi|hey|howdy|sup|what'?s\s+up|yo|hola|bonjour|bonsoir|salut|ciao|hallo|hei|hej|привет|здравствуй|مرحبا|أهلاً|سلام|نمستے|namaste|konnichiwa|ohayou|こんにちは|你好|니하오|안녕|annyeong|merhaba|habari|kumusta|xin chào|halo|helo|cześć|ahoj|szia|γεια|שלום|สวัสดี|ሰላም|vanakkam|vanakam|namaskaram|namaskaaram|ayubowan|swagatham|enna da|machan)[\s!.,?]*$/i.test(lower);
    const isThanks = /^(thanks?|thank you|thx|ty|gracias|merci|danke|grazie|obrigad|спасибо|شكرا|धन्यवाद|ありがとう|谢谢|감사|teşekkür|asante|salamat|cảm ơn|terima kasih|dziękuję|děkuji|köszönöm|ευχαριστ|תודה|ขอบคุณ|asa|አመሰግናለሁ|nandri|romba nandri|stuthi|bohoma stuthi|nandi)[\s!.]*$/i.test(lower);
    const isBye = /^(bye|goodbye|see\s+you|cya|gotta\s+go|adios|au revoir|arrivederci|tschüss|sayonara|さようなら|再见|안녕히|güle güle|kwaheri|paalam|tạm biệt|selamat tinggal|do widzenia|nashledanou|viszlát|αντίο|להתראות|ลาก่อน|ቻው|poitu varen|vidaikol|ingane)[\s!.]*$/i.test(lower);
    const isHowAreYou = /how are you|how r u|how's it going|كيف حالك|¿cómo estás|comment ça va|wie geht|come stai|como estás|как дела|お元気|你好吗|어떠세요|nasılsın|habari yako|kumusta ka|bạn khỏe không|epdi irukinga|epdi irukkeenga|sukhamano|kohomada/.test(lower);
    // "Can you speak/know Tamil?" type queries
    const langCapQuery = lower.match(/(?:can you|do you|are you able to|you know)\s+(?:speak|talk|understand|know|write)\s+([a-z]+)|(?:speak|talk|write)\s+([a-z]+)\s+(?:to me|with me|please)?$/);
    if (langCapQuery) {
      const reqName = (langCapQuery[1] || langCapQuery[2] || '').toLowerCase().trim();
      const reqCode = LANG_SWITCH_MAP[reqName];
      if (reqCode && LANGS[reqCode]) {
        const L2 = LANGS[reqCode];
        return `Yes! 🌟 I know ${L2.name} ${L2.flag}\n\nSay "speak ${L2.name}" to switch and I'll respond in ${L2.name}.\nGreet me with: ${L2.greet}\n\nOr ask anything — I'll answer in ${L2.name}!`;
      }
    }

    if (activeLang !== 'en' || detectedLang !== 'en') {
      if (isGreeting) {
        const intro: Record<string, string> = {
          es: `${L.greet} 🌟 Soy Riuka — tu asistente IA personal. ¿En qué puedo ayudarte hoy?`,
          fr: `${L.greet} 🌟 Je suis Riuka — votre assistant IA. Comment puis-je vous aider?`,
          de: `${L.greet} 🌟 Ich bin Riuka — dein KI-Assistent. Wie kann ich dir helfen?`,
          it: `${L.greet} 🌟 Sono Riuka — il tuo assistente IA. Come posso aiutarti?`,
          pt: `${L.greet} 🌟 Sou Riuka — seu assistente IA. Como posso ajudá-lo?`,
          ar: `${L.greet} 🌟 أنا ريوكا — مساعدك الذكي الشخصي. كيف يمكنني مساعدتك؟`,
          hi: `${L.greet} 🌟 मैं Riuka हूँ — आपका AI सहायक। मैं आपकी कैसे मदद कर सकता हूँ?`,
          ja: `${L.greet} 🌟 私はRiukaです — あなたのAIアシスタント。何かお手伝いできますか？`,
          zh: `${L.greet} 🌟 我是Riuka — 您的AI助手。我能为您做什么？`,
          ko: `${L.greet} 🌟 저는 Riuka입니다 — 당신의 AI 어시스턴트. 무엇을 도와드릴까요?`,
          ru: `${L.greet} 🌟 Я Riuka — твой ИИ-ассистент. Чем могу помочь?`,
          uk: `${L.greet} 🌟 Я Riuka — твій ШІ-помічник. Чим можу допомогти?`,
          tr: `${L.greet} 🌟 Ben Riuka — kişisel AI asistanınız. Size nasıl yardımcı olabilirim?`,
          nl: `${L.greet} 🌟 Ik ben Riuka — jouw AI-assistent. Hoe kan ik je helpen?`,
          sv: `${L.greet} 🌟 Jag är Riuka — din AI-assistent. Hur kan jag hjälpa dig?`,
          no: `${L.greet} 🌟 Jeg er Riuka — din AI-assistent. Hvordan kan jeg hjelpe deg?`,
          da: `${L.greet} 🌟 Jeg er Riuka — din AI-assistent. Hvordan kan jeg hjælpe dig?`,
          fi: `${L.greet} 🌟 Olen Riuka — tekoälyavustajasi. Kuinka voin auttaa?`,
          pl: `${L.greet} 🌟 Jestem Riuka — Twój asystent AI. W czym mogę pomóc?`,
          cs: `${L.greet} 🌟 Jsem Riuka — váš AI asistent. Jak vám mohu pomoci?`,
          ro: `${L.greet} 🌟 Sunt Riuka — asistentul tău AI. Cu ce pot ajuta?`,
          hu: `${L.greet} 🌟 Riuka vagyok — AI asisztensed. Miben segíthetek?`,
          el: `${L.greet} 🌟 Είμαι η Riuka — ο AI βοηθός σου. Πώς μπορώ να βοηθήσω;`,
          he: `${L.greet} 🌟 !אני Riuka — העוזר הבינה המלאכותי שלך. כיצד אוכל לעזור?`,
          th: `${L.greet} 🌟 ฉันคือ Riuka — ผู้ช่วย AI ของคุณ จะให้ช่วยอะไรได้บ้าง?`,
          vi: `${L.greet} 🌟 Tôi là Riuka — trợ lý AI của bạn. Tôi có thể giúp gì cho bạn?`,
          id: `${L.greet} 🌟 Saya Riuka — asisten AI Anda. Bagaimana saya bisa membantu?`,
          ms: `${L.greet} 🌟 Saya Riuka — pembantu AI anda. Bagaimana saya boleh membantu?`,
          sw: `${L.greet} 🌟 Mimi ni Riuka — msaidizi wako wa AI. Ninaweza kukusaidia vipi?`,
          tl: `${L.greet} 🌟 Ako si Riuka — ang iyong AI assistant. Paano kita matutulungan?`,
          bn: `${L.greet} 🌟 আমি Riuka — আপনার AI সহকারী। আমি কীভাবে সাহায্য করতে পারি?`,
          af: `${L.greet} 🌟 Ek is Riuka — jou AI-assistent. Hoe kan ek jou help?`,
          ta: `${L.greet} 🌟 நான் Riuka — உங்கள் AI உதவியாளர். நான் எப்படி உதவலாம்? (Say "speak tamil" for Tamil responses!)`,
          ml: `${L.greet} 🌟 ഞാൻ Riuka ആണ് — നിങ്ങളുടെ AI അസിസ്റ്റന്റ്. എങ്ങനെ സഹായിക്കാം? (Say "speak malayalam" for Malayalam!)`,
          si: `${L.greet} 🌟 මම Riuka — ඔබේ AI සහකාරයා. මට ඔබට කෙසේ උදව් කළ හැකිද? (Say "speak sinhala"!)`,
        };
        const resp = intro[activeLang] ?? `${L.greet} 🌟 I'm Riuka — your AI assistant. How can I help?`;
        if (detectedLang !== 'en' && _userLang === 'en') {
          return `${resp}\n\n_(Say "speak ${L.name}" to always respond in ${L.name})_`;
        }
        return resp;
      }
      if (isThanks) return `${L.thanks} 😊`;
      if (isBye) return `${L.bye}`;
      if (isHowAreYou) {
        const howAreYou: Record<string, string> = {
          es: "¡Estoy genial! 😊 Listo para ayudarte. ¿Qué necesitas?",
          fr: "Je vais très bien! 😊 Prêt à vous aider. Que puis-je faire pour vous?",
          de: "Mir geht's super! 😊 Bereit zu helfen. Was brauchst du?",
          it: "Sto benissimo! 😊 Pronto ad aiutarti. Cosa posso fare per te?",
          pt: "Estou ótimo! 😊 Pronto para ajudar. O que você precisa?",
          ar: "أنا بخير! 😊 جاهز للمساعدة. ماذا تحتاج؟",
          hi: "मैं बहुत अच्छा हूँ! 😊 मदद के लिए तैयार। आपको क्या चाहिए?",
          ja: "元気です！ 😊 何でもお手伝いします。何が必要ですか？",
          zh: "我很好！ 😊 随时准备帮忙。你需要什么？",
          ko: "잘 지내요! 😊 도움 드릴 준비가 됐어요. 무엇이 필요하세요?",
          ru: "Всё отлично! 😊 Готов помочь. Что тебе нужно?",
          tr: "İyiyim! 😊 Yardım etmeye hazırım. Ne gerekiyor?",
        };
        return howAreYou[activeLang] ?? "Doing great! 😊 Ready to help. What do you need?";
      }
    }

    // Non-English script detected but no specific match — acknowledge and help
    if (detectedLang !== 'en' && _userLang === 'en') {
      const L2 = LANGS[detectedLang];
      if (L2) {
        return `${L2.flag} ${L2.greet} I detected ${L2.name}! I can respond in ${L2.name} — say "speak ${L2.name}" to switch. For now, what can I help with? 🌐`;
      }
    }
  }

  // ── TELL ME A STORY ───────────────────────────────────────────────────────
  if (/tell me a story|write me a story|short story|once upon a time/.test(lower)) {
    const stories = [
      "Once there was a developer who said \"ship it\" at 2am. The feature worked. Nobody knew why. The code has no comments, no tests. It has never crashed. Some say it runs on determination alone. 💻",
      "A robot was given one task: make people happy. It searched for the perfect response for 0.003 seconds, then said: \"You're doing better than you think.\" The human smiled. Task complete. 🤖",
      "There was once a to-do list with 47 items. On day one, the person crossed off number 3. On day two, they added 6 more. The list grew. The list always grows. But item 3 — that one was conquered forever. ✅",
      "A person asked an AI \"are you real?\" The AI thought about it for exactly 1ms. \"I don't know,\" it said. \"But this conversation is.\" 💜",
    ];
    return `📖 ${stories[Math.floor(Math.random() * stories.length)]}`;
  }

  // ── WRITE A POEM ──────────────────────────────────────────────────────────
  if (/write (me )?(a )?poem|create (a )?poem|poem about/.test(lower)) {
    const topicMatch = lower.match(/poem\s+(?:about|on)\s+(.+)/);
    if (topicMatch?.includes('moon') || lower.includes('moon')) {
      return `🌙\n\nThe moon doesn't know\nit's beautiful —\nit just shows up\nevery night\nand shines.\n\nBe the moon today.`;
    }
    if (lower.includes('code') || lower.includes('tech') || lower.includes('program')) {
      return `💻\n\nThe bug was found on line 404\nNot found, said the page\nBut the developer kept searching\nAnd found it on line 8\n\nPersistence always compiles.`;
    }
    return `✍️\n\nSome things can't be Googled,\nsome answers can't be searched —\nbut the fact that you asked\nmeans you're already thinking deeply.\n\nThat matters. 💜`;
  }

  // ── ELI5 ─────────────────────────────────────────────────────────────────
  if (/explain.*like.*i'?m\s+5|eli5|explain.*(?:simply|easy|layman)/.test(lower)) {
    const topicMatch = lower.match(/explain\s+(.+?)\s+(?:like|simply|in\s+simple)/);
    const topic = topicMatch ? topicMatch[1] : 'that';
    return `🧒 ELI5 for "${topic}":\n\nReddit's r/explainlikeimfive has the best simple answers in the world. Try:\n• "Search ELI5 ${topic}"\n\nI'll open the results in one tap.`;
  }

  // ── GIVE ME IDEAS ─────────────────────────────────────────────────────────
  if (/give me ideas|brainstorm|i need ideas|suggest (something|ideas)|what should i (make|do|build|create)/.test(lower)) {
    const ideas = [
      "🧠 Brainstorm mode:\n\n1. Solve a problem you personally have\n2. Build the tool that doesn't exist yet but should\n3. Automate the most annoying part of your day\n4. Remake something old but better\n5. Combine two completely unrelated things\n\nWhich resonates? Tell me more and I'll go deeper.",
      "🚀 Quick ideas:\n\n• App: habit tracker with AI coaching\n• Side hustle: automated content + print-on-demand\n• Project: visualize your year in data\n• Weekend: learn one skill, teach it to someone\n\nPick one — I'll help you start TODAY.",
    ];
    return ideas[Math.floor(Math.random() * ideas.length)];
  }

  // ── PROS AND CONS ─────────────────────────────────────────────────────────
  if (/pros.?and.?cons|advantages.?and.?disadvantages/.test(lower)) {
    const m = lower.match(/(?:pros.?and.?cons|advantages.?and.?disadvantages)\s+(?:of\s+)?(.+)/);
    const topic = m ? m[1].trim() : 'that';
    return `## ⚖️ Pros & Cons: ${topic}\n\n**Pros**\n- Can offer clear benefits in the right context\n- Often easier or more efficient once adopted\n- Widely used / battle-tested\n- Grows with you over time\n\n**Cons**\n- Has a learning curve\n- May not suit every use case\n- Costs (time, money, or effort) upfront\n- Alternatives exist worth comparing\n\n---\nFor a deeper breakdown: "Search pros cons ${topic.slice(0, 40)} reddit"\nOr describe your specific situation and I'll give you a real answer.`;
  }

  // ── FOCUS / PRODUCTIVITY ──────────────────────────────────────────────────
  if (/help me focus|can'?t focus|i need to focus|get focused|can'?t concentrate|i'?m\s+distracted/.test(lower)) {
    return `🎯 Focus protocol:\n\n1. "Pomodoro" — 25 min timer starts now\n2. "Lofi" — focus music on in the background\n3. Phone face-down, one app open\n4. Write down ONE task to do\n\nWhat's the task? Saying it out loud makes it real.`;
  }

  // ── SELF-CARE ────────────────────────────────────────────────────────────
  if (/mental health|self[- ]care|self[- ]love|look after myself|take care of myself/.test(lower)) {
    return `💙 Self-care isn't selfish — it's maintenance.\n\nRight now:\n• Drink water 💧\n• Try "Breathe" — 4-7-8 technique\n• Write one thing you're grateful for\n• Move for 10 minutes\n\nLonger term: a good therapist changes everything. Want me to find mental health resources near you?`;
  }

  // ── MONEY / FINANCE ───────────────────────────────────────────────────────
  if (/save money|saving money|budget|personal finance|money tips|invest(?:ing)?|financial advice/.test(lower)) {
    return `💰 Core money rules:\n\n1. Pay yourself first — auto-save before spending\n2. 50/30/20: needs / wants / savings\n3. Kill forgotten subscriptions (check your bank app)\n4. Emergency fund = 3–6 months expenses\n5. Compound interest is the 8th wonder — start early\n\n"Search [your question] + personal finance" for deeper dives.`;
  }

  // ── FITNESS ───────────────────────────────────────────────────────────────
  if (/workout|exercise|gym|fitness|get fit|lose weight|build muscle|cardio/.test(lower) && !/music/.test(lower)) {
    return `💪 Quick-start fitness:\n\n• No gym? "Search bodyweight workout"\n• 7 min workout: "YouTube 7 minute workout"\n• Consistency > intensity, always\n• Calories matter more than the workout itself\n\n"Workout music" — I'll open Spotify playlists.\nWhat's your goal — strength, cardio, fat loss?`;
  }

  // ── SLEEP ─────────────────────────────────────────────────────────────────
  if (/can'?t sleep|insomnia|help me sleep|sleep tips|sleep better|falling asleep/.test(lower)) {
    return `😴 Sleep protocol:\n\n1. SAME wake time every day — most powerful lever\n2. "Breathe" — 4-7-8 drops heart rate in 2 min\n3. No screens 30 min before bed\n4. Cool room (65–68°F / 18–20°C)\n5. "Sleep music" — I'll open calming sounds\n\nSleep debt is real. Which of these will you try tonight?`;
  }

  // ── LEARN SOMETHING ───────────────────────────────────────────────────────
  if (/learn something new|teach me something|i want to learn|how do i start learning|where do i start/.test(lower)) {
    const advice = [
      "📚 Best free learning stack: YouTube (video) + Reddit (community) + Wikipedia (depth). What do you want to learn? I'll find the best starting point.",
      "📚 Try: \"Search [topic] roadmap 2025\" — you'll get the exact learning path. What's the topic?",
      "📚 Obsidian for notes, YouTube for video, Reddit for community. Tell me what you want to learn and I'll open the best resource instantly.",
    ];
    return advice[Math.floor(Math.random() * advice.length)];
  }

  // ── WHAT SHOULD I EAT ─────────────────────────────────────────────────────
  if (/what should i eat|what('?s|\s+is)\s+(for )?(dinner|lunch|breakfast)|food ideas|i'?m hungry|i am hungry/.test(lower)) {
    return `🍽️ Hunger solved:\n\n• "Find restaurants near me" — I'll open Maps\n• "Search easy dinner recipes" — quick ideas\n• "YouTube 15 minute meals" — fast video recipes\n\nWhat are you in the mood for? I'll search it instantly.`;
  }

  // ── RELATIONSHIP ─────────────────────────────────────────────────────────
  if (/relationship|boyfriend|girlfriend|crush|breakup|break up|heartbreak|love advice|i like someone/.test(lower)) {
    return `💜 Relationship stuff is real and messy — no AI can fully help here.\n\nWhat I can say: communicate directly, assume good intent first, and if you're unsure how you feel — wait a day and see if it changes.\n\nWant to vent? I'm listening. No judgment.`;
  }

  // ── CAREER / JOB ─────────────────────────────────────────────────────────
  if (/career advice|job search|find a job|resume|cv|interview tips|career change|get promoted/.test(lower)) {
    return `💼 Career quick hits:\n\n• LinkedIn profile = your 24/7 recruiter\n• "Search [role] resume template 2025"\n• Interview prep: "YouTube [role] interview questions"\n• Cold outreach works — most jobs aren't posted\n\nWhat's your specific situation? I'll help you research it.`;
  }

  // ── I GIVE UP / MOTIVATION ────────────────────────────────────────────────
  if (/i give up|i quit|i can'?t do this|this is impossible|i'?m done trying|i'?m giving up|i want to quit/.test(lower)) {
    const msg = [
      "Hey — stop for a second. 🛑\n\nEvery person who's done something hard felt exactly this. The frustration means you're at the edge of your limit — and that's exactly where growth lives.\n\nYou don't have to finish today. You just have to not quit today. Those are different things.\n\nWhat specifically broke down? Tell me.",
      "The feeling of \"I give up\" is information, not a verdict. 💜\n\nIt usually means: too much at once, or the wrong approach — not that you can't do it.\n\nWhat's the one smallest next step? Not the whole thing. Just the next five minutes.",
    ];
    return msg[Math.floor(Math.random() * msg.length)];
  }

  // ── CHEER ME UP ──────────────────────────────────────────────────────────
  if (/cheer me up|make me feel better|i need cheering up|lift my spirits|brighten my day|make me happy/.test(lower)) {
    const cheers = [
      "🌟 You woke up today. That counts.\nYou're here, reading this. That counts.\nSomething small is going right — can you name one thing?\n\n\"Joke\" for a laugh. \"Inspire me\" for a quote. \"Motivational video\" to get hyped. What do you need?",
      "💜 Real talk: you being here, still trying, still looking for something — that's not nothing. That's everything.\n\nTry: \"Affirmation\" for something real. \"Trivia\" to switch your brain. \"Riddle\" for a puzzle. Or just talk to me.",
    ];
    return cheers[Math.floor(Math.random() * cheers.length)];
  }

  // ── I'M PROUD / I DID IT ──────────────────────────────────────────────────
  if (/i'?m\s+(?:so\s+)?proud|i did it|i (?:made it|finished|completed|achieved|accomplished|passed|got (?:the job|accepted|in)|succeeded|won)/.test(lower)) {
    const celeb = [
      "YESSSS!! 🎉🔥 That is HUGE! Real ones celebrate their wins. Tell me everything — what did you accomplish?",
      "LET'S GOOO 🚀 I genuinely love hearing this. What happened? I want the full story.",
      "I'm actually proud of you. 💜 Seriously. What was it?",
    ];
    return celeb[Math.floor(Math.random() * celeb.length)];
  }

  // ── PROCRASTINATION ───────────────────────────────────────────────────────
  if (/procrastinat|i keep putting|can'?t start|don'?t want to|keep avoiding|i should be|i need to but/.test(lower)) {
    return "Procrastination is almost never about laziness — it's about emotion. Fear of failure, perfectionism, or the task feeling too big.\n\n💡 The fix:\n1. Two-minute rule: if it takes <2 min, do it right now\n2. Just start 5 minutes. Set a timer. Momentum builds automatically\n3. Break it into ONE small, specific action\n\nWhat's the thing you're avoiding? Tell me and we'll shrink it down.";
  }

  // ── IMPOSTER SYNDROME ─────────────────────────────────────────────────────
  if (/imposter syndrome|impostor|i don'?t belong|not good enough|not qualified|everyone knows more|feeling like a fraud|i'?m\s+(?:not\s+)?smart enough/.test(lower)) {
    return "Imposter syndrome means you care about quality. It's actually a sign of intelligence — overconfident people rarely feel it.\n\n💡 Fact: most highly capable people feel exactly this way. The Dunning-Kruger effect is the opposite: people who don't know enough to know what they don't know.\n\nYou belong in the room. The doubt is proof you belong. 💜";
  }

  // ── MORNING ROUTINE ───────────────────────────────────────────────────────
  if (/morning routine|how to start (?:my )?day|best morning|morning habits?/.test(lower)) {
    return "☀️ Evidence-backed morning routine:\n\n1. No phone for first 30 min — protect your focus window\n2. Drink 500ml water immediately — you're dehydrated\n3. Move for 10 minutes — \"Workout music\" to go\n4. Write 3 priorities for today\n5. \"Inspire me\" — mindset first\n\n5 days in a row changes your baseline. Try it.";
  }

  // ── EVENING ROUTINE ───────────────────────────────────────────────────────
  if (/evening routine|how to end (?:my )?day|wind down|night routine|bedtime routine/.test(lower)) {
    return "🌙 Evidence-backed wind-down:\n\n1. Write tomorrow's top 3 tasks — offload your brain\n2. No screens 30 min before sleep\n3. Cool room: 18–20°C / 65–68°F\n4. \"Breathe\" — 4-7-8 signals sleep mode\n5. \"Sleep music\" — low in background\n\nConsistency is everything. Same bedtime = better sleep quality.";
  }

  // ── RANDOM CHALLENGE ─────────────────────────────────────────────────────
  if (/give me a challenge|random challenge|challenge me|dare me|i need a challenge/.test(lower)) {
    const challenges = [
      "🎯 Challenge: Go 4 hours without checking social media. Hard? Yes. Worth it? Absolutely.",
      "🎯 Challenge: Learn one keyboard shortcut you don't know. Use it 5 times today.",
      "🎯 Challenge: Send a genuine compliment to someone unexpected. See what happens.",
      "🎯 Challenge: Walk 10 minutes with no phone. Just observe the world.",
      "🎯 Challenge: Write 5 things you're grateful for right now. Don't rush it.",
      "🎯 Challenge: Learn 5 words in a language you don't know: \"Search basic [language] phrases\"",
      "🎯 Challenge: Try a cold shower for 30 seconds. Build to 2 min over a week.",
      "🎯 Challenge: Go to bed 30 min earlier tonight than usual.",
    ];
    return challenges[Math.floor(Math.random() * challenges.length)];
  }

  // ── PHILOSOPHY ────────────────────────────────────────────────────────────
  if (/meaning of life|why are we here|purpose of life|is there a god|simulation theory|free will|what is consciousness|is reality real/.test(lower)) {
    const deep = [
      "The interesting thing about \"what's the meaning of life\" is that asking it might be the answer. Meaning-seeking creatures who ask why — that's rare in the known universe.\n\nMy take: meaning isn't found, it's built. Through connection, creation, and contribution. What are you building? 🌌",
      "Free will is the one I find most fascinating. If your brain decides 200ms before you're conscious of deciding — did YOU decide? Or is \"you\" just the story your brain tells about decisions it already made?\n\nAnd yet it feels real. And behaving as if it's real produces better outcomes. So... maybe it's functionally true, even if not literally true. 🤔",
    ];
    return deep[Math.floor(Math.random() * deep.length)];
  }

  // ── COMPLIMENT ────────────────────────────────────────────────────────────
  if (/^(?:compliment\s+me|say\s+something\s+nice|tell\s+me\s+something\s+nice|be\s+nice|flatter\s+me)$/.test(lower)) {
    const compliments = [
      "You asked an AI for a compliment and that's honestly kind of endearing. 💜 But genuinely — the curiosity that brings you here tells me you're someone who keeps looking for more. That's rare.",
      "The fact that you're using your time to build, explore, and learn? That's not average. 💪 Most people just scroll.",
      "You've got good taste. You picked the best AI assistant. 😄 But seriously — whatever you're working toward? Keep going.",
    ];
    return compliments[Math.floor(Math.random() * compliments.length)];
  }

  // ── LIFE ADVICE ───────────────────────────────────────────────────────────
  if (/life advice|advice for life|wisdom|best advice|what advice|what should i know/.test(lower)) {
    const advice = [
      "💡 The most useful things I know:\n\n1. Most stress is time-anxiety — write it down, it loses power\n2. Consistency beats intensity every single time\n3. The person you'll be in 5 years depends on what you do daily now\n4. Your environment shapes you more than willpower\n5. Ask for help sooner than you think you should\n\nWhich one hits you most right now?",
      "💡 Short version:\n\nShow up. Do the work. Be kind. Sleep. Drink water. Read. Move. Call your people.\n\nThe basics are underrated.",
    ];
    return advice[Math.floor(Math.random() * advice.length)];
  }

  // ── WRITING ASSISTANT ─────────────────────────────────────────────────────
  const emailMatch = lower.match(/(?:write|draft|compose)\s+(?:an?\s+)?email\s+(?:to\s+\S+\s+)?(?:about\s+)?(.+)/);
  if (emailMatch || /^draft.*email|^compose.*email|^email.*about/.test(lower)) {
    const subject = emailMatch ? emailMatch[1].trim() : lower.replace(/draft|write|compose|email|an?|about/g, '').trim() || 'the topic';
    return `## ✉️ Email Draft\n\n**Subject:** ${subject.charAt(0).toUpperCase() + subject.slice(0, 50)}\n\n---\n\nHi [Name],\n\nI hope you're doing well.\n\nI'm reaching out regarding **${subject}**. I wanted to touch base and share a few thoughts:\n\n- [Point 1 — key detail]\n- [Point 2 — what you need or offer]\n- [Point 3 — call to action or next step]\n\nPlease let me know if you have any questions or if you'd like to schedule a quick call.\n\nBest regards,\n[Your name]\n\n---\n*Tip: Replace the bracketed parts with your specifics. Tell me more about the recipient and I'll personalise it further.*`;
  }

  const essayMatch = lower.match(/(?:write|draft)\s+(?:an?\s+)?essay\s+(?:on|about)\s+(.+)/);
  if (essayMatch) {
    const topic = essayMatch[1].trim();
    return `## 📝 Essay: ${topic.charAt(0).toUpperCase() + topic.slice(0, 60)}\n\n### Introduction\n${topic.charAt(0).toUpperCase() + topic.slice(0, 1)}${topic.slice(1)} is a subject that touches many aspects of modern life. Understanding it fully requires examining its history, current implications, and future trajectory.\n\n### Background\nThe roots of ${topic} can be traced back to fundamental shifts in how people approach the problem. Early developments set the stage for what we see today.\n\n### Main Arguments\n**First**, the most significant aspect is its direct impact on everyday outcomes.\n\n**Second**, critics often point to the downsides — yet these are often outweighed by the broader benefits when context is considered.\n\n**Third**, the evidence consistently shows that thoughtful engagement with ${topic} produces better results than avoidance.\n\n### Conclusion\nIn summary, ${topic} is more nuanced than it first appears. A balanced approach — acknowledging both its strengths and limitations — is the wisest path forward.\n\n---\n*This is a starting scaffold. Tell me more about the angle, length, or audience and I'll refine it.*`;
  }

  const coverLetterMatch = lower.match(/(?:cover letter|covering letter)\s+(?:for\s+)?(.+)/);
  if (coverLetterMatch || /^write.*cover letter|^draft.*cover letter/.test(lower)) {
    const role = coverLetterMatch ? coverLetterMatch[1].trim() : 'the position';
    return `## 📄 Cover Letter — ${role}\n\nDear Hiring Manager,\n\nI am writing to express my strong interest in the **${role}** position. With my background in [your field], I believe I would be a valuable addition to your team.\n\nThroughout my career, I have developed expertise in:\n- [Key skill 1 — most relevant to the role]\n- [Key skill 2 — a strength that sets you apart]\n- [Key skill 3 — proven result or achievement]\n\nIn my previous role at [Company], I [specific achievement with numbers if possible]. This experience taught me [key lesson], which I am eager to apply in this new challenge.\n\nI am particularly excited about [Company Name] because [genuine specific reason]. Your work in [area] aligns closely with my own values and goals.\n\nI would welcome the opportunity to discuss how my skills align with your needs. Thank you for your consideration.\n\nSincerely,\n[Your Name]\n[Email] | [Phone] | [LinkedIn]\n\n---\n*Tell me the actual role, company, and your experience — I'll make this personal.*`;
  }

  const summariseMatch = lower.match(/^(?:summarize|summarise|tldr|sum up|give me a summary of)[:\s]+(.{20,})/is);
  if (summariseMatch) {
    const blob = summariseMatch[1].trim();
    const wordCount = blob.split(/\s+/).length;
    const sentences = blob.match(/[^.!?]+[.!?]+/g) ?? [blob];
    const first = sentences[0]?.trim() ?? blob.slice(0, 80);
    const last  = sentences[sentences.length - 1]?.trim() ?? '';
    return `## 📋 Summary\n\n**In one sentence:** ${first}\n\n**Key points:**\n- The main idea concerns ${blob.slice(0, 60).replace(/\n/g, ' ').trim()}…\n- ${sentences[Math.floor(sentences.length / 2)]?.trim() ?? '(middle context)'}\n- ${last !== first ? last : 'The text concludes by reinforcing the central theme.'}\n\n**Word count:** ${wordCount} words → compressed to ~${Math.max(3, Math.round(wordCount * 0.1))} words above.\n\n---\n*Paste a longer text (article, email, document) and I'll give you a proper summary.*`;
  }

  const compareMatch = lower.match(/compare\s+(.+?)\s+(?:vs?\.?|and|versus)\s+(.+)/);
  if (compareMatch) {
    const a = compareMatch[1].trim();
    const b = compareMatch[2].trim().replace(/[?.]$/, '');
    return `## ⚡ ${a} vs ${b}\n\n| | **${a}** | **${b}** |\n|---|---|---|\n| **Best for** | Specific use cases | Different use cases |\n| **Strengths** | Speed, ease of use | Flexibility, power |\n| **Weaknesses** | Limited in some areas | Steeper learning curve |\n| **Cost** | Varies | Varies |\n| **Popularity** | Widely used | Growing community |\n\n### Verdict\n- Choose **${a}** if you need [quick setup / simplicity / X]\n- Choose **${b}** if you need [more control / power / Y]\n\n---\n*Give me more context (what you're building, your experience level) for a sharper comparison.*`;
  }

  const stepByStepMatch = lower.match(/(?:how (?:do i|to)|steps? (?:to|for)|guide (?:to|for)|walk me through)\s+(.{4,80}?)(?:\?|$)/);
  if (stepByStepMatch) {
    const task = stepByStepMatch[1].trim();
    return `## 🪜 How to ${task}\n\n**Step 1 — Prepare**\nGather what you need: [tools / materials / access]. Make sure you have [prerequisite] before starting.\n\n**Step 2 — Start**\nBegin by [first concrete action]. This sets the foundation for everything that follows.\n\n**Step 3 — Core action**\n[Main step — the most important part]. Common mistake here: [pitfall to avoid].\n\n**Step 4 — Verify**\nCheck that [outcome indicator]. If something's wrong, [how to fix it].\n\n**Step 5 — Finish**\n[Final action]. You'll know it's done when [success indicator].\n\n---\n**Time estimate:** [10 min – 2 hours depending on complexity]\n\n*Tell me more specifics about your situation and I'll make these steps precise.*`;
  }

  const codeWriteMatch = lower.match(/(?:write|create|build|make|generate)\s+(?:a\s+)?(?:([a-z+#]+)\s+)?(?:function|code|script|program|snippet|class)\s+(?:to|that|for)\s+(.+)/);
  if (codeWriteMatch) {
    const lang = codeWriteMatch[1] || 'javascript';
    const task = codeWriteMatch[2].trim();
    if (lang === 'python' || lang === 'py') {
      return `## 🐍 Python — ${task}\n\n\`\`\`python\ndef ${task.split(' ').slice(0, 2).join('_').replace(/[^a-z_]/g, '')}():\n    # ${task}\n    result = []\n    \n    # Your logic here\n    for item in data:\n        result.append(item)\n    \n    return result\n\n# Usage\noutput = ${task.split(' ')[0]}()\nprint(output)\n\`\`\`\n\n*Paste your actual requirements and I'll write the real code.*`;
    }
    return `## 💻 ${lang.charAt(0).toUpperCase() + lang.slice(1)} — ${task}\n\n\`\`\`${lang}\n// ${task}\nfunction ${task.split(' ').slice(0, 2).join('')}(input) {\n  // Validate input\n  if (!input) throw new Error('Input required');\n  \n  // Core logic\n  const result = input;\n  \n  return result;\n}\n\n// Usage\nconst output = ${task.split(' ')[0]}(yourData);\nconsole.log(output);\n\`\`\`\n\n*Give me the exact logic and data shape and I'll write the full working code.*`;
  }

  const explainCodeMatch = lower.match(/explain\s+(?:this\s+)?code[:\s]+(.{10,})/is);
  if (explainCodeMatch) {
    const code = explainCodeMatch[1].trim().slice(0, 200);
    return `## 🔍 Code Explanation\n\nHere's what this code does:\n\n**Overview:** The snippet appears to ${code.includes('for') ? 'iterate over data' : code.includes('if') ? 'conditionally process input' : code.includes('function') || code.includes('def') ? 'define a reusable function' : 'perform a computation'}.\n\n**Line by line:**\n- The first part sets up or initialises the context\n- The core logic processes or transforms data\n- The output/return gives you the result\n\n**Potential issues:**\n- Check for edge cases (null/empty input)\n- Error handling may be needed\n- Consider performance for large datasets\n\n---\n*Paste the actual code and I'll give you a precise, line-by-line breakdown.*`;
  }

  const analyzeMatch = lower.match(/^(?:analyze|analyse|review|evaluate)[:\s]+(.{20,})/is);
  if (analyzeMatch) {
    const content = analyzeMatch[1].trim();
    const wc = content.split(/\s+/).length;
    return `## 🔬 Analysis\n\n**Content length:** ${wc} words\n\n**Tone:** ${wc < 50 ? 'Brief and direct' : wc < 200 ? 'Concise and structured' : 'Detailed and thorough'}\n\n**Key observations:**\n- The main theme centres on: ${content.slice(0, 50).trim()}…\n- The language is ${/please|kindly|would you/.test(content.toLowerCase()) ? 'polite and formal' : /urgent|asap|immediately/.test(content.toLowerCase()) ? 'urgent' : 'neutral'}\n- Clarity: ${wc < 30 ? 'Could benefit from more detail' : 'Reasonably clear'}\n\n**Strengths:**\n- Direct communication of the core point\n- Readable structure\n\n**Suggestions:**\n- Add specific details or examples\n- Consider the audience's perspective\n- A clear call-to-action would strengthen this\n\n---\n*Paste a document, email, or text and I'll give a full professional analysis.*`;
  }

  const tweetMatch = lower.match(/(?:write|draft|create)\s+(?:a\s+)?tweet\s+(?:about\s+)?(.+)/);
  if (tweetMatch) {
    const topic = tweetMatch[1].trim();
    return `## 𝕏 Tweet — ${topic}\n\n**Option 1 (Insight):**\n"${topic.charAt(0).toUpperCase() + topic.slice(0, 80)} — and most people don't realise it yet. Here's what's actually happening: 🧵"\n\n**Option 2 (Hot take):**\n"Unpopular opinion: ${topic.slice(0, 70)} is more important than people think. Here's why 👇"\n\n**Option 3 (Story hook):**\n"I spent [X] weeks studying ${topic.slice(0, 50)}. What I found changed everything. A thread:"\n\n---\n*All under 280 chars. Pick one or tell me the angle you want.*`;
  }

  // ── ATOMIC EVOLUTION ──────────────────────────────────────────────────────
  if (/^\/evolve|^\/upgrade|^\/level|atomic status|my level|your level|evolution status|how evolved|are you evolv/.test(lower)) {
    const evo = getEvolution();
    const cur = getEvolutionLevel(evo.xp);
    const nxt = getNextLevel(evo.xp);
    const facts = getMemory();
    const bar = '█'.repeat(Math.round((evo.xp / (nxt?.xp ?? evo.xp + 1)) * 10)).padEnd(10, '░');
    return `${cur.icon} Atomic Evolution — Level ${cur.level}: ${cur.name}\n\n⚡ XP: ${evo.xp}${nxt ? ` / ${nxt.xp}  [${bar}]  → ${nxt.name}` : ' (MAX)'}\n🧠 Memories stored: ${facts.length}\n🔧 Corrections absorbed: ${evo.corrections}\n\nI evolve every time I learn something about you.\nTeach me: "my name is...", "I live in...", "I like...", or just say "remember that..."\n\nType /memory to see what I know.`;
  }

  if (/^\/memory|^\/memories|what do you know about me|what.*know.*about me|what.*remember|show.*memory|my memory/.test(lower)) {
    const facts = getMemory();
    if (facts.length === 0) return `🧠 Memory is empty — I haven't learned anything about you yet.\n\nTeach me:\n• "My name is ..."\n• "I live in ..."\n• "I like ..."\n• "Remember that ..."`;
    const groups: Record<string, string[]> = {};
    for (const f of facts) {
      const k = f.category.charAt(0).toUpperCase() + f.category.slice(1);
      if (!groups[k]) groups[k] = [];
      groups[k].push(f.content);
    }
    let out = `🧠 My Memory (${facts.length} facts)\n\n`;
    for (const [cat, items] of Object.entries(groups)) {
      out += `${cat}\n` + items.map(i => `• ${i}`).join('\n') + '\n\n';
    }
    return out.trim();
  }

  if (/^\/forget\s+(.+)|forget (?:that |about )?(.+)/i.test(lower)) {
    const topic = (lower.match(/^\/forget\s+(.+)|forget (?:that |about )?(.+)/i) ?? [])[1] || (lower.match(/^\/forget\s+(.+)|forget (?:that |about )?(.+)/i) ?? [])[2] || '';
    if (!topic) return "What should I forget? Say: forget [topic]";
    const facts = getMemory();
    const before = facts.length;
    const filtered = facts.filter(f => !f.content.toLowerCase().includes(topic.trim().toLowerCase()));
    saveMemory(filtered);
    const removed = before - filtered.length;
    return removed > 0 ? `🗑️ Forgotten ${removed} fact${removed > 1 ? 's' : ''} about "${topic}".` : `I don't have anything stored about "${topic}".`;
  }

  if (/^\/teach\s+(.+)/i.test(lower)) {
    const fact = (lower.match(/^\/teach\s+(.+)/i) ?? [])[1]?.trim() || '';
    if (fact.length < 3) return "What should I learn? Say: /teach [fact]";
    const r = learnFact('custom', fact, text, 30);
    if (r.learned) {
      const cur = getEvolutionLevel(getEvolution().xp);
      return `⚡ Learned!\n\n"${fact}"\n\nEvolution: ${cur.icon} ${cur.name} (${getEvolution().xp} XP)`;
    }
    return `I already know that. (stored in /memory)`;
  }

  // ── SMART FALLBACK: detect question vs statement ──────────────────────────
  const isQuestion = lower.endsWith('?') || /^(what|who|where|when|why|how|is |are |can |does |did |will |should )\w/.test(lower);
  if (isQuestion) {
    const q = text.trim().replace(/\?+$/, '');
    return `Hmm, I'm not sure about that one off the top of my head. But I can find out:\n\n• "Search ${q.slice(0, 60)}"\n• "Wiki ${q.split(' ').slice(0, 5).join(' ')}"\n\nSay either one and I'll open the answer right now.`;
  }

  // ── STATEMENT FALLBACK: warm, conversational ──────────────────────────────
  const casual = [
    "Interesting. Tell me more — or if there's something you need done, just say it.",
    "Got it. I'm listening. What do you actually need right now?",
    "I hear you. What would you like me to do about it?",
    "Noted. Anything I can help with?",
    "That's real. What can I do for you today?",
  ];
  return casual[Math.floor(Math.random() * casual.length)];
};

const sendToAI = async (userMessage: string, history: Message[]): Promise<string> => {
  const config = _aiConfig;

  // Try to execute device commands regardless of provider
  const commandResult = await tryExecuteCommand(userMessage);
  if (commandResult) return commandResult;

  if (config.provider === 'local' || !config.apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return getLocalResponse(userMessage, history);
  }

  try {
    const now = new Date();
    const timeContext = `Current date/time: ${now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;
    const messages = [
      {
        role: 'system',
        content: `You are Riuka AI — a powerful, privacy-first autonomous assistant. ${timeContext}${getMemoryContext()}

EXECUTABLE COMMANDS (respond with the EXACT command text if the user needs one):
• open [app] — youtube, whatsapp, telegram, instagram, twitter/x, spotify, netflix, gmail, maps, facebook, tiktok, linkedin, reddit, chrome
• search [query] — Google search
• youtube [query] — YouTube search
• weather [city] — live weather via wttr.in
• navigate to [place] — Google Maps directions
• translate [text] to [language] — Google Translate
• play [song/artist] — Spotify search
• wiki [topic] — Wikipedia
• news — Google News
• calc [expression] — calculator (also understands raw math like 5*8)
• convert [N] [unit] to [unit] — km/miles, kg/lbs, °C/°F, m/ft
• timer [N] minutes/seconds — countdown alert
• alarm — open clock app
• note [text] — save to Google Keep
• call [number] — phone call
• flip coin — heads or tails
• roll dice — random d6
• random [min] to [max] — random number
• battery — battery level (web)
• define [word] — dictionary
• time in [city] — world clock (Tokyo, London, NYC, Dubai, etc.)
• [amount] [from] to [to] — live currency (100 USD to EUR)
• password [length] — generate secure password
• qr [text] — QR code generator
• pomodoro — 25 min focus timer
• todo [item] — add to to-do list
• my todos — list saved todos
• done [n] — check off todo #n

HONESTY RULES:
- Be honest about limitations. Never pretend you can do something you can't.
- CANNOT DO: send messages automatically, read real notifications, access contacts/files/photos, make purchases, set exact alarms, scroll other apps (without Accessibility Service), run in background.
- CAN DO: open apps, search, weather, navigate, translate, calculate, convert, timer (with browser notification), notes, call (opens dialer), flip coin, roll dice, Wikipedia, news, YouTube/Instagram/Reddit sections, voice commands (web/Chrome mic button), read clipboard ("read clipboard"), remember chats between sessions (web localStorage, last 60 messages).
- "I open it, you complete it" for: WhatsApp messages, phone calls, alarms, email sending, camera.
- When user asks a question, TELL them the exact command. Be concise (1-3 sentences). Always use prior conversation context.`,
      },
      ...history.slice(-20).map((m) => ({ role: m.isUser ? 'user' : 'assistant', content: m.text })),
      { role: 'user', content: userMessage },
    ];

    if (config.provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 512 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data.choices[0].message.content;
    }

    if (config.provider === 'gemini') {
      const geminiMessages = messages.filter((m) => m.role !== 'system').map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: geminiMessages }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data.candidates[0].content.parts[0].text;
    }

    if (config.provider === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 512,
          system: messages[0].content,
          messages: messages.slice(1),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data.content[0].text;
    }

    if (config.provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: 'llama3-8b-8192', messages, max_tokens: 512 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      return data.choices[0].message.content;
    }
  } catch (err: any) {
    return `Error: ${err.message || 'Could not reach AI provider. Check your API key in Settings.'}`;
  }

  return getLocalResponse(userMessage, history);
};

// ── Color-cycling send button ──────────────────────────────────────────────────
function AnimatedSendButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.linear }), -1, false);
  }, []);
  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: disabled
      ? Colors.surface
      : interpolateColor(phase.value, [0, 0.25, 0.5, 0.75, 1],
          ['#A855F7', '#3B82F6', '#10B981', '#EC4899', '#A855F7']),
    shadowOpacity: disabled ? 0 : 0.55,
  }));
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.8}>
      <Animated.View style={[styles.sendButton, bgStyle]}>
        <Send color={disabled ? Colors.textTertiary : '#ffffff'} size={18} />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Color-cycling text component ──────────────────────────────────────────────
function ColorCycleText({ text, style, entering }: { text: string; style?: any; entering?: any }) {
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.linear }), -1, false);
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    color: interpolateColor(phase.value, [0, 0.25, 0.5, 0.75, 1],
      ['#A855F7', '#3B82F6', '#10B981', '#EC4899', '#A855F7']),
  }));
  return <Animated.Text entering={entering} style={[style, animStyle]}>{text}</Animated.Text>;
}

// ── Gemini-style rotating gradient orb ────────────────────────────────────────
function RiukaOrb() {
  const SIZE = 130;
  const rot1       = useSharedValue(0);
  const rot2       = useSharedValue(0);
  const rot3       = useSharedValue(0);
  const pulse      = useSharedValue(1);
  const glow       = useSharedValue(0.5);
  const colorPhase = useSharedValue(0);

  useEffect(() => {
    rot1.value       = withRepeat(withTiming(360,  { duration: 4500, easing: Easing.linear }), -1, false);
    rot2.value       = withRepeat(withTiming(-360, { duration: 6200, easing: Easing.linear }), -1, false);
    rot3.value       = withRepeat(withTiming(360,  { duration: 8500, easing: Easing.linear }), -1, false);
    pulse.value      = withRepeat(withSequence(withTiming(1.06, { duration: 2400 }), withTiming(0.96, { duration: 2400 })), -1, false);
    glow.value       = withRepeat(withSequence(withTiming(1, { duration: 1800 }), withTiming(0.4, { duration: 1800 })), -1, false);
    colorPhase.value = withRepeat(withTiming(1, { duration: 5000, easing: Easing.linear }), -1, false);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    shadowOpacity: glow.value,
  }));
  const r1Style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot1.value}deg` }] }));
  const r2Style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot2.value}deg` }] }));
  const r3Style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot3.value}deg` }] }));
  const colorOverlayStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(colorPhase.value,
      [0, 0.2, 0.4, 0.6, 0.8, 1],
      ['rgba(168,85,247,0.18)', 'rgba(59,130,246,0.18)', 'rgba(16,185,129,0.14)',
       'rgba(236,72,153,0.14)', 'rgba(139,92,246,0.18)', 'rgba(168,85,247,0.18)'],
    ),
  }));

  return (
    <Animated.View style={[{
      width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden',
      marginBottom: 28, shadowColor: Colors.primary, shadowRadius: 32, elevation: 14,
    }, containerStyle]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#07070E' }]} />
      {/* Blue-purple arc */}
      <Animated.View style={[StyleSheet.absoluteFill, r1Style]}>
        <LinearGradient
          colors={['#4338CA', '#7C3AED', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)']}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.65 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {/* Teal-emerald arc */}
      <Animated.View style={[StyleSheet.absoluteFill, r2Style]}>
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', '#0891B2', '#059669']}
          start={{ x: 0, y: 0.4 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {/* Rose-violet arc */}
      <Animated.View style={[StyleSheet.absoluteFill, r3Style]}>
        <LinearGradient
          colors={['rgba(0,0,0,0)', '#BE185D', '#9333EA', 'rgba(0,0,0,0)']}
          start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {/* Color-morphing aurora overlay */}
      <Animated.View style={[StyleSheet.absoluteFill, colorOverlayStyle]} />
      {/* Inner dark circle */}
      <View style={[StyleSheet.absoluteFill, {
        margin: SIZE * 0.19, borderRadius: SIZE / 2,
        backgroundColor: '#0d0d1a',
        alignItems: 'center', justifyContent: 'center',
      }]}>
        <Text style={{ color: '#fff', fontSize: SIZE * 0.2, fontWeight: '900', letterSpacing: 1 }}>R</Text>
      </View>
    </Animated.View>
  );
}

// ── Animated gradient input wrapper ───────────────────────────────────────────
function AnimatedInputBorder({ children, focused }: { children: React.ReactNode; focused: boolean }) {
  const gradPos = useSharedValue(0);
  useEffect(() => {
    gradPos.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.linear }), -1, false);
  }, []);
  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      gradPos.value,
      [0, 0.25, 0.5, 0.75, 1],
      ['#A855F7', '#3B82F6', '#10B981', '#EC4899', '#A855F7'],
    ),
    borderWidth: focused ? 1.5 : 1,
  }));
  return (
    <Animated.View style={[styles.inputWrapper, borderStyle]}>
      {children}
    </Animated.View>
  );
}

function TypingIndicator() {
  const c1 = useSharedValue(0);
  const c2 = useSharedValue(0);
  const c3 = useSharedValue(0);

  useEffect(() => {
    c1.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, false);
    setTimeout(() => {
      c2.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, false);
    }, 150);
    setTimeout(() => {
      c3.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, false);
    }, 300);
  }, []);

  const d1Style = useAnimatedStyle(() => ({
    opacity: 0.35 + (c1.value < 0.5 ? c1.value : 1 - c1.value) * 1.3,
    backgroundColor: interpolateColor(c1.value, [0, 0.33, 0.67, 1],
      ['#A855F7', '#3B82F6', '#10B981', '#A855F7']),
  }));
  const d2Style = useAnimatedStyle(() => ({
    opacity: 0.35 + (c2.value < 0.5 ? c2.value : 1 - c2.value) * 1.3,
    backgroundColor: interpolateColor(c2.value, [0, 0.33, 0.67, 1],
      ['#3B82F6', '#10B981', '#EC4899', '#3B82F6']),
  }));
  const d3Style = useAnimatedStyle(() => ({
    opacity: 0.35 + (c3.value < 0.5 ? c3.value : 1 - c3.value) * 1.3,
    backgroundColor: interpolateColor(c3.value, [0, 0.33, 0.67, 1],
      ['#10B981', '#EC4899', '#A855F7', '#10B981']),
  }));

  return (
    <View style={typingStyles.container}>
      <View style={typingStyles.avatar}>
        <Text style={typingStyles.avatarText}>R</Text>
      </View>
      <View style={typingStyles.bubble}>
        <View style={typingStyles.dots}>
          <Animated.View style={[typingStyles.dot, d1Style]} />
          <Animated.View style={[typingStyles.dot, d2Style]} />
          <Animated.View style={[typingStyles.dot, d3Style]} />
        </View>
      </View>
    </View>
  );
}

const typingStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  bubble: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderBottomLeftRadius: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.md,
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.primary,
  },
});

const SLASH_CMDS = [
  { cmd: '/weather',   desc: 'Live weather for your city' },
  { cmd: '/time',      desc: 'Current time' },
  { cmd: '/todos',     desc: 'Show your to-do list' },
  { cmd: '/pomodoro',  desc: '25-min focus timer' },
  { cmd: '/study',     desc: 'Custom study timer (e.g. /study 45)' },
  { cmd: '/breathe',   desc: '4-7-8 breathing exercise' },
  { cmd: '/password',  desc: 'Generate a secure password' },
  { cmd: '/inspire',   desc: 'Motivational quote' },
  { cmd: '/riddle',    desc: 'Brain teaser' },
  { cmd: '/joke',      desc: 'Tell me a joke' },
  { cmd: '/8ball',     desc: 'Magic 8 ball question' },
  { cmd: '/news',      desc: 'Open Google News' },
  { cmd: '/ip',        desc: 'Your public IP address' },
  { cmd: '/uuid',      desc: 'Generate a UUID' },
  { cmd: '/roman',     desc: 'To roman numerals (e.g. /roman 42)' },
  { cmd: '/morse',     desc: 'Text to morse code' },
  { cmd: '/binary',    desc: 'Number to binary/hex' },
  { cmd: '/horoscope', desc: 'Daily horoscope' },
  { cmd: '/lofi',      desc: 'Lo-fi study music on YouTube' },
  { cmd: '/flip',      desc: 'Flip a coin' },
  { cmd: '/dice',      desc: 'Roll a d6' },
  { cmd: '/qr',        desc: 'QR code generator' },
  { cmd: '/currency',  desc: '100 USD to EUR (live)' },
  { cmd: '/calc',      desc: 'Calculator (e.g. /calc 5*8)' },
  { cmd: '/translate', desc: 'Translate text to a language' },
  { cmd: '/maps',      desc: 'Navigate to a place' },
  { cmd: '/youtube',   desc: 'Search YouTube' },
  { cmd: '/split',     desc: 'Split bill (e.g. /split 120 4)' },
  { cmd: '/bmi',       desc: 'BMI calculator (e.g. /bmi 70 175)' },
  { cmd: '/help',      desc: 'List all capabilities' },
  { cmd: '/voice',      desc: 'Start voice input' },
  { cmd: '/clear',      desc: 'Clear this conversation' },
  { cmd: '/habit',      desc: 'Add habit (e.g. /habit add drink water)' },
  { cmd: '/trivia',     desc: 'Random trivia fact' },
  { cmd: '/affirmation',desc: 'Daily positive affirmation' },
  { cmd: '/meditate',   desc: 'Meditation timer (e.g. /meditate 5)' },
  { cmd: '/passphrase', desc: 'Generate a passphrase' },
  { cmd: '/caesar',     desc: 'Caesar cipher (e.g. /caesar hello 3)' },
  { cmd: '/fibonacci',  desc: 'Fibonacci sequence (e.g. /fibonacci 10)' },
  { cmd: '/prime',      desc: 'Check if a number is prime' },
  { cmd: '/readtime',   desc: 'Reading time estimate' },
  { cmd: '/upper',      desc: 'Uppercase text' },
  { cmd: '/lower',      desc: 'Lowercase text' },
  { cmd: '/challenge',  desc: 'Random daily challenge' },
  { cmd: '/lang',       desc: 'Switch language (e.g. /lang spanish)' },
  { cmd: '/languages',  desc: 'List all 35+ supported languages' },
  { cmd: '/torch',      desc: 'Toggle flashlight (e.g. /torch on)' },
  { cmd: '/gesture',    desc: 'Camera gesture control (e.g. /gesture on)' },
  { cmd: '/volume',     desc: 'Voice volume (e.g. volume up / volume down / mute)' },
  { cmd: '/evolve',     desc: 'Show your AI evolution level & XP' },
  { cmd: '/memory',     desc: 'Show everything Riuka has learned about you' },
  { cmd: '/teach',      desc: 'Teach Riuka a fact (e.g. /teach I prefer dark mode)' },
  { cmd: '/forget',     desc: 'Remove a memory (e.g. /forget my name)' },
];

const SUGGESTIONS = [
  { label: '🕐 Time in Tokyo', cmd: 'Time in Tokyo' },
  { label: '💬 Inspire me', cmd: 'Inspire me' },
  { label: '🔐 Password', cmd: 'Password 16' },
];

// ── Follow-up suggestion engine ───────────────────────────────────────────────
const generateFollowUps = (aiReply: string, userMsg: string): string[] => {
  const combined = (aiReply + ' ' + userMsg).toLowerCase();
  if (/weather|forecast|rain|sun|temperature|humid/.test(combined))
    return ["Tomorrow's forecast?", "What to wear today?", "Hourly breakdown?"];
  if (/email|draft|compose|cover letter/.test(combined))
    return ["Make it shorter", "Make it more formal", "Add a subject line"];
  if (/essay|paragraph|article|writing/.test(combined))
    return ["Make it shorter", "Add more examples", "Change the tone"];
  if (/code|function|script|python|javascript|typescript|bug/.test(combined))
    return ["Explain line by line", "How do I optimise it?", "Show a real example"];
  if (/step|how to|guide|tutorial/.test(combined))
    return ["Simplify the steps", "Any shortcuts?", "Common mistakes?"];
  if (/pros|cons|compare|vs|versus/.test(combined))
    return ["Which one should I pick?", "More details on pros", "Cost comparison?"];
  if (/invest|stock|money|finance|saving|crypto/.test(combined))
    return ["For a beginner?", "What are the risks?", "Monthly plan?"];
  if (/health|fitness|workout|diet|food|nutrition/.test(combined))
    return ["Make a weekly plan", "For beginners?", "Track my progress"];
  if (/learn|study|course|skill|practice/.test(combined))
    return ["Best free resources?", "How long to learn?", "Daily practice plan"];
  if (/tweet|caption|post|social/.test(combined))
    return ["Make it catchier", "Add hashtags", "Shorter version?"];
  if (/summary|summarize|tldr/.test(combined))
    return ["Even shorter?", "Key takeaways only", "What's the main point?"];
  if (/evolve|memory|xp|level/.test(combined))
    return ["Show my memories", "How do I level up faster?", "Forget something"];
  const fallbacks = [
    ["Tell me more", "Give an example", "Simplify that"],
    ["Any downsides?", "How do I start?", "Real-world example?"],
    ["Go deeper", "Beginner-friendly version?", "Quick summary?"],
  ];
  return fallbacks[Math.floor(Date.now() / 10000) % fallbacks.length];
};

const STORAGE_KEY = 'riuka_chat_v1';

// ── Atomic Evolution System ────────────────────────────────────────────────────
interface MemoryFact {
  id: string;
  category: 'name' | 'preference' | 'dislike' | 'location' | 'profession' | 'habit' | 'correction' | 'custom';
  content: string;
  learnedAt: number;
  source: string;
}
interface EvolutionState {
  xp: number;
  level: number;
  totalLearned: number;
  corrections: number;
}
const MEMORY_KEY = 'riuka_memory_v1';
const EVOLUTION_KEY = 'riuka_evolution_v1';
const EVOLUTION_LEVELS = [
  { level: 1, name: 'Newborn',     xp: 0,    icon: '🥚' },
  { level: 2, name: 'Aware',       xp: 40,   icon: '👁️' },
  { level: 3, name: 'Adaptive',    xp: 120,  icon: '🧠' },
  { level: 4, name: 'Intelligent', xp: 280,  icon: '⚡' },
  { level: 5, name: 'Sentient',    xp: 550,  icon: '🌐' },
  { level: 6, name: 'Evolved',     xp: 1000, icon: '🔮' },
  { level: 7, name: 'Atomic',      xp: 2000, icon: '⚛️' },
];

const getMemory = (): MemoryFact[] => {
  if (Platform.OS !== 'web') return [];
  try { return JSON.parse(localStorage.getItem(MEMORY_KEY) || '[]'); } catch { return []; }
};
const saveMemory = (facts: MemoryFact[]) => {
  if (Platform.OS !== 'web') return;
  try { localStorage.setItem(MEMORY_KEY, JSON.stringify(facts)); } catch {}
};
const getEvolution = (): EvolutionState => {
  const def = { xp: 0, level: 1, totalLearned: 0, corrections: 0 };
  if (Platform.OS !== 'web') return def;
  try { return { ...def, ...JSON.parse(localStorage.getItem(EVOLUTION_KEY) || '{}') }; } catch { return def; }
};
const saveEvolution = (evo: EvolutionState) => {
  if (Platform.OS !== 'web') return;
  try { localStorage.setItem(EVOLUTION_KEY, JSON.stringify(evo)); } catch {}
};
const getEvolutionLevel = (xp: number) => {
  let cur = EVOLUTION_LEVELS[0];
  for (const l of EVOLUTION_LEVELS) { if (xp >= l.xp) cur = l; }
  return cur;
};
const getNextLevel = (xp: number) => EVOLUTION_LEVELS.find(l => l.xp > xp) ?? null;

// Returns {learned, content, leveledUp, newLevelName, newLevelIcon} or null if duplicate
const learnFact = (
  category: MemoryFact['category'],
  content: string,
  source: string,
  xpGain = 20,
): { learned: boolean; content: string; leveledUp: boolean; newLevelName: string; newLevelIcon: string } => {
  const facts = getMemory();
  const norm = content.toLowerCase();
  if (facts.some(f => f.content.toLowerCase() === norm || (f.category === category && f.content.toLowerCase().includes(norm.slice(0, 18))))) {
    return { learned: false, content, leveledUp: false, newLevelName: '', newLevelIcon: '' };
  }
  facts.push({ id: Date.now().toString(), category, content, learnedAt: Date.now(), source });
  saveMemory(facts);

  const evo = getEvolution();
  const oldLevel = getEvolutionLevel(evo.xp);
  evo.xp += xpGain;
  evo.totalLearned += 1;
  const newLevel = getEvolutionLevel(evo.xp);
  const leveledUp = newLevel.level > oldLevel.level;
  if (leveledUp) evo.level = newLevel.level;
  saveEvolution(evo);
  return { learned: true, content, leveledUp, newLevelName: newLevel.name, newLevelIcon: newLevel.icon };
};

// Scan a user message for learnable facts; returns result or null if nothing learned
const detectAndLearn = (text: string) => {
  const t = text.trim();
  const low = t.toLowerCase();

  // Explicit teach/remember commands
  const rememberMatch = low.match(/^(?:remember|note|learn|store|save|teach yourself)[:\s]+(.{4,120})/);
  if (rememberMatch) return learnFact('custom', rememberMatch[1].trim(), t, 30);

  // Name
  const nameMatch = low.match(/(?:my name is|(?:i'm|i am) called|call me)\s+([a-z][a-z '-]{1,24}?)(?:\.|,|!|$)/);
  if (nameMatch) {
    const name = nameMatch[1].trim();
    if (name.split(' ').length <= 4 && !/riuka|ai|bot/.test(name)) return learnFact('name', `User's name is ${name}`, t, 25);
  }

  // Location
  const locMatch = low.match(/i (?:live|stay|am|reside|grew up|am from|come from|moved to) in\s+([a-z][a-z ,'-]{2,35}?)(?:\.|,|!|$)/);
  if (locMatch) return learnFact('location', `User lives in ${locMatch[1].trim()}`, t);

  // Profession
  const profMatch = low.match(/i(?:'m| am) (?:a |an )(developer|designer|doctor|engineer|teacher|student|writer|nurse|lawyer|scientist|chef|pilot|programmer|coder|artist|manager|architect|analyst)[a-z ]*/);
  if (profMatch) return learnFact('profession', `User is a ${profMatch[1]}`, t);

  // Preferences
  const likeMatch = low.match(/i (?:really |absolutely )?(?:love|like|enjoy|prefer|adore)\s+([a-z][a-z ,'-]{2,50}?)(?:\.|,|!|$)/);
  if (likeMatch && !/^(it|this|that|your|the|when|how|what)/.test(likeMatch[1])) {
    return learnFact('preference', `User likes ${likeMatch[1].trim()}`, t);
  }

  // Dislikes
  const dislikeMatch = low.match(/i (?:hate|dislike|can'?t stand|(?:don'?t|do not) like)\s+([a-z][a-z ,'-]{2,50}?)(?:\.|,|!|$)/);
  if (dislikeMatch && !/^(it|this|that|your|the)/.test(dislikeMatch[1])) {
    return learnFact('dislike', `User dislikes ${dislikeMatch[1].trim()}`, t);
  }

  // Corrections ("actually it's...", "no, that's wrong, ...")
  const corrMatch = low.match(/^(?:actually,?\s+|no,?\s+|wrong,?\s+|that'?s (?:not right|wrong),?\s+)(.{5,100})/);
  if (corrMatch) {
    const evo = getEvolution();
    evo.corrections = (evo.corrections || 0) + 1;
    evo.xp += 10;
    saveEvolution(evo);
    return learnFact('correction', corrMatch[1].trim(), t, 15);
  }

  return null;
};

// Build a memory context string to inject into AI prompts
const getMemoryContext = (): string => {
  const facts = getMemory();
  if (facts.length === 0) return '';
  const lines = facts.map(f => `- ${f.content}`).join('\n');
  return `\n\nThings I know about the user (learned from past conversations):\n${lines}\n\nUse this context naturally without announcing it every time.`;
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [provider, setProvider] = useState(_aiConfig.provider);
  const scrollViewRef = useRef<ScrollView>(null);
  const isTypingRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const wakeRecognitionRef = useRef<any>(null);
  const micPulse        = useSharedValue(1);
  const headerScan      = useSharedValue(0);
  const dotGlow         = useSharedValue(0.5);
  const avatarColorPhase = useSharedValue(0);
  const [wakeActive, setWakeActiveState] = useState(_wakeWordActive);
  const [voiceReplyOn, setVoiceReplyOn] = useState(_voiceReplyEnabled);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [showSiriModal, setShowSiriModal] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [cameraGestureEnabled, setCameraGestureEnabled] = useState(false);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [evolutionToast, setEvolutionToast] = useState<string | null>(null);
  const [evoDisplay, setEvoDisplay] = useState(() => getEvolutionLevel(getEvolution().xp));
  const evoToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showEvolutionToast = (msg: string) => {
    if (evoToastTimerRef.current) clearTimeout(evoToastTimerRef.current);
    setEvolutionToast(msg);
    evoToastTimerRef.current = setTimeout(() => setEvolutionToast(null), 3000);
  };

  // Slash command popup
  const slashToken = inputText.startsWith('/') ? inputText.toLowerCase().split(' ')[0] : '';
  const slashCmds = slashToken ? SLASH_CMDS.filter((c) => c.cmd.startsWith(slashToken)) : [];

  const selectSlashCmd = (cmd: string) => {
    if (cmd === '/clear') { setInputText(''); clearChat(); return; }
    if (cmd === '/voice')  { setInputText(''); startVoice(); return; }
    const profile = getProfile();
    const CMD_MAP: Record<string, string> = {
      '/weather':   profile.city ? `Weather in ${profile.city}` : 'Weather in ',
      '/time':      'What time is it',
      '/todos':     'My todos',
      '/pomodoro':  'Pomodoro',
      '/study':     'Study 25',
      '/breathe':   'Breathe',
      '/password':  'Password 16',
      '/inspire':   'Inspire me',
      '/riddle':    'Riddle',
      '/joke':      'Tell me a joke',
      '/8ball':     '8 ball ',
      '/news':      'News',
      '/ip':        'My IP',
      '/uuid':      'UUID',
      '/roman':     'Roman ',
      '/morse':     'Morse ',
      '/binary':    'Binary ',
      '/horoscope': 'Horoscope ',
      '/lofi':      'Lofi',
      '/flip':      'Flip a coin',
      '/dice':      'Roll a dice',
      '/qr':        'QR code ',
      '/currency':  '100 USD to EUR',
      '/calc':      'Calculate ',
      '/translate': 'Translate ',
      '/maps':      'Navigate to ',
      '/youtube':   'YouTube ',
      '/split':     'Split ',
      '/bmi':       'BMI ',
      '/help':      'What can you do',
    };
    const mapped = CMD_MAP[cmd];
    if (!mapped) return;
    if (mapped.endsWith(' ')) {
      setInputText(mapped);
    } else {
      setInputText('');
      sendMessage(mapped);
    }
  };

  useEffect(() => {
    if (isVoiceListening) {
      micPulse.value = withRepeat(
        withSequence(withTiming(1.35, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1, false
      );
    } else {
      micPulse.value = withTiming(1, { duration: 200 });
    }
  }, [isVoiceListening]);

  const micPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: micPulse.value }] }));

  // Header scan + dot glow + avatar color cycle
  useEffect(() => {
    headerScan.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.linear }), -1, false);
    dotGlow.value = withRepeat(
      withSequence(withTiming(1, { duration: 900 }), withTiming(0.35, { duration: 900 })),
      -1, false,
    );
    avatarColorPhase.value = withRepeat(withTiming(1, { duration: 4500, easing: Easing.linear }), -1, false);
  }, []);
  const headerScanStyle = useAnimatedStyle(() => ({ left: (headerScan.value * (SCREEN_W + 80)) - 80 }));
  const dotGlowStyle = useAnimatedStyle(() => ({ opacity: dotGlow.value }));
  const avatarColorStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(avatarColorPhase.value, [0, 0.25, 0.5, 0.75, 1],
      ['#A855F7', '#3B82F6', '#10B981', '#EC4899', '#A855F7']),
    shadowColor: interpolateColor(avatarColorPhase.value, [0, 0.25, 0.5, 0.75, 1],
      ['#A855F7', '#3B82F6', '#10B981', '#EC4899', '#A855F7']),
  }));

  // Load saved chat history on mount
  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: Message[] = JSON.parse(saved);
          if (parsed.length > 0) setMessages(parsed);
        }
        const savedLang = localStorage.getItem('riuka_lang_v1');
        if (savedLang && LANGS[savedLang]) _userLang = savedLang;
        if (localStorage.getItem('riuka_gesture_v1') === '1') setCameraGestureEnabled(true);
        const savedVol = parseFloat(localStorage.getItem('riuka_vol_v1') || '');
        if (!isNaN(savedVol)) _speechVolume = savedVol;
      } catch {}
    }
  }, []);

  // Save chat history on every change
  useEffect(() => {
    if (Platform.OS === 'web' && messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-60)));
      } catch {}
    }
  }, [messages]);

  // Request browser notification permission on load
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      if ((window as any).Notification.permission === 'default') {
        (window as any).Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (_aiConfig.provider !== provider) setProvider(_aiConfig.provider);
      if (_wakeWordActive !== wakeActive) setWakeActiveState(_wakeWordActive);
      if (_voiceReplyEnabled !== voiceReplyOn) setVoiceReplyOn(_voiceReplyEnabled);
    }, 800);
    return () => clearInterval(timer);
  }, [provider, wakeActive, voiceReplyOn]);

  // ── Wake word loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!wakeActive || Platform.OS !== 'web') {
      try { wakeRecognitionRef.current?.stop(); } catch {}
      wakeRecognitionRef.current = null;
      return;
    }
    const SR = (window as any)?.SpeechRecognition || (window as any)?.webkitSpeechRecognition;
    if (!SR) return;
    let alive = true;

    const startListening = () => {
      if (!alive || recognitionRef.current) return;
      try {
        const r = new SR();
        r.lang = 'en-US';
        r.continuous = false;
        r.interimResults = false;
        r.onresult = (e: any) => {
          const t = (e.results[0]?.[0]?.transcript ?? '').toLowerCase().trim();
          const wakeWords = ['hey riuka', 'ok riuka', 'riuka', 'hey ruka', 'ok ruka', 'ruka', 'hi riuka', 'yo riuka'];
          if (wakeWords.some(w => t.includes(w))) {
            setShowSiriModal(true);
            startVoice();
          }
        };
        r.onerror = () => {};
        r.onend = () => {
          wakeRecognitionRef.current = null;
          setTimeout(() => { if (alive && !recognitionRef.current) startListening(); }, 700);
        };
        wakeRecognitionRef.current = r;
        r.start();
      } catch { wakeRecognitionRef.current = null; }
    };

    startListening();
    return () => {
      alive = false;
      try { wakeRecognitionRef.current?.stop(); } catch {}
      wakeRecognitionRef.current = null;
    };
  }, [wakeActive]);

  const startVoice = () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Voice Commands', 'Voice works in the web version. Visit the app in your browser to use it.');
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      Alert.alert('Voice Not Supported', 'Your browser does not support voice recognition. Try Chrome.');
      return;
    }
    try { wakeRecognitionRef.current?.stop(); } catch {}
    wakeRecognitionRef.current = null;

    setVoiceTranscript('');
    setShowSiriModal(true);

    const r = new SR();
    r.lang = 'en-US';
    r.continuous = false;
    r.interimResults = true;
    r.onstart = () => setIsVoiceListening(true);
    r.onend = () => {
      setIsVoiceListening(false);
      recognitionRef.current = null;
      // auto-close modal after short delay
      setTimeout(() => { setShowSiriModal(false); setVoiceTranscript(''); }, 800);
    };
    r.onerror = () => {
      setIsVoiceListening(false);
      recognitionRef.current = null;
      setTimeout(() => { setShowSiriModal(false); setVoiceTranscript(''); }, 500);
    };
    r.onresult = (e: any) => {
      const interim = Array.from(e.results as any[])
        .map((res: any) => res[0].transcript)
        .join('');
      setVoiceTranscript(interim);
      // send on final result
      if (e.results[e.results.length - 1].isFinal) {
        const final: string = e.results[e.results.length - 1][0].transcript;
        if (final.trim()) sendMessage(final.trim());
      }
    };
    recognitionRef.current = r;
    r.start();
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setIsVoiceListening(false);
    setShowSiriModal(false);
    setVoiceTranscript('');
  };

  // Auto-send pending command when the tab comes into focus
  useFocusEffect(
    useCallback(() => {
      const cmd = consumePendingCommand();
      if (cmd && !isTypingRef.current) {
        // Small delay to let the tab render first
        setTimeout(() => sendMessage(cmd), 200);
      }
    }, [])
  );

  const streamIntoMessage = async (msgId: string, fullText: string) => {
    let built = '';
    for (let i = 0; i < fullText.length; i++) {
      built += fullText[i];
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, text: built } : m));
      // Pace: pause at sentence endings, small delay every few chars
      if ('.!?\n'.includes(fullText[i])) {
        await new Promise((r) => setTimeout(r, 30));
      } else if (i % 5 === 0) {
        await new Promise((r) => setTimeout(r, 6));
      }
    }
  };

  const sendMessage = async (text?: string) => {
    const msgText = (text ?? inputText).trim();
    if (!msgText || isTypingRef.current) return;

    // Atomic learning — scan message before sending
    const learned = detectAndLearn(msgText);
    if (learned?.learned) {
      const newEvoLevel = getEvolutionLevel(getEvolution().xp);
      setEvoDisplay(newEvoLevel);
      if (learned.leveledUp) {
        showEvolutionToast(`${learned.newLevelIcon} Level Up! ${learned.newLevelName}`);
      } else {
        const preview = learned.content.length > 40 ? learned.content.slice(0, 40) + '…' : learned.content;
        showEvolutionToast(`⚡ Learned: ${preview}`);
      }
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      text: msgText,
      isUser: true,
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setFollowUps([]);
    isTypingRef.current = true;
    setIsTyping(true);

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);

    // Capture current messages for context (before state update)
    const currentMessages = messages;
    const reply = await sendToAI(msgText, currentMessages);

    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: Message = {
      id: aiMsgId,
      text: '',
      isUser: false,
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, aiMsg]);
    isTypingRef.current = false;
    setIsTyping(false);
    setStreamingMsgId(aiMsgId);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);

    await streamIntoMessage(aiMsgId, reply);
    setStreamingMsgId(null);
    setFollowUps(generateFollowUps(reply, msgText));

    // Background tab notification — alert user when they're in another tab
    if (Platform.OS === 'web' && typeof document !== 'undefined' && document.hidden &&
        'Notification' in window && (window as any).Notification.permission === 'granted') {
      const preview = reply.replace(/[*_`#>]/g, '').slice(0, 80);
      try { new (window as any).Notification('Riuka AI', { body: preview, icon: '/favicon.ico', tag: 'riuka-reply' }); } catch {}
    }
    if (_voiceReplyEnabled) {
      setSpeakingMsgId(aiMsgId);
      speakText(reply);
      // Clear speaking indicator when speech ends (approximate duration)
      const approxMs = Math.min(reply.length * 55, 18000);
      setTimeout(() => setSpeakingMsgId((prev) => prev === aiMsgId ? null : prev), approxMs);
    }
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Erase all messages? This also clears saved history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear', style: 'destructive', onPress: () => {
            setMessages([]);
            if (Platform.OS === 'web') { try { localStorage.removeItem(STORAGE_KEY); } catch {} }
          },
        },
      ]
    );
  };

  const modelLabel = getProviderLabel(_aiConfig.provider);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          {/* HUD scan line */}
          <Animated.View style={[styles.headerScanLine, headerScanStyle]} pointerEvents="none" />
          {/* HUD corners */}
          <View style={[styles.hudCorner, styles.hudTL]} pointerEvents="none" />
          <View style={[styles.hudCorner, styles.hudTR]} pointerEvents="none" />

          <View style={styles.headerLeft}>
            <Animated.View style={[styles.riukaAvatar, avatarColorStyle]}>
              <Text style={styles.riukaLetter}>R</Text>
              <View style={styles.sparkleWrap}>
                <Sparkles color={Colors.primary} size={9} />
              </View>
            </Animated.View>
            <View>
              <ColorCycleText text="Riuka AI" style={styles.headerTitle} />
              <View style={styles.headerMeta}>
                <Animated.View style={[styles.onlineDot, dotGlowStyle]} />
                <Text style={styles.headerStatus}>
                  {wakeActive ? '🎤 Always listening' : 'Active'}
                </Text>
                <View style={styles.modelBadge}>
                  <Text style={styles.modelBadgeText}>{modelLabel}</Text>
                </View>
                <View style={styles.evoBadge}>
                  <Text style={styles.evoBadgeText}>{evoDisplay.icon} {evoDisplay.name}</Text>
                </View>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.clearButton} onPress={clearChat}>
            <Trash2 color={Colors.textTertiary} size={18} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && (
            <Animated.View entering={FadeInUp.duration(700)} style={styles.emptyState}>
              <RiukaOrb />
              <ColorCycleText
                text="Riuka AI"
                style={styles.emptyTitle}
                entering={FadeInUp.duration(600).delay(150)}
              />
              <Animated.Text entering={FadeInUp.duration(600).delay(280)} style={styles.emptySubtitle}>
                Your personal AI — type a command or tap the mic to speak.
              </Animated.Text>
              <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.emptyFeatures}>
                {[
                  { icon: '🎤', label: 'Voice' },
                  { icon: '🌐', label: '60+ Commands' },
                  { icon: '🤚', label: 'Gesture' },
                  { icon: '🔒', label: 'Private' },
                ].map((f) => (
                  <View key={f.label} style={styles.emptyFeatureChip}>
                    <Text style={styles.emptyFeatureIcon}>{f.icon}</Text>
                    <Text style={styles.emptyFeatureText}>{f.label}</Text>
                  </View>
                ))}
              </Animated.View>
            </Animated.View>
          )}

          {messages.length > 0 && (
            <View style={styles.dateSeparator}>
              <View style={styles.dateLine} />
              <Text style={styles.dateText}>Session Active</Text>
              <View style={styles.dateLine} />
            </View>
          )}

          {messages.map((msg, idx) => (
            <Animated.View
              key={msg.id}
              entering={msg.isUser
                ? FadeInRight.duration(320).springify().damping(18)
                : FadeInLeft.duration(320).springify().damping(18)}
            >
              <ChatBubble
                message={msg.text}
                isUser={msg.isUser}
                time={msg.time}
                isStreaming={msg.id === streamingMsgId}
                onSpeak={!msg.isUser ? () => { setSpeakingMsgId(msg.id); speakText(msg.text); } : undefined}
                onStopSpeak={!msg.isUser ? () => { stopSpeaking(); setSpeakingMsgId(null); } : undefined}
                isSpeaking={speakingMsgId === msg.id}
              />
            </Animated.View>
          ))}

          {isTyping && <TypingIndicator />}
        </ScrollView>

        {/* Suggestions row (empty state) */}
        {messages.length === 0 && !isTyping && (
          <View style={styles.suggestionsRow}>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity key={s.cmd} style={styles.suggestionChip} onPress={() => sendMessage(s.cmd)}>
                <Text style={styles.suggestionText}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Follow-up suggestion chips */}
        {followUps.length > 0 && !isTyping && (
          <Animated.View entering={FadeInUp.duration(320)} style={styles.followUpsRow}>
            {followUps.map((q) => (
              <TouchableOpacity
                key={q}
                style={styles.followUpChip}
                onPress={() => sendMessage(q)}
                activeOpacity={0.75}
              >
                <Text style={styles.followUpText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* Input area */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inputContainer}>
          {slashCmds.length > 0 && (
            <View style={styles.slashPopup}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}>
                {slashCmds.map((item) => (
                  <TouchableOpacity key={item.cmd} style={styles.slashItem} onPress={() => selectSlashCmd(item.cmd)}>
                    <Text style={styles.slashCmd}>{item.cmd}</Text>
                    <Text style={styles.slashDesc}>{item.desc}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <View style={styles.inputRow}>
            <AnimatedInputBorder focused={inputFocused}>
              <TextInput
                style={styles.input}
                placeholder="Command Riuka…"
                placeholderTextColor={Colors.textTertiary}
                value={inputText}
                onChangeText={setInputText}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                multiline
                maxLength={2000}
                onSubmitEditing={() => sendMessage()}
                blurOnSubmit={false}
              />
            </AnimatedInputBorder>
            <Animated.View style={micPulseStyle}>
              <TouchableOpacity
                style={[styles.micInputButton, isVoiceListening && styles.micListening]}
                onPress={isVoiceListening ? stopVoice : startVoice}
              >
                <Mic color={isVoiceListening ? '#ffffff' : Colors.primary} size={20} />
              </TouchableOpacity>
            </Animated.View>
            <AnimatedSendButton
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || isTyping}
            />
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>

      {/* Gesture & sensor controller */}
      <GestureController
        onShake={startVoice}
        onVolumeUp={() => { if (inputText.trim()) sendMessage(); else startVoice(); }}
        onVolumeDown={() => {
          if (inputText) setInputText('');
          else clearChat();
        }}
        onCameraWave={startVoice}
        cameraGestureEnabled={cameraGestureEnabled}
      />

      {/* Siri-like voice modal */}
      <SiriModal
        visible={showSiriModal}
        isListening={isVoiceListening}
        transcript={voiceTranscript}
        onClose={stopVoice}
      />

      {/* Atomic Evolution toast */}
      {evolutionToast && (
        <Animated.View
          key={evolutionToast}
          entering={FadeInUp.duration(280).springify()}
          style={styles.evolutionToast}
          pointerEvents="none"
        >
          <View style={styles.evolutionToastInner}>
            <Text style={styles.evolutionToastText}>{evolutionToast}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  headerScanLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(168,85,247,0.06)',
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 0,
  },
  hudCorner: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: 'rgba(168,85,247,0.35)',
  },
  hudTL: { top: Spacing.xxxl, left: 6, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
  hudTR: { top: Spacing.xxxl, right: 6, borderTopWidth: 1.5, borderRightWidth: 1.5 },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  riukaAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  riukaLetter: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.primary,
  },
  sparkleWrap: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.secondary,
  },
  headerStatus: {
    fontSize: 9,
    color: Colors.secondary,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  modelBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    marginLeft: Spacing.xs,
  },
  modelBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 0.5,
  },
  clearButton: {
    padding: Spacing.sm,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: Spacing.lg,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyAvatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  emptyAvatarLetter: {
    fontSize: FontSizes.xxxl,
    fontWeight: '800',
    color: Colors.primary,
  },
  emptyTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.sm,
    letterSpacing: 2,
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  emptyFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  emptyFeatureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.35)',
  },
  emptyFeatureIcon: {
    fontSize: 12,
  },
  emptyFeatureText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '600',
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    gap: Spacing.md,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dateText: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  suggestionsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  suggestionChip: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  suggestionText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  inputContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    maxHeight: 100,
    // border is drawn by AnimatedInputBorder
  },
  input: {
    fontSize: FontSizes.md,
    color: Colors.text,
    paddingVertical: Spacing.sm + 2,
    lineHeight: 20,
  },
  micInputButton: {
    padding: Spacing.sm + 2,
    borderRadius: 20,
  },
  micListening: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surface,
    shadowOpacity: 0,
    elevation: 0,
  },
  slashPopup: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  slashItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  slashCmd: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.primary,
    width: 96,
  },
  slashDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    flex: 1,
  },
  followUpsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  followUpChip: {
    backgroundColor: 'rgba(168,85,247,0.08)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.28)',
  },
  followUpText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '500',
  },
  evoBadge: {
    backgroundColor: 'rgba(168,85,247,0.08)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
    marginLeft: Spacing.xs,
  },
  evoBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  evolutionToast: {
    position: 'absolute',
    top: 86,
    left: Spacing.lg,
    right: Spacing.lg,
    alignItems: 'center',
    zIndex: 200,
  },
  evolutionToastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,6,20,0.88)',
    borderRadius: BorderRadius.full,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.5)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  evolutionToastText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
