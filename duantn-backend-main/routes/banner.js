const express = require("express");
const router = express.Router();
const db = require("./../models/database");

// Get all banner
router.get("/", (req, res) => {
  const query = "SELECT * FROM banner";
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});
// Add a new banner
router.post("/", (req, res) => {
  const { bannerImg, bannerType, bannerName } = req.body;
  const query = `INSERT INTO banner (bannerImg, bannerType, bannerName) VALUES ('${bannerImg}', '${bannerType}', '${bannerName}')`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({
      message: "Banner added successfully",
      bannerId: results.insertId,
    });
  });
});
// Delete a banner by ID
router.delete("/:id", (req, res) => {
  const bannerId = req.params.id;
  const query = `DELETE FROM banner WHERE id = ${bannerId}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ message: "Banner deleted successfully", bannerId });
  });
});
// Update a banner by ID
router.put("/:id", (req, res) => {
  const bannerId = req.params.id;
  const { bannerImg, bannerType, bannerName } = req.body;
  const query = `UPDATE banner SET bannerImg = '${bannerImg}', bannerType = '${bannerType}', bannerName = '${bannerName}' WHERE id = ${bannerId}`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json({ message: "Banner updated successfully", bannerId });
  });
});

export default router;
