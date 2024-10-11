const express = require("express");
const router = express.Router();
const db = require("./../models/database");
const jwt = require("jsonwebtoken");
const session = require("express-session");
const { authenToken } = require("./middleware");
const bcrypt = require("bcrypt");
const mailer = require("../utils/mailer");
const { parse } = require("path");

require("dotenv").config();

// Centralized error handling middleware
const errorHandler = (res, error) => {
  console.error("Database error:", error);
  return res.status(500).json({ error: "Internal Server Error" });
};

router.get("/", (req, res) => {
  const query = `
    SELECT 
      users.userID, 
      users.username, 
      users.email,
      user_address.*,
      coalesce(user_address.userID, users.userID) as userID
    FROM users
    LEFT JOIN user_address ON users.userID = user_address.userID;
  `;
  db.query(query, (error, results) => {
    if (error) {
      return errorHandler(res, error);
    }
    res.json(results);
  });
});

// Register
const hashPassword = (password) => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        reject(err);
      } else {
        resolve(hash);
      }
    });
  });
};

const hashEmail = (email) => {
  return new Promise((resolve, reject) => {
    bcrypt
      .hash(email, parseInt(process.env.BYCRYPT_SALT_ROUND))
      .then((hashedEmail) => {
        resolve(hashedEmail);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const registerUser = (username, password, email) => {
  return new Promise((resolve, reject) => {
    const queryCheckDup =
      "SELECT username, email FROM users WHERE username = ? OR email = ?";
    db.query(queryCheckDup, [username, email], (err, result) => {
      if (err) {
        reject(err);
      }

      const duplicateFields = [];
      result.forEach((row) => {
        if (row.username === username) {
          duplicateFields.push("Username");
          console.log("dup : username");
        }
        if (row.email === email) {
          duplicateFields.push("Email");
          console.log("dup : email");
        }
      });

      if (duplicateFields.length > 0) {
        reject({ error: "Duplicate entry for " + duplicateFields.join(", ") });
      }

      hashPassword(password)
        .then((hash) => {
          hashEmail(email)
            .then((hashedEmail) => {
              console.log(
                `${process.env.APP_URL}/users/verify?email=${email}& token=${hashedEmail}`
              );
              mailer
                .sendMail(
                  email,
                  "Verify your email",
                  `
          <h1>Verify your email</h1>
          <p>Click <a href="${process.env.APP_URL}/verify?email=${email}&token=${hashedEmail}">here</a> to verify your email.</p>
          `
                )
                .then((result) => {
                  console.log(result);
                })
                .catch((error) => {
                  console.log(error);
                });
            })
            .catch((error) => {
              reject(error);
            });
          const insertQuery =
            "INSERT INTO users (username, password, email) VALUES (?, ?, ?)";
          db.query(
            insertQuery,
            [username, hash, email],
            (insertErr, insertResult) => {
              if (insertErr) {
                reject(insertErr);
              }
              resolve({ message: "Record inserted successfully." });
            }
          );
        })
        .catch((error) => {
          reject(error);
        });
    });
  });
};

router.post("/register", (req, res) => {
  const { username, password, email } = req.body;

  registerUser(username, password, email)
    .then((result) => {
      return res.status(201).json(result);
    })
    .catch((error) => {
      return errorHandler(res, error);
    });
});

//verify email with token
router.get("/verify", (req, res) => {
  const { email, token } = req.query;
  bcrypt.compare(email, token).then((result) => {
    if (result) {
      const query = "UPDATE users SET verified = 1 WHERE email = ?";
      db.query(query, [email], (err, result) => {
        if (err) {
          console.log(err);
          return errorHandler(res, err);
        }
        return res.status(200).json({ message: "Xác nhận email thành công" });
      });
    } else {
      return res.status(400).json({ error: "Link xác nhận không hợp lệ" });
    }
  });
});

//send email reset password
router.post("/forgot", function (req, res, next) {
  const { email } = req.body;
  //check if email exists in database
  const query = "SELECT * FROM users WHERE email = ? and verified = 1";
  db.query(query, [email], (err, result) => {
    if (err) {
      return errorHandler(res, err);
    }
    if (result.length === 0) {
      return res.status(404).json({ error: "Email not found" });
    } else {
      bcrypt
        .hash(email, parseInt(process.env.BYCRYPT_SALT_ROUND))
        .then((hash) => {
          console.log(
            `${process.env.APP_URL}/users/resetpass?email=${email}& token=${hash}`
          );
          mailer
            .sendMail(
              email,
              "Reset your password",
              `
        <h1>Reset your password</h1>
        <p>Click <a href="${process.env.APP_URL}/resetpass?email=${email}&token=${hash}">here</a> to reset your password.</p>
        `
            )
            .then((result) => {
              return res.status(200).json({ error: "Email sent" });
            })
            .catch((error) => {
              console.log(error);
            });
        });
    }
  });
  //send email
});

//update password with token to reset password
router.put("/resetpass", (req, res) => {
  const { email, token, password } = req.body;
  bcrypt.compare(email, token).then((result) => {
    if (result) {
      bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
          return errorHandler(res, err);
        }
        const updateQuery = "UPDATE users SET password = ? WHERE email = ?";
        db.query(updateQuery, [hash, email], (updateErr, updateResult) => {
          if (updateErr) {
            return errorHandler(res, updateErr);
          }
          return res.status(201).json({ message: "Đổi mật khẩu thành công" });
        });
      });
    } else {
      return res.status(400).json({ error: "Link xác nhận không hợp lệ" });
    }
  });
});

router.post("/googleusers", (req, res) => {
  const { username, email } = req.body;

  const queryCheckDup =
    "SELECT userID, admin FROM users WHERE username = ? OR email = ?";
  db.query(queryCheckDup, [username, email], (err, result) => {
    if (err) {
      return errorHandler(res, err);
    }

    if (result.length > 0) {
      // Nếu username hoặc email đã tồn tại
      const duplicateFields = result.map((row) => {
        return row.username === username ? "Username" : "Email";
      });

      // Lấy userID từ dòng đầu tiên của kết quả truy vấn
      const userId = result[0].userID;
      const email = result[0].email;
      return res.json({
        error: "Duplicate entry for " + duplicateFields.join(", "),
        payload: { userID: userId, email: email },
      });
    } else {
      // Nếu không có trùng lặp, thêm bản ghi mới
      const insertQuery =
        "INSERT INTO users (username, email,verified) VALUES (?, ?,1)";
      db.query(insertQuery, [username, email], (insertErr, insertResult) => {
        if (insertErr) {
          return errorHandler(res, insertErr);
        }
        return res
          .status(201)
          .json({ message: "Record inserted successfully." });
      });
    }
  });
});

//login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const query = "SELECT * FROM users WHERE email = ?";
  db.query(query, [email], (err, results) => {
    if (err) {
      return errorHandler(res, err);
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = results[0];
    // if (user.verified === 0) {
    //   return res.status(404).json({ error: "Email chưa được xác nhận" });
    // } else {
    bcrypt.compare(password, user.password, (err, result) => {
      if (err) {
        return errorHandler(res, err);
      }
      if (!result) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const payload = {
        email: user.email,
        username: user.username,
        admin: user.admin,
        userID: user.userID,
      };
      console.log(payload);
      const token = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      console.log(token);

      res.json({ token, payload });
    });
  });
});

//change password router based on userID and old pasword
router.put("/password", (req, res) => {
  const { userID, oldPassword, newPassword } = req.body;
  const query = "SELECT * FROM users WHERE userID = ?";
  db.query(query, [userID], (err, results) => {
    if (err) {
      return errorHandler(res, err);
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = results[0];
    bcrypt.compare(oldPassword, user.password, (err, result) => {
      if (err) {
        return errorHandler(res, err);
      }
      if (!result) {
        return res
          .status(401)
          .json({ error: "Sai mật khẩu, hãy kiểm tra lại" });
      }
      bcrypt.hash(newPassword, 10, (err, hash) => {
        if (err) {
          return errorHandler(res, err);
        }
        const updateQuery = "UPDATE users SET password = ? WHERE userID = ?";
        db.query(updateQuery, [hash, userID], (updateErr, updateResult) => {
          if (updateErr) {
            return errorHandler(res, updateErr);
          }
          return res.status(201).json({ message: "Đổi mật khẩu thành công" });
        });
      });
    });
  });
});

//resetpassword with random password and send an email to email in body using nodemailer
/**
 * Handles the reset password functionality.
 * Generates a random password, hashes it, and updates the user's password in the database.
 * Sends an email to the user with the new password.
 *
 * @param {string} email - The email of the user requesting a password reset.
 * @returns {Promise} - A promise that resolves with the result of sending the email.
 */
const arrow_function = (email) => {
  return new Promise((resolve, reject) => {
    const randomPassword = Math.random().toString(36).slice(-8);
    bcrypt.hash(randomPassword, 10, (err, hash) => {
      if (err) {
        reject(err);
      } else {
        const updateQuery = "UPDATE users SET password = ? WHERE email = ?";
        db.query(updateQuery, [hash, email], (updateErr, updateResult) => {
          if (updateErr) {
            reject(updateErr);
          } else {
            const subject = "Reset password";
            const content = `
              <!DOCTYPE html>
              <html>
              <head>
              </head>
              <body style="background-color: white; color: black;">
              <div style="background-color: red; color: white; padding: 10px; text-align: center;">
                <h1>Reset password</h1>
              </div>
              
              <div style="margin-top: 20px; font-family: Arial, sans-serif;">
              <p style="font-size: 18px;">Your new password is: ${randomPassword}</p>
              </div>
              </body>
              </html>
            `;
            const to = email;
            mailer
              .sendMail(to, subject, content)
              .then((result) => {
                resolve(result);
              })
              .catch((error) => {
                reject(error);
              });
          }
        });
      }
    });
  });
};

//update dữ liệu vào bảng user, field firstname,lastname,state, flat, address,city where username, import authenToken
router.put("/address", (req, res) => {
  const { username, firstname, lastname, state, flat, street, city, mobile } =
    req.body;
  const query =
    "UPDATE user_address SET firstname = ?, lastname = ?, state = ?, flat = ?, street = ?, city = ?, mobile = ? WHERE userID = (SELECT userID FROM users WHERE username = ?)";
  db.query(
    query,
    [firstname, lastname, state, flat, street, city, mobile, username],
    (err, result) => {
      if (err) {
        return errorHandler(res, err);
      }
      return res.status(201).json({ message: "Record updated successfully." });
    }
  );
});

router.post("/address", (req, res) => {
  const { username, firstname, lastname, state, flat, street, city, mobile } =
    req.body;

  const query =
    "INSERT INTO user_address (firstname, lastname, state, flat, street, city, mobile, userID) VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT userID FROM users WHERE username = ?))";
  db.query(
    query,
    [firstname, lastname, state, flat, street, city, mobile, username],
    (err) => {
      if (err) {
        return errorHandler(res, err);
      }
      return res.status(201).json({ message: "Record created successfully." });
    }
  );
});

router.get("/address/:username", (req, res) => {
  const { username } = req.params;
  const query = `SELECT *
  FROM users
  INNER  JOIN user_address ON users.userID = user_address.userID
  WHERE username = ?;
  `;
  db.query(query, [username], (err, result) => {
    if (err) {
      return errorHandler(res, err);
    }
    if (result.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json(result);
  });
});

router.delete("/address/:username", (req, res) => {
  const { username } = req.params;
  const query = `DELETE FROM user_address 
  WHERE userID = (SELECT userID FROM users WHERE username = ?);
  `;
  db.query(query, [username], (err, result) => {
    if (err) {
      return errorHandler(res, err);
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    return res
      .status(200)
      .json({ message: "Address information deleted successfully." });
  });
});

module.exports = router;
