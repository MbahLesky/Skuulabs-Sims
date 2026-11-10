(function () {
  var tokens = window.SKUU_TOKENS;

  // ---------- Small helpers ----------

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function isColour(value) {
    return typeof value === 'string' && (value.indexOf('#') === 0 || value.indexOf('rgb') === 0);
  }

  // ---------- Tokens section (step 1) ----------

  var colourBox = document.getElementById('token-colours');
  var otherBox = document.getElementById('token-other');

  Object.keys(tokens).forEach(function (group) {
    Object.keys(tokens[group]).forEach(function (name) {
      var value = tokens[group][name];
      var label = group + ' / ' + name;

      if (isColour(value)) {
        var card = el('div', 'swatch');
        var chip = el('div', 'chip');
        chip.style.background = value;
        card.appendChild(chip);
        card.appendChild(el('div', 'name', label));
        card.appendChild(el('div', 'value', value));
        colourBox.appendChild(card);
      } else {
        otherBox.appendChild(el('dt', null, label));
        otherBox.appendChild(el('dd', null, value));
      }
    });
  });

  // ---------- Materials and components (step 2) ----------

  var lab = window.SKUU_LAB || {};          // the registry: every component adds itself here
  var showBoxes = document.getElementById('show-boxes');

  // The three box shapes every specimen is drawn in (sizes in CSS pixels)
  var SHAPES = [
    { name: 'Tall',   w: 120, h: 220 },
    { name: 'Wide',   w: 240, h: 120 },
    { name: 'Square', w: 160, h: 160 }
  ];
  var PAD = 8;                               // space between the canvas edge and the box
  var CATEGORY_ORDER = ['glassware', 'materials', 'measurement', 'interaction'];

  // One entry per canvas: a function that paints it. Re-run when the checkbox changes.
  var paintJobs = [];

  // Paint one specimen into one canvas, in one box shape
  function paint(canvas, component, specimen, shape) {
    var dpr = window.devicePixelRatio || 1;
    // More pixels inside the canvas on sharp screens, same size on the page
    canvas.width = Math.round(shape.w * dpr);
    canvas.height = Math.round(shape.h * dpr);
    canvas.style.width = shape.w + 'px';
    canvas.style.height = shape.h + 'px';

    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, shape.w, shape.h);

    // The box the component is allowed to draw in
    var box = { x: PAD, y: PAD, w: shape.w - 2 * PAD, h: shape.h - 2 * PAD };

    // save and restore undo anything the component changes (colours, fonts, transforms)
    // so one component can never affect the next one.
    var failure = null;
    ctx.save();
    try {
      component.draw(ctx, box, specimen.props);
    } catch (err) {
      failure = err;
      console.error('Component failed:', specimen.label, err);
    }
    ctx.restore();

    // A bug in one component shows up on its own canvas, and every other card still works
    if (failure) {
      ctx.save();
      ctx.fillStyle = tokens.interface.text;
      ctx.font = '12px ' + tokens.interface.fontStack;
      ctx.textBaseline = 'top';
      ctx.fillText('Error:', PAD, PAD, box.w);
      ctx.fillText(String(failure.message), PAD, PAD + 16, box.w);
      ctx.restore();
    }

    // Optional dashed outline of the box
    if (showBoxes.checked) {
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = tokens.interface.textMuted;
      ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);
      ctx.restore();
    }
  }

  // Build one card from one component, following the standard contract
  function makeCard(key, component) {
    var title = component.title || key;
    var card = el('article', 'card');
    card.appendChild(el('h4', null, title));
    card.appendChild(el('div', 'meta', (component.category || 'uncategorised') + ' · SKUU_LAB.' + key));
    if (component.description) card.appendChild(el('p', 'desc', component.description));

    // Components with nothing to draw (like a helper) get a card with no canvases
    var specimens = component.specimens || [];
    if (typeof component.draw !== 'function' || specimens.length === 0) {
      card.appendChild(el('p', 'empty', 'Nothing to draw.'));
      return card;
    }

    specimens.forEach(function (specimen) {
      var block = el('div', 'specimen');
      block.appendChild(el('div', 'specimen-label', specimen.label));
      var row = el('div', 'shapes');

      SHAPES.forEach(function (shape) {
        var figure = el('figure', 'shape');
        var canvas = document.createElement('canvas');
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', title + ', ' + specimen.label + ', ' + shape.name + ' box');
        figure.appendChild(canvas);
        figure.appendChild(el('figcaption', null, shape.name));
        row.appendChild(figure);

        paintJobs.push(function () { paint(canvas, component, specimen, shape); });
      });

      block.appendChild(row);
      card.appendChild(block);
    });
    return card;
  }

  // Turn the registry into a list, then split it into the two sections
  var entries = Object.keys(lab).map(function (key) { return { key: key, component: lab[key] }; });
  var materials = entries.filter(function (e) { return e.component.category === 'materials'; });
  var others = entries.filter(function (e) { return e.component.category !== 'materials'; });

  // Materials: one grid of cards
  var materialsBox = document.getElementById('materials');
  if (materials.length === 0) {
    materialsBox.appendChild(el('p', 'empty', 'No materials yet.'));
  } else {
    var materialGrid = el('div', 'cards');
    materials.forEach(function (e) { materialGrid.appendChild(makeCard(e.key, e.component)); });
    materialsBox.appendChild(materialGrid);
  }

  // Components: one heading and one grid per category, in a fixed order,
  // with any unknown categories after the known ones
  var componentsBox = document.getElementById('components');
  if (others.length === 0) {
    componentsBox.appendChild(el('p', 'empty', 'No components yet.'));
  } else {
    var categories = CATEGORY_ORDER.filter(function (c) { return c !== 'materials'; });
    others.forEach(function (e) {
      var c = e.component.category || 'uncategorised';
      if (categories.indexOf(c) === -1) categories.push(c);
    });

    categories.forEach(function (category) {
      var inCategory = others.filter(function (e) { return (e.component.category || 'uncategorised') === category; });
      if (inCategory.length === 0) return;
      componentsBox.appendChild(el('h3', null, category));
      var grid = el('div', 'cards');
      inCategory.forEach(function (e) { grid.appendChild(makeCard(e.key, e.component)); });
      componentsBox.appendChild(grid);
    });
  }

  // Paint everything once, and again whenever the checkbox changes
  function paintAll() { paintJobs.forEach(function (job) { job(); }); }
  showBoxes.addEventListener('change', paintAll);
  paintAll();
})();