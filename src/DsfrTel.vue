<template>
  <fieldset class="fr-fieldset" :class="{ 'fr-fieldset--error': errorMessage }">
    <legend class="fr-fieldset__legend">
      {{ fieldsetLegend }}
      <span class="fr-hint-text">{{ computedHint }}</span>
    </legend>
    <div class="fr-fieldset__element fr-fieldset__element--inline fr-fieldset--dialcode">
      <!-- Div recevant le focus et servant de combobox -->
      <div class="fr-select" ref="comboboxRef" role="combobox" tabindex="0" aria-haspopup="listbox"
        :aria-controls="'fr-country-listbox-' + uid" :aria-expanded="isDropdownOpen"
        :aria-activedescendant="activeDescendant" @click="toggleDropdown" @keydown="onComboboxKeydown"
        :title="dialcodeLabel"  :aria-label="dialcodeLabel" >
        <span aria-hidden="true" class="flag-indicatif">{{ getSelectedCountry.flag }}</span>
      </div>
    </div>
    <div class="fr-menu fr-menu--tel" v-if="isDropdownOpen">
      <ul :id="'fr-country-listbox-' + uid" role="listbox" tabindex="-1" @keydown="handleKeydown" ref="dropdownMenu"
        aria-label="Liste de sélection de l'indicatif" style="max-height:200px;overflow-y:auto;"
        class="fr-menu__list fr-menu__list--tel">
        <li v-for="(country, index) in countries" :key="country.code" role="option" @click="selectCountry(country)"
          :aria-selected="country.code === selectedCountry ? 'true' : 'false'" :class="{ 'fr-nav__link': true }"
          @mouseover="highlightedIndex = index" @mouseleave="highlightedIndex = -1" ref="countryOption"
          :id="'fr-country-option-' + uid + '-' + country.code" :tabindex="index === highlightedIndex ? 0 : -1">
          <span aria-hidden="true" class="flag-indicatif">{{ country.flag }}</span>
          {{ country.name }} (+{{ country.dialCode }})
        </li>
      </ul>
    </div>
    <div class="fr-fieldset__element fr-fieldset__element--inline fr-fieldset__element--tel">
      <input v-model="phoneNumber" @input="formatPhoneNumber" @paste="handlePaste" :placeholder="placeholder"
        class="fr-input" type="tel" aria-label="Numéro de téléphone" title="Votre numéro de téléphone" id="tel-input"
        aria-describedby="tel-input-message" ref="telInput" autocomplete="tel-national" />
    </div>
    <p v-if="errorMessage" class="fr-fieldset__element fr-message fr-message--error" id="tel-input-message">
      {{ errorMessage }}
    </p>
  </fieldset>
</template>

<script lang="ts" setup>
// Motif de conception ARIA suivi : https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/
import { ref, computed, onMounted, onBeforeUnmount, nextTick, PropType } from 'vue';
import { parsePhoneNumber, getExampleNumber, AsYouType, PhoneNumber, CountryCode, validatePhoneNumberLength } from 'libphonenumber-js/max';
import examples from 'libphonenumber-js/examples.mobile.json';
import countriesData from './countries.json';
import timezoneToCountry from './timezones.json';

const uid = Math.random().toString(36).substr(2, 9);

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
  parse: string;
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
  placeholder: {
    type: String,
    default: undefined
  },
  placeholderPrefix: {
    type: String,
    default: 'Ex. : '
  },
  useDynamicPlaceholder: {
    type: Boolean,
    default: false
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
  },
  hint: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  },
  autoDetectCountry: {
    type: Boolean,
    default: true
  }
});

const selectedCountry = ref<CountryCode>('FR');
const phoneNumber = ref<string>('');
const errorMessage = ref<string>('');
const isDropdownOpen = ref<boolean>(false);
const highlightedIndex = ref<number>(-1);

const dropdownMenu = ref<HTMLElement | null>(null);
const countryOption = ref<HTMLElement[]>([]);
const telInput = ref<HTMLInputElement | null>(null);
const comboboxRef = ref<HTMLElement | null>(null);

const searchQuery = ref('');
let typeAheadTimer: number | null = null;

const lastKeyPressedTime = ref(0);

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
  return countries.find(country => country.code === selectedCountry.value) || {
    code: 'FR',
    name: 'France',
    dialCode: '33',
    flag: '🇫🇷'
  };
});

const placeholder = computed(() => {
  if (props.placeholder !== undefined) {
    return props.placeholder;
  }
  if (props.useDynamicPlaceholder) {
    const example = getExampleNumber(selectedCountry.value, examples);
    return example ? `${props.placeholderPrefix}${example.formatNational()}` : undefined;
  }
  return undefined;
});

const computedHint = computed(() => {
  const example = getExampleNumber(selectedCountry.value, examples);
  const defaultHint = example ? `Au format national (ex : ${example.formatNational()})` : '';
  return props.hint || defaultHint;
});

const activeDescendant = computed(() => {
  if (isDropdownOpen.value && highlightedIndex.value >= 0 && countries[highlightedIndex.value]) {
    return `fr-country-option-${uid}-${countries[highlightedIndex.value].code}`;
  }
  return undefined;
});

const dialcodeLabel = computed(() => `Modifier l'indicatif sélectionné (${getSelectedCountry.value.name})`);

function formatPhoneNumber(): void {
  if (phoneNumber.value.startsWith('+')) {
    try {
      const parsedNum = parsePhoneNumber(phoneNumber.value);
      if (parsedNum && parsedNum.country) {
        selectedCountry.value = parsedNum.country;
        phoneNumber.value = parsedNum.formatNational();
        return;
      }
    } catch (error) {
      // En cas d'erreur, on continue le formatage habituel
    }
  }
  const formatter = new AsYouType(selectedCountry.value);
  phoneNumber.value = formatter.input(phoneNumber.value);
}

function handlePaste(event: ClipboardEvent): void {
  event.preventDefault();
  const pastedText = event.clipboardData?.getData('text/plain') || '';
  phoneNumber.value = pastedText;
  nextTick(() => formatPhoneNumber());
}

function selectCountry(country: Country): void {
  selectedCountry.value = country.code;
  const formatter = new AsYouType(selectedCountry.value);
  phoneNumber.value = formatter.input(phoneNumber.value);
  closeDropdown();
  comboboxRef.value?.focus();
  highlightedIndex.value = countries.findIndex(c => c.code === country.code);
}

function toggleDropdown(): void {
  isDropdownOpen.value = !isDropdownOpen.value;
  if (isDropdownOpen.value) {
    highlightedIndex.value = countries.findIndex(c => c.code === selectedCountry.value);
    nextTick(() => {
      if (countryOption.value[highlightedIndex.value]) {
        countryOption.value[highlightedIndex.value].focus();
      }
    });
  } else {
    closeDropdown();
    comboboxRef.value?.focus();
  }
}

function onComboboxKeydown(event: KeyboardEvent): void {
  // Gestion du type-ahead (recherche incrémentale)
  if (event.key.length === 1 && /^[a-z]$/.test(event.key)) {
    // Si la liste est fermée, on l'ouvre et initialise l'index => par exemple sur le pays sélectionné
    if (!isDropdownOpen.value) {
      isDropdownOpen.value = true;
      highlightedIndex.value = countries.findIndex(c => c.code === selectedCountry.value);
    }

    const key = event.key.toLowerCase();
    const now = Date.now();
    if (now - lastKeyPressedTime.value > 500) {
      searchQuery.value = "";
    }
    searchQuery.value += key;

    const idx = countries.findIndex(country =>
      country.name.toLowerCase().startsWith(searchQuery.value)
    );
    if (idx !== -1) {
      highlightedIndex.value = idx;
      nextTick(() => {
        if (countryOption.value[highlightedIndex.value]) {
          countryOption.value[highlightedIndex.value].focus();
        }
      });
    }
    lastKeyPressedTime.value = now;
    event.preventDefault();
    return;
  }

  // Gestion classique des touches
  switch (event.key) {
    case 'ArrowDown':
      if (!isDropdownOpen.value) {
        toggleDropdown();
        highlightedIndex.value = 0;
        nextTick(() => {
          countryOption.value[highlightedIndex.value]?.focus();
        });
      } else {
        highlightedIndex.value = (highlightedIndex.value + 1) % countries.length;
        nextTick(() => {
          countryOption.value[highlightedIndex.value]?.focus();
        });
      }
      event.preventDefault();
      break;
    case 'ArrowUp':
      if (!isDropdownOpen.value) {
        toggleDropdown();
        highlightedIndex.value = countries.length - 1;
        nextTick(() => {
          countryOption.value[highlightedIndex.value]?.focus();
        });
      } else {
        highlightedIndex.value = (highlightedIndex.value - 1 + countries.length) % countries.length;
        nextTick(() => {
          countryOption.value[highlightedIndex.value]?.focus();
        });
      }
      event.preventDefault();
      break;
    case 'Enter':
    case ' ':
      if (isDropdownOpen.value && highlightedIndex.value >= 0) {
        selectCountry(countries[highlightedIndex.value]);
      } else {
        toggleDropdown();
      }
      event.preventDefault();
      break;
    case 'Escape':
      if (isDropdownOpen.value) {
        closeDropdown();
        comboboxRef.value?.focus();
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

    // Gestion du type-ahead seulement quand la liste est affichée
    if (event.key.length === 1 && /^[a-z]$/i.test(event.key)) {
      const key = event.key.toLowerCase();

      // Annule le timer précédent s'il existe
      if (typeAheadTimer) {
        clearTimeout(typeAheadTimer);
      }

      // Accumule la lettre dans searchQuery
      searchQuery.value += key;

      // Planifie la réinitialisation de searchQuery après 1000ms
      typeAheadTimer = window.setTimeout(() => {
        searchQuery.value = "";
        typeAheadTimer = null;
      }, 1000);

      const idx = countries.findIndex(country =>
        country.name.toLowerCase().startsWith(searchQuery.value)
      );
      if (idx !== -1) {
        highlightedIndex.value = idx;
        nextTick(() => {
          if (countryOption.value[highlightedIndex.value]) {
            countryOption.value[highlightedIndex.value].focus();
          }
        });
      }
      return;
    }

    // Gestion classique des autres touches
    switch (event.key) {
      case 'ArrowDown':
        highlightedIndex.value = (highlightedIndex.value + 1) % countries.length;
        nextTick(() => {
          countryOption.value[highlightedIndex.value]?.focus();
        });
        break;
      case 'ArrowUp':
        highlightedIndex.value =
          (highlightedIndex.value - 1 + countries.length) % countries.length;
        nextTick(() => {
          countryOption.value[highlightedIndex.value]?.focus();
        });
        break;
      case 'Enter':
      case ' ':
        if (highlightedIndex.value >= 0) {
          selectCountry(countries[highlightedIndex.value]);
        }
        break;
      case 'Escape':
        closeDropdown();
        comboboxRef.value?.focus();
        break;
      case 'Tab':
        closeDropdown();
        telInput.value?.focus();
        break;
      default:
        break;
    }
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    toggleDropdown();
  }
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.fr-select')) {
    closeDropdown();
  }
};

function closeDropdown(): void {
  isDropdownOpen.value = false;
}

function checkPhoneNumberPresence(): boolean {
  if (props.required && !phoneNumber.value) {
    setErrorMessage(props.errorMessages.required);
    return false;
  }
  return true;
}

function validatePhoneNumberFormat(): boolean {
  if (!phoneNumber.value) {
    return true;
  }
  const isLengthValid = validatePhoneNumberLength(phoneNumber.value, selectedCountry.value);
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
      .map(type => numberTypeLabels[type] || type)
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
  if (!phoneNumber.value) return null;
  try {
    return parsePhoneNumber(phoneNumber.value, selectedCountry.value);
  } catch (error) {
    setErrorMessage(props.errorMessages.unknown);
    return null;
  }
}

function validatePhoneNumber(): boolean {
  if (!phoneNumber.value && !props.required) {
    errorMessage.value = '';
    return true;
  }
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
      return parsedNumber.format("RFC3966");
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
  if (props.autoDetectCountry) {
    selectedCountry.value = getDefaultCountryFromTimezone();
  }
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});

defineExpose({
  validatePhoneNumber,
  phoneNumber,
  selectedCountry,
  getPhoneNumberFormatted,
});
</script>

<style scoped>
.fr-select {
  cursor: pointer;
}

li[aria-selected="true"],
.fr-menu__list--tel li:hover {
  background-color: var(--background-open-blue-france);
}

.fr-fieldset__element--tel {
  margin-bottom: .5rem;
  flex: 0 0 13rem;
  padding-left: 0;
}

.fr-menu--tel {
  filter: drop-shadow(var(--overlap-shadow));
  position: absolute;
  top: 3rem;
  z-index: 500;
}

.fr-menu--tel .fr-nav__link {
  box-shadow: 0 calc(-1rem - 1px) 0 -1rem var(--border-default-grey);
}

.fr-menu__list--tel {
  background-color: var(--background-overlap-grey);
  box-shadow: 0 0 0 1px rgba(0, 0, 18, .16);
  scrollbar-width: thin;
}
</style>
