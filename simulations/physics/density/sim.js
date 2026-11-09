
window.SKUU_SIM = {
    // The sim's own words, one dictionary per language.
    // The shell looks them up with t('placeholder').
    strings: {
        en: { placeholder: 'Density simulation: shell ready' },
        fr: { placeholder: 'Simulation de la masse volumique : structure prête' }
    },

    // Called by the shell on load, on every language change and on every resize.
    draw: function (ctx, w, h, t) {
        ctx.fillStyle = '#5B6573';             // text colour (hard-coded for now)
        ctx.font = '16px system-ui, sans-serif';
        ctx.textAlign = 'center';              // x is the centre of the text, not its left edge
        ctx.textBaseline = 'middle';           // y is the vertical middle of the text
        ctx.fillText(t('placeholder'), w / 2, h / 2);
    },

    // Called when the learner clicks Restore defaults. Nothing to reset yet.
    reset: function () { }
};