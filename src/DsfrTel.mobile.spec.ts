import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import DsfrTel from './DsfrTel.vue';

// Reproduit la variante `dsfr-tel/mobile` : même composant, métadonnées « mobile ».
vi.mock('libphonenumber-js/max', async () => await import('libphonenumber-js/mobile'));

const TEL = 'input[inputmode="tel"]';

async function validate(value: string, props: Record<string, unknown> = {}) {
  const wrapper = mount(DsfrTel, { props });
  await wrapper.get(TEL).setValue(value);
  const isValid = wrapper.vm.validatePhoneNumber();
  await wrapper.vm.$nextTick();
  return { wrapper, isValid };
}

describe('DsfrTel.vue — variante métadonnées mobile', () => {
  it('accepte un numéro de portable', async () => {
    const { wrapper, isValid } = await validate('06 12 34 56 78');
    expect(isValid).toBe(true);
    expect(wrapper.vm.getPhoneNumberType()).toBe('MOBILE');
  });

  it('refuse un numéro fixe, signalé comme invalide', async () => {
    const { wrapper, isValid } = await validate('01 23 45 67 89', {
      errorMessages: {
        required: 'Requis.',
        invalid: 'Veuillez saisir un numéro de téléphone portable valide.',
        incorrectType: 'Type incorrect.',
        unknown: 'Erreur.',
        parse: 'Erreur.'
      }
    });
    expect(isValid).toBe(false);
    expect(wrapper.text()).toContain('Veuillez saisir un numéro de téléphone portable valide.');
  });

  it('accepte un numéro nord-américain avec les types attendus par défaut', async () => {
    const { wrapper, isValid } = await validate('+1 201 555 0123');
    expect(isValid).toBe(true);
    expect(wrapper.vm.getPhoneNumberType()).toBe('MOBILE');
  });

  it('propose la même liste de pays', async () => {
    const wrapper = mount(DsfrTel);
    await wrapper.get('[role="combobox"]').trigger('click');
    expect(wrapper.findAll('li[role="option"]')).toHaveLength(244);
  });
});
