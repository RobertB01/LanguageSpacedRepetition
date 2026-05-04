// Reference page — quick-lookup tables for things that don't fit SRS:
// numbers, ordinals, dates, time-telling, fractions, common quantity phrases.
// Pure read-only tables. Click a Spanish phrase to hear it via TTS.

const Reference = (() => {

  // ── Data ─────────────────────────────────────────────────────────────────

  const cardinals0to20 = [
    [0, "cero"], [1, "uno"], [2, "dos"], [3, "tres"], [4, "cuatro"],
    [5, "cinco"], [6, "seis"], [7, "siete"], [8, "ocho"], [9, "nueve"],
    [10, "diez"], [11, "once"], [12, "doce"], [13, "trece"], [14, "catorce"],
    [15, "quince"], [16, "dieciséis"], [17, "diecisiete"], [18, "dieciocho"],
    [19, "diecinueve"], [20, "veinte"],
  ];

  const cardinals21to30 = [
    [21, "veintiuno"], [22, "veintidós"], [23, "veintitrés"], [24, "veinticuatro"],
    [25, "veinticinco"], [26, "veintiséis"], [27, "veintisiete"], [28, "veintiocho"],
    [29, "veintinueve"], [30, "treinta"],
  ];

  const tens = [
    [30, "treinta"], [40, "cuarenta"], [50, "cincuenta"], [60, "sesenta"],
    [70, "setenta"], [80, "ochenta"], [90, "noventa"], [100, "cien / ciento"],
  ];

  const examples31plus = [
    [31, "treinta y uno"], [42, "cuarenta y dos"], [55, "cincuenta y cinco"],
    [67, "sesenta y siete"], [78, "setenta y ocho"], [89, "ochenta y nueve"],
    [99, "noventa y nueve"],
  ];

  const hundreds = [
    [100, "cien"], [101, "ciento uno"], [200, "doscientos"], [300, "trescientos"],
    [400, "cuatrocientos"], [500, "quinientos"], [600, "seiscientos"],
    [700, "setecientos"], [800, "ochocientos"], [900, "novecientos"],
  ];

  const bigNumbers = [
    [1000, "mil"], [1001, "mil uno"], [2000, "dos mil"],
    [10000, "diez mil"], [100000, "cien mil"],
    [1000000, "un millón"], [2000000, "dos millones"],
    [1000000000, "mil millones / un millardo"],
  ];

  const ordinals = [
    ["1.º", "primero / primer"],
    ["2.º", "segundo"],
    ["3.º", "tercero / tercer"],
    ["4.º", "cuarto"],
    ["5.º", "quinto"],
    ["6.º", "sexto"],
    ["7.º", "séptimo"],
    ["8.º", "octavo"],
    ["9.º", "noveno"],
    ["10.º", "décimo"],
    ["11.º", "undécimo / decimoprimero"],
    ["12.º", "duodécimo / decimosegundo"],
    ["20.º", "vigésimo"],
    ["100.º", "centésimo"],
    ["1000.º", "milésimo"],
  ];

  const days = [
    ["Monday", "lunes"], ["Tuesday", "martes"], ["Wednesday", "miércoles"],
    ["Thursday", "jueves"], ["Friday", "viernes"], ["Saturday", "sábado"],
    ["Sunday", "domingo"],
  ];

  const months = [
    ["January", "enero"], ["February", "febrero"], ["March", "marzo"],
    ["April", "abril"], ["May", "mayo"], ["June", "junio"],
    ["July", "julio"], ["August", "agosto"], ["September", "septiembre"],
    ["October", "octubre"], ["November", "noviembre"], ["December", "diciembre"],
  ];

  const dateExamples = [
    ["May 5th, 2024", "el 5 de mayo de 2024"],
    ["What's the date?", "¿Qué fecha es hoy? / ¿A cuántos estamos?"],
    ["Today is the 12th", "Hoy es 12 / Estamos a 12"],
    ["On Monday", "el lunes"],
    ["On Mondays", "los lunes"],
    ["Last Friday", "el viernes pasado"],
    ["Next Tuesday", "el martes que viene / el próximo martes"],
    ["This weekend", "este fin de semana"],
    ["The day before yesterday", "anteayer"],
    ["The day after tomorrow", "pasado mañana"],
    ["In two weeks", "dentro de dos semanas"],
    ["A week ago", "hace una semana"],
  ];

  const timeExamples = [
    ["What time is it?", "¿Qué hora es?"],
    ["It's one o'clock", "Es la una"],
    ["It's three o'clock", "Son las tres"],
    ["It's 3:15", "Son las tres y cuarto"],
    ["It's 3:30", "Son las tres y media"],
    ["It's 3:45", "Son las cuatro menos cuarto"],
    ["It's 3:10", "Son las tres y diez"],
    ["It's 3:50", "Son las cuatro menos diez"],
    ["At noon", "al mediodía"],
    ["At midnight", "a medianoche"],
    ["In the morning", "por la mañana / de la mañana"],
    ["In the afternoon", "por la tarde / de la tarde"],
    ["At night", "por la noche / de la noche"],
    ["Sharp / on the dot", "en punto"],
    ["A quarter past", "y cuarto"],
    ["Half past", "y media"],
    ["A quarter to", "menos cuarto"],
  ];

  const fractions = [
    ["1/2", "un medio / la mitad"],
    ["1/3", "un tercio"],
    ["2/3", "dos tercios"],
    ["1/4", "un cuarto"],
    ["3/4", "tres cuartos"],
    ["1/5", "un quinto"],
    ["1/10", "un décimo"],
    ["1/100", "un centésimo / un por ciento"],
    ["50%", "cincuenta por ciento"],
    ["double", "el doble"],
    ["triple", "el triple"],
    ["half (a)", "medio / media (e.g. media hora)"],
  ];

  const ageExamples = [
    ["How old are you?", "¿Cuántos años tienes?"],
    ["I'm 25 years old", "Tengo veinticinco años"],
    ["He's 5 years old", "Tiene cinco años"],
    ["She's almost 30", "Tiene casi treinta años"],
    ["A 2-year-old child", "un niño de dos años"],
  ];

  const priceExamples = [
    ["How much is it?", "¿Cuánto cuesta? / ¿Cuánto es?"],
    ["It costs €15", "Cuesta quince euros"],
    ["€2.50", "dos euros con cincuenta / dos cincuenta"],
    ["A 20% discount", "un descuento del veinte por ciento"],
    ["Three for €10", "tres por diez euros"],
    ["The total is €47", "el total es de cuarenta y siete euros"],
  ];

  const quantityPhrases = [
    ["a lot of", "mucho / mucha / muchos / muchas"],
    ["a little (uncountable)", "un poco de"],
    ["few / a few", "unos pocos / unas pocas"],
    ["several", "varios / varias"],
    ["enough", "bastante / suficiente"],
    ["too much / too many", "demasiado / demasiados"],
    ["both", "ambos / los dos"],
    ["all", "todo / todos"],
    ["none / nothing", "ninguno / nada"],
    ["each / every", "cada"],
    ["a pair of", "un par de"],
    ["a dozen", "una docena"],
    ["half a dozen", "media docena"],
    ["a hundred", "cien / un centenar"],
    ["a thousand", "mil / un millar"],
  ];

  const measureExamples = [
    ["1 kilogram (kg)", "un kilo / un kilogramo"],
    ["500 grams", "quinientos gramos / medio kilo"],
    ["1 liter", "un litro"],
    ["half a liter", "medio litro"],
    ["1 meter", "un metro"],
    ["1 centimeter", "un centímetro"],
    ["1 kilometer", "un kilómetro"],
    ["a slice of", "una rodaja de / una loncha de"],
    ["a piece of", "un trozo de / un pedazo de"],
    ["a glass of", "un vaso de"],
    ["a cup of", "una taza de"],
    ["a bottle of", "una botella de"],
  ];

  // ── Rendering helpers ────────────────────────────────────────────────────

  function _esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function _row(left, right) {
    const speakable = String(right).split(' / ')[0]; // first variant only
    return `<tr>
      <td class="ref-left">${_esc(String(left))}</td>
      <td class="ref-right">
        <span class="ref-es" data-speak="${_esc(speakable)}">${_esc(String(right))}</span>
      </td>
    </tr>`;
  }

  function _table(title, rows, headLeft = "English", headRight = "Español") {
    return `
      <section class="ref-section">
        <h3>${_esc(title)}</h3>
        <table class="ref-table">
          <thead><tr><th>${_esc(headLeft)}</th><th>${_esc(headRight)}</th></tr></thead>
          <tbody>
            ${rows.map(([l, r]) => _row(l, r)).join('')}
          </tbody>
        </table>
      </section>
    `;
  }

  function render() {
    return `
      <div class="reference-page fade-in">
        <div class="reference-header">
          <h2>📚 Reference</h2>
          <p class="reference-sub">
            Quick-lookup tables for numbers, dates, times, and other patterns
            that work better as a reference than as flashcards.
            Tap any Spanish phrase to hear it.
          </p>
        </div>

        <nav class="ref-toc">
          <a href="#ref-numbers">Numbers</a>
          <a href="#ref-ordinals">Ordinals</a>
          <a href="#ref-days">Days &amp; months</a>
          <a href="#ref-dates">Dates</a>
          <a href="#ref-time">Time</a>
          <a href="#ref-fractions">Fractions</a>
          <a href="#ref-age">Age &amp; price</a>
          <a href="#ref-quantity">Quantities</a>
          <a href="#ref-measures">Measures</a>
        </nav>

        <div id="ref-numbers">
          ${_table("Numbers 0–20", cardinals0to20, "Number", "Español")}
          ${_table("Numbers 21–30", cardinals21to30, "Number", "Español")}
          ${_table("Tens (30–100)", tens, "Number", "Español")}
          ${_table("Compound numbers (31–99)", examples31plus, "Number", "Español")}
          ${_table("Hundreds", hundreds, "Number", "Español")}
          ${_table("Thousands & millions", bigNumbers, "Number", "Español")}
        </div>

        <div id="ref-ordinals">
          ${_table("Ordinal numbers", ordinals, "Position", "Español")}
          <p class="ref-note">
            <em>Note:</em> <code>primero</code> and <code>tercero</code> drop the final <code>-o</code>
            before a masculine singular noun → <code>el primer día</code>, <code>el tercer piso</code>.
            Beyond 10th, native speakers usually just use the cardinal: <em>el siglo veintiuno</em>.
          </p>
        </div>

        <div id="ref-days">
          ${_table("Days of the week", days, "English", "Español")}
          ${_table("Months", months, "English", "Español")}
          <p class="ref-note">
            <em>Note:</em> days and months are written in <strong>lowercase</strong> in Spanish.
          </p>
        </div>

        <div id="ref-dates">
          ${_table("Dates & calendar phrases", dateExamples)}
        </div>

        <div id="ref-time">
          ${_table("Telling the time", timeExamples)}
          <p class="ref-note">
            <em>Pattern:</em> use <strong>es la</strong> for 1:00, <strong>son las</strong> for 2:00 onwards.
            Past the half-hour, Spanish typically counts <em>down</em> from the next hour:
            3:50 = <em>las cuatro menos diez</em>.
          </p>
        </div>

        <div id="ref-fractions">
          ${_table("Fractions & percentages", fractions, "English", "Español")}
        </div>

        <div id="ref-age">
          ${_table("Age", ageExamples)}
          ${_table("Prices", priceExamples)}
        </div>

        <div id="ref-quantity">
          ${_table("Quantity expressions", quantityPhrases)}
        </div>

        <div id="ref-measures">
          ${_table("Measures & containers", measureExamples)}
        </div>
      </div>
    `;
  }

  function bind() {
    // Click a Spanish phrase to hear it via TTS (if available).
    const root = document.querySelector('.reference-page');
    if (!root) return;
    root.querySelectorAll('.ref-es[data-speak]').forEach(el => {
      el.addEventListener('click', () => {
        const text = el.getAttribute('data-speak');
        if (typeof TTS !== 'undefined' && TTS.speak) {
          TTS.speak(text, 'es');
        }
      });
    });

    // Smooth scroll for the table-of-contents anchors.
    root.querySelectorAll('.ref-toc a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const id = a.getAttribute('href').slice(1);
        const target = document.getElementById(id);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  return { render, bind };
})();
