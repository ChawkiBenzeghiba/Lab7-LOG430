FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --only=production

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 3001

# Commande de démarrage
CMD ["node", "app.js"] 