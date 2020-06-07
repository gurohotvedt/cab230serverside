var express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');

var router = express.Router();


/* GET /stocks/symbols */
router.get("/symbols",function(req,res, next){

// If no query is specified
  if(Object.keys(req.query).length === 0) {
    req.db.from('stocks').select("name", "symbol", "industry")
    .then((rows) => {
      res.status(200).json(rows)
      return;
    })
  } 

  // a query is specified
  else {
      // check if the query in the URL specifies an industry
      if(req.query.industry) {
        var industry = '%' + req.query.industry + '%'
       // find stocks from industries containing the query string
        req.db.from('stocks').select("name", "symbol", "industry").where('industry', 'like', industry)
        .then((rows) => {
  
          // false industry
          if (rows.length == 0) {
            res.status(404).json({ error: true, message:"Industry sector not found"})
            return;
          } 
          
          // valid industry query
          else {
            res.status(200).json(rows)
            return;
          }
        })
      }
      
      else {
  
        // invalid query parameter
        res.status(400).json({error: true, message: "Invalid query parameter: only 'industry' is permitted"});
        return;
      }
    }
});



/* GET /{symbol} */
router.get("/:symbol",function(req,res, next){
  const symbol = req.params.symbol;

  // check if symbol is on the correct format with 1-5 uppercase letters
  if (symbol == symbol.toUpperCase() && symbol.length>0 && symbol.length < 6) {
    
    // check query parameters are defined and throw error if they are
    if(Object.keys(req.query).length !== 0) {
        res.status(400).json({error : true, message: "No query parameters are permitted on this route"})
        return;
    } 
    
    // get stocks with the specified symbol
    req.db.from('stocks').select("*").where('symbol', '=', req.params.symbol)
    .then((rows) => {

      // no stocks with that symbol is found
      if(rows.length == 0) {
        res.status(404).json({ error: true, message: "No entry for symbol in stocks database"})
        return;
      }

      // return correct stock
      res.status(200).json(rows[0])
      return;
    
  })

  // symbol on wrong format
  } else {
    res.status(400).json({error : true, message: "Stock symbol incorrect format - must be 1-5 capital letters"})
  }
});


/* Authorize user */
const authorize = (req, res, next) => {
  const authorization = req.headers.authorization
  let token = null;

  // Retrieve token
  if (authorization && authorization.split(" ").length == 2) {
    token = authorization.split(" ")[1]
  } else {

    // No token found
    res.status(403).json({error: true, message: "Unauthorized user"})
    return;
  }

  // Verify JWT and check expiration date
  try {
    const secretKey = process.env.SECRETKEY; 
    const decoded = jwt.verify(token, secretKey)

    if (decoded.exp > Date.now()) {
      res.status(403).json({ error: true, message : "Token has expired"})
      return;
    }
    // If token is valid, permit user to advance to route
    next()

    // catch invalid token
  } catch (e) {
    res.status(403).json({error: true, message : "Token is not valid", "Error catched": e})
  }
}



/* GET /authed/{symbol} 
include authorize in parameters */
router.get("/authed/:symbol", authorize, function(req,res, next){
  const symbol = req.params.symbol;

  // check if symbol is on the correct format with 1-5 uppercase letters
  if (symbol == symbol.toUpperCase() && symbol.length>0 && symbol.length < 6) {
    req.db.from('stocks').select("*").where('symbol', '=', req.params.symbol)
      .then((rows) => {

        // no stocks with that symbol is found
        if(rows.length == 0) {
          res.status(404).json({ error: true, message: "No entry for symbol in stocks database"})
          return;
        } 

         // No query is specified
        if(Object.keys(req.query).length === 0) {
          // return correct stock
        res.status(200).json(rows[0])
        return;
        } 
        
        // a query is specified
        else {

          // check if the query contains both "to" and "from"
          if (req.query.from || req.query.to) {

            // check if the query only specifies "from"
            if (req.query.from && Object.keys(req.query).length == 1) {
              req.db.from('stocks').select('*').where('timestamp', '>=', req.query.from).where('symbol', '=', req.params.symbol)
                .then((rows) => {

                  // check if there is a result
                if (rows.length == 0) {
                  res.status(404).json({error : true, message : "No entries available for query symbol for supplied date range"})
                  return;
                }

                // return stocks within time range
                res.status(200).json(rows)
                })
              return;
            }

            // check if the query only specifies "to"
            else if (req.query.to && Object.keys(req.query).length == 1) {
              req.db.from('stocks').select('*').where('timestamp', '<=', req.query.to).where('symbol', '=', req.params.symbol)
                .then((rows) => {

                  // check if there is a result
                if (rows.length == 0) {
                  res.status(404).json({error : true, message : "No entries available for query symbol for supplied date range"})
                  return;
                }

                // return stocks within time range
                res.status(200).json(rows)
                })
              return;
            } 

            // check if the query specifies both "from" and "to"
            else if (req.query.to && req.query.from && Object.keys(req.query).length == 2 ) {

              // if "from" date is later than "to" date throw error
              if (req.query.from > req.query.to) {
                res.status(404).json({error : true, message : "No entries available for query symbol for supplied date range"})
                return;
              } 

              // get stocks specified from query from database
              req.db.from('stocks').select('*').where('timestamp', '>=', req.query.from).where('timestamp', '<=', req.query.to).where('symbol', '=', req.params.symbol)
                .then((rows) => {

                  // check if there is a result
                if (rows.length == 0) {
                  res.status(404).json({error : true, message : "No entries available for query symbol for supplied date range"})
                  return;
                }
                // return stocks within time range
                res.status(200).json(rows)
                })
              return;
            }
            
            // the query contains other queries than "to" and "from"
            else {
              res.status(400).json({error : true, message : "Parameters allowed are 'from' and 'to', example: /stocks/authed/AAL?from=2020-03-15"})
              return;
            } 
          } 

          // contains other queries than "to" and/or "from"
          else {
            res.status(400).json({error : true, message : "Parameters allowed are 'from' and 'to', example: /stocks/authed/AAL?from=2020-03-15"})
          }
        }
    })


  } else {
    res.status(400).json({error : true, message: "Stock symbol incorrect format - must be 1-5 capital letters"})
  }
});

module.exports = router;
