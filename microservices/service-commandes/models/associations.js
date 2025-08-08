const Commande = require('./Commande');
const CommandeItem = require('./CommandeItem');

// Définir les associations
Commande.hasMany(CommandeItem, { 
  foreignKey: 'commandeId', 
  as: 'items' 
});

CommandeItem.belongsTo(Commande, { 
  foreignKey: 'commandeId', 
  as: 'commande' 
});

module.exports = {
  Commande,
  CommandeItem
}; 