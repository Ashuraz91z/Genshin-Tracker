# Journal des changements

Format libre, du plus récent au plus ancien. Le détail des versions antérieures est dans [docs/HISTORIQUE.md](docs/HISTORIQUE.md).

## Kamera 0.9.0 · site 0.9.0 (28/11/2026)

### Kamera
- **Journal de quêtes** : nouvelle case **Quêtes** dans « Préparer le scan », cochable seule (pas besoin d'un scan complet). Kamera ouvre le journal (J), passe tout de suite l'onglet qui mélange tout, puis lit **chaque onglet de catégorie** (touche E, 4 au plus) : il remonte en haut de la liste, la lit en entier en la faisant défiler, et s'arrête en retombant sur un onglet déjà lu. Les quêtes présentes dans plusieurs onglets sont fusionnées. Zones calibrées sur une capture 1920×1080 en français, pas encore essayé dans le jeu.

### Site
- **Panneau « Journal de quêtes »** dans la vue d'ensemble : quêtes faisables maintenant (avec la distance) et quêtes bloquées (« Terminez d'abord les quêtes requises »), par type de quête et chapitre, avec un résumé dans la vue d'ensemble et une page **Quêtes** dans le menu (filtre Toutes / Faisables / Bloquées).
- Correction : erreur React « deux enfants avec la même clé » sur la page Inventaire (listes déroulantes).

## Kamera 1.0.0 · site 1.0.0 (27/11/2026)

### Kamera
- **Guide de démarrage** (français et anglais) : réglages de Genshin, de Kamera, compte, premier scan, avec une vidéo de démonstration, puis une **visite guidée** de l'écran Scan et des Options (zones assombries).
- **Profil et monnaies en direct** pendant le scan : pseudo, UID, moras, primogemmes, pierres de la destinée et de la fatalité, astéries et astrions libres.
- **Bandeau de fin de scan** : résumé, et liste des pièces à vérifier (artéfact, arme, matériau, personnage).
- **Signaler un bug** : prépare un rapport (version, réglages, journaux masquant pseudo, UID et noms du PC) et ouvre le formulaire GitHub.
- **Mise à jour** : Kamera indique quand une version plus récente est publiée (rien n'est installé automatiquement).
- **Se déconnecter** depuis « Mon compte ».
- Lecture des artéfacts fiabilisée : chiffres « 1 » lus comme des lettres, marqueur « (À activer) » tronqué, stat principale coupée (DÉF, PV), artéfacts 3★.
- Lecture des personnages : noms contenant un « q » (Xingqiu, Keqing), Voyageur conservé tel que lu (constellation et aptitudes).
- Lecture des quantités de matériaux : relecture de secours quand la première lecture est vide.
- Message clair pour les écrans ultra-larges (21:9).
- Les captures ne sont plus gardées par défaut ; seule la dernière archive est conservée.

### Site
- Aucune évolution fonctionnelle dans cette version (numéro aligné avec la release).
