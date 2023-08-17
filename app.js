import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";

const saltRounds = 10;

const app = express();

async function startServer() {
  await mongoose.connect("mongodb://127.0.0.1:27017/userDB");
  app.use(express.static("public"));
  app.use(
    bodyParser.urlencoded({
      extended: true,
    })
  );
  //this is used to create sessions and store the session data to mongodb database
  app.use(
    session({
      secret: process.env.SECRETKEY,
      resave: false,
      saveUninitialized: false,
    })
  );
  //initialize the passport here
  app.use(passport.initialize());

  app.use(passport.session());

  const userSchema = new mongoose.Schema({
    email: String,
    password: String,
  });

  userSchema.plugin(passportLocalMongoose);

  //encrypt fileds decides which fields to encrypt
  //   userSchema.plugin(encrypt, {
  //     secret: process.env.SECRET,
  //     encryptedFields: ["password"],
  //   });

  const User = mongoose.model("user", userSchema);

  // use static authenticate method of model in LocalStrategy
  passport.use(User.createStrategy());

  // use static serialize and deserialize of model for passport session support
  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());

  app.get("/", (req, res) => {
    res.render("home.ejs");
  });

  app.get("/login", (req, res) => {
    res.render("login.ejs");
  });

  app.get("/register", (req, res) => {
    res.render("register.ejs");
  });

  app.get("/secrets", (req, res) => {
    if (req.isAuthenticated()) {
      res.render("secrets.ejs");
    } else {
      res.redirect("/login");
    }
  });

  app.post("/register", async (req, res) => {
    // try {
    //   bcrypt.hash(req.body.password, saltRounds, async function (err, hash) {
    //     const newuser = new User({
    //       email: req.body.username,
    //       password: hash,
    //     });
    //     await newuser.save();
    //   });
    //   res.render("secrets.ejs");
    // } catch (error) {
    //   console.error(error);
    //   res.send("An error occurred during registration.");
    // }
    User.register(
      { username: req.body.username, active: false },
      req.body.password,
      function (err, user) {
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, function () {
            res.redirect("/secrets");
          });
        }
      }
    );
  });
  app.post("/login", async (req, res) => {
    let username = req.body.username;
    let password = req.body.password;

    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });

    // const curr_user = await User.findOne({
    //   email: username,
    // }).exec();

    // console.log(curr_user);
    // if (curr_user) {
    //   const result = await bcrypt.compare(password, curr_user.password);
    //   if (result) {
    //     res.render("secrets.ejs");
    //   }
    // }
    req.login(user, (err) => {
      if (err) {
        console.log(err);
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    });
  });

  app.get("/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.log(err);
      } else {
        res.redirect("/");
      }
    });
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
