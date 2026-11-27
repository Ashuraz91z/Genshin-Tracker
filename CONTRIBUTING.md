# Contribuer

Merci de votre intérêt. Le projet a deux parties, avec deux licences :

| Dossier | Contenu | Licence |
| --- | --- | --- |
| `web/` | Site genshin-tracker.com (Next.js, SQLite) | AGPL-3.0 |
| `InventoryKamera-FR/` | Scanner Windows Kamera FR, basé sur [Inventory Kamera](https://github.com/Andrewthe13th/Inventory_Kamera) | MIT (notice d'origine conservée) |

En contribuant, vous acceptez que votre code soit publié sous la licence du dossier concerné.

## Signaler un bug

Dans Kamera, utilisez **Signaler un bug** (menu latéral) : il prépare un ZIP avec la version, vos réglages et les journaux (pseudo, UID et noms du PC masqués) et ouvre le formulaire. Indiquez l'objet mal lu (nom de l'artéfact, de l'arme, du personnage).

## Proposer un changement

1. Ouvrez d'abord un ticket pour les changements importants.
2. Une branche par sujet, des commits courts et descriptifs.
3. Dites dans la PR **ce que vous avez vérifié** : tests lancés, essai réel dans Genshin ou « non testé en jeu ». Les tests automatisés ne remplacent pas un scan réel.

### Le site

```bash
cd web
npm ci
npm run build     # le test de production a besoin du build
npm test
```

### Le scanner

Il se compile sous Windows (.NET Framework 4.7.2, MSBuild). Le workflow « Scanner build » le compile à chaque envoi. Le parseur de lecture français a un test dans `tests/FrenchRecognition`.

Pour une correction de lecture (OCR), joignez la capture du texte mal lu quand c'est possible : un cas réel vaut mieux qu'une hypothèse.

## Règles à respecter

- **Aucune ressource du jeu** dans le dépôt : pas de captures du jeu, d'icônes, de modèles ou de textes extraits. Genshin Impact et ses visuels appartiennent à HoYoverse.
- **Aucun secret** : mots de passe, clés, e-mails, UID.
- Gardez les notices de licence et de provenance (`licenses/`, `UPSTREAM.md`).
- Le scanner automatise la navigation dans le jeu : ne proposez pas de fonctions qui lisent ou modifient la mémoire du jeu.
