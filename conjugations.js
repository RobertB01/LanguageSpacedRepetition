// Spanish Verb Conjugation Engine + Data
// Present tense conjugations for all verbs in vocabulary.js (IDs 51-150)
// Includes learning tips focused on practical Spanish usage

const CONJUGATIONS = (() => {
  const SUBJECTS = ['yo', 'tú', 'él/ella', 'nosotros', 'vosotros', 'ellos/ellas'];
  const REFL_PRONOUNS = ['me', 'te', 'se', 'nos', 'os', 'se'];

  const PRESENT_ENDINGS = {
    ar: ['o', 'as', 'a', 'amos', 'áis', 'an'],
    er: ['o', 'es', 'e', 'emos', 'éis', 'en'],
    ir: ['o', 'es', 'e', 'imos', 'ís', 'en'],
  };

  // Boot pattern: positions 0,1,2,5 get stem change (not nosotros/vosotros)
  const BOOT = [true, true, true, false, false, true];

  // --- Verb Database ---
  // Keys: vocabulary ID
  // Fields: p = full present override, yo = yo form override, sc = stem change, t = tip, refl = reflexive
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

    // Regular verbs with basic conjugation
    65: { t: "Comer = eat. Model -er verb. 'Vamos a comer' = let's eat. La comida = food/meal." },
    66: { t: "Beber = drink. Regular -er. 'Beber agua.' In speech, tomar is often used instead for drinks." },
    72: { t: "Escribir = write. Regular -ir present. Past participle irregular: escrito." },
    73: { t: "Leer = read. Regular present. 'Me gusta leer novelas.' Pretérito: leí, leíste, leyó..." },
    78: { t: "Vivir = live. Model -ir verb. Vivir = reside/be alive. 'Vivo en Madrid.'" },
    79: { t: "Creer = believe. Regular -er. 'Creo que sí' = I believe so. Also: think (opinion)." },
    133: { t: "Salir = leave/go out (same verb as id 80). 'Vamos a salir esta noche' = let's go out tonight." },
    138: { t: "Conocer = know/meet (same as id 60). Encontrarse = meet up (reflexive, o→ue)." },
  };

  // --- Engine ---

  function getInfinitive(vocabId) {
    const word = VOCABULARY.find(w => w.id === vocabId);
    if (!word) return null;
    if (word.type !== 'verb') return null;
    // Take first verb if multiple: "empezar / comenzar" → "empezar"
    let inf = word.es.split('/')[0].trim();
    // Handle reflexive: remove "se" at end for lookup
    return inf;
  }

  function getEnding(inf) {
    const clean = inf.replace(/se$/, '');
    if (clean.endsWith('ar')) return 'ar';
    if (clean.endsWith('er') || clean.endsWith('ér')) return 'er';
    if (clean.endsWith('ir') || clean.endsWith('ír')) return 'ir';
    return 'ar'; // fallback
  }

  function getStem(inf) {
    const clean = inf.replace(/se$/, '');
    return clean.slice(0, -2);
  }

  function applyStemChange(stem, change) {
    const [from, to] = change.split('>');
    const lastIdx = stem.lastIndexOf(from);
    if (lastIdx === -1) return stem;
    return stem.slice(0, lastIdx) + to + stem.slice(lastIdx + from.length);
  }

  function conjugate(vocabId) {
    const data = DB[vocabId];
    if (!data) return null;

    const inf = getInfinitive(vocabId);
    if (!inf) return null;

    const isReflexive = data.refl || inf.endsWith('se');

    // Full present override
    if (data.p) {
      return {
        forms: data.p,
        tip: data.t,
        pattern: 'irregular',
        infinitive: inf,
        isReflexive,
      };
    }

    const end = getEnding(inf);
    const stem = getStem(inf);
    let forms;

    if (data.sc) {
      // Stem-changing verb
      const changedStem = applyStemChange(stem, data.sc);
      forms = PRESENT_ENDINGS[end].map((e, i) => (BOOT[i] ? changedStem : stem) + e);
    } else {
      // Regular
      forms = PRESENT_ENDINGS[end].map(e => stem + e);
    }

    // Override yo form if specified
    if (data.yo) forms[0] = data.yo;

    // Determine pattern description
    let pattern = 'regular';
    if (data.sc && data.yo) pattern = `yo irregular + ${data.sc}`;
    else if (data.sc) pattern = `stem change ${data.sc}`;
    else if (data.yo) pattern = 'yo irregular';

    return {
      forms,
      tip: data.t,
      pattern,
      infinitive: inf,
      isReflexive,
    };
  }

  function isVerb(vocabId) {
    return DB[vocabId] !== undefined;
  }

  function getAllVerbs() {
    return Object.keys(DB).map(Number).sort((a, b) => a - b);
  }

  // Group verbs by pattern for the reference page
  function getPatternGroups() {
    const groups = {
      'Irregular': { desc: 'Fully irregular — must be memorized individually', verbs: [] },
      'Yo irregular (-go)': { desc: 'Only the yo form is irregular, ending in -go', verbs: [] },
      'Yo irregular (-zco)': { desc: 'Verbs ending in -cer/-cir: yo form ends in -zco', verbs: [] },
      'Stem change e→ie': { desc: 'The stressed e becomes ie in the boot pattern (not nosotros/vosotros)', verbs: [] },
      'Stem change o→ue': { desc: 'The stressed o becomes ue in the boot pattern', verbs: [] },
      'Stem change e→i': { desc: 'The stressed e becomes i in the boot pattern (-ir verbs only)', verbs: [] },
      'Stem change u→ue': { desc: 'Unique: only jugar has this change', verbs: [] },
      'Regular -ar': { desc: 'Follow the standard -ar pattern: -o, -as, -a, -amos, -áis, -an', verbs: [] },
      'Regular -er': { desc: 'Follow the standard -er pattern: -o, -es, -e, -emos, -éis, -en', verbs: [] },
      'Regular -ir': { desc: 'Follow the standard -ir pattern: -o, -es, -e, -imos, -ís, -en', verbs: [] },
    };

    for (const id of getAllVerbs()) {
      const data = DB[id];
      const inf = getInfinitive(id);
      if (!inf) continue;
      const end = getEnding(inf);

      if (data.p) groups['Irregular'].verbs.push(id);
      else if (data.yo && data.sc) {
        if (data.sc === 'e>i') groups['Stem change e→i'].verbs.push(id);
        else if (data.sc === 'e>ie') groups['Yo irregular (-go)'].verbs.push(id);
        else groups['Yo irregular (-go)'].verbs.push(id);
      }
      else if (data.yo) {
        const isZco = data.yo.endsWith('zco');
        if (isZco) groups['Yo irregular (-zco)'].verbs.push(id);
        else groups['Yo irregular (-go)'].verbs.push(id);
      }
      else if (data.sc === 'e>ie') groups['Stem change e→ie'].verbs.push(id);
      else if (data.sc === 'o>ue') groups['Stem change o→ue'].verbs.push(id);
      else if (data.sc === 'e>i') groups['Stem change e→i'].verbs.push(id);
      else if (data.sc === 'u>ue') groups['Stem change u→ue'].verbs.push(id);
      else if (end === 'ar') groups['Regular -ar'].verbs.push(id);
      else if (end === 'er') groups['Regular -er'].verbs.push(id);
      else if (end === 'ir') groups['Regular -ir'].verbs.push(id);
    }

    // Filter out empty groups
    const result = {};
    for (const [name, group] of Object.entries(groups)) {
      if (group.verbs.length > 0) result[name] = group;
    }
    return result;
  }

  return { conjugate, isVerb, getAllVerbs, getPatternGroups, SUBJECTS, REFL_PRONOUNS };
})();
