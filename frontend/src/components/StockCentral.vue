<template>
  <div class="stock-central">
    <h2>Stock Central</h2>

    <table v-if="stockList.length" class="stock-table">
      <thead>
        <tr>
          <th>Produit</th>
          <th>Quantité</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in stockList" :key="item.id">
          <td>{{ item.nom }}</td>
          <td>{{ item.quantite }}</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top:1em;">
      <button @click="prevPage" :disabled="page===1">Page précédente</button>
      <span>Page {{ page }} / {{ Math.ceil(total/pageSize) }}</span>
      <button @click="nextPage" :disabled="page*pageSize>=total">Page suivante</button>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const stockList  = ref([])
const total      = ref(0)
const page       = ref(1)
const pageSize   = ref(20)
const selProduit = ref('')
const reqQte     = ref(1)
const msg        = ref('')
const error      = ref('')

async function chargerStock() {
  msg.value = ''
  error.value = ''
  const offset = (page.value - 1) * pageSize.value
  try {
    const res = await fetch(`/api/stock-central?limit=${pageSize.value}&offset=${offset}&ts=` + Date.now(), {
      cache: 'no-store'
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    stockList.value = data.produits
    total.value = data.total
  } catch (err) {
    error.value = 'Erreur chargement stock : ' + err.message
  }
}

function nextPage() {
  if (page.value * pageSize.value < total.value) {
    page.value++;
    chargerStock();
  }
}
function prevPage() {
  if (page.value > 1) {
    page.value--;
    chargerStock();
  }
}

onMounted(chargerStock)
</script>

<style scoped>
.stock-central {
  max-width: 600px;
  margin: 2em auto;
  font-family: Arial, sans-serif;
}
.stock-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 2em;
}
.stock-table th,
.stock-table td {
  border: 1px solid #ddd;
  padding: 0.5em;
}
.stock-table th {
  background: #f0f0f0;
  text-align: left;
}

.reappro-form {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1em;
}
.reappro-form h3 {
  margin-top: 0;
  text-align: center;
}
.reappro-form label {
  display: block;
  margin-bottom: 0.8em;
}
.reappro-form select,
.reappro-form input {
  width: 100%;
  padding: 0.4em;
  margin-top: 0.2em;
  box-sizing: border-box;
}
.reappro-form button {
  display: block;
  margin: 1em auto;
  padding: 0.6em 1.2em;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.reappro-form button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.msg {
  margin-top: 0.5em;
  color: green;
  text-align: center;
}
.error {
  margin-top: 0.5em;
  color: red;
  text-align: center;
}
</style>
