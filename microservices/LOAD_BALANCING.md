# Load Balancing - API Gateway

## Vue d'ensemble

Ce document décrit l'implémentation du load balancing round-robin pour le service panier via l'API Gateway.

## Architecture

### Configuration du Load Balancing

Le load balancing est implémenté au niveau de l'API Gateway avec les caractéristiques suivantes :

- **Type** : Round-robin
- **Service cible** : Service Panier
- **Nombre d'instances** : 2
- **Algorithme** : Distribution séquentielle

### Instances du Service Panier

```
service-panier-1:3006 (Instance 1)
service-panier-2:3006 (Instance 2)
```

## Implémentation Technique

### 1. API Gateway (`api-gateway/app.js`)

```javascript
// Configuration du load balancing round-robin
let panierInstanceIndex = 0;
const panierInstances = [
  'http://service-panier-1:3006',
  'http://service-panier-2:3006'
];

function getNextPanierInstance() {
  const instance = panierInstances[panierInstanceIndex];
  panierInstanceIndex = (panierInstanceIndex + 1) % panierInstances.length;
  return instance;
}
```

### 2. Docker Compose (`docker-compose.yml`)

```yaml
# Service Panier - Instance 1
service-panier-1:
  build:
    context: ./service-panier
  environment:
    - INSTANCE_ID=1
    - PORT=3006

# Service Panier - Instance 2  
service-panier-2:
  build:
    context: ./service-panier
  environment:
    - INSTANCE_ID=2
    - PORT=3006
```

### 3. Service Panier (`service-panier/app.js`)

```javascript
const INSTANCE_ID = process.env.INSTANCE_ID || 'unknown';

// Middleware pour identifier l'instance
app.use((req, res, next) => {
  console.log(`[Instance ${INSTANCE_ID}] ${req.method} ${req.path}`);
  next();
});
```

## Comportement du Load Balancing

### Distribution Round-Robin

1. **Requête 1** → Instance 1
2. **Requête 2** → Instance 2  
3. **Requête 3** → Instance 1
4. **Requête 4** → Instance 2
5. **Et ainsi de suite...**

### Logs de Distribution

L'API Gateway affiche des logs pour chaque routage :

```
Load balancing: Route vers instance panier 1 (http://service-panier-1:3006)
Load balancing: Route vers instance panier 2 (http://service-panier-2:3006)
```

### Health Check avec Load Balancing

```bash
curl http://localhost:3000/health
```

Réponse :
```json
{
  "status": "OK",
  "loadBalancing": {
    "panier": {
      "currentInstance": 1,
      "totalInstances": 2
    }
  }
}
```

## Tests et Validation

### Script de Test

Utilisez le script `test-load-balancing.sh` pour valider la distribution :

```bash
./test-load-balancing.sh
```

### Test Manuel

```bash
# Test de distribution (20 requêtes)
for i in {1..20}; do
  curl -s http://localhost:3000/api/panier/client/1
  echo "Requête $i terminée"
done
```

### Vérification des Logs

```bash
# Logs Instance 1
docker logs service_panier_1 | grep "GET /api/panier"

# Logs Instance 2  
docker logs service_panier_2 | grep "GET /api/panier"
```

## Avantages

1. **Haute disponibilité** : Si une instance tombe en panne, l'autre continue de fonctionner
2. **Répartition de charge** : Les requêtes sont distribuées équitablement
3. **Scalabilité** : Facile d'ajouter plus d'instances
4. **Transparence** : Le client ne voit qu'un seul endpoint

## Limitations

1. **État partagé** : Les deux instances partagent la même base de données
2. **Session sticky** : Pas de session sticky (chaque requête peut aller vers une instance différente)
3. **Complexité** : Ajoute de la complexité à l'architecture

## Monitoring

### Métriques à surveiller

- Nombre de requêtes par instance
- Temps de réponse par instance
- Taux d'erreur par instance
- Utilisation des ressources par instance

### Commandes de monitoring

```bash
# Vérifier l'état des instances
docker ps | grep service_panier

# Voir les logs en temps réel
docker logs -f service_panier_1
docker logs -f service_panier_2

# Vérifier la distribution
curl http://localhost:3000/health
```

## Déploiement

### Redémarrage avec Load Balancing

```bash
cd microservices
docker-compose down
docker-compose up --build
```

### Ajout d'une troisième instance

1. Ajouter `service-panier-3` dans `docker-compose.yml`
2. Ajouter l'URL dans `panierInstances` dans l'API Gateway
3. Redémarrer les services

## Conclusion

Le load balancing round-robin est maintenant opérationnel pour le service panier. Cette implémentation améliore la disponibilité et la performance de l'application en distribuant la charge entre deux instances du service. 