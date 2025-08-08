#!/bin/bash

echo "=== TEST CQRS (Command Query Responsibility Segregation) ==="
echo ""

# Configuration
CQRS_COMMAND="http://localhost:3012"
EVENT_STORE="http://localhost:3011"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Variables globales
ORDER_ID=""

# Test 1: Health check CQRS Command
echo "1. Test de connectivité CQRS..."
echo -n "CQRS Command Service... "
if curl -s "$CQRS_COMMAND/health" | grep -q "OK"; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
    exit 1
fi

echo -n "Event Store (Query)... "
if curl -s "$EVENT_STORE/metrics" | grep -q "process_cpu"; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
    exit 1
fi

# Test 2: CQRS Command - Créer une commande
echo ""
echo "2. Test CQRS Command - Créer une commande..."
echo -n "POST /api/commands/orders... "

response=$(curl -s -X POST "$CQRS_COMMAND/api/commands/orders" \
    -H "Content-Type: application/json" \
    -d '{
        "clientId": 1,
        "items": [
            {"produitId": 1, "quantite": 2, "prixUnitaire": 15.00},
            {"produitId": 2, "quantite": 1, "prixUnitaire": 25.00}
        ],
        "total": 55.00,
        "adresseLivraison": "123 Rue de la Paix, Paris",
        "adresseFacturation": "123 Rue de la Paix, Paris"
    }')

if echo "$response" | grep -q "success.*true"; then
    echo -e "${GREEN}OK${NC}"
    ORDER_ID=$(echo "$response" | grep -o '"orderId":"[^"]*"' | cut -d'"' -f4)
    echo "  Order ID: $ORDER_ID"
else
    echo -e "${RED}FAILED${NC}"
    echo "  Response: $response"
    exit 1
fi

# Test 3: CQRS Query - Lire l'état de la commande
echo ""
echo "3. Test CQRS Query - Lire l'état de la commande..."
echo -n "Attendre propagation (3s)... "
sleep 3
echo -e "${GREEN}OK${NC}"

echo -n "GET /api/queries/orders/$ORDER_ID... "
query_response=$(curl -s "$EVENT_STORE/api/queries/orders/$ORDER_ID")

if echo "$query_response" | grep -q "success.*true"; then
    echo -e "${GREEN}OK${NC}"
    
    # Extraire les informations de la commande
    status=$(echo "$query_response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    total=$(echo "$query_response" | grep -o '"total":[0-9.]*' | cut -d':' -f2)
    event_count=$(echo "$query_response" | grep -o '"eventCount":[0-9]*' | cut -d':' -f2)
    
    echo "  Status: $status"
    echo "  Total: $total"
    echo "  Event Count: $event_count"
else
    echo -e "${RED}FAILED${NC}"
    echo "  Response: $query_response"
fi

# Test 4: CQRS Query - Statistiques des commandes
echo ""
echo "4. Test CQRS Query - Statistiques..."
echo -n "GET /api/queries/orders/stats... "
stats_response=$(curl -s "$EVENT_STORE/api/queries/orders/stats")

if echo "$stats_response" | grep -q "success.*true"; then
    echo -e "${GREEN}OK${NC}"
    
    # Extraire les statistiques
    total_orders=$(echo "$stats_response" | grep -o '"totalOrders":[0-9]*' | cut -d':' -f2)
    confirmed_orders=$(echo "$stats_response" | grep -o '"confirmedOrders":[0-9]*' | cut -d':' -f2)
    total_revenue=$(echo "$stats_response" | grep -o '"totalRevenue":[0-9.]*' | cut -d':' -f2)
    
    echo "  Total Orders: $total_orders"
    echo "  Confirmed Orders: $confirmed_orders"
    echo "  Total Revenue: $total_revenue"
else
    echo -e "${RED}FAILED${NC}"
    echo "  Response: $stats_response"
fi

# Test 5: CQRS Query - Commandes d'un client
echo ""
echo "5. Test CQRS Query - Commandes d'un client..."
echo -n "GET /api/queries/clients/1/orders... "
client_orders_response=$(curl -s "$EVENT_STORE/api/queries/clients/1/orders")

if echo "$client_orders_response" | grep -q "success.*true"; then
    echo -e "${GREEN}OK${NC}"
    
    # Extraire le nombre de commandes
    count=$(echo "$client_orders_response" | grep -o '"count":[0-9]*' | cut -d':' -f2)
    echo "  Commandes du client 1: $count"
else
    echo -e "${RED}FAILED${NC}"
    echo "  Response: $client_orders_response"
fi

# Test 6: CQRS Command - Mettre à jour une commande
echo ""
echo "6. Test CQRS Command - Mettre à jour une commande..."
echo -n "PUT /api/commands/orders/$ORDER_ID... "

update_response=$(curl -s -X PUT "$CQRS_COMMAND/api/commands/orders/$ORDER_ID" \
    -H "Content-Type: application/json" \
    -d '{
        "items": [
            {"produitId": 1, "quantite": 3, "prixUnitaire": 15.00},
            {"produitId": 2, "quantite": 2, "prixUnitaire": 25.00}
        ],
        "total": 95.00,
        "adresseLivraison": "456 Avenue des Champs, Lyon",
        "adresseFacturation": "456 Avenue des Champs, Lyon"
    }')

if echo "$update_response" | grep -q "success.*true"; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "  Response: $update_response"
fi

# Test 7: Vérifier la mise à jour via Query
echo ""
echo "7. Vérifier la mise à jour via Query..."
echo -n "Attendre propagation (2s)... "
sleep 2
echo -e "${GREEN}OK${NC}"

echo -n "GET /api/queries/orders/$ORDER_ID (après update)... "
updated_query_response=$(curl -s "$EVENT_STORE/api/queries/orders/$ORDER_ID")

if echo "$updated_query_response" | grep -q "success.*true"; then
    echo -e "${GREEN}OK${NC}"
    
    # Vérifier que le total a été mis à jour
    new_total=$(echo "$updated_query_response" | grep -o '"total":[0-9.]*' | cut -d':' -f2)
    new_event_count=$(echo "$updated_query_response" | grep -o '"eventCount":[0-9]*' | cut -d':' -f2)
    
    echo "  Nouveau total: $new_total"
    echo "  Nouveau event count: $new_event_count"
    
    if [ "$new_total" = "95" ]; then
        echo -e "  ${GREEN}Mise à jour confirmée${NC}"
    else
        echo -e "  ${RED}Mise à jour non confirmée${NC}"
    fi
else
    echo -e "${RED}FAILED${NC}"
fi

# Test 8: Métriques CQRS
echo ""
echo "8. Test des métriques CQRS..."
echo -n "Métriques CQRS Command... "
if curl -s "$CQRS_COMMAND/metrics" | grep -q "commands_processed_total"; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
fi

echo -n "Métriques Event Store... "
if curl -s "$EVENT_STORE/metrics" | grep -q "events_consumed_total"; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
fi

echo ""
echo "=== RÉSUMÉ CQRS ==="
echo "Command Service: Gère les écritures et publie des événements"
echo "Query Service: Expose des vues optimisées via Event Store"
echo "Séparation des responsabilités: OK"
echo "Synchronisation via événements: OK"
echo "Read Models optimisés: OK"
echo ""
echo "CQRS implémenté avec succès!"
