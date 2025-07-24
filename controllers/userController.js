const User = require("../models/User"); // Assurez-vous que le chemin est correct vers votre modèle User

// @desc    Récupérer le profil utilisateur
// @route   GET /api/user/profile
// @access  Privé
exports.getUserProfile = async (req, res) => {
  try {
    // req.user est rempli par le middleware authenticateToken
    // Il contient déjà les champs sélectionnés dans authMiddleware.js
    // Si vous avez besoin de plus de champs, vous devrez faire un User.findById(req.user._id)
    res.json(req.user);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération du profil utilisateur :",
      error
    );
    res
      .status(500)
      .json({ message: "Erreur serveur lors de la récupération du profil." });
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
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Validation de base des champs et mise à jour
    const fieldsToUpdate = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "dateOfBirth",
      "address",
      "city",
      "postalCode",
    ];
    fieldsToUpdate.forEach((field) => {
      if (updates[field] !== undefined) {
        // Empêcher la modification de l'email si un email Google est déjà défini
        if (
          field === "email" &&
          user.googleId &&
          updates.email !== user.email
        ) {
          console.warn(
            `[UPDATE PROFILE] Tentative de changer l'email Google pour ${user.email}`
          );
          // Vous pouvez choisir de renvoyer une erreur ou d'ignorer la mise à jour de l'email
          // Pour l'instant, nous ignorons, mais une erreur serait plus explicite pour l'utilisateur
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
      message: "Profil mis à jour avec succès !",
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
    console.error(
      "Erreur lors de la mise à jour du profil utilisateur :",
      error
    );
    if (error.code === 11000) {
      // Erreur de clé dupliquée (par exemple, l'e-mail existe déjà)
      return res
        .status(400)
        .json({ message: "Cette adresse e-mail est déjà utilisée." });
    }
    res.status(500).json({
      message: "Échec de la mise à jour du profil. Veuillez réessayer.",
    });
  }
};

// @desc    Récupérer les commandes récentes de l'utilisateur (simulé)
// @route   GET /api/user/orders
// @access  Privé
exports.getRecentOrders = async (req, res) => {
  try {
    // Dans une application réelle, vous feriez une requête à votre DB des commandes ici
    const simulatedOrders = [
      {
        id: "CMD001",
        date: "2024-07-20",
        items: 12,
        total: 89.5,
        status: "Livrée",
      },
      {
        id: "CMD002",
        date: "2024-07-15",
        items: 8,
        total: 156.2,
        status: "Livrée",
      },
      {
        id: "CMD003",
        date: "2024-07-10",
        items: 15,
        total: 203.8,
        status: "En cours",
      },
    ];
    res.json(simulatedOrders);
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes :", error);
    res.status(500).json({
      message: "Erreur serveur lors de la récupération des commandes.",
    });
  }
};

// @desc    Récupérer les produits favoris de l'utilisateur
// @route   GET /api/user/favorites
// @access  Privé
exports.getFavoriteProducts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id); // Récupérer l'utilisateur complet
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }
    // Assurez-vous que 'user.favorites' est un tableau d'IDs
    const favoriteProductIds = user.favorites
      ? user.favorites.map((id) => id)
      : []; // Pas besoin de toString si c'est déjà un nombre
    res.status(200).json({ favoriteIds: favoriteProductIds }); // Renvoie un objet avec la clé 'favoriteIds'
  } catch (error) {
    console.error("Erreur lors de la récupération des favoris :", error);
    res
      .status(500)
      .json({ message: "Erreur serveur lors de la récupération des favoris." });
  }
};

// @desc    Ajouter ou retirer un produit des favoris de l'utilisateur
// @route   POST /api/user/favorites/toggle/:productId
// @access  Privé
exports.toggleFavoriteProduct = async (req, res) => {
  const { productId } = req.params; // L'ID du produit vient des paramètres de l'URL

  try {
    const user = await User.findById(req.user._id); // Récupérer l'utilisateur complet

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Assurez-vous que le champ 'favorites' existe et est un tableau dans votre modèle User
    // Initialisez-le si ce n'est pas déjà fait
    if (!user.favorites) {
      user.favorites = [];
    }

    // Les IDs de produits sont maintenant des chaînes (String)
    const productIdStr = String(productId);
    const index = user.favorites.indexOf(productIdStr);

    let isFavorite;
    if (index > -1) {
      // Le produit est déjà favori, le retirer
      user.favorites.splice(index, 1);
      isFavorite = false;
      console.log(
        `[Backend] Produit ${productIdStr} retiré des favoris de ${user.email}`
      );
    } else {
      // Le produit n'est pas favori, l'ajouter
      user.favorites.push(productIdStr);
      isFavorite = true;
      console.log(
        `[Backend] Produit ${productIdStr} ajouté aux favoris de ${user.email}`
      );
    }

    await user.save(); // Sauvegarder les modifications dans la base de données

    // Renvoyer la liste mise à jour des IDs de produits favoris et le nouvel état
    res.status(200).json({
      isFavorite,
      favoriteProductIds: user.favorites.map((id) => id), // IDs sous forme de chaînes
    });
  } catch (error) {
    console.error(
      "Erreur serveur lors de la bascule du produit favori:",
      error
    );
    res
      .status(500)
      .json({ message: "Erreur serveur lors de la mise à jour des favoris." });
  }
};
