const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "artaround-dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

function createAuthToken(user) {
  return jwt.sign(
    { sub: String(user._id), ruolo: user.ruolo, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res
      .status(401)
      .json({ successo: false, messaggio: "Autenticazione richiesta", data: null });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;
    return next();
  } catch (err) {
    return res
      .status(401)
      .json({ successo: false, messaggio: "Token non valido o scaduto", data: null });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth || !allowedRoles.includes(req.auth.ruolo)) {
      return res
        .status(403)
        .json({ successo: false, messaggio: "Permessi insufficienti", data: null });
    }
    return next();
  };
}

module.exports = { createAuthToken, requireAuth, requireRole };
