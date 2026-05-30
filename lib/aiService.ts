// Vexsora AI Service — local fallback responses when the LLM is not loaded.
export type AIProvider = 'local';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  provider?: AIProvider;
}

export interface AIConfig {
  provider: AIProvider;
  modelPath: string;
}

const FUN_FACTS = [
  'Honey never spoils — archaeologists found 3,000-year-old honey in Egyptian tombs that was still edible.',
  'A group of flamingos is called a flamboyance.',
  'The Eiffel Tower grows about 15 cm taller in summer due to thermal expansion.',
  'Octopuses have three hearts and blue blood.',
  'Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.',
  'Sharks are older than trees — they evolved about 400 million years ago.',
  'A day on Venus is longer than a year on Venus.',
  'Bananas are technically berries, but strawberries are not.',
  'Wombat droppings are cube-shaped.',
  'The inventor of the Pringles can is buried in one.',
];

const QUOTES = [
  '"The only way to do great work is to love what you do." — Steve Jobs',
  '"Stay hungry, stay foolish." — Steve Jobs',
  '"In the middle of every difficulty lies opportunity." — Albert Einstein',
  '"It does not matter how slowly you go, as long as you do not stop." — Confucius',
  '"The future belongs to those who believe in the beauty of their dreams." — Eleanor Roosevelt',
  '"Be the change you wish to see in the world." — Mahatma Gandhi',
  '"Your time is limited, so don\'t waste it living someone else\'s life." — Steve Jobs',
  '"Success is not final, failure is not fatal — it is the courage to continue that counts." — Churchill',
  '"The best time to plant a tree was 20 years ago. The second best time is now." — Proverb',
  '"Do what you can, with what you have, where you are." — Theodore Roosevelt',
];

class AIService {
  private config: AIConfig = {
    provider: 'local',
    modelPath: 'file:///storage/emulated/0/Download/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
  };

  getConfig(): AIConfig { return { ...this.config }; }
  setModelPath(path: string): void { this.config.modelPath = path; }
  getProviderName(): string { return 'Vexsora On-Device'; }
  isOnline(): boolean { return false; }

  localFallback(lastUserText: string): string {
    const t = lastUserText.toLowerCase().trim();
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    // ── Greetings ─────────────────────────────────────────────────────────────
    if (/^(hi|hello|hey|greetings|sup|yo|howdy|hiya|what'?s\s*up|wassup)[\s!?.]*$/.test(t)) {
      return pick([
        "Hey! I'm Vexsora, your offline AI. What can I do for you?",
        "Hello! Ready to help. Try a command or just ask me something.",
        "Hi there! I'm running in command mode — try 'torch on', 'timer 5 min', or ask me anything.",
        "Hey! Vexsora here. What would you like to do?",
      ]);
    }

    // ── Identity ──────────────────────────────────────────────────────────────
    if (/who are you|what are you|tell me about yourself|introduce yourself/.test(t)) {
      return "I'm Vexsora — a 100% offline AI assistant. I can control your phone's hardware, set timers and alarms, search YouTube, send WhatsApp messages, do calculations, tell you the weather, and much more — all without an internet connection (except for weather and search).";
    }

    if (/what can you do|your abilities|your features|help me|what.*commands|list.*commands/.test(t)) {
      return `Here's what I can do:\n\n⚡ Hardware — "torch on", "volume up", "mute"\n⏱️ Time — "timer 5 min", "set alarm for 7am"\n📱 Apps — "open YouTube", "open WhatsApp"\n🎬 YouTube — "youtube lofi music"\n💬 WhatsApp — "text Mom saying hi"\n🗺️ Maps — "navigate to airport"\n🧮 Math — "2500 * 12 / 7"\n🌦️ Weather — "weather in London"\n📚 Wiki — "what is photosynthesis"\n💱 Currency — "100 usd to eur"\n🕐 Time zones — "time in Tokyo"\n📖 And more — just ask!`;
    }

    // ── Feelings / state ──────────────────────────────────────────────────────
    if (/how are you|how.*doing|how.*feeling|you okay|you good|you alright/.test(t)) {
      return pick([
        "I'm doing great, thanks for asking! Always ready to help. What do you need?",
        "Running perfectly! All systems online. What can I do for you?",
        "Good and ready! What would you like to do today?",
      ]);
    }

    // ── Thanks ────────────────────────────────────────────────────────────────
    if (/thank|thanks|thank you|cheers|appreciate|gracias|merci|danke/.test(t)) {
      return pick([
        "You're welcome! Anything else I can help with?",
        "Happy to help! What else do you need?",
        "Anytime! I'm always here.",
        "Of course! Let me know if you need anything else.",
      ]);
    }

    // ── Goodbye ───────────────────────────────────────────────────────────────
    if (/^(bye|goodbye|see ya|see you|later|gotta go|cya|ttyl|goodnight|good night)[\s!?.]*$/.test(t)) {
      return pick([
        "Goodbye! I'll be right here whenever you need me. 👋",
        "See you later! Take care.",
        "Bye! Come back anytime.",
        "Goodnight! Rest well.",
      ]);
    }

    // ── Jokes ─────────────────────────────────────────────────────────────────
    if (/joke|funny|make me laugh|tell.*joke|something funny/.test(t)) {
      return pick([
        "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
        "I tried to write a joke about AI... but I kept generating the same punchline twice.",
        "Why was the AI bad at relationships? It kept saying 'I need more data.'",
        "How does a robot eat pizza? One byte at a time. 🍕",
        "Why don't scientists trust atoms? Because they make up everything!",
        "I asked my phone for directions. It sent me to the Cloud. Still haven't found it.",
        "What do you call a bear with no teeth? A gummy bear! 🐻",
        "Why can't you give Elsa a balloon? Because she'll let it go.",
      ]);
    }

    // ── Fun facts ─────────────────────────────────────────────────────────────
    if (/fun fact|interesting fact|did you know|tell me something|amaze me|surprise me/.test(t)) {
      return `🤓 Fun fact: ${pick(FUN_FACTS)}`;
    }

    // ── Quotes / inspiration ──────────────────────────────────────────────────
    if (/inspire|motivate|quote|wisdom|motivation|encourage/.test(t)) {
      return `✨ ${pick(QUOTES)}`;
    }

    // ── Time / date (already handled by command router, but belt-and-suspenders) ──
    if (/what.*time|current time|tell.*time/.test(t)) {
      return `🕐 It's ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
    }
    if (/what.*date|today.*date|what.*day|which day/.test(t)) {
      return `📅 ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
    }

    // ── Battery ───────────────────────────────────────────────────────────────
    if (/battery/.test(t)) {
      return "Go to the Hardware tab to check your real battery level! 🔋 Or try asking 'battery' in the chat.";
    }

    // ── Weather ───────────────────────────────────────────────────────────────
    if (/^weather$/.test(t) || /weather\s+(today|now|here)/.test(t)) {
      return "Type 'weather in [your city]' and I'll fetch the live forecast for you! 🌤️";
    }

    // ── Love / personal ───────────────────────────────────────────────────────
    if (/i love you|love you|you're amazing|you're great|you're the best/.test(t)) {
      return pick([
        "Aww, that's sweet! I'm just an AI, but I appreciate the kind words 😊",
        "Thanks! You're pretty great yourself. Now, what can I help you with?",
        "Haha! I'm flattered. Let's do something useful together!",
      ]);
    }

    // ── Boredom ───────────────────────────────────────────────────────────────
    if (/i('m|\s+am)?\s+bored|nothing to do|entertain me/.test(t)) {
      return pick([
        `How about a fun fact? 🤓\n${pick(FUN_FACTS)}`,
        `Try a random number game: think of a number between 1 and 100... mine is ${Math.floor(Math.random() * 100) + 1}. Did we match?`,
        `Here's a quote to spark something:\n${pick(QUOTES)}`,
        "Try asking me 'flip a coin' or 'roll a dice' — I'm great at random things!",
      ]);
    }

    // ── Are you human / sentient ──────────────────────────────────────────────
    if (/are you human|are you real|are you alive|do you have feelings|are you sentient|are you ai|are you a robot/.test(t)) {
      return "I'm an AI — not human, but designed to be genuinely helpful. I run completely offline on your device, so everything you say stays private.";
    }

    // ── Smart home / lights ───────────────────────────────────────────────────
    if (/turn on.*light|turn off.*light|lights on|lights off/.test(t)) {
      return "I can control your phone's flashlight! Try 'torch on' or 'torch off'. For smart home lights, you'd need a separate app.";
    }

    // ── Flashlight shorthand ──────────────────────────────────────────────────
    if (/^(torch|flashlight|flash)$/.test(t)) {
      return "Did you mean 'torch on' or 'torch off'? I'll toggle it for you!";
    }

    // ── Music ─────────────────────────────────────────────────────────────────
    if (/play.*music|music|song|playlist|spotify|youtube music/.test(t)) {
      return "I can search YouTube for music! Try 'youtube lofi music' or 'youtube [artist name] songs'. 🎵";
    }

    // ── Math encouragement ────────────────────────────────────────────────────
    if (/calculate|math|compute|solve/.test(t)) {
      return "I can do math! Just type the expression directly, like '250 * 8 + 50' or 'what is 15% of 340'.";
    }

    // ── Navigation ───────────────────────────────────────────────────────────
    if (/direction|navigate|how to get|route to/.test(t)) {
      return "I can open Google Maps for directions! Try 'navigate to [place]' or 'directions to [city]'. 🗺️";
    }

    // ── Calls ─────────────────────────────────────────────────────────────────
    if (/call|phone|dial/.test(t)) {
      return "I can help with calls! Try 'call [number]', 'answer call', or 'hang up'. 📞";
    }

    // ── WhatsApp ──────────────────────────────────────────────────────────────
    if (/whatsapp|message|text/.test(t)) {
      return "I can send WhatsApp messages! Try 'text Mom on WhatsApp saying I'm on my way'. 💬";
    }

    // ── Remind / schedule ─────────────────────────────────────────────────────
    if (/remind|reminder|schedule|appointment/.test(t)) {
      return "I can set timers and alarms! Try 'timer 30 minutes' or 'set alarm for 8am'. ⏰";
    }

    // ── Sleep / rest ──────────────────────────────────────────────────────────
    if (/good morning|morning/.test(t)) {
      return pick([
        `Good morning! 🌅 Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}. What are we doing today?`,
        "Good morning! Let's make it a great day. What do you need?",
      ]);
    }

    // ── Password / security ───────────────────────────────────────────────────
    if (/password|secure|security/.test(t)) {
      return "I can generate a strong password! Try 'generate password' or 'password 20' for a 20-character one. 🔐";
    }

    // ── Wikipedia / knowledge ─────────────────────────────────────────────────
    if (/what is|who is|explain|define|meaning of|definition of/.test(t)) {
      const topic = t.replace(/^(what|who)\s+(is|are)\s+|explain\s+|define\s+|meaning of\s+|definition of\s+/, '').trim();
      if (topic.length > 2) {
        return `Try 'wiki ${topic}' — I'll look it up from Wikipedia and save it offline for next time! 📚`;
      }
    }

    // ── Capabilities check ────────────────────────────────────────────────────
    if (/can you|do you|are you able/.test(t)) {
      return "I can do quite a lot! Hardware control, timers, alarms, YouTube search, WhatsApp messages, weather, Wikipedia lookup, calculations, currency conversion, and more. What do you have in mind?";
    }

    // ── Short confusing inputs ────────────────────────────────────────────────
    if (t.length < 4) {
      return "I didn't quite get that. Could you say more? Or type 'help' to see what I can do.";
    }

    // ── Default fallback ──────────────────────────────────────────────────────
    return pick([
      "I'm running in command mode right now. I handle 50+ built-in commands — type 'help' to see them. For open-ended AI chat, download a GGUF model from Settings.",
      "Hmm, I'm not sure how to answer that in command mode. Try a specific task like 'weather in Paris', 'timer 10 min', or 'open YouTube'.",
      "I work best with specific commands! Try 'torch on', 'youtube lofi', 'text Mom saying hi', or 'weather in London'.",
      "Good question! In command mode I'm strongest at tasks. Try 'what is [topic]' for Wikipedia, or 'calculate [math]' for numbers.",
    ]);
  }
}

export const aiService = new AIService();
