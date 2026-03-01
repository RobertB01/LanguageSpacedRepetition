// Spanish Verb Conjugation Engine + Data — B1 Level
// Tenses: Presente, Pretérito Indefinido, Imperfecto, Futuro,
//         Pretérito Perfecto (haber + participio), Imperativo,
//         Subjuntivo Presente, Participio, Gerundio
// Covers all verbs in vocabulary.js (IDs 51-150)

const CONJUGATIONS = (() => {
  const SUBJECTS = ['yo', 'tú', 'él/ella', 'nosotros', 'vosotros', 'ellos/ellas'];
  const REFL_PRONOUNS = ['me', 'te', 'se', 'nos', 'os', 'se'];

  // ============================================================
  //  ENDINGS
  // ============================================================

  const PRESENT_ENDINGS = {
    ar: ['o', 'as', 'a', 'amos', 'áis', 'an'],
    er: ['o', 'es', 'e', 'emos', 'éis', 'en'],
    ir: ['o', 'es', 'e', 'imos', 'ís', 'en'],
  };

  const PRETERITE_ENDINGS = {
    ar: ['é', 'aste', 'ó', 'amos', 'asteis', 'aron'],
    er: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
    ir: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
  };

  const STRONG_PRET_ENDINGS = ['e', 'iste', 'o', 'imos', 'isteis', 'ieron'];

  const IMPERFECT_ENDINGS = {
    ar: ['aba', 'abas', 'aba', 'ábamos', 'abais', 'aban'],
    er: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
    ir: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
  };

  // Futuro: endings added to INFINITIVE (not stem)
  const FUTURE_ENDINGS = ['é', 'ás', 'á', 'emos', 'éis', 'án'];

  // Subjuntivo presente: -ar verbs get -er style, -er/-ir get -ar style
  const SUBJ_PRES_ENDINGS = {
    ar: ['e', 'es', 'e', 'emos', 'éis', 'en'],
    er: ['a', 'as', 'a', 'amos', 'áis', 'an'],
    ir: ['a', 'as', 'a', 'amos', 'áis', 'an'],
  };

  // ============================================================
  //  IRREGULAR DATA
  // ============================================================

  // Boot pattern: positions 0,1,2,5 get stem change (not nosotros/vosotros)
  const BOOT = [true, true, true, false, false, true];

  // --- Preterite overrides ---
  const PRET_DB = {
    51: { full: ['fui','fuiste','fue','fuimos','fuisteis','fueron'] },     // ser
    52: { full: ['estuve','estuviste','estuvo','estuvimos','estuvisteis','estuvieron'] }, // estar
    53: { st: 'tuv' },    // tener
    54: { st: 'hic', p3: 'hizo' },  // hacer
    55: { full: ['fui','fuiste','fue','fuimos','fuisteis','fueron'] },     // ir
    56: { st: 'vin' },    // venir
    57: { full: ['dije','dijiste','dijo','dijimos','dijisteis','dijeron'] }, // decir
    58: { full: ['vi','viste','vio','vimos','visteis','vieron'] },         // ver
    59: { st: 'sup' },    // saber
    60: { st: 'conoc', reg: true }, // conocer — regular preterite
    61: { st: 'quis' },   // querer
    62: { st: 'pud' },    // poder
    63: { full: ['di','diste','dio','dimos','disteis','dieron'] },         // dar
    80: { full: ['salí','saliste','salió','salimos','salisteis','salieron'] }, // salir — regular
    82: { st: 'pus' },    // poner
    110: { st: 'traj', ieron: 'trajeron' }, // traer
    125: { full: ['caí','caíste','cayó','caímos','caísteis','cayeron'] },  // caer
    95: { st: 'conduj', ieron: 'condujeron' }, // conducir
    85: { sc3: 'o>u' },   // dormir
    84: { sc3: 'e>i' },   // sentir
    101: { sc3: 'e>i' },  // pedir
    114: { sc3: 'e>i' },  // elegir
    135: { sc3: 'e>i' },  // seguir
    129: { sc3: 'o>u' },  // morir
    73: { full: ['leí','leíste','leyó','leímos','leísteis','leyeron'] },
    127: { full: ['construí','construiste','construyó','construimos','construisteis','construyeron'] },
  };

  // --- Imperfect overrides (only 3 irregular verbs!) ---
  const IMPERFECT_DB = {
    51: ['era','eras','era','éramos','erais','eran'],       // ser
    55: ['iba','ibas','iba','íbamos','ibais','iban'],       // ir
    58: ['veía','veías','veía','veíamos','veíais','veían'], // ver
  };

  // --- Future irregular stems (added to these stems instead of infinitive) ---
  const FUTURE_STEMS = {
    53: 'tendr',   // tener
    54: 'har',     // hacer
    56: 'vendr',   // venir
    57: 'dir',     // decir
    59: 'sabr',    // saber
    61: 'querr',   // querer
    62: 'podr',    // poder
    80: 'saldr',   // salir
    82: 'pondr',   // poner
  };

  // --- Participios irregulares ---
  const IRREGULAR_PARTICIPLES = {
    54: 'hecho',    // hacer
    57: 'dicho',    // decir
    58: 'visto',    // ver
    72: 'escrito',  // escribir
    82: 'puesto',   // poner
    89: 'abierto',  // abrir
    112: 'vuelto',  // volver
    126: 'roto',    // romper
    129: 'muerto',  // morir
    125: 'caído',   // caer (accented)
    73: 'leído',    // leer (accented)
    110: 'traído',  // traer (accented)
    79: 'creído',   // creer (accented)
    127: 'construido', // construir (no accent on -uir)
  };

  // --- Gerundios irregulares ---
  const IRREGULAR_GERUNDS = {
    55: 'yendo',      // ir
    57: 'diciendo',   // decir (e→i)
    62: 'pudiendo',   // poder (o→u)
    85: 'durmiendo',  // dormir (o→u)
    84: 'sintiendo',  // sentir (e→i)
    56: 'viniendo',   // venir (e→i)
    101: 'pidiendo',  // pedir (e→i)
    114: 'eligiendo', // elegir (e→i)
    135: 'siguiendo', // seguir (e→i)
    129: 'muriendo',  // morir (o→u)
    73: 'leyendo',    // leer (y inserted)
    125: 'cayendo',   // caer (y inserted)
    127: 'construyendo', // construir (y inserted)
    110: 'trayendo',  // traer (y inserted)
    79: 'creyendo',   // creer (y inserted)
  };

  // --- Imperativo irregular (tú only — most important for B1) ---
  // Format: [tú_affirm, usted, vosotros, ustedes]
  const IMPERATIVE_DB = {
    53: { tu: 'ten' },      // tener
    54: { tu: 'haz' },      // hacer
    55: { tu: 've' },       // ir
    56: { tu: 'ven' },      // venir
    57: { tu: 'di' },       // decir
    63: { tu: 'da' },       // dar (no accent on monosyllable in reformed spelling)
    80: { tu: 'sal' },      // salir
    82: { tu: 'pon' },      // poner
    51: { tu: 'sé' },       // ser
    52: { tu: 'está' },     // estar (accented: not *esta)
  };

  // --- Subjuntivo presente full overrides ---
  const SUBJ_PRES_DB = {
    51: ['sea','seas','sea','seamos','seáis','sean'],          // ser
    52: ['esté','estés','esté','estemos','estéis','estén'],    // estar
    55: ['vaya','vayas','vaya','vayamos','vayáis','vayan'],    // ir
    59: ['sepa','sepas','sepa','sepamos','sepáis','sepan'],    // saber
    63: ['dé','des','dé','demos','deis','den'],                // dar
    58: ['vea','veas','vea','veamos','veáis','vean'],          // ver
  };

  // ============================================================
  //  VERB DATABASE (Present tense data + tips)
  // ============================================================

  const DB = {
    // ── Fully Irregular ──
    51: { p: ['soy','eres','es','somos','sois','son'],
      t: "Ser = permanent essence: identity, origin, profession, time. 'Soy español. Son las tres.' Use ser for what things ARE fundamentally." },
    52: { p: ['estoy','estás','está','estamos','estáis','están'],
      t: "Estar = temporary states & location. 'Estoy cansado. Está en casa.' Use estar for emotions, health, conditions, and where things are." },
    55: { p: ['voy','vas','va','vamos','vais','van'],
      t: "Ir + a + infinitive = near future. 'Voy a comer' = I'm going to eat. One of the most useful constructions in Spanish." },
    58: { p: ['veo','ves','ve','vemos','veis','ven'],
      t: "Ver = see (perception). Short stem makes it easy. Don't confuse with mirar (to look at, intentional)." },
    63: { p: ['doy','das','da','damos','dais','dan'],
      t: "Dar = give. Irregular yo (doy). Common: dar un paseo (take a walk), dar las gracias (thank)." },
    127: { p: ['construyo','construyes','construye','construimos','construís','construyen'],
      t: "A -uir verb: y is inserted before the ending vowel. Same pattern as destruir, incluir, contribuir." },
    108: { p: ['envío','envías','envía','enviamos','enviáis','envían'],
      t: "The í gets stressed in boot forms (envío, not envio). Same pattern applies to confiar, guiar." },

    // ── -go verbs + stem change ──
    53: { yo: 'tengo', sc: 'e>ie',
      t: "Beyond 'have', tener expresses age and sensations: tengo 20 años, tengo hambre/frío/sed/sueño. Essential verb." },
    56: { yo: 'vengo', sc: 'e>ie',
      t: "Venir = come (toward speaker). Ir = go (away). 'Ven aquí' (come here) vs 'Ve allí' (go there)." },
    57: { yo: 'digo', sc: 'e>i',
      t: "Decir = say/tell. Double irregularity: -go yo form + e→i stem change. 'Digo la verdad' = I tell the truth." },
    114: { yo: 'elijo', sc: 'e>i',
      t: "Elegir = choose. The g→j in yo (elijo) keeps the soft g sound. Also: escoger (escojo)." },
    135: { yo: 'sigo', sc: 'e>i',
      t: "Seguir = follow/continue. The gu→g in yo (sigo). 'Sigo adelante' = I keep going. Seguir + gerund = keep doing." },

    // ── -go verbs (yo only) ──
    54: { yo: 'hago',
      t: "Hacer = do/make. 'Hago ejercicio.' Also used for weather: hace frío/calor/sol/viento." },
    80: { yo: 'salgo',
      t: "Salir = leave/go out. -go in yo. 'Salgo de casa a las ocho.' Salir con = go out with (date)." },
    82: { yo: 'pongo',
      t: "Poner = put/place. -go in yo. 'Poner la mesa' = set the table. Reflexive ponerse = to put on (clothes)." },
    110: { yo: 'traigo',
      t: "Traer = bring (toward speaker). vs Llevar = carry/take (away). 'Traigo el libro' = I bring the book." },
    125: { yo: 'caigo',
      t: "Caer = fall. -go in yo. 'Se me cae' = it falls from me (I drop it). Caerse = to fall down." },

    // ── -zco verbs ──
    59: { yo: 'sé',
      t: "Saber = know facts/how to. vs Conocer = know people/places. 'Sé nadar' (I know how to swim) vs 'Conozco Madrid'." },
    60: { yo: 'conozco',
      t: "Conocer = be acquainted with (people, places). -zco yo. '¿Conoces a María?' Note the personal 'a'." },
    95: { yo: 'conduzco',
      t: "Conducir = drive. -zco yo. 'Conduzco al trabajo.' In Latin America: manejar is more common." },
    128: { yo: 'crezco',
      t: "Crecer = grow. -zco yo. 'Los niños crecen rápido.' The -cer/-cir → -zco pattern is very common." },
    140: { yo: 'parezco',
      t: "Parecer = seem/appear. -zco yo. 'Parece fácil' = it seems easy. Parecerse a = to look like." },

    // ── Stem-changing e→ie ──
    61: { sc: 'e>ie',
      t: "Querer = want/love. 'Te quiero' = I love you (informal). 'Quiero café' = I want coffee." },
    68: { sc: 'e>ie',
      t: "Pensar = think. 'Pienso que sí' = I think so. Pensar en = think about." },
    74: { sc: 'e>ie',
      t: "Entender = understand. 'No entiendo' is your survival phrase! Also: comprender (same meaning)." },
    84: { sc: 'e>ie',
      t: "Sentir = feel. Reflexive sentirse for emotions: 'Me siento bien.' Lo siento = I'm sorry (I feel it)." },
    90: { sc: 'e>ie',
      t: "Cerrar = close. Opposite of abrir. 'Cierra la puerta' = close the door." },
    91: { sc: 'e>ie',
      t: "Empezar = begin/start. Also: comenzar (same pattern). 'Empiezo a las nueve.'" },
    121: { sc: 'e>ie', refl: true,
      t: "Sentarse = sit down (reflexive). 'Siéntate' = sit down (command). Same stem change as sentir." },
    131: { sc: 'e>ie',
      t: "Perder = lose. 'Pierdo las llaves' = I lose my keys. Also: miss (perder el tren)." },

    // ── Stem-changing o→ue ──
    62: { sc: 'o>ue',
      t: "Poder = can/be able. 'Puedo hacerlo.' Often followed by infinitive. '¿Puedes ayudarme?'" },
    69: { sc: 'o>ue',
      t: "Encontrar = find. 'Encuentro' = I find. Reflexive encontrarse = to meet/be located." },
    85: { sc: 'o>ue',
      t: "Dormir = sleep. 'Duermo ocho horas.' Dormirse = fall asleep. 'Me dormí' = I fell asleep." },
    103: { sc: 'o>ue',
      t: "Recordar = remember. 'No recuerdo' = I don't remember. Similar to acordarse de (reflexive)." },
    112: { sc: 'o>ue',
      t: "Volver = return. 'Vuelvo a casa.' Volver a + infinitive = do again: 'Vuelvo a intentar.'" },
    115: { sc: 'o>ue',
      t: "Mostrar = show. Also: enseñar (teach/show, regular). 'Te muestro mi casa.'" },
    123: { sc: 'o>ue',
      t: "Volar = fly. 'Vuelo a España mañana.' Same pattern as encontrar, volver, poder." },
    129: { sc: 'o>ue',
      t: "Morir = die. 'Muero de hambre' = I'm dying of hunger (figurative). Past participle: muerto." },
    136: { sc: 'o>ue',
      t: "Mover = move. 'Muevo la mesa.' Reflexive moverse = to move (oneself). 'No te muevas.'" },
    143: { sc: 'o>ue',
      t: "Costar = cost. Usually 3rd person: '¿Cuánto cuesta?' Figurative: 'Me cuesta entender.'" },

    // ── Stem-changing u→ue ──
    96: { sc: 'u>ue',
      t: "Jugar = play (games/sports). The only u→ue verb! 'Juego al fútbol.' Use with 'a': jugar a + sport." },

    // ── Stem-changing e→i ──
    101: { sc: 'e>i',
      t: "Pedir = ask for/request vs preguntar = ask a question. 'Pido un café.' E→i stem change." },

    // ── Regular -ar ──
    64: { t: "Tomar = take/drink. 'Tomar café' = have coffee. 'Tomar el sol' = sunbathe. 'Tomar asiento' = take a seat." },
    67: { t: "Hablar = speak/talk. Model -ar verb. '¿Hablas español?' — your most important question!" },
    70: { t: "Mirar = look at (intentional). vs Ver = see (perception). 'Mira el cielo' = look at the sky." },
    71: { t: "Escuchar = listen (intentional). Also: oír = hear (perception). Oír is irregular (oigo, oyes...)." },
    75: { t: "Aprender = learn. Regular -er. 'Aprender español' = to learn Spanish. Aprender a + inf = learn to." },
    76: { t: "Trabajar = work. Regular -ar. 'Trabajo en/de...' = I work at/as..." },
    77: { t: "Necesitar = need. Regular -ar. 'Necesito ayuda' = I need help. Straightforward and essential." },
    81: { t: "Llegar = arrive. Regular present. Use 'a' with destination: 'Llego a casa a las seis.'" },
    83: { t: "Esperar = wait/hope. Both meanings! 'Espérame' (wait for me) and 'Espero que sí' (I hope so)." },
    86: { t: "Comprar = buy. Regular -ar. 'Voy a comprar pan.' Ir de compras = go shopping." },
    87: { t: "Vender = sell. Regular -er. 'Se vende' = for sale." },
    88: { t: "Pagar = pay. Regular -ar. 'Pagar con tarjeta' = pay by card. 'Pagar en efectivo' = pay cash." },
    89: { t: "Abrir = open. Regular -ir. Past participle irregular: abierto. Opposite: cerrar." },
    92: { t: "Terminar = finish. Regular -ar. Also: acabar. 'Termino a las cinco.' Acabar de + inf = just did." },
    93: { t: "Caminar = walk. Regular -ar. Also: andar (irregular preterite). Pasear = stroll." },
    94: { t: "Correr = run. Regular -er. 'Corro todas las mañanas.' Also figurative: correr prisa = be urgent." },
    97: { t: "Ayudar = help. Regular -ar. '¿Me puedes ayudar?' = Can you help me? Ayudar a + infinitive." },
    98: { t: "Intentar = try (attempt). Regular. Also: probar (try/taste, o→ue). 'Intentar otra vez.'" },
    99: { t: "Usar = use. Regular -ar. Also: utilizar (more formal). 'Uso el teléfono.'" },
    100: { t: "Llamar = call/name. Regular -ar. Llamarse (reflexive) = to be named. 'Me llamo Robert.'" },
    102: { t: "Responder = answer/respond. Regular -er. Also: contestar (regular -ar). 'Responde a la pregunta.'" },
    104: { t: "Olvidar = forget. Regular -ar. 'No olvides tu pasaporte.' Olvidarse de = reflexive form." },
    105: { t: "Amar = love (formal/literary). Regular -ar. In everyday speech, querer is much more common." },
    106: { t: "Gustar works backwards: 'Me gusta el café' = coffee pleases me. The thing liked is the subject!" },
    107: { t: "Odiar = hate. Regular -ar. 'Odio madrugar' = I hate getting up early." },
    109: { t: "Recibir = receive. Regular -ir. 'Recibir un mensaje/regalo.'" },
    111: { t: "Llevar = carry/wear/take. Regular. Multiple meanings: 'Llevo gafas' (wear), 'Llevo tres años' (been 3 years)." },
    113: { t: "Cambiar = change. Regular -ar. 'Cambiar de opinión' = change one's mind." },
    116: { t: "Enseñar = teach/show. Regular -ar. 'Enseñar español' = teach Spanish. Also: mostrar (show)." },
    117: { t: "Cantar = sing. Regular -ar. 'Cantar una canción.' Model -ar verb." },
    118: { t: "Cocinar = cook. Regular -ar. La cocina = kitchen/cooking. El/la cocinero/a = cook." },
    119: { t: "Lavar = wash. Regular -ar. Lavarse = wash oneself. 'Lavo los platos' = I wash the dishes." },
    120: { t: "Limpiar = clean. Regular -ar. 'Limpiar la casa.' Limpio = clean (adjective)." },
    122: { refl: true,
      t: "Levantarse = get up (reflexive). Regular -ar. 'Me levanto temprano.' Levantar = lift/raise." },
    124: { t: "Nadar = swim. Regular -ar. 'Nadar en el mar.' Piscina = swimming pool." },
    126: { t: "Romper = break. Regular present. Past participle irregular: roto. 'Se rompió' = it broke." },
    130: { t: "Ganar = win/earn. Regular -ar. 'Ganar dinero' = earn money. 'Ganar un partido' = win a game." },
    132: { t: "Entrar = enter. Regular -ar. 'Entrar en la casa.' Note: use 'en' (not 'a')." },
    134: { t: "Parar = stop. Regular -ar. Also: detener (go verb, more formal). 'Para aquí' = stop here." },
    137: { t: "Girar = turn. Regular -ar. 'Gira a la derecha' = turn right. Also: voltear." },
    139: { t: "Pasar = happen/pass/spend time. Regular -ar. '¿Qué pasa?' = What's happening?" },
    141: { t: "Deber = must/should/owe. Regular -er. 'Debo estudiar' = I must study. Deber de = probably." },
    142: { t: "Esperar = wait/hope (same as id 83). Desear = wish/desire (regular, more formal)." },
    144: { t: "Cortar = cut. Regular -ar. 'Cortar el pan.' Cortarse = cut yourself." },
    145: { t: "Aceptar = accept. Regular -ar. 'Acepto la invitación.'" },
    146: { t: "Explicar = explain. Regular -ar. 'Explicar la lección.' ¿Me puedes explicar?" },
    147: { t: "Compartir = share. Regular -ir. 'Compartir con amigos.'" },
    148: { t: "Preparar = prepare. Regular -ar. 'Preparar la cena' = prepare dinner." },
    149: { t: "Decidir = decide. Regular -ir. 'Es difícil decidir.' Decisión = decision." },
    150: { t: "Pasar = pass/happen/spend time. Regular. '¿Cómo pasaste el fin de semana?'" },

    65: { t: "Comer = eat. Model -er verb. 'Vamos a comer' = let's eat. La comida = food/meal." },
    66: { t: "Beber = drink. Regular -er. 'Beber agua.' In speech, tomar is often used instead for drinks." },
    72: { t: "Escribir = write. Regular -ir present. Past participle irregular: escrito." },
    73: { t: "Leer = read. Regular present. 'Me gusta leer novelas.' Pretérito: leí, leíste, leyó..." },
    78: { t: "Vivir = live. Model -ir verb. Vivir = reside/be alive. 'Vivo en Madrid.'" },
    79: { t: "Creer = believe. Regular -er. 'Creo que sí' = I believe so. Also: think (opinion)." },
    133: { t: "Salir = leave/go out (same verb as id 80). 'Vamos a salir esta noche' = let's go out tonight." },
    138: { t: "Conocer = know/meet (same as id 60). Encontrarse = meet up (reflexive, o→ue)." },
  };

  // ============================================================
  //  UTILITY FUNCTIONS
  // ============================================================

  function getInfinitive(vocabId) {
    const word = VOCABULARY.find(w => w.id === vocabId);
    if (!word) return null;
    if (word.type !== 'verb') return null;
    let inf = word.es.split('/')[0].trim();
    return inf;
  }

  function getEnding(inf) {
    const clean = inf.replace(/se$/, '');
    if (clean.endsWith('ar')) return 'ar';
    if (clean.endsWith('er') || clean.endsWith('ér')) return 'er';
    if (clean.endsWith('ir') || clean.endsWith('ír')) return 'ir';
    return 'ar';
  }

  function getStem(inf) {
    const clean = inf.replace(/se$/, '');
    return clean.slice(0, -2);
  }

  function getCleanInfinitive(inf) {
    return inf.replace(/se$/, '');
  }

  function applyStemChange(stem, change) {
    const [from, to] = change.split('>');
    const lastIdx = stem.lastIndexOf(from);
    if (lastIdx === -1) return stem;
    return stem.slice(0, lastIdx) + to + stem.slice(lastIdx + from.length);
  }

  // ============================================================
  //  PRESENTE
  // ============================================================

  function conjugate(vocabId) {
    const data = DB[vocabId];
    const inf = getInfinitive(vocabId);
    if (!inf) return null;

    if (!data) {
      const end = getEnding(inf);
      const stem = getStem(inf);
      const isReflexive = inf.endsWith('se');
      const forms = PRESENT_ENDINGS[end].map(e => stem + e);
      return { forms, tip: null, pattern: `regular -${end}`, infinitive: inf, isReflexive };
    }

    const isReflexive = data.refl || inf.endsWith('se');

    if (data.p) {
      return { forms: data.p, tip: data.t, pattern: 'irregular', infinitive: inf, isReflexive };
    }

    const end = getEnding(inf);
    const stem = getStem(inf);
    let forms;

    if (data.sc) {
      const changedStem = applyStemChange(stem, data.sc);
      forms = PRESENT_ENDINGS[end].map((e, i) => (BOOT[i] ? changedStem : stem) + e);
    } else {
      forms = PRESENT_ENDINGS[end].map(e => stem + e);
    }

    if (data.yo) forms[0] = data.yo;

    let pattern = 'regular';
    if (data.sc && data.yo) pattern = `yo irregular + ${data.sc}`;
    else if (data.sc) pattern = `stem change ${data.sc}`;
    else if (data.yo) pattern = 'yo irregular';

    return { forms, tip: data.t, pattern, infinitive: inf, isReflexive };
  }

  // ============================================================
  //  PRETÉRITO INDEFINIDO
  // ============================================================

  function conjugatePreterite(vocabId) {
    const inf = getInfinitive(vocabId);
    if (!inf) return null;

    const data = DB[vocabId];
    const pretData = PRET_DB[vocabId];
    const isReflexive = (data && data.refl) || inf.endsWith('se');
    const end = getEnding(inf);
    const stem = getStem(inf);

    if (!data && !pretData) {
      const forms = PRETERITE_ENDINGS[end].map(e => stem + e);
      return { forms, isReflexive };
    }

    if (pretData && pretData.full) {
      return { forms: pretData.full, isReflexive };
    }

    if (pretData && pretData.st && !pretData.reg) {
      const st = pretData.st;
      const stForms = STRONG_PRET_ENDINGS.map((e, i) => st + e);
      if (pretData.p3) stForms[2] = pretData.p3;
      if (pretData.ieron) stForms[5] = pretData.ieron;
      return { forms: stForms, isReflexive };
    }

    if (pretData && pretData.sc3) {
      const sc3Forms = PRETERITE_ENDINGS[end].map(e => stem + e);
      const changedStem = applyStemChange(stem, pretData.sc3);
      sc3Forms[2] = changedStem + PRETERITE_ENDINGS[end][2];
      sc3Forms[5] = changedStem + PRETERITE_ENDINGS[end][5];
      return { forms: sc3Forms, isReflexive };
    }

    const regForms = PRETERITE_ENDINGS[end].map(e => stem + e);
    return { forms: regForms, isReflexive };
  }

  // ============================================================
  //  IMPERFECTO
  // ============================================================

  function conjugateImperfect(vocabId) {
    const inf = getInfinitive(vocabId);
    if (!inf) return null;

    const data = DB[vocabId];
    const isReflexive = (data && data.refl) || inf.endsWith('se');

    // Full override (ser, ir, ver)
    if (IMPERFECT_DB[vocabId]) {
      return { forms: IMPERFECT_DB[vocabId], isReflexive };
    }

    const end = getEnding(inf);
    const stem = getStem(inf);
    const forms = IMPERFECT_ENDINGS[end].map(e => stem + e);
    return { forms, isReflexive };
  }

  // ============================================================
  //  FUTURO SIMPLE
  // ============================================================

  function conjugateFuture(vocabId) {
    const inf = getInfinitive(vocabId);
    if (!inf) return null;

    const data = DB[vocabId];
    const isReflexive = (data && data.refl) || inf.endsWith('se');
    const cleanInf = getCleanInfinitive(inf);

    // Check for irregular future stem
    const irregStem = FUTURE_STEMS[vocabId];
    const futureStem = irregStem || cleanInf;

    const forms = FUTURE_ENDINGS.map(e => futureStem + e);
    return { forms, isReflexive, irregular: !!irregStem };
  }

  // ============================================================
  //  PARTICIPIO
  // ============================================================

  function getParticipio(vocabId) {
    const inf = getInfinitive(vocabId);
    if (!inf) return null;

    // Check irregular
    if (IRREGULAR_PARTICIPLES[vocabId]) {
      return { form: IRREGULAR_PARTICIPLES[vocabId], irregular: true };
    }

    const end = getEnding(inf);
    const stem = getStem(inf);

    if (end === 'ar') {
      return { form: stem + 'ado', irregular: false };
    } else {
      return { form: stem + 'ido', irregular: false };
    }
  }

  // ============================================================
  //  GERUNDIO
  // ============================================================

  function getGerundio(vocabId) {
    const inf = getInfinitive(vocabId);
    if (!inf) return null;

    // Check irregular
    if (IRREGULAR_GERUNDS[vocabId]) {
      return { form: IRREGULAR_GERUNDS[vocabId], irregular: true };
    }

    const end = getEnding(inf);
    const stem = getStem(inf);

    if (end === 'ar') {
      return { form: stem + 'ando', irregular: false };
    } else {
      return { form: stem + 'iendo', irregular: false };
    }
  }

  // ============================================================
  //  PRETÉRITO PERFECTO (haber + participio)
  // ============================================================

  const HABER_PRESENT = ['he', 'has', 'ha', 'hemos', 'habéis', 'han'];

  function conjugatePerfect(vocabId) {
    const part = getParticipio(vocabId);
    if (!part) return null;

    const inf = getInfinitive(vocabId);
    const data = DB[vocabId];
    const isReflexive = (data && data.refl) || inf.endsWith('se');

    const forms = HABER_PRESENT.map(h => h + ' ' + part.form);
    return { forms, isReflexive, participio: part.form, participioIrregular: part.irregular };
  }

  // ============================================================
  //  IMPERATIVO
  // ============================================================

  function conjugateImperative(vocabId) {
    const inf = getInfinitive(vocabId);
    if (!inf) return null;

    const data = DB[vocabId];
    const isReflexive = (data && data.refl) || inf.endsWith('se');
    const end = getEnding(inf);
    const stem = getStem(inf);

    // --- Tú affirmative ---
    let tu;
    if (IMPERATIVE_DB[vocabId] && IMPERATIVE_DB[vocabId].tu) {
      tu = IMPERATIVE_DB[vocabId].tu;
    } else if (data && data.sc) {
      // Stem-changing: tú imperative uses stem-changed form (like 3rd person present)
      const changedStem = applyStemChange(stem, data.sc);
      tu = changedStem + PRESENT_ENDINGS[end][2]; // use él/ella ending = -a/-e
    } else {
      // Regular: tú imperative = 3rd person present
      tu = stem + PRESENT_ENDINGS[end][2];
    }

    // --- Usted (= subjuntivo 3rd person) ---
    const subjData = conjugateSubjunctive(vocabId);
    const usted = subjData ? subjData.forms[2] : null;

    // --- Vosotros: infinitive → replace final -r with -d ---
    const cleanInf = getCleanInfinitive(inf);
    const vosotros = cleanInf.slice(0, -1) + 'd';

    // --- Ustedes (= subjuntivo ellos) ---
    const ustedes = subjData ? subjData.forms[5] : null;

    // --- Negativo (tú) = subjuntivo tú ---
    const tuNeg = subjData ? subjData.forms[1] : null;

    return {
      forms: { tu, usted, vosotros, ustedes, tuNeg },
      isReflexive,
    };
  }

  // ============================================================
  //  SUBJUNTIVO PRESENTE
  // ============================================================

  function conjugateSubjunctive(vocabId) {
    const inf = getInfinitive(vocabId);
    if (!inf) return null;

    const data = DB[vocabId];
    const isReflexive = (data && data.refl) || inf.endsWith('se');
    const end = getEnding(inf);
    const stem = getStem(inf);

    // Full override
    if (SUBJ_PRES_DB[vocabId]) {
      return { forms: SUBJ_PRES_DB[vocabId], isReflexive };
    }

    const endings = SUBJ_PRES_ENDINGS[end];

    // For -go verbs or -zco verbs: subjunctive based on yo form
    if (data && data.yo) {
      // Derive subjunctive stem from yo form (remove final -o)
      const yoStem = data.yo.replace(/o$/, '');
      let forms;
      if (data.sc) {
        // -go + stem change: boot pattern applies in subjunctive too
        // BUT nosotros/vosotros use the yo-stem WITHOUT the present stem change
        // For e>ie verbs like tener: tenga, tengas, tenga, tengamos, tengáis, tengan (all from yo stem!)
        // For e>i verbs like decir: diga, digas, diga, digamos, digáis, digan (all from yo stem!)
        forms = endings.map((e, i) => yoStem + e);
      } else {
        // yo irregular only (hago, salgo, etc.) — all forms from yo stem
        forms = endings.map(e => yoStem + e);
      }
      return { forms, isReflexive };
    }

    // Stem-changing verbs in subjunctive:
    // -ar/-er: boot pattern same as present (nosotros/vosotros regular)
    // -ir with e>ie: boot positions get ie, but nosotros/vosotros get i (!)
    // -ir with o>ue: boot positions get ue, but nosotros/vosotros get u (!)
    // -ir with e>i: ALL positions get i
    if (data && data.sc) {
      const changedStem = applyStemChange(stem, data.sc);
      let forms;

      if (end === 'ir' && data.sc === 'e>ie') {
        // e>ie in boot, e>i in nosotros/vosotros
        const nosVosStem = applyStemChange(stem, 'e>i');
        forms = endings.map((e, i) => {
          if (BOOT[i]) return changedStem + e;
          return nosVosStem + e;
        });
      } else if (end === 'ir' && data.sc === 'o>ue') {
        // o>ue in boot, o>u in nosotros/vosotros
        const nosVosStem = applyStemChange(stem, 'o>u');
        forms = endings.map((e, i) => {
          if (BOOT[i]) return changedStem + e;
          return nosVosStem + e;
        });
      } else if (data.sc === 'e>i') {
        // e>i in ALL positions (pedir: pida, pidas, pida, pidamos, pidáis, pidan)
        forms = endings.map(e => changedStem + e);
      } else {
        // -ar/-er stem change: boot pattern only
        forms = endings.map((e, i) => (BOOT[i] ? changedStem : stem) + e);
      }
      return { forms, isReflexive };
    }

    // Regular subjunctive
    const forms = endings.map(e => stem + e);
    return { forms, isReflexive };
  }

  // ============================================================
  //  HELPER FUNCTIONS
  // ============================================================

  function isVerb(vocabId) {
    if (DB[vocabId] !== undefined) return true;
    const word = VOCABULARY.find(w => w.id === vocabId);
    return word && word.type === 'verb';
  }

  function getAllVerbs() {
    const dbIds = new Set(Object.keys(DB).map(Number));
    const allIds = new Set(dbIds);
    for (const w of VOCABULARY) {
      if (w.type === 'verb') allIds.add(w.id);
    }
    return [...allIds].sort((a, b) => a - b);
  }

  // ============================================================
  //  VERB SUMMARY (context-aware description)
  // ============================================================

  function getVerbSummary(vocabId) {
    const data = DB[vocabId];
    const inf = getInfinitive(vocabId);
    if (!inf) return null;

    const word = VOCABULARY.find(w => w.id === vocabId);
    const end = getEnding(inf);
    const isReflexive = (data && data.refl) || inf.endsWith('se');
    const pretData = PRET_DB[vocabId];
    const parts = [];

    // 1) Verb class identifier
    if (!data || (!data.p && !data.sc && !data.yo)) {
      parts.push(`📗 Regelmatig -${end} werkwoord — volgt standaardpatroon`);
    } else if (data.p) {
      parts.push(`📕 Volledig onregelmatig — moet uit het hoofd geleerd worden`);
    } else if (data.sc && data.yo) {
      parts.push(`📙 Dubbel onregelmatig: yo-vorm (${data.yo}) + stamverandering ${data.sc}`);
    } else if (data.yo) {
      const isZco = data.yo.endsWith('zco');
      if (isZco) {
        parts.push(`📙 -cer/-cir werkwoord: yo → ${data.yo} (-zco), rest regelmatig -${end}`);
      } else {
        parts.push(`📙 -go werkwoord: yo → ${data.yo}, rest regelmatig -${end}`);
      }
    } else if (data.sc) {
      parts.push(`📙 Stamverandering ${data.sc} in "boot pattern" (yo/tú/él/ellos), nosotros/vosotros normaal`);
    }

    // 2) Reflexive info
    if (isReflexive) {
      parts.push(`🔄 Wederkerend werkwoord — me/te/se/nos/os/se vóór de vorm`);
    }

    // 3) Preterite irregularity
    if (pretData) {
      if (pretData.full) {
        parts.push(`⏪ Pretérito indefinido: volledig onregelmatig`);
      } else if (pretData.st && !pretData.reg) {
        parts.push(`⏪ Pretérito indefinido: sterke stam "${pretData.st}" + speciale uitgangen`);
      } else if (pretData.sc3) {
        parts.push(`⏪ Pretérito indefinido: stamverandering ${pretData.sc3} in 3e persoon (él/ellos)`);
      }
    } else {
      parts.push(`⏪ Pretérito indefinido: regelmatig -${end} uitgangen`);
    }

    // 4) Imperfect info
    if (IMPERFECT_DB[vocabId]) {
      parts.push(`🕰️ Imperfecto: onregelmatig — moet uit hoofd geleerd`);
    } else {
      parts.push(`🕰️ Imperfecto: regelmatig (bijna alle werkwoorden zijn regelmatig!)`);
    }

    // 5) Future info
    if (FUTURE_STEMS[vocabId]) {
      parts.push(`🔮 Futuro: onregelmatige stam "${FUTURE_STEMS[vocabId]}" + standaarduitgangen`);
    }

    // 6) Participio + Gerundio irregularities
    const part = getParticipio(vocabId);
    const ger = getGerundio(vocabId);
    if (part && part.irregular) {
      parts.push(`📝 Participio onregelmatig: ${part.form} (nodig voor he/has/ha + …)`);
    }
    if (ger && ger.irregular) {
      parts.push(`📝 Gerundio onregelmatig: ${ger.form}`);
    }

    // 7) Multiple Spanish forms
    if (word && word.es.includes('/')) {
      const alts = word.es.split('/').map(s => s.trim());
      parts.push(`⚠️ Meerdere vormen: ${alts.join(' / ')}`);
    }

    // 8) Dutch context
    if (word) {
      const nlWords = word.nl.split(/[,/]/).map(s => s.trim());
      const sharedNl = [];
      for (const otherWord of VOCABULARY) {
        if (otherWord.id === vocabId || otherWord.type !== 'verb') continue;
        const otherNl = otherWord.nl.toLowerCase().split(/[,/]/).map(s => s.trim());
        const overlap = nlWords.filter(n => otherNl.some(on => on === n.toLowerCase() || n.toLowerCase() === on));
        if (overlap.length > 0) {
          sharedNl.push({ es: otherWord.es.split('/')[0].trim(), nl: overlap.join('/'), en: otherWord.en });
        }
      }
      if (sharedNl.length > 0) {
        const otherList = sharedNl.slice(0, 3).map(s => `${s.es} (${s.en})`).join(', ');
        parts.push(`🇳🇱 NL "${nlWords[0]}" is ook: ${otherList} — let op het verschil!`);
      }
    }

    // 9) Model verb mention
    const modelVerbs = {
      ar: { id: 67, name: 'hablar' },
      er: { id: 65, name: 'comer' },
      ir: { id: 78, name: 'vivir' },
    };
    if (data && !data.p && !data.sc && !data.yo && modelVerbs[end]) {
      if (vocabId !== modelVerbs[end].id) {
        parts.push(`📝 Vervoeg zoals ${modelVerbs[end].name} (model -${end} werkwoord)`);
      } else {
        parts.push(`📝 Dit is HET model -${end} werkwoord — gebruik als voorbeeld`);
      }
    }

    return parts;
  }

  // ============================================================
  //  SIMILAR VERBS
  // ============================================================

  function getSimilarVerbs(vocabId) {
    const data = DB[vocabId];
    const inf = getInfinitive(vocabId);
    if (!inf) return [];
    const end = getEnding(inf);
    const similar = [];

    if (!data || (!data.p && !data.sc && !data.yo)) {
      for (const otherId of getAllVerbs()) {
        if (otherId === vocabId) continue;
        const otherData = DB[otherId];
        if (!otherData || otherData.p || otherData.sc || otherData.yo) continue;
        const otherInf = getInfinitive(otherId);
        if (!otherInf) continue;
        if (getEnding(otherInf) !== end) continue;
        const otherWord = VOCABULARY.find(w => w.id === otherId);
        similar.push({
          id: otherId, infinitive: otherInf,
          meaning: otherWord ? otherWord.en : '',
          reason: `ook regelmatig -${end}`,
        });
        if (similar.length >= 5) break;
      }
      return similar;
    }

    for (const otherId of getAllVerbs()) {
      if (otherId === vocabId) continue;
      const otherData = DB[otherId];
      if (!otherData) continue;
      const otherInf = getInfinitive(otherId);
      if (!otherInf) continue;
      const otherEnd = getEnding(otherInf);

      let reason = null;
      if (data.sc && otherData.sc && data.sc === otherData.sc && otherEnd === end) {
        reason = `zelfde stamverandering ${data.sc}`;
      } else if (data.yo && otherData.yo && !data.yo.endsWith('zco') && !otherData.yo.endsWith('zco') &&
                 (data.yo.endsWith('go') && otherData.yo.endsWith('go'))) {
        reason = `ook -go in yo-vorm`;
      } else if (data.yo && otherData.yo && data.yo.endsWith('zco') && otherData.yo.endsWith('zco')) {
        reason = `ook -zco in yo-vorm`;
      }

      if (reason) {
        const otherWord = VOCABULARY.find(w => w.id === otherId);
        similar.push({ id: otherId, infinitive: otherInf, meaning: otherWord ? otherWord.en : '', reason });
      }
    }

    return similar.slice(0, 5);
  }

  // ============================================================
  //  RELATED WORDS
  // ============================================================

  function getRelatedWords(vocabId) {
    const word = VOCABULARY.find(w => w.id === vocabId);
    if (!word) return [];

    const related = [];
    const enWords = word.en.toLowerCase().split(/[,/]/).map(s => s.trim().replace(/^to /, ''));

    for (const otherWord of VOCABULARY) {
      if (otherWord.id === vocabId) continue;
      if (otherWord.type !== 'verb') continue;
      const otherEnWords = otherWord.en.toLowerCase().split(/[,/]/).map(s => s.trim().replace(/^to /, ''));
      const overlap = enWords.filter(w => otherEnWords.some(ow => ow.includes(w) || w.includes(ow)));
      if (overlap.length > 0) {
        related.push({ id: otherWord.id, es: otherWord.es, en: otherWord.en, nl: otherWord.nl, overlap: overlap.join(', ') });
      }
    }
    return related.slice(0, 4);
  }

  // ============================================================
  //  PATTERN GROUPS
  // ============================================================

  function getPatternGroups() {
    const groups = {
      'Irregular': { desc: 'Fully irregular — must be memorized individually', verbs: [] },
      'Yo irregular (-go)': { desc: 'Only the yo form is irregular, ending in -go', verbs: [] },
      'Yo irregular (-zco)': { desc: 'Verbs ending in -cer/-cir: yo form ends in -zco', verbs: [] },
      'Stem change e→ie': { desc: 'The stressed e becomes ie in the boot pattern', verbs: [] },
      'Stem change o→ue': { desc: 'The stressed o becomes ue in the boot pattern', verbs: [] },
      'Stem change e→i': { desc: 'The stressed e becomes i in the boot pattern (-ir verbs only)', verbs: [] },
      'Stem change u→ue': { desc: 'Unique: only jugar has this change', verbs: [] },
      'Regular -ar': { desc: 'Follow the standard -ar pattern', verbs: [] },
      'Regular -er': { desc: 'Follow the standard -er pattern', verbs: [] },
      'Regular -ir': { desc: 'Follow the standard -ir pattern', verbs: [] },
    };

    for (const id of getAllVerbs()) {
      const data = DB[id];
      const inf = getInfinitive(id);
      if (!inf) continue;
      const end = getEnding(inf);

      if (!data || (!data.p && !data.sc && !data.yo)) {
        if (end === 'ar') groups['Regular -ar'].verbs.push(id);
        else if (end === 'er') groups['Regular -er'].verbs.push(id);
        else groups['Regular -ir'].verbs.push(id);
      } else if (data.p) groups['Irregular'].verbs.push(id);
      else if (data.yo && data.sc) {
        if (data.sc === 'e>i') groups['Stem change e→i'].verbs.push(id);
        else groups['Yo irregular (-go)'].verbs.push(id);
      }
      else if (data.yo) {
        groups[data.yo.endsWith('zco') ? 'Yo irregular (-zco)' : 'Yo irregular (-go)'].verbs.push(id);
      }
      else if (data.sc === 'e>ie') groups['Stem change e→ie'].verbs.push(id);
      else if (data.sc === 'o>ue') groups['Stem change o→ue'].verbs.push(id);
      else if (data.sc === 'e>i') groups['Stem change e→i'].verbs.push(id);
      else if (data.sc === 'u>ue') groups['Stem change u→ue'].verbs.push(id);
    }

    const result = {};
    for (const [name, group] of Object.entries(groups)) {
      if (group.verbs.length > 0) result[name] = group;
    }
    return result;
  }

  // ============================================================
  //  PUBLIC API
  // ============================================================

  return {
    conjugate,
    conjugatePreterite,
    conjugateImperfect,
    conjugateFuture,
    conjugatePerfect,
    conjugateSubjunctive,
    conjugateImperative,
    getParticipio,
    getGerundio,
    isVerb,
    getAllVerbs,
    getPatternGroups,
    getVerbSummary,
    getSimilarVerbs,
    getRelatedWords,
    SUBJECTS,
    REFL_PRONOUNS,
  };
})();
