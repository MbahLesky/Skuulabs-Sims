// build.js: packs the shell, the tokens and one sim into a single offline HTML file.
// Usage: node build.js density   ->   dist/density.html

const fs = require('fs');       // reading and writing files
const path = require('path');   // building file paths that work on every system

const root = __dirname;         // the folder this script sits in

// ---------- 1. Read the slug typed after the command ----------
// process.argv is [node, build.js, density], so the slug is at position 2.
const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node build.js <sim-slug>   e.g. node build.js density');
  process.exit(1);
}

// ---------- 2. Find the sim folder inside the subject folders ----------
// Looks for simulations/<subject>/<slug>, and fails clearly if it finds none or several.
const simsDir = path.join(root, 'simulations');
const matches = fs.readdirSync(simsDir)
  .map(subject => path.join(simsDir, subject, slug))
  .filter(p => fs.existsSync(p) && fs.statSync(p).isDirectory());

if (matches.length === 0) {
  console.error(`No sim called "${slug}" found under simulations/<subject>/`);
  process.exit(1);
}
if (matches.length > 1) {
  console.error(`Slug "${slug}" exists in more than one subject folder:\n${matches.join('\n')}`);
  process.exit(1);
}
const simDir = matches[0];

// ---------- 3. Turn the tokens into CSS variables ----------
// Each group gets a one-letter prefix, so water in the apparatus group becomes --a-water.
const tokens = require('./packages/tokens/tokens.js');
const PREFIX = { apparatus: 'a', interface: 'i', motion: 'm' };

const variableLines = Object.keys(PREFIX).map(group =>
  Object.keys(tokens[group])
    .map(name => `  --${PREFIX[group]}-${name}: ${tokens[group][name]};`)
    .join('\n')
).join('\n');

const tokensCss = `:root {\n${variableLines}\n}`;

// ---------- 4. Read the files and fill the markers ----------
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const readSim = fileName => fs.readFileSync(path.join(simDir, fileName), 'utf8');

const parts = {
  TITLE: slug,
  TOKENS_CSS: tokensCss,
  SHELL_CSS: read('packages/shell/shell.css'),
  CONFIG: readSim('sim.config.js'),
  SIM_JS: readSim('sim.js'),
  SHELL_JS: read('packages/shell/shell.js')
};

// Matches {{ANYTHING_LIKE_THIS}}. The replacement is a FUNCTION, so the inserted code is
// copied exactly as written. (A plain string would mangle any "$" characters in your code.)
let html = read('packages/shell/shell.html');
html = html.replace(/\{\{([A-Z_]+)\}\}/g, (match, name) => {
  if (!(name in parts)) {
    console.error(`Unknown marker ${match} in shell.html`);
    process.exit(1);
  }
  return parts[name];
});

// ---------- 5. Safety checks ----------
// a) No marker may be left unfilled.
const leftover = html.match(/\{\{[A-Z_]+\}\}/);
if (leftover) {
  console.error(`Unfilled marker left in the output: ${leftover[0]}`);
  process.exit(1);
}

// b) The file must be fully offline: no links to the internet.
const external = /(src|href)\s*=\s*["']https?:|url\(\s*["']?https?:|@import|https?:\/\/cdn/i;
if (external.test(html)) {
  console.error('External reference found. Sims must work fully offline.');
  process.exit(1);
}

// c) Warn if the file is getting heavy (budget: well under 1 MB).
const sizeKb = Buffer.byteLength(html, 'utf8') / 1024;
if (sizeKb > 1024) console.warn(`Warning: ${sizeKb.toFixed(0)} KB is over the 1 MB budget.`);

// ---------- 6. Write the result ----------
const distDir = path.join(root, 'dist');
fs.mkdirSync(distDir, { recursive: true });   // does nothing if it already exists
const outFile = path.join(distDir, `${slug}.html`);
fs.writeFileSync(outFile, html);

console.log(`Built ${path.relative(root, outFile)} (${sizeKb.toFixed(1)} KB)`);