#!/bin/bash

echo "=== Test de Configuration CORS ==="
echo ""

# Attendre que les services soient prêts
echo "Attente du démarrage des services..."
sleep 5

echo "1. Test CORS basique..."
echo "Test depuis localhost:"
curl -s -H "Origin: http://localhost:8080" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS http://localhost:3000/cors-test

echo ""
echo "2. Test CORS avec requête GET..."
response=$(curl -s -H "Origin: http://localhost:8080" \
     -H "Content-Type: application/json" \
     http://localhost:3000/cors-test)
echo "Réponse: $response"

echo ""
echo "3. Test CORS avec requête depuis frontend Docker..."
response=$(curl -s -H "Origin: http://frontend-client:80" \
     -H "Content-Type: application/json" \
     http://localhost:3000/cors-test)
echo "Réponse: $response"

echo ""
echo "4. Test CORS avec origine non autorisée..."
response=$(curl -s -H "Origin: http://malicious-site.com" \
     -H "Content-Type: application/json" \
     http://localhost:3000/cors-test)
echo "Réponse: $response"

echo ""
echo "=== Test terminé ==="
echo ""
echo "Pour voir les logs CORS:"
echo "docker logs api_gateway | grep -i cors" 