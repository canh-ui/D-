const express = require("express");
const router = express.Router();
const db = require("./../models/database");

router.get("/colors", (req, res) => {
  const query = `
  Select * from color;`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});
router.get("/storages", (req, res) => {
  const query = `
  Select * from storage;`;
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});
router.get("/total", (req, res) => {
  const query = `
  -- Retrieve all columns from the 'product' table
  SELECT prodID, QTY, NULL AS entryID FROM product
  
  -- Combine with all columns from the 'product_entry' table
  UNION ALL
  
  -- Retrieve all columns from the 'product_entry' table
  SELECT prodID, QTY, entryID FROM product_entry;
`;

  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});
router.get("/", (req, res) => {
  const query = `
  SELECT 
    product.*, 
    category.*, 
    product_entry.*, 
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
FROM 
    product
LEFT JOIN
    product_entry ON product.prodID = product_entry.prodID
LEFT JOIN
    category ON product.prodcatID = category.prodcatID
LEFT JOIN
    feedback ON product.prodID = feedback.prodID
GROUP BY 
    product.prodID;
  
`;

  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

router.get("/search", (req, res) => {
  const prodName = req.query.prodName;
  if (!prodName) {
    const query = "SELECT * FROM product";
    db.query(query, (error, results) => {
      if (error) throw error;
      res.json(results);
    });
  } else {
    const query =
      "SELECT * FROM product WHERE prodName LIKE ? WHERE product.QTY > 0;";
    db.query(query, [`%${prodName}%`], (error, results) => {
      if (error) throw error;

      if (results.length > 0) {
        res.json(results);
      } else {
        res.status(404).send("No products found for the given prodName");
      }
    });
  }
});
router.get("/getCart", (req, res) => {
  console.log(req.body);
  const productId = req.body.prodID;
  const colorId = req.body.colorID || null;
  const storageId = req.body.storageID || null;

  const query = `SELECT
  *,
  COALESCE(product_entry.prodPrice, product.prodPrice) AS prodPrice,
  COALESCE(product_entry.prodImg, product.prodImg) AS prodImg,
  product.prodSale,
  COALESCE(
      (COALESCE(product_entry.prodPrice, product.prodPrice) + 
       (COALESCE(product_entry.prodPrice, product.prodPrice) * product.prodSale / 100)),
      COALESCE(product_entry.prodPrice, product.prodPrice)
      
  ) AS prodPriceSale,
  COALESCE(product_entry.prodID, product.prodID) AS prodID
  -- Các trường khác mà bạn muốn lấy từ bảng product và product_entry
FROM
  product
LEFT JOIN
  product_entry ON product.prodID = product_entry.prodID
LEFT JOIN
  color ON product_entry.colorID = color.colorID
  
  LEFT JOIN
    category ON product.prodcatID = category.prodcatID
LEFT JOIN
  storage ON product_entry.storageID = storage.storageID
  LEFT JOIN
  ram ON product_entry.ramID = ram.ramID
WHERE
  product.prodID = ?

  AND (? IS NULL OR product_entry.colorID = ?)
  AND (? IS NULL OR product_entry.storageID = ?)
  AND (? IS NULL OR product_entry.ramID =?)
  ;

`;

  db.query(
    query,
    [productId, colorId, colorId, storageId, storageId],
    (error, results) => {
      if (error) throw error;
      else if (results.length > 1) {
        res.json(results);
        console.log(results);
      } else if (results.length > 0) {
        res.json(results);
        console.log(results);
      } else {
        res.status(404).send("Product not found");
      }
    }
  );
});

router.get("/edit/:id", (req, res) => {
  const productId = req.params.id;
  const query = `
    SELECT 
      product.*, category.*, storage.*, color.*, product_entry.*,
      COALESCE(product_entry.prodPrice, product.prodPrice) AS prodPrice,
      COALESCE(product_entry.prodImg, product.prodImg) AS prodImg,
      COALESCE(product_entry.QTY, product.QTY) AS QTY,
      COALESCE(product_entry.prodID, product.prodID) AS prodID
    FROM product
    LEFT JOIN product_entry ON product.prodID = product_entry.prodID
    LEFT JOIN category ON product.prodcatID = category.prodcatID
    LEFT JOIN storage ON product_entry.storageID = storage.storageID
    LEFT JOIN color ON product_entry.colorID = color.colorID
    LEFT JOIN ram ON product_entry.ramID = ram.ramID
    WHERE product.prodID = ?
  `;
  db.query(query, [productId], (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});
router.get("/:id/ram/:ramID?", (req, res) => {
  const productId = req.params.id;
  const ramId = req.params.ramID || null;
  const query = `SELECT
  *,
  COALESCE(product_entry.prodPrice, product.prodPrice) AS prodPrice,
  COALESCE(product_entry.QTY, product.QTY) AS QTY,
  COALESCE(product_entry.prodImg, product.prodImg) AS prodImg,
  product.prodSale,
  COALESCE(
      (COALESCE(product_entry.prodPrice, product.prodPrice) + 
       (COALESCE(product_entry.prodPrice, product.prodPrice) * product.prodSale / 100)),
      COALESCE(product_entry.prodPrice, product.prodPrice)
      
  ) AS prodPriceSale,
  COALESCE(product_entry.prodID, product.prodID) AS prodID
FROM
  product
LEFT JOIN
  product_entry ON product.prodID = product_entry.prodID
LEFT JOIN
  category ON product.prodcatID = category.prodcatID
LEFT JOIN
  ram ON product_entry.ramID = ram.ramID
WHERE
  product.prodID = ?
AND (? IS NULL OR product_entry.ramID = ?)
  ;`;

  db.query(query, [productId, ramId, ramId], (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});
router.get("/:id/:colorId?/:storageId?", (req, res) => {
  const productId = req.params.id;
  const colorId = req.params.colorId || null;
  const storageId = req.params.storageId || null;

  const query = `SELECT
  *,
  COALESCE(product_entry.prodPrice, product.prodPrice) AS prodPrice,
  COALESCE(product_entry.QTY, product.QTY) AS QTY,
  COALESCE(product_entry.prodImg, product.prodImg) AS prodImg,
  product.prodSale,
  COALESCE(
      (COALESCE(product_entry.prodPrice, product.prodPrice) + 
       (COALESCE(product_entry.prodPrice, product.prodPrice) * product.prodSale / 100)),
      COALESCE(product_entry.prodPrice, product.prodPrice)
      
  ) AS prodPriceSale,
  COALESCE(product_entry.prodID, product.prodID) AS prodID
  -- Các trường khác mà bạn muốn lấy từ bảng product và product_entry
FROM
  product
LEFT JOIN
  product_entry ON product.prodID = product_entry.prodID
LEFT JOIN
  color ON product_entry.colorID = color.colorID
  
  LEFT JOIN
    category ON product.prodcatID = category.prodcatID
LEFT JOIN
  storage ON product_entry.storageID = storage.storageID
  LEFT JOIN
  ram ON product_entry.ramID = ram.ramID
WHERE
  product.prodID = ?

  AND (? IS NULL OR product_entry.colorID = ?)
  AND (? IS NULL OR product_entry.storageID = ?)
  ;

`;

  db.query(
    query,
    [productId, colorId, colorId, storageId, storageId],
    (error, results) => {
      if (error) throw error;
      else if (results.length > 1) {
        res.json(results);
      } else if (results.length > 0) {
        res.json(results);
        console.log(results.length);
      } else {
        res.status(404).send("Product not found");
      }
    }
  );
});



// Add a new product
router.post("/", (req, res) => {
  const newProduct = req.body;
  const catName = req.body.catName;
  const query = "INSERT INTO product SET ?";
  db.query(query, newProduct, (error, results) => {
    if (error) throw error;
    res.status(201).send("Product added successfully");
  });
});
router.post("/variants", (req, res) => {
  const newProduct = req.body;
  const catName = req.body.catName;
  const query = "INSERT INTO product_entry SET ?";
  db.query(query, newProduct, (error, results) => {
    if (error) throw error;
    res.status(201).send("Product added successfully");
  });
});

router.post("/entry", (req, res) => {
  const newProductEntry = req.body;
  const query = "INSERT INTO product_entry SET ?";
  db.query(query, newProductEntry, (error, results) => {
    if (error) throw error;
    res.status(201).send("Product added successfully");
  });
});
// Update an existing product by ID
router.put("/:id", (req, res) => {
  const productId = req.params.id;
  const updatedProduct = req.body;
  const query = "UPDATE product SET ? WHERE prodID = ?";
  db.query(query, [updatedProduct, productId], (error, results) => {
    if (error) throw error;
    res.send("Product updated successfully");
  });
});

// Delete a product by ID
router.delete("/:id", (req, res) => {
  const productId = req.params.id;
  const query = "DELETE FROM product WHERE prodID = ?";
  db.query(query, [productId], (error, results) => {
    if (error) throw error;
    res.send("Product deleted successfully");
  });
});

module.exports = router;
