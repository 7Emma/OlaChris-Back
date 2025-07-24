const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { generateTokenAndSetCookie } = require("../middlewares/authMiddleware");
const { OAuth2Client } = require("google-auth-library");

// Initialiser le client Google OAuth2
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Enregistrer un nouvel utilisateur
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
  const { firstName, lastName, email, phone, password, confirmPassword } =
    req.body;
  console.log("[AUTH CONTROLLER] Nouvelle inscription:", email);

  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    return res
      .status(400)
      .json({ message: "Veuillez remplir tous les champs obligatoires." });
  }

  if (password !== confirmPassword) {
    return res
      .status(400)
      .json({ message: "Les mots de passe ne correspondent pas." });
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
    });

    await newUser.save();

    // Optionnel: Connexion automatique après l'inscription
    generateTokenAndSetCookie(res, newUser);

    res.status(201).json({
      message: "Inscription réussie !",
      user: {
        _id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phone: newUser.phone,
        // N'envoyez pas le mot de passe haché !
      },
    });
  } catch (error) {
    console.error("[AUTH CONTROLLER] Erreur lors de l'inscription:", error);
    res.status(500).json({ message: "Erreur serveur lors de l'inscription." });
  }
};

// @desc    Connecter un utilisateur
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  console.log("[AUTH CONTROLLER] Tentative de connexion:", email);

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "L'email et le mot de passe sont requis." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ message: "Email ou mot de passe incorrect." });
    }

    if (!user.password && user.googleId) {
      return res
        .status(401)
        .json({ message: "Veuillez vous connecter avec Google." });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Email ou mot de passe incorrect." });
    }

    generateTokenAndSetCookie(res, user);

    res.status(200).json({
      message: "Connexion réussie !",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        picture: user.picture,
        // N'envoyez pas le mot de passe haché !
      },
    });
  } catch (error) {
    console.error("[AUTH CONTROLLER] Erreur lors de la connexion:", error);
    res.status(500).json({ message: "Erreur serveur lors de la connexion." });
  }
};

// @desc    Connecter/Inscrire avec Google
// @route   POST /api/auth/google
// @access  Public
exports.handleGoogleAuth = async (req, res) => {
  const { id_token } = req.body;
  console.log("[AUTH CONTROLLER] Tentative de connexion Google");

  if (!id_token) {
    return res.status(400).json({ message: "ID Token Google manquant." });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ email });

    if (user) {
      // Si l'utilisateur existe déjà
      if (!user.googleId) {
        // Lier le compte Google si ce n'est pas déjà fait
        user.googleId = googleId;
        user.picture = picture;
        await user.save();
      } else if (user.googleId !== googleId) {
        // Conflit si l'email est lié à un autre GoogleId
        return res.status(409).json({
          message: "Cet email est déjà enregistré avec un autre compte Google.",
        });
      }
    } else {
      // Créer un nouvel utilisateur s'il n'existe pas
      user = new User({
        firstName: name.split(" ")[0] || "Utilisateur",
        lastName: name.split(" ").slice(1).join(" ") || "Google",
        email,
        googleId,
        picture,
      });
      await user.save();
    }

    generateTokenAndSetCookie(res, user);

    res.status(200).json({
      message: "Connexion Google réussie !",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        picture: user.picture,
        // N'envoyez pas de données sensibles
      },
    });
  } catch (error) {
    console.error("[AUTH CONTROLLER] Erreur d'authentification Google:", error);
    res.status(401).json({ message: "Échec de l'authentification Google." });
  }
};

// @desc    Vérifier l'état de la session
// @route   GET /api/auth/status
// @access  Privé (via authenticateToken)
exports.checkAuthStatus = (req, res) => {
  // Le middleware authenticateToken a déjà vérifié le token et attaché req.user
  res.status(200).json({
    isAuthenticated: true,
    user: req.user, // Contient déjà les infos non sensibles attachées par le middleware
  });
};

// @desc    Déconnecter un utilisateur
// @route   POST /api/auth/logout
// @access  Public
exports.logoutUser = (req, res) => {
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
  });
  res.status(200).json({ message: "Déconnexion réussie." });
};
