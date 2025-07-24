// middlewares/isAdmin.js
const isAdmin = (req, res, next) => {
  // req.user est défini par le middleware authenticateToken (qui doit être exécuté avant)
  if (req.user && req.user.role === "admin") {
    next(); // L'utilisateur est un admin, continuer vers la prochaine fonction middleware/route
  } else {
    // Si l'utilisateur n'est pas authentifié ou n'a pas le rôle admin
    res
      .status(403)
      .json({ message: "Accès refusé : Nécessite un rôle d'administrateur." });
  }
};

module.exports = isAdmin;
