// Charge chaque build UMD comme le ferait une page sans outil de build :
// Vue, puis libphonenumber-js, puis dsfr-tel, par balises <script>.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

const variants = [
  { build: 'dist/dsfr-tel.umd.js', metadata: 'libphonenumber-max.js' },
  { build: 'dist/mobile/dsfr-tel.umd.js', metadata: 'libphonenumber-mobile.js' }
];

let failed = false;

for (const { build, metadata } of variants) {
  const { window } = new JSDOM('<!doctype html><div id="app"></div>', { runScripts: 'outside-only' });
  try {
    window.eval(readFileSync(require.resolve('vue/dist/vue.global.prod.js'), 'utf8'));
    window.eval(readFileSync(join('node_modules/libphonenumber-js/bundle', metadata), 'utf8'));
    window.eval(readFileSync(build, 'utf8'));
    window.eval("Vue.createApp({ render: () => Vue.h(DsfrTel.DsfrTel) }).mount('#app')");

    const combobox = window.document.querySelector('[role="combobox"]');
    if (!combobox || window.DsfrTel.getCountryList().length === 0) {
      throw new Error('composant non monté');
    }
    console.log(`✓ ${build}`);
  } catch (error) {
    failed = true;
    console.error(`✗ ${build} : ${error.message}`);
  }
}

process.exit(failed ? 1 : 0);
