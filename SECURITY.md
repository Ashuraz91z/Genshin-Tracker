# Sécurité

## Signaler une vulnérabilité

Ne la publiez pas dans un ticket public. Écrivez à **contact@genshin-tracker.com** en décrivant le problème et comment le reproduire, ou utilisez « Report a vulnerability » dans l'onglet Security du dépôt si cette option est activée. Vous aurez une réponse dans un délai raisonnable ; il n'y a pas de programme de primes.

## Ce qui est concerné

- Le site (`web/`) : comptes, sessions, clés d'appareil, paiements, import des relevés.
- Le scanner Kamera (`InventoryKamera-FR/`) : stockage de la clé d'appareil (protégée par Windows), échanges avec le site, mises à jour.

## Ce que Kamera fait et ne fait pas

- Il lit l'écran par reconnaissance de texte et simule la souris et le clavier dans Genshin. Il ne lit pas la mémoire du jeu.
- Le mot de passe du tracker n'est jamais enregistré : seule une clé d'appareil, chiffrée avec votre session Windows, est conservée.
- Kamera interroge les releases publiques du dépôt au démarrage pour signaler une nouvelle version. Cette requête n'envoie aucune donnée personnelle et rien n'est installé automatiquement.
- Le rapport de bug masque votre pseudo, votre UID et les noms de votre PC, mais relisez-le avant de le joindre à un ticket public.
