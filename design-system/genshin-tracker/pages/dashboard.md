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
