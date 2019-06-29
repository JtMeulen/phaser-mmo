require('dotenv').config();

const path = require('path');
const jsdom = require('jsdom');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io').listen(server);
const Datauri = require('datauri');

const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require("passport");
const LocalStrategy = require("passport-local");

const User = require("./public/models/user");

const datauri = new Datauri();
const { JSDOM } = jsdom;

// Database setup
const url = process.env.DATABASEURL;
mongoose.connect(url, { useNewUrlParser: true });
mongoose.Promise = global.Promise;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// PASSPORT CONFIGURATION
app.use(require("express-session")({
  secret: "This is secret text or what?!",
  resave: false,
  saveUninitialized: false,
  name: Math.floor(Math.random() * 1000000000).toString()
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use(function(req, res, next){
  res.locals.currentUser = req.user;
  next();
});

function isLoggedIn(req, res, next) {
  // passport adds this to the request object
  if (req.isAuthenticated()) {
      return next();
  }
  res.redirect('/auth');
}

app.use(express.static(__dirname + '/public'));

app.get('/game', isLoggedIn, function (req, res) {
  startedGame = true;
  res.sendFile(__dirname + '/index.html');
});

app.post('/submit-chatline', isLoggedIn, function (req, res, next) {
  const { message, username } = req.body;
  io.emit('new message', {
    username: username,
    message
  });
  res.status(200).json({ status: 'ok' });
});

app.get('/auth', function (req, res) {
  res.sendFile(__dirname + '/auth.html');
});

app.get('/character_thumbnail/:id', function (req, res) {
  res.sendFile(__dirname + '/public/assets/thumbnails/char_'+req.params.id+'.png');
});

// Auth routes
// handle sign up logic
app.post("/register", function(req, res){
  var newUser = new User({
    username: req.body.username,
    data: {
      characterType: req.body.characterType
    }
  });
  User.register(newUser, req.body.password, function(err, user){
      if(err){
          res.redirect('/auth');
      }
      passport.authenticate("local")(req, res, function(){
          res.redirect('/game');
      });
  });
});

// Login route
app.post("/login", function(req, res, next){
  passport.authenticate("local", {
      successRedirect: "/game",
      failureRedirect: "/auth"
  })(req, res, next);
});

// Log out
app.get("/logout", isLoggedIn, function(req, res){
  req.logout();
  res.redirect("/auth");
});

// get user Saved Data
app.get("/getUserSavedData", isLoggedIn, function(req, res){
  User.findById(res.locals.currentUser.id)
    .then(function(data){
        res.json(data)
    })
    .catch(function(err){
        console.log(err);
    })
});

// update user Saved Data
app.put("/updateUserSavedData", isLoggedIn, function(req, res){
  console.log(req.body);
  User.findByIdAndUpdate(req.body.userId, {$set: {"data": {
    "x": req.body.x,
    "y": req.body.y
  }}})
    .then(function(data){
      res.status(201).json(data)
  });
});

app.get('*', (req, res) => {
  res.redirect('/auth');
});

function setupAuthoritativePhaser() {
  JSDOM.fromFile(path.join(__dirname, 'authoritative_server/index.html'), {
    // To run the scripts in the html file
    runScripts: "dangerously",
    // Also load supported external resources
    resources: "usable",
    // So requestAnimatinFrame events fire
    pretendToBeVisual: true
  }).then((dom) => {
    dom.window.URL.createObjectURL = (blob) => {
      if (blob){
        return datauri.format(blob.type, blob[Object.getOwnPropertySymbols(blob)[0]]._buffer).content;
      }
    };
    dom.window.URL.revokeObjectURL = (objectURL) => {};
    dom.window.gameLoaded = () => {
      let port = process.env.PORT;
      if (port == null || port == "") {
        port = 8082;
      }
      server.listen(port, function () {
        console.log(`Listening on ${server.address().port}`);
      });
    };
    dom.window.io = io;
  }).catch((error) => {
    console.log(error.message);
  });
}

setupAuthoritativePhaser();
