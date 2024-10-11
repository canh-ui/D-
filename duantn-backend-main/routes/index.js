const express = require("express");
const router = express.Router();
const db = require("./../models/database");
const dotenv = require("dotenv");
/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});
//test show all dotenv variables
 router.get("/env", (req, res) => {
  res.json(process.env);  
})
//check database connection
router.get("/db", (req, res) => {
  const query = "SELECT * FROM product";
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
})
module.exports = router;
