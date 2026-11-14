/*
 * MASS BALANCE: contract
 *
 * A digital top-pan balance: a body with a screen, a post and a flat pan.
 *
 * Inputs (props):
 *   mass      the reading in grams. If missing, the screen shows dashes.
 *   decimals  decimal places shown on the screen (default 0)
 *   object    optional { material }: a solid standing on the pan
 *
 * What it does:
 *   - draws the balance and shows the number it is given
 *   - layout(box) says where the pan's top is and where an object sits on it, so the sim
 *     knows where a dragged object should land
 *
 * What it does NOT do:
 *   - no physics. It never works out a mass (that is density x volume, in the sim's model).
 *   - no fixed pixel sizes. The whole balance is drawn at one scale that fits the box.
 */
window.SKUU_LAB = window.SKUU_LAB || {};

(function () {
  var MIN_FONT = 8;        // digits smaller than this (in pixels) are unreadable, so we hide them
  var warnedNoSolid = false;

  // The balance is designed on a fixed 100 x 80 grid and then scaled to fit the box.
  // That keeps its proportions the same in any box shape. y grows downward.
  var DESIGN = { w: 100, h: 80 };
  var D = {
    body:   { x: 6,  y: 50, w: 88, h: 24, r: 5 },
    screen: { x: 12, y: 55, w: 50, h: 14, r: 3 },
    post:   { x: 46, y: 44, w: 8,  h: 7 },
    pan:    { x: 20, y: 40, w: 60, h: 4,  r: 2 },
    object: { w: 24, h: 24 },            // the box an object is drawn in, standing on the pan
    shadow: { rx: 46, ry: 5 }
  };

  // All positions in pixels, calculated from the box. Pure maths, no drawing.
  function layout(box) {
    var s = Math.min(box.w / DESIGN.w, box.h / DESIGN.h);       // one scale for everything
    var ox = box.x + (box.w - DESIGN.w * s) / 2;                // centre the balance in the box
    var oy = box.y + (box.h - DESIGN.h * s) / 2;

    function px(r) {                                            // design units to pixels
      return { x: ox + r.x * s, y: oy + r.y * s, w: r.w * s, h: r.h * s, r: (r.r || 0) * s };
    }

    var pan = px(D.pan);
    var objW = D.object.w * s;
    var objH = D.object.h * s;

    return {
      scale: s,
      body: px(D.body),
      screen: px(D.screen),
      post: px(D.post),
      pan: pan,
      panTop: pan.y,                                            // the surface an object stands on
      object: { x: pan.x + pan.w / 2 - objW / 2, y: pan.y - objH, w: objW, h: objH },
      shadow: { cx: ox + (DESIGN.w / 2) * s, y: oy + (D.body.y + D.body.h) * s, rx: D.shadow.rx * s, ry: D.shadow.ry * s }
    };
  }

  // The reading on the screen, fitted so it is never clipped
  function drawReading(ctx, screen, props) {
    var ti = window.SKUU_TOKENS.interface;
    var t = window.SKUU_TOKENS.apparatus;
    var hasMass = props.mass !== undefined && props.mass !== null && !isNaN(props.mass);
    var text = hasMass ? Number(props.mass).toFixed(props.decimals || 0) + ' g' : '---';

    var pad = screen.h * 0.3;
    var maxW = screen.w - 2 * pad;
    var size = screen.h * 0.66;
    if (size < MIN_FONT) return;                                // too small to read: hide it

    function setFont() { ctx.font = '600 ' + size + 'px ' + ti.fontMono; }
    setFont();
    // Shrink until the text fits the screen width, but never below the readable minimum
    while (size > MIN_FONT && ctx.measureText(text).width > maxW) { size -= 0.5; setFont(); }
    if (ctx.measureText(text).width > maxW) return;             // still too wide: show nothing, not clipped digits

    ctx.fillStyle = t.balanceDigits;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, screen.x + screen.w - pad, screen.y + screen.h / 2 + size * 0.04);
  }

  function draw(ctx, box, props) {
    var t = window.SKUU_TOKENS.apparatus;
    var shapes = window.SKUU_LAB.shapes;
    var lw = parseFloat(t.outlineWidth);
    var L = layout(box);

    ctx.save();
    ctx.lineJoin = 'round';

    // 1. Shadow under the body
    shapes.softShadow(ctx, L.shadow.cx, L.shadow.y, L.shadow.rx, L.shadow.ry);

    // 2. Post (drawn before the body, so the body covers its lower end)
    ctx.fillStyle = t.balanceBodySide;
    ctx.strokeStyle = t.glassOutline;
    ctx.lineWidth = lw;
    ctx.fillRect(L.post.x, L.post.y, L.post.w, L.post.h);
    ctx.strokeRect(L.post.x, L.post.y, L.post.w, L.post.h);

    // 3. Body: face colour with a soft shade on the right, like the solid objects
    var b = L.body;
    var shade = ctx.createLinearGradient(b.x + b.w * 0.80, 0, b.x + b.w * 0.98, 0);
    shade.addColorStop(0, t.balanceBody);
    shade.addColorStop(1, t.balanceBodySide);
    ctx.beginPath();
    shapes.roundedRect(ctx, b.x, b.y, b.w, b.h, b.r);
    ctx.fillStyle = shade;
    ctx.fill();
    ctx.stroke();

    // 4. Pan
    var p = L.pan;
    ctx.beginPath();
    shapes.roundedRect(ctx, p.x, p.y, p.w, p.h, p.r);
    ctx.fillStyle = t.balancePan;
    ctx.fill();
    ctx.stroke();

    // 5. The object on the pan, drawn by the shared solid object component
    if (props.object) {
      var solid = window.SKUU_LAB.solidObject;
      if (solid) {
        solid.draw(ctx, L.object, { material: props.object.material });
      } else if (!warnedNoSolid) {
        console.warn('mass-balance: materials/solid-object is not loaded. Add it to the sim components list.');
        warnedNoSolid = true;
      }
    }

    // 6. Screen, then the reading
    var sc = L.screen;
    ctx.beginPath();
    shapes.roundedRect(ctx, sc.x, sc.y, sc.w, sc.h, sc.r);
    ctx.fillStyle = t.balanceScreen;
    ctx.fill();
    ctx.lineWidth = lw * 0.5;
    ctx.stroke();
    drawReading(ctx, sc, props);

    ctx.restore();
  }

  window.SKUU_LAB.massBalance = {
    title: 'Mass balance',
    category: 'measurement',
    description: 'Digital top-pan balance. Inputs: mass (g), decimals, object { material }.',
    layout: layout,
    draw: draw,
    specimens: [
      { label: 'Empty, 0 g',            props: { mass: 0 } },
      { label: 'Aluminium, 135 g',      props: { mass: 135, object: { material: 'aluminium' } } },
      { label: 'Copper, 358 g',         props: { mass: 358, object: { material: 'copper' } } },
      { label: 'One decimal, 12.5 g',   props: { mass: 12.5, decimals: 1 } },
      { label: 'Tons, 123450 g', props: { mass: 12345678923234 } },
      { label: 'No reading',            props: {} }
    ]
  };
})();