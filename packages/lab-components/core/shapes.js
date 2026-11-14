/*
 * SHARED DRAWING HELPERS
 *
 * Small drawing tools used by more than one component. They draw nothing on their own,
 * so this card in the showcase has no pictures. Components call them while drawing.
 * The build always includes everything in the core folder, so sims never list it.
 */
window.SKUU_LAB = window.SKUU_LAB || {};

(function () {
    // Adds a rounded rectangle to the current path. It does not fill or stroke it.
    // r must not be more than half the shorter side.
    function roundedRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    // A soft shadow on the surface under an object: the lower half of a fading ellipse.
    //   cx, y   the middle of the object's bottom edge
    //   rx      how far the shadow reaches sideways
    //   ry      how far it reaches downward
    // A gradient is used instead of shadowBlur, because blur is slow on low-end phones.
    function softShadow(ctx, cx, y, rx, ry) {
        var t = window.SKUU_TOKENS.apparatus;
        if (ry < 1 || rx < 1) return;                                 // no room: skip

        ctx.save();
        ctx.translate(cx, y);                                         // origin at the object's bottom edge
        ctx.scale(1, ry / rx);                                        // squash a circle into an ellipse
        var gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        gradient.addColorStop(0, t.shadow);                           // darkest in the middle...
        gradient.addColorStop(1, t.shadowFade);                       // ...fading to nothing at the edge
        ctx.fillStyle = gradient;
        ctx.fillRect(-rx, 0, 2 * rx, rx);                             // lower half only (y from 0 down)
        ctx.restore();
    }

    window.SKUU_LAB.shapes = {
        title: 'Shared drawing helpers',
        category: 'helpers',
        description: 'roundedRect and softShadow, used by several components. Draws nothing by itself.',
        roundedRect: roundedRect,
        softShadow: softShadow
    };
})();