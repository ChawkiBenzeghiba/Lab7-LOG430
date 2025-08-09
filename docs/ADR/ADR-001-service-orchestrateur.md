# ADR-001 — Introduction du Service Orchestrateur et Adaptations des Microservices

## Statut
Accepté

## Contexte
Dans le cadre du Labo 6, nous devons coordonner une transaction distribuée (création de commande) entre plusieurs microservices (Stock, Ventes, Commandes). L'architecture du Labo 5 ne prévoyait ni orchestration centrale, ni mécanismes de compensation, ni machine d'état persistée.

## Décision
Introduire un nouveau microservice `service-orchestrateur` (exposé via l'API Gateway) qui pilote de manière synchrone les étapes de la saga et persiste l'état. Adapter les microservices existants avec des endpoints dédiés à la saga:
- Stock: `POST /api/stock/verifier`, `POST /api/stock/reserver`, `POST /api/stock/liberer`
- Ventes: `POST /api/ventes/paiement`, `POST /api/ventes/annuler`
- Commandes: `PUT /api/commandes/:id/etat`

## Raisons
- Centraliser la logique de contrôle et simplifier le raisonnement sur les erreurs
- Permettre une machine d'état explicite et persistée pour les commandes
- Rendre les compensations explicites (libération de stock, annulation de paiement)
- Faciliter les tests automatisés (scénarios success/échecs) et l'observabilité (métriques)

## Conséquences
- Augmentation de la surface d'API et du couplage temporel (appels HTTP synchrones)
- Nouveau point de coordination (orchestrateur) à surveiller et mettre en haute dispo
- Nécessité d'une base de données dédiée au `service-orchestrateur`
- Besoin de métriques et de logs structurés pour diagnostiquer les échecs et compensations
