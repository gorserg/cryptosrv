/**
 * Module dependencies.
 */
var express = require('express');
var session = require('express-session');
var flash = require('express-flash');
var expressValidator = require('express-validator');

var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var dotenv = require('dotenv');
var mime = require('mime');

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 *
 * Default path: .env
 */
dotenv.load({path: '.env'});
dotenv.load({path: '.env.common'});

/**
 * Controllers (route handlers).
 */
var homeController = require('./controllers/index');
var signController = require('./controllers/sign');
var contactController = require('./controllers/contact');
var proxyController = require('./controllers/proxy');

var app = express();

mime.define({
    'x-user/base64-data': ['text/plain']
});
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(logger('dev'));
app.use(expressValidator());

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(bodyParser.text({type : "x-user/base64-data"}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), {maxAge: 31557600000}));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: {maxAge: 60000}
}));
app.use(flash());

/**
 * Primary app routes.
 */
app.get('/', homeController.index);
// sign
app.get('/sign', signController.index);
app.get('/sign/:tender_id', signController.getSign);
app.post('/sign/:tender_id', signController.postSign);
// proxy
app.post('/proxy', proxyController.postProxy);
// contact
app.get('/contact', contactController.getContact);
app.post('/contact', contactController.postContact);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
