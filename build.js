// build.js: builds one sim, or the showcase page, into a single offline HTML file.
//   node build.js density       ->  dist/density.html
//   node build.js --showcase    ->  dist/showcase.html
// No dependencies: it only uses the two modules that ship with Node.

const fs = require('fs');
const path = require('path');

const root = __dirname;
const tokens = require('./packages/tokens/tokens.js');

// ---------- Small helpers ----------

// Print a message and stop with an error code
function fail(message) {
  console.error(message);
  process.exit(1);
}

// Read a file, given a path relative to the project root
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

// ---------- Tokens ----------

// Each group gets a one-letter prefix: water in apparatus becomes --a-water
const PREFIX = { apparatus: 'a', interface: 'i', motion: 'm' };

// Tokens as CSS variables, for the stylesheets
function tokensToCss() {
  const lines = Object.keys(PREFIX).map(group =>
    Object.keys(tokens[group])
      .map(name => `  --${PREFIX[group]}-${name}: ${tokens[group][name]};`)
      .join('\n')
  ).join('\n');
  return `:root {\n${lines}\n}`;
}

// Tokens as plain data, for the canvas, which can't read CSS variables
function tokensToJs() {
  return 'window.SKUU_TOKENS = ' + JSON.stringify(tokens) + ';';
}

// ---------- Components ----------

const COMPONENTS_DIR = path.join(root, 'packages', 'lab-components');

// Every .js file under a folder, including inside sub-folders, in a fixed order.
// The function calls itself for each sub-folder (this is called recursion).
function listJsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))   // alphabetical, so builds are repeatable
    .flatMap(entry => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return listJsFiles(full);
      return entry.name.endsWith('.js') ? [full] : [];
    });
}

// Join component files into one block of text, each with a label comment
function joinComponents(files) {
  return files.map(file => {
    const name = path.relative(COMPONENTS_DIR, file).split(path.sep).join('/');
    return `// ----- component: ${name} -----\n` + fs.readFileSync(file, 'utf8');
  }).join('\n');
}

// ---------- Template and safety checks ----------

// Replace every {{MARKER}} with its text. The replacement is a function, so the inserted
// code is copied exactly as written, with no special handling of "$" characters.
function fillTemplate(template, parts) {
  const html = template.replace(/\{\{([A-Z_]+)\}\}/g, (match, name) => {
    if (!(name in parts)) fail(`Unknown marker ${match} in the template`);
    return parts[name];
  });
  const leftover = html.match(/\{\{[A-Z_]+\}\}/);
  if (leftover) fail(`Unfilled marker left in the output: ${leftover[0]}`);
  return html;
}

// The output must work fully offline: no links to the internet
function checkOffline(html) {
  const external = /(src|href)\s*=\s*["']https?:|url\(\s*["']?https?:|@import|https?:\/\/cdn/i;
  if (external.test(html)) fail('External reference found. Pages must work fully offline.');
}

// Write dist/<name>.html and report its size
function writeOutput(name, html) {
  const sizeKb = Buffer.byteLength(html, 'utf8') / 1024;
  if (sizeKb > 1024) console.warn(`Warning: ${sizeKb.toFixed(0)} KB is over the 1 MB budget.`);
  const distDir = path.join(root, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  const outFile = path.join(distDir, name + '.html');
  fs.writeFileSync(outFile, html);
  console.log(`Built ${path.relative(root, outFile)} (${sizeKb.toFixed(1)} KB)`);
}

// ---------- Building a sim ----------

// Look for simulations/<subject>/<slug>. Fail if there are none or more than one.
function findSimDir(slug) {
  const simsDir = path.join(root, 'simulations');
  const matches = fs.readdirSync(simsDir)
    .map(subject => path.join(simsDir, subject, slug))
    .filter(p => fs.existsSync(p) && fs.statSync(p).isDirectory());
  if (matches.length === 0) fail(`No sim called "${slug}" found under simulations/<subject>/`);
  if (matches.length > 1) fail(`Slug "${slug}" exists in more than one subject folder:\n${matches.join('\n')}`);
  return matches[0];
}

function buildSim(slug) {
  const simDir = findSimDir(slug);
  const readSim = fileName => fs.readFileSync(path.join(simDir, fileName), 'utf8');

  // sim.config.js is written for the browser (it assigns to window), so we run it here
  // against a stand-in window object, only to read its components list.
  const fakeWindow = {};
  new Function('window', readSim('sim.config.js'))(fakeWindow);
  const config = fakeWindow.SKUU_CONFIG;
  if (!config) fail('sim.config.js must set window.SKUU_CONFIG');

  // Only the components the sim asks for. "glassware/graduated-cylinder" maps to
  // packages/lab-components/glassware/graduated-cylinder.js
  const files = (config.components || []).map(name => {
    const file = path.join(COMPONENTS_DIR, name + '.js');
    if (!fs.existsSync(file)) fail(`Component "${name}" not found. Expected: ${path.relative(root, file)}`);
    return file;
  });

  const html = fillTemplate(read('packages/shell/shell.html'), {
    TITLE: slug,
    TOKENS_CSS: tokensToCss(),
    SHELL_CSS: read('packages/shell/shell.css'),
    TOKENS_JS: tokensToJs(),
    COMPONENTS_JS: joinComponents(files),
    CONFIG: readSim('sim.config.js'),
    SIM_JS: readSim('sim.js'),
    SHELL_JS: read('packages/shell/shell.js')
  });

  checkOffline(html);
  writeOutput(slug, html);
}

// ---------- Building the showcase ----------

function buildShowcase() {
  const html = fillTemplate(read('packages/showcase/showcase.html'), {
    TITLE: 'Skuulabs showcase',
    TOKENS_CSS: tokensToCss(),
    SHOWCASE_CSS: read('packages/showcase/showcase.css'),
    TOKENS_JS: tokensToJs(),
    // Unlike a sim, the showcase includes EVERY component, since it shows the whole library
    COMPONENTS_JS: joinComponents(listJsFiles(COMPONENTS_DIR)),
    SHOWCASE_JS: read('packages/showcase/showcase.js')
  });

  checkOffline(html);
  writeOutput('showcase', html);
}

// ---------- Start here ----------

const arg = process.argv[2];
if (!arg) fail('Usage: node build.js <sim-slug>   or   node build.js --showcase');
if (arg === '--showcase') buildShowcase();
else buildSim(arg);