const User = require("../models/User");
const bcrypt = require("bcryptjs");

// @desc    Récupérer le profil utilisateur
// @route   GET /api/user/profile
// @access  Privé
exports.getUserProfile = async (req, res) => {
  try {
    // Si l'utilisateur est authentifié, req.user est disponible grâce au middleware
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

    // Liste des champs que l'utilisateur peut modifier
    const fieldsToUpdate = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "dateOfBirth",
      "address",
      "city",
      "postalCode",
      "picture", // Ajout de 'picture' pour la modification d'avatar
    ];

    fieldsToUpdate.forEach((field) => {
      if (updates[field] !== undefined) {
        // Logique spécifique pour l'email des comptes Google
        if (
          field === "email" &&
          user.googleId &&
          updates.email !== user.email
        ) {
          console.warn(
            `[UPDATE PROFILE] Tentative de changer l'email Google pour ${user.email}`
          );
          // Optionnel: Empêcher la modification de l'email pour les comptes Google connectés
          // return res.status(400).json({ message: "L'email des comptes Google ne peut pas être modifié." });
        } else {
          user[field] = updates[field];
        }
      }
    });

    // Optionnel: Gérer la modification du mot de passe séparément si nécessaire
    if (updates.password && updates.newPassword && !user.googleId) {
      if (!(await user.matchPassword(updates.password))) {
        return res
          .status(401)
          .json({ message: "Mot de passe actuel incorrect." });
      }
      if (
        updates.newPassword.length < 8 ||
        !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(
          updates.newPassword
        )
      ) {
        return res.status(400).json({
          message:
            "Le nouveau mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.",
        });
      }
      user.password = updates.newPassword; // Le pre-save hook de Mongoose hachera ce mot de passe
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
    res
      .status(500)
      .json({
        message: "Échec de la mise à jour du profil. Veuillez réessayer.",
      });
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
    res
      .status(500)
      .json({
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
    res
      .status(500)
      .json({
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

  if (!firstName || !lastName || !email || !password || !role) {
    return res
      .status(400)
      .json({
        message:
          "Tous les champs requis (prénom, nom, email, mot de passe, rôle) doivent être fournis.",
      });
  }

  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ message: "Format d'email invalide." });
  }

  if (
    password.length < 8 ||
    !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(password)
  ) {
    return res.status(400).json({
      message:
        "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.",
    });
  }

  const validRoles = ["user", "admin"];
  if (!validRoles.includes(role)) {
    return res
      .status(400)
      .json({
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
      phone,
      password,
      role,
      // Le champ 'picture' prendra la valeur par défaut définie dans le modèle
    });

    await newUser.save();
    console.log(
      `[Admin] Utilisateur créé avec succès: ${email}, Rôle: ${role}`
    );

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
    res
      .status(500)
      .json({
        message: "Erreur serveur lors de la création de l'utilisateur.",
      });
  }
};

// @desc    Supprimer un utilisateur par ID (Admin seulement)
// @route   DELETE /api/admin/users/:id
// @access  Privé/Admin
exports.deleteUserByAdmin = async (req, res) => {
  const { id } = req.params;
  console.log(`[Admin] Tentative de suppression d'utilisateur avec ID: ${id}`);

  try {
    // Empêcher un admin de se supprimer lui-même
    if (req.user._id.toString() === id) {
      return res
        .status(403)
        .json({
          message:
            "Un administrateur ne peut pas supprimer son propre compte via cette route.",
        });
    }

    const userToDelete = await User.findById(id);

    if (!userToDelete) {
      console.log(
        `[Admin] Utilisateur avec ID ${id} non trouvé pour suppression.`
      );
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Optionnel: Empêcher un admin de supprimer un autre admin (si vous voulez un super-admin)
    // if (userToDelete.role === 'admin') {
    //   return res.status(403).json({ message: "Vous ne pouvez pas supprimer un autre administrateur." });
    // }

    await userToDelete.deleteOne(); // Utilisez deleteOne() ou findByIdAndDelete()
    console.log(
      `[Admin] Utilisateur ${userToDelete.email} (ID: ${id}) supprimé avec succès.`
    );

    res.status(200).json({ message: "Utilisateur supprimé avec succès." });
  } catch (error) {
    console.error(
      `[Admin] Erreur serveur lors de la suppression de l'utilisateur ${id}:`,
      error
    );
    res
      .status(500)
      .json({
        message: "Erreur serveur lors de la suppression de l'utilisateur.",
      });
  }
};
