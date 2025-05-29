# Dsfr-tel

## Qu'est-ce ?

Dsfr-tel est un composant VueJS permettant de formater et de valider la saisie d’un numéro de téléphone (portable, fixe…) grâce à la bibliothèque Libphonenumber de Google, tout en s'inscrivant dans le système de design de l'État.

Il offre notamment :

- un champ de saisie du numéro de téléphone,
- une liste déroulante permettant de sélectionner l'indicatif du pays correspondant,
- un formatage automatique du numéro (passage de l'international au format national, par exemple) y compris lors de la saisie,
- une validation du numéro (présence, longueur, validité, type…),
- la détection automatique du pays à partir du fuseau horaire (optionnelle via la prop `autoDetectCountry`).

## [Démonstration](https://edouardroger.github.io/dsfr-tel-demo/)

<img width="507" alt="" src="https://github.com/user-attachments/assets/fb061e18-58a4-4873-b714-df63f5e2b97a" />

## Installation

```bash
npm i dsfr-tel
```

N'oubliez pas d'importer également la feuille de style nécessaire.

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

- **autoDetectCountry** (boolean)  
  Active la détection automatique du pays de l’usager à partir de son fuseau horaire.  
  *Default :* `true`

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

> **Note :** La détection du pays via le fuseau horaire s'effectue automatiquement lors du montage du composant si la prop `autoDetectCountry` est activée. La méthode `getDefaultCountryFromTimezone` récupère le fuxeau horaire de l’usager pour définir le pays par défaut.

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
