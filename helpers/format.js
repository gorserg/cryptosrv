var moment = require('moment');
var numeral = require('numeral');
var util = require('util');
/*
 prototypes for formatting
 */
Number.prototype.format = function(n, x) {
    var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\.' : '$') + ')';
    return this.toFixed(Math.max(0, ~~n)).replace(new RegExp(re, 'g'), '$& ');
};


exports.formatDate = function (utcDate) {
    return moment(utcDate).format('DD.MM.YYYY, HH:mm:ss');
};

// for parsing object like { "currency": "UAH", "amount": 2, "valueAddedTaxIncluded": false}
exports.formatSum = function(obj){
    var tax = (obj.valueAddedTaxIncluded) ? ("<span class='text-warning'>(включаючи ПДВ.)</span>"):("");
    return util.format("%s %s %s", obj.amount.format(), obj.currency, tax);
};

exports.descStatus = function (status_code) {
    var status = '';
    switch (status_code) {
        case ('active.enquiries'):
        {
            status = 'Період уточнень';
            break;
        }
        case ('active.tendering'):
        {
            status = 'Очікування пропозицій';
            break;
        }
        case ('active.auction'):
        {
            status = 'Період аукціону';
            break;
        }
        case ('active.qualification'):
        {
            status = 'Кваліфікація переможця';
            break;
        }
        case ('active.awarded'):
        {
            status = 'Пропозиції розглянуто';
            break;
        }
        case ('unsuccessful'):
        {
            status = 'Закупівля не відбулась';
            break;
        }
        case ('complete'):
        {
            status = 'Завершена закупівля';
            break;
        }
        case ('cancelled'):
        {
            status = 'Відмінена закупівля';
            break;
        }
    }
    return status;
}
