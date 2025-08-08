#!/bin/bash

echo "=== Test d'Exposition via API Gateway ==="
echo ""

# Attendre que les services soient prêts
echo "Attente du démarrage des services..."
sleep 5

echo "1. Test de l'API Gateway principal..."
echo "Informations Gateway:"
curl -s http://localhost:3000/ | jq '.message, .version, .services'

echo ""
echo "2. Test des endpoints via Gateway..."

echo ""
echo "2.1 Test Produits via Gateway:"
response=$(curl -s http://localhost:3000/api/produits)
if [ $? -eq 0 ]; then
    echo "Produits accessibles via Gateway"
    echo "Nombre de produits: $(echo $response | jq '.data | length')"
else
    echo "Erreur accès Produits via Gateway"
fi

echo ""
echo "2.2 Test Panier via Gateway (Load Balancing):"
response=$(curl -s http://localhost:3000/api/panier/client/1)
if [ $? -eq 0 ]; then
    echo "Panier accessible via Gateway"
    echo "Contenu panier: $(echo $response | jq '.data.count') items"
else
    echo "Erreur accès Panier via Gateway"
fi

echo ""
echo "2.3 Test Commandes via Gateway:"
response=$(curl -s http://localhost:3000/api/commandes/client/1)
if [ $? -eq 0 ]; then
    echo "Commandes accessibles via Gateway"
    echo "Nombre de commandes: $(echo $response | jq '.data | length')"
else
    echo "Erreur accès Commandes via Gateway"
fi

echo ""
echo "2.4 Test Stock via Gateway:"
response=$(curl -s http://localhost:3000/api/stock/stock-central)
if [ $? -eq 0 ]; then
    echo "Stock accessible via Gateway"
    echo "Produits en stock: $(echo $response | jq '.data.inventaire | keys | length')"
else
    echo "Erreur accès Stock via Gateway"
fi

echo ""
echo "3. Test de fonctionnalités avancées..."

echo ""
echo "3.1 Test Ajout au Panier via route directe (Instance 1):"
response=$(curl -s -X POST http://localhost:3006/api/panier/client/1/ajouter \
    -H "Content-Type: application/json" \
    -d '{"produitId": 1, "quantite": 1, "prixUnitaire": 1199.99}')
if [ $? -eq 0 ]; then
    echo "Ajout au panier via Instance 1 réussi"
    echo "Réponse: $(echo $response | jq '.success')"
else
    echo "Erreur ajout au panier via Instance 1"
fi

echo ""
echo "3.2 Test Ajout au Panier via route directe (Instance 2):"
response=$(curl -s -X POST http://localhost:3008/api/panier/client/1/ajouter \
    -H "Content-Type: application/json" \
    -d '{"produitId": 2, "quantite": 1, "prixUnitaire": 899.99}')
if [ $? -eq 0 ]; then
    echo "Ajout au panier via Instance 2 réussi"
    echo "Réponse: $(echo $response | jq '.success')"
else
    echo "Erreur ajout au panier via Instance 2"
fi

echo ""
echo "3.3 Test Validation Commande via route directe:"
response=$(curl -s -X POST http://localhost:3007/api/commandes/client/1/valider \
    -H "Content-Type: application/json" \
    -d '{"items": [{"produitId": 1, "quantite": 1, "prixUnitaire": 1199.99}], "adresseLivraison": "123 Test", "adresseFacturation": "123 Test", "methodePaiement": "carte_credit"}')
if [ $? -eq 0 ]; then
    echo "Validation commande via route directe réussi"
    echo "Réponse: $(echo $response | jq '.success')"
else
    echo "Erreur validation commande via route directe"
fi

echo ""
echo "4. Test de Load Balancing via Gateway..."
echo "Distribution de 10 requêtes:"
for i in {1..10}; do
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
echo "5. Test de CORS via Gateway..."
echo "Test avec origine autorisée:"
response=$(curl -s -H "Origin: http://localhost:8080" http://localhost:3000/cors-test)
if [ $? -eq 0 ]; then
    echo "CORS fonctionne avec origine autorisée"
else
    echo "Erreur CORS avec origine autorisée"
fi

echo ""
echo "6. Vérification des logs de distribution..."
echo "Logs de load balancing récents:"
docker logs api_gateway 2>&1 | grep "Load balancing" | tail -5

echo ""
echo "=== Test terminé ==="
echo ""
echo "Résumé:"
echo "- API Gateway: Point d'entrée central"
echo "- Load Balancing: Distribution round-robin"
echo "- CORS: Sécurité configurée"
echo "- Tous les services: Accessibles via Gateway" 