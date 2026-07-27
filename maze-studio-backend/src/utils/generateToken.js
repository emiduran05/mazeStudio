const jwt = require("jsonwebtoken");

function generateToken(user, stayLogged = false) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: stayLogged ? "30d" : "8h",
    }
  );
}

module.exports = generateToken;