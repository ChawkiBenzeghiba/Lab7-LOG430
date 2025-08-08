#!/bin/bash

echo "=== Test d'initialisation des données ==="
echo ""

# Attendre que les services soient prêts
echo "Attente du démarrage des services..."
sleep 10

echo "1. Vérification des produits créés..."
curl -s http://localhost:3000/api/produits | jq '.data | length' 2>/dev/null || echo "Erreur lors de la récupération des produits"

echo "2. Vérification du stock central..."
curl -s http://localhost:3000/api/stock/stock-central | jq '.inventaire' 2>/dev/null || echo "Erreur lors de la récupération du stock"

echo "3. Test d'ajout au panier..."
echo "Ajout d'un iPhone 15 Pro au panier..."
curl -X POST http://localhost:3000/api/panier/client/1/ajouter \
  -H "Content-Type: application/json" \
  -d '{
    "produitId": 1,
    "quantite": 2,
    "prixUnitaire": 1199.99
  }' 2>/dev/null | jq '.' || echo "Erreur lors de l'ajout au panier"

echo "4. Vérification du stock après ajout au panier..."
curl -s http://localhost:3000/api/stock/stock-central | jq '.inventaire["1"]' 2>/dev/null || echo "Erreur lors de la récupération du stock"

echo "5. Vérification du panier..."
curl -s http://localhost:3000/api/panier/client/1 | jq '.' 2>/dev/null || echo "Erreur lors de la récupération du panier"

echo ""
echo "=== Test terminé ===" 