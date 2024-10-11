const express = require("express");
const router = express.Router();
const db = require("./../models/database");

router.get("/", (req, res) => {
  const query = `SELECT * FROM blog`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});
router.get("/:id", (req, res) => {
    const query = `SELECT * FROM blog WHERE blogID = ?`;
    db.query(query, [req.params.id], (error, results) => {
        if (error) throw error;
        res.json(results);
    });
    });

module.exports = router;
