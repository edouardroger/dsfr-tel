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
        :title="dialcodeLabel" :aria-label="dialcodeLabel">
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
        class="fr-input" type="text" inputmode="tel" aria-label="Numéro de téléphone" title="Numéro de téléphone"
        id="tel-input" :aria-describedby="errorMessage ? 'tel-input-message' : undefined" ref="telInput"
        autocomplete="tel-national" :aria-invalid="errorMessage ? 'true' : undefined" />
    </div>
    <p v-if="errorMessage" class="fr-fieldset__element fr-message fr-message--error" id="tel-input-message">
      {{ errorMessage }}
    </p>
  </fieldset>
</template>

<script lang="ts" setup>
// Motif de conception ARIA suivi : https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/
import { ref, computed, onMounted, onBeforeUnmount, nextTick, PropType } from 'vue';
import { parsePhoneNumber, parsePhoneNumberFromString, getExampleNumber, AsYouType, PhoneNumber, CountryCode, validatePhoneNumberLength } from 'libphonenumber-js/max';
import examples from 'libphonenumber-js/examples.mobile.json';
import timezoneToCountry from './timezones.json';
import metadata from 'libphonenumber-js/metadata.min.json' with { type: 'json' };
import countriesJson from './countries.json' with { type: 'json' };

const uid = Math.random().toString(36).substr(2, 9);

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
      TOO_LONG: "Le numéro de téléphone saisi est trop long.",
      INVALID_COUNTRY: "Le code du pays est invalide.",
      INVALID_LENGTH: "La longueur du numéro de téléphone saisi n'est pas valide.",
      NOT_A_NUMBER: "La valeur saisie n'est pas un numéro de téléphone."
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

// Fonction utilitaire pour obtenir l'emoji du drapeau à partir du code ISO
function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

const countryMapping: Record<string, { name: string }> =
  (countriesJson as Array<{ code: string; name: string }>).reduce((acc, curr) => {
    acc[curr.code] = { name: curr.name };
    return acc;
  }, {} as Record<string, { name: string }>);

function buildCountries(): Country[] {
  // Extraction des codes reconnus par E.164
  const recognizedCountryCodes = new Set(Object.keys(metadata.countries));

  // Liste d'exclusions manuelle (par exemple, "EH") et identification automatique des codes non reconnus dans countryMapping
  const manualExclusion = new Set(["EH"]);
  const nonRecognizedCodes = new Set(
    Object.keys(countryMapping).filter(code => !recognizedCountryCodes.has(code))
  );
  const exclusionList = new Set([...manualExclusion, ...nonRecognizedCodes]);

  // Construction et filtrage du tableau des pays
  return Object.keys(metadata.countries)
    .map((code) => {
      let dialCode = '';
      // Recherche de l'indicatif dans metadata.country_calling_codes
      for (const [key, countryCodes] of Object.entries(metadata.country_calling_codes)) {
        if ((countryCodes as string[]).includes(code)) {
          dialCode = key;
          break;
        }
      }
      if (!dialCode) return null;
      const countryData = countryMapping[code];
      return {
        code: code as CountryCode,
        name: countryData ? countryData.name : code,
        dialCode: dialCode,
        flag: getFlagEmoji(code)
      };
    })
    .filter((country): country is Country =>
      country !== null &&
      recognizedCountryCodes.has(country.code) &&
      !exclusionList.has(country.code)
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

const countries = buildCountries();

const getSelectedCountry = computed(() => {
  return countries.find(country => country.code === selectedCountry.value) || {
    code: 'FR',
    name: 'France métropolitaine',
    dialCode: '33',
    flag: getFlagEmoji('FR')
  };
});

const phoneExample = computed(() => {
  return getExampleNumber(selectedCountry.value, examples);
});

const placeholder = computed(() => {
  if (props.placeholder !== undefined) {
    return props.placeholder;
  }
  if (props.useDynamicPlaceholder && phoneExample.value) {
    return `${props.placeholderPrefix}${phoneExample.value.formatNational()}`;
  }
  return undefined;
});

const computedHint = computed(() => {
  const defaultHint = phoneExample.value
    ? `Au format national (ex : ${phoneExample.value.formatNational()})`
    : '';
  return props.hint || defaultHint;
});

const activeDescendant = computed(() => {
  const currentCountry = isDropdownOpen.value &&
    highlightedIndex.value >= 0 &&
    countries[highlightedIndex.value];

  return currentCountry
    ? `fr-country-option-${uid}-${currentCountry.code}`
    : undefined;
});

const dialcodeLabel = computed(() => `Modifier l'indicatif sélectionné (${getSelectedCountry.value.name})`);

function handleInternationalNumber(input: string): boolean {
  if (input.startsWith('+')) {
    try {
      const parsedNum = parsePhoneNumber(input);
      if (parsedNum && parsedNum.country) {
        if (parsedNum.country !== selectedCountry.value) {
          selectedCountry.value = parsedNum.country;
          highlightedIndex.value = countries.findIndex(c => c.code === selectedCountry.value);
        }
        phoneNumber.value = parsedNum.formatNational();
        return true;
      }
    } catch (error) {
      // En cas d'erreur, revenir au formatage local
    }
  }
  return false;
}

function handleLocalNumber(input: string): boolean {
  const parsedLocal = parsePhoneNumberFromString(input, selectedCountry.value);
  if (parsedLocal) {
    phoneNumber.value = parsedLocal.formatNational();
    return true;
  }
  return false;
}

function handleGenericNumber(input: string): void {
  const formatter = new AsYouType(selectedCountry.value);
  phoneNumber.value = formatter.input(input);
}

function formatPhoneNumber(): void {
  const input = phoneNumber.value;
  if (handleInternationalNumber(input)) return;
  if (handleLocalNumber(input)) return;
  handleGenericNumber(input);
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

/**
 * Gestion de la recherche incrémentale (type-ahead).
 */
function handleTypeAhead(key: string, delay: number = 1000): void {
  const lowerKey = key.toLowerCase();
  if (typeAheadTimer) clearTimeout(typeAheadTimer);
  searchQuery.value += lowerKey;
  typeAheadTimer = window.setTimeout(() => {
    searchQuery.value = "";
    typeAheadTimer = null;
  }, delay);
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
}

function onComboboxKeydown(event: KeyboardEvent): void {
  if (event.key.length === 1 && /^[a-z]$/.test(event.key)) {
    if (!isDropdownOpen.value) {
      isDropdownOpen.value = true;
      highlightedIndex.value = countries.findIndex(c => c.code === selectedCountry.value);
    }
    const now = Date.now();
    if (now - lastKeyPressedTime.value > 500) {
      searchQuery.value = "";
    }
    // Utilise un délai réduit (500 ms) dans ce contexte
    handleTypeAhead(event.key, 500);
    lastKeyPressedTime.value = now;
    event.preventDefault();
    return;
  }
  switch (event.key) {
    case 'ArrowDown':
      if (!isDropdownOpen.value) {
        toggleDropdown();
        highlightedIndex.value = 0;
        nextTick(() => countryOption.value[highlightedIndex.value]?.focus());
      } else {
        highlightedIndex.value = (highlightedIndex.value + 1) % countries.length;
        nextTick(() => countryOption.value[highlightedIndex.value]?.focus());
      }
      event.preventDefault();
      break;
    case 'ArrowUp':
      if (!isDropdownOpen.value) {
        toggleDropdown();
        highlightedIndex.value = countries.length - 1;
        nextTick(() => countryOption.value[highlightedIndex.value]?.focus());
      } else {
        highlightedIndex.value = (highlightedIndex.value - 1 + countries.length) % countries.length;
        nextTick(() => countryOption.value[highlightedIndex.value]?.focus());
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
    if (event.key.length === 1 && /^[a-z]$/i.test(event.key)) {
      handleTypeAhead(event.key);
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        highlightedIndex.value = (highlightedIndex.value + 1) % countries.length;
        nextTick(() => countryOption.value[highlightedIndex.value]?.focus());
        break;
      case 'ArrowUp':
        highlightedIndex.value = (highlightedIndex.value - 1 + countries.length) % countries.length;
        nextTick(() => countryOption.value[highlightedIndex.value]?.focus());
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

function getParsedPhoneNumberFromString(): PhoneNumber | null {
  if (!phoneNumber.value) return null;
  const parsed = parsePhoneNumberFromString(phoneNumber.value, selectedCountry.value);
  return parsed || null;
}

function getPhoneNumberType(): string {
  const parsed = getParsedPhoneNumberFromString();
  if (!parsed) return '';
  return parsed.getType() || '';
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
  getPhoneNumberType,
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

.fr-menu__list--tel li {
  display: block;
}
</style>
