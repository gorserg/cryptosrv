var request = require('request');
var util = require('util');
var u = require('url');
var fs = require('fs');
var http = require('http');
var https = require('https');

var helpers = require('../helpers/format');

var baseRequest = request.defaults({jar: true});

exports.index = function (req, res) {
    res.render('index', {
        title: 'Опис серверу підпису'
    });
};



var getSign = function (req, res, cryproLibVer) {
    var data = {};
    data.opApiUri = process.env.OP_API_URI;
    data.cryproLibVer = cryproLibVer;
    if (req.params.tender_id && req.query.acc_token) {
        data.obj_id = req.params.tender_id;
        data.obj_access_token = req.query.acc_token;
    }
    else
        res.render('errors', {status: 400, message: "Не вказано обов'язкових параметрів (tender_id або acc_token)"});

    var options = {
        url: util.format("%s%s%s", process.env.OP_API_URI, process.env.OP_API_ROUTE, data.obj_id),
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
            var err = {};
            err.status = response.statusCode;
            if (err.status)
                message = "Закупівлю з номером [" + data.tender_id + "] не знайдено";
            else
                message = error;
            res.render('errors', err);
        }
    }
    // call API for data
    baseRequest(options, callback);
};

// IIT crypto libs
exports.getSignV1 = function (req, res) {
    getSign(req, res, 1);
}

// Cryptosoft crypto libs
exports.getSignV2 = function (req, res) {
    getSign(req, res, 2);
}

exports.postSign = function (req, res) {
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
        url: util.format("%s%s%s/documents?acc_token=%s", process.env.OP_API_URI, process.env.OP_API_ROUTE, req.params.tender_id, req.query.acc_token),
        method: 'POST',
        formData: formData,
        headers: {
            'Authorization': "Basic " + new Buffer(process.env.OP_API_AUTH + ":").toString('base64')
        }
    };

    var callback = function (error, response, body) {
        var data = {};
        data.status = response.statusCode == 201; // 201 Created

        if (!error && data.status) {
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

