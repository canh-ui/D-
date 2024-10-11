const express = require("express");
const router = express.Router();
const db = require("./../models/database");
router.get("/catID", (req, res) => {
  const query = `
  SELECT prodcatID, catName FROM category;
`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});
// Get products where prodSale is not 0
router.get("/sale", (req, res) => {
  const query = `SELECT
  *,

COALESCE(product_entry.prodPrice, product.prodPrice) AS prodPrice,
COALESCE(product_entry.prodImg, product.prodImg) AS prodImg,
COALESCE(product_entry.QTY, product.QTY) AS QTY,
COALESCE(
    (COALESCE(product_entry.prodPrice, product.prodPrice) + 
     (COALESCE(product_entry.prodPrice, product.prodPrice) * product.prodSale / 100)),
    COALESCE(product_entry.prodPrice, product.prodPrice) 
) AS prodPriceSale,
COALESCE(product_entry.prodID, product.prodID) AS prodID

-- Các trường khác mà bạn muốn lấy từ bảng product và product_entry
FROM
product
LEFT JOIN product_entry ON product.prodID = product_entry.prodID
WHERE prodSale <> 0 AND product.QTY > 0
;`; // Thêm điều kiện WHERE
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/:product/:prodType", (req, res) => {
  const productParam = req.params.product;
  const prodTypeParam = req.params.prodType;

  const prodcatIDs = {
    apple: 1,
    samsung: 2,
    oppo: 3,
    xiaomi: 4,
    hp: 5,
    asus: 6,
    lenovo: 7,
    acer: 8,
  };

  const prodcatID = prodcatIDs[productParam];

  if (!prodcatID) {
    res.status(404).send("Invalid product");
    return;
  }

  let query = `
    SELECT
      product.*,
      category.*,
      CEILING(AVG(feedback.prodRate) * 2) / 2 AS prodRateAvg,
      COALESCE(
        (product.prodPrice + (product.prodPrice * product.prodSale / 100)),
        product.prodPrice
      ) AS prodPriceSale
    FROM
      product
      JOIN category ON product.prodcatID = category.prodcatID
      LEFT JOIN feedback ON product.prodID = feedback.prodID
    WHERE
      product.prodcatID = ? AND product.QTY > 0
    GROUP BY
      product.prodID
  `;

  // If prodTypeParam is specified, add condition for prodType
  if (prodTypeParam) {
    query = `
      SELECT
        product.*,
        category.*,
        CEILING(AVG(feedback.prodRate) * 2) / 2 AS prodRateAvg,
        COALESCE(
          (product.prodPrice + (product.prodPrice * product.prodSale / 100)),
          product.prodPrice
        ) AS prodPriceSale
      FROM
        product
        JOIN category ON product.prodcatID = category.prodcatID
        LEFT JOIN feedback ON product.prodID = feedback.prodID
      WHERE
        product.prodcatID = ? AND product.prodType = ? AND product.QTY > 0
      GROUP BY
        product.prodID
    `;
  }

  db.query(
    query,
    prodTypeParam ? [prodcatID, prodTypeParam] : [prodcatID],
    (error, results) => {
      if (error) throw error;

      if (results.length > 0) {
        res.json(results);
      } else {
        res
          .status(404)
          .send("No products found for the given prodcatID and prodType");
      }
    }
  );
});

router.get("/:product", (req, res) => {
  const productParam = req.params.product.toLowerCase();

  const prodcatIDs = {
    apple: 1,
    samsung: 2,
    oppo: 3,
    xiaomi: 4,
    hp: 5,
    asus: 6,
    lenovo: 7,
    acer: 8,
  };

  const prodcatID = prodcatIDs[productParam];

  // Nếu productParam là một product name
  if (prodcatID) {
    // Tìm sản phẩm theo prodcatID
    const query = `
      SELECT product.*, category.*, CEILING(AVG(feedback.prodRate) * 2) / 2 AS prodRateAvg,
      COALESCE(
        (product.prodPrice + (product.prodPrice * product.prodSale / 100)),
        product.prodPrice
      ) AS prodPriceSale
      FROM product
      JOIN category ON product.prodcatID = category.prodcatID
      LEFT JOIN feedback ON product.prodID = feedback.prodID
      WHERE product.prodcatID = ? AND product.QTY > 0
      GROUP BY product.prodID
      ;`;
    db.query(query, [prodcatID], (error, results) => {
      if (error) throw error;

      if (results.length > 0) {
        res.json(results);
      } else {
        res.status(404).send("No products found for the given prodcatID");
      }
    });
  } else {
    // Nếu productParam là một prodType
    const query = `
      SELECT
        *,

      COALESCE(product_entry.prodPrice, product.prodPrice) AS prodPrice,
      COALESCE(product_entry.prodImg, product.prodImg) AS prodImg,
      COALESCE(product_entry.QTY, product.QTY) AS QTY,
      COALESCE(
          (COALESCE(product_entry.prodPrice, product.prodPrice) + 
           (COALESCE(product_entry.prodPrice, product.prodPrice) * product.prodSale / 100)),
          COALESCE(product_entry.prodPrice, product.prodPrice)
      ) AS prodPriceSale,
      COALESCE(product_entry.prodID, product.prodID) AS prodID,
      CEILING(AVG(feedback.prodRate) * 2) / 2 AS prodRateAvg
      -- Các trường khác mà bạn muốn lấy từ bảng product và product_entry
    FROM
      product
      LEFT JOIN feedback ON product.prodID = feedback.prodID
      LEFT JOIN product_entry ON product.prodID = product_entry.prodID
      LEFT JOIN color ON product_entry.colorID = color.colorID
      LEFT JOIN storage ON product_entry.storageID = storage.storageID
      LEFT JOIN ram ON product_entry.ramID = ram.ramID
    WHERE
      product.prodType = ? AND product.QTY > 0
    GROUP BY product.prodID
    ;`;

    db.query(query, [productParam], (error, results) => {
      if (error) throw error;

      if (results.length > 0) {
        res.json(results);
      } else {
        res.status(404).send("No products found for the given prodType");
      }
    });
  }
});
module.exports = router;
