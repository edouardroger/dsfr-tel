<template>
  <main class="fr-container" id="contenu">
    <div class="fr-grid-row fr-grid-row--center fr-grid-row--middle" style="min-height: 75vh">
      <div class="fr-col-12 fr-col-lg-6">
        <h1 class="fr-h4">Démonstration du paquet dsfr-tel</h1>

        <p class="fr-text--sm">Les champs marqués d’un astérisque (*) sont obligatoires.</p>

        <form novalidate @submit.prevent="validatePhone">
          <DsfrTel ref="phoneInput" fieldsetLegend="Votre numéro de téléphone portable" required />
          <div class="fr-mt-2w">
            <button type="submit" class="fr-btn fr-btn--sm">Vérifier le numéro</button>
          </div>
        </form>

        <div
          v-if="isPhoneNumberValid"
          ref="phoneValidCard"
          class="fr-mt-2w fr-alert fr-alert--success"
          tabindex="-1"
        >
          <p>
            Numéro valide<span v-if="phoneTypeLabel"> (type : {{ phoneTypeLabel }})</span> aux
            formats :
          </p>
          <ul>
            <li v-for="(formatted, format) in phoneNumbers" :key="format">
              <span class="fr-text--bold">{{ formatLabels[format] }}</span> : {{ formatted }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <p class="fr-text--center fr-mt-3w">
      <a
        class="fr-link"
        href="https://github.com/edouardroger/dsfr-tel"
        target="_blank"
        rel="noopener noreferrer"
      >
        Informations sur le paquet (nouvelle fenêtre)
      </a>
    </p>
  </main>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { numberTypeLabels } from '../src/index';

type Format = 'national' | 'international' | 'e164' | 'rfc3966';

const formatLabels: Record<Format, string> = {
  national: 'National',
  international: 'International',
  e164: 'E.164',
  rfc3966: 'RFC 3966'
};

const phoneInput = ref();
const phoneValidCard = ref<HTMLElement | null>(null);
const isPhoneNumberValid = ref(false);
const phoneNumbers = ref<Partial<Record<Format, string>>>({});
const phoneTypeLabel = ref('');

async function validatePhone(): Promise<void> {
  if (!phoneInput.value) return;

  if (!phoneInput.value.validatePhoneNumber()) {
    isPhoneNumberValid.value = false;
    phoneNumbers.value = {};
    phoneTypeLabel.value = '';
    phoneInput.value.focus();
    return;
  }

  const type = phoneInput.value.getPhoneNumberType();
  phoneTypeLabel.value = numberTypeLabels[type] ?? type;
  phoneNumbers.value = {
    national: phoneInput.value.getPhoneNumberFormatted('NATIONAL'),
    international: phoneInput.value.getPhoneNumberFormatted('INTERNATIONAL'),
    e164: phoneInput.value.getPhoneNumberFormatted('E164'),
    rfc3966: phoneInput.value.getPhoneNumberFormatted('RFC3966')
  };
  isPhoneNumberValid.value = true;

  await nextTick();
  phoneValidCard.value?.focus();
}
</script>
