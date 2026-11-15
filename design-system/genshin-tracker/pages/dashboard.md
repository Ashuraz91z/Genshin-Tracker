# Genshin Tracker — dashboard et compagnon Windows

Les recommandations initiales gaming (showcase 3D) ne correspondent pas au suivi quotidien. La seconde recherche Pro Max « collection management dashboard » retient Flat Design pour les interfaces de collection. Les recommandations de landing page ne s'appliquent pas ici. Les choix suivants sont une direction éditoriale adaptée, et non une palette prétendument extraite du moteur.

- But : voir l'état réel du compte et synchroniser un scan en quelques actions.
- Fond #0b1120, surfaces #121c2e et #19253a, texte #edf2f7, secondaire #a6b3c6.
- Or #e7bf7c pour les actions et titres de collection ; menthe #7ed7bd pour la connexion.
- Titres : Georgia (univers d'aventure), interface : Segoe UI / system-ui.
- Sidebar stable, en-tête léger, panorama céleste, statistiques sobres, cartes de personnages illustrées.
- États de données vides explicites. Ne jamais confondre catalogue et personnages possédés.
- Contraste AA, focus visible, cibles de 44 px, états d'attente/erreur locaux, aucune animation obligatoire.
- Mobile : navigation horizontale, une colonne ; dialogue accessible, clavier et fermeture Échap.
- Windows : mêmes couleurs et hiérarchie, contrôles natifs conservés, vrais onglets, configuration et erreurs distinctes.

Migration 0.3 : mêmes tokens CSS et illustrations, composants React sous Next.js App Router ; navigation interne avec next/link, états React et dialogues natifs. Routes serveur pour l’API, sans injection HTML manuelle.

## Refonte du site — Liquid Glass (15 novembre 2026)

La direction du site évolue sur demande de Lucas : verre dépoli, fond diffus bleu/lavande/menthe, panneaux arrondis et police système Apple/Segoe UI. La recherche Pro Max ciblée `glassmorphism dashboard readable` confirme cette direction ; la proposition gaming 3D est écartée car elle ne sert pas la consultation d’inventaire. Le compagnon Windows garde sa présentation actuelle.

- Thèmes clair, sombre et automatique ; préférence locale appliquée avant hydratation via script avec nonce CSP. Option de réduction de transparence et respect du mouvement réduit.
- Dashboard : compteurs importés, répartition élémentaire, artéfacts 5 étoiles, armes équipées et nombre de sets présents. Aucune estimation de complétion du jeu.
- Personnages : nuances Pyro orange, Hydro bleu, Anémo turquoise, Électro violet, Cryo cyan, Géo ocre et Dendro vert ; libellé visible en complément de la couleur. Recherche, rareté, élément et tris.
- Inventaire : cartes d’objets illustrées, nom de pièce et de set, niveau/quantité, propriétaire, fiche de détails ; filtres combinables et affichage progressif par 60 objets.
- Images locales et chargement différé ; provenance dans `web/public/assets/SOURCES.md`. Pictogramme lorsque l’image manque ; rareté inconnue explicitement distinguée des objets 1 étoile.

### Équipements par personnage

Fiche personnage élargie : arme à gauche, cinq emplacements d’artéfacts à droite, une colonne sur mobile. Les cartes illustrées utilisent les mêmes raretés et noms que l’inventaire ; détails dépliables au clavier pour les sous-statistiques. Résumé de l’arme et du nombre d’emplacements identifiés directement sur les cartes personnages. Les associations proviennent uniquement de `location` : état « non identifié » si absent, tous les candidats et un avertissement en cas de plusieurs armes ou pièces pour un même emplacement. Les sets sont comptés comme pièces relevées, sans prétendre calculer des bonus actifs.

### Catalogue et équipes (0.5)

Les personnages s’ouvrent en pages complètes et l’inventaire affiche ses détails dans la page. Les vignettes d’équipement sont agrandies, sans petites capsules autour de chaque image. Le seul dialogue d’équipement est un formulaire de correction explicite : catalogue illustré, recherche, rareté/niveau, principale calculée et quatre sous-statistiques. Les corrections sont marquées « Saisie manuelle ».

Équipes : bibliothèque des compositions, résultat de rotation en tête, équipements visibles et hypothèses proches du bouton de simulation. La personnalisation du script gcsim est secondaire et repliée sous « avancé ». Aucun score de puissance présenté comme des dégâts : les données insuffisantes bloquent le calcul, les limitations du moteur restent affichées. Cinq entrées de navigation, mises en page adaptées aux petits écrans.
