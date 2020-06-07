var express = require('express');
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var router = express.Router();


/* POST /register. */
router.post('/register', function(req, res, next) {
  const email = req.body.email
  const password = req.body.password

  // check if both email and password-fields are filled
  if (!email || !password) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete - email and password needed"
    })
    return;
  }

  // check if the email is valid by checking the use of @
  if (!email.includes("@")) {
    res.status(400).json({ error: true, message: "Use a valid e-mail with @"})
    return;
  }

  // check if the user already exists
  const queryUsers = req.db.from("users").select("*").where("email", "=", email)
  queryUsers
    .then((users) => {
      if (users.length > 0) {
        console.log("User already exists");
        res.status(409).json({ error: true, message:"User already exists!"})
        return;
      }

      // if the user does not already exist, insert user into the database
      const saltRounds = 10;
      const hash = bcrypt.hashSync(password, saltRounds)
      return req.db.from("users").insert({ email, hash})
    })
    .then (() => {
      res.status(201).json({ success: true, message: "User created"}).statusMessage("Created");
    })
});



/* POST /login. */
router.post('/login', function(req, res, next) {

  // Retrieve email and password from req.body
  const email = req.body.email
  const password = req.body.password

  // verify that both email and password are provided
  if( !email || !password) {
    res.status(400).json({
      error:true,
      message: "Request body incomplete - email and password needed"
    }).statusMessage("Bad Request")
    return;
  }

  // Determine if user already exists in table 
  const queryUsers = req.db.from("users").select("*").where("email", "=", email)
  queryUsers
    .then((users) => {
      if (users.length == 0) {
        res.status(401).json({ error: true, message:"User does not exist"})
        return;
      }

      //User exists, verify password
      const user = users[0]
      return bcrypt.compare(password, user.hash)
    })
    .then((match) => {

      // incorrect password, throw error
      if (!match) {
        res.status(401).json({ error: true, message: "Incorrect password"})
        return;
      }

      // correct password, return JWT token
      const secretKey = process.env.SECRETKEY; // key obtained from .env
      const expires_in = 60 * 60 * 24 //token valid for 24 hours
      const exp = Math.floor(Date.now() / 1000) + expires_in
      const token = jwt.sign({ email, exp}, secretKey)
      res.json({ token_type: "Bearer", token, expires_in})
    })
});


module.exports = router;
