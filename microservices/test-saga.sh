#!/bin/bash

# Script de test pour la saga orchestrée
# Usage: ./test-saga.sh [scenario]
# Scénarios: success, stock-fail, payment-fail

set -e

# Configuration
API_GATEWAY_URL="http://localhost:3000"
ORCHESTRATEUR_URL="http://localhost:3010"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Fonction pour attendre que les services soient prêts
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    print_info "Attente du service $service_name..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url/health" > /dev/null 2>&1; then
            print_success "Service $service_name prêt!"
            return 0
        fi
        
        print_info "Tentative $attempt/$max_attempts - Service $service_name pas encore prêt..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "Service $service_name non disponible après $max_attempts tentatives"
    return 1
}

# Fonction pour créer une commande de test
create_test_commande() {
    local scenario=$1
    
    # Données de base pour la commande
    local commande_data='{
        "commandeId": "'$(uuidgen)'",
        "produits": [
            {
                "produitId": "1",
                "quantite": 2
            },
            {
                "produitId": "2", 
                "quantite": 1
            }
        ],
        "montant": 150.00,
        "methodePaiement": "carte",
        "clientId": "1"
    }'
    
    # Modifier les données selon le scénario
    case $scenario in
        "stock-fail")
            # Produit avec stock insuffisant
            commande_data='{
                "commandeId": "'$(uuidgen)'",
                "produits": [
                    {
                        "produitId": "999",
                        "quantite": 1000
                    }
                ],
                "montant": 5000.00,
                "methodePaiement": "carte",
                "clientId": "1"
            }'
            ;;
        "payment-fail")
            # Montant élevé pour augmenter les chances d'échec de paiement
            commande_data='{
                "commandeId": "'$(uuidgen)'",
                "produits": [
                    {
                        "produitId": "1",
                        "quantite": 1
                    }
                ],
                "montant": 9999.99,
                "methodePaiement": "carte",
                "clientId": "1"
            }'
            ;;
    esac
    
    echo "$commande_data"
}

# Fonction pour tester un scénario
test_scenario() {
    local scenario=$1
    local commande_data=$(create_test_commande "$scenario")
    
    print_info "=== Test du scénario: $scenario ==="
    print_info "Données de commande: $commande_data"
    
    # Démarrer la saga
    print_info "Démarrage de la saga..."
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$commande_data" \
        "$ORCHESTRATEUR_URL/api/saga/commande")
    
    print_info "Réponse de l'orchestrateur: $response"
    
    # Extraire l'ID de la saga
    local saga_id=$(echo "$response" | grep -o '"sagaId":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$saga_id" ]; then
        print_error "Impossible d'extraire l'ID de la saga"
        return 1
    fi
    
    print_info "ID de la saga: $saga_id"
    
    # Attendre un peu pour que la saga se termine
    print_info "Attente de la fin de la saga..."
    sleep 5
    
    # Récupérer le statut de la saga
    print_info "Récupération du statut de la saga..."
    local saga_status=$(curl -s "$ORCHESTRATEUR_URL/api/saga/$saga_id")
    
    print_info "Statut de la saga: $saga_status"
    
    # Vérifier le résultat selon le scénario
    case $scenario in
        "success")
            if echo "$saga_status" | grep -q '"etat":"CONFIRMEE"'; then
                print_success "Scénario SUCCESS: Saga confirmée avec succès!"
            else
                print_error "Scénario SUCCESS: Saga non confirmée"
                return 1
            fi
            ;;
        "stock-fail")
            if echo "$saga_status" | grep -q '"etat":"ANNULEE"'; then
                print_success "Scénario STOCK-FAIL: Saga annulée correctement!"
            else
                print_error "Scénario STOCK-FAIL: Saga non annulée"
                return 1
            fi
            ;;
        "payment-fail")
            if echo "$saga_status" | grep -q '"etat":"ANNULEE"'; then
                print_success "Scénario PAYMENT-FAIL: Saga annulée correctement!"
            else
                print_error "Scénario PAYMENT-FAIL: Saga non annulée"
                return 1
            fi
            ;;
    esac
    
    return 0
}

# Fonction pour afficher les statistiques
show_statistics() {
    print_info "=== Statistiques des sagas ==="
    
    local stats=$(curl -s "$ORCHESTRATEUR_URL/api/saga/stats/statistiques")
    print_info "Statistiques: $stats"
    
    local recent=$(curl -s "$ORCHESTRATEUR_URL/api/saga/stats/recentes?limit=5")
    print_info "Sagas récentes: $recent"
}

# Fonction principale
main() {
    local scenario=${1:-"success"}
    
    print_info "Démarrage des tests de saga orchestrée"
    print_info "Scénario: $scenario"
    
    # Attendre que les services soient prêts
    wait_for_service "$API_GATEWAY_URL" "API Gateway" || exit 1
    wait_for_service "$ORCHESTRATEUR_URL" "Orchestrateur" || exit 1
    
    # Tester le scénario
    if test_scenario "$scenario"; then
        print_success "Test du scénario $scenario réussi!"
    else
        print_error "Test du scénario $scenario échoué!"
        exit 1
    fi
    
    # Afficher les statistiques
    show_statistics
    
    print_success "Tests terminés avec succès!"
}

# Vérifier les arguments
case "${1:-success}" in
    "success"|"stock-fail"|"payment-fail")
        main "$1"
        ;;
    *)
        print_error "Usage: $0 [success|stock-fail|payment-fail]"
        print_info "Scénarios disponibles:"
        print_info "  success     - Saga complète réussie"
        print_info "  stock-fail  - Échec de vérification du stock"
        print_info "  payment-fail - Échec de paiement"
        exit 1
        ;;
esac
