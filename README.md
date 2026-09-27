# Dsfr-tel
[![CI](https://github.com/edouardroger/dsfr-tel/actions/workflows/ci.yml/badge.svg)](https://github.com/edouardroger/dsfr-tel/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/dsfr-tel)](https://www.npmjs.com/package/dsfr-tel)

## Qu'est-ce ?

Dsfr-tel est un composant VueJS permettant de formater et de valider la saisie d’un numéro de téléphone (portable, fixe…) grâce à la bibliothèque Libphonenumber de Google, tout en s'inscrivant dans le système de design de l'État.

Il offre notamment :

- un champ de saisie du numéro de téléphone,
- une liste déroulante permettant de sélectionner l'indicatif du pays correspondant,
- un formatage automatique du numéro (passage de l'international au format national, par exemple) y compris lors de la saisie,
- une validation du numéro (présence, longueur, validité, type…),
- la détection automatique du pays à partir du fuseau horaire (optionnelle via la prop `autoDetectCountry`).

**Ce composant n'est pas proposé par le Service d'information du Gouvernement**.

## [Démonstration](https://edouardroger.github.io/dsfr-tel-demo/)

<img width="507" alt="" src="https://github.com/user-attachments/assets/fb061e18-58a4-4873-b714-df63f5e2b97a" />

Les évolutions de chaque version sont détaillées dans [CHANGELOG.md](CHANGELOG.md).

## Installation

```bash
npm i dsfr-tel
```

N'oubliez pas d'importer également la feuille de style nécessaire :

```typescript
import 'dsfr-tel/style.css';
```

[libphonenumber-js](https://gitlab.com/catamphetamine/libphonenumber-js) est une dépendance du
paquet, et non une copie embarquée : votre bundler la résout comme n'importe quelle autre. Les
mises à jour de ses plans de numérotation, publiées plusieurs fois par mois, vous parviennent
donc sans attendre une nouvelle version de `dsfr-tel`, et la bibliothèque n'est jamais présente
en double si votre application l'utilise déjà.

### Variante « portables uniquement »

Si votre formulaire n'accepte que des numéros de portable, importez le composant depuis
`dsfr-tel/mobile` : il s'appuie sur les métadonnées `libphonenumber-js/mobile`, plus légères
(49 ko gzip contre 64 ko dans l'application finale, Vue exclu).

```typescript
import { DsfrTel } from 'dsfr-tel/mobile';
```

Ces métadonnées ne décrivent que les numéros de portable : un numéro fixe, surtaxé ou gratuit y
est jugé invalide. C'est donc le message `errorMessages.invalid` qui s'affiche, et non
`incorrectType` ; adaptez-le en conséquence (par exemple « Veuillez saisir un numéro de
téléphone portable valide. »). N'importez pas les deux variantes dans une même application :
les deux jeux de métadonnées seraient embarqués.

### Sans outil de build

Avec un outil de build (Vite, webpack, Nuxt…), `npm i dsfr-tel` suffit : libphonenumber-js est
installé et résolu automatiquement. Seule une page qui charge le composant directement par
balises `<script>` doit charger Vue puis libphonenumber-js avant lui :

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dsfr-tel@1/dist/dsfr-tel.css" />

<div id="app">
  <dsfr-tel></dsfr-tel>
</div>

<script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
<script src="https://cdn.jsdelivr.net/npm/libphonenumber-js@1/bundle/libphonenumber-max.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dsfr-tel@1/dist/dsfr-tel.umd.js"></script>
<script>
  Vue.createApp({}).use(DsfrTel.default).mount('#app');
</script>
```

Pour la variante mobile, utilisez `libphonenumber-mobile.js` et `dist/mobile/dsfr-tel.umd.js`.

## Utilisation

Vous pouvez utiliser le composant de deux manières :

### Utilisation globale (plugin)

Installez le plugin dans le point d'entrée de votre application (par exemple dans `main.ts` ou `main.js`) :

```typescript
// filepath: /src/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import DsfrTelPlugin from 'dsfr-tel';

const app = createApp(App);
app.use(DsfrTelPlugin);
app.mount('#app');
```

Une fois installé globalement, vous pouvez directement utiliser le composant :

```vue
<template>
  <DsfrTel ref="dsfrTel" />
</template>
```

### Utilisation locale

Si vous préférez enregistrer le composant uniquement dans certains composants, importez le composant nommé et enregistrez-le localement :

```vue
<template>
  <DsfrTel ref="dsfrTel" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { DsfrTel } from 'dsfr-tel';

const dsfrTel = ref();

function onSubmit() {
  if(dsfrTel.value.validatePhoneNumber()){
    const formattedNumber = dsfrTel.value.getPhoneNumberFormatted('NATIONAL');
    // …
  }
}
</script>
```

## Paramètres

Le composant accepte les paramètres suivants via des `props` :

- **expectedTypes** (Array\<string\>)  
  Définit les types de numéros autorisés.  
  *Default :* `['MOBILE', 'FIXED_LINE_OR_MOBILE']`  
  
  **Remarque :** Les valeurs possibles pour les types sont celles retournées par la bibliothèque [libphonenumber-js](https://gitlab.com/catamphetamine/libphonenumber-js), par exemple :  

  - `MOBILE` (Portable)  
  - `FIXED_LINE` (Fixe)  
  - `FIXED_LINE_OR_MOBILE` (Fixe ou portable)  
  - `TOLL_FREE` (Numéro gratuit)  
  - `PREMIUM_RATE` (Numéro surtaxé)  
  - `VOIP` (Numéro de VoIP)  
  - `PERSONAL_NUMBER` (Numéro personnel)  
  - `PAGER` (Numéro de bipeur)  
  - `UAN` (Numéro universel)  
  - `UNKNOWN` (Type inconnu)  
  - `FAX` (Fax)  
  - `SHARED_COST` (Numéro à coût partagé)  
  - `SATELLITE` (Numéro satellite)  
  - `EMERGENCY` (Numéro d'urgence)  
  - `VOICEMAIL` (Messagerie vocale)  
  - `SPARE` (Numéro de rechange)  

  Ces valeurs sont traduites automatiquement dans l'interface grâce à la table de concordance `numberTypeLabels`.

- **fieldsetLegend** (string)  
  Texte affiché dans la légende du regroupement de champs.  
  *Default :* `"Votre numéro de téléphone portable"`

- **errorMessages** (Object)  
  Messages d'erreur généraux utilisés lors de la validation.
  *Default :*

  ```json
  {
    "required": "La saisie du numéro de téléphone est requise.",
    "invalid": "Le numéro renseigné est incorrect. Veuillez le vérifier.",
    "incorrectType": "Le numéro doit être de type {types}.",
    "unknown": "Erreur lors de la validation du numéro.",
    "parse": "Erreur lors de l'analyse du numéro."
  }
  ```

- **placeholderPrefix** (string)  
  Préfixe utilisé pour l'emplacement de texte du champ de saisie.  
  *Default :* `"Exemple : "`

- **reasonMessages** (Object)  
  Messages d'erreur spécifiques au format ou à la longueur du numéro de téléphone.  
  *Default :*

  ```json
  {
    "TOO_SHORT": "Le numéro de téléphone saisi est trop court.",
    "TOO_LONG": "Le numéro de téléphone saisi est trop long.",
    "INVALID_COUNTRY": "Le code du pays est invalide.",
    "INVALID_LENGTH": "La longueur du numéro de téléphone saisi n'est pas valide.",
    "NOT_A_NUMBER": "La valeur saisie n'est pas un numéro de téléphone."
  }
  ```

- **hint** (string)  
  Indication sur le format attendu.  
  *Default :* `"Au format national (ex : X"` où **X** est un exemple de format (au format national, fonction du pays sélectionné).

- **locale** (string)  
  Langue des noms de pays, fournis par `Intl.DisplayNames`. À défaut, l’attribut `lang` de la
  page, puis le français.  
  *Default :* `undefined`

- **autoDetectCountry** (boolean)  
  Active la détection automatique du pays de l’usager à partir de son fuseau horaire.  
  *Default :* `true`

- **modelValue** (string)  
  Numéro lié par `v-model`, au format `modelFormat`. En entrée, un numéro international
  (`+32470123456`) sélectionne aussi le pays correspondant ; le champ affiche toujours le
  format national. Tant que la saisie ne constitue pas un numéro analysable, la valeur émise
  est vide. Utilisez `validatePhoneNumber()` ou l’événement `validation` pour la validité.  
  *Default :* `undefined`

- **modelFormat** (`'E164'` | `'INTERNATIONAL'` | `'NATIONAL'` | `'RFC3966'`)  
  Format émis par `v-model`. E.164 est le seul format qui conserve l’indicatif sans ambiguïté,
  et celui qu’attendent la plupart des services d’envoi de SMS.  
  *Default :* `'E164'`

- **country** (string)  
  Force le pays sélectionné (code ISO 3166-1 alpha-2). Prioritaire sur `autoDetectCountry`.  
  *Default :* `undefined`

- **inputLabel** (string)  
  Étiquette du champ de saisie, associée via `<label for>` et masquée visuellement.  
  *Default :* `"Numéro de téléphone"`

- **required** (boolean)  
  Rend la saisie obligatoire : mention dans la légende (voir `requiredMarker`), message
  d’erreur dédié et `aria-required="true"`. L’attribut HTML `required` n’est volontairement
  pas posé, la bulle native du navigateur masquant sinon le message d’erreur du DSFR.  
  *Default :* `false`

- **requiredMarker** (string)  
  Mention ajoutée à la légende quand `required` est actif : `"*"`, `"(requis)"` ou tout autre
  texte, par exemple `"(obligatoire)"`. Une mention uniquement symbolique, comme `*`, est
  masquée aux technologies d’assistance, qui reçoivent déjà l’information par `aria-required`.
  **Avec l’astérisque, sa signification doit être indiquée dans le formulaire, avant le champ**
  (critère RGAA 11.10), par exemple : « Les champs marqués d’un astérisque (*) sont
  obligatoires. » Une chaîne vide supprime la mention, lorsque le formulaire précise déjà que
  tous les champs sont obligatoires.  
  *Default :* `"*"`

- **labels** (Object)  
  Chaînes de l’interface, pour traduire le composant. Toutes les clés sont facultatives ; les
  types non fournis gardent leur libellé français.  
  *Default :*

  ```json
  {
    "country": "Indicatif du pays",
    "countryList": "Liste de sélection de l'indicatif",
    "changeCountry": "Modifier l'indicatif sélectionné ({country})",
    "hint": "Au format national (ex : {example})",
    "types": { "MOBILE": "Portable", "FIXED_LINE": "Fixe", "…": "…" }
  }
  ```

- **validateOnBlur** (boolean)  
  Déclenche la validation à la sortie du champ.  
  *Default :* `false`

## Événements

- **update:modelValue** (string) : lorsque le numéro change, au format `modelFormat`
  (permet `v-model`). Rien n’est émis si la valeur est identique à la précédente.
- **update:country** (CountryCode) : lorsque le pays change (sélection ou détection à partir d’un numéro international).
- **validation** (boolean) : résultat de chaque appel à `validatePhoneNumber()`.

## Méthodes

Le composant expose plusieurs méthodes :

- **validatePhoneNumber() : boolean**  
  Valide le numéro de téléphone saisi en vérifiant :
  - Sa présence,
  - Son format (en utilisant Libphonenumber),
  - Son type (parmi ceux définis dans `expectedTypes`).

- **getPhoneNumberFormatted(format: 'E164' | 'NATIONAL' | 'INTERNATIONAL' | 'RFC3966') : string**  
  Retourne le numéro de téléphone au format demandé (national, international…).

- **getPhoneNumberType() : string**  
  Renvoie le type du numéro tel que retourné par Libphonenumber ("MOBILE", par exemple, pour un numéro de téléphone portable).

- **reset() : void**  
  Vide le champ et efface le message d’erreur.

- **focus() : void**  
  Donne le focus au champ de saisie (utile après une soumission invalide).

> **Note :** La détection du pays via le fuseau horaire s'effectue automatiquement lors du montage du composant si la prop `autoDetectCountry` est activée. La méthode `getDefaultCountryFromTimezone` récupère le fuseau horaire de l’usager pour définir le pays par défaut.

## Exports du paquet

En plus du composant et du plugin, le paquet expose `numberTypeLabels` (traduction des types
de numéros renvoyés par Libphonenumber, pour afficher « Portable » plutôt que `MOBILE`),
`getCountryList(locale?)` (liste des pays et indicatifs utilisée par le composant, triée dans
la langue demandée), `defaultLabels` (chaînes par défaut, à étendre pour une traduction) et les
types `Country` et `Labels`.

## Propriétés exposées

Les propriétés accessibles sur le composant sont :

- **phoneNumber** : le numéro de téléphone actuellement saisi.
- **selectedCountry** : le code du pays sélectionné via la liste déroulante.

## Personnalisation

Vous pouvez personnaliser l'apparence et le comportement du composant en lui passant des props. Par exemple :

```vue
<DsfrTel
  :expectedTypes="['MOBILE']"
  fieldsetLegend="Votre numéro de téléphone portable"
  :errorMessages="{
    required: 'La saisie de votre numéro de téléphone portable est obligatoire',
    invalid: 'Numéro de téléphone invalide',
    incorrectType: 'La saisie d\'un numéro de téléphone portable est attendue',
    unknown: 'Erreur inconnue',
    parse: 'Erreur d\'analyse'
  }"
  placeholderPrefix="Exemple : "
  :reasonMessages="{
    TOO_SHORT: 'Numéro trop court',
    TOO_LONG: 'Numéro trop long',
    INVALID_COUNTRY: 'Pays invalide',
    INVALID_LENGTH: 'Longueur invalide',
    NOT_A_NUMBER: 'Ce n’est pas un numéro'
  }"
  :autoDetectCountry="true"
/>
```

## Noms de pays

Les noms proviennent d’`Intl.DisplayNames` : aucune table de traduction n’est embarquée et la
liste suit la langue de la page. Une seule correction est appliquée en français — « FR » est
libellé « France métropolitaine », les départements et collectivités d’outre-mer ayant leurs
propres codes et indicatifs (GP, MQ, GF, RE, YT…), qu’il serait trompeur de confondre dans un
champ téléphonique.

## Accessibilité

La sélection de l’indicatif suit le motif ARIA
[*Select-Only Combobox*](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/),
qui reproduit le fonctionnement d’un `<select>` natif : une combobox non éditable, nommée
« Indicatif du pays » (`aria-labelledby`), dont le contenu restitue le pays retenu. À l’écran,
seul le drapeau est affiché ; le libellé complet apparaît au survol (`title`).

Le focus ne quitte jamais la combobox : l’option ayant le focus visuel est désignée par
`aria-activedescendant`, porte `aria-selected="true"` et est ramenée dans la zone visible, ce
qui importe aux personnes qui agrandissent l’affichage. Parcourir la liste ne change pas la
valeur : elle n’est retenue qu’avec `Entrée`, `Espace`, `Tab`, `Alt`+`Flèche haut`, un clic
sur une option, ou lorsque le focus quitte la combobox.

Clavier, liste fermée :

- `Flèche bas`, `Alt`+`Flèche bas`, `Entrée`, `Espace` : ouvrent la liste sur le pays retenu ;
- `Flèche haut`, `Début` : ouvrent la liste sur la première option ; `Fin`, sur la dernière ;
- lettres : ouvrent la liste sur le premier pays correspondant.

Clavier, liste ouverte :

- `Entrée`, `Espace`, `Alt`+`Flèche haut` : retiennent l’option et ferment la liste ;
- `Tab` : retient l’option, ferme la liste et passe à l’élément suivant ;
- `Échap` : ferme la liste sans changer la valeur ;
- `Flèche bas` / `Flèche haut` : option suivante / précédente, sans dépasser les extrémités ;
- `Début` / `Fin` : première / dernière option ;
- `Page suiv.` / `Page préc.` : saut de dix options, borné aux extrémités ;
- lettres : recherche incrémentale insensible aux accents (« eg » atteint « Égypte ») ; répéter
  une même lettre parcourt les pays qui commencent par elle.

Chaque champ dispose d’une étiquette `<label for>`, les identifiants sont
uniques par instance et les messages d’erreur sont restitués via une région `role="alert"`.

Les identifiants proviennent de `useId()` : ils sont identiques entre rendu serveur et
hydratation (Nuxt). Si une même page héberge plusieurs applications Vue, donnez-leur des
préfixes distincts pour éviter tout doublon :

```typescript
app.config.idPrefix = 'formulaire-contact';
```

## Développement

Node.js 22.12 ou plus récent est nécessaire pour développer le composant (Vite 8, Vitest 5).

```bash
npm ci
npm run dev           # démonstration locale (dossier demo/)
npm test              # tests unitaires et audits axe-core (Vitest)
npm run test:coverage # idem, avec seuils de couverture
npm run typecheck     # vue-tsc
npm run build         # librairie → dist/
npm run build:demo    # site de démonstration → dist-demo/
```

## Publication

Le workflow `.github/workflows/publish.yml` publie le paquet sur npm à chaque tag `vX.Y.Z` :

```bash
npm version patch   # ou minor / major
git push --follow-tags
```

Il vérifie que le tag correspond à la version du `package.json`, rejoue les types, les tests
et le build, puis publie — sans rien faire si la version est déjà en ligne, ce qui rend les
relances sans effet de bord.

L'authentification repose sur la **publication de confiance** (OIDC) : aucun jeton npm n'est
stocké dans le dépôt, et l'attestation de provenance est générée automatiquement. Une
configuration est nécessaire une seule fois sur npmjs.com : page du paquet → *Settings* →
*Trusted Publisher* → *GitHub Actions*, avec le dépôt et le nom de fichier `publish.yml`.
Vérifiez-y que l'action `npm publish` est autorisée : les configurations récentes n'autorisent
par défaut que la publication en deux temps.

## Démonstration et DSFR

La démonstration (`demo/`) charge le DSFR depuis jsDelivr, en version épinglée, avec une
empreinte d'intégrité (SRI) qui fait refuser par le navigateur tout fichier altéré. Pour
changer de version, mettez à jour l'URL **et** l'empreinte dans `demo/index.html` :

```bash
curl -s https://cdn.jsdelivr.net/npm/@gouvfr/dsfr@X.Y.Z/dist/dsfr.min.css \
  | openssl dgst -sha384 -binary | openssl base64 -A
```

(idem pour `dsfr.module.min.js`), en préfixant le résultat par `sha384-`.

## Intégration continue

Le workflow `.github/workflows/ci.yml` vérifie les types, exécute les tests — dont des audits
axe-core (WCAG 2.1 A et AA) sur le composant liste fermée, ouverte et en erreur — avec des
seuils de couverture, et construit la librairie à chaque *push* et *pull request*. Les actions
sont épinglées par SHA de commit ; Dependabot (`.github/dependabot.yml`) propose chaque
semaine les mises à jour des actions et des dépendances npm, avec un délai de sept jours après
publication. Sur `main`, il construit la démonstration,
effectue un contrôle d’accessibilité automatisé (pa11y, WCAG 2.1 AA, configuré dans
`.pa11yci.json`) et la publie sur GitHub Pages. Ce contrôle n’est bloquant que si la variable
de dépôt `PA11Y_BLOQUANT` vaut `true` (*Settings → Secrets and variables → Actions →
Variables*) : à activer après un premier passage propre. Activation : **Settings → Pages → Source : GitHub Actions**.
