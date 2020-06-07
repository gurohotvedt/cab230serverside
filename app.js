require("dotenv").config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const options = require('./knexfile.js');
const knex = require('knex')(options);
const swaggerUI = require('swagger-ui-express');
yaml = require('yamljs');
swaggerDocument = yaml.load('./docs/swagger.yaml');
const helmet = require('helmet');
const cors = require('cors');

// https fields
const fs = require('fs');
const https = require('https');
const privateKey = fs.readFileSync('/etc/ssl/private/node-selfsigned.key', 'utf8');
const certificate = fs.readFileSync('/etc/ssl/certs/node-selfsigned.crt', 'utf8');
const credentials = {
  key: privateKey, 
  cert: certificate
};

// routes
var stocksRouter = require('./routes/stocks'); // the get endpoints
var userRouter = require('./routes/user'); //for registration and login

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('common'));
app.use(helmet());
app.use(cors());

// token
logger.token('req', (req, res) => JSON.stringify(req.headers))
logger.token('res', (req, res) => {
  const headers = {}
  res.getHeaderNames().map(h => headers[h] = res.getHeader(h))
  return JSON.stringify(headers)
})

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  req.db = knex
  next()
})

// routes on the application
app.use('/', swaggerUI.serve);
app.use('/stocks', stocksRouter);
app.use('/user', userRouter);

// show swagger on home page
app.get('/', swaggerUI.setup(swaggerDocument));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// serve application on https, port 443
const server = https.createServer(credentials,app);
server.listen(443);

module.exports = app;
