#!/bin/bash

echo "=== Test de Performance - Ancienne Architecture (Monolithique) ==="
echo ""

# Configuration
REQUESTS=50
CONCURRENT=5
BASE_URL="http://localhost:3000"

echo "Configuration:"
echo "- Nombre de requêtes: $REQUESTS"
echo "- Concurrence: $CONCURRENT"
echo "- URL de base: $BASE_URL"
echo ""

# Fonction pour mesurer les performances
measure_performance() {
    local endpoint=$1
    local name=$2
    
    echo "Test: $name"
    echo "Endpoint: $BASE_URL$endpoint"
    
    # Mesurer avec curl en parallèle
    start_time=$(date +%s.%N)
    
    # Créer un fichier temporaire avec les URLs
    temp_file=$(mktemp)
    for i in $(seq 1 $REQUESTS); do
        echo "$BASE_URL$endpoint" >> $temp_file
    done
    
    # Exécuter les requêtes en parallèle
    parallel -j $CONCURRENT curl -s -o /dev/null -w "%{http_code}" {} < $temp_file > /tmp/responses_$name 2>/dev/null
    
    end_time=$(date +%s.%N)
    duration=$(echo "$end_time - $start_time" | bc)
    
    # Analyser les résultats
    success_count=$(grep -c "200" /tmp/responses_$name 2>/dev/null || echo "0")
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
    echo "$name,$duration,$avg_time,$success_count,$error_count,$success_rate" >> /tmp/old_architecture_results.csv
    
    # Nettoyer
    rm $temp_file
    rm /tmp/responses_$name 2>/dev/null
}

# Créer le fichier de résultats
echo "Endpoint,Durée_Totale,Temps_Moyen,Succès,Erreurs,Taux_Succès" > /tmp/old_architecture_results.csv

echo "1. Test Stock Central..."
measure_performance "/api/stock-central" "Stock_Central"

echo "2. Test Magasins..."
measure_performance "/api/magasins" "Magasins"

echo "3. Test Rapport..."
measure_performance "/api/rapport" "Rapport"

echo "4. Test Produits d'un magasin..."
measure_performance "/api/1/produits" "Produits_Magasin"

echo "=== Résultats - Ancienne Architecture ==="
echo ""
cat /tmp/old_architecture_results.csv | column -t -s ','

echo ""
echo "=== Analyse ==="
echo ""

# Calculer les moyennes
total_requests=$(($REQUESTS * 4))
total_success=$(awk -F',' 'NR>1 {sum+=$4} END {print sum}' /tmp/old_architecture_results.csv)
total_errors=$(awk -F',' 'NR>1 {sum+=$5} END {print sum}' /tmp/old_architecture_results.csv)
avg_latency=$(awk -F',' 'NR>1 {sum+=$3} END {print sum/NR}' /tmp/old_architecture_results.csv)

echo "Résumé global:"
echo "- Total de requêtes: $total_requests"
echo "- Total de succès: $total_success"
echo "- Total d'erreurs: $total_errors"
echo "- Taux de succès global: $(echo "scale=2; $total_success * 100 / $total_requests" | bc)%"
echo "- Latence moyenne: ${avg_latency}s"

echo ""
echo "=== Métriques de base ==="
echo ""

# Test de latence simple
echo "Test de latence simple (5 requêtes):"
for i in {1..5}; do
    echo -n "Requête $i: "
    time curl -s $BASE_URL/api/stock-central > /dev/null 2>&1
done

echo ""
echo "=== Sauvegarde des résultats ==="
echo "Les résultats sont sauvegardés dans /tmp/old_architecture_results.csv"
echo "Vous pouvez les utiliser pour comparer avec la nouvelle architecture"

# Nettoyer
# rm /tmp/old_architecture_results.csv 