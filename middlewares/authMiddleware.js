const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Assurez-vous que le chemin est correct

const authenticateToken = (req, res, next) => {
  const token = req.cookies.jwt;
  // console.log(`[JWT Middleware] Token reçu: ${token ? "***" : "Aucun"}`); // Debugging

  if (!token) {
    return res
      .status(401)
      .json({ message: "Accès non autorisé : Aucun jeton fourni." });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      console.error(
        "[JWT Middleware] Erreur de vérification du jeton :",
        err.message
      );
      res.clearCookie("jwt"); // Effacer le cookie invalide
      return res.status(403).json({ message: "Jeton invalide ou expiré." });
    }

    try {
      // Rechercher l'utilisateur dans la base de données (sans le mot de passe)
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        console.error(
          "[JWT Middleware] Utilisateur non trouvé pour l'ID du jeton:",
          decoded.id
        );
        res.clearCookie("jwt"); // Effacer le cookie si l'utilisateur n'existe plus
        return res.status(404).json({ message: "Utilisateur introuvable." });
      }

      // Attacher les informations de l'utilisateur à l'objet req
      // Incluez tous les champs que le frontend pourrait avoir besoin pour le profil
      req.user = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        googleId: user.googleId,
        picture: user.picture,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        city: user.city,
        postalCode: user.postalCode,
        loyaltyCard: user.loyaltyCard,
        memberSince: user.memberSince,
        points: user.points,
        level: user.level,
      };
      // console.log(`[JWT Middleware] Utilisateur authentifié : ${req.user.email}`); // Debugging
      next();
    } catch (dbError) {
      console.error(
        "[JWT Middleware] Erreur de base de données lors de la recherche de l'utilisateur:",
        dbError
      );
      res
        .status(500)
        .json({ message: "Erreur serveur lors de l'authentification." });
    }
  });
};

const generateTokenAndSetCookie = (res, user) => {
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      picture: user.picture, // Ajouter si existant
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Utilise HTTPS en production
    sameSite: "Lax", // Aide contre les attaques CSRF, 'None' pour cross-site avec secure:true
    maxAge: 3600000, // 1 heure en millisecondes
  });
  // console.log(`[JWT Util] Token généré et cookie défini pour ${user.email}`); // Debugging
};

module.exports = { authenticateToken, generateTokenAndSetCookie };
