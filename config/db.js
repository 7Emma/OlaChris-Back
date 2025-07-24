const mongoose = require("mongoose");
require("colors"); // Pour les messages colorés (npm install colors)

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/olaCris"
    );
    console.log(
      `[MONGO] MongoDB Connecté: ${conn.connection.host}`.cyan.underline
    );
  } catch (err) {
    console.error(
      `[MONGO] Échec de la connexion à MongoDB : ${err.message}`.red.bold
    );
    process.exit(1); // Arrêter le processus si la connexion échoue
  }
};

module.exports = connectDB;
