#!/bin/bash

echo "=== Test de Charge - Comparaison Architectures ==="
echo ""

# Configuration
REQUESTS=100
CONCURRENT=10
OLD_ARCH_URL="http://localhost:3000"
NEW_ARCH_GATEWAY_URL="http://localhost:3000"
NEW_ARCH_DIRECT_URL="http://localhost:3006"

echo "Configuration:"
echo "- Nombre de requêtes: $REQUESTS"
echo "- Concurrence: $CONCURRENT"
echo "- Ancienne architecture: $OLD_ARCH_URL"
echo "- Nouvelle architecture (Gateway): $NEW_ARCH_GATEWAY_URL"
echo "- Nouvelle architecture (Direct): $NEW_ARCH_DIRECT_URL"
echo ""

# Fonction pour mesurer les performances
measure_performance() {
    local url=$1
    local name=$2
    local endpoint=$3
    
    echo "Test: $name"
    echo "URL: $url$endpoint"
    
    # Mesurer avec curl en parallèle
    start_time=$(date +%s.%N)
    
    # Créer un fichier temporaire avec les URLs
    temp_file=$(mktemp)
    for i in $(seq 1 $REQUESTS); do
        echo "$url$endpoint" >> $temp_file
    done
    
    # Exécuter les requêtes en parallèle
    parallel -j $CONCURRENT curl -s -o /dev/null -w "%{http_code}" {} < $temp_file > /tmp/responses_$name
    
    end_time=$(date +%s.%N)
    duration=$(echo "$end_time - $start_time" | bc)
    
    # Analyser les résultats
    success_count=$(grep -c "200" /tmp/responses_$name)
    error_count=$(($REQUESTS - $success_count))
    success_rate=$(echo "scale=2; $success_count * 100 / $REQUESTS" | bc)
    avg_time=$(echo "scale=3; $duration / $REQUESTS" | bc)
    
    echo "Résultats:"
    echo "- Durée totale: ${duration}s"
    echo "- Temps moyen par requête: ${avg_time}s"
    echo "- Requêtes réussies: $success_count/$REQUESTS"
    echo "- Taux de succès: ${success_rate}%"
    echo "- Erreurs: $error_count"
    echo ""
    
    # Sauvegarder les résultats
    echo "$name,$duration,$avg_time,$success_count,$error_count,$success_rate" >> /tmp/performance_results.csv
    
    # Nettoyer
    rm $temp_file
    rm /tmp/responses_$name
}

# Créer le fichier de résultats
echo "Architecture,Durée_Totale,Temps_Moyen,Succès,Erreurs,Taux_Succès" > /tmp/performance_results.csv

echo "1. Test Ancienne Architecture (Monolithique)..."
measure_performance "$OLD_ARCH_URL" "Monolithique" "/api/produits"

echo "2. Test Nouvelle Architecture via API Gateway..."
measure_performance "$NEW_ARCH_GATEWAY_URL" "Microservices_Gateway" "/api/produits"

echo "3. Test Nouvelle Architecture Direct..."
measure_performance "$NEW_ARCH_DIRECT_URL" "Microservices_Direct" "/api/produits"

echo "4. Test Load Balancing (Panier via Gateway)..."
measure_performance "$NEW_ARCH_GATEWAY_URL" "Load_Balancing_Gateway" "/api/panier/client/1"

echo "5. Test Load Balancing Direct (Instance 1)..."
measure_performance "$NEW_ARCH_DIRECT_URL" "Load_Balancing_Direct" "/api/panier/client/1"

echo "=== Résultats Comparatifs ==="
echo ""
cat /tmp/performance_results.csv | column -t -s ','

echo ""
echo "=== Analyse ==="
echo ""

# Analyser les résultats
echo "Comparaison des performances:"
echo ""

# Temps de réponse
echo "Temps de réponse moyen:"
grep "Monolithique" /tmp/performance_results.csv | cut -d',' -f3 | read monolith_time
grep "Microservices_Gateway" /tmp/performance_results.csv | cut -d',' -f3 | read gateway_time
grep "Microservices_Direct" /tmp/performance_results.csv | cut -d',' -f3 | read direct_time

echo "- Monolithique: ${monolith_time}s"
echo "- Microservices (Gateway): ${gateway_time}s"
echo "- Microservices (Direct): ${direct_time}s"

# Taux de succès
echo ""
echo "Taux de succès:"
grep "Monolithique" /tmp/performance_results.csv | cut -d',' -f6 | read monolith_success
grep "Microservices_Gateway" /tmp/performance_results.csv | cut -d',' -f6 | read gateway_success
grep "Microservices_Direct" /tmp/performance_results.csv | cut -d',' -f6 | read direct_success

echo "- Monolithique: ${monolith_success}%"
echo "- Microservices (Gateway): ${gateway_success}%"
echo "- Microservices (Direct): ${direct_success}%"

echo ""
echo "=== Recommandations ==="
echo ""

# Comparer les performances
if (( $(echo "$gateway_time > $monolith_time" | bc -l) )); then
    echo "L'API Gateway ajoute de la latence par rapport au monolithique"
else
    echo "L'API Gateway n'ajoute pas de latence significative"
fi

if (( $(echo "$direct_time < $gateway_time" | bc -l) )); then
    echo "L'accès direct est plus rapide que via l'API Gateway"
else
    echo "L'accès direct n'est pas plus rapide que via l'API Gateway"
fi

echo ""
echo "=== Métriques Prometheus ==="
echo "Accédez aux métriques:"
echo "- Prometheus: http://localhost:9090"
echo "- Grafana: http://localhost:3001 (admin/admin)"
echo ""

# Nettoyer
rm /tmp/performance_results.csv 