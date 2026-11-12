/*
 * SOLID OBJECT: contract
 *
 * A solid block, drawn in the material it is made of.
 *
 * Inputs (props):
 *   material  one of: aluminium, iron, copper, glass, custom
 *
 * What it does:
 *   - draws a rounded block that fills the box it is given
 *   - holds the materials table: names (EN and FR), colour tokens, and density as data
 *
 * What it does NOT do:
 *   - no physics. It stores density, but mass = density x volume is worked out by the sim's model.
 *   - no fixed pixel sizes. The box decides the size and shape.
 */
window.SKUU_LAB = window.SKUU_LAB || {};

(function () {
    // Look of the block (shares of the shorter side of the box unless stated)
    // Look of the block (shares of the shorter side of the box unless stated)
    var P = {
        corner: 0.18,         // corner radius
        sideFrom: 0.70,       // the shade starts to appear here (share of the block WIDTH)...
        sideTo: 0.94,         // ...and is fully dark from here. A wider gap = a softer shade.
        highlightAlpha: 0.75, // how strong the soft highlight is
        highlightY: 0.12,     // height of the highlight's centre, below the top edge
        highlightW: 0.36,     // half-width of the highlight, as a share of the lit part of the block
        highlightH: 0.09      // half-height of the highlight
    };
    // The materials table. face and side are NAMES of tokens in the apparatus group.
    // density is in g/cm3 (to be checked by the teachers). Custom has none: the learner sets
    // mass and volume separately, so the model handles it.
    var MATERIALS = {
        aluminium: { id: 'aluminium', name: { en: 'Aluminium', fr: 'Aluminium' }, density: 2.70, face: 'solidAluminiumFace', side: 'solidAluminiumSide' },
        iron: { id: 'iron', name: { en: 'Iron', fr: 'Fer' }, density: 7.87, face: 'solidIronFace', side: 'solidIronSide' },
        copper: { id: 'copper', name: { en: 'Copper', fr: 'Cuivre' }, density: 8.96, face: 'solidCopperFace', side: 'solidCopperSide' },
        glass: { id: 'glass', name: { en: 'Glass', fr: 'Verre' }, density: 2.50, face: 'solidGlassFace', side: 'solidGlassSide', alpha: 0.85 },
        custom: { id: 'custom', name: { en: 'Custom', fr: 'Personnalis\u00E9' }, density: null, face: 'solidFace', side: 'solidSide' }
    };
    var IDS = ['aluminium', 'iron', 'copper', 'glass', 'custom'];

    // Adds a rounded rectangle to the current path (r must not be more than half the shorter side)
    function roundedRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function draw(ctx, box, props) {
        var material = MATERIALS[props.material];
        // Fail loudly: the showcase shows this message on the canvas
        if (!material) throw new Error('Unknown material: ' + props.material);

        var t = window.SKUU_TOKENS.apparatus;
        var lw = parseFloat(t.outlineWidth);
        var alpha = material.alpha || 1;

        // Inset by half the line width, so the outline never pokes outside the box
        var x = box.x + lw / 2;
        var y = box.y + lw / 2;
        var w = box.w - lw;
        var h = box.h - lw;
        var short = Math.min(w, h);
        var r = short * P.corner;

        // The same rounded shape is used three times, so build it in one place
        function shape() { ctx.beginPath(); roundedRect(ctx, x, y, w, h, r); }

        ctx.save();
        ctx.globalAlpha = alpha;

        // 1. Face and shade in ONE fill. A sideways gradient runs from the face colour to the
        //    side colour between sideFrom and sideTo. Left of that it is pure face, right of it
        //    pure side, and in between it blends smoothly. That blend is the soft shade.
        //    (A gradient between two solid colours needs no transparent token, and it is much
        //    cheaper on low-end phones than shadowBlur.)
        var shade = ctx.createLinearGradient(x + w * P.sideFrom, 0, x + w * P.sideTo, 0);
        shade.addColorStop(0, t[material.face]);
        shade.addColorStop(1, t[material.side]);
        shape();
        ctx.fillStyle = shade;
        ctx.fill();

        // 2. A soft highlight: a glow that is brightest in the middle and fades to nothing at the edge.
        //    Clipped to the block so it can never spill outside it.
        ctx.save();
        shape();
        ctx.clip();
        var lit = w * P.sideFrom;                       // the lit part of the block
        var rx = lit * P.highlightW;
        var ry = short * P.highlightH;
        ctx.globalAlpha = alpha * P.highlightAlpha;
        ctx.translate(x + lit * 0.5, y + lw + short * P.highlightY);
        ctx.scale(1, ry / rx);                          // squash a circle into an ellipse
        var glow = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        glow.addColorStop(0, t.glassHighlight);
        glow.addColorStop(1, t.glassHighlightFade);     // same colour, fully transparent
        ctx.fillStyle = glow;
        ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx);
        ctx.restore();

        // 3. Outline, with the same weight as the glass
        shape();
        ctx.strokeStyle = t.glassOutline;
        ctx.lineWidth = lw;
        ctx.lineJoin = 'round';
        ctx.stroke();

        ctx.restore();
    }
    window.SKUU_LAB.solidObject = {
        title: 'Solid object',
        category: 'materials',
        description: 'A solid block in aluminium, iron, copper, glass or a custom material. Input: material.',
        materials: MATERIALS,
        ids: IDS,
        draw: draw,
        specimens: IDS.map(function (id) {
            return { label: MATERIALS[id].name.en, props: { material: id } };
        })
    };
})();