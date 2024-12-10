import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import DsfrTel from './DsfrTel.vue';

describe('DsfrTel.vue', () => {
  it('affiche le champ de saisie', async () => {
    const wrapper = mount(DsfrTel);
    const input = wrapper.get('input[type="tel"]');
    expect(input.isVisible()).toBe(true);
    expect(input.attributes('type')).toBe('tel');
  });

  it('ouvre et ferme le menu déroulant de sélection de pays', async () => {
    const wrapper = mount(DsfrTel);

    // Vérifie que le bouton est présent avant d'interagir
    const button = wrapper.find('button.fr-select');
    expect(button.exists()).toBe(true);  // Vérifie que le bouton existe

    // Ouvre le menu
    await button.trigger('click');

    // Attends que l'élément devienne visible
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(wrapper.find('[role="listbox"]').isVisible()).toBe(true);

    // Ferme le menu
    await button.trigger('click');
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
  });

  it('sélectionne un pays dans la liste', async () => {
    const wrapper = mount(DsfrTel);
    const button = wrapper.find('button.fr-select');


    await button.trigger('click');
    const options = wrapper.findAll('li.fr-nav__link');
    const franceOption = options.find((option) =>
      option.text().includes('France')
    );

    expect(franceOption).toBeDefined();
    await franceOption?.trigger('click');


    expect(button.attributes('title')).toBe('Modifier le pays sélectionné : France');
  });

  it('affiche une erreur si le numéro est incorrect', async () => {
    const wrapper = mount(DsfrTel);
    const input = wrapper.get('input[type="tel"]');

    await input.setValue('1234');

    // Appel à la méthode de validation via l'instance Vue
    await wrapper.vm.validatePhoneNumber();

    expect(wrapper.text()).toContain('Le numéro renseigné est incorrect');
  });

  it('affiche une erreur si le champ est vide', async () => {
    const wrapper = mount(DsfrTel);
    const input = wrapper.get('input[type="tel"]');

    await input.setValue('');

    // Appel à la méthode de validation via l'instance Vue
    await wrapper.vm.validatePhoneNumber();

    expect(wrapper.text()).toContain('La saisie du numéro de téléphone est requise');
  });

  it('affiche une erreur si le type de numéro est incorrect', async () => {
    const wrapper = mount(DsfrTel, {
      props: {
        expectedTypes: ['MOBILE']
      }
    });
    const input = wrapper.get('input[type="tel"]');

    await input.setValue('+33123456789'); // Numéro fixe français
    await wrapper.vm.validatePhoneNumber();

    expect(wrapper.text()).toContain('Le numéro doit être de type Portable');
  });

  it('valide un numéro correct', async () => {
    const wrapper = mount(DsfrTel);
    const input = wrapper.get('input[type="tel"]');

    await input.setValue('+33612345678'); // Numéro de portable français valide
    await wrapper.vm.validatePhoneNumber();

    expect(wrapper.text()).not.toContain('incorrect');
    expect(wrapper.text()).not.toContain('requis');
  });

  it('bascule entre les pays avec les touches du clavier', async () => {
    const wrapper = mount(DsfrTel);
    const button = wrapper.find('button.fr-select');

    await button.trigger('click');
    await wrapper.get('[role="listbox"]').trigger('keydown', { key: 'ArrowDown' });

    const highlightedOption = wrapper.find('[aria-selected="true"]');
    expect(highlightedOption.exists()).toBe(true);
  });

  it('ferme le menu déroulant avec la touche Échap', async () => {
    const wrapper = mount(DsfrTel);
    const button = wrapper.find('button.fr-select');

    await button.trigger('click');
    await wrapper.get('[role="listbox"]').trigger('keydown', { key: 'Escape' });

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
  });
});