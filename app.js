var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
//var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var genericPool = require('generic-pool');
var Mariasql = require('mariasql');
var session = require('express-session');
var cors = require('cors');
var logger = require('./modules/logger');

var employees = require('./routes/employees');
var ratingHistories = require('./routes/ratingHistories');
var units = require('./routes/units');
var statuses = require('./routes/statuses');
var login = require('./routes/login');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(logger('dev'));
app.use(logger.express);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/* Session */
app.use(session({
  secret: 'ogakichika',
  resave: false,
  saveUninitialized: false,
}))

/* CORS */
var corsOptions = {
  origin: true,
  credentials: true
}
app.use(cors(corsOptions));

/* Routing */
app.use('/', login);
app.use('/', employees);
app.use('/', ratingHistories);
app.use('/', units);
app.use('/', statuses);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
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

/* Connection Pooling */
const cpFactory = {
  create: function() {
    return new Promise((resolve, reject) => {
      let client = new Mariasql({
        host: 'localhost',
        user: 'new_commer',
        password: 'new_commer',
        db: 'new_commer',
        charset: 'utf8'
      });
      resolve(client);
    });
  },
  destroy: function(client) {
    return new Promise((resolve) => {
      client.end();
      resolve();
    });
  }
};

const cpOpts = {
  max: 20, 
  min: 5
};

const pool = genericPool.createPool(cpFactory, cpOpts);
app.set('pool', pool);

module.exports = app;
