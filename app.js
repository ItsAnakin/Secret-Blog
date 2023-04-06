require('dotenv').config()
const bodyParser = require("body-parser");
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));

main().catch(err => console.log(err));

async function main(){
    await mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser:true});
    console.log("Connected");
}

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(encrypt,{secret:process.env.SECRET, encryptedFields: ["password"] });

const User = new mongoose.model("User", userSchema);

app.route("/")

    .get(function(req,res){
        res.render("home")
    });

app.route("/login")

    .get(function(req,res){
        res.render("login")
    })

    .post(function(req,res){
        const username = req.body.username;
        const password = req.body.password;

        User.findOne({email: username})
            .then (foundUser => {
                if (foundUser){
                    if (foundUser.password === password){
                        res.render("secrets");
                    }
                }
            })
            .catch(err => console.log(err));
    })

app.route("/register")

    .get(function(req,res){
        res.render("register")
    })

    .post(function(req,res){
        const newUser = new User({
            email: req.body.username,
            password: req.body.password
        });
        newUser.save()
        .then(res.render("secrets"))
        .catch(err => {
            console.log(err);
        });
    })


app.listen(3000,function(){
    console.log("Server started on port 3000");
});