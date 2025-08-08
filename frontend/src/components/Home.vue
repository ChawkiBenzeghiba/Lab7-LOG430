<template>
  <div class="home">
    <h1>
      Maison mère 
      <span v-if="magasins.length">{{ magasins[0].nom }}</span>
    </h1>

    <div class="buttons">
      <router-link to="/rapport" class="btn">Voir le Rapport</router-link>
      <router-link to="/stock-central" class="btn">Voir le Stock Central</router-link>
      <!-- Nouveau bouton Tableau de bord -->
      <router-link to="/tableau-de-bord" class="btn">Accéder au Tableau de bord</router-link>
    </div>

    <h2>Accès par magasin</h2>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-else class="buttons magasins">
      <router-link
        v-for="mag in magasins"
        :key="mag.id"
        :to="`/magasin/${mag.id}`"
        class="btn"
      >
        {{ mag.nom }}
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const magasins = ref([])
const error    = ref('')

async function loadMagasins() {
  try {
    const res = await fetch('/api/magasins')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    magasins.value = await res.json()
  } catch (err) {
    error.value = 'Erreur chargement magasins : ' + err.message
  }
}

onMounted(loadMagasins)
</script>

<style scoped>
.home {
  text-align: center;
  margin-top: 2em;
  font-family: Arial, sans-serif;
}
.buttons {
  display: flex;
  justify-content: center;
  gap: 1em;
  margin-top: 1.5em;
}
.magasins {
  flex-wrap: wrap;
}
.btn {
  display: inline-block;
  padding: 0.75em 1.5em;
  background: #42b983;
  color: white;
  border-radius: 4px;
  text-decoration: none;
  font-weight: bold;
}
.btn:hover {
  background: #369870;
}
.error {
  color: #c00;
  margin-top: 1em;
}
h2 {
  margin-top: 2em;
}
</style>
