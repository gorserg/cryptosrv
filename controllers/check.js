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
exports.redirectCheck = function (req, res) {
    // remove previous data in session
    delete req.session.appParams;
    // check params
    var params = {
        id: req.params.id,
        type: req.params.type,
        version: req.params.version || 'v1',
        apiVersion : req.params.apiVersion || '0.11'
    };
    var errorMesage = '';

    if (params.type != 'tender' && params.type != 'plan')
        errorMesage += "Недопустимий параметр [" + params.type + "], підтримуються типи tender та plan. \n";
    if (!params.id)
        errorMesage += "Не вказано ідентифікатор об'єкту\n";

    if (errorMesage) {
        throwError(req, res, 400, 'Помилка у параметрах запиту', errorMesage);
        return;
    }
    // save in session
    req.session.appParams = params;
    res.redirect('/check');
}

exports.getCheck = function (req, res) {
    // check for session parameters
    var params = req.session.appParams;
    if (!params) {
        throwError(req, res, 400, "Не ініціалізовано сесію, повторіть перехід");
        return;
    }
    var data = {
        opApiUri: util.format("%s%s/%ss/%s?opt_pretty=1", process.env.OP_API_URI, params.apiVersion, params.type, params.id),
        type: params.type,
        obj_id: params.id
    }

    var options = {
        url: util.format("%s%s/%ss/%s", process.env.OP_API_URI, params.apiVersion, params.type, data.obj_id), // ../api/0.11/ + (type=tender|plan) + 's' + /xxx
        method: 'GET',
        json: true,
        rejectUnauthorized: false // отключена валидация ssl
    };

    var callback = function (error, response, body) {
        if (!error && response.statusCode == 200) {
            data.obj = body.data;
            // get documents
            options.url = util.format("%s%s/%ss/%s/documents", process.env.OP_API_URI, params.apiVersion, params.type, data.obj_id);
            baseRequest(options, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    data.documentsList = body.data;
                    // try find document with signature
                    var signDocument = _.find(body.data, {format: "application/pkcs7-signature", title: "sign.p7s"});
                    data.signDocument = signDocument;
                    // if signature exists - try read file from document.url
                    if(signDocument){
                        options.url = signDocument.url;
                        baseRequest(options, function(error, response, body) {
                            if (!error && response.statusCode == 200) {
                                data.sign = body;
                                res.render('check', {data: data, func: helpers});
                            }
                            else {
                                throwError(req, res, response.statusCode, "Помилка завантаження файлу з підписом із ЦБД", error);
                                return;
                            }
                        });
                    }
                    else
                        res.render('check', {data: data, func: helpers});
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
}