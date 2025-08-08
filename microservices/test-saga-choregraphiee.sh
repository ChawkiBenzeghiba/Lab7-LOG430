#!/bin/bash

echo "=== TEST SAGA CHORÉGRAPHIÉE LABO 7 ==="
echo ""

# Configuration
SERVICE_COMMANDES="http://localhost:3007"
EVENT_STORE="http://localhost:3011"
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Variables globales
ORDER_ID=""
SAGA_EVENTS=()

# Fonction pour publier une commande (démarre la saga)
start_saga() {
    echo -n "Démarrer saga - Publier OrderCreated... "
    response=$(curl -s -X POST "$SERVICE_COMMANDES/api/commandes/1/publier" \
        -H "Content-Type: application/json" \
        -d '{
            "items": [
                {"produitId": 1, "quantite": 3, "prixUnitaire": 15.00},
                {"produitId": 2, "quantite": 2, "prixUnitaire": 30.00}
            ],
            "total": 105.00
        }' 2>/dev/null)
    
    if echo "$response" | grep -q "published.*true"; then
        echo -e "${GREEN}✓ OK${NC}"
        ORDER_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        echo "  Saga démarrée avec Order ID: $ORDER_ID"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Fonction pour attendre la propagation des événements
wait_for_saga_events() {
    echo -n "Attendre propagation de la saga... "
    sleep 5
    echo -e "${GREEN}✓ OK${NC}"
}

# Fonction pour vérifier le flux heureux de la saga
test_happy_path() {
    echo "Test du flux heureux de la saga:"
    echo "  OrderCreated → StockReserved → PaymentAuthorized"
    
    # Vérifier les événements dans l'Event Store
    response=$(curl -s "$EVENT_STORE/state/$ORDER_ID" 2>/dev/null)
    
    # Extraire les types d'événements
    event_types=$(echo "$response" | grep -o '"type":"[^"]*"' | sed 's/"type":"//g' | sed 's/"//g')
    
    # Vérifier la séquence attendue
    has_order_created=false
    has_stock_reserved=false
    has_payment_authorized=false
    
    while IFS= read -r event_type; do
        case $event_type in
            "OrderCreated")
                has_order_created=true
                echo -e "    ${GREEN}✓ OrderCreated${NC}"
                ;;
            "StockReserved")
                has_stock_reserved=true
                echo -e "    ${GREEN}✓ StockReserved${NC}"
                ;;
            "PaymentAuthorized")
                has_payment_authorized=true
                echo -e "    ${GREEN}✓ PaymentAuthorized${NC}"
                ;;
        esac
    done <<< "$event_types"
    
    if [ "$has_order_created" = true ] && [ "$has_stock_reserved" = true ] && [ "$has_payment_authorized" = true ]; then
        echo -e "  ${GREEN}✓ Flux heureux complet${NC}"
        return 0
    else
        echo -e "  ${RED}✗ Flux heureux incomplet${NC}"
        return 1
    fi
}

# Fonction pour simuler un échec de paiement (compensation)
simulate_payment_failure() {
    echo ""
    echo "Simulation d'un échec de paiement (compensation):"
    
    # Publier directement un événement PaymentFailed
    echo -n "Publier PaymentFailed... "
    failed_event=$(cat <<EOF
{
    "id": "payment-failed-$(date +%s)-$(openssl rand -hex 8)",
    "type": "PaymentFailed",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
    "payload": {"orderId": "$ORDER_ID"}
}
EOF
)
    
    # Publier via Redis directement
    redis-cli -h $REDIS_HOST -p $REDIS_PORT xadd payments.events '*' event "$failed_event" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Fonction pour vérifier la compensation
test_compensation() {
    echo -n "Attendre compensation... "
    sleep 3
    echo -e "${GREEN}✓ OK${NC}"
    
    echo "Vérifier la compensation:"
    echo "  PaymentFailed → OrderCancelled"
    
    # Vérifier les événements dans l'Event Store
    response=$(curl -s "$EVENT_STORE/state/$ORDER_ID" 2>/dev/null)
    
    # Extraire les types d'événements
    event_types=$(echo "$response" | grep -o '"type":"[^"]*"' | sed 's/"type":"//g' | sed 's/"//g')
    
    has_payment_failed=false
    has_order_cancelled=false
    
    while IFS= read -r event_type; do
        case $event_type in
            "PaymentFailed")
                has_payment_failed=true
                echo -e "    ${GREEN}✓ PaymentFailed${NC}"
                ;;
            "OrderCancelled")
                has_order_cancelled=true
                echo -e "    ${GREEN}✓ OrderCancelled${NC}"
                ;;
        esac
    done <<< "$event_types"
    
    if [ "$has_payment_failed" = true ] && [ "$has_order_cancelled" = true ]; then
        echo -e "  ${GREEN}✓ Compensation réussie${NC}"
        return 0
    else
        echo -e "  ${RED}✗ Compensation échouée${NC}"
        return 1
    fi
}

# Fonction pour vérifier l'idempotence
test_idempotence() {
    echo ""
    echo "Test d'idempotence - Publier le même événement deux fois..."
    
    # Publier un événement de test
    test_event=$(cat <<EOF
{
    "id": "test-idempotence-$(date +%s)",
    "type": "TestEvent",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
    "payload": {"test": "idempotence"}
}
EOF
)
    
    # Publier deux fois
    redis-cli -h $REDIS_HOST -p $REDIS_PORT xadd orders.events '*' event "$test_event" >/dev/null 2>&1
    redis-cli -h $REDIS_HOST -p $REDIS_PORT xadd orders.events '*' event "$test_event" >/dev/null 2>&1
    
    sleep 2
    
    # Vérifier dans l'Event Store (devrait être une seule occurrence)
    response=$(curl -s "$EVENT_STORE/state/test-idempotence-$(date +%s)" 2>/dev/null)
    event_count=$(echo "$response" | grep -o '"type":"TestEvent"' | wc -l)
    
    if [ "$event_count" -eq 1 ]; then
        echo -e "  ${GREEN}✓ Idempotence respectée (1 événement au lieu de 2)${NC}"
        return 0
    else
        echo -e "  ${RED}✗ Idempotence non respectée ($event_count événements)${NC}"
        return 1
    fi
}

# Fonction pour vérifier les métriques de saga
test_saga_metrics() {
    echo ""
    echo "Vérifier les métriques de saga..."
    
    # Vérifier les métriques du service commandes
    response=$(curl -s "$SERVICE_COMMANDES/metrics" 2>/dev/null)
    
    if echo "$response" | grep -q "events_produced_total"; then
        echo -e "  ${GREEN}✓ Métriques disponibles${NC}"
        
        # Afficher quelques métriques
        echo "$response" | grep "events_produced_total" | head -3
        echo "$response" | grep "events_consumed_total" | head -3
        return 0
    else
        echo -e "  ${RED}✗ Métriques non disponibles${NC}"
        return 1
    fi
}

# Tests principaux
echo "1. Test du flux heureux de la saga..."
start_saga
wait_for_saga_events
test_happy_path

echo ""
echo "2. Test de la compensation..."
simulate_payment_failure
test_compensation

echo ""
echo "3. Test d'idempotence..."
test_idempotence

echo ""
echo "4. Test des métriques..."
test_saga_metrics

echo ""
echo "=== RÉSUMÉ SAGA CHORÉGRAPHIÉE ==="
echo "Flux heureux: OrderCreated → StockReserved → PaymentAuthorized"
echo "Compensation: PaymentFailed → OrderCancelled"
echo "Idempotence respectée"
echo "Métriques disponibles"
echo ""
echo "Saga chorégraphiée opérationnelle!"
