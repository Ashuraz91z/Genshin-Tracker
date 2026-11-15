# Cadrer la capture Windows pour Genshin

Document de travail — 15 novembre 2026. **Une application Windows reliée au site est une piste réalisable, mais la première version doit encore préciser ce que signifie « traquer les messages et les clics ».** Windows fournit des mécanismes de capture de fenêtre et d’observation de la souris ; leur existence ne prouve pas le bon fonctionnement avec le client Genshin actuel. La proposition est de commencer par une collecte locale, contrôlable et vérifiable, puis de synchroniser les données validées avec le site. Le référentiel du jeu peut avancer en parallèle. Aucun choix de technologie ni mode de clic automatique n’est arrêté. Aucun logiciel n’a été testé sur le jeu dans cette recherche.

## Le besoin confirmé relie le compte au site

Lucas souhaite une application Windows connectée à un site, avec la possibilité d’héberger les services nécessaires sur ses serveurs. Le produit final doit aider à comprendre la progression du compte et les améliorations à prioriser. Une seconde partie doit rassembler les données utiles : domaines, personnages, besoins en matériaux, équipements et builds, calendriers, résine et événements. Ces catégories décrivent le besoin ; leur exhaustivité et leur récupération automatique ne sont pas encore établies.

Trois interprétations restent ouvertes pour la première version : lire les écrans et naviguer automatiquement dans les menus ; observer les clics du joueur et les informations affichées ; ou suivre les messages du chat et les clics. **La réponse change le périmètre de collecte et doit précéder le choix définitif de la V1.**

## La capture locale fournit une première preuve mesurable

Windows.Graphics.Capture permet de capturer une fenêtre ou un écran sélectionné via l’interface système. Il faudra notamment gérer la prise en charge, les changements de taille et les paramètres HDR. Les événements souris peuvent être observés ; Microsoft recommande généralement Raw Input plutôt que les hooks bas niveau pour ce besoin. Un clic donne une position, mais pas l’identité de l’objet affiché : celle-ci doit être extraite de l’image. ([Capture Microsoft](https://learn.microsoft.com/en-us/windows/apps/develop/media-authoring-processing/screen-capture), [Entrées souris Microsoft](https://learn.microsoft.com/en-us/windows/win32/winmsg/lowlevelmouseproc))

**Proposition de prototype :** le joueur sélectionne Genshin, démarre la collecte, ouvre un écran d’inventaire et voit les champs reconnus par OCR dans le compagnon. Un premier écran d’artéfact peut servir de cas de test, sans réduire l’objectif global à cette catégorie. Les valeurs illisibles restent inconnues et peuvent être corrigées. Une capture conservée localement permet de vérifier l’extraction. C#/.NET constitue une option de compagnon Windows, à confirmer après ce test ; aucun serveur n’est nécessaire à cette première preuve.

Si l’observation des clics est retenue, elle devra être limitée aux périodes où Genshin est au premier plan, avec démarrage et arrêt explicites. La synchronisation proposée envoie les données structurées validées au site par HTTPS. Une vidéo continue, le clavier et le chat ne sont pas inclus par défaut. Le test est accepté lorsque les champs extraits peuvent être comparés à l’écran source, les erreurs corrigées, la collecte arrêtée et un envoi relancé sans créer de doublons. Les seuils de précision seront fixés sur un échantillon réel, plutôt qu’inventés maintenant.

## Les scanners existants évitent de tout reconstruire

Inventory Kamera documente déjà un relevé OCR de personnages, armes, artéfacts et matériaux, avec export JSON GOOD. Ses contraintes annoncées comprennent l’anglais, les ratios 16:9 ou 16:10 et l’absence de prise en charge HDR. Son scan automatique utilise souris et clavier. Tester un export existant est donc une proposition pour valider rapidement l’import côté site ; sa compatibilité actuelle reste à éprouver. Enka.Network décrit un accès aux personnages de la vitrine, ce qui ne démontre pas un accès à l’inventaire complet ou aux quêtes. ([Inventory Kamera](https://github.com/Andrewthe13th/Inventory_Kamera), [Enka.Network](https://enka.network/))

Produire des clics est un chantier distinct : SendInput est soumis aux niveaux d’intégrité Windows. Si cette navigation est choisie, chaque action devra être précédée d’une reconnaissance de l’écran, avec suspension à la perte de focus et arrêt immédiat. **Aucune garantie d’acceptabilité par l’anti-cheat n’est établie.** Les déclarations d’auteurs de scanners ne remplacent pas une position officielle. ([SendInput Microsoft](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendinput), [AdeptiScanner](https://github.com/D1firehail/AdeptiScanner-GI))

## Le référentiel sépare les faits des conseils

genshin-db fournit des données multilingues, dont le français, sur les personnages, talents, armes, artéfacts, matériaux et domaines. Son dépôt signale des évolutions de format entre versions. KQM publie ses propres guides de builds et d’équipes : ces recommandations doivent rester distinctes des caractéristiques du jeu et conserver leur contexte de version. Chaque intégration proposée gardera sa source, sa version et sa date de vérification. ([genshin-db](https://github.com/theBowja/genshin-db), [Guides KQM](https://keqingmains.com/))

Les rotations de récompenses, resets, réapparitions de ressources et échéances d’événements auront des règles séparées, liées au serveur et au fuseau. Pour les événements, une validation initiale des annonces officielles est proposée ; aucun flux officiel stable ni calendrier actuel n’a été confirmé. La couverture et les droits de réutilisation doivent être vérifiés avant une importation massive.

## Prochaine décision

Préciser « messages et clics », puis relever le Windows, la langue du jeu, la résolution, le HDR et le mode d’affichage du PC cible permettra de définir un test reproductible. Sa réussite déterminera les écrans suivants à couvrir et le choix d’interface. La progression restera explicitement partielle tant que toutes les catégories du compte n’auront pas été évaluées.

Non testé : capture, OCR, scanners et synchronisation sur le PC de jeu. Risques ouverts : erreurs de lecture, changements d’interface et compatibilité de l’automatisation avec le jeu.
