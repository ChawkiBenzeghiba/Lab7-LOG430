#!/bin/bash

echo "Ajout de produits via l'API Gateway..."

# Produit 1
curl -X POST http://localhost:3000/api/produits \
  -H "Content-Type: application/json" \
  -d '{"nom": "Laptop Gaming Pro", "prix": 1899.99, "categorie": "Informatique"}'

echo -e "\n---"

# Produit 2
curl -X POST http://localhost:3000/api/produits \
  -H "Content-Type: application/json" \
  -d '{"nom": "Smartphone Pro", "prix": 899.99, "categorie": "Mobile"}'

echo -e "\n---"

# Produit 3
curl -X POST http://localhost:3000/api/produits \
  -H "Content-Type: application/json" \
  -d '{"nom": "Tablette Ultra", "prix": 599.99, "categorie": "Mobile"}'

echo -e "\n---"

# Produit 4
curl -X POST http://localhost:3000/api/produits \
  -H "Content-Type: application/json" \
  -d '{"nom": "Écran 4K", "prix": 399.99, "categorie": "Informatique"}'

echo -e "\n---"

# Produit 5
curl -X POST http://localhost:3000/api/produits \
  -H "Content-Type: application/json" \
  -d '{"nom": "Clavier Mécanique", "prix": 149.99, "categorie": "Accessoires"}'

echo -e "\nProduits ajoutés !" 