var http = require('http');
var https = require('https');
var url = require('url');

exports.postProxy = function (req, res) {
    var address = req.query.address;
    var buf = new Buffer(req.body.data, 'base64');

    var callback = function (response) {
        var chunks = [];
        response.on('data', function (chunk) {
            chunks.push(chunk);
        });

        response.on('end', function () {
            var result = Buffer.concat(chunks).toString('base64');
            res.setHeader('Content-type', 'x-user/base64-data');
            res.send(result);
        });
    };
    var u = url.parse(address);

    var options = {
        host: u.hostname,
        path: u.pathname,
        port: u.port,
        method: 'POST'
    };
    var request;
    if(u.protocol == 'https:')
        request = https.request(options, callback);
    else
        request = http.request(options, callback);
    request.write(buf);
    request.end();
}