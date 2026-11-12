/*
 * GRADUATED CYLINDER: contract
 *
 * Inputs (props):
 *   volume    water volume in cm3 (default 0)
 *   capacity  cylinder capacity in cm3 (default 100)
 *   (meniscus and zoom arrive in a later stage)
 *  *   object    optional: { material, volume }, a solid standing in the water. The cylinder is
 *             TOLD the new water level in `volume`, it never works it out.
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

  // Stage 4: the scale
  var SCALE = {
    minorLen: 0.25,        // tick lengths, as shares of the tube width
    midLen: 0.40,
    majorLen: 0.55,
    minorWidth: 0.5,       // line widths, as shares of the outline width token
    majorWidth: 0.75,
    minTickGap: 4,        // never draw ticks closer than this many pixels
    fontOfH: 0.06,         // number size as a share of H...
    minFont: 9,            // ...but never smaller than this (unreadable)...
    maxFont: 14,           // ...or bigger than this
    labelGapOfFont: 1.5,   // numbers must be at least this many font heights apart
    labelGapOfTube: 0.08,  // gap between the glass and the numbers, as a share of the tube width...
    labelGapMin: 5         // ...but never less than this many pixels
  };

  // Every proportion in one place. W = box width, H = box height.
  // Keep the tube and centre values you tuned in stage 2 if they differ from these.
  var P = {
    tubeWidthOfH: 0.50,     // tube width as a share of H...
    tubeWidthOfW: 0.40,     // ...but never more than this share of W (the smaller one wins)
    centreOfW: 0.33,        // tube centre, measured from the left of the box
    baseWidthOfTube: 1.5,   // base width as a multiple of the tube width
    baseHeightOfH: 0.05,    // base height
    shadowRoomOfH: 0.03,    // empty space under the base, for the shadow
    topOfH: 0.02,           // top of the tube, below the top of the box
    capacityMarkOfH: 0.10,  // the capacity mark, below the top of the box (leaves headroom)
    wallOfTube: 0.03,       // glass wall thickness as a share of the tube width
    // Stage 3 (shares of the tube width unless stated)
    lipOverhang: 0.10,      // how far the rim sticks out on each side
    lipHeight: 0.12,        // height of the rim
    innerCorner: 0.08,      // radius of the rounded bottom corners inside the tube
    baseCorner: 0.35,        // base corner radius, as a share of the base HEIGHT
    // Stage 5
    shadowWidthOfBase: 0.58, // half-width of the shadow, as a share of the base width
    highlightWidth: 0.12,    // highlight strip width, as a share of the tube width
    highlightInset: 0.12,    // gap between the left wall and the highlight (same share)
    highlightTop: 0.04,      // start of the highlight, below the rim (share of the glass height)
    highlightBottom: 0.06,    // end of the highlight, above the floor (share of the glass height)
    // Stage 6
    objectWidthShare: 0.8    // how much of the inside width an object fills
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
      boxLeft: box.x,                               // the edges of the box we were given
      boxBottom: box.y + box.h,
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
      { x: lay.lipLeft, y: lay.lipTop, r: rl },
      { x: lay.lipRight, y: lay.lipTop, r: rl },
      { x: lay.lipRight, y: lay.lipBottom, r: rl },
      { x: lay.tubeRight, y: lay.lipBottom, r: 0 },
      { x: lay.tubeRight, y: lay.baseTop, r: 0 },
      { x: lay.baseRight, y: lay.baseTop, r: rb },
      { x: lay.baseRight, y: lay.baseBottom, r: rb },
      { x: lay.baseLeft, y: lay.baseBottom, r: rb },
      { x: lay.baseLeft, y: lay.baseTop, r: rb },
      { x: lay.tubeLeft, y: lay.baseTop, r: 0 },
      { x: lay.tubeLeft, y: lay.lipBottom, r: 0 },
      { x: lay.lipLeft, y: lay.lipBottom, r: rl }
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

  // Back pass: the shadow, then the see-through tint. Drawn BEFORE the water.
  function drawGlassBack(ctx, box) {
    var t = window.SKUU_TOKENS.apparatus;
    var lay = layout(box);
    drawShadow(ctx, lay);                         // the shadow goes first, the glass sits on it
    ctx.save();
    ctx.globalAlpha = GLASS_ALPHA;
    ctx.fillStyle = t.glass;
    ctx.beginPath();
    silhouettePath(ctx, lay);
    ctx.fill();
    ctx.restore();
  }

  // Front pass: the outline, then the highlight. Drawn AFTER the water,
  // so the water looks like it is inside the glass.
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
    drawHighlight(ctx, lay);                      // over the water, so it looks like light on glass
  }

  // ---------- Water ----------

  var warnedNoWater = false;

  // Asks the shared water component to fill the cylinder. The cylinder only works out WHERE
  // the surface is (yForVolume) and hands over its inside shape. The look comes from water.js.
  function drawWater(ctx, box, props) {
    var water = window.SKUU_LAB.water;
    if (!water) {
      if (!warnedNoWater) {
        console.warn('graduated-cylinder: materials/water is not loaded. Add it to the sim components list.');
        warnedNoWater = true;
      }
      return;
    }
    var lay = layout(box);
    var capacity = props.capacity || DEFAULT_CAPACITY;
    water.fill(ctx, {
      clip: function (c) { cavityPath(c, lay); },
      left: lay.innerLeft,
      right: lay.innerRight,
      surfaceY: yForVolume(lay, props.volume || 0, capacity),
      bottomY: lay.innerBottom
    });
  }

  // ---------- Object in the water ----------

  var warnedNoSolid = false;

  // Where the object is drawn: a box standing on the floor, centred in the tube.
  // The cylinder never works out the new water level, it is TOLD the level (props.volume).
  // But the object must look consistent with it, so its height comes from its volume:
  // it fills objectWidthShare of the width, so it must stand 1/objectWidthShare times as
  // tall as the rise it causes.
  function objectBox(lay, capacity, object) {
    var pxPerUnit = (lay.y0 - lay.y100) / capacity;
    var w = (lay.innerRight - lay.innerLeft) * P.objectWidthShare;
    var rise = object.volume * pxPerUnit;                      // how far the water rises, in pixels
    var h = rise / P.objectWidthShare;
    h = Math.min(h, lay.innerBottom - lay.innerTop);           // never taller than the glass
    return { x: lay.cx - w / 2, y: lay.innerBottom - h, w: w, h: h };
  }

  // Draws the object, then a light layer of water over it, so the part under the surface
  // looks underwater and the part above the surface stays clear.
  function drawObject(ctx, box, props) {
    if (!props.object) return;
    var solid = window.SKUU_LAB.solidObject;
    if (!solid) {
      if (!warnedNoSolid) {
        console.warn('graduated-cylinder: materials/solid-object is not loaded. Add it to the sim components list.');
        warnedNoSolid = true;
      }
      return;
    }

    var lay = layout(box);
    var capacity = props.capacity || DEFAULT_CAPACITY;
    var ob = objectBox(lay, capacity, props.object);
    if (!(ob.h >= 1)) return;                                  // too small to draw (also catches NaN)

    ctx.save();
    ctx.beginPath();
    cavityPath(ctx, lay);
    ctx.clip();                                                // nothing below can leave the glass

    solid.draw(ctx, ob, { material: props.object.material });

    // The underwater tint: the same water, very see-through, clipped to the object's box.
    // water.fill clips again, inside our clip, so both limits apply.
    var water = window.SKUU_LAB.water;
    if (water) {
      water.fill(ctx, {
        clip: function (c) { c.rect(ob.x, ob.y, ob.w, ob.h); },
        left: ob.x,
        right: ob.x + ob.w,
        surfaceY: yForVolume(lay, props.volume || 0, capacity),
        bottomY: lay.innerBottom,
        alpha: 0.35,
        surfaceLine: false
      });
    }
    ctx.restore();
  }

  // ---------- The scale: ticks and numbers ----------

  // Returns the first step in the list that leaves at least minGap pixels between marks,
  // or null if none does. If an accept function is given, steps it rejects are skipped.
  function pickStep(candidates, pxPerUnit, minGap, accept) {
    for (var i = 0; i < candidates.length; i++) {
      if (accept && !accept(candidates[i])) continue;
      if (candidates[i] * pxPerUnit >= minGap) return candidates[i];
    }
    return null;
  }

  // Drawn LAST, so the ticks sit on top of the water. Every tick position comes from yForVolume.
  // Drawn LAST, so the ticks sit on top of the water. Every tick position comes from yForVolume.
  function drawScale(ctx, box, props) {
    var t = window.SKUU_TOKENS;
    var lay = layout(box);
    var capacity = Math.floor(props.capacity || DEFAULT_CAPACITY);
    var pxPerUnit = (lay.y0 - lay.y100) / capacity;   // how many pixels one cm3 takes

    // Big box: a tick every 1. Smaller box: every 5 or 10. Never closer than minTickGap.
    var tickStep = pickStep([1, 5, 10], pxPerUnit, SCALE.minTickGap) || 10;

    // Number size, then how often we can afford a number without overlap.
    // If no step fits, labelStep is null and the numbers are hidden (ticks stay).
    var font = Math.max(SCALE.minFont, Math.min(SCALE.maxFont, SCALE.fontOfH * box.h));
    // Prefer a step that divides the capacity, so the top mark always gets its number.
    var labelGap = SCALE.labelGapOfFont * font;
    var labelStep =
      pickStep([10, 20, 50, 100], pxPerUnit, labelGap, function (s) { return capacity % s === 0; }) ||
      pickStep([10, 20, 50, 100], pxPerUnit, labelGap);

    var outline = parseFloat(t.apparatus.outlineWidth);
    // Numbers start past the rim AND the base, whichever sticks out further
    var numberGap = Math.max(SCALE.labelGapMin, SCALE.labelGapOfTube * lay.tubeW);
    var labelX = Math.max(lay.lipRight, lay.baseRight) + numberGap;
    var room = box.x + box.w - labelX;                // space available for the numbers

    ctx.save();
    ctx.strokeStyle = t.apparatus.glassOutline;
    ctx.fillStyle = t.interface.text;
    ctx.font = font + 'px ' + t.interface.fontStack;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Tick hierarchy: numbered ticks are the longest, then a middle level, then the rest.
    // The levels come from the steps chosen above, so the scale looks right at any size.
    var majorStep = labelStep || 10;
    var midStep = null;
    [50, 20, 10, 5].forEach(function (c) {
      if (midStep === null && c < majorStep && majorStep % c === 0 && c % tickStep === 0) midStep = c;
    });

    var topLabelY = null;                             // where the highest number was drawn

    for (var v = 0; v <= capacity; v++) {
      if (v % tickStep !== 0) continue;               // skip volumes that get no tick

      var y = yForVolume(lay, v, capacity);
      // % is the remainder: 20 % 10 is 0, so 20 is a multiple of 10
      var level = (v % majorStep === 0) ? 2 : (midStep && v % midStep === 0) ? 1 : 0;
      var len = [SCALE.minorLen, SCALE.midLen, SCALE.majorLen][level] * lay.tubeW;

      // Ticks start at the inside of the right wall and point inward
      ctx.lineWidth = outline * (level === 2 ? SCALE.majorWidth : SCALE.minorWidth);
      ctx.beginPath();
      ctx.moveTo(lay.innerRight - len, y);
      ctx.lineTo(lay.innerRight, y);
      ctx.stroke();

      // A number on every labelStep, if it fits in the space to the right
      if (labelStep && v % labelStep === 0) {
        var text = String(v);
        if (ctx.measureText(text).width <= room) {
          ctx.fillText(text, labelX, y);
          topLabelY = y;
        }
      }
    }

    // The unit, above the top number. It is the same in English and French, so no translation.
    if (topLabelY !== null) {
      var unitY = topLabelY - font * 1.3;
      var unit = 'cm\u00B3';
      if (unitY >= box.y + font / 2 && ctx.measureText(unit).width <= room) {
        ctx.fillText(unit, labelX, unitY);
      }
    }
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
    drawWater(ctx, box, props);                       // inside the glass
    drawObject(ctx, box, props);                      // in the water, with an underwater tint
    drawGlassFront(ctx, box);
    drawScale(ctx, box, props);                       // on top of everything else
    if (DEBUG) drawDebug(ctx, box, props);
  }

  // A soft shadow on the surface under the foot. Drawn first, so the glass sits on top of it.
  // A gradient is used instead of shadowBlur, because blur is slow on low-end phones.
  function drawShadow(ctx, lay) {
    var t = window.SKUU_TOKENS.apparatus;
    var ry = lay.boxBottom - lay.baseBottom;                      // the room we reserved under the foot
    var rx = Math.min(P.shadowWidthOfBase * (lay.baseRight - lay.baseLeft), lay.cx - lay.boxLeft);
    if (ry < 1 || rx < 1) return;                                 // no room: skip

    ctx.save();
    ctx.translate(lay.cx, lay.baseBottom);                        // origin at the middle of the foot's bottom edge
    ctx.scale(1, ry / rx);                                        // squash a circle into an ellipse
    var gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    gradient.addColorStop(0, t.shadow);                           // darkest in the middle...
    gradient.addColorStop(1, t.shadowFade);                       // ...fading to nothing at the edge
    ctx.fillStyle = gradient;
    ctx.fillRect(-rx, 0, 2 * rx, rx);                             // lower half only (y from 0 down)
    ctx.restore();
  }

  // A light strip down the inside of the left wall, drawn over the water.
  function drawHighlight(ctx, lay) {
    var t = window.SKUU_TOKENS.apparatus;
    var w = P.highlightWidth * lay.tubeW;
    if (w < 1.5) return;                                          // too thin to look good: skip

    var span = lay.innerBottom - lay.lipBottom;                   // the height of the glass
    var x = lay.innerLeft + P.highlightInset * lay.tubeW;
    var top = lay.lipBottom + P.highlightTop * span;
    var bottom = lay.innerBottom - P.highlightBottom * span;

    ctx.save();
    ctx.globalAlpha = 0.7;
    var gradient = ctx.createLinearGradient(0, top, 0, bottom);
    gradient.addColorStop(0, t.glassHighlight);                   // brightest near the top...
    gradient.addColorStop(1, t.glassHighlightFade);               // ...fading out near the bottom
    ctx.fillStyle = gradient;
    ctx.beginPath();
    roundedPolygon(ctx, [                                         // a strip with rounded ends
      { x: x, y: top, r: w / 2 },
      { x: x + w, y: top, r: w / 2 },
      { x: x + w, y: bottom, r: w / 2 },
      { x: x, y: bottom, r: w / 2 }
    ]);
    ctx.fill();
    ctx.restore();
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
    drawScale: drawScale,
    draw: draw,
    drawWater: drawWater,
    drawObject: drawObject,
    objectBox: objectBox,
    specimens: [
      { label: 'Empty', props: { volume: 0, capacity: 100 } },
      { label: 'Half full', props: { volume: 50, capacity: 100 } },
      { label: 'Full', props: { volume: 100, capacity: 100 } },
      { label: '250 cm3 cylinder', props: { volume: 125, capacity: 250 } },
      { label: 'Iron block, 20 cm3 (level 70)', props: { volume: 70, capacity: 100, object: { material: 'iron', volume: 20 } } },
      { label: 'Copper block, 40 cm3 (level 80)', props: { volume: 80, capacity: 100, object: { material: 'copper', volume: 40 } } },
      { label: 'Glass block, 20 cm3 (level 45)', props: { volume: 45, capacity: 100, object: { material: 'glass', volume: 20 } } },
      { label: 'Not fully underwater', props: { volume: 45, capacity: 100, object: { material: 'aluminium', volume: 40 } } }
    ]
  };
})();