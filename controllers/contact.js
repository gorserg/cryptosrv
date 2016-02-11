var nodemailer = require("nodemailer");
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD
    }
});

/**
 * GET /contact
 * Contact form page.
 */
exports.getContact = function (req, res) {
    res.render('contact', {
        title: 'Contact'
    });
};

/**
 * POST /contact
 * Send a contact form via Nodemailer.
 */
exports.postContact = function (req, res) {
    req.assert('name', 'Вкажіть і\'мя користувача').notEmpty();
    req.assert('email', 'Вкажіть поштову адресу').isEmail();
    req.assert('message', 'Вкажіть текст повідомлення').notEmpty();

    var errors = req.validationErrors();
    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/contact');
    }

    var from = process.env.GMAIL_USER;
    var name = req.body.name;
    var body = req.body.message;
    var to = process.env.CONTACT_EMAILS;
    var subject = 'Cryptosrv from ' + req.body.email;

    var mailOptions = {
        to: to,
        from: from,
        subject: subject,
        text: body
    };

    transporter.sendMail(mailOptions, function (err) {
        if (err) {
            req.flash('errors', {msg: err.message});
            return res.redirect('/contact');
        }
        req.flash('success', {msg: 'Лист успішно надіслано!'});
        res.redirect('/contact');
    });
};
