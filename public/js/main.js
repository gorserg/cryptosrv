$(function () {

    //demo(["http://192.168.147.147:6543/api/2.2/plans/ff4210adcab54d679e6b8ffdd9565955",
    //    "http://192.168.147.147:6543/api/2.2/plans/9c3860d0e0764f669430126a388f2246",
    //    "http://192.168.147.147:6543/api/2.2/plans/c82f1b61c89445c095e482a91488c6bd",
    //    "http://192.168.147.147:6543/api/2.2/plans/a7812d011248452285f173e626dfaa74"
    //]);

    var options = {
        /* {url} full address of object in API */
        apiResourceUrl: local_data.resourceUrl,
        /* {string} element id (jquery) to render html */
        placeholderId: "#signPlaceholder",
        /* {boolean} verify signature on start, if exist */
        verifySignOnInit: true,
        /* {boolean} if verification error, allow sign whatever */
        ignoreVerifyError: true,
        /* callback obtaining json from API  */
        callbackRender: "renderJson",
        /* callback after put sign */
        callbackPostSign: "postSign",
        /* callback after init all libs */
        callbackOnInit: "onInit",
        /* callback before init all libs */
        callbackBeforeInit: "beforeInit",
        /* callback after verify signature */
        callbackCheckSign: "checkSign",
        /* using jsondiffpatch-formatters for render difference */
        userJsonDiffHtml: true,
        /* custom ajaxOptions options */
        ajaxOptions: {'global': false},
        /* use JSONP for call API method (if CORS not available)  */
        useJsonp: false,
        /* only verify signature, without render template */
        verifyOnly: false,
        /* list of fields, witch will be ignored during verify */
        //ignoreFields : //['documents']
        /* disable loading data from apiResourceUrl on start */
        disableLoadObj: false,
        /* disable loading signature file from apiResourceUrl on start, only if disableLoadObj = false */
        disableLoadSign: false
    }
    /* {string} custom html for render */
    //options.customHtmlTemplate = $('#htmlTemplate').text();
    opSign.init(options);
});

function beforeInit(obj) {
    //console.log('beforeInit', arguments);
}

function onInit(obj) {
    console.log('externalInit', arguments);
}

function renderJson(data) {
    console.log('renderJson', data);
}

function checkSign(signData, currData, diff, ownerInfo, timeInfo, obj) {
    console.log('signData = %O', JSON.parse(signData));
    console.log('currData = %O', JSON.parse(currData));
    console.log('diff = %O', diff);
}

function postSign(signature) {
    $.post('/sign', {sign: signature}).done(function (data) {
        if (data.state) {
            setKeyStatus('Підпису успішно накладено та передано у ЦБД (код файлу <a href="' + data.responseData.data.url + '">' + data.responseData.data.id + '</a>)', 'success');
        }
        else {
            if (data.statusCode == 401)
                location.href = '/error';
            else
                setKeyStatus(data.errorMessage + ' [' + data.error + ']', 'error');
        }
    }).fail(function (error) {
        setKeyStatus('Помилка відправки підпису до ЦДБ. [' + error.statusText + '(' + error.status + ')]', 'error');
    });
}