/**
 * Module dependencies.
 */
var express = require('express');
var session = require('express-session');
var flash = require('express-flash');
var expressValidator = require('express-validator');

var path = require('path');
var lusca = require('lusca');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var MongoStore = require('connect-mongo/es5')(session);
var dotenv = require('dotenv');
var passport = require('passport');
var pjson = require('./package.json');

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 *
 * Default path: .env
 */
dotenv.config({silent: true});
dotenv.config({path: '.env.common'});

/**
 * API keys and Passport configuration.
 */
var passportConf = require('./config/passport');

/**
 * Controllers (route handlers).
 */
var homeController = require('./controllers/index');
var signController = require('./controllers/sign');
var checkController = require('./controllers/check');
var contactController = require('./controllers/contact');
var proxyController = require('./controllers/proxy');
var userController = require('./controllers/user');

var app = express();

// application version for javascript
app.locals.version = pjson.version;

/**
 * Try connect to MongoDB.
 */
mongoose.connect(process.env.MONGOLAB_URI || process.env.MONGODB);
mongoose.connection.on('error', function() {
    console.log('MongoDB Connection Error. Please make sure that MongoDB is running.');

});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(expressValidator());

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(bodyParser.text({type: "x-user/base64-data"}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), {maxAge: 31557600000}));

var sessionParams ={
    secret: process.env.SESSION_SECRET || 'secret',
    resave: true,
    saveUninitialized: true};

if(false)
    sessionParams.cookie ={maxAge: 60000};
else
    sessionParams.store = new MongoStore({ mongooseConnection: mongoose.connection });

app.use(session(sessionParams));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
// security middleware
app.use(lusca.xframe('SAMEORIGIN')); // Enables X-FRAME-OPTIONS headers to help prevent Clickjacking.
app.use(lusca.xssProtection(true));  // Enables X-XSS-Protection headers to help prevent cross site scripting (XSS) attacks in older IE browsers (IE8)

app.use(function(req, res, next) {
    res.locals.user = req.user;
    next();
});
app.use(function(req, res, next) {
    if (/api/i.test(req.path)) {
        req.session.returnTo = req.path;
    }
    next();
});

/**
 * Primary app routes.
 */
app.get('/', homeController.index);
app.get('/error', homeController.getError);

// sign routes
app.get(['/init/:type/sign/:version/:id', '/init/:type/sign/:id'], signController.redirectSign);
app.get('/sign', signController.getSign);
app.post('/sign', signController.postSign);
// check routes
app.get(['/init/:type/check/:version/:id', '/init/:type/sign/:id'], checkController.redirectCheck);
app.get('/check', checkController.getCheck);

// proxy
app.post('/proxy', proxyController.postProxy);
// contact
app.get('/contact', contactController.getContact);
app.post('/contact', contactController.postContact);
// user
app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
app.get('/logout', userController.logout);
app.get('/forgot', userController.getForgot);
app.post('/forgot', userController.postForgot);
app.get('/reset/:token', userController.getReset);
app.post('/reset/:token', userController.postReset);
app.get('/signup', userController.getSignup);
app.post('/signup', userController.postSignup);
app.get('/account', passportConf.isAuthenticated, userController.getAccount);
app.post('/account/profile', passportConf.isAuthenticated, userController.postUpdateProfile);
app.post('/account/password', passportConf.isAuthenticated, userController.postUpdatePassword);
app.post('/account/delete', passportConf.isAuthenticated, userController.postDeleteAccount);
app.get('/account/unlink/:provider', passportConf.isAuthenticated, userController.getOauthUnlink);

/**
 * OAuth authentication routes. (Sign in)
 */
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'user_location'] }));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), function(req, res) {
    res.redirect(req.session.returnTo || '/');
});
app.get('/auth/google', passport.authenticate('google', { scope: 'profile email' }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), function(req, res) {
    res.redirect(req.session.returnTo || '/');
});
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
