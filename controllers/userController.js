const User = require("../models/User"); // Assurez-vous que le chemin est correct vers votre modèle User
const bcrypt = require("bcryptjs"); // Importez bcryptjs pour hacher le mot de passe

// @desc    Récupérer le profil utilisateur
// @route   GET /api/user/profile
// @access  Privé
exports.getUserProfile = async (req, res) => {
  try {
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
    const userId = req.user._id;
    const updates = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const fieldsToUpdate = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "dateOfBirth",
      "address",
      "city",
      "postalCode",
      "picture", // Assurez-vous que 'picture' est inclus ici pour la mise à jour
    ];
    fieldsToUpdate.forEach((field) => {
      if (updates[field] !== undefined) {
        if (
          field === "email" &&
          user.googleId &&
          updates.email !== user.email
        ) {
          console.warn(
            `[UPDATE PROFILE] Tentative de changer l'email Google pour ${user.email}`
          );
          // Vous pouvez choisir de renvoyer une erreur ici si vous voulez empêcher le changement d'email Google
          // return res.status(400).json({ message: "L'email des comptes Google ne peut pas être modifié." });
        } else {
          user[field] = updates[field];
        }
      }
    });

    // Si un nouveau mot de passe est fourni, le hacher
    if (updates.password && !user.googleId) {
      // Ne pas hacher si c'est un compte Google
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(updates.password, salt);
    }

    await user.save({ validateBeforeSave: true });

    // Construire l'objet user à renvoyer, excluant les informations sensibles
    const responseUser = {
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
      picture: user.picture, // Assurez-vous que l'avatar est inclus
      favorites: user.favorites,
      role: user.role, // Inclure le rôle si pertinent pour le frontend
    };

    res.json({
      message: "Profil mis à jour avec succès !",
      user: responseUser,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la mise à jour du profil utilisateur :",
      error
    );
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Cette adresse e-mail est déjà utilisée." });
    }
    res.status(500).json({
      message: "Échec de la mise à jour du profil. Veuillez réessayer.",
    });
  }
};

// @desc    Supprimer le profil de l'utilisateur connecté
// @route   DELETE /api/user/profile
// @access  Privé
exports.deleteMyProfile = async (req, res) => {
  try {
    const userId = req.user._id; // L'ID de l'utilisateur est dans req.user grâce à authenticateToken

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ message: "Profil utilisateur non trouvé." });
    }

    // Empêcher la suppression si l'utilisateur est un admin (si vous voulez un super-admin)
    if (user.role === "admin") {
      return res
        .status(403)
        .json({
          message:
            "Les comptes administrateurs ne peuvent pas être supprimés via cette route de profil. Veuillez contacter le support.",
        });
    }

    await user.deleteOne(); // Supprime le document utilisateur
    res
      .status(200)
      .json({ message: "Votre profil a été supprimé avec succès." });
  } catch (error) {
    console.error("Erreur serveur lors de la suppression du profil:", error);
    res
      .status(500)
      .json({ message: "Erreur serveur lors de la suppression du profil." });
  }
};

// @desc    Récupérer les commandes récentes de l'utilisateur (simulé)
// @route   GET /api/user/orders
// @access  Privé
exports.getRecentOrders = async (req, res) => {
  try {
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

// @desc    Récupérer les IDs des produits favoris de l'utilisateur
// @route   GET /api/user/favorites
// @access  Privé
exports.getFavoriteProducts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }
    const favoriteProductIds = user.favorites
      ? user.favorites.map((id) => id)
      : [];
    res.status(200).json({ favoriteIds: favoriteProductIds });
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
  const { productId } = req.params;

  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    if (!user.favorites) {
      user.favorites = [];
    }

    const productIdNum = parseInt(productId, 10);
    if (isNaN(productIdNum)) {
      return res.status(400).json({ message: "ID de produit invalide." });
    }

    const index = user.favorites.indexOf(productIdNum);

    let isFavorite;
    if (index > -1) {
      user.favorites.splice(index, 1);
      isFavorite = false;
      console.log(
        `[Backend] Produit ${productIdNum} retiré des favoris de ${user.email}`
      );
    } else {
      user.favorites.push(productIdNum);
      isFavorite = true;
      console.log(
        `[Backend] Produit ${productIdNum} ajouté aux favoris de ${user.email}`
      );
    }

    await user.save();

    res.status(200).json({
      isFavorite,
      favoriteProductIds: user.favorites.map((id) => id),
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

// @desc    Récupérer tous les utilisateurs (Admin seulement)
// @route   GET /api/admin/users
// @access  Privé/Admin
exports.getAllUsers = async (req, res) => {
  try {
    // Récupère tous les utilisateurs sauf les mots de passe et les Google IDs sensibles
    const users = await User.find({}).select("-password -googleId");
    res.json(users);
  } catch (error) {
    console.error(
      "Erreur backend lors de la récupération des utilisateurs (admin):",
      error
    );
    res.status(500).json({
      message: "Erreur serveur lors de la récupération des utilisateurs.",
    });
  }
};

// @desc    Créer un nouvel utilisateur avec un rôle spécifié (Admin seulement)
// @route   POST /api/admin/users
// @access  Privé/Admin
exports.createUserByAdmin = async (req, res) => {
  const { firstName, lastName, email, phone, password, role } = req.body;
  console.log(
    `[Admin] Tentative de création d'utilisateur: ${email} avec rôle: ${role}`
  );

  // Validation de base des champs requis
  if (!firstName || !lastName || !email || !password || !role) {
    return res.status(400).json({
      message:
        "Tous les champs requis (prénom, nom, email, mot de passe, rôle) doivent être fournis.",
    });
  }

  // Validation du format de l'email
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ message: "Format d'email invalide." });
  }

  // Validation de la force du mot de passe
  if (
    password.length < 8 ||
    !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(password)
  ) {
    return res.status(400).json({
      message:
        "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.",
    });
  }

  // Validation du rôle
  const validRoles = ["user", "admin"]; // Assurez-vous que cela correspond à votre enum dans models/User.js
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      message: `Rôle invalide. Les rôles autorisés sont: ${validRoles.join(
        ", "
      )}.`,
    });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res
        .status(409)
        .json({ message: "Un utilisateur avec cet email existe déjà." });
    }

    const newUser = new User({
      firstName,
      lastName,
      email,
      phone, // Le téléphone est optionnel ici si non requis par l'admin
      password, // Le mot de passe sera haché par le middleware pre('save')
      role, // Assigner le rôle spécifié
    });

    await newUser.save();
    console.log(
      `[Admin] Utilisateur créé avec succès: ${email}, Rôle: ${role}`
    );

    // Ne pas générer de token JWT ni définir de cookie pour l'utilisateur créé ici,
    // car c'est l'admin qui crée l'utilisateur, pas l'utilisateur lui-même qui se connecte.
    res.status(201).json({
      message: "Utilisateur créé avec succès !",
      user: {
        _id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        picture: newUser.picture, // Assurez-vous que l'avatar est inclus dans la réponse de création
      },
    });
  } catch (error) {
    console.error(
      "[Admin] Erreur serveur lors de la création d'utilisateur:",
      error
    );
    res.status(500).json({
      message: "Erreur serveur lors de la création de l'utilisateur.",
    });
  }
};
