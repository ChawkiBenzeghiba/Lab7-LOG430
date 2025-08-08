#!/bin/bash

echo "Test des services microservices"
echo "=================================="

# Attendre que les services démarrent
echo "Attente du démarrage des services..."
sleep 10

# Test du service Produits
echo ""
echo "Test du service Produits (port 3001)"
echo "----------------------------------------"
curl -s http://localhost:3001/health | jq . || echo "Service Produits non accessible"

# Test du service Clients
echo ""
echo "Test du service Clients (port 3005)"
echo "--------------------------------------"
curl -s http://localhost:3005/health | jq . || echo "Service Clients non accessible"

# Test de création d'un client
echo ""
echo "Test de création d'un client"
echo "-------------------------------"
curl -s -X POST http://localhost:3005/api/clients/register \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@example.com",
    "motDePasse": "password123",
    "telephone": "514-555-0123",
    "adresse": "123 Rue Principale",
    "ville": "Montréal",
    "codePostal": "H1A 1A1"
  }' | jq . || echo "Erreur lors de la création du client"

# Test de création d'un produit
echo ""
echo "Test de création d'un produit"
echo "--------------------------------"
curl -s -X POST http://localhost:3001/api/produits \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Ordinateur portable",
    "description": "Ordinateur portable haute performance",
    "prix": 999.99,
    "categorie": "Électronique",
    "codeProduit": "LAPTOP001"
  }' | jq . || echo "Erreur lors de la création du produit"

echo ""
echo "Tests terminés" 