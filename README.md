# Dsfr-tel

## Qu'est-ce ?

Dsfr-tel est un composant VueJS permettant de formater et de valider la saisie d’un numéro de téléphone portable grâce à la bibliothèque Libphonenumber de Google.

Il offre notamment :

- un champ de saisie dédié aux numéros de téléphone,
- une liste déroulante accessible pour sélectionner l'indicatif du pays correspondant,
- un formatage automatique du numéro (passage de l'international au format national, par exemple),
- une validation du numéro (présence, longueur, validité, type…).

## [Démonstration](https://edouardroger.github.io/dsfr-tel-demo/)

<img width="480" alt="" src="https://github.com/user-attachments/assets/f7ab3883-60fe-4e4b-9a26-20514099c6d1" />

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

Retourne le numéro de téléphone formaté selon le format demandé.

## Propriétés

Les propriétés exposées via le composant sont :

- **phoneNumber** : le numéro actuellement saisi.
- **selectedCountry** : le code du pays sélectionné via la liste déroulante.
