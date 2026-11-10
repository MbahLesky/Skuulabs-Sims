/*
 * GRADUATED CYLINDER: contract
 *
 * Inputs (props):
 *   volume    water volume in cm3 (default 0)
 *   capacity  cylinder capacity in cm3 (default 100)
 *   (meniscus and zoom arrive in a later stage)
 *
 * What it does:
 *   - draws the glass and the scale inside the box it is given
 *   - measures: yForVolume() turns a volume into a Y position, so the water, the
 *     objects and the scale all line up exactly
 *   - draws in TWO passes: drawGlassBack (tint), then whatever sits inside (water, objects),
 *     then drawGlassFront (outline). That order is what makes water look like it is inside the glass.
 *
 * What it does NOT do:
 *   - no physics. It never decides whether water overflows. It only turns numbers into pixels.
 *   - no fixed pixel sizes. Everything is a proportion of the box, so it works in any shape.
 */
window.SKUU_LAB = window.SKUU_LAB || {};

(function () {
  // Debug marks (0 mark, capacity mark, volume line). Turn on while checking the numbers.
  var DEBUG = false;

  var DEFAULT_CAPACITY = 100;
  var GLASS_ALPHA = 0.55;   // how see-through the glass tint is

  // Every proportion in one place. W = box width, H = box height.
  // Keep the tube and centre values you tuned in stage 2 if they differ from these.
  var P = {
    tubeWidthOfH: 0.40,     // tube width as a share of H...
    tubeWidthOfW: 0.40,     // ...but never more than this share of W (the smaller one wins)
    centreOfW: 0.38,        // tube centre, measured from the left of the box
    baseWidthOfTube: 1.5,   // base width as a multiple of the tube width
    baseHeightOfH: 0.05,    // base height
    shadowRoomOfH: 0.03,    // empty space under the base, for the shadow
    topOfH: 0.02,           // top of the tube, below the top of the box
    capacityMarkOfH: 0.10,  // the capacity mark, below the top of the box (leaves headroom)
    wallOfTube: 0.03,       // glass wall thickness as a share of the tube width
    // Stage 3 (shares of the tube width unless stated)
    lipOverhang: 0.10,      // how far the rim sticks out on each side
    lipHeight: 0.12,        // height of the rim
    innerCorner: 0.15,      // radius of the rounded bottom corners inside the tube
    baseCorner: 0.35        // base corner radius, as a share of the base HEIGHT
  };

  // ---------- Layout: all positions, calculated from the box. Pure maths, no drawing. ----------
  function layout(box) {
    var tubeW = Math.min(P.tubeWidthOfH * box.h, P.tubeWidthOfW * box.w);
    var cx = box.x + P.centreOfW * box.w;
    var wall = P.wallOfTube * tubeW;
    var baseW = tubeW * P.baseWidthOfTube;
    var baseH = P.baseHeightOfH * box.h;
    var baseBottom = box.y + box.h - P.shadowRoomOfH * box.h;
    var baseTop = baseBottom - baseH;
    var tubeTop = box.y + P.topOfH * box.h;
    var overhang = P.lipOverhang * tubeW;
    var lipH = P.lipHeight * tubeW;
    var tubeLeft = cx - tubeW / 2;
    var tubeRight = cx + tubeW / 2;
    var y0 = baseTop - wall;                       // the 0 mark: just above the glass floor

    return {
      cx: cx,
      tubeW: tubeW,
      wall: wall,
      tubeLeft: tubeLeft,
      tubeRight: tubeRight,
      tubeTop: tubeTop,
      tubeBottom: baseTop,                          // the tube sits on the base
      lipLeft: tubeLeft - overhang,
      lipRight: tubeRight + overhang,
      lipTop: tubeTop,
      lipBottom: tubeTop + lipH,
      overhang: overhang,
      baseLeft: cx - baseW / 2,
      baseRight: cx + baseW / 2,
      baseTop: baseTop,
      baseBottom: baseBottom,
      baseCorner: P.baseCorner * baseH,
      // The empty space inside the glass (where the water goes)
      innerLeft: tubeLeft + wall,
      innerRight: tubeRight - wall,
      innerTop: tubeTop,
      innerBottom: y0,
      innerCorner: P.innerCorner * tubeW,
      y0: y0,
      y100: box.y + P.capacityMarkOfH * box.h       // the capacity mark
    };
  }

  // Volume to Y. Y grows DOWNWARD on a canvas, so a bigger volume means a smaller Y.
  // No clamping on purpose: this only converts, the caller decides what is allowed.
  function yForVolume(lay, volume, capacity) {
    return lay.y0 - (volume / capacity) * (lay.y0 - lay.y100);
  }

  // ---------- Path helpers: they build a path, they do not fill or stroke it ----------

  // Walks through a list of corner points, rounding each corner by its own radius r.
  // arcTo(corner, midpoint of the next edge, r) draws a rounded corner at the first point.
  function roundedPolygon(ctx, pts) {
    var n = pts.length;
    function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
    var start = mid(pts[n - 1], pts[0]);
    ctx.moveTo(start.x, start.y);
    for (var i = 0; i < n; i++) {
      var p = pts[i];
      var m = mid(p, pts[(i + 1) % n]);
      ctx.arcTo(p.x, p.y, m.x, m.y, p.r);
    }
    ctx.closePath();
  }

  // The whole glass outline as ONE shape: lip, tube and base together, so the tint is
  // even (no darker band where shapes overlap) and the outline has no lines inside it.
  function silhouettePath(ctx, lay) {
    var rl = Math.min(lay.lipBottom - lay.lipTop, lay.overhang) * 0.4;   // small lip corners
    var rb = lay.baseCorner;
    roundedPolygon(ctx, [
      { x: lay.lipLeft,   y: lay.lipTop,    r: rl },
      { x: lay.lipRight,  y: lay.lipTop,    r: rl },
      { x: lay.lipRight,  y: lay.lipBottom, r: rl },
      { x: lay.tubeRight, y: lay.lipBottom, r: 0 },
      { x: lay.tubeRight, y: lay.baseTop,   r: 0 },
      { x: lay.baseRight, y: lay.baseTop,   r: rb },
      { x: lay.baseRight, y: lay.baseBottom, r: rb },
      { x: lay.baseLeft,  y: lay.baseBottom, r: rb },
      { x: lay.baseLeft,  y: lay.baseTop,   r: rb },
      { x: lay.tubeLeft,  y: lay.baseTop,   r: 0 },
      { x: lay.tubeLeft,  y: lay.lipBottom, r: 0 },
      { x: lay.lipLeft,   y: lay.lipBottom, r: rl }
    ]);
  }

  // The empty space inside the glass, with rounded bottom corners.
  // The water component clips itself to this shape so liquid never leaks through the glass.
  function cavityPath(ctx, lay) {
    var r = lay.innerCorner;
    ctx.moveTo(lay.innerLeft, lay.innerTop);
    ctx.lineTo(lay.innerRight, lay.innerTop);
    ctx.lineTo(lay.innerRight, lay.innerBottom - r);
    ctx.arcTo(lay.innerRight, lay.innerBottom, lay.innerRight - r, lay.innerBottom, r);
    ctx.lineTo(lay.innerLeft + r, lay.innerBottom);
    ctx.arcTo(lay.innerLeft, lay.innerBottom, lay.innerLeft, lay.innerBottom - r, r);
    ctx.closePath();
  }

  // ---------- Drawing ----------

  // Back pass: the see-through tint. Drawn BEFORE the water.
  function drawGlassBack(ctx, box) {
    var t = window.SKUU_TOKENS.apparatus;
    var lay = layout(box);
    ctx.save();
    ctx.globalAlpha = GLASS_ALPHA;
    ctx.fillStyle = t.glass;
    ctx.beginPath();
    silhouettePath(ctx, lay);
    ctx.fill();
    ctx.restore();
  }

  // Front pass: the outline. Drawn AFTER the water, so the water looks like it is inside.
  // (The highlight and shadow join this pass in stage 5.)
  function drawGlassFront(ctx, box) {
    var t = window.SKUU_TOKENS.apparatus;
    var lay = layout(box);
    ctx.save();
    ctx.strokeStyle = t.glassOutline;
    ctx.lineWidth = parseFloat(t.outlineWidth);   // the token is text like '2px', so convert it
    ctx.lineJoin = 'round';
    ctx.beginPath();
    silhouettePath(ctx, lay);
    ctx.stroke();
    ctx.restore();
  }

  // Debug marks: the 0 mark, the capacity mark and a line at the requested volume
  function drawDebug(ctx, box, props) {
    var t = window.SKUU_TOKENS.apparatus;
    var lay = layout(box);
    var capacity = props.capacity || DEFAULT_CAPACITY;
    console.table(lay);
    ctx.save();
    ctx.strokeStyle = t.glassOutline;
    ctx.lineWidth = 1;
    [lay.y0, lay.y100].forEach(function (y) {
      ctx.beginPath();
      ctx.moveTo(lay.tubeLeft - 6, y);
      ctx.lineTo(lay.tubeRight + 6, y);
      ctx.stroke();
    });
    ctx.strokeStyle = t.water;
    ctx.lineWidth = 2;
    var y = yForVolume(lay, props.volume || 0, capacity);
    ctx.beginPath();
    ctx.moveTo(lay.tubeLeft, y);
    ctx.lineTo(lay.tubeRight, y);
    ctx.stroke();
    ctx.restore();
  }

  // The showcase calls this. The sim will call the back pass, then water, then the front pass.
  function draw(ctx, box, props) {
    drawGlassBack(ctx, box);
    // (water and objects will be drawn here in later steps)
    drawGlassFront(ctx, box);
    if (DEBUG) drawDebug(ctx, box, props);
  }

  window.SKUU_LAB.graduatedCylinder = {
    title: 'Graduated cylinder',
    category: 'glassware',
    description: 'Glass measuring cylinder. Inputs: volume (cm3), capacity (cm3), later meniscus and zoom.',
    layout: layout,
    yForVolume: yForVolume,
    cavityPath: cavityPath,
    drawGlassBack: drawGlassBack,
    drawGlassFront: drawGlassFront,
    draw: draw,
    specimens: [
      { label: 'Empty',     props: { volume: 0,   capacity: 100 } },
      { label: 'Half full', props: { volume: 50,  capacity: 100 } },
      { label: 'Full',      props: { volume: 100, capacity: 100 } }
    ]
  };
})();