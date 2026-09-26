import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js/max';
import timezonesJson from './timezones.json';

export interface Country {
  code: CountryCode;
  /** Nom localisé du pays. */
  name: string;
  /** Intitulé de l'option : nom et indicatif. */
  label: string;
  /** Nom normalisé, sans diacritiques, pour la recherche au clavier. */
  searchName: string;
  /** Indicatif international, sans le « + ». */
  dialCode: string;
  flag: string;
}

export interface CountryData {
  list: ReadonlyArray<Country>;
  indexByCode: ReadonlyMap<string, number>;
}

export const DEFAULT_LOCALE = 'fr';
export const DEFAULT_COUNTRY: CountryCode = 'FR';

/** Décalage entre les lettres ASCII et les « Regional Indicator Symbols ». */
const FLAG_OFFSET = 127_397;

/** Pays exclus de la liste : indicatif partagé, sans numérotation propre. */
const EXCLUDED_CODES = new Set<string>(['EH']);

/** Noms substitués à ceux de CLDR, par langue. */
const NAME_OVERRIDES: Record<string, Record<string, string>> = {
  fr: { FR: 'France métropolitaine' }
};

export function getFlagEmoji(countryCode: string): string {
  return String.fromCodePoint(
    ...[...countryCode.toUpperCase()].map((char) => FLAG_OFFSET + char.charCodeAt(0))
  );
}

/** Minuscules sans diacritiques ni apostrophe typographique, pour la recherche. */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[\u2018\u2019]/g, "'")
    .toLowerCase();
}

function buildCountryData(locale: string): CountryData {
  const language = locale.split('-')[0];
  const overrides = NAME_OVERRIDES[language] ?? {};

  let displayNames: Intl.DisplayNames | undefined;
  try {
    displayNames = new Intl.DisplayNames([locale], { type: 'region', fallback: 'code' });
  } catch {
    displayNames = undefined;
  }

  const collator = new Intl.Collator(locale, { sensitivity: 'base' });

  const list = getCountries()
    .filter((code) => !EXCLUDED_CODES.has(code))
    .map((code) => {
      const name = overrides[code] ?? displayNames?.of(code) ?? code;
      const dialCode = getCountryCallingCode(code);
      return {
        code,
        name,
        label: `${name} (+${dialCode})`,
        searchName: normalize(name),
        dialCode,
        flag: getFlagEmoji(code)
      };
    })
    .sort((a, b) => collator.compare(a.name, b.name));

  return {
    list,
    indexByCode: new Map(list.map((country, index) => [country.code, index]))
  };
}

const cache = new Map<string, CountryData>();

/** Liste des pays pour une langue donnée (mise en cache). */
export function getCountryData(locale: string = DEFAULT_LOCALE): CountryData {
  let data = cache.get(locale);
  if (!data) {
    data = buildCountryData(locale);
    cache.set(locale, data);
  }
  return data;
}

/** Liste des pays et indicatifs, triée dans la langue demandée. */
export function getCountryList(locale?: string): ReadonlyArray<Country> {
  return getCountryData(locale).list;
}

const timezoneToCountry = timezonesJson as Record<string, string>;

/** Déduit le pays depuis le fuseau horaire du navigateur. */
export function getDefaultCountryFromTimezone(fallback: CountryCode = DEFAULT_COUNTRY): CountryCode {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const code = timezoneToCountry[timezone] as CountryCode | undefined;
    return code && !EXCLUDED_CODES.has(code) ? code : fallback;
  } catch {
    return fallback;
  }
}

/** Traduction des types de numéros renvoyés par libphonenumber-js. */
export const numberTypeLabels: Readonly<Record<string, string>> = {
  MOBILE: 'Portable',
  FIXED_LINE: 'Fixe',
  FIXED_LINE_OR_MOBILE: 'Fixe ou portable',
  TOLL_FREE: 'Numéro gratuit',
  PREMIUM_RATE: 'Numéro surtaxé',
  VOIP: 'Numéro de VoIP',
  PERSONAL_NUMBER: 'Numéro personnel',
  PAGER: 'Numéro de bipeur',
  UAN: 'Numéro universel',
  UNKNOWN: 'Type inconnu',
  FAX: 'Fax',
  SHARED_COST: 'Numéro à coût partagé',
  SATELLITE: 'Numéro satellite',
  EMERGENCY: "Numéro d'urgence",
  VOICEMAIL: 'Messagerie vocale',
  SPARE: 'Numéro de rechange'
};

/** Chaînes de l'interface, surchargeables via la prop `labels`. */
export interface Labels {
  /** Nom accessible du champ de sélection de l'indicatif. */
  country: string;
  /** Nom accessible de la liste des indicatifs. */
  countryList: string;
  /** Titre et nom accessible du sélecteur ; `{country}` : pays retenu. */
  changeCountry: string;
  /** Indication par défaut ; `{example}` : numéro d'exemple au format national. */
  hint: string;
  /** Libellés des types de numéros renvoyés par libphonenumber-js. */
  types: Readonly<Record<string, string>>;
}

export const defaultLabels: Readonly<Labels> = {
  country: 'Indicatif du pays',
  countryList: "Liste de sélection de l'indicatif",
  changeCountry: "Modifier l'indicatif sélectionné ({country})",
  hint: 'Au format national (ex : {example})',
  types: numberTypeLabels
};
