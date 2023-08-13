import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import md5 from "md5";

const app = express();

async function startServer() {
  await mongoose.connect("mongodb://127.0.0.1:27017/userDB");
  app.use(express.static("public"));
  app.use(
    bodyParser.urlencoded({
      extended: true,
    })
  );

  const userSchema = new mongoose.Schema({
    email: String,
    password: String,
  });
  //encrypt fileds decides which fields to encrypt
  //   userSchema.plugin(encrypt, {
  //     secret: process.env.SECRET,
  //     encryptedFields: ["password"],
  //   });

  const User = mongoose.model("user", userSchema);

  app.get("/", (req, res) => {
    res.render("home.ejs");
  });

  app.get("/login", (req, res) => {
    res.render("login.ejs");
  });

  app.get("/register", (req, res) => {
    res.render("register.ejs");
  });

  app.post("/register", async (req, res) => {
    try {
      const newuser = new User({
        email: req.body.username,
        password: md5(req.body.password),
      });
      console.log(req.body.username);

      await newuser.save();

      res.render("secrets.ejs");
    } catch (error) {
      console.error(error);
      res.send("An error occurred during registration.");
    }
  });
  app.post("/login", async (req, res) => {
    let username = req.body.username;
    let password = md5(req.body.password);

    const curr_user = await User.findOne({
      email: username,
    }).exec();
    if (curr_user) {
      if (curr_user.password == password) {
        res.render("secrets.ejs");
      }
    }
  });

  app.listen(3000, function (req, res) {
    console.log("Server started on port 3000.");
  });
}
try {
  startServer();
} catch (err) {
  console.log(err);
}
