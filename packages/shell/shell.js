// Everything is wrapped in one function so no variable leaks into the global space.
(function () {
  // C is this sim's config (title, subject). S is the sim's own code.
  // Both are created by the sim's files, which load before this one.
  var C = window.SKUU_CONFIG;
  var S = window.SKUU_SIM;
  var lang = 'en'; // English is the default language

  // The shell's own words, in both languages. The sim supplies its own words separately.
  var UI = {
    en: {
      controls: 'Controls',
      restore: 'Restore defaults',
      restoreTip: 'Reset the simulation to its starting state',
      language: 'Language',
      canvasLabel: 'Simulation canvas',
      footer: 'Skuulabs'
    },
    fr: {
      controls: 'Commandes',
      restore: 'Rétablir les valeurs par défaut',
      restoreTip: 'Remettre la simulation à son état initial',
      language: 'Langue',
      canvasLabel: 'Zone de simulation',
      footer: 'Skuulabs'
    }
  };

  // Small shortcuts for finding elements on the page
  function $(sel) { return document.querySelector(sel); }
  function all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  var canvas = $('#canvas');
  var ctx = canvas.getContext('2d'); // the 2D drawing tool for the canvas

  // Look up a word by its key. Try the shell's dictionary first, then the sim's,
  // and if neither has it, show the key itself so a missing translation is easy to spot.
  function t(key) {
    if (UI[lang][key]) return UI[lang][key];
    var strings = S && S.strings && S.strings[lang];
    return (strings && strings[key]) || key;
  }

  // Resize the canvas to its container and ask the sim to draw.
  // On sharp screens (dpr above 1) the canvas gets more pixels than its CSS size,
  // otherwise drawings look blurry. setTransform scales our drawing back to match.
  function draw() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // The sim draws using the width and height we give it, and the lookup function t
    if (S && S.draw) S.draw(ctx, rect.width, rect.height, t);
  }

  // Update everything the learner can see or hear to the current language.
  // No reload needed: we just rewrite the text in place.
  function applyLanguage() {
    document.documentElement.lang = lang;   // tells browsers and screen readers the language
    document.title = C.title[lang];         // the browser tab title
    $('#sim-title').textContent = C.title[lang];
    $('#sim-subject').textContent = C.subject[lang];

    // Every element marked data-i18n gets its text from the dictionary
    all('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    // Every element marked data-i18n-tip gets a tooltip and an accessible label
    all('[data-i18n-tip]').forEach(function (el) {
      var text = t(el.getAttribute('data-i18n-tip'));
      el.title = text;
      el.setAttribute('aria-label', text);
    });
    // The language buttons: mark the active one and set their tooltips
    all('[data-lang]').forEach(function (btn) {
      var code = btn.getAttribute('data-lang');
      var tip = btn.getAttribute('data-tip-' + lang);
      btn.setAttribute('aria-pressed', String(code === lang));
      btn.title = tip;
      btn.setAttribute('aria-label', tip);
    });

    // Let the sim update any words of its own, then redraw the canvas
    if (S && S.onLang) S.onLang(lang, t);
    draw();
  }

  // Clicking EN or FR changes the language and updates everything
  all('[data-lang]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      lang = btn.getAttribute('data-lang');
      applyLanguage();
    });
  });

  // Restore defaults: ask the sim to reset itself, then redraw
  $('#restore').addEventListener('click', function () {
    if (S && S.reset) S.reset();
    draw();
  });

  // Give the sim what it needs to start: the canvas, a redraw function,
  // the empty controls area to fill with its own controls, and the word lookup
  if (S && S.init) S.init({ canvas: canvas, redraw: draw, controls: $('#controls'), t: t });

  // Redraw whenever the canvas changes size (window resize, phone rotation).
  // Older browsers without ResizeObserver fall back to the window resize event.
  if (window.ResizeObserver) new ResizeObserver(draw).observe(canvas);
  else window.addEventListener('resize', draw);

  // Start up: apply English, which also draws for the first time
  applyLanguage();
})();