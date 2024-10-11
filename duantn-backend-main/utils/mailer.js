const nodeMailer = require("nodemailer");
const mailConfig = require("../config/mail.config");
require("dotenv/config");

exports.sendMail = (to, subject, html) => {
  const transporter = nodeMailer.createTransport({
    host: mailConfig.HOST,
    port: mailConfig.PORT,
    secure: false,
    auth: {
      user: mailConfig.USERNAME,
      pass: mailConfig.PASSWORD,
    },
  });

  const mailOptions = {
    from: mailConfig.FROM_ADDRESS,
    to: to,
    subject: subject,
    html: html,
  };

  return transporter.sendMail(mailOptions);
};
