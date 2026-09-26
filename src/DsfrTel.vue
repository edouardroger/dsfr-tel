<template>
  <fieldset class="fr-fieldset fr-fieldset--phone" :class="{ 'fr-fieldset--error': errorMessage }">
    <legend class="fr-fieldset__legend">
      {{ fieldsetLegend
      }}<span
        v-if="required && requiredMarker"
        class="fr-tel__required"
        :aria-hidden="isSymbolicMarker ? 'true' : undefined"
        >&nbsp;{{ requiredMarker }}</span
      > <span v-if="computedHint" class="fr-hint-text">{{ computedHint }}</span>
    </legend>

    <div class="fr-fieldset__element fr-fieldset__element--inline">
      <span :id="countryLabelId" class="fr-sr-only">{{ text.country }}</span>
      <div
        ref="comboboxRef"
        class="fr-select"
        role="combobox"
        tabindex="0"
        :aria-labelledby="countryLabelId"
        :aria-controls="listboxId"
        :aria-expanded="isDropdownOpen ? 'true' : 'false'"
        :aria-activedescendant="activeDescendant"
        :title="dialcodeLabel"
        @click="toggleDropdown"
        @keydown="onKeydown"
        @blur="onComboboxBlur"
      >
        <span aria-hidden="true" class="flag-indicatif">{{ selectedCountryData.flag }}</span>
        <span class="fr-sr-only">{{ selectedCountryData.label }}</span>
      </div>

      <div v-if="isDropdownOpen" class="fr-menu fr-menu--tel">
        <ul
          :id="listboxId"
          class="fr-menu__list fr-menu__list--tel"
          role="listbox"
          tabindex="-1"
          :aria-label="text.countryList"
          @mousedown.prevent
        >
          <li
            v-for="(country, index) in countries"
            :id="optionId(country.code)"
            :key="country.code"
            ref="countryOptions"
            class="fr-nav__link"
            role="option"
            :aria-selected="index === highlightedIndex ? 'true' : undefined"
            @click="selectCountry(country)"
          >
            <span aria-hidden="true" class="flag-indicatif">{{ country.flag }}</span>
            {{ country.label }}
          </li>
        </ul>
      </div>
    </div>

    <div class="fr-fieldset__element fr-fieldset__element--inline">
      <label class="fr-label fr-sr-only" :for="inputId">{{ inputLabel }}</label>
      <input
        :id="inputId"
        ref="telInput"
        class="fr-input"
        type="text"
        inputmode="tel"
        autocomplete="tel-national"
        :value="phoneNumber"
        :placeholder="placeholder"
        :maxlength="MAX_INPUT_LENGTH"
        :aria-required="required ? 'true' : undefined"
        :aria-describedby="errorMessage ? messagesId : undefined"
        :aria-invalid="errorMessage ? 'true' : undefined"
        @input="onPhoneInput"
        @paste="handlePaste"
        @blur="onBlur"
      />
    </div>

    <div
      :id="messagesId"
      class="fr-fieldset__element fr-messages-group"
      :class="{ 'fr-messages-group--empty': !errorMessage }"
      role="alert"
    >
      <p v-if="errorMessage" class="fr-message fr-message--error">{{ errorMessage }}</p>
    </div>
  </fieldset>
</template>

<script lang="ts" setup>
// Motif de conception ARIA suivi : https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/
import { ref, computed, onMounted, onBeforeUnmount, nextTick, useId, watch, type PropType } from 'vue';
import {
  parsePhoneNumberFromString,
  getExampleNumber,
  AsYouType,
  validatePhoneNumberLength,
  type PhoneNumber,
  type CountryCode
} from 'libphonenumber-js/max';
import examples from 'libphonenumber-js/examples.mobile.json';
import {
  getCountryData,
  getDefaultCountryFromTimezone,
  normalize,
  defaultLabels,
  type Labels,
  DEFAULT_COUNTRY,
  DEFAULT_LOCALE,
  type Country
} from './data';

type ErrorMessages = {
  required: string;
  invalid: string;
  incorrectType: string;
  unknown: string;
  parse: string;
};

type PhoneFormat = 'E164' | 'NATIONAL' | 'INTERNATIONAL' | 'RFC3966';

const MAX_INPUT_LENGTH = 30;
const TYPE_AHEAD_DELAY = 500;
const PAGE_SIZE = 10;

const props = defineProps({
  modelValue: { type: String, default: undefined },
  modelFormat: { type: String as PropType<PhoneFormat>, default: 'E164' },
  country: { type: String as PropType<CountryCode>, default: undefined },
  expectedTypes: {
    type: Array as PropType<string[]>,
    default: () => ['MOBILE', 'FIXED_LINE_OR_MOBILE']
  },
  fieldsetLegend: { type: String, default: 'Votre numéro de téléphone portable' },
  locale: { type: String, default: undefined },
  inputLabel: { type: String, default: 'Numéro de téléphone' },
  labels: { type: Object as PropType<Partial<Labels>>, default: () => ({}) },
  errorMessages: {
    type: Object as PropType<ErrorMessages>,
    default: () => ({
      required: 'La saisie du numéro de téléphone est requise.',
      invalid: 'Le numéro renseigné est incorrect. Veuillez le vérifier.',
      incorrectType: 'Le numéro doit être de type {types}.',
      unknown: 'Erreur lors de la validation du numéro.',
      parse: "Erreur lors de l'analyse du numéro."
    })
  },
  placeholder: { type: String, default: undefined },
  placeholderPrefix: { type: String, default: 'Ex. : ' },
  useDynamicPlaceholder: { type: Boolean, default: false },
  reasonMessages: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({
      TOO_SHORT: 'Le numéro de téléphone saisi est trop court.',
      TOO_LONG: 'Le numéro de téléphone saisi est trop long.',
      INVALID_COUNTRY: 'Le code du pays est invalide.',
      INVALID_LENGTH: "La longueur du numéro de téléphone saisi n'est pas valide.",
      NOT_A_NUMBER: "La valeur saisie n'est pas un numéro de téléphone."
    })
  },
  hint: { type: String, default: '' },
  required: { type: Boolean, default: false },
  requiredMarker: { type: String, default: '*' },
  autoDetectCountry: { type: Boolean, default: true },
  validateOnBlur: { type: Boolean, default: false }
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:country': [country: CountryCode];
  validation: [isValid: boolean];
}>();

const uid = useId();
const listboxId = `fr-country-listbox-${uid}`;
const countryLabelId = `fr-country-label-${uid}`;
const inputId = `fr-tel-input-${uid}`;
const messagesId = `fr-tel-messages-${uid}`;
const optionId = (code: string) => `fr-country-option-${uid}-${code}`;

const selectedCountry = ref<CountryCode>(props.country ?? DEFAULT_COUNTRY);
const phoneNumber = ref<string>(props.modelValue ?? '');
const errorMessage = ref<string>('');
const isDropdownOpen = ref<boolean>(false);
const highlightedIndex = ref<number>(-1);

const countryOptions = ref<HTMLElement[]>([]);
const telInput = ref<HTMLInputElement | null>(null);
const comboboxRef = ref<HTMLElement | null>(null);

let searchString = '';
let typeAheadTimer: ReturnType<typeof setTimeout> | undefined;

const text = computed<Labels>(() => ({
  ...defaultLabels,
  ...props.labels,
  types: { ...defaultLabels.types, ...props.labels.types }
}));

const locale = computed(
  () =>
    props.locale ||
    (typeof document !== 'undefined' ? document.documentElement.lang : '') ||
    DEFAULT_LOCALE
);

const countryData = computed(() => getCountryData(locale.value));

// FIXED_LINE_OR_MOBILE : numéros indistincts (États-Unis, Canada…), non présentés comme un choix.
const expectedTypesText = computed(() => {
  const types = props.expectedTypes.some((type) => type !== 'FIXED_LINE_OR_MOBILE')
    ? props.expectedTypes.filter((type) => type !== 'FIXED_LINE_OR_MOBILE')
    : props.expectedTypes;
  const labels = [...new Set(types.map((type) => (text.value.types[type] ?? type).toLowerCase()))];
  return new Intl.ListFormat(locale.value, { type: 'disjunction' }).format(labels);
});

const isSymbolicMarker = computed(() => !/[\p{L}\p{N}]/u.test(props.requiredMarker));
const countries = computed(() => countryData.value.list);

function indexOfCountry(code: CountryCode): number {
  return countryData.value.indexByCode.get(code) ?? -1;
}

const selectedCountryData = computed<Country>(
  () =>
    countries.value[indexOfCountry(selectedCountry.value)] ??
    countries.value[indexOfCountry(DEFAULT_COUNTRY)]
);

const phoneExample = computed(() => getExampleNumber(selectedCountry.value, examples));

const placeholder = computed(() => {
  if (props.placeholder !== undefined) return props.placeholder;
  if (props.useDynamicPlaceholder && phoneExample.value) {
    return `${props.placeholderPrefix}${phoneExample.value.formatNational()}`;
  }
  return undefined;
});

const computedHint = computed(() => {
  if (props.hint) return props.hint;
  return phoneExample.value
    ? text.value.hint.replace('{example}', phoneExample.value.formatNational())
    : '';
});

const activeDescendant = computed(() => {
  const option = isDropdownOpen.value ? countries.value[highlightedIndex.value] : undefined;
  return option ? optionId(option.code) : undefined;
});

const dialcodeLabel = computed(
  () => text.value.changeCountry.replace('{country}', selectedCountryData.value.name)
);

function parse(value: string = phoneNumber.value): PhoneNumber | null {
  if (!value) return null;
  return parsePhoneNumberFromString(value, selectedCountry.value) ?? null;
}

function sanitizePhoneInput(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/[\u202A-\u202E]/g, '')
    .replace(/[^\d+()\-\s.]/g, '')
    .replace(/(?!^)\+/g, '')
    .slice(0, MAX_INPUT_LENGTH);
}

function countDigits(value: string): number {
  return value.replace(/\D/g, '').length;
}

function findPositionAfterDigits(formatted: string, digitsCount: number): number {
  let count = 0;
  for (let i = 0; i < formatted.length; i++) {
    const code = formatted.charCodeAt(i);
    if (code >= 48 && code <= 57 && ++count > digitsCount) return i;
  }
  return formatted.length;
}

function setCountry(code: CountryCode): void {
  if (code === selectedCountry.value) return;
  selectedCountry.value = code;
  emit('update:country', code);
}

function formatPhoneNumber(): void {
  const input = phoneNumber.value;
  if (!input || input.length > MAX_INPUT_LENGTH) return;

  if (input.startsWith('+')) {
    const parsed = parsePhoneNumberFromString(input);
    if (parsed?.country) {
      setCountry(parsed.country);
      phoneNumber.value = parsed.formatNational();
      return;
    }
  }

  const parsedLocal = parse(input);
  phoneNumber.value = parsedLocal
    ? parsedLocal.formatNational()
    : new AsYouType(selectedCountry.value).input(input);
}

function onPhoneInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  const inputValue = sanitizePhoneInput(target.value);
  if (inputValue.length > MAX_INPUT_LENGTH) return;

  const cursorPos = target.selectionStart ?? inputValue.length;
  const digitsBefore = countDigits(inputValue.slice(0, cursorPos));
  const isInsertion = inputValue.length >= phoneNumber.value.length;

  phoneNumber.value = inputValue;
  if (isInsertion) formatPhoneNumber();
  if (errorMessage.value) errorMessage.value = '';
  emitModel();

  if (!isInsertion) return;
  nextTick(() => {
    const el = telInput.value;
    if (!el || document.activeElement !== el) return;
    const newPos = findPositionAfterDigits(phoneNumber.value, digitsBefore);
    el.setSelectionRange(newPos, newPos);
  });
}

function handlePaste(event: ClipboardEvent): void {
  event.preventDefault();
  phoneNumber.value = sanitizePhoneInput(event.clipboardData?.getData('text/plain') ?? '');
  formatPhoneNumber();
  emitModel();
}

function onBlur(): void {
  if (props.validateOnBlur) validatePhoneNumber();
}

let lastModelValue: string = props.modelValue ?? '';

function emitModel(): void {
  const parsed = parse();
  const value = parsed ? formatAs(parsed, props.modelFormat) : '';
  if (value === lastModelValue) return;
  lastModelValue = value;
  emit('update:modelValue', value);
}

watch(
  () => props.modelValue,
  (value) => {
    if (value === undefined || value === lastModelValue) return;
    lastModelValue = value;
    phoneNumber.value = sanitizePhoneInput(value);
    formatPhoneNumber();
  }
);

watch(
  () => props.country,
  (value) => {
    if (value) setCountry(value);
  }
);

function setHighlight(index: number): void {
  const last = countries.value.length - 1;
  highlightedIndex.value = Math.min(Math.max(index, 0), last);
  const target = highlightedIndex.value;
  nextTick(() => {
    countryOptions.value[target]?.scrollIntoView?.({ block: 'nearest' });
  });
}

function openDropdown(highlight?: number): void {
  if (!isDropdownOpen.value) {
    isDropdownOpen.value = true;
    highlightedIndex.value = Math.max(indexOfCountry(selectedCountry.value), 0);
  }
  setHighlight(highlight ?? highlightedIndex.value);
}

function closeDropdown(): void {
  isDropdownOpen.value = false;
}

function toggleDropdown(): void {
  if (isDropdownOpen.value) closeDropdown();
  else openDropdown();
}

function applyCountry(country: Country): void {
  if (country.code === selectedCountry.value) return;
  setCountry(country.code);
  if (phoneNumber.value) {
    phoneNumber.value = new AsYouType(selectedCountry.value).input(phoneNumber.value);
    emitModel();
  }
}

function selectCountry(country: Country): void {
  applyCountry(country);
  closeDropdown();
  comboboxRef.value?.focus();
}

function selectHighlighted(): void {
  const country = countries.value[highlightedIndex.value];
  if (country) selectCountry(country);
  else closeDropdown();
}

function onComboboxBlur(): void {
  if (!isDropdownOpen.value) return;
  const country = countries.value[highlightedIndex.value];
  if (country) applyCountry(country);
  closeDropdown();
}

/** Recherche incrémentale (type-ahead). */
function findByTypeAhead(query: string, start: number): number {
  const list = countries.value;
  const total = list.length;
  const find = (prefix: string) => {
    for (let offset = 0; offset < total; offset++) {
      const index = (start + offset) % total;
      if (list[index].searchName.startsWith(prefix)) return index;
    }
    return -1;
  };
  const index = find(query);
  if (index >= 0) return index;
  return [...query].every((char) => char === query[0]) ? find(query[0]) : -1;
}

function onTypeAhead(key: string): void {
  clearTimeout(typeAheadTimer);
  typeAheadTimer = setTimeout(() => {
    searchString = '';
  }, TYPE_AHEAD_DELAY);
  searchString += normalize(key);

  openDropdown();
  const isRepeat = [...searchString].every((char) => char === searchString[0]);
  const start = isRepeat ? highlightedIndex.value + 1 : highlightedIndex.value;
  const index = findByTypeAhead(searchString, start);
  if (index >= 0) setHighlight(index);
  else searchString = '';
}

function onKeydown(event: KeyboardEvent): void {
  const { key, altKey } = event;
  const open = isDropdownOpen.value;
  const last = countries.value.length - 1;

  if (key.length === 1 && key !== ' ' && !event.ctrlKey && !event.metaKey && !altKey) {
    onTypeAhead(key);
    event.preventDefault();
    return;
  }

  if (!open) {
    switch (key) {
      case 'ArrowDown':
      case 'Enter':
      case ' ':
        openDropdown();
        break;
      case 'ArrowUp':
      case 'Home':
        openDropdown(0);
        break;
      case 'End':
        openDropdown(last);
        break;
      default:
        return;
    }
    event.preventDefault();
    return;
  }

  switch (key) {
    case 'Enter':
    case ' ':
      selectHighlighted();
      break;
    case 'Tab':
      selectHighlighted();
      return;
    case 'Escape':
      closeDropdown();
      break;
    case 'ArrowDown':
      setHighlight(highlightedIndex.value + 1);
      break;
    case 'ArrowUp':
      if (altKey) selectHighlighted();
      else setHighlight(highlightedIndex.value - 1);
      break;
    case 'Home':
      setHighlight(0);
      break;
    case 'End':
      setHighlight(last);
      break;
    case 'PageUp':
      setHighlight(highlightedIndex.value - PAGE_SIZE);
      break;
    case 'PageDown':
      setHighlight(highlightedIndex.value + PAGE_SIZE);
      break;
    default:
      return;
  }
  event.preventDefault();
}

function setErrorMessage(message: string): void {
  errorMessage.value = message;
}

function checkPhoneNumberPresence(): boolean {
  if (props.required && !phoneNumber.value) {
    setErrorMessage(props.errorMessages.required);
    return false;
  }
  return true;
}

function validatePhoneNumberFormat(): boolean {
  if (!phoneNumber.value) return true;

  const lengthIssue = validatePhoneNumberLength(phoneNumber.value, selectedCountry.value);
  if (lengthIssue !== undefined) {
    setErrorMessage(props.reasonMessages[lengthIssue] ?? props.errorMessages.invalid);
    return false;
  }

  const parsed = parse();
  if (!parsed) {
    setErrorMessage(props.errorMessages.parse);
    return false;
  }
  if (!parsed.isValid()) {
    setErrorMessage(props.errorMessages.invalid);
    return false;
  }
  return true;
}

function checkPhoneNumberType(): boolean {
  const parsed = parse();
  if (!parsed) {
    setErrorMessage(props.errorMessages.unknown);
    return false;
  }
  const numberType = parsed.getType();
  if (numberType !== undefined && props.expectedTypes.includes(numberType)) return true;

  setErrorMessage(props.errorMessages.incorrectType.replace('{types}', expectedTypesText.value));
  return false;
}

function validatePhoneNumber(): boolean {
  let isValid: boolean;
  if (!phoneNumber.value && !props.required) {
    isValid = true;
  } else {
    isValid = checkPhoneNumberPresence() && validatePhoneNumberFormat() && checkPhoneNumberType();
  }
  if (isValid) errorMessage.value = '';
  emit('validation', isValid);
  return isValid;
}

function getPhoneNumberType(): string {
  return parse()?.getType() ?? '';
}

function getPhoneNumberFormatted(format: PhoneFormat): string {
  const parsed = parse();
  return parsed ? formatAs(parsed, format) : '';
}

function formatAs(parsed: PhoneNumber, format: PhoneFormat): string {
  switch (format) {
    case 'E164':
      return parsed.format('E.164');
    case 'NATIONAL':
      return parsed.formatNational();
    case 'INTERNATIONAL':
      return parsed.formatInternational();
    case 'RFC3966':
      return parsed.format('RFC3966');
    default:
      return parsed.number;
  }
}

function reset(): void {
  phoneNumber.value = '';
  errorMessage.value = '';
  emitModel();
}

function focus(): void {
  telInput.value?.focus();
}

onMounted(() => {
  if (!props.country && props.autoDetectCountry) {
    setCountry(getDefaultCountryFromTimezone());
  }
  if (phoneNumber.value) formatPhoneNumber();
});

onBeforeUnmount(() => {
  clearTimeout(typeAheadTimer);
});

defineExpose({
  validatePhoneNumber,
  phoneNumber,
  selectedCountry,
  getPhoneNumberFormatted,
  getPhoneNumberType,
  reset,
  focus
});
</script>

<style scoped>
.fr-select {
  cursor: pointer;
}

.fr-fieldset--phone {
  align-items: stretch;
}

/* Annule le margin-top DSFR de .fr-label + .fr-input (étiquette masquée) */
.fr-sr-only + .fr-input {
  margin-top: 0;
}

.fr-messages-group--empty {
  margin: 0;
}

.fr-menu--tel {
  position: absolute;
  top: 3rem;
  z-index: 500;
  filter: drop-shadow(var(--overlap-shadow));
}

.fr-menu__list--tel {
  background-color: var(--background-overlap-grey);
  box-shadow: 0 0 0 1px rgba(0, 0, 18, 0.16);
  max-height: 200px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}

.fr-menu__list--tel li {
  display: block;
  cursor: pointer;
}

.fr-menu--tel .fr-nav__link {
  box-shadow: 0 calc(-1rem - 1px) 0 -1rem var(--border-default-grey);
}

.fr-menu__list--tel li[aria-selected='true'],
.fr-menu__list--tel li:hover {
  background-color: var(--background-open-blue-france);
}

.fr-menu__list--tel li[aria-selected='true'] {
  outline: 2px solid var(--border-active-blue-france);
  outline-offset: -2px;
}

@media (forced-colors: active) {
  .fr-menu__list--tel li[aria-selected='true'] {
    outline-color: Highlight;
  }
}
</style>
