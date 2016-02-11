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
var pjson = require('./package.json');

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 *
 * Default path: .env
 */
dotenv.load({path: '.env.common'});

/**
 * Controllers (route handlers).
 */
var homeController = require('./controllers/index');
var signController = require('./controllers/sign');
var contactController = require('./controllers/contact');
var proxyController = require('./controllers/proxy');

var app = express();
// application version for javascript
app.locals.version = 'v' + pjson.version;

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
app.use(bodyParser.text({type: "x-user/base64-data"}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), {maxAge: 31557600000}));
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: true,
    saveUninitialized: true,
    cookie: {maxAge: 60000}
}));
app.use(flash());

/**
 * Primary app routes.
 */
app.get('/', homeController.index);

app.get('/error', homeController.getError);


// sign routes
app.get(['/init/:type/sign/:version/:id', '/init/:type/sign/:id'], signController.redirectSign);

app.get('/sign', signController.getSign);
app.post('/sign', signController.postSign);

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
    console.log(err);
    res.render('error', {
     message: err.message,
     error: {}
     });
});


module.exports = app;
