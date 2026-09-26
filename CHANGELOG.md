# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; le projet suit le
[versionnage sémantique](https://semver.org/lang/fr/).

## [1.1.0] — non publiée

### À vérifier avant de mettre à jour

- **`vue` devient une dépendance de pair** (`^3.5`). Une application qui l’obtenait
  uniquement par `dsfr-tel` doit l’installer elle-même.
- **`libphonenumber-js` n’est plus embarqué** dans le paquet : il est résolu par l’application,
  comme toute dépendance. Le build UMD utilisé en `<script>`, sans bundler, attend désormais
  les globales `Vue` et `libphonenumber`.
- **Chemins d’import verrouillés** par le champ `exports` : seuls `dsfr-tel`, `dsfr-tel/mobile`,
  `dsfr-tel/style.css` et `dsfr-tel/dist/dsfr-tel.css` sont importables. Le build ES est
  renommé `dsfr-tel.es.mjs`.
- **`required` ne pose plus l’attribut HTML `required`** mais `aria-required="true"` : la bulle
  native du navigateur masquait le message d’erreur du DSFR. La validation reste assurée par
  `validatePhoneNumber()`.
- **Noms de pays issus de CLDR** via `Intl.DisplayNames` (par exemple « Tchéquie »,
  « Congo-Kinshasa »). Seul « France métropolitaine » est conservé, pour ne pas confondre la
  métropole avec les outre-mer, qui ont leurs propres indicatifs.

### Ajouts

- `v-model` : prop `modelValue` et prop `modelFormat` (E.164 par défaut, seul format qui
  conserve l’indicatif).
- Props `country`, `locale`, `labels`, `inputLabel` et `validateOnBlur`.
- Prop `requiredMarker` : mention d’obligation ajoutée à la légende quand la saisie est
  requise (« * » par défaut, « (requis) » ou texte libre).
- Nom accessible « Indicatif du pays » pour le sélecteur (`aria-labelledby`, clé `country` de
  la prop `labels`).
- Événements `update:country` et `validation` ; méthodes exposées `reset()` et `focus()`.
- Variante `dsfr-tel/mobile`, reposant sur les métadonnées `libphonenumber-js/mobile`
  (49 ko gzip contre 64 ko dans l’application finale).
- Exports `getCountryList()`, `numberTypeLabels`, `defaultLabels` et types `Country`, `Labels`.
- Clavier du sélecteur d’indicatif conforme à l’exemple APG : `Début` / `Fin`,
  `Page préc.` / `Page suiv.`, `Alt`+`Flèche haut`, `Tab` ; recherche au clavier insensible
  aux accents.
- Noms de pays dans la langue de la page (prop `locale`, à défaut attribut `lang`).
- Compatibilité avec le rendu serveur (Nuxt) : identifiants stables entre serveur et client.

### Corrections

- Identifiants HTML fixes (`tel-input`, `tel-input-message`) dupliqués dès deux instances
  sur une page : ils sont désormais uniques par instance.
- Le champ de saisie reçoit une étiquette `<label for>` au lieu d’un simple `aria-label`.
- Motif ARIA *combobox select-only* : le focus était déplacé sur les options tout en
  déclarant `aria-activedescendant` ; il reste désormais sur la combobox, comme le prévoit le
  motif.
- Les erreurs sont restituées par une région `role="alert"` permanente, sans réserver d’espace
  quand il n’y a pas d’erreur.
- `Tab` ne bloque plus la tabulation quand la liste est ouverte.
- Message d’erreur de type incohérent avec les types par défaut (« portable ou fixe ou
  portable ») : le type technique `FIXED_LINE_OR_MOBILE` n’y figure plus, sauf s’il est seul
  attendu, et les types sont énumérés selon la langue (« portable, fixe ou numéro gratuit »).
- `package.json` : bloc `"."` mal placé à la racine, remplacé par un champ `exports` valide.

### Performances

- Paquet npm : 457 ko → 111 ko (2,0 Mo → 488 ko décompressé), variante mobile, cartes
  de sources et journal compris.
- Suppression de la copie dupliquée des métadonnées (`metadata.min.json`) et de
  `countries.json`.
- Liste des pays construite une fois par langue et mise en cache, au lieu d’une fois par
  instance.

## [1.0.27]

Dernière version publiée avant ce journal.
