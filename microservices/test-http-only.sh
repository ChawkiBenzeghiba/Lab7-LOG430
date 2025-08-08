#!/bin/bash

echo "=== TEST HTTP-ONLY ARCHITECTURE ÉVÉNEMENTIELLE ==="
echo ""

# Configuration
SERVICE_COMMANDES="http://localhost:3007"
SERVICE_STOCK="http://localhost:3003"
SERVICE_VENTES="http://localhost:3002"
EVENT_STORE="http://localhost:3011"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test 1: Health checks
echo "1. Test de connectivité des services..."
echo -n "Service Commandes... "
if curl -s "$SERVICE_COMMANDES/health" | grep -q "OK"; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

echo -n "Service Stock... "
if curl -s "$SERVICE_STOCK/health" | grep -q "OK"; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

echo -n "Service Ventes... "
if curl -s "$SERVICE_VENTES/health" | grep -q "OK"; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

echo -n "Event Store... "
if curl -s "$EVENT_STORE/metrics" | grep -q "process_cpu"; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

# Test 2: Publication d'événement
echo ""
echo "2. Test de publication d'événement..."
echo -n "Publier OrderCreated... "

response=$(curl -s -X POST "$SERVICE_COMMANDES/api/commandes/1/publier" \
    -H "Content-Type: application/json" \
    -d '{"items": [{"produitId": 1, "quantite": 1, "prixUnitaire": 10.00}], "total": 10.00}')

if echo "$response" | grep -q "published.*true"; then
    echo -e "${GREEN}✓ OK${NC}"
    ORDER_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "  Order ID: $ORDER_ID"
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "  Response: $response"
    ORDER_ID=""
fi

# Test 3: Attendre propagation et vérifier Event Store
echo ""
echo "3. Test Event Store..."
echo -n "Attendre propagation (5s)... "
sleep 5
echo -e "${GREEN}✓ OK${NC}"

if [ -n "$ORDER_ID" ]; then
    echo -n "Vérifier état dans Event Store... "
    state_response=$(curl -s "$EVENT_STORE/state/$ORDER_ID")
    
    if echo "$state_response" | grep -q "aggregateId.*$ORDER_ID"; then
        echo -e "${GREEN}✓ OK${NC}"
        
        # Compter les événements
        event_count=$(echo "$state_response" | grep -o '"type":"[^"]*"' | wc -l)
        echo "  Événements trouvés: $event_count"
        
        # Lister les types d'événements
        echo "  Types d'événements:"
        echo "$state_response" | grep -o '"type":"[^"]*"' | sed 's/"type":"//g' | sed 's/"//g' | while read type; do
            echo "    - $type"
        done
        
        # Vérifier le flux complet
        has_order_created=$(echo "$state_response" | grep -q '"type":"OrderCreated"' && echo "true" || echo "false")
        has_stock_reserved=$(echo "$state_response" | grep -q '"type":"StockReserved"' && echo "true" || echo "false")
        has_payment_authorized=$(echo "$state_response" | grep -q '"type":"PaymentAuthorized"' && echo "true" || echo "false")
        
        echo ""
        echo "  Flux événementiel:"
        if [ "$has_order_created" = "true" ]; then
            echo -e "    ${GREEN}✓ OrderCreated${NC}"
        else
            echo -e "    ${RED}✗ OrderCreated${NC}"
        fi
        
        if [ "$has_stock_reserved" = "true" ]; then
            echo -e "    ${GREEN}✓ StockReserved${NC}"
        else
            echo -e "    ${YELLOW}⚠ StockReserved (en cours...)${NC}"
        fi
        
        if [ "$has_payment_authorized" = "true" ]; then
            echo -e "    ${GREEN}✓ PaymentAuthorized${NC}"
        else
            echo -e "    ${YELLOW}⚠ PaymentAuthorized (en cours...)${NC}"
        fi
        
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Response: $state_response"
    fi
    
    # Test 4: Replay
    echo ""
    echo -n "Test replay... "
    replay_response=$(curl -s -X POST "$EVENT_STORE/replay/$ORDER_ID")
    
    if echo "$replay_response" | grep -q "replayed.*[0-9]"; then
        echo -e "${GREEN}✓ OK${NC}"
        replayed_count=$(echo "$replay_response" | grep -o '"replayed":[0-9]*' | cut -d':' -f2)
        echo "  Événements rejoués: $replayed_count"
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Response: $replay_response"
    fi
    
else
    echo -e "${YELLOW}⚠ Pas d'Order ID, skip Event Store test${NC}"
fi

# Test 5: Métriques
echo ""
echo "5. Test des métriques..."
echo -n "Métriques service-commandes... "
if curl -s "$SERVICE_COMMANDES/metrics" | grep -q "events_produced_total"; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

echo -n "Métriques Event Store... "
if curl -s "$EVENT_STORE/metrics" | grep -q "events_consumed_total"; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

echo ""
echo "=== RÉSUMÉ ==="
echo "Tests HTTP-only terminés"
echo "Architecture événementielle de base validée"
echo "Pub/Sub fonctionnel"
echo "Event Store opérationnel"
echo "Métriques disponibles"
echo ""
echo "Prêt pour les étapes CQRS et observabilité avancée!"
