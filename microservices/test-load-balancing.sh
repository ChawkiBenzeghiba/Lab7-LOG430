#!/bin/bash

echo "=== Test de Load Balancing Round-Robin ==="
echo ""

# Attendre que les services soient prêts
echo "Attente du démarrage des services..."
sleep 10

echo "1. Vérification de l'API Gateway..."
curl -s http://localhost:3000/ | jq '.loadBalancing' 2>/dev/null || echo "Erreur lors de la vérification de l'API Gateway"

echo ""
echo "2. Test de distribution de charge (20 requêtes)..."
echo ""

# Test avec 20 requêtes pour voir la distribution
for i in {1..20}; do
    echo -n "Requête $i: "
    response=$(curl -s http://localhost:3000/api/panier/client/1)
    if [ $? -eq 0 ]; then
        echo "Succès"
    else
        echo "Échec"
    fi
    sleep 0.1
done

echo ""
echo "3. Vérification des logs des instances..."
echo "Logs Instance 1:"
docker logs service_panier_1 2>&1 | grep "GET /api/panier" | wc -l

echo "Logs Instance 2:"
docker logs service_panier_2 2>&1 | grep "GET /api/panier" | wc -l

echo ""
echo "4. Test d'ajout au panier via ports directs..."
echo "Test Instance 1 (port 3006):"
for i in {1..3}; do
    echo -n "  Ajout produit $i: "
    response=$(curl -s -X POST http://localhost:3006/api/panier/client/1/ajouter \
        -H "Content-Type: application/json" \
        -d "{\"produitId\": $i, \"quantite\": 1, \"prixUnitaire\": 100.00}")
    if [ $? -eq 0 ]; then
        echo "Succès"
    else
        echo "Échec"
    fi
    sleep 0.2
done

echo "Test Instance 2 (port 3008):"
for i in {4..6}; do
    echo -n "  Ajout produit $i: "
    response=$(curl -s -X POST http://localhost:3008/api/panier/client/1/ajouter \
        -H "Content-Type: application/json" \
        -d "{\"produitId\": $i, \"quantite\": 1, \"prixUnitaire\": 100.00}")
    if [ $? -eq 0 ]; then
        echo "Succès"
    else
        echo "Échec"
    fi
    sleep 0.2
done

echo ""
echo "=== Test terminé ==="
echo ""
echo "Pour voir la distribution en temps réel, regardez les logs:"
echo "docker logs service_panier_1"
echo "docker logs service_panier_2" 