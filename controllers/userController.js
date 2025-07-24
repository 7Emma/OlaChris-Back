const User = require('../models/User'); // Votre modèle utilisateur

// @desc    Récupérer le profil utilisateur
// @route   GET /api/user/profile
// @access  Privé
exports.getUserProfile = async (req, res) => {
  try {
    // req.user est rempli par le middleware authenticateToken
    // Il contient déjà les champs sélectionnés dans authMiddleware.js
    res.json(req.user);
  } catch (error) {
    console.error('Erreur lors de la récupération du profil utilisateur :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération du profil.' });
  }
};

// @desc    Mettre à jour le profil utilisateur
// @route   PUT /api/user/profile
// @access  Privé
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id; // ID utilisateur de l'authentification
    const updates = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Validation de base des champs et mise à jour
    const fieldsToUpdate = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'address', 'city', 'postalCode'];
    fieldsToUpdate.forEach(field => {
      if (updates[field] !== undefined) {
        // Empêcher la modification de l'email si un email Google est déjà défini
        if (field === 'email' && user.googleId && updates.email !== user.email) {
            console.warn(`[UPDATE PROFILE] Tentative de changer l'email Google pour ${user.email}`);
            // Vous pouvez choisir de renvoyer une erreur ou d'ignorer la mise à jour de l'email
            // Pour l'instant, nous ignorons, mais une erreur serait plus explicite pour l'utilisateur
            // return res.status(400).json({ message: "Impossible de modifier l'e-mail lié à un compte Google." });
        } else {
            user[field] = updates[field];
        }
      }
    });

    // Optionnel: gérer le changement de mot de passe ici si nécessaire, mais séparément
    // if (updates.password) { ... }

    await user.save({ validateBeforeSave: true }); // Sauvegarder avec validation Mongoose

    // Renvoyer les données utilisateur mises à jour (sans le mot de passe)
    res.json({
      message: 'Profil mis à jour avec succès !',
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        city: user.city,
        postalCode: user.postalCode,
        loyaltyCard: user.loyaltyCard,
        memberSince: user.memberSince,
        points: user.points,
        level: user.level,
        avatar: user.picture, // Utilisez 'picture' pour l'avatar depuis Google ou par défaut
      },
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil utilisateur :', error);
    if (error.code === 11000) { // Erreur de clé dupliquée (par exemple, l'e-mail existe déjà)
      return res.status(400).json({ message: 'Cette adresse e-mail est déjà utilisée.' });
    }
    res.status(500).json({ message: 'Échec de la mise à jour du profil. Veuillez réessayer.' });
  }
};

// @desc    Récupérer les commandes récentes de l'utilisateur (simulé)
// @route   GET /api/user/orders
// @access  Privé
exports.getRecentOrders = async (req, res) => {
  try {
    // Dans une application réelle, vous feriez une requête à votre DB des commandes ici
    const simulatedOrders = [
      { id: "CMD001", date: "2024-07-20", items: 12, total: 89.50, status: "Livrée" },
      { id: "CMD002", date: "2024-07-15", items: 8, total: 156.20, status: "Livrée" },
      { id: "CMD003", date: "2024-07-10", items: 15, total: 203.80, status: "En cours" }
    ];
    res.json(simulatedOrders);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des commandes.' });
  }
};

// @desc    Récupérer les produits favoris de l'utilisateur (simulé)
// @route   GET /api/user/favorites
// @access  Privé
exports.getFavoriteProducts = async (req, res) => {
  try {
    // Dans une application réelle, vous feriez une requête à votre DB des favoris ici
    const simulatedFavorites = [
      { id: 1, name: "Pain de mie complet", brand: "Bio Nature", price: 2.85, image: "🍞" },
      { id: 2, name: "Yaourts nature x8", brand: "Fermier", price: 4.50, image: "🥛" },
      { id: 3, name: "Pommes Golden", brand: "Verger du Sud", price: 3.20, image: "🍎" }
    ];
    res.json(simulatedFavorites);
  } catch (error) {
    console.error('Erreur lors de la récupération des favoris :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des favoris.' });
  }
};