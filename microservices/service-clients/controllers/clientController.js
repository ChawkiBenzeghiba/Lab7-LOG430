const Client = require('../models/Client');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const clientController = {
  // Créer un nouveau compte client
  async createClient(req, res) {
    try {
      const {
        nom,
        prenom,
        email,
        motDePasse,
        telephone,
        adresse,
        ville,
        codePostal,
        pays
      } = req.body;

      // Validation des données obligatoires
      if (!nom || !prenom || !email || !motDePasse) {
        return res.status(400).json({
          error: 'Nom, prénom, email et mot de passe sont obligatoires'
        });
      }

      // Vérifier si l'email existe déjà
      const existingClient = await Client.findOne({
        where: { email: email.toLowerCase() }
      });

      if (existingClient) {
        return res.status(409).json({
          error: 'Un compte avec cet email existe déjà'
        });
      }

      // Créer le client
      const client = await Client.create({
        nom,
        prenom,
        email: email.toLowerCase(),
        motDePasse,
        telephone,
        adresse,
        ville,
        codePostal,
        pays: pays || 'Canada'
      });

      // Retourner le client sans le mot de passe
      const clientResponse = client.toJSON();
      delete clientResponse.motDePasse;

      res.status(201).json({
        success: true,
        data: clientResponse,
        message: 'Compte client créé avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la création du client:', error);
      res.status(500).json({
        error: 'Erreur lors de la création du compte client'
      });
    }
  },

  // Authentifier un client
  async authenticateClient(req, res) {
    try {
      const { email, motDePasse } = req.body;

      if (!email || !motDePasse) {
        return res.status(400).json({
          error: 'Email et mot de passe sont obligatoires'
        });
      }

      // Trouver le client par email
      const client = await Client.findOne({
        where: { 
          email: email.toLowerCase(),
          actif: true
        }
      });

      if (!client) {
        return res.status(401).json({
          error: 'Email ou mot de passe incorrect'
        });
      }

      // Vérifier le mot de passe
      const isPasswordValid = await client.comparePassword(motDePasse);

      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Email ou mot de passe incorrect'
        });
      }

      // Générer le token JWT
      const token = jwt.sign(
        { 
          id: client.id, 
          email: client.email,
          nom: client.nom,
          prenom: client.prenom
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Retourner le client sans le mot de passe
      const clientResponse = client.toJSON();
      delete clientResponse.motDePasse;

      res.json({
        success: true,
        data: {
          client: clientResponse,
          token
        },
        message: 'Authentification réussie'
      });
    } catch (error) {
      console.error('Erreur lors de l\'authentification:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'authentification'
      });
    }
  },

  // Récupérer tous les clients
  async getAllClients(req, res) {
    try {
      const clients = await Client.findAll({
        where: { actif: true },
        attributes: { exclude: ['motDePasse'] },
        order: [['nom', 'ASC']]
      });

      res.json({
        success: true,
        data: clients,
        count: clients.length
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des clients:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des clients'
      });
    }
  },

  // Récupérer un client par ID
  async getClientById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          error: 'ID du client invalide'
        });
      }

      const client = await Client.findByPk(id, {
        attributes: { exclude: ['motDePasse'] }
      });

      if (!client) {
        return res.status(404).json({
          error: 'Client non trouvé'
        });
      }

      res.json({
        success: true,
        data: client
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du client:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération du client'
      });
    }
  },

  // Mettre à jour un client
  async updateClient(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          error: 'ID du client invalide'
        });
      }

      // Exclure les champs sensibles de la mise à jour
      delete updateData.email; // L'email ne peut pas être modifié
      delete updateData.dateInscription;

      const client = await Client.findByPk(id);

      if (!client) {
        return res.status(404).json({
          error: 'Client non trouvé'
        });
      }

      // Mettre à jour le client
      await client.update(updateData);

      // Retourner le client mis à jour sans le mot de passe
      const clientResponse = client.toJSON();
      delete clientResponse.motDePasse;

      res.json({
        success: true,
        data: clientResponse,
        message: 'Client mis à jour avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du client:', error);
      res.status(500).json({
        error: 'Erreur lors de la mise à jour du client'
      });
    }
  },

  // Désactiver un client
  async deactivateClient(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          error: 'ID du client invalide'
        });
      }

      const client = await Client.findByPk(id);

      if (!client) {
        return res.status(404).json({
          error: 'Client non trouvé'
        });
      }

      await client.update({ actif: false });

      res.json({
        success: true,
        message: 'Client désactivé avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la désactivation du client:', error);
      res.status(500).json({
        error: 'Erreur lors de la désactivation du client'
      });
    }
  }
};

module.exports = clientController; 