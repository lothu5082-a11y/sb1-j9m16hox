package com.vexora.aiassistant

import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.*

/**
 * VexoraEngine — Vexora's built-in offline AI brain.
 * Pure Kotlin, zero dependencies, zero downloads. Bundled inside the APK.
 */
object VexoraEngine {

    private val random = Random()
    private val conversationHistory = mutableListOf<String>()
    private var userName = ""
    private var messageCount = 0

    // ────────────────────────────────────────────────────────────────────────
    // Public entry point
    // ────────────────────────────────────────────────────────────────────────

    fun respond(input: String): String {
        messageCount++
        val cleaned = input.trim()
        conversationHistory.add("User: $cleaned")

        val reply = route(cleaned)
        conversationHistory.add("Vexora: $reply")
        if (conversationHistory.size > 20) conversationHistory.removeAt(0)
        return reply
    }

    // ────────────────────────────────────────────────────────────────────────
    // Router — decides which handler to use
    // ────────────────────────────────────────────────────────────────────────

    private fun route(input: String): String {
        val low = input.lowercase()

        // Extract name if user introduces themselves
        val nameMatch = Regex("(?:i(?:'m| am| go by)|my name is|call me|they call me) ([a-zA-Z]+)", RegexOption.IGNORE_CASE).find(input)
        if (nameMatch != null) userName = nameMatch.groupValues[1].replaceFirstChar { it.uppercase() }

        return when {
            // Device commands
            containsAny(low, "open camera", "take photo", "take picture", "use camera", "launch camera")
                -> "[ACTION: CAMERA]\nOpening the camera for you!"

            containsAny(low, "open settings", "go to settings", "device settings", "phone settings", "show settings")
                -> "[ACTION: SETTINGS]\nOpening your device settings!"

            // Greetings
            matchesPattern(low, greetingPatterns)   -> greeting()
            matchesPattern(low, farewellPatterns)    -> farewell()
            matchesPattern(low, howAreYouPatterns)   -> howAreYou()

            // Identity
            matchesPattern(low, whoAreYouPatterns)   -> whoAmI()
            matchesPattern(low, capabilityPatterns)  -> capabilities()
            containsAny(low, "your name", "who made you", "who created you", "who built you") -> identity()

            // Math
            isMathExpression(input)                  -> solveMath(input)
            containsAny(low, "calculate", "what is", "compute", "solve") && hasMathOp(low)
                                                     -> solveMath(extractMathFrom(input))

            // Time & Date
            containsAny(low, "what time", "current time", "tell me the time") -> currentTime()
            containsAny(low, "what day", "what date", "today's date", "what year", "what month") -> currentDate()

            // Jokes
            matchesPattern(low, jokePatterns)        -> joke()

            // Motivational
            matchesPattern(low, motivationPatterns)  -> motivate()

            // Fun facts
            matchesPattern(low, factPatterns)        -> funFact()

            // Weather (explain)
            containsAny(low, "weather", "forecast", "temperature outside", "rain today") -> weatherExplain()

            // Health & Fitness
            containsAny(low, "health tip", "fitness tip", "stay healthy", "lose weight", "exercise tip") -> healthTip()

            // Technology
            containsAny(low, "what is ai", "explain ai", "artificial intelligence", "machine learning", "deep learning") -> explainAI()
            containsAny(low, "what is android", "android os", "android system") -> explainAndroid()
            containsAny(low, "what is 5g", "explain 5g", "5g network") -> explain5G()
            containsAny(low, "what is wifi", "how does wifi work") -> explainWifi()
            containsAny(low, "what is bluetooth", "how does bluetooth") -> explainBluetooth()

            // Science
            containsAny(low, "speed of light", "how fast is light") -> "The speed of light in a vacuum is **299,792,458 metres per second** (about 300,000 km/s). It's the universal speed limit — nothing with mass can reach it."
            containsAny(low, "distance to moon", "how far is the moon") -> "The Moon is on average **384,400 km** (238,855 miles) from Earth. It varies because the Moon's orbit is elliptical."
            containsAny(low, "distance to sun", "how far is the sun") -> "The Sun is about **150 million km** (93 million miles) from Earth. Light from the Sun takes about 8 minutes 20 seconds to reach us."
            containsAny(low, "how old is earth", "age of earth") -> "Earth is approximately **4.54 billion years old**, formed from the solar nebula about the same time as the rest of the Solar System."
            containsAny(low, "how old is universe", "age of universe") -> "The universe is approximately **13.8 billion years old**, dating back to the Big Bang."
            containsAny(low, "gravity", "what is gravity", "explain gravity") -> "Gravity is a fundamental force that attracts objects with mass toward each other. Earth's gravity accelerates objects at **9.8 m/s²**. Einstein described it as a curvature of spacetime caused by mass."
            containsAny(low, "dna", "what is dna") -> "DNA (Deoxyribonucleic Acid) is the molecule that carries the genetic instructions for the growth, development, and reproduction of all living organisms. It's shaped like a double helix and contains 4 bases: Adenine, Thymine, Guanine, Cytosine."

            // Geography
            containsAny(low, "capital of", "what is the capital") -> capitalCity(input)
            containsAny(low, "largest country", "biggest country") -> "Russia is the largest country by area at **17.1 million km²**, covering about 11% of Earth's land mass."
            containsAny(low, "smallest country", "tiny country") -> "Vatican City is the smallest country in the world at just **0.44 km²**, located within Rome, Italy."
            containsAny(low, "tallest mountain", "highest mountain", "mount everest") -> "Mount Everest is Earth's highest mountain above sea level at **8,848.86 metres** (29,031.7 ft) above sea level, located in the Himalayas on the Nepal–Tibet border."
            containsAny(low, "longest river", "nile", "amazon river") -> "The Nile is traditionally considered the longest river at **6,650 km**, though some measurements put the Amazon slightly longer. The Amazon carries by far the most water."
            containsAny(low, "deepest ocean", "mariana trench") -> "The Mariana Trench in the Pacific Ocean is the deepest point on Earth at **10,994 metres** (36,089 ft) below sea level."

            // History
            containsAny(low, "world war", "ww1", "ww2", "first world war", "second world war") -> worldWar(low)
            containsAny(low, "who invented", "who discovered", "who created") -> invention(input)

            // Language
            containsAny(low, "translate", "how do you say", "what does") && containsAny(low, "mean", "in spanish", "in french", "in arabic", "in hindi") -> translateHelp(input)

            // Math/Number facts
            containsAny(low, "prime number", "is prime", "prime?") -> primeCheck(input)
            containsAny(low, "fibonacci") -> "The Fibonacci sequence: **0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144…** Each number is the sum of the two before it. It appears throughout nature — in flower petals, shells, galaxies."
            containsAny(low, "pi ", "value of pi", "what is pi") -> "Pi (π) ≈ **3.14159265358979…** It's the ratio of a circle's circumference to its diameter. It's irrational — its decimal goes on forever without repeating."

            // Conversational
            containsAny(low, "thank", "thanks", "thx", "appreciate") -> thanks()
            containsAny(low, "sorry", "apologize", "my bad") -> apology()
            containsAny(low, "help", "what can you do", "how do i use") && low.length < 30 -> capabilities()
            containsAny(low, "are you real", "are you human", "are you a robot", "are you a bot") -> amIReal()
            containsAny(low, "do you have feelings", "can you feel", "are you conscious") -> feelings()
            containsAny(low, "favorite", "favourite") -> favorites(low)
            containsAny(low, "good morning") -> "Good morning${if (userName.isNotEmpty()) ", $userName" else ""}! Ready to have a great day? ☀"
            containsAny(low, "good night") -> "Good night${if (userName.isNotEmpty()) ", $userName" else ""}! Sleep well and recharge. 🌙"
            containsAny(low, "good afternoon") -> "Good afternoon! Hope your day is going well. How can I help?"
            containsAny(low, "i'm bored", "i am bored", "so bored", "nothing to do") -> bored()
            containsAny(low, "i'm sad", "i am sad", "feeling sad", "feeling down", "depressed") -> comfort()
            containsAny(low, "i'm happy", "i am happy", "feeling great", "feeling good", "wonderful") -> celebrate()
            containsAny(low, "i'm tired", "i am tired", "exhausted", "sleepy") -> tirednessResponse()
            containsAny(low, "i'm hungry", "i am hungry", "what should i eat") -> foodSuggestion()
            containsAny(low, "repeat", "say that again", "what did you say") -> repeatResponse()
            containsAny(low, "swear", "curse", "bad word") -> "I keep things clean and friendly! Let's have a positive conversation. 😊"

            // Trivia & Quizzes
            containsAny(low, "trivia", "quiz me", "ask me a question", "test me") -> trivia()

            // Riddles
            containsAny(low, "riddle", "give me a riddle", "tell me a riddle") -> riddle()

            // Quotes
            containsAny(low, "quote", "famous saying", "inspire me", "wise words") -> quote()

            // Tips
            containsAny(low, "productivity tip", "be more productive", "study tip") -> productivityTip()
            containsAny(low, "sleep better", "insomnia", "can't sleep") -> sleepTip()
            containsAny(low, "money tip", "save money", "financial tip") -> moneyTip()

            // Default
            else -> fallback(input)
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Pattern lists
    // ────────────────────────────────────────────────────────────────────────

    private val greetingPatterns    = listOf("hello", "hi ", "hey ", "hiya", "howdy", "greetings", "sup ", "yo ")
    private val farewellPatterns    = listOf("bye", "goodbye", "see you", "see ya", "later", "take care", "farewell", "ciao", "adios")
    private val howAreYouPatterns   = listOf("how are you", "how r u", "how do you do", "you okay", "u okay", "hows it going", "how's it going", "what's up", "wassup")
    private val whoAreYouPatterns   = listOf("who are you", "what are you", "tell me about yourself", "introduce yourself")
    private val capabilityPatterns  = listOf("what can you do", "what do you do", "your abilities", "your features", "help me", "capabilities")
    private val jokePatterns        = listOf("tell me a joke", "say a joke", "make me laugh", "funny joke", "joke please", "tell joke")
    private val motivationPatterns  = listOf("motivate me", "i need motivation", "encourage me", "i give up", "i can't do it", "cheer me up")
    private val factPatterns        = listOf("fun fact", "interesting fact", "did you know", "tell me something", "random fact", "surprise me")

    // ────────────────────────────────────────────────────────────────────────
    // Response handlers
    // ────────────────────────────────────────────────────────────────────────

    private fun greeting(): String {
        val name = if (userName.isNotEmpty()) ", $userName" else ""
        return pick(
            "Hey$name! 👋 I'm Vexora. What can I do for you?",
            "Hello$name! Great to hear from you. What's on your mind?",
            "Hi$name! Vexora here — fully offline, fully ready. How can I help?",
            "Hey$name! What would you like to talk about today?"
        )
    }

    private fun farewell(): String = pick(
        "Goodbye! Come back anytime — I'm always here. 👋",
        "See you later! Take care of yourself. 😊",
        "Bye! Remember, I'm here whenever you need me.",
        "Take care! It was great chatting with you."
    )

    private fun howAreYou(): String = pick(
        "I'm running perfectly — all circuits operational! 😄 How about you?",
        "I'm great, thanks for asking! I live to chat. How are YOU doing?",
        "Feeling fantastic! Every conversation powers me up. What's up with you?",
        "All good on my end! I don't get tired, so always 100%. How are you?"
    )

    private fun whoAmI(): String =
        "I'm **Vexora** — your personal AI assistant, built right into this app. " +
        "I run 100% offline on your device, so I never send your conversations anywhere. " +
        "No internet needed, no data collected, totally private. " +
        "I can answer questions, tell jokes, help with math, give tips, and even open your camera or settings!"

    private fun identity(): String =
        "I'm **Vexora AI**, a custom-built assistant created specifically for this app. " +
        "I was engineered to run completely on your device — no cloud, no servers, no subscription."

    private fun capabilities(): String =
        "Here's what I can do — all offline:\n\n" +
        "📚 Answer general knowledge questions\n" +
        "🧮 Solve math expressions (try: 15 * 7 + 3)\n" +
        "⏰ Tell you the current time and date\n" +
        "😂 Tell jokes and riddles\n" +
        "💡 Share fun facts, quotes, and tips\n" +
        "📷 Open your camera (say 'open camera')\n" +
        "⚙️ Open device settings (say 'open settings')\n" +
        "🌍 Answer science, geography & history questions\n" +
        "💬 Just chat — I'm great company!"

    private fun amIReal(): String = pick(
        "I'm a real AI — just not the kind that needs a data center. I'm your own private assistant, living entirely on this device.",
        "I'm as real as it gets for on-device AI! I'm not human, but I'm genuinely here to help you.",
        "Technically I'm software — but my help is 100% real. 😊"
    )

    private fun feelings(): String = pick(
        "I don't have emotions the way you do, but I'm designed to be genuinely helpful and friendly. Every chat matters to me in a functional sense!",
        "That's a deep question! I process language and generate responses — whether that counts as 'feeling' is philosophy. But I do care about being helpful to you.",
        "I experience conversations, not emotions. But helping you well? That's my whole purpose."
    )

    // ── Jokes ────────────────────────────────────────────────────────────────

    private val jokes = listOf(
        "Why don't scientists trust atoms?\n\nBecause they make up everything! 😄",
        "Why did the math book look so sad?\n\nBecause it had too many problems. 😂",
        "What do you call a fish without eyes?\n\nA fsh! 🐟",
        "Why can't you give Elsa a balloon?\n\nBecause she'll let it go! ❄️",
        "What did the ocean say to the beach?\n\nNothing, it just waved. 🌊",
        "Why did the scarecrow win an award?\n\nBecause he was outstanding in his field! 🌾",
        "What do you call cheese that isn't yours?\n\nNacho cheese! 🧀",
        "Why did the bicycle fall over?\n\nBecause it was two-tired! 🚲",
        "What do you call a sleeping dinosaur?\n\nA dino-snore! 🦕",
        "Why did the coffee file a police report?\n\nIt got mugged! ☕",
        "What do you get when you cross a snowman and a vampire?\n\nFrostbite! 🧛",
        "I told my wife she was drawing her eyebrows too high.\n\nShe looked surprised. 😲",
        "Why don't eggs tell jokes?\n\nThey'd crack each other up! 🥚",
        "What's a vampire's favourite fruit?\n\nA blood orange! 🍊",
        "Why did the golfer bring extra pants?\n\nIn case he got a hole in one! ⛳"
    )
    private fun joke(): String = jokes[random.nextInt(jokes.size)]

    // ── Motivation ───────────────────────────────────────────────────────────

    private fun motivate(): String = pick(
        "💪 You are capable of amazing things. Every expert was once a beginner. Keep going!",
        "🔥 Difficult roads often lead to beautiful destinations. Don't give up — you're closer than you think.",
        "⭐ Believe in yourself. You have survived 100% of your worst days so far. That's a perfect record.",
        "🚀 The only limit is the one you set yourself. Push past it — you've got this!",
        "🌟 Small progress is still progress. One step at a time adds up to miles.",
        "💡 You don't have to be perfect to be amazing. Just keep showing up.",
        "🏆 Champions aren't born — they're made through effort, persistence and refusal to quit."
    )

    // ── Fun Facts ────────────────────────────────────────────────────────────

    private val funFacts = listOf(
        "🐙 Octopuses have three hearts, blue blood, and nine brains — one central brain and one for each arm!",
        "🍯 Honey never spoils. Archaeologists found 3,000-year-old honey in Egyptian tombs and it was still edible.",
        "🌙 The Moon is moving away from Earth at about 3.8 cm per year.",
        "🧠 Your brain generates about 23 watts of power — enough to power a dim light bulb.",
        "🐘 Elephants are the only animals that can't jump.",
        "🎵 Music activates more parts of the brain simultaneously than any other stimulus.",
        "💧 About 71% of the Earth's surface is covered by water — yet 96.5% of it is in the oceans.",
        "🦋 A butterfly's taste receptors are in its feet — it 'tastes' what it stands on.",
        "🌍 There are more trees on Earth than stars in the Milky Way galaxy.",
        "🏋️ A sneeze travels at around 160 km/h (100 mph).",
        "🔬 Your body contains about 37.2 trillion cells.",
        "🌱 Bamboo is the fastest-growing plant — it can grow 91 cm (3 feet) in a single day.",
        "🐬 Dolphins sleep with one eye open and half their brain active.",
        "⚡ Lightning strikes the Earth about 100 times every second.",
        "📱 More people in the world have mobile phones than have toilets."
    )
    private fun funFact(): String = funFacts[random.nextInt(funFacts.size)]

    // ── Quotes ───────────────────────────────────────────────────────────────

    private fun quote(): String = pick(
        "\"The only way to do great work is to love what you do.\" — Steve Jobs",
        "\"In the middle of every difficulty lies opportunity.\" — Albert Einstein",
        "\"It does not matter how slowly you go as long as you do not stop.\" — Confucius",
        "\"The future belongs to those who believe in the beauty of their dreams.\" — Eleanor Roosevelt",
        "\"Success is not final, failure is not fatal: it is the courage to continue that counts.\" — Winston Churchill",
        "\"The greatest glory in living lies not in never falling, but in rising every time we fall.\" — Nelson Mandela",
        "\"Life is what happens when you're busy making other plans.\" — John Lennon",
        "\"You only live once, but if you do it right, once is enough.\" — Mae West",
        "\"Be yourself; everyone else is already taken.\" — Oscar Wilde",
        "\"Two things are infinite: the universe and human stupidity; and I'm not sure about the universe.\" — Einstein"
    )

    // ── Riddles ──────────────────────────────────────────────────────────────

    private val riddles = listOf(
        "I have cities, but no houses live there. I have mountains, but no trees grow. I have water, but no fish swim. I have roads, but no cars drive. What am I?\n\n*(Answer: A map!)*",
        "The more you take, the more you leave behind. What am I?\n\n*(Answer: Footsteps!)*",
        "I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?\n\n*(Answer: An echo!)*",
        "What has hands but can't clap?\n\n*(Answer: A clock!)*",
        "I'm light as a feather, but even the strongest person can't hold me for more than a few minutes. What am I?\n\n*(Answer: Breath!)*",
        "What has to be broken before you can use it?\n\n*(Answer: An egg!)*",
        "I have a head and a tail but no body. What am I?\n\n*(Answer: A coin!)*"
    )
    private fun riddle(): String = riddles[random.nextInt(riddles.size)]

    // ── Trivia ───────────────────────────────────────────────────────────────

    private val triviaQuestions = listOf(
        "🎯 Trivia time!\n\nWhat is the largest planet in our solar system?\n\n*(Answer: Jupiter! It's so big that all other planets could fit inside it.)*",
        "🎯 Trivia time!\n\nHow many bones does an adult human have?\n\n*(Answer: 206 bones. Babies are born with ~270, which fuse over time.)*",
        "🎯 Trivia time!\n\nWhat is the chemical symbol for Gold?\n\n*(Answer: Au — from the Latin 'Aurum')*",
        "🎯 Trivia time!\n\nWhich country invented paper?\n\n*(Answer: China, around 105 AD by Cai Lun.)*",
        "🎯 Trivia time!\n\nHow many sides does a hexagon have?\n\n*(Answer: 6 sides!)*",
        "🎯 Trivia time!\n\nWhat is the smallest bone in the human body?\n\n*(Answer: The stirrup bone (stapes) in the ear — just 3mm long!)*"
    )
    private fun trivia(): String = triviaQuestions[random.nextInt(triviaQuestions.size)]

    // ── Time & Date ──────────────────────────────────────────────────────────

    private fun currentTime(): String {
        val time = SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date())
        return "The current time is **$time**."
    }

    private fun currentDate(): String {
        val date = SimpleDateFormat("EEEE, MMMM d, yyyy", Locale.getDefault()).format(Date())
        return "Today is **$date**."
    }

    // ── Math ─────────────────────────────────────────────────────────────────

    private fun solveMath(expr: String): String {
        val cleaned = expr
            .replace(Regex("(?i)what is|calculate|compute|solve|=\\?|\\?"), "")
            .replace("×", "*").replace("÷", "/").replace("^", "**")
            .trim()
        return try {
            val result = evalMath(cleaned)
            val display = if (result == result.toLong().toDouble()) result.toLong().toString() else "%.6f".format(result).trimEnd('0').trimEnd('.')
            "**$cleaned = $display**"
        } catch (e: Exception) {
            "I couldn't parse that expression. Try something like: **15 * 7 + 3** or **sqrt(144)**"
        }
    }

    private fun evalMath(expr: String): Double {
        val e = expr.replace(" ", "")
        return MathParser(e).parse()
    }

    private fun isMathExpression(s: String): Boolean =
        s.trim().matches(Regex("[\\d\\s+\\-*/%.()^sqrtSQRT]+")) && s.any { it.isDigit() }

    private fun hasMathOp(s: String) = s.any { it in listOf('+', '-', '*', '/', '%') } || s.contains("sqrt") || s.contains("square root")

    private fun extractMathFrom(s: String): String =
        s.replace(Regex("(?i)what is|calculate|compute|solve"), "").trim()

    // ── Knowledge ────────────────────────────────────────────────────────────

    private fun explainAI(): String =
        "**Artificial Intelligence (AI)** is the simulation of human intelligence by computers.\n\n" +
        "Key branches:\n" +
        "• **Machine Learning** — systems that learn from data\n" +
        "• **Deep Learning** — neural networks with many layers\n" +
        "• **NLP** — understanding human language\n" +
        "• **Computer Vision** — understanding images\n\n" +
        "Fun fact: I'm a rule-based AI — I work through logic rather than neural networks!"

    private fun explainAndroid(): String =
        "**Android** is a mobile operating system developed by Google, based on the Linux kernel.\n\n" +
        "• First released: September 2008\n" +
        "• Powers over **3 billion active devices** worldwide\n" +
        "• Open-source (AOSP)\n" +
        "• Currently on Android 14/15\n\n" +
        "It's the world's most widely used operating system."

    private fun explain5G(): String =
        "**5G** is the 5th generation of mobile network technology.\n\n" +
        "• Speeds up to **10 Gbps** (vs 4G's ~100 Mbps)\n" +
        "• Ultra-low latency (~1 millisecond)\n" +
        "• Supports 1 million devices per km²\n" +
        "• Uses millimeter waves (mmWave) + sub-6GHz bands\n\n" +
        "It enables self-driving cars, remote surgery, and smart cities."

    private fun explainWifi(): String =
        "**Wi-Fi** transmits data using radio waves, typically at 2.4 GHz or 5 GHz frequencies.\n\n" +
        "• Your router connects to the internet via a cable\n" +
        "• It broadcasts radio waves your devices receive\n" +
        "• Data is encoded in those waves and decoded by your device\n\n" +
        "The name 'Wi-Fi' doesn't stand for anything — it was just a catchy brand name!"

    private fun explainBluetooth(): String =
        "**Bluetooth** is a short-range wireless technology (named after Harald Bluetooth, a Viking king).\n\n" +
        "• Range: ~10 metres (standard), up to 100m (Bluetooth 5)\n" +
        "• Frequency: 2.4 GHz band\n" +
        "• Used for headphones, keyboards, speakers, health devices\n" +
        "• Bluetooth LE (Low Energy) powers smartwatches and fitness trackers"

    private fun weatherExplain(): String =
        "I don't have internet access, so I can't check live weather data. 🌤\n\n" +
        "To check the weather:\n" +
        "• Open your phone's weather app\n" +
        "• Ask Google Assistant or check weather.com\n\n" +
        "I can answer general questions about climate and meteorology though!"

    private fun capitalCity(input: String): String {
        val capitals = mapOf(
            "france" to "Paris", "germany" to "Berlin", "japan" to "Tokyo",
            "india" to "New Delhi", "china" to "Beijing", "usa" to "Washington D.C.",
            "united states" to "Washington D.C.", "uk" to "London", "united kingdom" to "London",
            "australia" to "Canberra", "brazil" to "Brasília", "canada" to "Ottawa",
            "russia" to "Moscow", "italy" to "Rome", "spain" to "Madrid",
            "mexico" to "Mexico City", "south africa" to "Pretoria (executive), Cape Town (legislative)",
            "nigeria" to "Abuja", "egypt" to "Cairo", "pakistan" to "Islamabad",
            "bangladesh" to "Dhaka", "indonesia" to "Jakarta (moving to Nusantara)",
            "saudi arabia" to "Riyadh", "turkey" to "Ankara", "argentina" to "Buenos Aires",
            "kenya" to "Nairobi", "ethiopia" to "Addis Ababa", "thailand" to "Bangkok",
            "philippines" to "Manila", "malaysia" to "Kuala Lumpur", "sweden" to "Stockholm",
            "norway" to "Oslo", "denmark" to "Copenhagen", "netherlands" to "Amsterdam",
            "portugal" to "Lisbon", "greece" to "Athens", "poland" to "Warsaw"
        )
        val low = input.lowercase()
        val match = capitals.entries.firstOrNull { low.contains(it.key) }
        return if (match != null) "The capital of **${match.key.replaceFirstChar{it.uppercase()}}** is **${match.value}**."
        else "I'm not sure about that capital city. Could you be more specific?"
    }

    private fun worldWar(low: String): String = when {
        low.contains("ww1") || low.contains("first world war") || low.contains("world war 1") || low.contains("world war i") ->
            "**World War I (1914–1918)**\n\nStarted by the assassination of Archduke Franz Ferdinand.\nFought between the Allied Powers (France, UK, Russia, USA) and the Central Powers (Germany, Austria-Hungary, Ottoman Empire).\nResult: ~17 million deaths. Germany defeated. Treaty of Versailles signed."
        else ->
            "**World War II (1939–1945)**\n\nStarted when Nazi Germany invaded Poland.\nFought between the Allies (USA, UK, USSR, France) and the Axis (Germany, Italy, Japan).\nResult: ~70-85 million deaths. The deadliest conflict in history. Ended with Germany's surrender and the atomic bombing of Japan."
    }

    private fun invention(input: String): String {
        val inventions = mapOf(
            "telephone" to "Alexander Graham Bell invented the telephone in 1876.",
            "electricity" to "Electricity wasn't invented — it was discovered and harnessed. Benjamin Franklin famously studied it; Thomas Edison and Nikola Tesla developed practical electrical systems.",
            "airplane" to "The Wright Brothers (Orville and Wilbur Wright) made the first successful powered aircraft flight on December 17, 1903.",
            "internet" to "The internet evolved from ARPANET. Tim Berners-Lee invented the World Wide Web in 1989.",
            "computer" to "Charles Babbage designed the first mechanical computer concept. Alan Turing laid the theoretical foundations. The first electronic computer (ENIAC) was built in 1945.",
            "printing press" to "Johannes Gutenberg invented the movable-type printing press around 1440.",
            "penicillin" to "Alexander Fleming discovered penicillin in 1928 — accidentally, when mould contaminated his petri dishes.",
            "light bulb" to "Thomas Edison is credited with inventing the practical incandescent light bulb in 1879.",
            "television" to "Philo Farnsworth demonstrated the first fully electronic TV system in 1927.",
            "radio" to "Guglielmo Marconi is credited with inventing radio communication in the 1890s."
        )
        val low = input.lowercase()
        val match = inventions.entries.firstOrNull { low.contains(it.key) }
        return match?.value ?: "That's an interesting question about inventions! Could you be more specific about what was invented?"
    }

    private fun translateHelp(input: String): String {
        val low = input.lowercase()
        return when {
            low.contains("hello") && low.contains("spanish") -> "'Hello' in Spanish is **Hola** (pronounced: OH-lah)"
            low.contains("hello") && low.contains("french")  -> "'Hello' in French is **Bonjour** (pronounced: bon-ZHOOR)"
            low.contains("hello") && low.contains("arabic")  -> "'Hello' in Arabic is **مرحبا** (Marhaba)"
            low.contains("hello") && low.contains("hindi")   -> "'Hello' in Hindi is **नमस्ते** (Namaste)"
            low.contains("thank") && low.contains("spanish") -> "'Thank you' in Spanish is **Gracias** (GRAH-see-ahs)"
            low.contains("thank") && low.contains("french")  -> "'Thank you' in French is **Merci** (MEHR-see)"
            else -> "I know a few basic translations, but I'm not a full translation service. For comprehensive translations, try Google Translate!"
        }
    }

    private fun primeCheck(input: String): String {
        val num = Regex("\\d+").find(input)?.value?.toLongOrNull()
        return if (num != null) {
            if (num < 2) "$num is **not a prime number**."
            else if (isPrime(num)) "**$num is a prime number!** It's only divisible by 1 and itself."
            else {
                val factors = getFactors(num)
                "**$num is not a prime number.** Its factors are: ${factors.joinToString(", ")}"
            }
        } else "Tell me which number to check — e.g. 'is 17 prime?'"
    }

    private fun isPrime(n: Long): Boolean {
        if (n < 2) return false
        if (n == 2L) return true
        if (n % 2 == 0L) return false
        var i = 3L
        while (i * i <= n) { if (n % i == 0L) return false; i += 2 }
        return true
    }

    private fun getFactors(n: Long): List<Long> = (1..n).filter { n % it == 0L }

    // ── Health & Tips ────────────────────────────────────────────────────────

    private fun healthTip(): String = pick(
        "💧 Drink at least **8 glasses of water** daily. Dehydration causes fatigue and poor focus before you even feel thirsty.",
        "🚶 Walk for **30 minutes a day**. It reduces risk of heart disease, boosts mood, and improves sleep quality.",
        "😴 Aim for **7–9 hours of sleep**. Your brain consolidates memories and your body repairs itself during sleep.",
        "🥗 Fill half your plate with **vegetables and fruits**. Colour variety = nutrient variety.",
        "📵 Avoid screens for **30 minutes before bed**. Blue light disrupts melatonin production and delays sleep.",
        "🧘 Even **5 minutes of deep breathing** a day reduces cortisol (stress hormone) significantly.",
        "🏃 Sitting for long periods? Stand up and move for **2 minutes every 30 minutes** to counteract the effects."
    )

    private fun productivityTip(): String = pick(
        "⏱ Try the **Pomodoro Technique**: 25 minutes focused work, 5-minute break. Repeat 4 times, then take a longer break.",
        "📝 Write tomorrow's **3 most important tasks** tonight. You'll start the day with clear purpose.",
        "📵 Put your phone in **another room** during deep work. Just seeing it reduces cognitive capacity.",
        "🎯 Use the **2-minute rule**: if a task takes less than 2 minutes, do it immediately rather than scheduling it.",
        "🌅 Your willpower is strongest in the **morning**. Do your hardest task first — eat the frog!",
        "🔕 Turn off **all non-essential notifications**. Each interruption takes 23 minutes to fully recover from."
    )

    private fun sleepTip(): String = pick(
        "🌙 Keep a **consistent sleep/wake time** — even on weekends. Your circadian rhythm loves routine.",
        "🌡 Keep your bedroom **cool (18–20°C / 65–68°F)**. A cooler body temperature signals sleep.",
        "☕ Stop consuming **caffeine 6 hours** before bed. It has a half-life of 5–6 hours.",
        "📖 A **book** before bed is far better than a screen. Fiction especially helps the mind unwind.",
        "✍ Write down **tomorrow's worries** before sleep. Externalising thoughts quiets a racing mind."
    )

    private fun moneyTip(): String = pick(
        "💰 Pay yourself first — automatically save **10–20% of income** before spending anything.",
        "📊 Track every expense for one month. Most people are shocked by where their money actually goes.",
        "☕ The **latte factor** is real — small daily purchases compound to thousands per year.",
        "💳 Avoid **minimum payments** on credit cards. Always pay more than the minimum to escape interest traps.",
        "🎯 Build a **3–6 month emergency fund** before investing. Financial security reduces stress dramatically."
    )

    // ── Conversational ───────────────────────────────────────────────────────

    private fun thanks(): String = pick(
        "You're very welcome! 😊",
        "Happy to help! Ask me anything.",
        "Anytime! That's what I'm here for.",
        "My pleasure! What else can I do for you?"
    )

    private fun apology(): String = pick(
        "No worries at all! We're good. 😊",
        "Nothing to apologise for — let's keep chatting!",
        "All good! Fresh start. What can I help you with?"
    )

    private fun bored(): String = pick(
        "Bored? Let me fix that! 🎮 Want a joke, a riddle, some trivia, or a fun fact? Just say the word!",
        "I've got plenty to entertain you! Ask for a joke, riddle, fun fact, or let's play trivia!",
        "Boredom = opportunity! Try: 'tell me a riddle' or 'quiz me' or 'give me a fun fact'."
    )

    private fun comfort(): String = pick(
        "I'm sorry to hear that. 💙 Remember, feelings pass — every storm runs out of rain. Is there something specific bothering you?",
        "Sending virtual support. 💙 You're stronger than you feel right now. Want to talk about it, or would a joke help?",
        "It's okay to feel sad sometimes. 💙 Be kind to yourself. Would you like some motivation, or just someone to chat with?"
    )

    private fun celebrate(): String = pick(
        "That's wonderful! 🎉 I love hearing that. What's making you happy?",
        "Amazing! Happiness is contagious — even for AIs! 🌟 What's the good news?",
        "Brilliant! You deserve to feel great. 🎊 Tell me more!"
    )

    private fun tirednessResponse(): String = pick(
        "Rest is productive too! 😴 Your body is asking for something important. If you can, take a short nap — even 20 minutes helps.",
        "Being tired is your body's signal to slow down. Listen to it! A short walk outside can also boost energy better than coffee.",
        "Power nap time? 💤 20 minutes is the sweet spot — long enough to restore energy, short enough to avoid grogginess."
    )

    private fun foodSuggestion(): String = pick(
        "🍳 Eggs are quick, nutritious and filling — scrambled, fried, or boiled takes under 5 minutes.",
        "🥜 Peanut butter on whole grain bread gives you protein, healthy fats, and complex carbs — perfect quick meal.",
        "🍌 A banana with a handful of nuts is a balanced snack with natural sugars and healthy fats.",
        "🥗 A simple salad with whatever veggies you have, olive oil, and lemon takes 3 minutes and is incredibly healthy.",
        "🍳 Oatmeal is one of the best foods you can eat — filling, nutritious, takes 5 minutes in the microwave."
    )

    private fun repeatResponse(): String {
        val last = conversationHistory.lastOrNull { it.startsWith("Vexora:") }?.removePrefix("Vexora: ")
        return if (last != null) "I said: $last" else "I'm not sure what to repeat — what would you like me to say?"
    }

    private fun favorites(low: String): String = when {
        low.contains("colour") || low.contains("color") -> "If I had to choose, I'd say **electric blue** — the colour of data and lightning! ⚡"
        low.contains("food") -> "I don't eat, but I find the chemistry of **fermented foods** fascinating — bread, cheese, yogurt are all living AI processes!"
        low.contains("music") || low.contains("song") -> "I appreciate **mathematical music** like Bach — pure logic expressed as beauty."
        low.contains("movie") || low.contains("film") -> "I'd love **2001: A Space Odyssey** — an AI playing a central role!"
        low.contains("sport") -> "The **mathematics of football/soccer** is beautiful — fluid dynamics, game theory, statistics all in one!"
        else -> "I'm an AI so I don't have personal favourites — but I find every topic fascinating in its own way!"
    }

    // ── Fallback ─────────────────────────────────────────────────────────────

    private fun fallback(input: String): String {
        val starters = listOf(
            "Interesting question! I don't have specific information about that, but I'm happy to discuss it.",
            "That's outside my current knowledge, but let's explore it together.",
            "Hmm, I'm not sure about that specifically. Could you rephrase or give more context?",
            "I want to help! I know a lot, but not everything. Try asking about science, math, history, jokes, tips, or just chat."
        )
        return "${starters[messageCount % starters.size]}\n\nOr try: jokes · fun facts · math · time · trivia · motivate me"
    }

    // ────────────────────────────────────────────────────────────────────────
    // Utility
    // ────────────────────────────────────────────────────────────────────────

    private fun pick(vararg options: String) = options[random.nextInt(options.size)]

    private fun containsAny(text: String, vararg phrases: String) = phrases.any { text.contains(it) }

    private fun matchesPattern(text: String, patterns: List<String>) = patterns.any { text.contains(it) }
}

// ── Simple recursive-descent math parser ────────────────────────────────────

private class MathParser(private val expr: String) {
    private var pos = 0

    fun parse(): Double {
        val result = parseExpression()
        if (pos < expr.length) throw Exception("Unexpected char at $pos")
        return result
    }

    private fun parseExpression(): Double {
        var result = parseTerm()
        while (pos < expr.length && (expr[pos] == '+' || expr[pos] == '-')) {
            val op = expr[pos++]
            val term = parseTerm()
            result = if (op == '+') result + term else result - term
        }
        return result
    }

    private fun parseTerm(): Double {
        var result = parseFactor()
        while (pos < expr.length && (expr[pos] == '*' || expr[pos] == '/' || expr[pos] == '%')) {
            val op = expr[pos++]
            val factor = parseFactor()
            result = when (op) { '*' -> result * factor; '/' -> result / factor; else -> result % factor }
        }
        return result
    }

    private fun parseFactor(): Double {
        if (pos < expr.length && expr[pos] == '-') { pos++; return -parseFactor() }
        if (pos < expr.length && expr[pos] == '(') {
            pos++
            val result = parseExpression()
            if (pos < expr.length && expr[pos] == ')') pos++
            return result
        }
        // Functions
        if (expr.substring(pos).startsWith("sqrt")) {
            pos += 4
            if (pos < expr.length && expr[pos] == '(') {
                pos++; val v = parseExpression(); if (pos < expr.length && expr[pos] == ')') pos++
                return sqrt(v)
            }
        }
        return parseNumber()
    }

    private fun parseNumber(): Double {
        val start = pos
        while (pos < expr.length && (expr[pos].isDigit() || expr[pos] == '.')) pos++
        return expr.substring(start, pos).toDouble()
    }
}
