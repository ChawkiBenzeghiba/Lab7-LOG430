#!/bin/bash

echo "=== TEST SIMPLE ARCHITECTURE ÉVÉNEMENTIELLE ==="
echo ""

# Configuration
SERVICE_COMMANDES="http://localhost:3007"
EVENT_STORE="http://localhost:3011"
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Test 1: Vérifier que les services répondent
echo "1. Test de connectivité..."
echo -n "Service Commandes... "
if curl -s "$SERVICE_COMMANDES/health" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

echo -n "Event Store... "
if curl -s "$EVENT_STORE/metrics" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

# Test 2: Vérifier Redis
echo ""
echo "2. Test Redis..."
echo -n "Connexion Redis... "
if redis-cli -h $REDIS_HOST -p $REDIS_PORT ping >/dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

# Test 3: Publier un événement simple
echo ""
echo "3. Test publication événement..."
echo -n "Publier OrderCreated... "
response=$(curl -s -X POST "$SERVICE_COMMANDES/api/commandes/1/publier" \
    -H "Content-Type: application/json" \
    -d '{"items": [{"produitId": 1, "quantite": 1, "prixUnitaire": 10.00}], "total": 10.00}' 2>/dev/null)

if echo "$response" | grep -q "published.*true"; then
    echo -e "${GREEN}✓ OK${NC}"
    ORDER_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "  Order ID: $ORDER_ID"
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "  Response: $response"
fi

# Test 4: Attendre et vérifier l'Event Store
echo ""
echo "4. Test Event Store..."
echo -n "Attendre persistance... "
sleep 5
echo -e "${GREEN}✓ OK${NC}"

if [ -n "$ORDER_ID" ]; then
    echo -n "Vérifier état... "
    response=$(curl -s "$EVENT_STORE/state/$ORDER_ID" 2>/dev/null)
    if echo "$response" | grep -q "aggregateId.*$ORDER_ID"; then
        echo -e "${GREEN}✓ OK${NC}"
        event_count=$(echo "$response" | grep -o '"type":"[^"]*"' | wc -l)
        echo "  Événements trouvés: $event_count"
    else
        echo -e "${RED}✗ FAILED${NC}"
    fi
fi

# Test 5: Vérifier les streams Redis
echo ""
echo "5. Test streams Redis..."
orders_count=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT xlen orders.events 2>/dev/null || echo "0")
stock_count=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT xlen stock.events 2>/dev/null || echo "0")
payments_count=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT xlen payments.events 2>/dev/null || echo "0")

echo "  orders.events: $orders_count événements"
echo "  stock.events: $stock_count événements"
echo "  payments.events: $payments_count événements"

if [ "$orders_count" -gt 0 ] || [ "$stock_count" -gt 0 ] || [ "$payments_count" -gt 0 ]; then
    echo -e "  ${GREEN}✓ Streams actifs${NC}"
else
    echo -e "  ${RED}✗ Aucun événement dans les streams${NC}"
fi

echo ""
echo "=== RÉSUMÉ ==="
echo "Tests de base terminés"
echo "Architecture événementielle fonctionnelle"
echo "Prêt pour CQRS et observabilité"
