const express = require("express");
const router = express.Router();
const db = require("./../models/database");

//get all feedback
router.get("/", (req, res) => {
  const query = `SELECT feedback.*, users.*
  FROM feedback
  LEFT JOIN users ON feedback.userID = users.userID`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

//get feedback by prodID
router.get("/:prodID", (req, res) => {
  const query = `SELECT feedback.*, users.*
  FROM feedback
  LEFT JOIN users ON feedback.userID = users.userID
  WHERE feedback.prodID = ?;
  `;
  db.query(query, [req.params.prodID], (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});
//post feedback by prodID from client and userID prodRate, comment
router.post("/", (req, res) => {
  const { prodID, userID, prodRate, comment } = req.body;
  const query =
    "INSERT INTO feedback (userID, prodID, prodRate, comment) VALUES (?, ?, ?, ?)";
  db.query(query, [userID, prodID, prodRate, comment], (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

module.exports = router;
