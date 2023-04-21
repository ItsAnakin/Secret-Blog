require('dotenv').config()
const bodyParser = require("body-parser");
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

main().catch(err => console.log(err));

async function main(){
    await mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser:true});
    console.log("Connected");
}

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, name: user.name });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.route("/")
    .get(function(req,res){
        res.render("home")
    });

// Google Authenctication //////

app.get("/auth/google",
    passport.authenticate('google', { scope: ['profile'] }));

app.get("/auth/google/secrets", 
    passport.authenticate('google', { failureRedirect: "/login" }),
    function(req, res) {
      // Successful authentication, redirect secrets.
      res.redirect("/secrets");
    });
/////////////////////////////////

app.route("/login")

    .get(function(req,res){
        res.render("login")
    })

    .post(function(req,res){
        
        const user = new User({
            username: req.body.username,
            password: req.body.password
        });

        req.login(user, function(err){
            if(err){
                console.log(err);
            } else {
                passport.authenticate("local")(req,res,function(){
                    res.redirect("/secrets");
                });
            }
        })
    });

app.route("/register")

    .get(function(req,res){
        res.render("register")
    })

    .post(function(req,res){
        User.register({username: req.body.username}, req.body.password, function(err,user){
            if(err){
                console.log(err);
                res.redirect("/register");
            } else{
                passport.authenticate("local")(req, res, function(){
                    res.redirect("/secrets");
                });
            }
        });
    });

app.route("/secrets")
    .get(function(req,res){
        User.find({"secret": {$ne: null}})
        .then((foundUser) =>{
            res.render("secrets", {usersWithSecrets: foundUser})
        })
    });

app.route("/submit")
    .get(function(req,res){
        if(req.isAuthenticated()){
            res.render("submit");
        } else {
            res.redirect("/login");
        }
    })
    .post(function(req,res){
        const submittedSecret = req.body.secret;
        User.findById(req.user.id)
            .then(foundUser =>{
                    foundUser.secret = submittedSecret;
                    foundUser.save().then(res.redirect("/secrets"))
                    });
                
    });

app.route("/logout")
    .get(function(req,res){
        req.logout(function(err){
            if(err){
                console.log(err);
            } else {
                res.redirect("/");
            }
        });
    })    

    // .post(function(req, res, next){
    //     req.logout(function(err) {
    //       if (err) { return next(err); }
    //       res.redirect('/');
    //     });
    // });
app.listen(3000,function(){
    console.log("Server started on port 3000");
});