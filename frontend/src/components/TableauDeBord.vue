<template>
    <div class="tableau-de-bord">
    <h2>Chiffre d’affaires par magasin</h2>
    <ul>
        <li v-for="c in caParMagasin" :key="c.magasinId">
        {{ c.magasinNom }} : {{ c.chiffreAffaires }} $
        </li>
    </ul>

    <h2>Alertes de stock</h2>
    <h3>Rupture (≤5)</h3>
    <ul>
        <li v-for="a in rupture" :key="`${a.magasinId}-${a.produitId}`">
        {{ a.magasinNom }} – {{ a.produitNom }} (qte : {{ a.quantite }})
        </li>
    </ul>

    <h3>Surstock (≥25)</h3>
    <ul>
        <li v-for="s in surstock" :key="`${s.magasinId}-${s.produitId}`">
        {{ s.magasinNom }} – {{ s.produitNom }} (qte : {{ s.quantite }})
        </li>
    </ul>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const caParMagasin = ref([]);
const rupture      = ref([]);
const surstock     = ref([]);

onMounted(async () => {
    const res  = await fetch('/api/tableau-de-bord');
    const json = await res.json();
    caParMagasin.value = json.caParMagasin;
    rupture.value      = json.rupture;
    surstock.value     = json.surstock;
});
</script>
  