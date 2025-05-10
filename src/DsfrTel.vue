<template>
  <fieldset class="fr-fieldset" :class="{ 'fr-fieldset--success': !errorMessage, 'fr-fieldset--error': errorMessage }">
    <legend class="fr-fieldset__legend">{{ fieldsetLegend }}</legend>
    <div class="fr-fieldset__element fr-fieldset__element--inline fr-fieldset__element--tel">
      <button type="button" class="fr-select" aria-haspopup="listbox" :aria-expanded="isDropdownOpen"
        @click="toggleDropdown" @keydown="onButtonKeydown" ref="dropdownButton"
        :title="'Modifier le pays sélectionné : ' + getSelectedCountry.name">
        <span aria-hidden="true" class="flag-indicatif">{{ getSelectedCountry.flag }}</span>
        <span class="fr-sr-only">Modifier le pays sélectionné {{ getSelectedCountry.name }}</span>
      </button>
    </div>
    <div class="fr-menu" v-if="isDropdownOpen">
      <ul role="listbox" tabindex="-1" @keydown="handleKeydown" ref="dropdownMenu"
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
      <input v-model="phoneNumber" @input="formatPhoneNumber" @paste="handlePaste" :placeholder="placeholder"
        class="fr-input" type="tel" aria-label="Votre numéro de téléphone" id="tel-input"
        aria-describedby="tel-input-message" ref="telInput" autocomplete="tel-national" />
    </div>

    <p v-if="errorMessage" class="fr-fieldset__element fr-message fr-message--error" id="tel-input-message">{{
      errorMessage }}
    </p>
  </fieldset>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, PropType } from 'vue';
import { parsePhoneNumber, getExampleNumber, AsYouType, PhoneNumber, CountryCode, validatePhoneNumberLength } from 'libphonenumber-js/max';
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
  parse: string
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
      unknown: "Erreur lors de la validation du numéro.",
      parse: "Erreur lors de l'analyse du numéro."
    })
  },
  placeholderPrefix: {
    type: String,
    default: 'Exemple : '
  },
  reasonMessages: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({
      TOO_SHORT: "Le numéro de téléphone saisi est trop court.",
      TOO_LONG: "Le numéro est trop long.",
      INVALID_COUNTRY: "Le code du pays est invalide.",
      INVALID_LENGTH: "Longueur non valide.",
      NOT_A_NUMBER: "La valeur saisie n'est pas un numéro."
    })
  }
});

const selectedCountry = ref<CountryCode>('FR');
const phoneNumber = ref<string>('');
const errorMessage = ref<string>('');
const isDropdownOpen = ref<boolean>(false);
const highlightedIndex = ref<number>(-1);
const searchQuery = ref<string>('');
const lastKeyPressedTime = ref<number>(0);

const dropdownButton = ref<HTMLButtonElement | null>(null);
const dropdownMenu = ref<HTMLElement | null>(null);
const countryOption = ref<HTMLElement[]>([]);
const telInput = ref<HTMLInputElement | null>(null);

const numberTypeLabels: Record<string, string> = {
  'MOBILE': 'Portable',
  'FIXED_LINE': 'Fixe',
  'FIXED_LINE_OR_MOBILE': 'Fixe ou portable',
  'TOLL_FREE': 'Numéro gratuit',
  'PREMIUM_RATE': 'Numéro surtaxé',
  'VOIP': 'Numéro de VoIP',
  'PERSONAL_NUMBER': 'Numéro personnel',
  'PAGER': 'Numéro de bipeur',
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
  return countries.find((country) => country.code === selectedCountry.value) || {
    code: 'FR',
    name: 'France',
    dialCode: '33',
    flag: '🇫🇷',
  };
});

const placeholder = computed(() => {
  const example = getExampleNumber(selectedCountry.value, examples);
  return example ? `${props.placeholderPrefix}${example.formatNational()}` : '';
});

function formatPhoneNumber(): void {
  if (phoneNumber.value.startsWith('+')) {
    try {
      // On essaie de parser le numéro en international
      const parsedNum = parsePhoneNumber(phoneNumber.value);
      if (parsedNum && parsedNum.country) {
        // Met à jour le pays sélectionné
        selectedCountry.value = parsedNum.country;
        // Reformate en format national
        phoneNumber.value = parsedNum.formatNational();
        return;
      }
    } catch (error) {
      // En cas d'erreur, on passe au formatage habituel
    }
  }
  // Formatage en fonction du pays sélectionné
  const formatter = new AsYouType(selectedCountry.value);
  phoneNumber.value = formatter.input(phoneNumber.value);
}

function handlePaste(event: ClipboardEvent): void {
  event.preventDefault();
  const pastedText = event.clipboardData?.getData('text/plain') || '';
  phoneNumber.value = pastedText;
  nextTick(() => {
    formatPhoneNumber();
  });
}

function selectCountry(country: Country): void {
  selectedCountry.value = country.code;

  // Reformater le numéro avec le nouveau code pays
  const formatter = new AsYouType(selectedCountry.value);
  phoneNumber.value = formatter.input(phoneNumber.value);

  closeDropdown();
  highlightedIndex.value = countries.findIndex(c => c.code === country.code);
  dropdownButton.value?.focus();
}

function toggleDropdown(): void {
  isDropdownOpen.value = !isDropdownOpen.value;
  if (isDropdownOpen.value) {
    highlightedIndex.value = countries.findIndex(c => c.code === selectedCountry.value);
    nextTick(() => {
      countryOption.value[highlightedIndex.value]?.focus();
    });
  } else {
    closeDropdown();
  }
}

function onButtonKeydown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowUp':
    case ' ':
      if (!isDropdownOpen.value) {
        toggleDropdown();
        highlightedIndex.value = countries.findIndex(c => c.code === selectedCountry.value);
        nextTick(() => {
          countryOption.value[highlightedIndex.value]?.focus();
        });
      }
      event.preventDefault();
      break;
    case 'Enter':
      if (!isDropdownOpen.value) {
        toggleDropdown();
        highlightedIndex.value = countries.findIndex(c => c.code === selectedCountry.value);
        nextTick(() => {
          countryOption.value[highlightedIndex.value]?.focus();
        });
      }
      event.preventDefault();
      break;
    case 'Escape':
      if (isDropdownOpen.value) {
        closeDropdown();
        dropdownButton.value?.focus();
      }
      event.preventDefault();
      break;
    default:
      break;
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (isDropdownOpen.value) {
    event.preventDefault();
    event.stopPropagation();

    const keyPressed = event.key.toLowerCase();

    if (keyPressed.length === 1 && /[a-z]/i.test(keyPressed)) {
      const currentTime = Date.now();
      if (currentTime - lastKeyPressedTime.value > 500) {
        searchQuery.value = '';
      }

      searchQuery.value += keyPressed;

      const matchingCountries = countries.filter(country =>
        country.name.toLowerCase().startsWith(searchQuery.value)
      );

      if (matchingCountries.length > 0) {
        highlightedIndex.value = countries.findIndex(c => c.code === matchingCountries[0].code);
        countryOption.value[highlightedIndex.value]?.focus();
      }

      lastKeyPressedTime.value = currentTime;
    }

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
      case ' ':
        if (highlightedIndex.value >= 0) {
          selectCountry(countries[highlightedIndex.value]);
        }
        break;
      case 'Escape':
        closeDropdown();
        dropdownButton.value?.focus();
        break;
      case 'Tab':
        closeDropdown();
        telInput.value?.focus();
        break;
    }
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    toggleDropdown();
  }
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (dropdownButton.value && !dropdownButton.value.contains(target)) {
    closeDropdown();
  }
};

function closeDropdown(): void {
  isDropdownOpen.value = false;
}

function checkPhoneNumberPresence(): boolean {
  if (!phoneNumber.value) {
    setErrorMessage(props.errorMessages.required);
    return false;
  }
  return true;
}

function validatePhoneNumberFormat(): boolean {
  const isLengthValid = validatePhoneNumberLength(phoneNumber.value, selectedCountry.value)
  if (isLengthValid !== undefined) {
    setErrorMessage(props.reasonMessages[isLengthValid]);
    return false;
  }
  const parsedNumber = getParsedPhoneNumber();
  if (!parsedNumber) return false;
  if (!parsedNumber.isValid()) {
    setErrorMessage(props.errorMessages.invalid);
    return false;
  }
  return true;
}

function checkPhoneNumberType(): boolean {
  const parsedNumber = getParsedPhoneNumber();
  if (!parsedNumber) return false;

  const numberType = parsedNumber.getType();
  const isCorrectType = numberType !== undefined && props.expectedTypes.includes(numberType);
  if (!isCorrectType) {
    const expectedTypesLabels = props.expectedTypes
      .map((type) => numberTypeLabels[type] || type)
      .join(' ou ')
      .toLowerCase();
    setErrorMessage(props.errorMessages.incorrectType.replace('{types}', expectedTypesLabels));
    return false;
  }
  return true;
}

function setErrorMessage(message: string): void {
  errorMessage.value = message;
}

function getParsedPhoneNumber(): PhoneNumber | null {
  try {
    return parsePhoneNumber(phoneNumber.value, selectedCountry.value);
  } catch (error) {
    setErrorMessage(props.errorMessages.unknown);
    return null;
  }
}

function validatePhoneNumber(): boolean {
  if (!checkPhoneNumberPresence() || !validatePhoneNumberFormat() || !checkPhoneNumberType()) return false;
  errorMessage.value = '';
  return true;
}

function getPhoneNumberFormatted(format: 'E164' | 'NATIONAL' | 'INTERNATIONAL' | 'RFC3966'): string {
  const parsedNumber = getParsedPhoneNumber();
  if (!parsedNumber) return '';

  switch (format) {
    case 'E164':
      return parsedNumber.format('E.164');
    case 'NATIONAL':
      return parsedNumber.formatNational();
    case 'INTERNATIONAL':
      return parsedNumber.formatInternational();
    case 'RFC3966':
      return parsedNumber.format("RFC3966")
    default:
      return parsedNumber.number;
  }
}

function getDefaultCountryFromTimezone(): CountryCode {
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const countryCode = timezoneToCountryTyped[userTimezone] || 'FR';
  return countryCode as CountryCode;
}

onMounted(() => {
  selectedCountry.value = getDefaultCountryFromTimezone();
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});

defineExpose({
  validatePhoneNumber,
  phoneNumber,
  selectedCountry,
  getPhoneNumberFormatted
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
