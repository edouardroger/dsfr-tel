<template>
  <fieldset class="fr-fieldset" :class="{ 'fr-fieldset--success': !errorMessage, 'fr-fieldset--error': errorMessage }">
    <legend class="fr-fieldset__legend">{{ fieldsetLegend }}</legend>
    <div class="fr-fieldset__element fr-fieldset__element--inline fr-fieldset__element--tel">
      <button type="button" class="fr-select" aria-haspopup="listbox" :aria-expanded="isDropdownOpen"
        @click="toggleDropdown" ref="dropdownButton"
        :title="'Modifier le pays sélectionné : ' + getSelectedCountry.name">
        <span aria-hidden="true" class="flag-indicatif">{{ getSelectedCountry.flag }}</span>
        <span class="fr-sr-only">Modifier le pays sélectionné{{ getSelectedCountry.name }}</span>
      </button>
    </div>
    <div class="fr-menu">
      <ul v-if="isDropdownOpen" role="listbox" tabindex="-1" @keydown="handleKeydown" ref="dropdownMenu"
        aria-label="Liste de sélection du pays" style="max-height:200px;overflow-y:auto;" class="fr-menu__list">
        <li v-for="(country, index) in countries" :key="country.code" role="option" @click="selectCountry(country)"
          :aria-selected="country.code === selectedCountry"
          :class="{ 'selected': country.code === selectedCountry, 'highlighted': index === highlightedIndex, 'fr-nav__link': true }"
          @mouseover="highlightedIndex = index" @mouseleave="highlightedIndex = -1" ref="countryOption"
          :tabindex="index === highlightedIndex ? 0 : -1">
          <span aria-hidden="true" class="flag-indicatif">{{ country.flag }}</span>
          {{ country.name }} (+{{ country.dialCode }})
        </li>
      </ul>
    </div>
    <div
      class="fr-fieldset__element fr-fieldset__element--inline fr-fieldset__element--tel fr-fieldset__element--dialcode">
      <input v-model="phoneNumber" @input="formatPhoneNumber" :placeholder="placeholder" class="fr-input" type="tel"
        aria-label="Votre numéro de téléphone" id="tel-input" aria-describedby="tel-input-message" />
    </div>
    <p v-if="errorMessage" class="fr-fieldset__element fr-message fr-message--error" id="tel-input-message">{{
      errorMessage }}</p>
  </fieldset>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, nextTick, PropType } from 'vue';
import { parsePhoneNumber, getExampleNumber, AsYouType, PhoneNumber, CountryCode, getCountryCallingCode } from 'libphonenumber-js/max';
import examples from 'libphonenumber-js/examples.mobile.json';
import countriesData from './countries.json';
import timezoneToCountry from './timezones.json';

const countries: Country[] = countriesData.map((country: any) => ({
  code: country.code as CountryCode,
  name: country.name,
  dialCode: country.dialCode,
  flag: country.flag
}));


type Country = {
  code: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
};

type ErrorMessages = {
  required: string;
  invalid: string;
  incorrectType: string;
  unknown: string;
};

type TimezoneToCountry = Record<string, string>;

const timezoneToCountryTyped: TimezoneToCountry = timezoneToCountry;

const props = defineProps({
  expectedTypes: {
    type: Array as PropType<string[]>,
    default: () => ['MOBILE', 'FIXED_LINE_OR_MOBILE']
  },
  fieldsetLegend: {
    type: String,
    default: () => 'Votre numéro de téléphone portable'
  },
  errorMessages: {
    type: Object as PropType<ErrorMessages>,
    default: () => ({
      required: 'La saisie du numéro de téléphone est requise.',
      invalid: 'Le numéro renseigné est incorrect. Veuillez le vérifier.',
      incorrectType: 'Le numéro doit être de type {types}.',
      unknown: "Erreur lors de la validation du numéro."
    })
  }
});

const selectedCountry = ref<CountryCode>('FR')
const phoneNumber = ref<string>('');
const errorMessage = ref<string>('');
const isDropdownOpen = ref<boolean>(false);
const highlightedIndex = ref<number>(-1);

const dropdownButton = ref<HTMLButtonElement | null>(null);
const dropdownMenu = ref<HTMLElement | null>(null);
const countryOption = ref<HTMLElement[]>([]);

const numberTypeLabels: Record<string, string> = {
  'MOBILE': 'Portable',
  'FIXED_LINE': 'Fixe',
  'FIXED_LINE_OR_MOBILE': 'Fixe ou portable',
  'TOLL_FREE': 'Numéro gratuit',
  'PREMIUM_RATE': 'Numéro surtaxé',
  'VOIP': 'Numéro de VoIP',
  'PERSONAL_NUMBER': 'Numéro personnel',
  'PAGER': 'Numéro de pager',
  'UAN': 'Numéro universel',
  'UNKNOWN': 'Type inconnu',
  'FAX': 'Fax',
  'SHARED_COST': 'Numéro à coût partagé',
  'SATELLITE': 'Numéro satellite',
  'EMERGENCY': 'Numéro d\'urgence',
  'VOICEMAIL': 'Messagerie vocale',
  'SPARE': 'Numéro de rechange'
};


const getSelectedCountry = computed(() => {
  const country = countries.find((c: Country) => c.code === selectedCountry.value);
  return country ? country : { code: 'FR', name: 'France', dialCode: '33', flag: '🇫🇷' };
});

const placeholder = computed(() => {
  const example = getExampleNumber(selectedCountry.value, examples);
  return example ? example.formatNational() : '';
});

function formatPhoneNumber(): void {
  const formatter = new AsYouType(selectedCountry.value);
  phoneNumber.value = formatter.input(phoneNumber.value);
}

function selectCountry(country: Country): void {
  const dialCode = getCountryCallingCode(country.code);

  const updatedCountry = { ...country, dialCode };

  selectedCountry.value = updatedCountry.code;
  phoneNumber.value = '';
  errorMessage.value = '';
  isDropdownOpen.value = false;
  highlightedIndex.value = -1;

  dropdownButton.value?.focus();
}


function toggleDropdown(): void {
  isDropdownOpen.value = !isDropdownOpen.value;
  if (isDropdownOpen.value) {
    highlightedIndex.value = 0;
    nextTick(() => {
      countryOption.value[0]?.focus();
    });
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (isDropdownOpen.value) {
    event.preventDefault();
    event.stopPropagation();

    switch (event.key) {
      case 'ArrowDown':
        highlightedIndex.value = (highlightedIndex.value + 1) % countries.length;
        countryOption.value[highlightedIndex.value]?.focus();
        break;
      case 'ArrowUp':
        highlightedIndex.value = (highlightedIndex.value - 1 + countries.length) % countries.length;
        countryOption.value[highlightedIndex.value]?.focus();
        break;
      case 'Enter':
        if (highlightedIndex.value >= 0) {
          selectCountry(countries[highlightedIndex.value]);
        }
        break;
      case 'Escape':
        isDropdownOpen.value = false;
        dropdownButton.value?.focus();
        break;
      case 'Tab':
        isDropdownOpen.value = false
        break;
    }
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    toggleDropdown();
  }
}

function validatePhoneNumber(): boolean {
  if (!phoneNumber.value) {
    errorMessage.value = props.errorMessages.required;
    return false;
  }

  try {
    const parsedNumber: PhoneNumber = parsePhoneNumber(phoneNumber.value, selectedCountry.value);
    const isValid = parsedNumber.isValid();
    const numberType = parsedNumber.getType();
    const isCorrectType = numberType !== undefined && props.expectedTypes.includes(numberType);

    if (!isValid) {
      errorMessage.value = props.errorMessages.invalid;
      return false;
    } else if (!isCorrectType) {
      const expectedTypesLabels = props.expectedTypes
        .map((type) => numberTypeLabels[type] || type)
        .join(' ou ');
      errorMessage.value = props.errorMessages.incorrectType.replace('{types}', expectedTypesLabels);
      return false;
    } else {
      errorMessage.value = '';
      return true;
    }
  } catch (error) {
    errorMessage.value = props.errorMessages.unknown;
    return false;
  }
}

function getDefaultCountryFromTimezone(): CountryCode {
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const countryCode = timezoneToCountryTyped[userTimezone] || 'FR';
  return countryCode as CountryCode;
}


onMounted(() => {
  selectedCountry.value = getDefaultCountryFromTimezone();
});

defineExpose({
  validatePhoneNumber,
  phoneNumber,
  selectedCountry
});
</script>

<style scoped>
.selected {
  background-color: var(--background-open-blue-france);
}

.highlighted {
  background-color: var(--background-open-blue-france);
}

.fr-fieldset__element--tel {
  margin-bottom: .5rem;
}

.fr-fieldset__element--dialcode {
  padding-left: 0;
}
</style>
