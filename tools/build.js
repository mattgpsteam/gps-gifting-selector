'use strict';
// Re-embeds source/selector.template.html into index.html.
//
// index.html is the designer's compiled standalone: fonts, runtime and logo live in
// the __bundler/manifest block, and the page itself is one JSON string inside
// <script type="__bundler/template">. That string is the only thing we edit, so the
// build swaps it and leaves every other byte of the bundle alone.
//
//   node tools/build.js           write index.html
//   node tools/build.js --extract overwrite the source from index.html (after a new
//                                 design drop, before re-applying GPS changes)
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const indexFile = path.join(root, 'index.html');
const srcFile = path.join(root, 'source', 'selector.template.html');

const html = fs.readFileSync(indexFile, 'utf8');
const re = /(<script type="__bundler\/template">\s*\n)(.*)(\n\s*<\/script>)/;
const m = html.match(re);
if (!m) throw new Error('no __bundler/template block in index.html');

// The bundler escapes "</" so the string cannot close its own <script> tag.
const BS = String.fromCharCode(92);
const encode = (s) => JSON.stringify(s).split('</').join('<' + BS + 'u002F');

if (process.argv.includes('--extract')) {
  fs.writeFileSync(srcFile, JSON.parse(m[2].trim()));
  console.log('extracted ->', path.relative(root, srcFile));
} else {
  const src = fs.readFileSync(srcFile, 'utf8');
  const indent = m[2].match(/^\s*/)[0];
  const built = html.replace(re, (_, a, _b, c) => a + indent + encode(src) + c);
  fs.writeFileSync(indexFile, built);
  console.log('built index.html from', path.relative(root, srcFile));

  // /sales/ and /embed/ are the same page; the page itself skips the lead gate on
  // those paths. noindex keeps the gate-free copies out of search results.
  const noindex = built.replace(/<head>/i, '<head>\n  <meta name="robots" content="noindex, nofollow">');
  if (noindex === built) throw new Error('no <head> in index.html to mark noindex');
  for (const dir of ['sales', 'embed']) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
    fs.writeFileSync(path.join(root, dir, 'index.html'), noindex);
    console.log(`built ${dir}/index.html`);
  }
}
