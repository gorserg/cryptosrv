var request = require('request');
var util = require('util');
var u = require('url');
var fs = require('fs');
var http = require('http');
var https = require('https');

var helpers = require('../helpers/format');

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
            res.render('sign', {data: data, func: helpers});
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
                filename: 'sign.p7s',
                contentType: 'application/pkcs7-signature'
            }
        }
    };
    var options = {
        url: util.format("%s%ss/%s/documents?acc_token=%s", process.env.OP_API_URI, params.type, params.id, params.acc_token), // ../api/0.11/ + (type=tender|plan) + 's' + /xxx
        method: 'POST',
        formData: formData,
        headers: {
            'Authorization': "Basic " + new Buffer(process.env.OP_API_AUTH + ":").toString('base64')
        }
    };
    var callback = function (error, response, body) {
        var data = {};
        data.state = response.statusCode == 201; // 201 Created
        data.statusCode = response.statusCode;
        if (!error && data.state) {
            data.responseData = JSON.parse(response.body);
        }
        else {
            data.errorMessage = "Не вдалося записати документ з підписом у ЦБД";
            data.error = error;
        }
        res.send(data);
    }
    // call API for data
    baseRequest(options, callback);
}

