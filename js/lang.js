// ---------------------------------------------------------------------------
// Language content: selectable languages, vocabulary notes, NPC dialogue.
// Every piece of text is stored per-language; `en` is the meaning/translation.
// ---------------------------------------------------------------------------

const LANGS = {
  es: { name: "Spanish", flag: "\u{1F1EA}\u{1F1F8}" },
  fr: { name: "French",  flag: "\u{1F1EB}\u{1F1F7}" },
  de: { name: "German",  flag: "\u{1F1E9}\u{1F1EA}" },
};

// ---------------- Vocabulary notes ----------------
// Found on signs/boards around the map. Reading one adds its entries to the
// phrasebook; known words are then glossed under villager dialogue.
const NOTES = {
  farm: {
    title: { es: "Cartel de la granja", fr: "Panneau de la ferme", de: "Hofschild", en: "Farm Sign" },
    entries: [
      { w: { es: "granja", fr: "ferme", de: "Bauernhof" }, en: "farm" },
      { w: { es: "semilla", fr: "graine", de: "Samen" }, en: "seed" },
      { w: { es: "agua", fr: "eau", de: "Wasser" }, en: "water" },
      { w: { es: "sol", fr: "soleil", de: "Sonne" }, en: "sun" },
      { w: { es: "trabajar", fr: "travailler", de: "arbeit" }, en: "to work" },
    ],
  },
  board: {
    title: { es: "Tablón de anuncios", fr: "Panneau d'affichage", de: "Schwarzes Brett", en: "Village Notice Board" },
    entries: [
      { w: { es: "hola", fr: "salut", de: "hallo" }, en: "hello" },
      { w: { es: "buenos días", fr: "bonjour", de: "guten Morgen" }, en: "good morning" },
      { w: { es: "gracias", fr: "merci", de: "danke" }, en: "thank you" },
      { w: { es: "sí", fr: "oui", de: "ja" }, en: "yes" },
      { w: { es: "mañana", fr: "demain", de: "morgen" }, en: "tomorrow" },
    ],
  },
  bakery: {
    title: { es: "Menú de la panadería", fr: "Menu de la boulangerie", de: "Speisekarte der Bäckerei", en: "Bakery Menu" },
    entries: [
      { w: { es: "pan", fr: "pain", de: "Brot" }, en: "bread" },
      { w: { es: "comida", fr: "nourriture", de: "Essen" }, en: "food" },
      { w: { es: "me gusta", fr: "j'aime", de: "ich mag" }, en: "I like" },
      { w: { es: "queso", fr: "fromage", de: "Käse" }, en: "cheese" },
      { w: { es: "sopa", fr: "soupe", de: "Suppe" }, en: "soup" },
    ],
  },
  pond: {
    title: { es: "Cartel del lago", fr: "Panneau du lac", de: "Seeschild", en: "Pond Sign" },
    entries: [
      { w: { es: "lago", fr: "lac", de: "See" }, en: "lake" },
      { w: { es: "peces", fr: "poissons", de: "Fische" }, en: "fish" },
      { w: { es: "pescar", fr: "pêcher", de: "angeln" }, en: "to fish" },
      { w: { es: "hoy", fr: "aujourd'hui", de: "heute" }, en: "today" },
      { w: { es: "frío", fr: "froid", de: "kalt" }, en: "cold" },
    ],
  },
  shop: {
    title: { es: "Póster de la tienda", fr: "Affiche de la boutique", de: "Ladenplakat", en: "Shop Poster" },
    entries: [
      { w: { es: "tienda", fr: "boutique", de: "Laden" }, en: "shop" },
      { w: { es: "comprar", fr: "acheter", de: "kaufen" }, en: "to buy" },
      { w: { es: "dinero", fr: "argent", de: "Geld" }, en: "money" },
      { w: { es: "monedas", fr: "pièces", de: "Münzen" }, en: "coins" },
      { w: { es: "herramienta", fr: "outil", de: "Werkzeug" }, en: "tool" },
    ],
  },
  house: {
    title: { es: "Nota vieja", fr: "Vieille note", de: "Alte Notiz", en: "Old Note" },
    entries: [
      { w: { es: "casa", fr: "maison", de: "Haus" }, en: "house" },
      { w: { es: "ayudar", fr: "aider", de: "helfen" }, en: "to help" },
      { w: { es: "hablar", fr: "parler", de: "reden" }, en: "to speak" },
      { w: { es: "quiero", fr: "je veux", de: "ich möchte" }, en: "I want" },
      { w: { es: "no entiendo", fr: "je ne comprends pas", de: "ich verstehe nicht" }, en: "I don't understand" },
    ],
  },
};

// ---------------- NPC dialogue ----------------
// Each NPC has conversation topics. The NPC speaks in the target language;
// the player picks a response. Exactly one choice is relevant (correct).
const DIALOGUES = {
  elena: {
    success: {
      es: "¡Perfecto! Me encanta hablar contigo.",
      fr: "Parfait ! J'adore parler avec toi.",
      de: "Perfekt! Ich rede gern mit dir.",
      en: "Perfect! I love talking with you." },
    fail: {
      es: "¿Qué? No entiendo...",
      fr: "Quoi ? Je ne comprends pas...",
      de: "Was? Ich verstehe nicht...",
      en: "What? I don't understand..." },
    topics: [
      {
        line: {
          es: "¡Buenos días! Hace sol hoy. ¿Te gusta trabajar en la granja?",
          fr: "Bonjour ! Il fait beau aujourd'hui. Tu aimes travailler à la ferme ?",
          de: "Guten Morgen! Heute scheint die Sonne. Arbeitest du gern auf dem Bauernhof?",
          en: "Good morning! It's sunny today. Do you like working on the farm?" },
        choices: [
          { correct: true,
            t: { es: "Sí, me gusta mucho trabajar en la granja.",
                 fr: "Oui, j'aime beaucoup travailler à la ferme.",
                 de: "Ja, ich arbeite sehr gern auf dem Bauernhof.",
                 en: "Yes, I really like working on the farm." } },
          { t: { es: "El gato es azul.",
                 fr: "Le chat est bleu.",
                 de: "Die Katze ist blau.",
                 en: "The cat is blue." } },
          { t: { es: "Quiero comprar zapatos nuevos.",
                 fr: "Je veux acheter de nouvelles chaussures.",
                 de: "Ich möchte neue Schuhe kaufen.",
                 en: "I want to buy new shoes." } },
        ],
      },
      {
        line: {
          es: "Mis semillas necesitan agua. ¿Puedes ayudarme mañana?",
          fr: "Mes graines ont besoin d'eau. Tu peux m'aider demain ?",
          de: "Meine Samen brauchen Wasser. Kannst du mir morgen helfen?",
          en: "My seeds need water. Can you help me tomorrow?" },
        choices: [
          { correct: true,
            t: { es: "Claro, puedo ayudarte mañana.",
                 fr: "Bien sûr, je peux t'aider demain.",
                 de: "Klar, ich kann dir morgen helfen.",
                 en: "Of course, I can help you tomorrow." } },
          { t: { es: "Mi casa es muy grande.",
                 fr: "Ma maison est très grande.",
                 de: "Mein Haus ist sehr groß.",
                 en: "My house is very big." } },
          { t: { es: "No me gusta la música.",
                 fr: "Je n'aime pas la musique.",
                 de: "Ich mag keine Musik.",
                 en: "I don't like music." } },
        ],
      },
    ],
  },

  mateo: {
    success: {
      es: "¡Excelente! Vuelve pronto.",
      fr: "Excellent ! Reviens vite.",
      de: "Ausgezeichnet! Komm bald wieder.",
      en: "Excellent! Come back soon." },
    fail: {
      es: "Eh... eso no tiene sentido.",
      fr: "Euh... ça n'a pas de sens.",
      de: "Äh... das ergibt keinen Sinn.",
      en: "Uh... that doesn't make sense." },
    topics: [
      {
        line: {
          es: "¡Bienvenido a la panadería! ¿Quieres comprar pan fresco?",
          fr: "Bienvenue à la boulangerie ! Tu veux acheter du pain frais ?",
          de: "Willkommen in der Bäckerei! Möchtest du frisches Brot kaufen?",
          en: "Welcome to the bakery! Do you want to buy fresh bread?" },
        choices: [
          { correct: true,
            t: { es: "Sí, por favor. Me gusta mucho el pan.",
                 fr: "Oui, s'il te plaît. J'aime beaucoup le pain.",
                 de: "Ja, bitte. Ich mag Brot sehr.",
                 en: "Yes, please. I really like bread." } },
          { t: { es: "El perro corre en el parque.",
                 fr: "Le chien court dans le parc.",
                 de: "Der Hund läuft im Park.",
                 en: "The dog runs in the park." } },
          { t: { es: "Hace mucho frío en invierno.",
                 fr: "Il fait très froid en hiver.",
                 de: "Im Winter ist es sehr kalt.",
                 en: "It's very cold in winter." } },
        ],
      },
      {
        line: {
          es: "¿Cuál es tu comida favorita? A mí me gusta la sopa.",
          fr: "Quelle est ta nourriture préférée ? Moi, j'aime la soupe.",
          de: "Was ist dein Lieblingsessen? Ich mag Suppe.",
          en: "What is your favorite food? I like soup." },
        choices: [
          { correct: true,
            t: { es: "Mi comida favorita es el pan con queso.",
                 fr: "Ma nourriture préférée est le pain au fromage.",
                 de: "Mein Lieblingsessen ist Brot mit Käse.",
                 en: "My favorite food is bread with cheese." } },
          { t: { es: "Mañana voy a la escuela.",
                 fr: "Demain je vais à l'école.",
                 de: "Morgen gehe ich zur Schule.",
                 en: "Tomorrow I go to school." } },
          { t: { es: "El agua del lago es fría.",
                 fr: "L'eau du lac est froide.",
                 de: "Das Wasser im See ist kalt.",
                 en: "The lake water is cold." } },
        ],
      },
    ],
  },

  sofia: {
    success: {
      es: "¡Muy bien! Eres buen cliente.",
      fr: "Très bien ! Tu es un bon client.",
      de: "Sehr gut! Du bist ein guter Kunde.",
      en: "Very good! You're a good customer." },
    fail: {
      es: "Hmm... ¿de qué hablas?",
      fr: "Hmm... de quoi tu parles ?",
      de: "Hmm... wovon redest du?",
      en: "Hmm... what are you talking about?" },
    topics: [
      {
        line: {
          es: "Hola, ¿buscas algo en la tienda? Tenemos herramientas nuevas.",
          fr: "Salut, tu cherches quelque chose dans la boutique ? Nous avons de nouveaux outils.",
          de: "Hallo, suchst du etwas im Laden? Wir haben neues Werkzeug.",
          en: "Hi, are you looking for something in the shop? We have new tools." },
        choices: [
          { correct: true,
            t: { es: "Sí, quiero comprar una herramienta.",
                 fr: "Oui, je veux acheter un outil.",
                 de: "Ja, ich möchte ein Werkzeug kaufen.",
                 en: "Yes, I want to buy a tool." } },
          { t: { es: "Mi hermana canta muy bien.",
                 fr: "Ma sœur chante très bien.",
                 de: "Meine Schwester singt sehr gut.",
                 en: "My sister sings very well." } },
          { t: { es: "El sol es una estrella.",
                 fr: "Le soleil est une étoile.",
                 de: "Die Sonne ist ein Stern.",
                 en: "The sun is a star." } },
        ],
      },
      {
        line: {
          es: "Las semillas cuestan diez monedas. ¿Tienes dinero?",
          fr: "Les graines coûtent dix pièces. Tu as de l'argent ?",
          de: "Die Samen kosten zehn Münzen. Hast du Geld?",
          en: "The seeds cost ten coins. Do you have money?" },
        choices: [
          { correct: true,
            t: { es: "Sí, tengo dinero. Aquí tienes.",
                 fr: "Oui, j'ai de l'argent. Voilà.",
                 de: "Ja, ich habe Geld. Hier bitte.",
                 en: "Yes, I have money. Here you go." } },
          { t: { es: "Me gusta bailar los sábados.",
                 fr: "J'aime danser le samedi.",
                 de: "Ich tanze gern am Samstag.",
                 en: "I like to dance on Saturdays." } },
          { t: { es: "El cielo está muy bonito hoy.",
                 fr: "Le ciel est très beau aujourd'hui.",
                 de: "Der Himmel ist heute sehr schön.",
                 en: "The sky is very beautiful today." } },
        ],
      },
    ],
  },

  hugo: {
    success: {
      es: "¡Genial! Eres buena compañía.",
      fr: "Génial ! Tu es de bonne compagnie.",
      de: "Super! Du bist gute Gesellschaft.",
      en: "Great! You're good company." },
    fail: {
      es: "Ja, ja... ¿qué?",
      fr: "Ha ha... quoi ?",
      de: "Haha... was?",
      en: "Haha... what?" },
    topics: [
      {
        line: {
          es: "¡Hola! Estoy pescando en el lago. ¿Quieres pescar conmigo?",
          fr: "Salut ! Je pêche dans le lac. Tu veux pêcher avec moi ?",
          de: "Hallo! Ich angle im See. Willst du mit mir angeln?",
          en: "Hi! I'm fishing in the lake. Do you want to fish with me?" },
        choices: [
          { correct: true,
            t: { es: "Sí, me gusta pescar. ¡Vamos!",
                 fr: "Oui, j'aime pêcher. Allons-y !",
                 de: "Ja, ich angle gern. Los geht's!",
                 en: "Yes, I like fishing. Let's go!" } },
          { t: { es: "La panadería abre a las ocho.",
                 fr: "La boulangerie ouvre à huit heures.",
                 de: "Die Bäckerei öffnet um acht Uhr.",
                 en: "The bakery opens at eight." } },
          { t: { es: "Mis zapatos son rojos.",
                 fr: "Mes chaussures sont rouges.",
                 de: "Meine Schuhe sind rot.",
                 en: "My shoes are red." } },
        ],
      },
      {
        line: {
          es: "Hoy los peces no tienen hambre. ¡Qué mala suerte!",
          fr: "Aujourd'hui les poissons n'ont pas faim. Quelle malchance !",
          de: "Heute haben die Fische keinen Hunger. So ein Pech!",
          en: "Today the fish aren't hungry. What bad luck!" },
        choices: [
          { correct: true,
            t: { es: "¡Qué pena! Mañana será mejor.",
                 fr: "Quel dommage ! Demain sera meilleur.",
                 de: "Wie schade! Morgen wird es besser.",
                 en: "What a shame! Tomorrow will be better." } },
          { t: { es: "Mi color favorito es el verde.",
                 fr: "Ma couleur préférée est le vert.",
                 de: "Meine Lieblingsfarbe ist Grün.",
                 en: "My favorite color is green." } },
          { t: { es: "La tienda vende zapatos.",
                 fr: "La boutique vend des chaussures.",
                 de: "Der Laden verkauft Schuhe.",
                 en: "The shop sells shoes." } },
        ],
      },
    ],
  },
};
