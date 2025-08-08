const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Saga = sequelize.define('Saga', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    commandeId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'ID de la commande associée'
    },
    etat: {
      type: DataTypes.ENUM(
        'CREEE',
        'STOCK_VERIFIE',
        'STOCK_RESERVE',
        'PAIEMENT_TENTE',
        'CONFIRMEE',
        'ANNULEE',
        'EN_ERREUR'
      ),
      defaultValue: 'CREEE',
      allowNull: false
    },
    etapeCourante: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Étape actuelle de la saga (0-4)'
    },
    etapes: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Historique des étapes avec timestamps'
    },
    erreur: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Message d\'erreur en cas d\'échec'
    },
    dateDebut: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    dateFin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    duree: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Durée en millisecondes'
    }
  }, {
    tableName: 'sagas',
    timestamps: true,
    indexes: [
      {
        fields: ['commandeId']
      },
      {
        fields: ['etat']
      },
      {
        fields: ['dateDebut']
      }
    ]
  });

  Saga.associate = (models) => {
    // Associations si nécessaire
  };

  return Saga;
};
