var request = require('request');
var util = require('util');
var u = require('url');
var fs = require('fs');
var http = require('http');
var https = require('https');
var _ = require('lodash');
var helpers = require('../helpers/format');

const SIGN_FILENAME = 'sign.p7s';
const SIGN_CONTENT_TYPE = 'application/pkcs7-signature';

// enable cookies for all requests
var baseRequest = request.defaults({jar: true});

var throwError = function (req, res, status, message, stack, woRedirect) {
    var err = {
        message: message,
        status: status,
        stack: stack
    }
    req.session.error = err;
    if (!woRedirect)
        res.redirect('/error');
}

// default point of entry
exports.redirectSign = function (req, res) {
    // remove previous data in session
    delete req.session.appParams;
    // check params
    var params = {
        id: req.params.id,
        type: req.params.type,
        version: req.params.version || 'v1',
        acc_token: req.query.acc_token
    };
    var errorMesage = '';

    if (params.type != 'tender' && params.type != 'plan')
        errorMesage += "Недопустимий параметр [" + params.type + "], підтримуються типи tender та plan. \n";
    if (!params.id)
        errorMesage += "Не вказано ідентифікатор об'єкту\n";
    if (!params.acc_token)
        errorMesage += "Не вказано ключ доступу acc_token\n";

    if (errorMesage) {
        throwError(req, res, 400, 'Помилка у параметрах запиту', errorMesage);
        return;
    }
    // save in session
    req.session.appParams = params;
    res.redirect('/sign');
}

exports.getSign = function (req, res) {
    // check for session parameters
    var params = req.session.appParams;
    if (!params) {
        throwError(req, res, 400, "Не ініціалізовано сесію, повторіть перехід");
        return;
    }
    var data = {
        opApiUri: process.env.OP_API_URI,
        type: params.type,
        cryptoLibVer: params.version,
        obj_id: params.id,
        obj_access_token: params.acc_token
    }

    var options = {
        url: util.format("%s%ss/%s", process.env.OP_API_URI, params.type, data.obj_id), // ../api/0.11/ + (type=tender|plan) + 's' + /xxx
        method: 'GET',
        json: true,
        rejectUnauthorized: false // отключена валидация ssl
    };

    var callback = function (error, response, body) {
        if (!error && response.statusCode == 200) {
            data.obj = body.data;
            data.obj_buffer_b64 = new Buffer(JSON.stringify(data.obj)).toString('base64');
            // get documents
            options.url = util.format("%s%ss/%s/documents", process.env.OP_API_URI, params.type, data.obj_id);
            baseRequest(options, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    data.obj.documentsList = body.data;
                    res.render('sign', {data: data, func: helpers});
                }
                else {
                    throwError(req, res, response.statusCode, "Помилка отримання данних із ЦБД", error);
                    return;
                }
            });
        }
        else {
            throwError(req, res, response.statusCode, "Помилка отримання данних із ЦБД", error);
            return;
        }
    }
    // call API for data
    baseRequest(options, callback);
};

exports.postSign = function (req, res) {
    // check for session parameters
    var params = req.session.appParams;
    if (!params) {
        throwError(req, res, 400, "Не ініціалізовано сесію, повторіть перехід", '', true);
        res.send({state: false, statusCode: 401});
        return;
    }
    // file with signature pkcs7
    var formData = {
        'file': {
            value: req.body.sign,
            options: {
                filename: SIGN_FILENAME,
                contentType: SIGN_CONTENT_TYPE
            }
        }
    };
    var options = {
        url: util.format("%s%ss/%s/documents", process.env.OP_API_URI, params.type, params.id),
        method: 'GET',
        json: true
    };
    var callback = function (error, response, body) {
        var data = {};
        data.state = (response.statusCode == 200);
        data.statusCode = response.statusCode;
        if (!error && response.statusCode === 200) {
            options = {
                formData: formData,
                headers: {
                    'Authorization': "Basic " + new Buffer(process.env.OP_API_AUTH + ":").toString('base64')
                }
            };
            // try find document with signature
            var signDocument = _.find(body.data, {format: "application/pkcs7-signature", title: "sign.p7s"});
            if (signDocument) {
                options.method = 'PUT';
                options.url = util.format("%s%ss/%s/documents/%s?acc_token=%s", process.env.OP_API_URI, params.type, params.id, signDocument.id, params.acc_token);
            }
            else {
                options.method = 'POST';
                options.url = util.format("%s%ss/%s/documents?acc_token=%s", process.env.OP_API_URI, params.type, params.id, params.acc_token);
            }
            console.log(options);
            callback = function (error, response, body) {
                data.state = (response.statusCode == 201 || response.statusCode == 200); // 201 - POST, 200 - PUT
                data.statusCode = response.statusCode;
                if (!error && data.state) {
                    data.responseData = JSON.parse(response.body);
                }
                else {
                    data.errorMessage = "Не вдалося записати документ з підписом у ЦБД";
                    data.error = error;
                }
                res.send(data);
            };
            // call POST/PUT
            baseRequest(options, callback);
        }
        else {
            data.errorMessage = "Не вдалося прочитати список документів";
            data.error = error;
        }
    }
    // read current documents
    baseRequest(options, callback);
}

