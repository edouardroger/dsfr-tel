import { mount } from '@vue/test-utils';
import { describe, it, expect, afterEach } from 'vitest';
import axe from 'axe-core';
import { createApp } from 'vue';
import DsfrTel from './DsfrTel.vue';
import DsfrTelPlugin from './index';

const TEL = 'input[inputmode="tel"]';
const COMBO = '[role="combobox"]';

/** Audit axe-core limité aux critères WCAG 2.1 A et AA (base du RGAA 4). */
async function auditAxe(element: Element) {
  const { violations } = await axe.run(element, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    // jsdom ne calcule pas le rendu : le contraste se contrôle sur la démo (pa11y).
    rules: { 'color-contrast': { enabled: false } }
  });
  return violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

function activeOption(wrapper: ReturnType<typeof mount>) {
  const id = wrapper.get(COMBO).attributes('aria-activedescendant');
  return wrapper.get(`#${id}`);
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('DsfrTel.vue', () => {
  it('affiche le champ de saisie', () => {
    const wrapper = mount(DsfrTel);
    const input = wrapper.get(TEL);
    expect(input.isVisible()).toBe(true);
    expect(input.attributes('type')).toBe('text');
  });

  it('déclare les attributs du motif combobox select-only', () => {
    const wrapper = mount(DsfrTel);
    const combobox = wrapper.get(COMBO);

    expect(combobox.element.tagName).toBe('DIV');
    expect(combobox.attributes('tabindex')).toBe('0');
    expect(combobox.attributes('aria-expanded')).toBe('false');
    expect(combobox.attributes('aria-controls')).toBeTruthy();
    expect(combobox.attributes('aria-activedescendant')).toBeUndefined();
    const labelId = combobox.attributes('aria-labelledby');
    expect(wrapper.get(`#${labelId}`).text()).toBe('Indicatif du pays');
    // Valeur restituée par le contenu ; libellé complet au survol.
    expect(combobox.text()).toBe('🇫🇷France métropolitaine (+33)');
    expect(combobox.attributes('title')).toBe(
      "Modifier l'indicatif sélectionné (France métropolitaine)"
    );
  });

  it('ouvre la liste au clic sur l’option retenue, et la referme', async () => {
    const wrapper = mount(DsfrTel);
    const combobox = wrapper.get(COMBO);

    await combobox.trigger('click');
    expect(wrapper.find('[role="listbox"]').exists()).toBe(true);
    expect(combobox.attributes('aria-expanded')).toBe('true');
    expect(activeOption(wrapper).text()).toContain('France métropolitaine');
    expect(wrapper.findAll('li[aria-selected="true"]')).toHaveLength(1);

    await combobox.trigger('click');
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(combobox.attributes('title')).toContain('France métropolitaine');
  });

  it('liste fermée : Flèche bas, Entrée et Espace ouvrent sans déplacer le focus visuel', async () => {
    for (const key of ['ArrowDown', 'Enter', ' ']) {
      const wrapper = mount(DsfrTel);
      await wrapper.get(COMBO).trigger('keydown', { key });
      expect(activeOption(wrapper).text()).toContain('France métropolitaine');
    }
  });

  it('liste fermée : Flèche haut et Début ouvrent sur la première option, Fin sur la dernière', async () => {
    for (const [key, expected] of [
      ['ArrowUp', 'Afghanistan'],
      ['Home', 'Afghanistan'],
      ['End', 'Zimbabwe']
    ]) {
      const wrapper = mount(DsfrTel);
      await wrapper.get(COMBO).trigger('keydown', { key });
      expect(activeOption(wrapper).text()).toContain(expected);
    }
  });

  it('liste ouverte : les flèches s’arrêtent aux extrémités', async () => {
    const wrapper = mount(DsfrTel);
    const combobox = wrapper.get(COMBO);

    await combobox.trigger('keydown', { key: 'End' });
    await combobox.trigger('keydown', { key: 'ArrowDown' });
    expect(activeOption(wrapper).text()).toContain('Zimbabwe');

    await combobox.trigger('keydown', { key: 'Home' });
    await combobox.trigger('keydown', { key: 'ArrowUp' });
    expect(activeOption(wrapper).text()).toContain('Afghanistan');

    await combobox.trigger('keydown', { key: 'ArrowDown' });
    expect(activeOption(wrapper).text()).not.toContain('Afghanistan');
  });

  it('liste ouverte : Page suiv. et Page préc. sautent de dix options, bornées', async () => {
    const wrapper = mount(DsfrTel);
    const combobox = wrapper.get(COMBO);

    await combobox.trigger('keydown', { key: 'Home' });
    await combobox.trigger('keydown', { key: 'PageDown' });
    const options = wrapper.findAll('li[role="option"]');
    expect(activeOption(wrapper).attributes('id')).toBe(options[10].attributes('id'));

    await combobox.trigger('keydown', { key: 'ArrowUp' });
    await combobox.trigger('keydown', { key: 'PageUp' });
    expect(activeOption(wrapper).text()).toContain('Afghanistan');

    await combobox.trigger('keydown', { key: 'End' });
    await combobox.trigger('keydown', { key: 'PageDown' });
    expect(activeOption(wrapper).text()).toContain('Zimbabwe');
  });

  it('retient l’option avec Entrée, Espace ou Alt + Flèche haut', async () => {
    for (const [key, altKey] of [
      ['Enter', false],
      [' ', false],
      ['ArrowUp', true]
    ] as const) {
      const wrapper = mount(DsfrTel);
      const combobox = wrapper.get(COMBO);
      await combobox.trigger('keydown', { key: 'Home' });
      await combobox.trigger('keydown', { key, altKey });

      expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
      expect(combobox.attributes('title')).toContain('Afghanistan');
    }
  });

  it('retient l’option avec Tab', async () => {
    const wrapper = mount(DsfrTel);
    const combobox = wrapper.get(COMBO);

    await combobox.trigger('keydown', { key: 'End' });
    await combobox.trigger('keydown', { key: 'Tab' });

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(combobox.attributes('title')).toContain('Zimbabwe');
  });

  it('ferme avec Échap en conservant la valeur', async () => {
    const wrapper = mount(DsfrTel);
    const combobox = wrapper.get(COMBO);

    await combobox.trigger('keydown', { key: 'End' });
    await combobox.trigger('keydown', { key: 'Escape' });

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(combobox.attributes('title')).toContain('France métropolitaine');
  });

  it('retient l’option active quand le focus quitte la combobox', async () => {
    const wrapper = mount(DsfrTel);
    const combobox = wrapper.get(COMBO);

    await combobox.trigger('keydown', { key: 'End' });
    await combobox.trigger('blur');

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(combobox.attributes('title')).toContain('Zimbabwe');
  });

  it('recherche un pays à la frappe, sans accent, liste fermée comprise', async () => {
    const wrapper = mount(DsfrTel);
    const combobox = wrapper.get(COMBO);

    await combobox.trigger('keydown', { key: 'e' });
    await combobox.trigger('keydown', { key: 'g' });

    expect(wrapper.find('[role="listbox"]').exists()).toBe(true);
    expect(activeOption(wrapper).text()).toContain('Égypte');
  });

  it('reste sur l’option qui correspond à toute la saisie', async () => {
    const wrapper = mount(DsfrTel);
    const combobox = wrapper.get(COMBO);

    for (const key of 'belg') await combobox.trigger('keydown', { key });
    expect(activeOption(wrapper).text()).toContain('Belgique');
  });

  it('parcourt les options de même initiale en répétant la lettre', async () => {
    const wrapper = mount(DsfrTel);
    const combobox = wrapper.get(COMBO);

    await combobox.trigger('keydown', { key: 'z' });
    const premier = activeOption(wrapper).text();
    await combobox.trigger('keydown', { key: 'z' });
    const second = activeOption(wrapper).text();

    expect(premier).toContain('Zambie');
    expect(second).toContain('Zimbabwe');
  });

  it('sélectionne un pays dans la liste', async () => {
    const wrapper = mount(DsfrTel);
    const combobox = wrapper.get(COMBO);

    await combobox.trigger('click');
    const option = wrapper
      .findAll('li[role="option"]')
      .find((o) => o.text().includes('Belgique'));
    await option?.trigger('click');

    expect(combobox.attributes('title')).toBe("Modifier l'indicatif sélectionné (Belgique)");
    expect(combobox.text()).toContain('🇧🇪');
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
  });

  it('synchronise l’indicatif avec un numéro international saisi', async () => {
    const wrapper = mount(DsfrTel);
    await wrapper.get(TEL).setValue('+3221234567');
    await wrapper.vm.$nextTick();

    expect(wrapper.get(COMBO).attributes('title')).toContain('Belgique');
  });

  it('affiche une erreur si le numéro est trop court', async () => {
    const wrapper = mount(DsfrTel);
    await wrapper.get(TEL).setValue('1234');
    await wrapper.vm.validatePhoneNumber();

    expect(wrapper.text()).toContain('Le numéro de téléphone saisi est trop court');
  });

  it('affiche une erreur si le champ est vide', async () => {
    const wrapper = mount(DsfrTel, { props: { required: true } });
    await wrapper.get(TEL).setValue('');
    await wrapper.vm.validatePhoneNumber();

    expect(wrapper.text()).toContain('La saisie du numéro de téléphone est requise');
  });

  it('affiche une erreur si le type de numéro est incorrect', async () => {
    const wrapper = mount(DsfrTel, { props: { expectedTypes: ['MOBILE'] } });
    await wrapper.get(TEL).setValue('+33123456789'); // Numéro fixe français
    await wrapper.vm.validatePhoneNumber();

    expect(wrapper.text()).toContain('Le numéro doit être de type portable');
  });

  it('valide un numéro correct', async () => {
    const wrapper = mount(DsfrTel);
    await wrapper.get(TEL).setValue('+33612345678');
    await wrapper.vm.validatePhoneNumber();

    expect(wrapper.text()).not.toContain('incorrect');
    expect(wrapper.text()).not.toContain('requis');
  });

  it('génère des identifiants uniques par instance', () => {
    const wrapper = mount({
      components: { DsfrTel },
      template: '<DsfrTel /><DsfrTel />'
    });
    const ids = wrapper.findAll(TEL).map((input) => input.attributes('id'));
    expect(ids[0]).toBeTruthy();
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('distingue plusieurs applications grâce à idPrefix', () => {
    const idOf = (idPrefix: string) =>
      mount(DsfrTel, { global: { config: { idPrefix } } }).get(TEL).attributes('id');
    expect(idOf('app-a')).not.toBe(idOf('app-b'));
  });

  it('associe une étiquette à chaque champ', () => {
    const wrapper = mount(DsfrTel);
    const telId = wrapper.get(TEL).attributes('id');
    const labelId = wrapper.get(COMBO).attributes('aria-labelledby');
    expect(wrapper.get(`label[for="${telId}"]`).text()).toBe('Numéro de téléphone');
    expect(wrapper.get(`#${labelId}`).text()).toBe('Indicatif du pays');
  });

  it('émet le numéro au format E.164 par défaut', async () => {
    const wrapper = mount(DsfrTel);
    await wrapper.get(TEL).setValue('0612345678');

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('+33612345678');
  });

  it('émet le format demandé par modelFormat', async () => {
    const wrapper = mount(DsfrTel, { props: { modelFormat: 'INTERNATIONAL' } });
    await wrapper.get(TEL).setValue('0612345678');

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('+33 6 12 34 56 78');
  });

  it('émet une valeur vide tant que la saisie n’est pas analysable', async () => {
    const wrapper = mount(DsfrTel);
    await wrapper.get(TEL).setValue('0');

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    await wrapper.get(TEL).setValue('06123');
    await wrapper.get(TEL).setValue('0');
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('');
  });

  it('émet le nouveau numéro E.164 quand le pays change', async () => {
    const wrapper = mount(DsfrTel);
    await wrapper.get(TEL).setValue('0470123456');
    await wrapper.get(COMBO).trigger('click');
    const belgique = wrapper.findAll('li[role="option"]').find((o) => o.text().includes('Belgique'));
    await belgique?.trigger('click');

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('+32470123456');
  });

  it('fonctionne en aller-retour avec v-model sans reformater le champ', async () => {
    const wrapper = mount({
      components: { DsfrTel },
      data: () => ({ tel: '+32470123456' }),
      template: '<DsfrTel v-model="tel" />'
    });
    await wrapper.vm.$nextTick();
    const input = wrapper.get<HTMLInputElement>(TEL);
    // Valeur E.164 reçue du parent : pays déduit, affichage national.
    expect(input.element.value).toBe('0470 12 34 56');
    expect(wrapper.get(COMBO).attributes('title')).toContain('Belgique');

    await input.setValue('0470 12 34 5');
    await input.setValue('0470 12 34 56');
    expect((wrapper.vm as unknown as { tel: string }).tel).toBe('+32470123456');
    expect(input.element.value).toBe('0470 12 34 56');
  });

  it('accepte une valeur initiale via modelValue', async () => {
    const wrapper = mount(DsfrTel, { props: { modelValue: '+33612345678' } });
    await wrapper.vm.$nextTick();

    expect(wrapper.get<HTMLInputElement>(TEL).element.value).toBe('06 12 34 56 78');
  });

  it('localise les noms de pays via Intl.DisplayNames', async () => {
    const wrapper = mount(DsfrTel, { props: { locale: 'en' } });
    const combobox = wrapper.get(COMBO);

    expect(combobox.attributes('title')).toContain('(France)');

    await combobox.trigger('click');
    const options = wrapper.findAll('li[role="option"]');
    expect(options.some((option) => option.text().includes('Germany (+49)'))).toBe(true);
  });

  it('applique les corrections de noms propres au contexte téléphonique', async () => {
    const wrapper = mount(DsfrTel);
    await wrapper.get(COMBO).trigger('click');
    const options = wrapper.findAll('li[role="option"]');

    // « FR » ne couvre que la métropole : l'outre-mer a ses propres indicatifs.
    expect(options.some((option) => option.text().includes('France métropolitaine (+33)'))).toBe(true);
    expect(options.some((option) => option.text().includes('Guadeloupe (+590)'))).toBe(true);
    expect(options).toHaveLength(244);
  });

  it('signale le caractère obligatoire sans déclencher la validation native', () => {
    const input = mount(DsfrTel, { props: { required: true } }).get(TEL);
    expect(input.attributes('required')).toBeUndefined();
    expect(input.attributes('aria-required')).toBe('true');
  });

  it('permet de traduire les chaînes de l’interface', async () => {
    const wrapper = mount(DsfrTel, {
      props: {
        locale: 'en',
        expectedTypes: ['MOBILE', 'FIXED_LINE'],
        errorMessages: {
          required: 'Required.',
          invalid: 'Invalid.',
          incorrectType: 'Must be a {types} number.',
          unknown: 'Unknown error.',
          parse: 'Parse error.'
        },
        labels: {
          country: 'Country code',
          countryList: 'Country codes',
          changeCountry: 'Change country code ({country})',
          hint: 'National format (e.g. {example})',
          types: { MOBILE: 'Mobile', FIXED_LINE: 'Landline' }
        }
      }
    });
    const combobox = wrapper.get(COMBO);

    expect(combobox.attributes('title')).toBe('Change country code (France)');
    expect(wrapper.get(`#${combobox.attributes('aria-labelledby')}`).text()).toBe('Country code');
    expect(wrapper.get('legend').text()).toContain('National format (e.g. 06 12 34 56 78)');

    await combobox.trigger('click');
    expect(wrapper.get('[role="listbox"]').attributes('aria-label')).toBe('Country codes');
    await combobox.trigger('click');

    await wrapper.get(TEL).setValue('+33899123456'); // numéro surtaxé
    wrapper.vm.validatePhoneNumber();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Must be a mobile or landline number.');
  });

  it('ne présente aucune erreur axe, liste fermée', async () => {
    const wrapper = mount(DsfrTel, { attachTo: document.body, props: { required: true } });
    expect(await auditAxe(wrapper.element)).toEqual([]);
  });

  it('ne présente aucune erreur axe, liste ouverte', async () => {
    const wrapper = mount(DsfrTel, { attachTo: document.body });
    await wrapper.get(COMBO).trigger('click');
    await wrapper.get(COMBO).trigger('keydown', { key: 'ArrowDown' });
    expect(await auditAxe(wrapper.element)).toEqual([]);
  });

  it('ne présente aucune erreur axe, message d’erreur affiché', async () => {
    const wrapper = mount(DsfrTel, { attachTo: document.body });
    await wrapper.get(TEL).setValue('1234');
    wrapper.vm.validatePhoneNumber();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.fr-message--error').exists()).toBe(true);
    expect(await auditAxe(wrapper.element)).toEqual([]);
  });

  it('expose le numéro dans les quatre formats et son type', async () => {
    const wrapper = mount(DsfrTel);
    await wrapper.get(TEL).setValue('+33612345678');

    expect(wrapper.vm.getPhoneNumberFormatted('E164')).toBe('+33612345678');
    expect(wrapper.vm.getPhoneNumberFormatted('NATIONAL')).toBe('06 12 34 56 78');
    expect(wrapper.vm.getPhoneNumberFormatted('INTERNATIONAL')).toBe('+33 6 12 34 56 78');
    expect(wrapper.vm.getPhoneNumberFormatted('RFC3966')).toBe('tel:+33612345678');
    expect(wrapper.vm.getPhoneNumberType()).toBe('MOBILE');
  });

  it('réinitialise le champ et le message avec reset()', async () => {
    const wrapper = mount(DsfrTel);
    await wrapper.get(TEL).setValue('1234');
    wrapper.vm.validatePhoneNumber();
    await wrapper.vm.$nextTick();

    wrapper.vm.reset();
    await wrapper.vm.$nextTick();

    expect(wrapper.get<HTMLInputElement>(TEL).element.value).toBe('');
    expect(wrapper.find('.fr-message--error').exists()).toBe(false);
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('');
  });

  it('enregistre le composant globalement via le plugin', () => {
    const app = createApp({});
    app.use(DsfrTelPlugin);
    expect(app.component('DsfrTel')).toBe(DsfrTel);
  });

  it('ajoute un astérisque à la légende quand la saisie est requise', () => {
    const legend = mount(DsfrTel, { props: { required: true } }).get('legend');
    expect(legend.text()).toContain('portable\u00a0*');
    expect(legend.get('.fr-tel__required').attributes('aria-hidden')).toBe('true');
  });

  it('ne mentionne rien quand la saisie est facultative', () => {
    const wrapper = mount(DsfrTel);
    expect(wrapper.find('.fr-tel__required').exists()).toBe(false);
  });

  it('accepte « (requis) », lu par les technologies d’assistance', () => {
    const marker = mount(DsfrTel, { props: { required: true, requiredMarker: '(requis)' } }).get(
      '.fr-tel__required'
    );
    expect(marker.text()).toBe('(requis)');
    expect(marker.attributes('aria-hidden')).toBeUndefined();
  });

  it('accepte une mention libre', () => {
    const marker = mount(DsfrTel, {
      props: { required: true, requiredMarker: '(obligatoire)' }
    }).get('.fr-tel__required');
    expect(marker.text()).toBe('(obligatoire)');
    expect(marker.attributes('aria-hidden')).toBeUndefined();
  });

  it('permet de ne rien afficher quand le formulaire l’indique déjà', () => {
    const wrapper = mount(DsfrTel, { props: { required: true, requiredMarker: '' } });
    expect(wrapper.find('.fr-tel__required').exists()).toBe(false);
    expect(wrapper.get(TEL).attributes('aria-required')).toBe('true');
  });

  it('ne présente aucune erreur axe avec un astérisque', async () => {
    const wrapper = mount(DsfrTel, { attachTo: document.body, props: { required: true } });
    expect(await auditAxe(wrapper.element)).toEqual([]);
  });

  it('n’annonce que les types proposés à la personne', async () => {
    const wrapper = mount(DsfrTel);
    await wrapper.get(TEL).setValue('05 49 41 30 41');
    wrapper.vm.validatePhoneNumber();
    await wrapper.vm.$nextTick();

    expect(wrapper.get('.fr-message--error').text()).toBe('Le numéro doit être de type portable.');
  });

  it('énumère plusieurs types attendus selon les règles de la langue', async () => {
    const wrapper = mount(DsfrTel, {
      props: { expectedTypes: ['MOBILE', 'FIXED_LINE_OR_MOBILE', 'FIXED_LINE', 'TOLL_FREE'] }
    });
    await wrapper.get(TEL).setValue('08 99 12 34 56');
    wrapper.vm.validatePhoneNumber();
    await wrapper.vm.$nextTick();

    expect(wrapper.get('.fr-message--error').text()).toBe(
      'Le numéro doit être de type portable, fixe ou numéro gratuit.'
    );
  });

  it('mentionne FIXED_LINE_OR_MOBILE lorsqu’il est le seul type attendu', async () => {
    const wrapper = mount(DsfrTel, { props: { expectedTypes: ['FIXED_LINE_OR_MOBILE'] } });
    await wrapper.get(TEL).setValue('06 12 34 56 78');
    wrapper.vm.validatePhoneNumber();
    await wrapper.vm.$nextTick();

    expect(wrapper.get('.fr-message--error').text()).toBe(
      'Le numéro doit être de type fixe ou portable.'
    );
  });
});
