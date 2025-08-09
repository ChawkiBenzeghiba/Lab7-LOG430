
# Rapport ARC42 - Architecture Événementielle et Saga Chorégraphiée
**Évolution Lab6-7 – LOG430**

**Auteur :** Chawki Benzeghiba  
**Date :** Août 2025  
**Projet :** Architecture Événementielle avec Event Sourcing, CQRS et Saga Chorégraphiée – Labo 6,7 LOG430  
**GitHub Lab6:** https://github.com/ChawkiBenzeghiba/Lab6-LOG430  
**GitHub Lab7:** https://github.com/ChawkiBenzeghiba/Lab7-LOG430

---

## 1. Introduction et Objectifs

### 1.1 Contexte et portée

Ce document décrit l'implémentation d'une **architecture événementielle complète** avec **Event Sourcing**, **CQRS** et **Saga Chorégraphiée** pour un système e-commerce multi-services.

L'architecture finale intègre :
- **Architecture événementielle** avec producteurs/consommateurs d'événements
- **Event Store** avec fonctionnalité de replay et reconstruction d'état
- **CQRS** avec séparation Command/Query et projections
- **Saga Chorégraphiée** avec compensation automatique
- **Observabilité** complète avec Prometheus et Grafana

### 1.2 Objectifs architecturaux

**Objectifs fonctionnels**
- **Architecture événementielle** : Décomposer le système en événements et producteurs/consommateurs
- **Event Store** : Stockage persistant de tous les événements avec replay
- **CQRS** : Séparation des responsabilités de commande et de lecture
- **Saga Chorégraphiée** : Gestion des transactions distribuées avec compensation
- **Observabilité** : Monitoring complet des événements et métriques

**Objectifs non-fonctionnels (attributs de qualité)**
- **Scalabilité** : Support de multiples instances et distribution de charge
- **Résilience** : Isolation des pannes et compensation automatique
- **Performance** : Optimisation via Event Store et projections
- **Maintenabilité** : Services indépendants et déploiement automatisé
- **Observabilité** : Monitoring complet avec métriques, logs et alertes

### 1.3 Parties prenantes

| Rôle | Responsabilités | Enjeux principaux |
|------|----------------|-------------------|
| **Architecte** | Conception de l'architecture événementielle | Scalabilité et performance |
| **Développeur** | Implémentation des microservices et événements | Maintenabilité et tests |
| **DevOps** | Déploiement et monitoring | Observabilité et résilience |
| **Utilisateur final** | Utilisation de l'interface web | Performance et disponibilité |

---

## 2. Contraintes

### 2.1 Contraintes techniques

- **Plate-forme** : Node.js v18
- **Framework** : Express pour tous les services
- **Messagerie** : Redis Streams (Pub/Sub)
- **Event Store** : SQLite avec projections
- **Base de données** : PostgreSQL (une par service)
- **Conteneurisation** : Docker & Docker Compose
- **CQRS** : Séparation Command/Query
- **Monitoring** : Prometheus & Grafana
- **Sécurité** : CORS, Helmet, validation des entrées

### 2.2 Contraintes organisationnelles

- **Architecture événementielle** : Tous les services doivent publier/consommer des événements
- **Event Store** : Stockage obligatoire de tous les événements
- **CQRS** : Séparation stricte Command/Query
- **Saga Chorégraphiée** : Compensation automatique en cas d'échec
- **Documentation obligatoire** : README, ARC42, UML et ADR
- **Déploiement reproductible** : un seul docker-compose up suffit

### 2.3 Contraintes d'évolution (Lab 6 → Lab 7)

**Éléments à conserver**
- Architecture microservices avec API Gateway (Lab 6)
- Services existants : Produits, Clients, Stock, Panier, Commandes, Ventes
- Base de données PostgreSQL par service
- Monitoring avec Prometheus et Grafana
- Tests automatisés et pipeline CI/CD

**Éléments à modifier**
- Communication : passer des appels HTTP directs aux événements Redis Streams
- Persistance : ajouter Event Store SQLite avec projections CQRS
- Architecture : intégrer Event Sourcing et CQRS
- Gestion des transactions : implémenter Saga Chorégraphiée

**Éléments à ajouter**
- Event Store : stockage et replay des événements
- CQRS : séparation Command/Query avec service-api-command
- Saga Chorégraphiée : gestion des transactions distribuées avec compensation
- Messagerie événementielle : Redis Streams pour Pub/Sub
- Projections : reconstruction d'état à partir des événements

---

## 3. Contexte

### 3.1 Contexte Métier

**Domaine** : E-commerce avec gestion de commandes, stock et paiements  
**Évolution** : Passage d'une architecture microservices à une architecture microservices événementielle  
**Enjeux** : Scalabilité, résilience et traçabilité pour supporter la croissance

### 3.2 Évolution des Labs

**Lab 2-5** – Architecture Microservices avec API Gateway
```
[ Frontend ] ↔ [ API Gateway ] ↔ [ Microservices ] ↔ [ PostgreSQL ]
```

**Lab 6 et 7** – Architecture Événementielle avec Event Sourcing et CQRS
```
[ Frontend ] ↔ [ API Gateway ] ↔ [ Microservices ] ↔ [ Redis Streams ] ↔ [ Event Store ]
                                    ↓
                              [ CQRS Command/Query ]
```

---

## 4. Stratégie de Solution

### 4.1 Architecture cible

**Microservices événementiels** : 8 services indépendants
- `service-produits` : Gestion des produits
- `service-clients` : Gestion des clients  
- `service-panier` : Gestion des paniers (2 instances)
- `service-commandes` : Gestion des commandes + producteur d'événements
- `service-stock` : Gestion du stock + consommateur d'événements
- `service-ventes` : Gestion des ventes + consommateur d'événements
- `service-event-store` : Event Store + projections CQRS
- `service-api-command` : Service CQRS Command

**Event Store** : SQLite avec projections et replay
**CQRS** : Séparation Command/Query avec synchronisation via événements
**Saga Chorégraphiée** : Gestion des transactions distribuées avec compensation
**Observabilité** : Prometheus pour les métriques, Grafana pour la visualisation

### 4.2 Approche Domain-Driven Design (DDD)

**Domaine Principal (Core Domain)** : Gestion des Commandes
- **Description** : cœur métier, traitement des commandes avec saga chorégraphiée
- **Contexte délimité** : Commandes
- **Langage Ubiquitaire** : `OrderCreated`, `StockReserved`, `PaymentAuthorized`, `OrderConfirmed`
- **Composants d'architecture** :
  - Service : `service-commandes`
  - Modèles : `Commande`, `CommandeItem`
  - Controller : `commandeController.js`

**Domaine Support (Supporting Domain)** : Gestion des Événements
- **Description** : gestion des événements et Event Store
- **Contexte délimité** : Événements
- **Langage Ubiquitaire** : `Event`, `Stream`, `Projection`, `Replay`
- **Composants d'architecture** :
  - Service : `service-event-store`
  - Modèles : `Event`, `Projection`
  - Controller : `eventStoreController.js`

**Domaine Support (Supporting Domain)** : CQRS
- **Description** : séparation Command/Query avec projections
- **Contexte délimité** : Commandes et Queries
- **Langage Ubiquitaire** : `Command`, `Query`, `Projection`, `ReadModel`
- **Composants d'architecture** :
  - Service : `service-api-command` (Command Side)
  - Service : `service-event-store` (Query Side)
  - Modèles : `Command`, `Query`, `ReadModel`

---

## 5. Vue Architecturale

### 5.1 Diagramme de machine d'état

Cette vue affiche la machine d'état implémentée dans le laboratoire 6.

**Emplacement dans le projet** : `docs/UML/diagramme_saga_chorégraphiée.puml`

### 5.2 Diagramme de séquence de la saga chorégraphié

Cette vue affiche la saga chorégraphié pour un scénario de processus de commande

---

## 6. Concepts Transversaux

### 6.1 Sécurité

**CORS configuré**
- L'API Gateway implémente une configuration CORS stricte pour contrôler les origines autorisées.

**Validation des entrées**
- Chaque microservice valide les données d'entrée avant traitement.

**Headers de sécurité**
- Utilisation de Helmet pour sécuriser les en-têtes HTTP.

**Protection contre l'injection SQL**
- Sequelize utilise des requêtes paramétrées dans tous les services.

### 6.2 Performance

**Load Balancing**
- Distribution de charge round-robin entre instances du service Panier.

**Connection Pooling**
- Configuration optimisée des pools de connexions PostgreSQL par service.

**Event Store optimisé**
- Stockage efficace des événements avec indexation.

**Compression**
- Réponses compressées pour réduire la latence réseau.

### 6.3 Observabilité

**Métriques Prometheus**
- Collecte de métriques de latence, throughput et erreurs pour tous les services.

**Dashboards Grafana**
- Visualisation en temps réel des performances et de la santé du système.

**Logging centralisé**
- Logs structurés pour tracer les événements à travers les microservices.

**Health checks**
- Endpoints de santé pour chaque service et l'API Gateway.

### 6.4 Résilience

**Isolation des pannes**
- Chaque microservice peut fonctionner indépendamment des autres.

**Saga Chorégraphiée**
- Gestion des transactions distribuées avec compensation automatique.

**Retry policies**
- Tentatives automatiques en cas d'échec de communication.

**Graceful degradation**
- Le système continue de fonctionner même si certains services sont indisponibles.

---

## 7. Tests

### 7.1 Tests de l'Architecture Événementielle

**Fichiers** : `test-event-driven-architecture.sh`  
**Exécution** : `./test-event-driven-architecture.sh`  
**Types** : Tests de publication/consommation d'événements  
**Résultats** : Validation du flux événementiel

### 7.2 Tests CQRS

**Fichiers** : `test-cqrs.sh`  
**Exécution** : `./test-cqrs.sh`  
**Types** : Tests de séparation Command/Query  
**Résultats** : Validation des projections et read models

### 7.3 Tests de la Saga Chorégraphiée

**Fichiers** : `test-saga-choregraphiee.sh`  
**Exécution** : `./test-saga-choregraphiee.sh`  
**Types** : Tests de flux heureux et compensation  
**Résultats** : Validation des transactions distribuées

### 7.4 Tests de Performance

**Fichiers** : `test-final-performance.sh`  
**Exécution** : `./test-final-performance.sh`  
**Types** : Tests de latence, throughput, load balancing  
**Résultats** : Comparaison des performances

---

## 8. Architectural Decision Records (ADR)

### ADR-001 — Introduction du Service Orchestrateur et Adaptations des Microservices

**Statut** : Accepté  
**Contexte** : Dans le cadre du Labo 6, nous devons coordonner une transaction distribuée (création de commande) entre plusieurs microservices (Stock, Ventes, Commandes). L'architecture du Labo 5 ne prévoyait ni orchestration centrale, ni mécanismes de compensation, ni machine d'état persistée.  
**Décision** : Introduire un nouveau microservice `service-orchestrateur` (exposé via l'API Gateway) qui pilote de manière synchrone les étapes de la saga et persiste l'état. Adapter les microservices existants avec des endpoints dédiés à la saga:
- Stock: `POST /api/stock/verifier`, `POST /api/stock/reserver`, `POST /api/stock/liberer`
- Ventes: `POST /api/ventes/paiement`, `POST /api/ventes/annuler`
- Commandes: `PUT /api/commandes/:id/etat`  
**Raisons** :
- Centraliser la logique de contrôle et simplifier le raisonnement sur les erreurs
- Permettre une machine d'état explicite et persistée pour les commandes
- Rendre les compensations explicites (libération de stock, annulation de paiement)
- Faciliter les tests automatisés (scénarios success/échecs) et l'observabilité (métriques)

**Conséquences** :
- Augmentation de la surface d'API et du couplage temporel (appels HTTP synchrones)
- Nouveau point de coordination (orchestrateur) à surveiller et mettre en haute dispo
- Nécessité d'une base de données dédiée au `service-orchestrateur`
- Besoin de métriques et de logs structurés pour diagnostiquer les échecs et compensations

### ADR-002 — Saga Orchestrée Synchrone

**Statut** : Accepté  
**Contexte** : La création de commande implique plusieurs services (Stock, Ventes, Commandes). Une partie du flux peut échouer partiellement (ex: paiement refusé) et nécessite une gestion d'état et de compensation pour garantir une cohérence finale.  
**Décision** : Mettre en place une Saga orchestrée synchrone avec un orchestrateur central dédié. L'orchestrateur enchaîne des appels HTTP synchrones, maintient la machine d'état de la commande et déclenche des actions de compensation en cas d'échec.  
**Raisons** :
- Contrôle centralisé du flot et des erreurs, plus simple à raisonner
- Tracing et observabilité facilités (logs, métriques Prometheus)
- Comportement déterministe (ordre d'exécution des étapes)
- Implémentation plus simple à livrer dans le cadre du labo

**Conséquences** :
- Couplage temporel aux temps de réponse des services (latence)
- Point de coordination unique à surveiller (orchestrateur)
- Nécessité d'implémenter des compensations explicites
- Évolutivité asynchrone limitée par rapport à une chorégraphie d'événements

---

## 9. Scénarios de Qualité

### Scénario 1 : Scalabilité – Ajout d'un nouveau consommateur d'événements

**Source** : DevOps de l'équipe  
**Stimulus** : Besoin d'ajouter un nouveau service qui consomme les événements existants  
**Artefact** : Architecture événementielle  
**Environnement** : Environnement de production  
**Réponse** :
1. Créer le nouveau service avec les consommateurs d'événements
2. Configurer les streams Redis pour les nouveaux événements
3. Déployer avec docker-compose
4. Vérifier la consommation d'événements

**Mesure de la réponse** : Le nouveau service doit être opérationnel en moins de 10 minutes.

### Scénario 2 : Résilience – Panne d'un service dans la saga

**Source** : Utilisateur final  
**Stimulus** : Le service Stock tombe en panne pendant une transaction  
**Artefact** : Saga Chorégraphiée  
**Environnement** : Environnement de production  
**Réponse** :
1. Les autres services continuent de fonctionner normalement
2. La saga détecte l'échec et déclenche la compensation
3. Les événements de compensation sont publiés
4. L'état est restauré automatiquement

**Mesure de la réponse** : La compensation doit être exécutée en moins de 30 secondes.

### Scénario 3 : Performance – Replay d'événements

**Source** : Architecte de l'équipe  
**Stimulus** : Besoin de reconstruire l'état d'un agrégat à partir des événements  
**Artefact** : Event Store  
**Environnement** : Environnement de test  
**Réponse** :
1. Récupérer tous les événements pour l'agrégat
2. Rejouer les événements dans l'ordre chronologique
3. Reconstruire l'état final
4. Retourner l'état reconstruit

**Mesure de la réponse** : La reconstruction d'état doit prendre moins de 5 secondes pour 1000 événements.

---

## 10. Risques et Dette Technique

### 10.1 Risques Techniques

**RISK-001 : Panne de l'orchestrateur central**
- **Description** : Le service-orchestrateur constitue un point de défaillance unique pour toutes les transactions distribuées.
- **Probabilité** : Moyenne
- **Impact** : Critique (arrêt complet des transactions de commande)
- **Stratégie de mitigation** : Déploiement de multiples instances avec load balancer et monitoring renforcé.

**RISK-002 : Latence des appels HTTP synchrones**
- **Description** : Les appels HTTP synchrones entre l'orchestrateur et les services peuvent introduire des timeouts et des latences élevées.
- **Probabilité** : Élevée
- **Impact** : Moyen (dégradation de l'expérience utilisateur)
- **Stratégie de mitigation** : Timeouts configurables, retry policies et circuit breakers.

**RISK-003 : Incohérence des états lors des compensations**
- **Description** : Les compensations peuvent échouer partiellement, laissant le système dans un état incohérent.
- **Probabilité** : Moyenne
- **Impact** : Élevé (données métier incohérentes)
- **Stratégie de mitigation** : Logs détaillés, monitoring des compensations et processus de réconciliation.

**RISK-004 : Surcharge de la base de données de l'orchestrateur**
- **Description** : La base de données de l'orchestrateur peut devenir un goulot d'étranglement avec l'augmentation du volume de transactions.
- **Probabilité** : Moyenne
- **Impact** : Élevé (ralentissement des transactions)
- **Stratégie de mitigation** : Optimisation des requêtes, indexation et monitoring des performances.

### 10.2 Dette Technique

**DEBT-001 : Absence de gestion des versions d'événements**
- **Description** : Pas de stratégie de versioning pour l'évolution du schéma des événements.
- **Urgence** : Moyenne
- **Effort estimé** : 1 semaine
- **Impact** : Difficulté d'évolution des événements sans casser la compatibilité.

**DEBT-002 : Manque de tests d'intégration end-to-end**
- **Description** : Tests d'intégration limités pour les scénarios complets de saga.
- **Urgence** : Élevée
- **Effort estimé** : 1 semaine
- **Impact** : Risque de régression lors des modifications de la saga.

**DEBT-003 : Absence de stratégie de rétention des événements**
- **Description** : Pas de politique de nettoyage et d'archivage des événements anciens.
- **Urgence** : Faible
- **Effort estimé** : 3 jours
- **Impact** : Croissance continue de la base de données Event Store.

**DEBT-004 : Monitoring des performances de l'Event Store**
- **Description** : Métriques limitées sur les performances de lecture/écriture de l'Event Store.
- **Urgence** : Moyenne
- **Effort estimé** : 4 jours
- **Impact** : Difficulté d'optimisation et de détection des goulots d'étranglement.

---

## 11. Glossaire

### Termes Métiers

| Terme | Signification |
|-------|---------------|
| **Event Sourcing** | Pattern où tous les changements d'état sont stockés comme une séquence d'événements |
| **CQRS** | Command Query Responsibility Segregation - séparation des responsabilités de commande et de lecture |
| **Saga Chorégraphiée** | Pattern pour gérer les transactions distribuées via événements |
| **Event Store** | Base de données spécialisée pour stocker les événements |
| **Projection** | Vue optimisée construite à partir des événements |
| **Replay** | Processus de relecture des événements pour reconstruire l'état |

### Termes Techniques

| Terme | Signification |
|-------|---------------|
| **Redis Streams** | Structure de données Redis pour la messagerie événementielle |
| **Node.js** | Runtime JavaScript côté serveur utilisé pour tous les microservices |
| **Express** | Framework web minimaliste sur Node.js |
| **Docker Compose** | Outil d'orchestration de conteneurs Docker |
| **Prometheus** | Système de monitoring et d'alerting |
| **Grafana** | Plateforme de visualisation des métriques |
| **SQLite** | Base de données légère utilisée pour l'Event Store |
| **Sequelize** | ORM JavaScript pour PostgreSQL |

---

## 12. Conclusion

Ce document retrace l'évolution d'une architecture microservices traditionnelle vers une architecture événementielle moderne avec saga orchestrée. L'implémentation du Lab7-LOG430 démontre la transition réussie d'un système basé sur des appels HTTP directs vers une architecture centrée sur l'orchestration centralisée des transactions distribuées. L'introduction du service-orchestrateur a permis de centraliser la logique de contrôle des sagas, simplifiant ainsi le raisonnement sur les erreurs et facilitant l'implémentation des compensations explicites. Cette approche offre une traçabilité complète des transactions, une observabilité renforcée grâce aux métriques Prometheus et aux dashboards Grafana, et une résilience améliorée grâce à la gestion automatique des compensations en cas d'échec. L'architecture finale constitue une base solide pour la croissance future du système e-commerce, combinant la flexibilité des microservices avec la robustesse des transactions distribuées orchestrées, tout en maintenant une excellente maintenabilité et une scalabilité adaptée aux besoins métier.

