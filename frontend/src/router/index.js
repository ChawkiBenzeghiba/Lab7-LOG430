import { createRouter, createWebHistory } from 'vue-router'
import Home         from '../components/Home.vue'
import Rapport      from '../components/Rapport.vue'
import StockCentral from '../components/StockCentral.vue'
import Magasin from '../components/Magasin.vue';
import TableauDeBord   from '../components/TableauDeBord.vue'

const routes = [
  { path: '/',             name: 'Home',          component: Home },
  { path: '/rapport',      name: 'Rapport',       component: Rapport },
  { path: '/stock-central', name: 'StockCentral', component: StockCentral },
  { path: '/magasin/:id', name: 'Magasin', component: Magasin },
  { path: '/tableau-de-bord', name: 'TableauDeBord', component: TableauDeBord },
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})