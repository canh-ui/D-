const jwt = require("jsonwebtoken");

function authenToken(req, res, next) {
  const authorizationHeader = req.headers["authorization"];

  if (!authorizationHeader) {
    return res.status(401).json({ error: "Authorization header not found" });
  }

  const token = authorizationHeader.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .json({ error: "Token not found in authorization header" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }

    req.payload = payload; 
    req.token = token;
    req.username = payload.username;
    req.userID = payload.userID;
    req.userID = payload.admin;
    next();
  });
}

module.exports = {
  authenToken,
};
