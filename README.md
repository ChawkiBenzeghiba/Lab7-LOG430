# Lab7-LOG430 – Architecture Événementielle et Saga Chorégraphiée

## 1. Brève description de l'application

Ce projet implémente une **architecture événementielle** complète avec **Event Sourcing**, **CQRS** et **Saga Chorégraphiée** pour un système e-commerce multi-services.

Il offre :
- **Architecture événementielle** avec producteurs/consommateurs d'événements
- **Event Store** avec fonctionnalité de replay et reconstruction d'état
- **CQRS** avec séparation Command/Query et projections
- **Saga Chorégraphiée** avec compensation automatique
- **Observabilité** complète avec Prometheus et Grafana

L'architecture est développée en **Node.js/Express**, utilise **Redis Streams** pour la messagerie, **PostgreSQL** pour la persistance, et s'exécute en **conteneurs Docker**.

---

## 2. Instructions d'exécution

### 2.1 Cloner le dépôt
```bash
git clone <votre-repo>
cd Lab7-LOG430-1
```

### 2.2 Lancer les services
```bash
cd microservices
docker-compose up --build
```

### 2.3 Vérifier le déploiement
```bash
# Vérifier que tous les services sont démarrés
docker-compose ps

# Vérifier la santé des services clés
curl http://localhost:3007/health  # Service Commandes
curl http://localhost:3011/metrics # Event Store
curl http://localhost:3000/health  # API Gateway
```

---

## 3. Structure du projet
```plaintext
.
├── microservices/                  # Architecture microservices
│   ├── service-produits/          # Service de gestion des produits
│   ├── service-clients/           # Service de gestion des clients
│   ├── service-panier/            # Service panier (2 instances)
│   ├── service-commandes/         # Service commandes + producteur d'événements
│   ├── service-stock/             # Service stock + consommateur d'événements
│   ├── service-ventes/            # Service ventes + consommateur d'événements
│   ├── service-orchestrateur/     # Saga orchestrée (alternative)
│   ├── service-event-store/       # Event Store + projections CQRS
│   ├── service-api-command/       # Service CQRS Command
│   ├── api-gateway/               # API Gateway avec load balancing
│   ├── frontend-client/           # Interface utilisateur
│   ├── grafana/                   # Dashboards Grafana
│   ├── prometheus.yml             # Configuration Prometheus
│   └── docker-compose.yml         # Orchestration complète
├── docs/                          # Documentation technique
│   └── UML/                       # Diagrammes UML
│       ├── diagramme_machine_etat.puml
│       └── diagramme_saga_chorégraphiée.puml
├── test-*.sh                      # Scripts de test automatisés
└── README.md                      # Documentation du laboratoire
```

---

## 4. Choix techniques

- **Architecture** : Microservices événementiels
- **Messagerie** : Redis Streams (Pub/Sub)
- **Event Store** : SQLite avec projections
- **CQRS** : Séparation Command/Query
- **Saga** : Chorégraphiée avec compensation
- **Observabilité** : Prometheus + Grafana
- **Conteneurisation** : Docker & Docker-Compose
- **Load Balancing** : Round-robin sur service panier

---

## 5. Tests et validation

### 5.1 Tests de l'architecture événementielle
```bash
cd microservices
./test-event-driven-architecture.sh
```

### 5.2 Tests CQRS
```bash
./test-cqrs.sh
```

### 5.3 Tests de la saga chorégraphiée
```bash
./test-saga-choregraphiee.sh
```

### 5.4 Tests de performance
```bash
./test-final-performance.sh
```

---

## 6. Simulation des cas de succès et d'échec

### 6.1 Cas de succès (flux heureux)
```bash
# Démarrer une commande avec montant < 5000
curl -X POST http://localhost:3007/api/commandes/1/publier \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"produitId": 1, "quantite": 2, "prixUnitaire": 15.00},
      {"produitId": 2, "quantite": 1, "prixUnitaire": 25.00}
    ],
    "total": 55.00
  }'
```

**Séquence attendue :** `OrderCreated` → `StockReserved` → `PaymentAuthorized` → `OrderConfirmed`

### 6.2 Cas d'échec (compensation automatique)
```bash
# Démarrer une commande avec montant >= 5000
curl -X POST http://localhost:3007/api/commandes/1/publier \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"produitId": 1, "quantite": 10, "prixUnitaire": 600.00}
    ],
    "total": 6000.00
  }'
```

**Séquence attendue :** `OrderCreated` → `StockReserved` → `PaymentFailed` → `OrderCancelled`

### 6.3 Simulation d'échec manuel
```bash
# Publier directement un événement d'échec
redis-cli -h localhost -p 6379 xadd payments.events '*' event '{
  "id": "payment-failed-test",
  "type": "PaymentFailed",
  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
  "payload": {"orderId": "test-order-id", "reason": "Test manuel"}
}'
```

---

## 7. Endpoints principaux

### 7.1 API Gateway (port 3000)
- `GET /api/produits` - Liste des produits
- `GET /api/clients` - Liste des clients
- `POST /api/panier/client/{clientId}/ajouter` - Ajouter au panier
- `GET /api/panier/client/{clientId}` - Consulter le panier
- `POST /api/commandes/client/{clientId}/valider` - Valider une commande

### 7.2 Event Store (port 3011)
- `GET /state/{aggregateId}` - Reconstituer l'état d'un agrégat
- `GET /api/queries/orders/{orderId}` - État d'une commande (CQRS Query)
- `GET /metrics` - Métriques Prometheus

### 7.3 CQRS Command (port 3012)
- `POST /api/commands/orders` - Créer une commande (CQRS Command)

### 7.4 Observabilité
- **Prometheus** : http://localhost:9090
- **Grafana** : http://localhost:3009 (admin/admin)
- **Frontend** : http://localhost:8080

---

## 8. Monitoring et métriques

### 8.1 Métriques disponibles
- Nombre d'événements émis/consommés par service
- Latence des événements (émission → consommation)
- Durée des sagas
- Taux de succès/échec des transactions
- Compensations exécutées

### 8.2 Dashboards Grafana
- **Saga Overview** : Vue d'ensemble des sagas
- **Event Flow** : Flux des événements
- **Service Health** : Santé des services

---

## 9. Architecture événementielle

### 9.1 Topics Redis Streams
- `orders.events` : Événements de commandes
- `stock.events` : Événements de stock
- `payments.events` : Événements de paiement

### 9.2 CQRS
- **Command Side** : `service-api-command` (port 3012)
- **Query Side** : `service-event-store` (port 3011)
- **Synchronisation** : Via événements Redis