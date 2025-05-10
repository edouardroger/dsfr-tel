# Dsfr-tel

## Qu'est-ce ?

Dsfr-tel est un composant VueJS permettant de formater et de valider la saisie d’un numéro de téléphone portable grâce à la bibliothèque Libphonenumber de Google, tout en s'inscrivant dans le système de design de l'État.

Il offre notamment :

- un champ de saisie dédié aux numéros de téléphone,
- une liste déroulante accessible pour sélectionner l'indicatif du pays correspondant,
- un formatage automatique du numéro (passage de l'international au format national, par exemple),
- une validation du numéro (présence, longueur, validité, type…).

## [Démonstration](https://edouardroger.github.io/dsfr-tel-demo/)

<img width="480" alt="" src="https://github.com/user-attachments/assets/f7ab3883-60fe-4e4b-9a26-20514099c6d1" />

## Installation

```bash
npm i dsfr-dsfr
```

Remarque : veillez à aussi importer la feuille de style, qui apporte quelques modifications nécessaires.

## Paramètres

Le composant accepte les paramètres suivants via des `props` :

- **expectedTypes** (Array\<string\>)  
  Définit les types de numéros autorisés.  
  *Default :* `['MOBILE', 'FIXED_LINE_OR_MOBILE']`

- **fieldsetLegend** (string)  
  Texte affiché dans la légende du fieldset.  
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
  Préfixe utilisé pour le placeholder dans le champ de saisie.  

  *Default :* `"Exemple : "`

- **reasonMessages** (Object)  
  Messages d'erreur spécifiques au format ou à la longueur du numéro de téléphone.  
  *Default :*

  ```json
  {
    "TOO_SHORT": "Le numéro de téléphone saisi est trop court.",
    "TOO_LONG": "Le numéro est trop long.",
    "INVALID_COUNTRY": "Le code du pays est invalide.",
    "INVALID_LENGTH": "Longueur non valide.",
    "NOT_A_NUMBER": "La valeur saisie n'est pas un numéro."
  }
  ```

## Méthodes

Le composant expose plusieurs méthodes :

- **validatePhoneNumber() : boolean**  
  Valide le numéro de téléphone saisi en vérifiant :
  - Sa présence,
  - Son format (en utilisant Libphonenumber),
  - Son type (parmi ceux définis dans `expectedTypes`).

- **getPhoneNumberFormatted(format: 'E164' | 'NATIONAL' | 'INTERNATIONAL' | 'RFC3966') : string**  

Retourne le numéro de téléphone au selon le format demandé.

Ces méthodes sont exposées via `defineExpose` et peuvent être utilisées dans l’application parent.

## Propriétés Exposées

Les propriétés accessibles sur le composant sont :

- **phoneNumber** : Le numéro de téléphone actuellement saisi.
- **selectedCountry** : Le code du pays sélectionné via la liste déroulante.

## Utilisation

Intégrez simplement le composant dans votre application comme suit :

```vue
<template>
  <DsfrTel ref="dsfrTel" />
</template>

<script setup lang="ts">
import DsfrTel from 'dsfr-dsfr';

const dsfrTelRef = ref();

function onSubmit() {
  if(dsfrTelRef.value.validatePhoneNumber()){
    const formattedNumber = dsfrTelRef.value.getPhoneNumberFormatted('NATIONAL');
    // …
  }
}
</script>
```

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
/>
```
