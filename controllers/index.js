/**
 * GET /
 * Home page.
 */
exports.index = function(req, res) {
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl + "sign/:tender_id?acc_token=:acc_token";
    res.render('index', {
        title: 'Опис серверу підпису',
        url : fullUrl
    });
};