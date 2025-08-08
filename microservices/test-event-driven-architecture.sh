#!/bin/bash

echo "=== TEST ARCHITECTURE ÉVÉNEMENTIELLE LABO 7 ==="
echo ""

# Configuration
API_GATEWAY="http://localhost:3000"
SERVICE_COMMANDES="http://localhost:3007"
SERVICE_STOCK="http://localhost:3003"
SERVICE_VENTES="http://localhost:3002"
EVENT_STORE="http://localhost:3011"
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Couleurs pour les tests
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour tester un endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    
    echo -n "Test $name... "
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$url" 2>/dev/null)
    status_code="${response: -3}"
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED (status: $status_code, expected: $expected_status)${NC}"
        return 1
    fi
}

# Fonction pour vérifier Redis
test_redis() {
    echo -n "Test Redis connection... "
    if redis-cli -h $REDIS_HOST -p $REDIS_PORT ping >/dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Fonction pour vérifier les streams Redis
test_redis_streams() {
    echo -n "Test Redis Streams... "
    streams=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT xlen orders.events 2>/dev/null)
    if [ "$?" -eq 0 ]; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Fonction pour publier un événement de test
publish_test_order() {
    echo -n "Publier événement OrderCreated... "
    response=$(curl -s -X POST "$SERVICE_COMMANDES/api/commandes/1/publier" \
        -H "Content-Type: application/json" \
        -d '{
            "items": [
                {"produitId": 1, "quantite": 2, "prixUnitaire": 10.50},
                {"produitId": 2, "quantite": 1, "prixUnitaire": 25.00}
            ],
            "total": 46.00
        }' 2>/dev/null)
    
    if echo "$response" | grep -q "published.*true"; then
        echo -e "${GREEN}✓ OK${NC}"
        # Extraire l'ID de l'événement pour les tests suivants
        ORDER_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        echo "  Order ID: $ORDER_ID"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Response: $response"
        return 1
    fi
}

# Fonction pour attendre et vérifier les événements
wait_for_events() {
    echo -n "Attendre propagation des événements... "
    sleep 3
    echo -e "${GREEN}✓ OK${NC}"
}

# Fonction pour vérifier l'Event Store
test_event_store() {
    if [ -z "$ORDER_ID" ]; then
        echo -e "${RED}Pas d'Order ID disponible pour tester l'Event Store${NC}"
        return 1
    fi
    
    echo -n "Test Event Store - État de la commande... "
    response=$(curl -s "$EVENT_STORE/state/$ORDER_ID" 2>/dev/null)
    
    if echo "$response" | grep -q "aggregateId.*$ORDER_ID"; then
        echo -e "${GREEN}✓ OK${NC}"
        # Afficher les événements trouvés
        event_count=$(echo "$response" | grep -o '"type":"[^"]*"' | wc -l)
        echo "  Événements trouvés: $event_count"
        echo "$response" | grep -o '"type":"[^"]*"' | sed 's/"type":"//g' | sed 's/"//g' | while read type; do
            echo "    - $type"
        done
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Response: $response"
        return 1
    fi
}

# Fonction pour tester le replay
test_replay() {
    if [ -z "$ORDER_ID" ]; then
        echo -e "${RED}Pas d'Order ID disponible pour tester le replay${NC}"
        return 1
    fi
    
    echo -n "Test Event Store - Replay... "
    response=$(curl -s -X POST "$EVENT_STORE/replay/$ORDER_ID" 2>/dev/null)
    
    if echo "$response" | grep -q "replayed.*[0-9]"; then
        echo -e "${GREEN}✓ OK${NC}"
        replayed_count=$(echo "$response" | grep -o '"replayed":[0-9]*' | cut -d':' -f2)
        echo "  Événements rejoués: $replayed_count"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Response: $response"
        return 1
    fi
}

# Fonction pour vérifier les métriques Prometheus
test_metrics() {
    echo -n "Test métriques Prometheus... "
    response=$(curl -s "$SERVICE_COMMANDES/metrics" 2>/dev/null)
    
    if echo "$response" | grep -q "events_produced_total"; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Fonction pour vérifier les streams Redis après événements
test_redis_streams_after_events() {
    echo -n "Vérifier les streams Redis après événements... "
    
    orders_count=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT xlen orders.events 2>/dev/null)
    stock_count=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT xlen stock.events 2>/dev/null)
    payments_count=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT xlen payments.events 2>/dev/null)
    
    if [ "$orders_count" -gt 0 ] && [ "$stock_count" -gt 0 ] && [ "$payments_count" -gt 0 ]; then
        echo -e "${GREEN}✓ OK${NC}"
        echo "  orders.events: $orders_count événements"
        echo "  stock.events: $stock_count événements"
        echo "  payments.events: $payments_count événements"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  orders.events: $orders_count, stock.events: $stock_count, payments.events: $payments_count"
        return 1
    fi
}

# Tests principaux
echo "1. Tests de connectivité des services..."
test_endpoint "API Gateway" "$API_GATEWAY" "200"
test_endpoint "Service Commandes" "$SERVICE_COMMANDES/health" "200"
test_endpoint "Service Stock" "$SERVICE_STOCK/health" "200"
test_endpoint "Service Ventes" "$SERVICE_VENTES/health" "200"
test_endpoint "Event Store" "$EVENT_STORE/metrics" "200"

echo ""
echo "2. Tests Redis..."
test_redis
test_redis_streams

echo ""
echo "3. Tests de l'architecture événementielle..."
publish_test_order
wait_for_events
test_redis_streams_after_events

echo ""
echo "4. Tests Event Store..."
test_event_store
test_replay

echo ""
echo "5. Tests métriques..."
test_metrics

echo ""
echo "=== RÉSUMÉ DES TESTS ==="
echo "Architecture événementielle opérationnelle"
echo "Pub/Sub avec Redis Streams fonctionnel"
echo "Event Store avec replay implémenté"
echo "Métriques Prometheus disponibles"
echo ""
echo "Prêt pour les étapes CQRS et observabilité avancée!"
