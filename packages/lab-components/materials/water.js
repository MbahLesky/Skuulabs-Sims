/*
 * WATER: contract
 *
 * The one liquid every container uses, so water looks the same in every sim.
 *
 * fill(ctx, region): the real function. A container calls it with:
 *   clip      a function that builds the container's INSIDE shape as a path
 *   left      left edge of the liquid area (x)
 *   right     right edge of the liquid area (x)
 *   surfaceY  where the water surface is (y)
 *   bottomY   where the liquid area ends at the bottom (y)
 *
 * draw(ctx, box, props): only for the showcase. It draws a plain tank and fills it
 *   props.fill = how full, from 0 to 1.
 *
 * No physics: water never decides its own level. It only draws at the level it is given.
 */
window.SKUU_LAB = window.SKUU_LAB || {};

(function () {
  var WATER_ALPHA = 0.9;   // slightly see-through, so the glass still shows

  function fill(ctx, region) {
    var t = window.SKUU_TOKENS.apparatus;

    // Nothing to draw when the surface is at or below the bottom (empty)
    if (region.surfaceY >= region.bottomY) return;

    ctx.save();

    // Clip: after this, anything we draw only appears INSIDE the container's shape.
    // That is what stops water leaking through the glass and makes it follow rounded corners.
    ctx.beginPath();
    region.clip(ctx);
    ctx.clip();

    // Body of the water: a lighter blue at the top fading to a deeper blue at the bottom
    var gradient = ctx.createLinearGradient(0, region.surfaceY, 0, region.bottomY);
    gradient.addColorStop(0, t.water);
    gradient.addColorStop(1, t.waterDeep);
    ctx.globalAlpha = WATER_ALPHA;
    ctx.fillStyle = gradient;
    ctx.fillRect(region.left, region.surfaceY, region.right - region.left, region.bottomY - region.surfaceY);

    // A thin light line along the surface, so the top edge reads clearly.
    // It is drawn half a line-width below the surface so it stays fully inside the water.
    var lineWidth = 1.5;
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = t.glassHighlight;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(region.left, region.surfaceY + lineWidth / 2);
    ctx.lineTo(region.right, region.surfaceY + lineWidth / 2);
    ctx.stroke();

    ctx.restore();
  }

  // Showcase demo: a plain rectangular tank with water in it
  function draw(ctx, box, props) {
    var t = window.SKUU_TOKENS.apparatus;
    var amount = Math.max(0, Math.min(1, props.fill || 0));
    var lineWidth = parseFloat(t.outlineWidth);
    var bottom = box.y + box.h;
    var surfaceY = bottom - amount * box.h;

    fill(ctx, {
      clip: function (c) { c.rect(box.x, box.y, box.w, box.h); },
      left: box.x,
      right: box.x + box.w,
      surfaceY: surfaceY,
      bottomY: bottom
    });

    ctx.save();
    ctx.strokeStyle = t.glassOutline;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(box.x + lineWidth / 2, box.y + lineWidth / 2, box.w - lineWidth, box.h - lineWidth);
    ctx.restore();
  }

  window.SKUU_LAB.water = {
    title: 'Water',
    category: 'materials',
    description: 'The shared liquid. Containers call fill() with their inner shape and the surface level.',
    fill: fill,
    draw: draw,
    specimens: [
      { label: 'Empty',     props: { fill: 0 } },
      { label: '25% full',  props: { fill: 0.25 } },
      { label: '50% full',  props: { fill: 0.5 } },
      { label: 'Full',      props: { fill: 1 } }
    ]
  };
})();