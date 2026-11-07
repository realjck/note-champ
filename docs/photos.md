# Spécification : photos dans les notes

Statut : validée, non implémentée. Ce document sert de référence pour la
réalisation, étape par étape, dans une prochaine session.

## Objectif

Pouvoir joindre des photos à une note. Elles s'affichent en vignettes sous le
texte et s'ouvrent en plein écran avec zoom. Elles sont incluses dans l'export
et l'import.

## Décisions prises

| Sujet | Décision |
|---|---|
| Emplacement | Pièces jointes sous le texte de la note, dans une bande de vignettes carrées qui défile horizontalement |
| Quantité | Pas de limite |
| Ordre | Ordre d'ajout, sans réorganisation |
| Ajout | Bouton « Ajouter des photos », sélection multiple, appareil photo ou galerie |
| Suppression | Croix sur la vignette, puis confirmation par `ConfirmModal` (« Supprimer cette photo ? ») pour éviter les suppressions involontaires pendant le défilement |
| Visionneuse | Plein écran, zoom (pincement, double tap) et glissement d'une photo à l'autre. Le bouton retour d'Android ferme la visionneuse. |
| Liste des notes | Une icône avec le nombre de photos sur la carte, si la note en contient |
| Export | Fichier ZIP contenant `notes.json` et les photos dans `images/` |
| Import | Accepte le nouveau ZIP et les anciens fichiers `.json` |
| Hors ligne | Tout reste local, sans serveur ni lien externe |

## Stockage

### Choix

Les photos sont stockées en `Blob` dans IndexedDB, pas sous forme de liens.
L'application est sans serveur et un lien vers un fichier local ne survit pas
à une réinstallation. Le base64 est écarté, car il prend environ 33 % de place
en plus.

La persistance du stockage est déjà demandée (`src/lib/storage.ts`). Elle
protège les photos contre l'éviction par le navigateur.

### Schéma (DB_VERSION 2)

Ajouter dans `upgrade` (`src/lib/db.ts`) une étape `if (oldVersion < 2)` :

- un nouveau store `images`, avec `keyPath: 'id'` ;
- un index `entryId` pour retrouver les photos d'une note.

```ts
/** Photo jointe à une note. */
export interface NoteImage {
  id: string;          // crypto.randomUUID()
  entryId: string;     // id de la note
  blob: Blob;          // JPEG, 1600 px maximum sur le plus grand côté
  thumbnail: Blob;     // JPEG carré, environ 200 px, recadré au centre
  width: number;       // dimensions de `blob`, nécessaires à la visionneuse
  height: number;
  createdAt: string;   // ISO, sert à l'ordre d'ajout
}
```

`JournalEntry` ne change pas : le lien se fait par `entryId`. Le nombre de
photos par note, utile à la liste, se calcule avec un `index.count()` ou en
lisant toutes les clés de l'index.

### Traitement à l'ajout

Fonction à placer dans `src/lib/images.ts` :

1. Décoder le fichier avec `createImageBitmap(file, { imageOrientation: 'from-image' })`,
   pour respecter l'orientation EXIF des photos de téléphone.
2. Redimensionner sur un canvas à 1600 px maximum, puis exporter en JPEG
   (qualité 0,85) avec `canvas.toBlob`.
3. Produire la vignette carrée de la même façon, recadrée au centre.

Le passage par le canvas retire les métadonnées EXIF, y compris la position
GPS. C'est voulu.

Les formats que le navigateur ne sait pas décoder (HEIC sur certains Android,
par exemple) provoquent un message d'erreur clair dans une modale, sans
planter. Un fichier qui n'est pas une image est refusé de la même façon : c'est
une frontière du système, donc la validation se fait ici.

### Affichage

L'affichage passe par `URL.createObjectURL(blob)`. Il faut appeler
`URL.revokeObjectURL` au démontage, sinon la mémoire fuit. Un petit hook
`useObjectUrl(blob)` couvre ce besoin.

### Cohérence

- Supprimer une note supprime ses photos, dans la même transaction (stores
  `journal_entries` et `images`).
- La règle existante « une note vide n'est pas enregistrée » (`isBlank` dans
  `useStore.ts`) doit tenir compte des photos : une note sans texte mais avec
  des photos n'est pas vide, donc elle n'est pas supprimée.
- Ajouter une photo à une note neuve doit d'abord enregistrer la note (ou
  vider la sauvegarde différée avec `flush`), pour ne jamais laisser de photo
  orpheline.

## Interface

### Éditeur (`src/components/Editor.tsx`)

- Sous la zone de texte :
  - un bouton « Ajouter des photos » relié à un
    `<input type="file" accept="image/*" multiple>` caché ;
  - la bande de vignettes, avec un défilement horizontal natif
    (`overflow-x-auto`, `snap-x`).
- Vignettes : 80 px de côté environ, `object-cover`, coins arrondis.
- Croix de suppression en haut à droite de chaque vignette :
  - zone tactile d'au moins 32 px ;
  - `aria-label="Supprimer la photo N"`.
- Un tap sur une vignette ouvre la visionneuse à cette photo,
  avec `aria-label="Agrandir la photo N"`.
- Pendant le traitement des photos, afficher un indicateur de chargement
  (`role="status"`).

### Visionneuse

Choisir entre PhotoSwipe 5 et yet-another-react-lightbox (avec son plugin
Zoom), après lecture de leur documentation à jour via Context7. Préférence
de départ : PhotoSwipe, robuste sur mobile. Les deux ont besoin de `width` et
`height`, d'où leur présence dans le schéma.

Le bouton retour d'Android ferme la visionneuse : ajouter une entrée
d'historique à l'ouverture, et fermer sur `popstate`. Vérifier d'abord si la
bibliothèque retenue le gère déjà, et que cela ne gêne pas React Router.

### Liste (`src/components/EntryList.tsx`)

Si la note a des photos, afficher une icône `Image` (lucide-react) suivie du
nombre, à côté de la date, avec par exemple `aria-label="3 photos"`. Charger
les comptes dans le store en même temps que les notes, avec une seule
transaction, sans requête par carte.

## Export et import (`src/lib/backup.ts`, `src/components/Settings.tsx`)

### Format du ZIP

```
notechamp-backup-AAAA-MM-JJ.zip
├── notes.json
└── images/
    ├── <id>.jpg
    └── ...
```

`notes.json` reprend le format actuel, avec deux ajouts :

```json
{
  "format": 2,
  "entries": [ ... ],
  "images": [
    { "id": "...", "entryId": "...", "width": 1600, "height": 1200, "createdAt": "..." }
  ],
  "preferences": { "theme": "light" },
  "exportDate": "..."
}
```

Les vignettes ne sont pas exportées : elles sont recréées à l'import.

### Bibliothèque

Utiliser fflate en mode stockage, sans recompression (`level: 0`), car le JPEG
est déjà compressé. Consulter sa documentation via Context7 avant d'écrire le
code.

### Import

- Si le fichier est un `.zip`, lire `notes.json` puis les images.
- Si le fichier est un `.json`, c'est un ancien export sans photos : garder le
  comportement actuel.
- Valider à la frontière, en complément de `parseBackup` :
  - chaque image déclarée a un fichier présent dans le ZIP ;
  - son `entryId` existe parmi les notes ;
  - ses identifiants sont uniques.
  En cas d'erreur, afficher un message en français et ne rien modifier.
- `restoreBackup` vide et remplit `journal_entries`, `images` et
  `preferences` dans une seule transaction, comme aujourd'hui. Les vignettes
  sont calculées avant d'ouvrir la transaction, car une transaction IndexedDB
  se ferme si on attend autre chose qu'une requête.
- Accepter `.zip` et `.json` dans l'`input` d'import.

## Étapes de réalisation

Chaque étape suit le même cycle : tests d'abord, puis lint, `tsc` et build en
vérifiant les vrais codes de sortie. L'utilisateur teste dans le navigateur
puis demande le commit.

1. **Stockage**
   - Migration en version 2.
   - Fonctions d'ajout, de lecture par note, de suppression d'une photo et de
     suppression en cascade avec la note.
   - Prise en compte des photos dans `isBlank`.
   - Tests à écrire :
     - la migration de la version 1 vers la 2 conserve les notes ;
     - les photos sont lues dans l'ordre d'ajout ;
     - la suppression d'une note supprime ses photos ;
     - une note sans texte mais avec des photos n'est pas supprimée.
2. **Traitement d'image**
   - `src/lib/images.ts` : redimensionnement, vignette et rejet des fichiers
     invalides.
   - jsdom n'implémente ni canvas ni `createImageBitmap` : tester la logique
     de calcul des dimensions (fonction pure), et vérifier le reste dans le
     navigateur.
3. **Éditeur**
   - Ajout, bande de vignettes, croix avec confirmation.
   - Tests : la photo ajoutée apparaît, la suppression confirmée la retire,
     et les libellés accessibles sont présents.
4. **Visionneuse**
   - Intégration de la bibliothèque et gestion du bouton retour.
   - Vérification manuelle sur mobile (Android en particulier).
5. **Liste**
   - Icône avec le nombre de photos.
   - Test : le nombre s'affiche, et l'icône est absente sans photo.
6. **Export et import ZIP**
   - Tests à écrire :
     - aller-retour export puis import, avec les données identiques ;
     - un ancien `.json` est encore accepté ;
     - un ZIP incohérent est rejeté sans modifier la base.
   - Vérification manuelle avec un volume réaliste (plusieurs centaines de
     photos).

## Points de vigilance

- Mettre à jour `CLAUDE.md` si de nouvelles commandes ou règles apparaissent.
- Le service worker n'a rien à mettre en cache pour les photos : elles sont
  dans IndexedDB.
- Surveiller l'espace utilisé. `navigator.storage.estimate()` pourrait plus
  tard s'afficher dans les paramètres. Cette fonction est hors périmètre pour
  l'instant.
