#!/bin/bash

echo "=== Test de Performance - Nouvelle Architecture (Microservices) ==="
echo ""

# Configuration
REQUESTS=50
CONCURRENT=5
GATEWAY_URL="http://localhost:3000"
DIRECT_URLS=(
    "http://localhost:3001"  # service-produits
    "http://localhost:3003"  # service-stock
    "http://localhost:3006"  # service-panier-1
    "http://localhost:3007"  # service-commandes
)

# Fonction pour mesurer les performances
measure_performance() {
    local endpoint=$1
    local service_name=$2
    local url=$3
    
    echo "Test $service_name..."
    echo "Endpoint: $endpoint"
    
    # Test de latence simple avec 5 requêtes
    echo "Test de latence (5 requêtes):"
    total_time=0
    success_count=0
    
    for i in {1..5}; do
        echo -n "  Requête $i: "
        start_time=$(date +%s.%N)
        response=$(curl -s -w "%{http_code}" "$url$endpoint" -o /dev/null)
        end_time=$(date +%s.%N)
        
        duration=$(echo "$end_time - $start_time" | bc -l)
        total_time=$(echo "$total_time + $duration" | bc -l)
        
        if [ "$response" = "200" ]; then
            echo "$(printf "%.3f" $duration)s - Succès"
            ((success_count++))
        else
            echo "$(printf "%.3f" $duration)s - Erreur (HTTP $response)"
        fi
    done
    
    avg_time=$(echo "scale=3; $total_time / 5" | bc -l)
    success_rate=$(echo "scale=1; $success_count * 20" | bc -l)
    
    echo "Résultats $service_name:"
    echo "  Temps moyen: ${avg_time}s"
    echo "  Taux de succès: ${success_rate}%"
    echo ""
    
    # Sauvegarder les résultats
    echo "$service_name,$avg_time,$success_rate" >> /tmp/new_architecture_results.csv
}

# Créer le fichier de résultats
echo "Service,Temps_Moyen,Taux_Succès" > /tmp/new_architecture_results.csv

# Attendre que l'application soit prête
echo "Attente du démarrage de l'application..."
sleep 10

# Test 1: API Gateway - Info
echo "1. Test API Gateway - Info..."
measure_performance "/" "API_Gateway_Info" "$GATEWAY_URL"

# Test 2: API Gateway - Health
echo "2. Test API Gateway - Health..."
measure_performance "/health" "API_Gateway_Health" "$GATEWAY_URL"

# Test 3: Service Produits via Gateway
echo "3. Test Service Produits via Gateway..."
measure_performance "/api/produits" "Produits_Via_Gateway" "$GATEWAY_URL"

# Test 4: Service Stock via Gateway
echo "4. Test Service Stock via Gateway..."
measure_performance "/api/stock" "Stock_Via_Gateway" "$GATEWAY_URL"

# Test 5: Service Produits direct
echo "5. Test Service Produits direct..."
measure_performance "/api/produits" "Produits_Direct" "http://localhost:3001"

# Test 6: Service Stock direct
echo "6. Test Service Stock direct..."
measure_performance "/api/stock" "Stock_Direct" "http://localhost:3003"

# Test 7: Service Panier direct (Instance 1)
echo "7. Test Service Panier direct (Instance 1)..."
measure_performance "/api/panier/client/1" "Panier_Direct_1" "http://localhost:3006"

# Test 8: Service Commandes direct
echo "8. Test Service Commandes direct..."
measure_performance "/api/commandes" "Commandes_Direct" "http://localhost:3007"

echo "=== Résumé des Tests ==="
echo ""
echo "Résultats sauvegardés dans /tmp/new_architecture_results.csv"
echo ""
echo "Comparaison avec l'ancienne architecture:"
echo "Ancienne (Monolithique):"
echo "  - Stock Central: ~0.025s (25ms)"
echo "  - Magasins: ~0.019s (19ms)"
echo ""
echo "Nouvelle (Microservices):"
if [ -f /tmp/new_architecture_results.csv ]; then
    tail -n +2 /tmp/new_architecture_results.csv | while IFS=',' read -r service time success; do
        echo "  - $service: ${time}s (${success}% succès)"
    done
fi

echo ""
echo "Tests terminés !" 