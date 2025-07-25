import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import DsfrTel from './DsfrTel.vue';

describe('DsfrTel.vue', () => {
  it('affiche le champ de saisie', async () => {
    const wrapper = mount(DsfrTel);
    const input = wrapper.get('input[inputmode="tel"]');
    expect(input.isVisible()).toBe(true);
    expect(input.attributes('type')).toBe('text');
  });

  it('ouvre et ferme le menu déroulant de sélection de pays', async () => {
    const wrapper = mount(DsfrTel);

    // Utilise la div avec la classe fr-select
    const combobox = wrapper.find('.fr-select');
    expect(combobox.exists()).toBe(true);

    // Ouvre le menu
    await combobox.trigger('click');
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(wrapper.find('[role="listbox"]').isVisible()).toBe(true);

    // Ferme le menu
    await combobox.trigger('click');
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
  });

  it('sélectionne un pays dans la liste', async () => {
    const wrapper = mount(DsfrTel);
    const combobox = wrapper.find('.fr-select');

    await combobox.trigger('click');
    await wrapper.vm.$nextTick();
    const options = wrapper.findAll('li.fr-nav__link');
    const franceOption = options.find((option) => option.text().includes('France'));

    expect(franceOption).toBeDefined();
    await franceOption?.trigger('click');

    // Vérifie que le titre de la combobox a bien été mis à jour
    expect(combobox.attributes('title')).toBe('Modifier l\'indicatif sélectionné (France métropolitaine)');
  });

  it('affiche une erreur si le numéro est trop court', async () => {
    const wrapper = mount(DsfrTel);
    const input = wrapper.get('input[inputmode="tel"]');

    await input.setValue('1234');

    // Appel à la méthode de validation via l'instance Vue
    await wrapper.vm.validatePhoneNumber();

    expect(wrapper.text()).toContain('Le numéro de téléphone saisi est trop court');
  });

  it('affiche une erreur si le champ est vide', async () => {
    // Pour tester l'erreur sur champ vide, le champ doit être requis
    const wrapper = mount(DsfrTel, { props: { required: true } });
    const input = wrapper.get('input[inputmode="tel"]');

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
    const input = wrapper.get('input[inputmode="tel"]');

    await input.setValue('+33123456789'); // Numéro fixe français
    await wrapper.vm.validatePhoneNumber();

    expect(wrapper.text()).toContain('Le numéro doit être de type portable');
  });

  it('valide un numéro correct', async () => {
    const wrapper = mount(DsfrTel);
    const input = wrapper.get('input[inputmode="tel"]');

    await input.setValue('+33612345678'); // Numéro de portable français valide
    await wrapper.vm.validatePhoneNumber();

    expect(wrapper.text()).not.toContain('incorrect');
    expect(wrapper.text()).not.toContain('requis');
  });

  it('bascule entre les pays avec les touches du clavier', async () => {
    const wrapper = mount(DsfrTel);
    const combobox = wrapper.find('.fr-select');

    await combobox.trigger('click');
    await wrapper.vm.$nextTick();
    // Simule appui sur ArrowDown sur la liste déroulante
    await wrapper.get('[role="listbox"]').trigger('keydown', { key: 'ArrowDown' });

    const highlightedOption = wrapper.find('[aria-selected="true"]');
    expect(highlightedOption.exists()).toBe(true);
  });

  it('ferme le menu déroulant avec la touche Échap', async () => {
    const wrapper = mount(DsfrTel);
    const combobox = wrapper.find('.fr-select');

    await combobox.trigger('click');
    await wrapper.vm.$nextTick();
    // Simule appui sur Escape sur la liste déroulante
    await wrapper.get('[role="listbox"]').trigger('keydown', { key: 'Escape' });

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
  });
});