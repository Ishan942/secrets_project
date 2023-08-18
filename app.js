import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import findOrCreate from "mongoose-findorcreate";

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
    googleId: String,
    secret: String,
  });

  userSchema.plugin(passportLocalMongoose);
  userSchema.plugin(findOrCreate);

  //encrypt fileds decides which fields to encrypt
  //   userSchema.plugin(encrypt, {
  //     secret: process.env.SECRET,
  //     encryptedFields: ["password"],
  //   });

  const User = mongoose.model("user", userSchema);

  // use static authenticate method of model in LocalStrategy
  passport.use(User.createStrategy());

  // use static serialize and deserialize of model for passport session support
  passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
      cb(null, { id: user.id, username: user.username });
    });
  });

  passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
      return cb(null, user);
    });
  });

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        passReqToCallback: true,
      },
      function (request, accessToken, refreshToken, profile, done) {
        console.log(profile);
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
          return done(err, user);
        });
      }
    )
  );

  app.get("/", (req, res) => {
    res.render("home.ejs");
  });

  app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["email", "profile"] })
  );

  app.get(
    "/auth/google/secrets",
    passport.authenticate("google", {
      successRedirect: "/secrets",
      failureRedirect: "/login",
    })
  );

  app.get("/login", (req, res) => {
    res.render("login.ejs");
  });

  app.get("/register", (req, res) => {
    res.render("register.ejs");
  });

  app.get("/secrets", async (req, res) => {
    // if (req.isAuthenticated()) {
    //   res.render("secrets.ejs");
    // } else {
    //   res.redirect("/login");
    // }
    try {
      const users = await User.find({ secret: { $ne: null } });
      res.render("secrets.ejs", { usersecrets: users });
    } catch (err) {
      console.log(err);
    }
  });

  app.get("/submit", (req, res) => {
    if (req.isAuthenticated()) {
      res.render("submit.ejs");
    } else {
      res.redirect("/login");
    }
  });

  app.post("/submit", async (req, res) => {
    const user_secret = req.body.secret;
    console.log(req.user);
    try {
      const curr_user = await User.findById(req.user.id).exec();

      if (curr_user) {
        curr_user.secret = user_secret;
        await curr_user.save();
        res.redirect("/secrets");
      } else {
        res.redirect("/login");
      }
    } catch (err) {
      console.log(err);
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
