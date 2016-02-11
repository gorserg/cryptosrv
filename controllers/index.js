/**
 * GET /
 * Home page.
 */
exports.index = function(req, res) {
    var sampleUri = req.protocol + '://' + req.get('host') + req.originalUrl;
    res.render('index', {
        title: 'Опис серверу підпису',
        url : sampleUri
    });
};

exports.getError = function(req, res) {
    var err = req.session.error;
    res.render('error', {
        message: err.message,
        error: err
    });
}