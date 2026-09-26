// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import DsfrTel from './DsfrTel.vue';

const render = () => renderToString(createSSRApp({ render: () => h(DsfrTel, { required: true }) }));

describe('DsfrTel.vue — rendu serveur', () => {
  it('se rend sans accès au DOM', async () => {
    const html = await render();
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-required="true"');
  });

  it('produit les mêmes identifiants à chaque requête (hydratation)', async () => {
    const ids = async () => [...(await render()).matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    const premiere = await ids();
    expect(premiere.length).toBeGreaterThan(0);
    expect(await ids()).toEqual(premiere);
  });
});
