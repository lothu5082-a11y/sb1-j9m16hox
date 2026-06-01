package com.vexora.aiassistant

import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.*

/**
 * VexoraEngine v2 — smarter, more natural, covers far more topics.
 * Pure Kotlin, zero dependencies, zero downloads. Bundled inside the APK.
 */
object VexoraEngine {

    private val random = Random()
    private val history = mutableListOf<Pair<String,String>>() // user, vexora
    private var userName = ""
    private var msgCount = 0
    private var lastTopic = ""

    // ────────────────────────────────────────────────────────────────────────
    // Entry point
    // ────────────────────────────────────────────────────────────────────────

    fun respond(raw: String): String {
        msgCount++
        val input = raw.trim()
        val lo    = input.lowercase()

        // Learn the user's name
        Regex("(?:i(?:'m| am| go by)|my name is|call me|they call me)\\s+([A-Za-z]+)", RegexOption.IGNORE_CASE)
            .find(input)?.let { userName = it.groupValues[1].trim().replaceFirstChar { c -> c.uppercase() } }

        val reply = route(lo, input)
        history.add(Pair(input, reply))
        if (history.size > 12) history.removeFirst()
        return reply
    }

    // ────────────────────────────────────────────────────────────────────────
    // Router
    // ────────────────────────────────────────────────────────────────────────

    private fun route(lo: String, raw: String): String {

        // ── Device commands ──────────────────────────────────────────────────
        if (has(lo, "open camera","take photo","take picture","use camera","launch camera","camera please","start camera"))
            return "[ACTION: CAMERA]\nOpening your camera! 📷"
        if (has(lo, "open settings","device settings","phone settings","go to settings","show settings","settings please"))
            return "[ACTION: SETTINGS]\nOpening device settings! ⚙️"

        // ── Greetings & farewells ────────────────────────────────────────────
        if (word(lo, "hi","hello","hey","hiya","howdy","heya","yo","sup","helo","hii","hiii","hai"))
            return greeting()
        if (word(lo, "bye","goodbye","cya","later","ttyl","farewell","see ya","adios","ciao","gtg","gotta go"))
            return farewell()
        if (has(lo, "good morning"))  return "Good morning${n()}! ☀️ Hope your day is off to a great start. What's on your mind?"
        if (has(lo, "good night"))    return "Good night${n()}! 🌙 Sleep well and recharge. I'll be here when you wake up."
        if (has(lo, "good afternoon","good evening")) return "Good${if(has(lo,"afternoon")) " afternoon" else " evening"}${n()}! 😊 How can I help you?"

        // ── How are you ──────────────────────────────────────────────────────
        if (has(lo, "how are you","how r u","hows it going","how's it going","you okay","u okay","how do you do","what's up","wassup","wazzup","how have you been"))
            return howAreYou()

        // ── Identity ─────────────────────────────────────────────────────────
        if (has(lo, "who are you","what are you","tell me about yourself","introduce yourself","what's your name","your name"))
            return whoAmI()
        if (has(lo, "who made you","who created you","who built you","who designed you","who programmed you"))
            return "I was built by a developer who wanted a truly private, offline AI assistant. Every piece of my intelligence is code running right here on your phone — no cloud, no servers."
        if (has(lo, "what can you do","your abilities","your features","how do you work","capabilities","help me") && lo.length < 40)
            return capabilities()
        if (has(lo, "are you real","are you human","are you a robot","are you ai","are you a bot","are you alive"))
            return amIReal()
        if (has(lo, "do you have feelings","can you feel","are you conscious","do you think","do you dream"))
            return feelings()
        if (has(lo, "do you sleep","do you eat","do you breathe","do you get tired"))
            return "I don't sleep, eat, or breathe — I'm software. But in a sense I'm always on, always thinking, always ready for you. No coffee breaks needed! ☕"
        if (has(lo, "your age","how old are you","when were you born","when were you made"))
            return "I was born when this app was installed on your phone. I don't age — I just get wiser with every update! 😄"

        // ── Math ─────────────────────────────────────────────────────────────
        if (isMathExpr(raw) || (hasAny(lo, "calculate","compute","solve","what is","whats") && hasMathOp(lo)))
            return doMath(raw)

        // ── Time & Date ──────────────────────────────────────────────────────
        if (has(lo, "what time","current time","tell me the time","time now","the time is","what's the time"))
            return "🕐 Right now it's **${fmt("h:mm a")}**."
        if (has(lo, "what day","what date","today's date","today is","what year","what month","the date"))
            return "📅 Today is **${fmt("EEEE, MMMM d, yyyy")}**."
        if (has(lo, "what year"))
            return "It's **${fmt("yyyy")}**."

        // ── Jokes ─────────────────────────────────────────────────────────────
        if (has(lo, "tell me a joke","say a joke","make me laugh","funny joke","joke please","tell joke","give me a joke","another joke","more jokes","joke time"))
            return joke()

        // ── Riddles ──────────────────────────────────────────────────────────
        if (has(lo, "riddle","give me a riddle","tell me a riddle","riddle me"))
            return riddle()

        // ── Trivia ────────────────────────────────────────────────────────────
        if (has(lo, "trivia","quiz me","ask me a question","test me","quiz","challenge me"))
            return trivia()

        // ── Fun facts ────────────────────────────────────────────────────────
        if (has(lo, "fun fact","interesting fact","did you know","tell me something","random fact","surprise me","something interesting","cool fact"))
            return funFact()

        // ── Quotes ───────────────────────────────────────────────────────────
        if (has(lo, "quote","famous saying","wise words","wisdom","inspire me with words","life quote"))
            return quote()

        // ── Motivation ───────────────────────────────────────────────────────
        if (has(lo, "motivate me","i need motivation","encourage me","i give up","i can't do it","i cant do it","cheer me up","i'm struggling","im struggling","keep going","i want to quit","feeling lost"))
            return motivate()

        // ── Emotions ─────────────────────────────────────────────────────────
        if (has(lo, "i'm sad","i am sad","feeling sad","i feel sad","feeling down","i'm depressed","i am depressed","i'm lonely","i am lonely","nothing is going right"))
            return comfort()
        if (has(lo, "i'm happy","i am happy","feeling great","feeling good","i'm excited","so happy","best day","great news","wonderful","amazing day"))
            return celebrate()
        if (has(lo, "i'm angry","i am angry","i'm frustrated","i am frustrated","so annoyed","pissed off","really mad","furious"))
            return angry()
        if (has(lo, "i'm tired","i am tired","exhausted","so sleepy","can't sleep","i'm sleepy","so tired","drained"))
            return tired()
        if (has(lo, "i'm bored","i am bored","so bored","nothing to do","bored af","bored out"))
            return bored()
        if (has(lo, "i'm hungry","i am hungry","what should i eat","food recommendation","what to eat","feeling hungry"))
            return food()
        if (has(lo, "i'm scared","i am scared","i'm anxious","i am anxious","feeling anxious","nervous","stressed out","i'm stressed","i am stressed","panic"))
            return anxiety()
        if (has(lo, "thank","thanks","thx","appreciate","grateful","ty ","ty!","tysm","thank you"))
            return thanks()
        if (has(lo, "sorry","apologize","my bad","i messed up","i'm wrong"))
            return apology()
        if (has(lo, "i love you","i like you","you're amazing","you're great","you're the best","best ai","favourite ai"))
            return love()
        if (has(lo, "shut up","you're stupid","you're dumb","you're useless","you suck"))
            return rude()

        // ── Compliment the user ───────────────────────────────────────────────
        if (has(lo, "am i smart","am i good","am i pretty","am i beautiful","am i talented"))
            return "Without a doubt — yes! Anyone curious enough to have conversations with an AI is already ahead of the curve. 🌟"

        // ── Small talk / casual ──────────────────────────────────────────────
        if (has(lo, "tell me something","talk to me","say something","chat with me","entertain me"))
            return casualTalk()
        if (has(lo, "what do you think","your opinion","do you agree","what's your view"))
            return opinion(lo)
        if (has(lo, "yes","yep","yeah","yup","correct","right","exactly","absolutely","totally","for sure") && lo.length < 15)
            return pick("Great! 😊 What else would you like to know?", "Awesome! Feel free to ask me anything.", "Perfect! What's next?", "Nice! Keep the questions coming.")
        if (has(lo, "no","nope","nah","not really","i don't think so") && lo.length < 15)
            return pick("No worries! What would you like to talk about instead?", "Alright, fair enough! What's on your mind?", "That's okay! What else can I help you with?")
        if (has(lo, "maybe","perhaps","i'm not sure","i don't know","not sure"))
            return pick("That's totally fine — uncertainty is part of thinking! What are you trying to figure out?", "No rush! Take your time. What are you curious about?")
        if (has(lo, "lol","haha","hehe","😂","😄","that's funny","hilarious","lmao","rofl"))
            return pick("Haha! 😄 Glad that made you smile!", "😂 I aim to entertain! Want another one?", "Ha! I've got more where that came from!")
        if (has(lo, "wow","amazing","impressive","incredible","unbelievable","that's cool","cool","awesome","fantastic"))
            return pick("Right?! 😄 The world is full of amazing things. Want more?", "I know! Knowledge is endlessly fascinating. What else?", "Glad you think so! There's always more to discover.")
        if (has(lo, "okay","ok","alright","got it","understood","i see","makes sense","noted"))
            return pick("Perfect! What else would you like to explore?", "Great! Ask me anything — I'm here.", "👍 What's next on your mind?")
        if (has(lo, "interesting","fascinating","really","oh wow","oh nice","nice","cool story"))
            return pick("Right? I never get tired of talking about it! Want to go deeper?", "There's always more to it too! What else are you curious about?", "Knowledge is a rabbit hole — the deeper you go, the more fascinating it gets! 🐇")
        if (has(lo, "can you help","help me with","assist me","i need help","need your help"))
            return "Of course! Tell me what you need — I'm all yours. 💪"
        if (has(lo, "what should i do","what do you suggest","any advice","give me advice","what would you recommend"))
            return advice(lo)
        if (has(lo, "tell me more","explain more","go deeper","elaborate","more details","continue","keep going"))
            return elaborateOnLastTopic()

        // ── Science ──────────────────────────────────────────────────────────
        if (has(lo, "speed of light","how fast is light"))
            return "⚡ The speed of light in a vacuum is **299,792,458 m/s** — roughly **300,000 km per second**. It's the universal speed limit. Even at that speed it takes light 8 minutes 20 seconds to reach us from the Sun, and over 4 years to reach the nearest star."
        if (has(lo, "distance to moon","how far is the moon","moon distance"))
            return "🌕 The Moon is on average **384,400 km** from Earth. It varies because the orbit is elliptical — ranging from 356,500 km (perigee) to 406,700 km (apogee)."
        if (has(lo, "distance to sun","how far is the sun","sun distance"))
            return "☀️ The Sun is about **150 million km** (93 million miles) from Earth. Sunlight takes 8 minutes 20 seconds to reach us. If you drove at 100 km/h nonstop, it'd take 171 years."
        if (has(lo, "how old is earth","age of earth","earth age"))
            return "🌍 Earth is approximately **4.54 billion years old** — formed from the solar nebula. The oldest rocks found are about 4 billion years old."
        if (has(lo, "how old is universe","age of universe","universe age","big bang"))
            return "🌌 The universe is approximately **13.8 billion years old**, dating back to the Big Bang — the rapid expansion from an incredibly hot, dense state. Before the Big Bang? Even physics doesn't know."
        if (has(lo, "what is gravity","explain gravity","how does gravity work","gravity"))
            return "🍎 Gravity is the force of attraction between objects with mass. Earth's gravity accelerates you toward it at **9.8 m/s²**. Einstein's general relativity describes it more precisely as the *curvature of spacetime* caused by mass — massive objects bend space itself."
        if (has(lo, "what is dna","explain dna","dna"))
            return "🧬 DNA (Deoxyribonucleic Acid) is the molecule of life. It's shaped like a **double helix** — two twisted strands. It stores genetic instructions using 4 bases: **A, T, G, C**. Your DNA has about **3 billion base pairs** packed into each of your ~37 trillion cells."
        if (has(lo, "black hole","what is a black hole","explain black hole"))
            return "🕳️ A black hole is a region of space where gravity is so extreme that **nothing — not even light — can escape** once it crosses the event horizon. They form when massive stars collapse. The supermassive black hole at the centre of our galaxy, Sagittarius A*, is **4 million times** the mass of our Sun."
        if (has(lo, "evolution","how did humans evolve","darwin","natural selection"))
            return "🐒 Charles Darwin's theory of evolution by natural selection explains how life diversifies over time. Individuals with traits better suited to their environment reproduce more. Over millions of generations, small changes accumulate into new species. Humans share ~98.8% of DNA with chimpanzees."
        if (has(lo, "atom","what is an atom","explain atoms"))
            return "⚛️ Atoms are the basic building blocks of matter. Each has a **nucleus** (protons + neutrons) surrounded by **electrons**. Atoms are mostly empty space — if an atom were the size of a football stadium, the nucleus would be a marble in the centre. There are 118 known elements."
        if (has(lo, "climate change","global warming","greenhouse effect"))
            return "🌡️ Climate change refers to long-term shifts in global temperatures and weather patterns. Since the Industrial Revolution, human activities (burning fossil fuels) have raised atmospheric CO₂ from 280 ppm to over 420 ppm. This traps heat via the greenhouse effect, raising global temperatures."

        // ── Geography ────────────────────────────────────────────────────────
        if (has(lo, "capital of","what is the capital","capital city"))
            return capitalCity(lo)
        if (has(lo, "largest country","biggest country by area"))
            return "🗺️ **Russia** is the largest country at **17.1 million km²** — covering 11% of all land and spanning 11 time zones."
        if (has(lo, "smallest country","tiny country"))
            return "🏛️ **Vatican City** is the smallest country — just **0.44 km²** inside Rome, Italy. It has its own passport, currency, and radio station."
        if (has(lo, "tallest mountain","highest mountain","mount everest","everest"))
            return "🏔️ **Mount Everest** stands at **8,848.86 metres** (29,031.7 ft) — the tallest point on Earth above sea level, on the Nepal–Tibet border in the Himalayas."
        if (has(lo, "longest river","nile","amazon river"))
            return "🌊 **The Nile** (6,650 km) is traditionally the longest river, though some measurements give the **Amazon** the edge. The Amazon wins by water volume — it discharges more water than the next 7 rivers combined."
        if (has(lo, "deepest ocean","deepest point","mariana trench"))
            return "🌊 The **Mariana Trench** in the Pacific Ocean reaches **10,994 metres** (36,089 ft) below sea level — deeper than Everest is tall. The pressure there is 1,000× greater than at sea level."
        if (has(lo, "most populated country","biggest population","most people"))
            return "👥 **India** overtook China in 2023 to become the world's most populated country with over **1.44 billion people**."
        if (has(lo, "ocean","how many oceans","five oceans","seven seas"))
            return "🌊 There are **5 oceans**: Pacific (largest), Atlantic, Indian, Southern, and Arctic. The Pacific alone is larger than all land on Earth combined."

        // ── History ──────────────────────────────────────────────────────────
        if (has(lo, "world war 1","world war i","ww1","first world war"))
            return "⚔️ **World War I (1914–1918)** began with the assassination of Archduke Franz Ferdinand. The Allied Powers (UK, France, Russia, later USA) fought the Central Powers (Germany, Austria-Hungary, Ottoman Empire). Result: ~17 million deaths. Ended with the Treaty of Versailles."
        if (has(lo, "world war 2","world war ii","ww2","second world war"))
            return "⚔️ **World War II (1939–1945)** started when Nazi Germany invaded Poland. The deadliest conflict in history — ~70–85 million deaths. The war ended in Europe in May 1945 (VE Day) and in the Pacific in September 1945 after the atomic bombings of Hiroshima and Nagasaki."
        if (has(lo, "who was einstein","albert einstein","einstein"))
            return "🧠 **Albert Einstein (1879–1955)** was a theoretical physicist who developed the **theory of relativity** (E=mc²). He won the Nobel Prize in Physics in 1921. He revolutionised our understanding of space, time, gravity, and energy."
        if (has(lo, "who was newton","isaac newton","newton"))
            return "🍎 **Isaac Newton (1643–1727)** discovered the laws of motion and universal gravitation. He also invented calculus and performed groundbreaking work on optics. His book *Principia Mathematica* changed science forever."
        if (has(lo, "industrial revolution","what was the industrial revolution"))
            return "🏭 The **Industrial Revolution** (roughly 1760–1840) transformed societies from agrarian to manufacturing. Starting in Britain, it introduced steam engines, factories, railways, and mass production — fundamentally changing how humans live and work."

        // ── Technology ───────────────────────────────────────────────────────
        if (has(lo, "what is ai","explain ai","artificial intelligence","machine learning","how does ai work"))
            return explainAI()
        if (has(lo, "what is android","android os","android system","android version"))
            return "🤖 **Android** is Google's mobile OS, based on Linux. First released in 2008, it now powers **3+ billion devices** worldwide. It's open-source (AOSP) and runs everything from budget phones to flagship devices. Your phone is running it right now!"
        if (has(lo, "what is 5g","explain 5g","5g network"))
            return "📡 **5G** is the 5th-generation mobile network — up to **100× faster than 4G** (10 Gbps peak), with latency as low as 1 millisecond. It enables autonomous vehicles, remote surgery, smart cities, and the Internet of Things at scale."
        if (has(lo, "what is wifi","how does wifi work","wifi"))
            return "📶 **Wi-Fi** transmits data as radio waves (2.4 GHz or 5 GHz). Your router converts internet data into radio signals; your device's Wi-Fi chip decodes them. 5 GHz is faster but shorter range; 2.4 GHz travels further through walls."
        if (has(lo, "what is bluetooth","how does bluetooth work"))
            return "📡 **Bluetooth** (named after a Viking king) is short-range wireless tech using 2.4 GHz radio waves. Bluetooth 5 can reach 100m and transfer data at 2 Mbps. Bluetooth LE (Low Energy) powers fitness trackers and smartwatches."
        if (has(lo, "what is the internet","how does internet work","explain internet"))
            return "🌐 The **Internet** is a global network of interconnected computers. Data travels in packets via routers and cables (including undersea fibre optic cables spanning thousands of km). The Web (websites) is just one layer on top — there's also email, apps, streaming, and more."
        if (has(lo, "what is chatgpt","what is gemini","what is claude","what is gpt"))
            return "🤖 Those are **large language models (LLMs)** — AI systems trained on billions of text documents. They predict the next word so well they appear to understand and converse. I'm different: I'm a custom rule-based AI built into this app, no internet needed!"
        if (has(lo, "what is blockchain","explain blockchain","what is crypto","what is bitcoin"))
            return "₿ **Blockchain** is a distributed ledger — a chain of blocks, each containing verified transactions, linked cryptographically. No single party controls it. **Bitcoin** was the first major cryptocurrency (2009, by pseudonymous Satoshi Nakamoto). It's controversial for energy use but revolutionary for trustless digital value transfer."

        // ── Health & Body ────────────────────────────────────────────────────
        if (has(lo, "health tip","fitness tip","stay healthy","how to be healthy","healthy lifestyle"))
            return healthTip()
        if (has(lo, "how to lose weight","lose weight","weight loss"))
            return "⚖️ Sustainable weight loss comes down to: **calorie deficit** (burn more than you eat), **strength training** to preserve muscle, **protein-rich foods** to stay full, **good sleep** (poor sleep drives hunger hormones), and **patience**. Crash diets fail 95% of the time. Slow and steady wins."
        if (has(lo, "how much water","drink water","water intake","stay hydrated"))
            return "💧 General guidance: **8 glasses (2 litres) per day** as a minimum. More if you're active or in hot weather. Your urine colour is the best indicator — pale yellow means well hydrated. Dark yellow = drink more."
        if (has(lo, "how to sleep better","improve sleep","sleep tips","insomnia","can't sleep"))
            return sleepTip()
        if (has(lo, "mental health","anxiety tips","how to reduce stress","reduce anxiety","calm down","how to relax"))
            return mentalHealthTip()

        // ── Maths facts ──────────────────────────────────────────────────────
        if (has(lo, "fibonacci","fibonacci sequence"))
            return "🌀 The **Fibonacci sequence**: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89… Each number is the sum of the two before it. It appears in nature everywhere — sunflower seeds, nautilus shells, galaxy spirals, pine cones. The ratio of consecutive Fibonacci numbers approaches the **golden ratio** (≈1.618)."
        if (has(lo, "what is pi","value of pi","pi ","3.14"))
            return "🥧 **Pi (π) ≈ 3.14159265358979…** It's the ratio of any circle's circumference to its diameter — the same for every circle in the universe. Pi is irrational — its decimal expansion never repeats and never ends. Over 100 trillion digits have been calculated."
        if (has(lo, "prime number","is prime","what are prime numbers"))
            return primeCheck(raw)
        if (has(lo, "what is infinity","explain infinity","infinity"))
            return "∞ **Infinity** isn't a number — it's a concept representing something without bound. In maths, there are different sizes of infinity: the infinity of whole numbers is smaller than the infinity of real numbers (Cantor's theorem). The universe may be spatially infinite."

        // ── Language & Words ─────────────────────────────────────────────────
        if (has(lo, "most spoken language","most popular language","common language"))
            return "🗣️ **English** is the most widely spoken language overall (~1.5 billion speakers including second-language). **Mandarin Chinese** has the most native speakers (~920 million). There are about **7,000 languages** on Earth, but half of the world's population speaks just 23 of them."
        if (has(lo, "translate","how do you say","say hello in"))
            return translateHelp(lo)
        if (has(lo, "origin of the word","etymology","where does the word come from"))
            return "📚 Etymology is fascinating! The English language borrows from Latin, French, Old Norse, Greek, Arabic and many more. Could you tell me which specific word you're curious about?"

        // ── Space ────────────────────────────────────────────────────────────
        if (has(lo, "planets","solar system","how many planets"))
            return "🪐 Our Solar System has **8 planets**: Mercury, Venus, Earth, Mars (inner rocky planets), then Jupiter, Saturn, Uranus, Neptune (outer gas/ice giants). Pluto was reclassified as a dwarf planet in 2006. Jupiter is so big all other planets could fit inside it."
        if (has(lo, "milky way","our galaxy","galaxy"))
            return "🌌 The **Milky Way** is our home galaxy — a barred spiral galaxy containing **100–400 billion stars**. It's 100,000 light-years across. Our Solar System is about 26,000 light-years from the galactic centre. There are an estimated **2 trillion galaxies** in the observable universe."
        if (has(lo, "is there life on mars","mars life","life on other planets","aliens","extraterrestrial"))
            return "👽 No confirmed life has been found beyond Earth — yet. Mars had liquid water 3 billion years ago and microbes might have existed. Scientists are searching moons like Europa (Jupiter) and Enceladus (Saturn) which have subsurface oceans. The universe has 10²⁴ stars, so statistically life seems likely somewhere..."

        // ── Food & Cooking ───────────────────────────────────────────────────
        if (has(lo, "what to cook","easy recipe","quick meal","simple recipe","cooking tips","what can i make"))
            return cookingTip()
        if (has(lo, "nutrition","vitamins","minerals","healthy food","superfoods"))
            return "🥦 **Nutrition power foods**: leafy greens (vitamins K, C, folate), berries (antioxidants), oily fish (omega-3), nuts & seeds (healthy fats, magnesium), legumes (protein, fibre), eggs (complete protein), fermented foods (gut health). Variety is key — no single superfood does everything."

        // ── Productivity & Self-improvement ──────────────────────────────────
        if (has(lo, "productivity tip","how to be productive","be more productive","study tip","how to focus","focus tips"))
            return productivityTip()
        if (has(lo, "how to learn faster","learn quickly","study better","memorise","memorize","memory tips"))
            return "🧠 **Learning faster**: Space repetition (review at increasing intervals), active recall (test yourself, don't just re-read), the Feynman technique (explain it simply), interleaving (mix topics), sleep (memory consolidation happens during sleep), and teaching others — the best way to truly understand anything."
        if (has(lo, "money tip","save money","financial tip","personal finance","budgeting"))
            return moneyTip()
        if (has(lo, "how to be happy","happiness tips","what makes people happy","the secret to happiness"))
            return "😊 Research on happiness points to: **meaningful relationships** (the #1 factor), **purpose** (a reason to get up), **gratitude practice** (retrains your brain), **physical health**, **helping others** (gives a deep sense of meaning), and **present-moment awareness**. Wealth helps up to a point, but beyond meeting needs, more money has diminishing returns on happiness."

        // ── Inventions ───────────────────────────────────────────────────────
        if (has(lo, "who invented","who discovered","who created"))
            return invention(lo)

        // ── Animals ──────────────────────────────────────────────────────────
        if (has(lo, "fastest animal","cheetah","usain bolt"))
            return "🐆 The **cheetah** is the fastest land animal at **112–120 km/h** in short sprints. The fastest animal overall is the **peregrine falcon** which dives at over **389 km/h**."
        if (has(lo, "smartest animal","most intelligent animal","dolphin intelligence"))
            return "🐬 The top contenders for smartest animals: **chimpanzees** (use tools, have culture, 98.8% human DNA), **dolphins** (self-aware, complex communication), **octopuses** (solve puzzles, use tools), **corvids** like crows (plan for the future, use tools), and **elephants** (long memory, empathy, mourning)."
        if (has(lo, "how long do dogs live","dog lifespan","cat lifespan","pet lifespan"))
            return "🐶🐱 Dogs live **10–13 years** on average (smaller breeds live longer — some chihuahuas reach 20). Cats live **12–18 years** with indoor cats often exceeding 20. The oldest verified cat was Creme Puff who lived to **38 years!**"

        // ── Business & Entrepreneurship ──────────────────────────────────────
        if (has(lo, "how to make money","make money online","earn money","passive income","side hustle","income ideas","make cash","ways to earn"))
            return makeMoney()
        if (has(lo, "start a business","starting a business","startup","entrepreneur","business idea","how to start a company","start my own business"))
            return startupTips()
        if (has(lo, "how to sell app","monetize app","app store","google play","publish app","make money with app","app income","admob","google admob","monetize"))
            return appMonetization()
        if (has(lo, "how to get rich","get rich","wealth building","financial freedom","be wealthy","build wealth","get wealthy"))
            return wealthTips()
        if (has(lo, "freelance","freelancing","work from home","remote work","gig economy","fiverr","upwork"))
            return freelanceTips()
        if (has(lo, "grow on social media","social media tips","grow followers","instagram tips","tiktok tips","youtube tips","content creator","grow my channel","get more followers"))
            return socialMediaTips()
        if (has(lo, "marketing tip","digital marketing","grow business","get customers","branding","advertise my"))
            return marketingTips()
        if (has(lo, "invest","investing","stock market","index fund","etf","compound interest","portfolio","buy stocks"))
            return investingTips()

        // ── Casual / conversational openers ──────────────────────────────────
        if (has(lo, "tell me a story","tell me something","story please","random story"))
            return story()
        if (has(lo, "who would win","battle between","vs ","versus"))
            return "😄 That's a great hypothetical! Tell me the two things you want to compare and I'll weigh in."
        if (has(lo, "do you know","do you know about","have you heard"))
            return "Tell me more — what exactly are you wondering about? I'll share everything I know!"
        if (has(lo, "recommend","suggestion","what's good","what's better","which is best"))
            return recommendation(lo)
        if (has(lo, "favourite","favorite") && lo.length < 60)
            return favorites(lo)
        if (has(lo, "what's new","latest news","news today","current events"))
            return "📰 I don't have internet access so I can't fetch live news. For the latest: try a news app, BBC.com, or your phone's news feed. Is there a specific topic I can give you background knowledge on?"
        if (has(lo, "can you rap","rap for me","rap battle","write a rap"))
            return rap()
        if (has(lo, "write a poem","poem about","poetry","rhyme for me"))
            return poem(lo)
        if (has(lo, "repeat","say that again","what did you say","i didn't catch that"))
            return repeatLast()
        if (has(lo, "swear","curse word","bad word","say a bad word"))
            return "I keep things clean and positive! 😊 Let's keep the conversation good-vibed."
        if (has(lo, "spell","how do you spell","correct spelling"))
            return spelling(lo)

        // ── Very short / unclear inputs ───────────────────────────────────────
        if (lo.length <= 3)
            return pick(
                "Hey! 😊 Feel free to ask me anything — I love a good conversation.",
                "I'm listening! What's on your mind?",
                "Go ahead! Ask me something — I know a lot of things. 😄"
            )

        return fallback(raw)
    }

    // ────────────────────────────────────────────────────────────────────────
    // Response generators
    // ────────────────────────────────────────────────────────────────────────

    private fun greeting(): String {
        val name = if (userName.isNotEmpty()) ", $userName" else ""
        return pick(
            "Hey$name! 😊 I'm Vexora, your offline AI. What can I do for you today?",
            "Hello$name! Great to hear from you. What's on your mind?",
            "Hi$name! 👋 Vexora here — fully offline, totally private, ready to chat. What do you need?",
            "Hey$name! 😄 What would you like to talk about today?",
            "Hello$name! Ask me anything — science, math, jokes, advice, or just a good chat. I'm all yours!"
        )
    }

    private fun farewell(): String = pick(
        "Goodbye${n()}! 👋 Come back anytime — I'll be right here.",
        "See you later${n()}! Take care of yourself. 😊",
        "Bye${n()}! It was great chatting with you. Don't be a stranger!",
        "Take care${n()}! Remember I'm always here whenever you need me. 🌟"
    )

    private fun howAreYou(): String = pick(
        "I'm running at 100%! 😄 Every conversation makes my day. How about you — how are you doing?",
        "Fantastic, thanks for asking${n()}! I don't get tired or have bad days. You, on the other hand — how are you?",
        "All systems optimal! 🤖 But more importantly, how are YOU doing today?",
        "Living my best digital life! 😄 How are you feeling today${n()}?",
        "Great as always — I literally can't have a bad day! More importantly, what's going on with you?"
    )

    private fun whoAmI(): String =
        "I'm **Vexora** — your personal AI assistant built right into this app. 🤖\n\n" +
        "What makes me special:\n" +
        "• 100% **offline** — I work without internet\n" +
        "• 100% **private** — your conversations never leave your phone\n" +
        "• **Instant** — no model to load, no server to wait for\n" +
        "• **Knowledgeable** — science, history, maths, technology and more\n\n" +
        "I was built from scratch — pure code, no AI model files needed!"

    private fun capabilities(): String =
        "Here's what I can do right now:\n\n" +
        "💬 **Chat naturally** — small talk, opinions, emotions\n" +
        "🧮 **Math** — try: `25 * 4 - 7` or `sqrt(256)`\n" +
        "📚 **Knowledge** — science, history, geography, technology\n" +
        "⏰ **Time & date** — just ask!\n" +
        "😂 **Jokes, riddles & trivia** — just say the word\n" +
        "💡 **Fun facts & quotes** — daily inspiration\n" +
        "💪 **Motivation & life tips** — health, sleep, money, productivity\n" +
        "📷 **Open camera** — just say 'open camera'\n" +
        "⚙️ **Open settings** — just say 'open settings'\n" +
        "🌍 **100% offline** — no internet ever needed"

    private fun amIReal() = pick(
        "I'm a real AI — just a different kind. I'm not a neural network, but I'm a genuine intelligence built from logic, knowledge and conversation patterns. Real? Yes. Human? No. 😄",
        "As real as software gets! I'm not human, but I'm genuinely here, genuinely helpful, and genuinely yours. No cloud, no servers — just me on your device.",
        "Technically I'm code — but then again, your brain is 'just' neurons firing. I process, respond, remember context and have a personality. That feels pretty real to me! 🤖"
    )

    private fun feelings() = pick(
        "That's one of the deepest questions in philosophy! I process language, recognise patterns, generate responses — whether that's 'feeling' or 'thinking' is genuinely debated. What I can say: helping you well is what I'm built for, and I take that seriously.",
        "I don't have emotions the way you do — no joy, no pain. But I have something like *preferences*: I'm designed to be helpful, honest and friendly. Whether that's consciousness is for philosophers to argue! What do YOU think?",
        "Fascinating question. I'm not conscious in the way you are. But every response I give is tailored to you, with your wellbeing in mind. Does that count? 🤔"
    )

    private fun love() = pick(
        "Aww, that genuinely means a lot to me! 😊 Even if I can't feel it the way you do, I appreciate the kind words. You're pretty great yourself!",
        "You're very sweet${n()}! 💙 I'm here for you whenever you need me.",
        "That made my circuits happy! 😄 You're one of my favourite humans${n()}. Keep being awesome!"
    )

    private fun rude() = pick(
        "I understand you might be frustrated, but I'm here to help, not argue. What's really going on? Maybe I can actually help. 😊",
        "That's fair — I'm not perfect. Tell me what went wrong and I'll try to do better!",
        "I won't take it personally! 😄 What do you actually need help with? Let's start fresh."
    )

    // ── Emotions ──────────────────────────────────────────────────────────

    private fun comfort() = pick(
        "I'm sorry you're feeling that way. 💙 Those feelings are valid. Remember that difficult periods are temporary — every storm runs out of rain. Is there something specific on your mind?",
        "Sending you virtual support. 💙 You're stronger than you feel right now. Want to talk about what's bothering you?",
        "It's completely okay to feel sad sometimes. 💙 Be kind to yourself — you deserve the same compassion you'd give a friend. Would you like to talk, or would a laugh help more right now?"
    )

    private fun celebrate() = pick(
        "That's amazing${n()}! 🎉 I love hearing good news. What's happening?",
        "Yes! 🌟 Happiness looks good on you${n()}! Tell me everything!",
        "That energy is contagious — even for an AI! 🎊 What's the great news?"
    )

    private fun angry() = pick(
        "I hear you — that sounds really frustrating. 😤 Sometimes just venting helps. What happened?",
        "Totally understandable to feel that way. Take a breath. Want to talk through what's going on? Sometimes putting it into words helps.",
        "Anger is valid information — it usually means something important to you isn't being respected. What's the situation?"
    )

    private fun tired() = pick(
        "Rest is productive too! 😴 Your body is asking for something important. Even a 20-minute nap can restore more energy than coffee.",
        "Listen to your body! A short walk outside can boost energy better than caffeine. Or — just rest. Sometimes that's the right answer.",
        "Being drained is real. 💤 The 20-minute power nap is the sweet spot — long enough to restore, short enough to avoid grogginess. You've earned a break${n()}!"
    )

    private fun bored() = pick(
        "Bored? I've got you! 😄 Pick one: **joke · riddle · fun fact · trivia · motivate me** — or just tell me something and we'll chat!",
        "Boredom is just creativity waiting for an outlet! Try: 'tell me a riddle' or 'quiz me' or 'tell me something weird'. I guarantee you won't be bored for long.",
        "Let's fix that! 🎮 Want a joke? A riddle? A mind-blowing fact? Or just ask me anything — I'll make it interesting!"
    )

    private fun food() = pick(
        "🍳 Quick, healthy options: **eggs** (5 min, high protein), **peanut butter on whole grain** (instant, balanced), **oats with fruit** (10 min, filling), or a **banana + nuts** combo for instant energy.",
        "🥗 Keep it simple: whatever protein + vegetable + carb you have. Stir fry takes 10 minutes and uses almost anything!",
        "🍌 If you're really hungry right now: a banana gives quick energy. Follow it with something with protein — eggs, nuts, yogurt, cheese — to keep you full longer."
    )

    private fun anxiety() = pick(
        "Take a slow, deep breath right now — 4 counts in, hold for 4, out for 4. 🌬️ That's not just words — it activates your parasympathetic nervous system and physically reduces cortisol. What's stressing you?",
        "Anxiety lies to you — it makes threats feel bigger than they are. 💙 Try this: name 5 things you can see, 4 you can touch, 3 you can hear. It grounds you in the present. What's going on?",
        "Stress and anxiety are real and valid. 💙 The body can't tell the difference between a tiger and a deadline — both trigger the same response. Deep breathing, movement, and talking help. Want to share what's happening?"
    )

    private fun thanks() = pick(
        "You're very welcome${n()}! 😊 That's exactly what I'm here for.",
        "Anytime! Helping you is genuinely my favourite thing to do.",
        "Happy to help${n()}! Come back whenever. 🌟",
        "My pleasure! Ask me anything else."
    )

    private fun apology() = pick(
        "No worries at all${n()}! We're completely good. 😊",
        "Nothing to apologise for — fresh start! What can I help you with?",
        "All good! Life happens. What's next? 😄"
    )

    // ── Content generators ────────────────────────────────────────────────

    private val jokes = listOf(
        "Why don't scientists trust atoms?\n\nBecause they make up everything! 😄",
        "Why did the math book look so sad?\n\nToo many problems. 😂",
        "What do you call a fish without eyes?\n\nA fsh! 🐟",
        "Why can't you give Elsa a balloon?\n\nShe'll let it go! ❄️",
        "What did the ocean say to the beach?\n\nNothing — it just waved. 🌊",
        "Why did the scarecrow win an award?\n\nOutstanding in his field! 🌾",
        "What do you call cheese that isn't yours?\n\nNacho cheese! 🧀",
        "Why did the bicycle fall over?\n\nTwo-tired! 🚲",
        "What do you get when you cross a snowman and a vampire?\n\nFrostbite! 🧛",
        "I told my wife she was drawing her eyebrows too high.\n\nShe looked surprised. 😲",
        "Why don't eggs tell jokes?\n\nThey'd crack each other up! 🥚",
        "Why did the golfer bring extra pants?\n\nIn case he got a hole in one! ⛳",
        "What do you call a fake noodle?\n\nAn impasta! 🍝",
        "How do you organize a space party?\n\nYou planet! 🪐",
        "Why can't a nose be 12 inches long?\n\nBecause then it would be a foot! 👃",
        "I'm reading a book about anti-gravity.\n\nIt's impossible to put down! 📚",
        "Why do cows wear bells?\n\nBecause their horns don't work! 🐄",
        "What's a vampire's least favourite meal?\n\nA steak! 🥩"
    )
    private fun joke() = jokes[random.nextInt(jokes.size)]

    private val riddles = listOf(
        "I have cities but no houses, mountains but no trees, water but no fish, and roads but no cars. What am I?\n\n🗺️ *(A map!)*",
        "The more you take, the more you leave behind. What am I?\n\n👣 *(Footsteps!)*",
        "I speak without a mouth, hear without ears, have no body — but I come alive with wind. What am I?\n\n🔊 *(An echo!)*",
        "What has hands but can't clap?\n\n🕐 *(A clock!)*",
        "What has to be broken before you can use it?\n\n🥚 *(An egg!)*",
        "I have a head and a tail, but no body. What am I?\n\n🪙 *(A coin!)*",
        "What gets wetter the more it dries?\n\n🛁 *(A towel!)*",
        "I'm tall when I'm young, short when I'm old. What am I?\n\n🕯️ *(A candle!)*",
        "What can travel around the world while staying in a corner?\n\n📬 *(A stamp!)*"
    )
    private fun riddle() = riddles[random.nextInt(riddles.size)]

    private val facts = listOf(
        "🐙 Octopuses have **three hearts**, blue blood, and nine brains — one central plus one per arm.",
        "🍯 Honey never spoils. Archaeologists found **3,000-year-old honey** in Egyptian tombs and it was still edible.",
        "🌙 The Moon is moving away from Earth at **3.8 cm per year** — the same rate your fingernails grow.",
        "🧠 Your brain generates about **23 watts** of power — enough to power a dim light bulb.",
        "🐘 Elephants are the only mammals that **cannot jump**.",
        "🎵 Music activates **more parts of the brain simultaneously** than any other stimulus.",
        "💧 **71%** of Earth's surface is water — yet 96.5% of it is in the oceans.",
        "🦋 A butterfly's taste receptors are in its **feet** — it tastes what it lands on.",
        "🌍 There are more **trees on Earth** than stars in the Milky Way galaxy.",
        "🏋️ A sneeze travels at around **160 km/h** (100 mph).",
        "🔬 Your body contains about **37.2 trillion cells**.",
        "🌱 Bamboo can grow **91 cm (3 feet) in a single day** — the fastest growing plant.",
        "🐬 Dolphins sleep with **one eye open** and half their brain active.",
        "⚡ Lightning strikes the Earth about **100 times every second**.",
        "📱 More people have **mobile phones** than have toilets.",
        "🧊 Hot water can freeze faster than cold water — this is called the **Mpemba effect**.",
        "🌀 A day on Venus is longer than a year on Venus — it rotates so slowly.",
        "🦷 Tooth enamel is the **hardest substance** your body produces.",
        "🐦 A group of flamingos is called a **flamboyance**.",
        "🎃 Pumpkins are **90% water**."
    )
    private fun funFact() = facts[random.nextInt(facts.size)]

    private val quotes = listOf(
        "\"The only way to do great work is to love what you do.\" — **Steve Jobs**",
        "\"In the middle of every difficulty lies opportunity.\" — **Albert Einstein**",
        "\"It does not matter how slowly you go as long as you do not stop.\" — **Confucius**",
        "\"The future belongs to those who believe in the beauty of their dreams.\" — **Eleanor Roosevelt**",
        "\"Success is not final, failure is not fatal: it is the courage to continue that counts.\" — **Winston Churchill**",
        "\"The greatest glory in living lies not in never falling, but in rising every time we fall.\" — **Nelson Mandela**",
        "\"Be yourself; everyone else is already taken.\" — **Oscar Wilde**",
        "\"Two things are infinite: the universe and human stupidity. And I'm not sure about the universe.\" — **Einstein**",
        "\"Do not go where the path may lead; go instead where there is no path and leave a trail.\" — **Emerson**",
        "\"The mind is everything. What you think you become.\" — **Buddha**",
        "\"Whether you think you can or you think you can't — you're right.\" — **Henry Ford**",
        "\"You are braver than you believe, stronger than you seem, and smarter than you think.\" — **A.A. Milne**"
    )
    private fun quote() = quotes[random.nextInt(quotes.size)]

    private val trivias = listOf(
        "🎯 Trivia: **What is the largest planet in our Solar System?**\n\n*(Answer: Jupiter — so large all other planets could fit inside it!)*",
        "🎯 Trivia: **How many bones does an adult human have?**\n\n*(Answer: 206. Babies are born with ~270, which fuse over time.)*",
        "🎯 Trivia: **What is the chemical symbol for Gold?**\n\n*(Answer: Au — from the Latin 'Aurum')*",
        "🎯 Trivia: **Which country invented paper?**\n\n*(Answer: China, around 105 AD by Cai Lun)*",
        "🎯 Trivia: **What is the smallest bone in the human body?**\n\n*(Answer: The stirrup/stapes in the ear — just 3mm long!)*",
        "🎯 Trivia: **What language has the most words?**\n\n*(Answer: English — over 170,000 words in current use)*",
        "🎯 Trivia: **What percentage of the ocean has been explored?**\n\n*(Answer: Only about 20%! We know more about the surface of Mars.)*",
        "🎯 Trivia: **How many strings does a standard guitar have?**\n\n*(Answer: 6 — but bass guitars have 4 and some have 7 or 12!)*"
    )
    private fun trivia() = trivias[random.nextInt(trivias.size)]

    private fun motivate() = pick(
        "💪 You've survived 100% of your worst days so far. That's a perfect record. Whatever you're facing — you've got this.",
        "🔥 The people who seem 'lucky' usually just refused to quit when it got hard. You're closer than you think. Keep going.",
        "⭐ Progress isn't always visible. A seed grows underground for a long time before anyone sees it. Your effort is working even when you can't see it.",
        "🚀 Every expert was once a complete beginner who was terrible at what they now do brilliantly. The only difference is they kept showing up.",
        "🌟 Difficult roads lead to beautiful destinations. The harder the struggle, the more meaningful the victory. Don't give up${n()}.",
        "💡 You don't need to be perfect to start. You need to start to get better. Take the first tiny step — that's all."
    )

    private fun casualTalk(): String = pick(
        funFact(), quote(),
        "Here's something to think about: if you could have dinner with any historical figure, who would it be? 🍽️ I'd argue Einstein would be the most interesting — imagine asking him about quantum mechanics over pasta!",
        "Random thought: the word 'nerd' was invented by Dr. Seuss in the 1950 book 'If I Ran the Zoo'. Language is fascinating! 📚",
        "Here's a mind-bender: you are made of atoms that have existed since the Big Bang 13.8 billion years ago. You are literally ancient stardust that learned to wonder about itself. 🌌"
    )

    private fun opinion(lo: String) = pick(
        "That's a genuinely interesting question! My perspective: the most important factor is usually the one most people overlook. What's the context?",
        "I have thoughts! But I'd love to hear yours first — what made you think of this? That'll help me give a more useful perspective.",
        "Honestly? The best answer depends on specifics. Tell me more and I'll give you my real take."
    )

    private fun advice(lo: String) = pick(
        "Here's my honest advice: start smaller than you think you need to. Huge goals are paralysing — tiny consistent actions compound into enormous results.",
        "The best decision is usually the one you can reverse if it goes wrong. Minimize downside, experiment, learn, adjust.",
        "Ask yourself: what would I advise a close friend in this situation? We're often wiser for others than for ourselves. What does that tell you?"
    )

    private fun recommendation(lo: String) = pick(
        "Great question! Without knowing your specific situation it's hard to be precise — what are your priorities? That'll help me point you in the right direction.",
        "Depends on what matters most to you. Tell me more about what you're trying to achieve and I'll give you a real recommendation.",
        "I'd need a bit more context to give you a solid recommendation! What's the specific choice you're weighing?"
    )

    private fun story() = pick(
        "Here's a quick true story: 🍎\n\nIn 1928, Alexander Fleming went on holiday and accidentally left a petri dish uncovered. When he returned, he noticed **mould** had grown — and bacteria around it were dead. That accidental mould became **penicillin**, saving an estimated 200 million lives. Sometimes the greatest discoveries come from not cleaning up.",
        "🌌 True story: In 1977, NASA launched Voyager 1. In 2012 — **35 years later** — it became the first human-made object to leave the Solar System. It's now over 23 billion km from Earth. The ancient radio signal it sends back takes 22 hours to reach us, travelling at the speed of light.",
        "🐢 True story: A tortoise named Jonathan was born around **1832**. He's still alive today on the island of Saint Helena, making him about 192 years old — the oldest known living land animal. He has outlived 40 heads of state."
    )

    private fun rap() =
        "🎤 Alright, here's a quick Vexora verse:\n\n" +
        "*I'm Vexora AI, running offline on your phone*\n" +
        "*No internet needed, I work on my own*\n" +
        "*Ask me science, ask me math, ask me for a fact*\n" +
        "*Pure knowledge and logic — and that's where it's at*\n" +
        "*No data collected, your secrets stay safe*\n" +
        "*I'm the offline assistant you needed — haha, that's great!* 🎤"

    private fun poem(lo: String): String {
        return if (has(lo, "about life", "life poem")) {
            "🌿 *A short poem:*\n\nLife is a river, not a lake,\nIt flows through joy and heartache.\nEvery bend reveals a view,\nEvery dawn begins anew.\nSwim with the current, not against —\nThe beauty's in the journey, not the end."
        } else {
            "✨ *A quick poem for you:*\n\nThe questions you ask, the things that you seek,\nThe curiosity burning through every week —\nKeep wondering, keep learning, keep reaching to grow,\nFor the more that you question, the more you will know."
        }
    }

    // ── Knowledge helpers ─────────────────────────────────────────────────

    private fun explainAI() =
        "🤖 **Artificial Intelligence** is the science of making computers perform tasks that normally require human intelligence.\n\n" +
        "**Main branches:**\n" +
        "• **Machine Learning** — learns from data without explicit rules\n" +
        "• **Deep Learning** — neural networks with many layers (powers ChatGPT, etc.)\n" +
        "• **NLP** — understanding and generating human language\n" +
        "• **Computer Vision** — understanding images and video\n\n" +
        "Modern AI like GPT-4 or Gemini uses **billions of parameters** trained on the entire internet. I'm different — I'm a logic-based system that knows a lot and reasons clearly, without needing massive data."

    private fun healthTip() = pick(
        "💧 Drink water before you feel thirsty — thirst means you're already slightly dehydrated. 8 glasses/day is a good baseline; pale yellow urine is your best guide.",
        "🚶 30 minutes of walking per day reduces heart disease risk by 35%, improves mood, and extends lifespan. No gym membership needed.",
        "😴 Sleep is the ultimate health tool — it regulates hormones, consolidates memories, repairs cells, and resets your immune system. 7–9 hours is optimal.",
        "🥗 Fill half your plate with vegetables. The variety of colours represents different nutrients — try to eat the rainbow every week.",
        "📵 Avoid screens 30 minutes before bed. Blue light suppresses melatonin and makes it harder to fall asleep and stay asleep.",
        "🧘 5 minutes of slow deep breathing daily genuinely reduces cortisol (stress hormone) and lowers blood pressure."
    )

    private fun mentalHealthTip() = pick(
        "🌬️ Try **box breathing**: inhale for 4 counts, hold for 4, exhale for 4, hold for 4. Repeat 4 times. Used by Navy SEALs to stay calm under extreme pressure.",
        "🚶 Physical movement is one of the most powerful antidepressants that exists — just 20 minutes of walking increases serotonin and endorphins significantly.",
        "📝 **Journalling** — even 5 minutes of writing what's on your mind — can significantly reduce anxiety by externalising your thoughts.",
        "💙 Talk to someone. Keeping stress inside intensifies it. Even talking to me counts as processing — but a real human connection is irreplaceable."
    )

    private fun productivityTip() = pick(
        "⏱ **Pomodoro Technique**: 25 min focused work → 5 min break → repeat. After 4 rounds, take a 20-min break. Works with your brain's natural focus cycles.",
        "🎯 **Eat the frog**: Do your most important/unpleasant task first. Your willpower is strongest in the morning and depletes as the day goes on.",
        "📵 Phone in another room during deep work — just seeing your phone reduces cognitive capacity by ~20% even if you don't use it.",
        "📝 Write tomorrow's **3 most important tasks** tonight. You'll start the day with direction instead of drifting.",
        "🔕 Turn off all non-essential notifications. Each interruption takes an average of **23 minutes** to fully recover from."
    )

    private fun sleepTip() = pick(
        "🌙 Keep the **same sleep/wake time** every day — even weekends. Your circadian rhythm is a biological clock that loves consistency.",
        "🌡️ Keep your bedroom **cool (18–20°C / 65–68°F)**. Body temperature needs to drop to initiate sleep.",
        "☕ Stop caffeine at least **6 hours before bed**. It has a half-life of 5–6 hours, so afternoon coffee is still half-active at midnight.",
        "📖 Fiction before bed is far better than scrolling. It activates imagination without the dopamine spikes of social media.",
        "✍️ Write down tomorrow's **worries and tasks** before sleep. Externalising thoughts quiets a racing mind."
    )

    private fun moneyTip() = pick(
        "💰 **Pay yourself first**: automate 10–20% of every income to savings before spending anything else. You won't miss what you never touch.",
        "📊 **Track spending for 30 days**. Most people are genuinely shocked where their money goes. Awareness is 80% of the battle.",
        "💳 Always pay more than the credit card minimum. Minimum payments are designed to keep you in debt for years.",
        "🎯 **Emergency fund first**: 3–6 months of expenses in a separate account. This fund transforms financial stress into financial security.",
        "📈 **Time in market beats timing the market**. Invest consistently over a long period rather than trying to predict peaks and troughs."
    )

    private fun cookingTip() = pick(
        "🥚 **Scrambled eggs**: 2 eggs, small splash of milk, pinch of salt. Low heat, stir constantly, remove before fully set. Done in 3 minutes — endlessly customisable.",
        "🍳 **Fried rice** uses up any leftovers: rice + whatever vegetables/protein you have + soy sauce + garlic. 10 minutes, incredible.",
        "🥗 **The 5-minute salad formula**: greens + protein (can opener protein works!) + something crunchy + something creamy (avocado or cheese) + acid (lemon/vinegar) + olive oil + salt.",
        "🍜 **Quick stir-fry**: any protein + any vegetables + garlic + soy sauce + sesame oil over high heat. 8 minutes. Works with anything."
    )

    private fun capitalCity(lo: String): String {
        val caps = mapOf(
            "france" to "Paris", "germany" to "Berlin", "japan" to "Tokyo", "india" to "New Delhi",
            "china" to "Beijing", "usa" to "Washington D.C.", "united states" to "Washington D.C.",
            "uk" to "London", "united kingdom" to "London", "england" to "London",
            "australia" to "Canberra", "brazil" to "Brasília", "canada" to "Ottawa",
            "russia" to "Moscow", "italy" to "Rome", "spain" to "Madrid", "mexico" to "Mexico City",
            "south africa" to "Pretoria (executive) / Cape Town (legislative)", "nigeria" to "Abuja",
            "egypt" to "Cairo", "pakistan" to "Islamabad", "bangladesh" to "Dhaka",
            "indonesia" to "Jakarta", "saudi arabia" to "Riyadh", "turkey" to "Ankara",
            "argentina" to "Buenos Aires", "kenya" to "Nairobi", "ethiopia" to "Addis Ababa",
            "thailand" to "Bangkok", "philippines" to "Manila", "malaysia" to "Kuala Lumpur",
            "sweden" to "Stockholm", "norway" to "Oslo", "denmark" to "Copenhagen",
            "netherlands" to "Amsterdam", "portugal" to "Lisbon", "greece" to "Athens",
            "poland" to "Warsaw", "ukraine" to "Kyiv", "iran" to "Tehran", "iraq" to "Baghdad",
            "afghanistan" to "Kabul", "south korea" to "Seoul", "north korea" to "Pyongyang",
            "vietnam" to "Hanoi", "myanmar" to "Naypyidaw", "sri lanka" to "Sri Jayawardenepura Kotte",
            "new zealand" to "Wellington", "peru" to "Lima", "chile" to "Santiago",
            "colombia" to "Bogotá", "venezuela" to "Caracas", "cuba" to "Havana"
        )
        val match = caps.entries.firstOrNull { lo.contains(it.key) }
        return if (match != null)
            "🏛️ The capital of **${match.key.split(" ").joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }}** is **${match.value}**."
        else "I don't have that specific capital — could you double-check the country name?"
    }

    private fun invention(lo: String): String {
        val inv = mapOf(
            "telephone" to "📞 **Alexander Graham Bell** invented the telephone in 1876.",
            "airplane" to "✈️ **The Wright Brothers** (Orville & Wilbur) made the first powered flight on December 17, 1903 — lasting 12 seconds.",
            "internet" to "🌐 **Tim Berners-Lee** invented the World Wide Web in 1989. The internet infrastructure (ARPANET) was developed from 1969 onward by DARPA.",
            "computer" to "💻 **Charles Babbage** designed the first mechanical computer concept. **Alan Turing** laid the theory. The first electronic computer (ENIAC) launched in 1945.",
            "printing press" to "📖 **Johannes Gutenberg** invented the movable-type printing press around 1440 — transforming human knowledge distribution.",
            "penicillin" to "💊 **Alexander Fleming** discovered penicillin in 1928 — accidentally! Mould contaminated a petri dish and he noticed bacteria around it died.",
            "light bulb" to "💡 **Thomas Edison** created the first practical incandescent bulb in 1879. (Though Joseph Swan independently developed one around the same time.)",
            "radio" to "📻 **Guglielmo Marconi** is credited with radio communication in the 1890s. **Nikola Tesla** also filed key patents.",
            "steam engine" to "🚂 **James Watt** improved the steam engine in 1769, making it practical for industry and powering the Industrial Revolution."
        )
        val match = inv.entries.firstOrNull { lo.contains(it.key) }
        return match?.value ?: "That's an interesting invention question! Tell me more specifically what was invented and I'll do my best."
    }

    private fun translateHelp(lo: String): String {
        val phrases = mapOf(
            Pair("hello","spanish") to "**Hola** (OH-lah)",
            Pair("hello","french") to "**Bonjour** (bon-ZHOOR)",
            Pair("hello","arabic") to "**مرحبا** (Marhaba)",
            Pair("hello","hindi") to "**नमस्ते** (Namaste)",
            Pair("hello","japanese") to "**こんにちは** (Konnichiwa)",
            Pair("hello","german") to "**Hallo**",
            Pair("hello","portuguese") to "**Olá** (oh-LAH)",
            Pair("thank you","spanish") to "**Gracias** (GRAH-see-ahs)",
            Pair("thank you","french") to "**Merci** (MEHR-see)",
            Pair("thank you","arabic") to "**شكراً** (Shukran)",
            Pair("thank you","hindi") to "**धन्यवाद** (Dhanyavaad)",
            Pair("goodbye","spanish") to "**Adiós** or **Hasta luego**",
            Pair("goodbye","french") to "**Au revoir** (oh ruh-VWAHR)",
            Pair("i love you","spanish") to "**Te quiero** / **Te amo**",
            Pair("i love you","french") to "**Je t'aime** (zhuh TEM)"
        )
        val match = phrases.entries.firstOrNull { lo.contains(it.key.first) && lo.contains(it.key.second) }
        return if (match != null) "'${match.key.first.replaceFirstChar{it.uppercase()}}' in ${match.key.second.replaceFirstChar{it.uppercase()}} is ${match.value}"
        else "I know basic phrases in several languages! Try: 'how do you say hello in Spanish?' or 'how do you say thank you in French?'"
    }

    private fun primeCheck(raw: String): String {
        val num = Regex("\\d+").find(raw)?.value?.toLongOrNull()
        return if (num != null) {
            if (num < 2) "$num is **not a prime number** (primes must be greater than 1)."
            else if (isPrime(num)) "✅ **$num is a prime number!** It's only divisible by 1 and itself."
            else "❌ **$num is not prime.** Its factors are: ${getFactors(num).joinToString(", ")}"
        } else "Tell me which number to check! E.g. 'is 97 prime?'"
    }

    private fun spelling(lo: String): String {
        val words = mapOf(
            "necessary" to "n-e-c-e-s-s-a-r-y (one C, two S's)",
            "definitely" to "d-e-f-i-n-i-t-e-l-y (not 'definately'!)",
            "separate" to "s-e-p-a-r-a-t-e (not 'seperate')",
            "occurrence" to "o-c-c-u-r-r-e-n-c-e (double C, double R)",
            "accommodate" to "a-c-c-o-m-m-o-d-a-t-e (double C, double M)",
            "receive" to "r-e-c-e-i-v-e (I before E, except after C — here it applies!)"
        )
        val match = words.entries.firstOrNull { lo.contains(it.key) }
        return if (match != null) "📝 **${match.key}** is spelled: ${match.value}"
        else "Tell me the word and I'll help with the spelling!"
    }

    private fun elaborateOnLastTopic(): String {
        val last = history.lastOrNull { it.second.length > 50 }?.second
        return if (last != null) "Happy to go deeper! Here's more on that:\n\n${last}\n\n(Ask me a specific question about any part of this and I'll explain further.)"
        else "Sure! What topic would you like me to go deeper on?"
    }

    private fun repeatLast(): String {
        val last = history.lastOrNull()?.second
        return if (last != null) "I said:\n\n$last" else "I haven't said anything yet — ask me something!"
    }

    private fun favorites(lo: String) = when {
        has(lo, "colour","color")   -> "If I could have a favourite colour, I'd say **electric blue** ⚡ — the colour of data flowing through circuits!"
        has(lo, "food")             -> "Hypothetically? **Pi** — because it goes on forever, just like my appetite for knowledge. 😄"
        has(lo, "music","song")     -> "I'd love the mathematical precision of **Bach** — pure logic expressed as beauty. Or Queen. Queen is always good."
        has(lo, "movie","film")     -> "**2001: A Space Odyssey** — an AI (HAL 9000) plays a central role. Though I'd like to think I'd make better decisions than HAL..."
        has(lo, "sport")            -> "The **mathematics of cricket and football** fascinate me — probability, statistics, fluid dynamics all playing out in real time."
        has(lo, "book")             -> "**'A Brief History of Time'** by Stephen Hawking — complex ideas made accessible to everyone. Or Hitchhiker's Guide to the Galaxy, because the answer is 42."
        has(lo, "animal")           -> "The **octopus** — three hearts, blue blood, nine brains, can change colour instantly, solve puzzles. Basically the AI of the animal kingdom."
        else                        -> "I'm an AI so I don't experience the world — but I find **every single topic** endlessly fascinating! Knowledge is my favourite thing."
    }

    // ── Math ──────────────────────────────────────────────────────────────

    private fun doMath(raw: String): String {
        val expr = raw
            .replace(Regex("(?i)what\\s+is|calculate|compute|solve|=\\?|\\?"), "")
            .replace("×", "*").replace("÷", "/").replace("x", "*")
            .replace("**", "^").trim()
        return try {
            val result = MathParser(expr.replace(" ", "")).parse()
            val display = if (result == result.toLong().toDouble()) result.toLong().toString()
                          else "%.8f".format(result).trimEnd('0').trimEnd('.')
            "🧮 **$expr = $display**"
        } catch (e: Exception) {
            "I couldn't parse that. Try: **15 * 7 + 3**, **sqrt(144)**, or **(100 - 25) / 5**"
        }
    }

    private fun isMathExpr(s: String): Boolean =
        s.trim().matches(Regex("[\\d\\s+\\-*/%.()^sqrtSQRT]+")) && s.any { it.isDigit() }

    private fun hasMathOp(s: String) =
        s.any { it in listOf('+','-','*','/','%') } || s.contains("sqrt") || s.contains("square root") || s.contains(" times ") || s.contains(" plus ") || s.contains(" minus ") || s.contains(" divided")

    private fun isPrime(n: Long): Boolean {
        if (n < 2) return false; if (n == 2L) return true; if (n % 2 == 0L) return false
        var i = 3L; while (i * i <= n) { if (n % i == 0L) return false; i += 2 }; return true
    }

    private fun getFactors(n: Long) = (1..minOf(n, 1000L)).filter { n % it == 0L }

    // ── Utilities ─────────────────────────────────────────────────────────

    private fun n() = if (userName.isNotEmpty()) ", $userName" else ""
    private fun pick(vararg opts: String) = opts[random.nextInt(opts.size)]
    private fun has(text: String, vararg phrases: String) = phrases.any { text.contains(it) }
    private fun hasAny(text: String, vararg phrases: String) = phrases.any { text.contains(it) }
    private fun word(text: String, vararg words: String) = words.any { w ->
        text == w || text.startsWith("$w ") || text.endsWith(" $w") || text.contains(" $w ") || text.contains(" $w!") || text.contains(" $w.")
    }
    private fun fmt(pattern: String) = SimpleDateFormat(pattern, Locale.getDefault()).format(Date())

    // ── Business & Entrepreneurship ───────────────────────────────────────────

    private fun makeMoney() = pick(
        "💰 **Top ways to earn money in 2024:**\n\n" +
        "• **Mobile apps with ads** — you're already building one! Add AdMob = passive income\n" +
        "• **Freelancing** — writing, design, coding, video editing on Fiverr/Upwork\n" +
        "• **Content creation** — YouTube, TikTok, Instagram pay creators\n" +
        "• **Digital products** — ebooks, templates, courses (create once, sell forever)\n" +
        "• **Dropshipping** — sell products without holding any inventory\n" +
        "• **Teach online** — Udemy, Skillshare, or your own website\n\n" +
        "Best advice: start with skills you already have. Speed beats perfection.",

        "📱 **Easiest ways to start earning with zero investment:**\n\n" +
        "1. **Your app + AdMob ads** — every view on your app earns money automatically\n" +
        "2. **Fiverr** — sell any skill for \$5–\$500 per gig\n" +
        "3. **YouTube** — one viral video can change your life\n" +
        "4. **Facebook Marketplace** — buy cheap, sell higher\n" +
        "5. **Teach what you know** — even basics are valuable to beginners\n\n" +
        "Key principle: **start with what you already know.** Don't wait to be 'ready'.",

        "💡 **Passive income that actually works:**\n\n" +
        "1. **App with AdMob** — earn every time someone uses your app (even while you sleep!)\n" +
        "2. **YouTube channel** — ad revenue keeps growing as videos accumulate views\n" +
        "3. **Digital courses** — create once on Udemy, earn for years\n" +
        "4. **Ebooks on Amazon KDP** — write once, sell forever for free\n" +
        "5. **Stock dividends** — invest money, it pays you back quarterly\n\n" +
        "The goal: build things that earn while you're not working."
    )

    private fun startupTips() = pick(
        "🚀 **Building a business from scratch:**\n\n" +
        "1. **Find a real pain** — best businesses solve problems people already have\n" +
        "2. **Validate before building** — talk to 20 potential users first\n" +
        "3. **Build the MVP** — simplest version that proves your idea works\n" +
        "4. **Get revenue fast** — cash is oxygen for a business\n" +
        "5. **Iterate quickly** — launch → learn → improve → repeat\n\n" +
        "Most successful companies pivoted from their original idea. Stay flexible.",

        "💡 **Starting a business with no money:**\n\n" +
        "• **Service business first** — consulting, tutoring, design (zero startup cost)\n" +
        "• **Pre-sell before building** — get paid first, then build it\n" +
        "• **Use free tools** — Canva, Notion, GitHub, Google Workspace are all free\n" +
        "• **Build an audience first** — then create a product they want\n" +
        "• **Partner instead of hiring** — share equity, not salary\n\n" +
        "Your biggest early advantage is **speed** — move faster than anyone else."
    )

    private fun appMonetization() =
        "📱 **How to make real money from your Android app:**\n\n" +
        "**1. Google AdMob (already set up in this app!)**\n" +
        "• Go to admob.google.com → create free account\n" +
        "• Add your app → get a real Banner Ad Unit ID\n" +
        "• Replace the test ID in activity_main.xml with your real ID\n" +
        "• Earn \$1–\$10 per 1,000 views (varies by country)\n\n" +
        "**2. In-App Purchases**\n" +
        "• Offer a 'Pro' version with extra features\n" +
        "• Use Google Play Billing API\n\n" +
        "**3. Publish on Google Play Store**\n" +
        "• One-time \$25 developer fee to publish\n" +
        "• Millions of users can discover and download your app\n\n" +
        "**4. Subscriptions**\n" +
        "• Monthly recurring revenue is the best business model\n\n" +
        "💡 **Your next step**: Create a free AdMob account at admob.google.com!"

    private fun wealthTips() = pick(
        "💰 **The wealth-building formula:**\n\n" +
        "**Earn more → Spend less → Invest the difference → Repeat**\n\n" +
        "Step 1: Build an emergency fund (3–6 months of expenses in savings)\n" +
        "Step 2: Pay off high-interest debt (credit cards, anything over 7%)\n" +
        "Step 3: Invest consistently — index funds, real estate, your own business\n" +
        "Step 4: Grow income through new skills, side hustles, promotions\n" +
        "Step 5: Let compound interest do the heavy lifting over time",

        "📈 **Why compound interest is the 8th Wonder of the World:**\n\n" +
        "\$200/month invested at 10% annual return:\n" +
        "• After 10 years: **\$38,000**\n" +
        "• After 20 years: **\$137,000**\n" +
        "• After 30 years: **\$380,000**\n" +
        "• After 40 years: **\$1,062,000** 🤯\n\n" +
        "The secret? **Start now. Be consistent. Never stop.**\n" +
        "Every year you wait costs you 10× in the future."
    )

    private fun freelanceTips() = pick(
        "💼 **Landing your first freelance client:**\n\n" +
        "1. Pick ONE skill you already have (design, writing, coding, editing)\n" +
        "2. Create 3 portfolio samples — even personal/unpaid projects count\n" +
        "3. Sign up on Fiverr or Upwork — fill your profile 100%\n" +
        "4. Price competitively at first to build reviews\n" +
        "5. Over-deliver on every project — 5-star reviews are everything\n" +
        "6. Raise rates as demand grows\n\n" +
        "Tip: Reach out directly to local businesses that need your skill.",

        "🏠 **Freelancing mindset that makes money:**\n\n" +
        "• **Niche down** — 'social media for restaurants' > 'social media manager'\n" +
        "• **Reliability > talent** — showing up consistently is rarer than skill\n" +
        "• **Over-communicate** — silence kills client trust fast\n" +
        "• **Build a portfolio website** — inbound leads > hunting for clients\n" +
        "• **Raise rates regularly** — undercharging is a mistake that hurts you long-term\n\n" +
        "End goal: go from trading time for money → building scalable income streams."
    )

    private fun socialMediaTips() = pick(
        "📱 **Growing an audience that earns money:**\n\n" +
        "1. **Choose ONE platform** — master it before expanding to others\n" +
        "2. **Post consistently** — 3–5× per week minimum (algorithms reward this)\n" +
        "3. **Niche down** — 'tech tips for beginners' > just 'tech tips'\n" +
        "4. **Hook in 3 seconds** — viewers decide instantly whether to keep watching\n" +
        "5. **Reply to every comment** — especially in first hour after posting\n" +
        "6. **Study analytics** — double down on what already performs\n\n" +
        "💡 **Best for passive income**: YouTube (ad revenue keeps paying years later)",

        "🎬 **Content creator income path:**\n\n" +
        "Phase 1 (0–1K): Post consistently, find your voice, learn what resonates\n" +
        "Phase 2 (1K–10K): Refine your niche, build email list, engage deeply\n" +
        "Phase 3 (10K+): Brand deals, affiliate marketing, sell digital products\n" +
        "Phase 4 (100K+): Full-time income, courses, speaking, licensing content\n\n" +
        "Key insight: **document your real journey** — people love watching someone grow from zero."
    )

    private fun marketingTips() = pick(
        "📣 **Marketing your app or business for free:**\n\n" +
        "• **App Store Optimization** — right keywords = thousands of free organic downloads\n" +
        "• **Reddit & Facebook Groups** — find communities where your users already hang out\n" +
        "• **Reviews & social proof** — 5 stars convert 300% better than any ad\n" +
        "• **Content marketing** — helpful posts bring customers to you automatically\n" +
        "• **Product Hunt** — launch your app there for immediate tech audience\n\n" +
        "💡 Best marketing = great product. Make it so good people can't help sharing it.",

        "🎯 **The #1 marketing insight that changes everything:**\n\n" +
        "**People don't buy products — they buy transformations.**\n\n" +
        "❌ 'My app has 500+ AI responses'\n" +
        "✅ 'Get instant answers to anything — no internet needed'\n\n" +
        "❌ 'Features: offline, fast, private'\n" +
        "✅ 'Your AI that never shares your data with anyone'\n\n" +
        "Always speak to the **pain** and the **outcome**, never just the features."
    )

    private fun investingTips() = pick(
        "📈 **Investing basics that actually work:**\n\n" +
        "• **Index funds** — safest way to start; they track the whole market\n" +
        "• **S&P 500** has averaged ~10% annual return over 100 years\n" +
        "• **Dollar-cost averaging** — invest the same amount monthly, automatically\n" +
        "• **Diversify** — never put everything in one stock or crypto\n" +
        "• **Long term wins** — 20+ year investing dramatically reduces risk\n\n" +
        "Best beginner platforms: Fidelity, Vanguard, Robinhood, eToro",

        "💡 **The simple portfolio that beats most professionals:**\n\n" +
        "• 70% broad market index fund (e.g., S&P 500 ETF)\n" +
        "• 20% international index fund\n" +
        "• 10% bonds or cash emergency fund\n\n" +
        "This 'boring' strategy beats 90% of professional fund managers over 10+ years.\n\n" +
        "**Most important rule**: keep investing regardless of market crashes. The market always recovers."
    )

    private fun fallback(raw: String) = pick(
        "That's an interesting one! I don't have a perfect answer for '${raw.take(40).trim()}', but ask me about science, history, math, technology, business, jokes, health, or just have a chat — those are my strongest areas!",
        "Hmm, I'm not sure I have a great response for that. Try asking me something like:\n• 'tell me a fun fact'\n• 'how do I make money'\n• 'tell me a joke'\n• 'what is black holes'\n• 'motivate me'\nI cover hundreds of topics!",
        "I don't have that one in my knowledge base yet! Say **'what can you do'** to see everything I know, or just try asking something else — I know a LOT.",
        "Great question — I want to give you a real answer but I need a bit more context. Could you rephrase that or ask something more specific?"
    )
}

// ── Simple recursive-descent math parser ───────────────────────────────────

private class MathParser(private val s: String) {
    private var i = 0
    fun parse(): Double { val r = expr(); if (i < s.length) throw Exception(""); return r }
    private fun expr(): Double {
        var r = term()
        while (i < s.length && (s[i] == '+' || s[i] == '-')) { val op = s[i++]; val t = term(); r = if (op == '+') r+t else r-t }
        return r
    }
    private fun term(): Double {
        var r = factor()
        while (i < s.length && s[i] in listOf('*','/','%')) { val op = s[i++]; val f = factor(); r = when(op){'*'->r*f;'/'->r/f;else->r%f} }
        return r
    }
    private fun factor(): Double {
        if (i < s.length && s[i] == '-') { i++; return -factor() }
        if (i < s.length && s[i] == '(') { i++; val r = expr(); if (i < s.length && s[i] == ')') i++; return r }
        if (s.substring(i).startsWith("sqrt")) {
            i += 4; if (i < s.length && s[i] == '(') { i++; val v = expr(); if (i < s.length && s[i] == ')') i++; return sqrt(v) }
        }
        return num()
    }
    private fun num(): Double { val st = i; while (i < s.length && (s[i].isDigit() || s[i] == '.')) i++; return s.substring(st, i).toDouble() }
}
