const { createApp } = Vue;

// Configuration Axios pour les services directs
// Utilisation des noms des services Docker

const app = createApp({
  data() {
    return {
      currentPage: 'home',
      products: [],
      cartItems: [],
      orders: [],
      loading: false,
      searchQuery: '',
      productQuantities: {},
      clientId: 1 // Client par défaut pour la démo
    }
  },
  
  computed: {
    cartTotal() {
      return this.cartItems.reduce((total, item) => {
        return total + parseFloat(item.prixTotal);
      }, 0);
    }
  },
  
  mounted() {
    this.loadProducts();
    this.loadCart();
    this.loadOrders();
  },
  
  methods: {
    // Gestion des produits
    async loadProducts() {
      this.loading = true;
      try {
        const response = await axios.get('http://service-produits:3001/api/produits');
        this.products = response.data.data || [];
        this.products.forEach(product => {
          this.productQuantities[product.id] = 1;
        });
      } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async searchProducts() {
      if (this.searchQuery.trim()) {
        this.loading = true;
        try {
          const response = await axios.get(`http://service-produits:3001/api/produits/recherche?q=${encodeURIComponent(this.searchQuery)}`);
          this.products = response.data.data || [];
        } catch (error) {
          console.error('Erreur lors de la recherche:', error);
        } finally {
          this.loading = false;
        }
      } else {
        this.loadProducts();
      }
    },
    
    // Gestion des quantités
    increaseQuantity(productId) {
      if (this.productQuantities[productId] < 10) {
        this.productQuantities[productId]++;
      }
    },
    
    decreaseQuantity(productId) {
      if (this.productQuantities[productId] > 1) {
        this.productQuantities[productId]--;
      }
    },
    
    getProductQuantity(productId) {
      return this.productQuantities[productId] || 1;
    },
    
    // Gestion du panier
    async addToCart(product) {
      const quantity = this.getProductQuantity(product.id);

      try {
        const response = await axios.post(`http://service-panier:3006/api/panier/client/${this.clientId}/ajouter`, {
          produitId: product.id,
          quantite: quantity,
          prixUnitaire: parseFloat(product.prix)
        });
        
        if (response.data.success) {
          this.loadCart();
          this.showAlert('Produit ajouté au panier !', 'success');
        }
      } catch (error) {
        console.error('Erreur lors de l\'ajout au panier:', error);
        if (error.response && error.response.data && error.response.data.error) {
          this.showAlert(error.response.data.error, 'error');
        } else {
          this.showAlert('Erreur lors de l\'ajout au panier', 'error');
        }
      }
    },
    
    async loadCart() {
      try {
        const response = await axios.get(`http://service-panier:3006/api/panier/client/${this.clientId}`);
        this.cartItems = response.data.data.items || [];
      } catch (error) {
        console.error('Erreur lors du chargement du panier:', error);
      }
    },
    
    async updateCartQuantity(productId, newQuantity) {
      if (newQuantity <= 0) {
        await this.removeFromCart(productId);
        return;
      }
      
      try {
        const response = await axios.put(`http://service-panier:3006/api/panier/client/${this.clientId}/modifier`, {
          produitId: productId,
          quantite: newQuantity
        });
        
        if (response.data.success) {
          this.loadCart();
        }
      } catch (error) {
        console.error('Erreur lors de la modification de la quantité:', error);
      }
    },
    
    async removeFromCart(productId) {
      try {
        const response = await axios.delete(`http://service-panier:3006/api/panier/client/${this.clientId}/produit/${productId}`);
        if (response.data.success) {
          this.loadCart();
        }
      } catch (error) {
        console.error('Erreur lors de la suppression du produit:', error);
      }
    },
    
    // Gestion des commandes
    async checkout() {
      if (this.cartItems.length === 0) {
        this.showAlert('Votre panier est vide', 'error');
        return;
      }
      
      try {
        const items = this.cartItems.map(item => ({
          produitId: item.produitId,
          quantite: item.quantite,
          prixUnitaire: parseFloat(item.prixUnitaire)
        }));
        
        const response = await axios.post(`http://service-commandes:3007/api/commandes/client/${this.clientId}/valider`, {
          items: items,
          adresseLivraison: '123 Rue de la Démo, Montréal, QC',
          adresseFacturation: '123 Rue de la Démo, Montréal, QC',
          methodePaiement: 'carte_credit'
        });
        
        if (response.data.success) {
          this.showAlert('Commande validée avec succès !', 'success');
          this.loadOrders();
          this.loadCart(); // Le panier devrait être vidé
        }
      } catch (error) {
        console.error('Erreur lors de la validation de la commande:', error);
        this.showAlert('Erreur lors de la validation de la commande', 'error');
      }
    },
    
    async loadOrders() {
      this.loading = true;
      try {
        const response = await axios.get(`http://service-commandes:3007/api/commandes/client/${this.clientId}`);
        this.orders = response.data.data || [];
      } catch (error) {
        console.error('Erreur lors du chargement des commandes:', error);
      } finally {
        this.loading = false;
      }
    },
    
    // Utilitaires
    formatPrice(price) {
      return new Intl.NumberFormat('fr-CA', {
        style: 'currency',
        currency: 'CAD'
      }).format(price);
    },
    
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString('fr-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    showAlert(message, type) {
      // Créer une alerte temporaire
      const alertDiv = document.createElement('div');
      alertDiv.className = `alert alert-${type}`;
      alertDiv.textContent = message;
      
      const content = document.querySelector('.content');
      content.insertBefore(alertDiv, content.firstChild);
      
      setTimeout(() => {
        alertDiv.remove();
      }, 3000);
    }
  }
});

app.mount('#app'); 