const express = require("express");
const router = express.Router();
const db = require("../models/database");
const { v1: uuidv1 } = require("uuid");
const moment = require("moment");
let $ = require("jquery");
const request = require("request");
const { await } = require("await");
let config = require('config');
const mailer = require("../utils/mailer");
router.put("/update-order/:infoID", (req, res) => {
  console.log(req.body);
  console.log(req.params);
  const infoID = req.params.infoID;
  const status = req.body.status;
  const sql = `UPDATE order_info SET orderStatus = '${status}' WHERE infoID = ${infoID}`;
  db.query(sql, (err, result) => {
    if (err) throw err;
    res.send(result);
  });
});
router.get("/total", (req, res) => {
  const sql = `SELECT * FROM order_info;`;
  db.query(sql, (err, result) => {
    if (err) throw err;
    res.send(result);
    const infoID = result[0].infoID;
    console.log(infoID);
  });
});
router.post("/cod", async function (req, res, next) {
  try {
    if (req.body && req.body.userID) {
      const userID = req.body.userID;
      const uuid = uuidv1();
      const amount = req.body.amount;

      // Start a transaction
      db.beginTransaction(async (err) => {
        if (err) {
          throw err;
        }

        try {
          const insertInfo = `INSERT INTO \`order_info\` (orderCode, payment, totalPay, userID) VALUES (?, 'COD', ?, ?)`;

          // Insert into order_info
          await db.query(insertInfo, [uuid, amount, userID]);

          // Get infoID from the inserted order_info
          const getInfoID = () => {
            return new Promise((resolve, reject) => {
              const sql = `SELECT infoID FROM order_info WHERE orderCode = ?`;
              db.query(sql, [uuid], (err, result) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(result[0].infoID);
                }
              });
            });
          };

          // Get infoID
          const infoID = await getInfoID();

          // Insert into order table
          const orderSql = `INSERT INTO \`order\` (prodID, quantity, colorID, storageID, infoID) VALUES (?, ?, ?, ?, ?)`;
          for (const item of req.body.userCart) {
            await db.query(orderSql, [
              item.prodID,
              item.quantity,
              item.colorID,
              item.storageID,
              infoID,
            ]);
          }

          // Commit the transaction
          db.commit(async (err) => {
            if (err) {
              return db.rollback(() => {
                throw err;
              });
            }
            const getAdress = () => {
              return new Promise((resolve, reject) => {
                db.query(
                  "SELECT * FROM user_address WHERE userID =?",
                  [userID],
                  (err, result) => {
                    if (err) {
                      reject(err);
                    } else {
                      const data = result.map((row) => ({ ...row }));
                      resolve(data);
                    }
                  }
                );
              });
            };
            const address = await getAdress();
            console.log(address);
            const getEmail = () => {
              return new Promise((resolve, reject) => {
                db.query(
                  "SELECT email FROM users WHERE userID = ?",
                  [userID],
                  (err, result) => {
                    if (err) {
                      reject(err);
                    } else {
                      resolve(result[0].email);
                    }
                  }
                );
              });
            };

            // Get the user's email
            const email = await getEmail();
            const to = email;
            console.log(to);
            const subject = "Đặt hàng thành công";
            const content = `
            <!DOCTYPE html>
            <html>
            <head>
            </head>
            <body style="background-color: white; color: black;">
            <div style="background-color: red; color: white; padding: 10px; text-align: center;">
            <h1>Thanks for your order!!!</h1>
            </div>
            <div style="margin-top: 20px; font-family: Arial, sans-serif;">
            <p style="font-size: 18px;">Cảm ơn bạn đã đặt hàng tại <a href="Jaguarshop.live" style="color: #1a0dab; text-decoration: none;">jaguarshop.live</a>, đây là thông tin đơn hàng đã thanh toán</p>
            <div style="background-color: #f8f9fa; padding: 15px; margin-bottom: 20px;">
            <h2 style="margin-top: 0;">Thông tin đơn hàng</h2>
            <p><strong>Địa chỉ giao hàng:</strong> {order.shipping_address}</p>
            </div>
            </div>
            </div>
            </body>
            </html>
            `;
            mailer
              .sendMail(to, subject, content)
              .then((result) => {
                console.log(result);
                console.log("Transaction Complete.");
                res.status(200).json({ success: true });
              })
              .catch((error) => {
                console.error("Error sending mail:", error);
                res.status(500).send("Internal Server Error");
              });
          });
        } catch (error) {
          console.error("Error creating COD order:", error);
          // Rollback on error
          db.rollback(() => {
            res.status(500).send("Internal Server Error");
          });
        }
      });
    } else {
      res.status(400).json({ error: "Missing userID in the request body" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

const queryAsync = (sql, values) => {
  return new Promise((resolve, reject) => {
    db.query(sql, values, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

router.post("/create_payment_url", async function (req, res, next) {
  const userCart = req.body.userCart;

  try {
    console.log(req.body);

    if (req.body && req.body.userID) {
      const userID = req.body.userID;
      const uuid = uuidv1(); // Generate a UUID for the orderCode
      console.log(uuid); // Display the UUID in the console

      // Create a transaction to ensure both operations succeed or fail together
      db.beginTransaction(async (err) => {
        try {
          if (err) throw err;

          const amount = req.body.amount;

          // Insert into order_info
          const insertOrderInfoSQL = `
            INSERT INTO \`order_info\` (orderCode, payment, totalPay, userID)
            VALUES (?, 'Banking', ?, ?)
          `;

          const orderInfoResult = await queryAsync(insertOrderInfoSQL, [
            uuid,
            amount,
            userID,
          ]);
          const infoID = orderInfoResult.insertId;

          // Insert into order table
          const orderSql = `INSERT INTO \`order\` (prodID, quantity, colorID, storageID, infoID) VALUES (?, ?, ?, ?, ?)`;

          for (const item of userCart) {
            await queryAsync(orderSql, [
              item.prodID,
              item.quantity,
              item.colorID,
              item.storageID,
              infoID,
            ]);
          }

          // Execute the insert query

          // Commit the transaction if both queries succeed
          db.commit((commitErr) => {
            if (commitErr) {
              return db.rollback(() => {
                throw commitErr;
              });
            }

            // Generate the payment URL logic
            let date = new Date();
            let createDate = moment(date).format("YYYYMMDDHHmmss");
            let orderId = moment(date).format("DDHHmmss");

            let ipAddr =
              req.headers["x-forwarded-for"] ||
              req.connection.remoteAddress ||
              req.socket.remoteAddress ||
              req.connection.socket.remoteAddress;

            let config = require("config");

            let tmnCode = config.get("vnp_TmnCode");
            let secretKey = config.get("vnp_HashSecret");
            let vnpUrl = config.get("vnp_Url");
            let returnUrl = config.get("vnp_ReturnUrl");
            let bankCode = req.body.bankCode;

            let locale = req.body.language;
            if (locale === null || locale === "") {
              locale = "vn";
            }
            let currCode = "VND";
            let vnp_Params = {
              vnp_Version: "2.1.0",
              vnp_Command: "pay",
              vnp_TmnCode: tmnCode,
              vnp_Locale: locale,
              vnp_CurrCode: currCode,
              vnp_TxnRef: orderId,
              vnp_OrderInfo: uuid, // Assuming you want to use the UUID as the orderInfo
              vnp_OrderType: "other",
              vnp_Amount: amount * 100,
              vnp_ReturnUrl: returnUrl,
              vnp_IpAddr: ipAddr,
              vnp_CreateDate: createDate,
            };

            if (bankCode !== null && bankCode !== "") {
              vnp_Params["vnp_BankCode"] = bankCode;
            }

            vnp_Params = sortObject(vnp_Params);

            let querystring = require("qs");
            let signData = querystring.stringify(vnp_Params, {
              encode: false,
            });
            let crypto = require("crypto");
            let hmac = crypto.createHmac("sha512", secretKey);
            let signed = hmac
              .update(Buffer.from(signData, "utf-8"))
              .digest("hex");
            vnp_Params["vnp_SecureHash"] = signed;
            vnpUrl +=
              "?" +
              querystring.stringify(vnp_Params, {
                encode: false,
              });

            // Send the payment URL as the response
            res.send(vnpUrl);
          });
        } catch (error) {
          console.error("Error creating Banking order:", error);

          // Rollback on error
          db.rollback(() => {
            res.status(500).send("Internal Server Error");
          });
        }
      });
    } else {
      res.status(400).json({ error: "Missing userID in request body" });
    }
  } catch (error) {
    console.error("Error creating payment URL:", error);
    res.status(500).send("Internal Server Error");
  }
});
router.get("/vnpay_return", async function (req, res, next) {
  try {
    const vnp_Params = req.query;
    const { vnp_SecureHash, vnp_SecureHashType, ...otherParams } = vnp_Params;
    const sortedParams = sortObject(otherParams);
    const { vnp_TmnCode, vnp_HashSecret } = require("config");
    const querystring = require("qs");
    const signData = querystring.stringify(sortedParams, { encode: false });
    const crypto = require("crypto");
    const hmac = crypto.createHmac("sha512", vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    console.log("Received vnp_SecureHash:", vnp_SecureHash);
    console.log("Generated signed hash:", signed);

    if (vnp_SecureHash === signed) {
      const orderCode = otherParams.vnp_OrderInfo;
      // Lấy chuỗi ngày thanh toán

      const updateQuery = `UPDATE \`order_info\` SET orderStatus = "Đã thanh toán" WHERE orderCode = ?`;

      try {
        await db.query(updateQuery, [orderCode]);

        try {
          // Render success page
          res.json({
            code: otherParams.vnp_ResponseCode,
            vnp_Amount: otherParams.vnp_Amount,
            vnp_TxnRef: otherParams.vnp_TxnRef,
            vnp_OrderInfo: otherParams.vnp_OrderInfo,
            vnp_TransactionNo: otherParams.vnp_TransactionNo,
            vnp_ResponseCode: otherParams.vnp_ResponseCode,
            vnp_TmnCode: otherParams.vnp_TmnCode,
            vnp_PayDate: otherParams.vnp_PayDate,
            vnp_BankCode: otherParams.vnp_BankCode,
          });
        } catch (mailerError) {
          console.error("Error sending mail:", mailerError);

          // Render error page for mail error
          res.render("error", { error: "Error sending mail" });
        }
      } catch (updateError) {
        console.error("Database update error:", updateError);

        // Render error page for database update error
        res.render("error", { error: "Database update error" });
      }
    } else {
      console.log("Invalid vnp_SecureHash");

      // Render error page for invalid vnp_SecureHash
      res.render("error", { error: "Invalid vnp_SecureHash" });
    }
  } catch (error) {
    console.error("Error processing VNPay return:", error);

    // Render general error page
    res.render("error", { error });
  }
});

//get all order by orderCode
router.get("/", (req, res) => {
  const sql = `SELECT
  *,
  COALESCE(product_entry.prodPrice, product.prodPrice) AS prodPrice,
  COALESCE(product_entry.prodImg, product.prodImg) AS prodImg,
  COALESCE(product_entry.QTY, product.QTY) AS QTY
FROM \`order\`
LEFT JOIN order_info ON \`order\`.infoID = order_info.infoID
LEFT JOIN product ON \`order\`.prodID = product.prodID
LEFT JOIN users ON order_info.userID = users.userID
LEFT JOIN product_entry ON \`order\`.prodID = product_entry.prodID
                    AND \`order\`.colorID = product_entry.colorID
                    AND \`order\`.storageID = product_entry.storageID
LEFT JOIN color ON \`order\`.colorID = color.colorID
LEFT JOIN storage ON \`order\`.storageID = storage.storageID
ORDER BY orderCode;
`;
  db.query(sql, (err, result) => {
    if (err) throw err;
    res.send(result);
  });
});
//get all order by userID
router.get("/user/:userID", (req, res) => {
  const userID = req.params.userID;
  const sql = `SELECT
  *,
  COALESCE(product_entry.prodPrice, product.prodPrice) AS prodPrice,
  COALESCE(product_entry.prodImg, product.prodImg) AS prodImg,
  COALESCE(product_entry.QTY, product.QTY) AS QTY
FROM \`order\`
LEFT JOIN order_info ON \`order\`.infoID = order_info.infoID
LEFT JOIN product ON \`order\`.prodID = product.prodID
LEFT JOIN users ON order_info.userID = users.userID
LEFT JOIN product_entry ON \`order\`.prodID = product_entry.prodID
                    AND \`order\`.colorID = product_entry.colorID
                    AND \`order\`.storageID = product_entry.storageID
LEFT JOIN color ON \`order\`.colorID = color.colorID
LEFT JOIN storage ON \`order\`.storageID = storage.storageID
WHERE order_info.userID = ${userID}
ORDER BY orderCode;`;
  db.query(sql, (err, result) => {
    if (err) throw err;
    res.send(result);
  });
});

function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

module.exports = router;
