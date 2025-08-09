# ADR-002 — Saga Orchestrée Synchrone

## Statut
Accepté

## Contexte
La création de commande implique plusieurs services (Stock, Ventes, Commandes). Une partie du flux peut échouer partiellement (ex: paiement refusé) et nécessite une gestion d'état et de compensation pour garantir une cohérence finale.

## Décision
Mettre en place une Saga orchestrée synchrone avec un orchestrateur central dédié. L'orchestrateur enchaîne des appels HTTP synchrones, maintient la machine d'état de la commande et déclenche des actions de compensation en cas d'échec.

## Raisons
- Contrôle centralisé du flot et des erreurs, plus simple à raisonner
- Tracing et observabilité facilités (logs, métriques Prometheus)
- Comportement déterministe (ordre d'exécution des étapes)
- Implémentation plus simple à livrer dans le cadre du labo

## Conséquences
- Couplage temporel aux temps de réponse des services (latence)
- Point de coordination unique à surveiller (orchestrateur)
- Nécessité d'implémenter des compensations explicites
- Évolutivité asynchrone limitée par rapport à une chorégraphie d'événements
