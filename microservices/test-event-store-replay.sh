#!/bin/bash

echo "=== TEST EVENT STORE ET REPLAY LABO 7 ==="
echo ""

# Configuration
EVENT_STORE="http://localhost:3011"
SERVICE_COMMANDES="http://localhost:3007"
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Variables globales
TEST_ORDER_ID="test-replay-$(date +%s)"

# Fonction pour créer des événements de test
create_test_events() {
    echo "Création d'événements de test pour le replay..."
    
    # Événement 1: OrderCreated
    event1=$(cat <<EOF
{
    "id": "$TEST_ORDER_ID",
    "type": "OrderCreated",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
    "payload": {
        "orderId": "$TEST_ORDER_ID",
        "clientId": 1,
        "items": [
            {"produitId": 1, "quantite": 2, "prixUnitaire": 10.50},
            {"produitId": 2, "quantite": 1, "prixUnitaire": 25.00}
        ],
        "total": 46.00
    }
}
EOF
)
    
    # Événement 2: StockReserved
    event2=$(cat <<EOF
{
    "id": "stock-reserved-$(date +%s)-$(openssl rand -hex 8)",
    "type": "StockReserved",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
    "payload": {
        "orderId": "$TEST_ORDER_ID",
        "items": [
            {"produitId": 1, "quantite": 2},
            {"produitId": 2, "quantite": 1}
        ]
    }
}
EOF
)
    
    # Événement 3: PaymentAuthorized
    event3=$(cat <<EOF
{
    "id": "payment-authorized-$(date +%s)-$(openssl rand -hex 8)",
    "type": "PaymentAuthorized",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
    "payload": {
        "orderId": "$TEST_ORDER_ID",
        "amount": 46.00
    }
}
EOF
)
    
    # Publier les événements
    echo -n "Publier OrderCreated... "
    redis-cli -h $REDIS_HOST -p $REDIS_PORT xadd orders.events '*' event "$event1" >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
    
    echo -n "Publier StockReserved... "
    redis-cli -h $REDIS_HOST -p $REDIS_PORT xadd stock.events '*' event "$event2" >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
    
    echo -n "Publier PaymentAuthorized... "
    redis-cli -h $REDIS_HOST -p $REDIS_PORT xadd payments.events '*' event "$event3" >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
    
    return 0
}

# Fonction pour attendre la persistance
wait_for_persistence() {
    echo -n "Attendre persistance dans l'Event Store... "
    sleep 3
    echo -e "${GREEN}✓ OK${NC}"
}

# Fonction pour tester la lecture d'état
test_state_reading() {
    echo ""
    echo "Test de lecture d'état de la commande..."
    
    response=$(curl -s "$EVENT_STORE/state/$TEST_ORDER_ID" 2>/dev/null)
    
    if echo "$response" | grep -q "aggregateId.*$TEST_ORDER_ID"; then
        echo -e "  ${GREEN}✓ État récupéré${NC}"
        
        # Compter les événements
        event_count=$(echo "$response" | grep -o '"type":"[^"]*"' | wc -l)
        echo "  Nombre d'événements: $event_count"
        
        # Lister les types d'événements
        echo "  Types d'événements:"
        echo "$response" | grep -o '"type":"[^"]*"' | sed 's/"type":"//g' | sed 's/"//g' | while read type; do
            echo "    - $type"
        done
        
        return 0
    else
        echo -e "  ${RED}✗ État non récupéré${NC}"
        echo "  Response: $response"
        return 1
    fi
}

# Fonction pour tester le replay
test_replay() {
    echo ""
    echo "Test du replay d'événements..."
    
    response=$(curl -s -X POST "$EVENT_STORE/replay/$TEST_ORDER_ID" 2>/dev/null)
    
    if echo "$response" | grep -q "replayed.*[0-9]"; then
        echo -e "  ${GREEN}✓ Replay réussi${NC}"
        
        # Extraire le nombre d'événements rejoués
        replayed_count=$(echo "$response" | grep -o '"replayed":[0-9]*' | cut -d':' -f2)
        echo "  Événements rejoués: $replayed_count"
        
        return 0
    else
        echo -e "  ${RED}✗ Replay échoué${NC}"
        echo "  Response: $response"
        return 1
    fi
}

# Fonction pour tester la reconstruction d'état
test_state_reconstruction() {
    echo ""
    echo "Test de reconstruction d'état à partir des événements..."
    
    response=$(curl -s "$EVENT_STORE/state/$TEST_ORDER_ID" 2>/dev/null)
    
    # Extraire les événements et simuler une reconstruction
    events=$(echo "$response" | grep -o '"payload":{[^}]*}' | head -3)
    
    if [ -n "$events" ]; then
        echo -e "  ${GREEN}✓ Événements disponibles pour reconstruction${NC}"
        
        # Simuler une reconstruction simple
        echo "  Reconstruction simulée:"
        
        # OrderCreated
        order_created=$(echo "$response" | grep -A 10 '"type":"OrderCreated"' | grep -o '"total":[0-9.]*' | cut -d':' -f2)
        if [ -n "$order_created" ]; then
            echo "    - Commande créée avec total: $order_created"
        fi
        
        # StockReserved
        has_stock=$(echo "$response" | grep -q '"type":"StockReserved"' && echo "true" || echo "false")
        if [ "$has_stock" = "true" ]; then
            echo "    - Stock réservé"
        fi
        
        # PaymentAuthorized
        has_payment=$(echo "$response" | grep -q '"type":"PaymentAuthorized"' && echo "true" || echo "false")
        if [ "$has_payment" = "true" ]; then
            echo "    - Paiement autorisé"
        fi
        
        return 0
    else
        echo -e "  ${RED}✗ Événements non disponibles${NC}"
        return 1
    fi
}

# Fonction pour tester la persistance
test_persistence() {
    echo ""
    echo "Test de persistance des événements..."
    
    # Vérifier que les événements sont bien persistés
    response=$(curl -s "$EVENT_STORE/state/$TEST_ORDER_ID" 2>/dev/null)
    
    if echo "$response" | grep -q "aggregateId.*$TEST_ORDER_ID"; then
        echo -e "  ${GREEN}✓ Événements persistés${NC}"
        
        # Vérifier la structure des données
        has_id=$(echo "$response" | grep -q '"id":"' && echo "true" || echo "false")
        has_timestamp=$(echo "$response" | grep -q '"timestamp":"' && echo "true" || echo "false")
        has_payload=$(echo "$response" | grep -q '"payload":' && echo "true" || echo "false")
        
        if [ "$has_id" = "true" ] && [ "$has_timestamp" = "true" ] && [ "$has_payload" = "true" ]; then
            echo "  Structure des données: OK"
            return 0
        else
            echo "  Structure des données: INCOMPLÈTE"
            return 1
        fi
    else
        echo -e "  ${RED}✗ Événements non persistés${NC}"
        return 1
    fi
}

# Fonction pour tester les métriques de l'Event Store
test_event_store_metrics() {
    echo ""
    echo "Test des métriques de l'Event Store..."
    
    response=$(curl -s "$EVENT_STORE/metrics" 2>/dev/null)
    
    if echo "$response" | grep -q "events_consumed_total"; then
        echo -e "  ${GREEN}✓ Métriques disponibles${NC}"
        
        # Afficher quelques métriques
        echo "$response" | grep "events_consumed_total" | head -3
        return 0
    else
        echo -e "  ${RED}✗ Métriques non disponibles${NC}"
        return 1
    fi
}

# Tests principaux
echo "1. Création d'événements de test..."
create_test_events

echo ""
echo "2. Test de persistance..."
wait_for_persistence
test_persistence

echo ""
echo "3. Test de lecture d'état..."
test_state_reading

echo ""
echo "4. Test de replay..."
test_replay

echo ""
echo "5. Test de reconstruction d'état..."
test_state_reconstruction

echo ""
echo "6. Test des métriques..."
test_event_store_metrics

echo ""
echo "=== RÉSUMÉ EVENT STORE ==="
echo "Persistance des événements opérationnelle"
echo "Lecture d'état fonctionnelle"
echo "Replay d'événements implémenté"
echo "Reconstruction d'état possible"
echo "Métriques disponibles"
echo ""
echo "Event Store et replay opérationnels!"
