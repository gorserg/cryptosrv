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

var cacheData = [];

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
    // parse all parameters from url
    if (req.query.resourceUrl) {
        var resourceUrlData = u.parse(req.query.resourceUrl);
        var apiData = resourceUrlData.pathname.split('/');
        var params = {
            resourceUrl: util.format("%s//%s%s", resourceUrlData.protocol, resourceUrlData.host, resourceUrlData.pathname),
            cryptoLibVer: req.query.cryptoLibVer || 'v1',
            accToken: (resourceUrlData.query && resourceUrlData.query.indexOf('acc_token') >= 0) ? resourceUrlData.query.split('acc_token=')[1] : null,
            type: apiData[3],
            objId: apiData[4]
        };
        // save in session
        req.session.appParams = params;
        res.redirect('/sign');
    }
    else {
        throwError(req, res, 400, "Помилка у параметрах запиту", "Відсутній обов'язковий параметр resourceUrl");
        return;
    }
}

exports.getSign = function (req, res) {
    // check for session parameters
    var params = req.session.appParams;
    if (!params) {
        throwError(req, res, 400, "Не ініціалізовано сесію, повторіть перехід");
        return;
    }

    var options = {
        url: params.resourceUrl,
        method: 'GET',
        json: true,
        rejectUnauthorized: false // отключена валидация ssl
    };

    var callback = function (error, response, body) {
        if (!error && response.statusCode == 200) {
            params.obj = body.data;
            // get documents
            options.url = util.format("%s/documents", params.resourceUrl);
            baseRequest(options, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    params.documentsList = body.data;
                    res.render('sign', {data: params, func: helpers});
                }
                else {
                    throwError(req, res, response.statusCode, "Помилка отримання данних по документах із ЦБД", error);
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

exports.observe = function (req, res) {
    var apiUrl = req.query.apiUrl || "https://lb.api-sandbox.openprocurement.org/api/2.1";
    var resourceType = req.query.resourceType || "tender";
    var rowsLimit = req.query.limit || 1000;
    var params = {
        apiUrl: apiUrl,
        resourceType: resourceType,
        rowsLimit: rowsLimit,
        title : (resourceType === "tender") ? ("Список закупівель з підписом"):("Список планів з підписом"),
        itemTitle : (resourceType === "tender") ? ("Закупівля"):("План"),
    };

    var options = {
        url: params.apiUrl,
        method: 'GET',
        json: true,
        rejectUnauthorized: false // отключена валидация ssl
    };

    var callback = function (error, response, body) {
        if (!error && response.statusCode == 200) {
            // filter only with signature
            params.totalCount = body.data.length;
            var signDocuments = _.filter(body.data, function (o) {
                return o.documents && _.find(o.documents, {
                        format: SIGN_CONTENT_TYPE,
                        title: SIGN_FILENAME
                    });
            });
            params.objList = signDocuments;
            params.signedCount = params.objList.length;
            // save to cache
            cacheData[options.url] = params;
            res.render('observe', {data: params, func: helpers});

            // get documents
            //options.url = util.format("%s/documents", params.resourceUrl);
            //baseRequest(options, function (error, response, body) {
            //    if (!error && response.statusCode == 200) {
            //        params.documentsList = body.data;
            //        res.render('sign', {data: params, func: helpers});
            //    }
            //    else {
            //        throwError(req, res, response.statusCode, "Помилка отримання данних по документах із ЦБД", error);
            //        return;
            //    }
            //});
        }
        else {
            throwError(req, res, response.statusCode, "Помилка отримання данних із ЦБД", error);
            return;
        }
    }

    // tenders
    options.url += util.format("/%ss?opt_fields=owner,documents,%sID&descending=1&limit=%d", resourceType, resourceType, rowsLimit);
    if(cacheData[options.url] !== undefined){
        console.log('from cache');
        params = cacheData[options.url];
        res.render('observe', {data: params, func: helpers});
        return;
    }
    // call API for data
    baseRequest(options, callback);
}

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
        url: util.format("%s/documents", params.resourceUrl),
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
            var signDocument = _.find(body.data, {format: SIGN_CONTENT_TYPE, title: SIGN_FILENAME});
            if (signDocument) {
                options.method = 'PUT';
                options.url = util.format("%s/documents/%s", params.resourceUrl, signDocument.id);
            }
            else {
                options.method = 'POST';
                options.url = util.format("%s/documents", params.resourceUrl);
            }
            if (params.accToken)
                options.url += util.format("?acc_token=%s", params.accToken);
            console.log(options);
            callback = function (error, response, body) {
                console.log(response.statusCode);
                data.state = (response.statusCode == 201 || response.statusCode == 200); // 201 - POST, 200 - PUT
                data.statusCode = response.statusCode;
                if (!error && data.state) {
                    data.responseData = JSON.parse(response.body);
                }
                else {
                    data.errorMessage = "Не вдалося записати документ з підписом у ЦБД (" + response.statusMessage + ")";
                    data.error = response.body;
                }
                res.send(data);
            };
            // call POST/PUT
            baseRequest(options, callback);
        }
        else {
            data.errorMessage = "Не вдалося прочитати список документів";
            data.error = error;
            res.send(data);
        }
    }
    // read current documents
    baseRequest(options, callback);
}

