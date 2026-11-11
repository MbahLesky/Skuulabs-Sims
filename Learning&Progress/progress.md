# Skuulabs Sims — Learning & Progress Log

Tracking daily progress, architecture decisions, and learning milestones for the Skuulabs Simulations platform.

---

## Day 01 — Fri, Nov 06, 2026
**Focus:** Project Inception & Requirements Specification

- [x] Defined Project ID conventions and high-level architecture overview.
- [x] Established technical specifications and core constraints (lightweight, zero-dependency, bilingual EN/FR, mobile-friendly).
- [x] Outlined platform goals: interactive educational STEM simulations running smoothly across desktop and mobile devices.

---

## Day 02 — Sat, Nov 07, 2026
**Focus:** Simulation Specs & Core Package Architecture

- [x] Refined and polished overall project specification.
- [x] Drafted detailed specification for the first simulation: **Density & Buoyancy**.
- [x] Set up modular project directory structure (`packages/`, `Learning&Progress/`).
- [x] Built the design token system (`packages/tokens/tokens.js`):
  - Standardized apparatus palette (glass, liquids, solids, shadows).
  - Defined interface styles (surfaces, typography, accents, focus rings).
  - Specified motion timings for UI interactions.
- [x] Implemented the reusable simulation shell (`packages/shell/`):
  - `shell.html`: Accessible app shell layout with responsive two-column grid.
  - `shell.css`: Adaptive styling (desktop panel + stage, mobile touch layout with `100dvh`).
  - `shell.js`: Runtime lifecycle manager, dynamic language switcher (EN/FR), canvas DPI-aware auto-resizing, and controls binding.

---

## Day 03 — Sun, Nov 08, 2026
**Focus:** HTML5 Canvas Exploration & Graphics Prototyping

- [x] Hands-on experimentation with HTML5 Canvas 2D context (`Learning&Progress/html_canvas.html`):
  - **Drawing Primitives:** Lines, rectangles, custom polygons, rounded rectangles (`roundRect`), and arc/circle geometry.
  - **Styles & Gradients:** Color fills, strokes, multi-stop linear gradients, and drop shadow effects (`shadowColor`, `shadowBlur`, `shadowOffset`).
  - **Typography & Font Rendering:** Canvas text rendering with custom web fonts (*Saira*, *IBM Plex Sans*), alignment, and baselines.
  - **Transformations:** Matrix translations (`ctx.translate`) and rotations (`ctx.rotate`).
  - **Image Rendering:** Asynchronous SVG/image loading and rendering (`ctx.drawImage`).
  - **Display Optimization:** Investigated `window.devicePixelRatio` scaling to eliminate canvas blurriness on high-DPI (Retina) screens.

---

## Day 04 — Mon, Nov 09, 2026
**Focus:** DPR Concepts, Build Pipeline & Density Placeholder

- [x] Explored Device Pixel Ratio (DPR) mechanics, canvas transformations, and `setTransform`.
- [x] Created `build.js`, along with `sim.config.js` and `sim.js` for the Density simulation placeholder.
- [x] Built and verified a simple placeholder shell for the Density experiment.

---

## Day 05 — Tue, Nov 10, 2026
**Focus:** Lab Components, Showcase Tool & Build Pipeline

- [x] Started the shared `packages/lab-components/` library with the Graduated Cylinder (`graduated-cylinder.js`).
- [x] Implemented two-pass glass rendering, cavity clipping, and responsive volume-to-Y mapping.
- [x] Built the `packages/showcase/` package to preview tokens and live apparatus components across different shapes.
- [x] Updated `build.js` to support the component library and added the `--showcase` build command.
- [x] Tuned glass and water apparatus tokens in `tokens.js`.
- [x] Added landscape layout support for short/wide screens in `shell.css`.

---

## Day 06 — Wed, Nov 11, 2026 *(Today)*
**Focus:** Liquid Materials, Scale Graduation & Optical Depth

- [x] Created shared liquid material component `packages/lab-components/materials/water.js`:
  - Implemented container-agnostic `fill()` with clipping, vertical gradient, and surface line.
- [x] Completed measurement scale (Stage 4) on `graduated-cylinder.js`:
  - Added major/mid/minor ticks, dynamic collision-aware number spacing, and `cm³` unit display.
- [x] Implemented optical depth and realistic lighting (Stage 5):
  - Soft base contact shadow using performance-friendly radial gradient (avoids heavy `shadowBlur`).
  - Interior vertical glass highlight reflection strip with rounded ends and fading gradient.
  - Integrated water rendering inside the cylinder cavity between the back and front glass passes.
- [x] Added `shadowFade` and `glassHighlightFade` tokens in `tokens.js` for clean alpha gradient stops.
- [x] Expanded showcase with `Large` specimen format and 250 cm³ cylinder specimen.



