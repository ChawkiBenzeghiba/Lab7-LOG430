<template>
  <div class="rapport-container">
    <h1>Rapport consolidé des ventes</h1>
    <button class="btn" @click="chargerRapport" :disabled="loading">
      {{ loading ? 'Chargement…' : 'Générer le rapport' }}
    </button>

    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="rapport" class="sections">

      <section class="card-section">
        <h2>Ventes par magasin</h2>
        <div class="cards">
          <div v-for="(produits, magasin) in rapport.ventesParMagasin" :key="magasin" class="card">
            <h3>{{ magasin }}</h3>
            <ul>
              <li v-for="(stats, produit) in produits":key="produit">
                {{ produit }}, {{ stats.quantite || 0 }} unités, {{ (stats.ca ?? 0).toFixed(2) }} $
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section class="card-section">
        <h2>Top 3 produits les plus vendus</h2>
        <ol>
          <li v-for="item in rapport.topVentes" :key="item.produit">
            {{ item.produit }} ({{ item.quantiteVendue }} unités)
          </li>
        </ol>
      </section>

      <section class="card-section">
        <h2>Stocks restants</h2>
        <ul class="stocks-list">
          <li v-for="(stock, produit) in rapport.stocksRestants" :key="produit">
            {{ produit }} &mdash; {{ stock }} en stock
          </li>
        </ul>
      </section>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const rapport = ref(null)
const loading = ref(false)
const error   = ref('')

async function chargerRapport() {
  loading.value = true
  error.value   = ''
  rapport.value = null
  try {
    const res = await fetch('/api/rapport?ts=' + Date.now(), { method: 'GET', cache: 'no-store' })
    if (!res.ok) throw new Error(`Code ${res.status}`)
    rapport.value = await res.json()
  } catch (err) {
    error.value = 'Erreur : ' + err.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.rapport-container {
  max-width: 800px;
  margin: 2em auto;
  padding: 0 1em;
  font-family: Arial, sans-serif;
}

h1 {
  text-align: center;
  margin-bottom: 1em;
}

.btn {
  display: block;
  margin: 0 auto 1.5em;
  padding: 0.5em 1em;
  font-size: 1em;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #c00;
  text-align: center;
  margin-bottom: 1em;
}

.sections {
  display: flex;
  flex-direction: column;
  gap: 2em;
}

.card-section h2 {
  border-bottom: 2px solid #ddd;
  padding-bottom: 0.3em;
  margin-bottom: 0.8em;
}

.cards {
  display: flex;
  flex-wrap: wrap;
  gap: 1em;
}

.card {
  flex: 1 1 200px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1em;
  background: #fafafa;
}

.card h3 {
  margin-top: 0;
}

.stocks-list {
  list-style: none;
  padding-left: 0;
}

.stocks-list li {
  padding: 0.3em 0;
  border-bottom: 1px solid #eee;
}

.stocks-list li:last-child {
  border-bottom: none;
}
</style>