# Exigences du scanner français

Cadrage du 15 novembre 2026, aucun développement engagé.

## Besoin exprimé

Lucas accepte de réutiliser Inventory Kamera comme base potentielle. Lors de ses essais antérieurs, certaines données manquaient ou étaient incorrectes : retour utilisateur, causes non identifiées. Le jeu doit rester en français. L'objectif reste de récupérer tout le compte utile au suivi global, sans limiter la vision au périmètre du scanner existant.

## Constat technique

Code public consulté au commit `01e08c0527149ef40083608f50f16a2963293285`.

- `InventoryKamera/scraping/GenshinProcesor.cs` : modèle Tesseract `genshin_fast_09_04_21`, dictionnaire de statistiques en anglais.
- `InventoryKamera/data/DatabaseManager.cs` : chargement de `TextMapEN.json`, génération de clés GOOD depuis les noms anglais.
- `InventoryKamera/scraping/CharacterScraper.cs` : zones de capture et parsing des noms/éléments à contrôler sur les écrans français.
- La documentation annonce personnages, armes, artéfacts et matériaux. Ce périmètre ne prouve pas la récupération des quêtes, succès, exploration ou événements.

Source : https://github.com/Andrewthe13th/Inventory_Kamera

## Adaptations proposées

1. Tester un OCR capable de lire les écrans français du jeu ; adapter accents, ponctuation, nombres, pourcentages et zones de texte.
2. Relier les noms français à des identifiants stables et aux clés d'export GOOD, sans fabriquer ces clés par simple traduction.
3. Adapter les libellés des statistiques, éléments, équipements et les validations de chaque catégorie.
4. Vérifier la navigation sur le PC cible ; distinguer écran non ouvert, objet ignoré par filtre et lecture échouée.
5. Réutiliser les mécanismes existants de journalisation, validation et nouvelle tentative ; compléter seulement les lacunes constatées.

## Exigences de fiabilité proposées

- Afficher catégories couvertes, non couvertes, terminées, interrompues et en erreur.
- Comparer les nombres d'objets relevés aux compteurs du jeu lorsqu'ils sont disponibles et comparables ; un compteur égal ne suffit pas à prouver l'exactitude.
- Signaler toute valeur inconnue ou ambiguë ; éviter les associations forcées au nom le plus proche.
- Pouvoir revoir la capture d'un échec, corriger et relancer les lectures concernées.
- Une interruption ou une synchronisation partielle ne doit pas effacer les données précédemment confirmées.
- Vérifier sur un échantillon français annoté puis un inventaire complet, avec contrôle des quantités et champs. Aucune précision chiffrée annoncée avant mesure.

## Exhaustivité

« Tout récupérer » reste l'objectif. Pour chaque catégorie, inventorier les champs, l'écran ou la source, la méthode de collecte et les limites. Les quêtes, succès et autres données de progression demanderont des collecteurs supplémentaires ou une saisie explicite si elles sont inaccessibles ; aucune couverture automatique totale n'est démontrée.

## Prochaine étape

Identifier les données manquantes dans les anciens essais et collecter des écrans français représentatifs sur le PC cible. Tester l'adaptation avant de retenir définitivement le fork Kamera. Aucun essai Windows ou Genshin effectué ; compatibilité et anti-cheat non établis.
