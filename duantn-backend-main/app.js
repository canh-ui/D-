const express = require("express");
const session = require("express-session");
const createError = require("http-errors");
const path = require("path");
var bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const app = express();
var favicon = require("serve-favicon");
//inset dotenv
require("dotenv").config();
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://jaguarshop.me",
      "https://jaguarshop.me",
      "http://www.jaguarshop.me",
      "https://www.jaguarshop.me",
      "https://www.jaguarshop.live",
      "https://jaguarshop.live",
      "https://duantn-test.vercel.app/",
    ],
    headers: ["Content-Type"],
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());
const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const productRouter = require("./routes/products");
const adminRouter = require("./routes/admin");
const categoryRouter = require("./routes/category");
const blogRouter = require("./routes/blog");
const orderRouter = require("./routes/orders");
const feedbackRouter = require("./routes/feedback");
const vnpayRouter = require("./routes/order");
const mailRouter = require("./routes/mail");
const wishRouter = require("./routes/wishlist");
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/products", productRouter);
app.use("/admin", adminRouter);
app.use("/category", categoryRouter);
app.use("/blog", blogRouter);
app.use("/orders", orderRouter);
app.use("/order", vnpayRouter);
app.use("/feedback", feedbackRouter);
app.use("/mail", mailRouter);
app.use("/wishlist", wishRouter);
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
