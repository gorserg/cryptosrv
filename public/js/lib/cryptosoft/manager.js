var Crypto = CryptoAutograph;
var SessionPin = null;

$(function () {
    connect(true);
});

function connect(secureMode) {
    CryptoAutograph.connect({
        secureMode: secureMode,
        port: CryptoAutograph.defPort,
        onOpen: function () {
            console.log('OK');
            //connection(true);
        },
        onClose: function () { connection(false); },
        onError: function () { showError('Connection error!'); }
    });
}

function disconnect() {
    CryptoAutograph.disconnect();
}

function connection(fl) {
    fl ? $("#sample-panel").show() : $("#sample-panel").hide();
    fl ? $("#button-disconnect").button().show() : $("#button-disconnect").button().hide();
    fl ? $("#button-connect").button().hide() : $("#button-connect").button().show();
    fl ? $("#button-connect-secure").button().hide() : $("#button-connect-secure").button().show();
    if (!fl)
        hideEnvelopePanel();
    if (fl) {
        enterSessionPin(
            function (pin) {
                wait(true);
                var r = CryptoAutograph.getState(
                    {
                        pin: pin,
                        certs: CryptoAutograph.certsType.NO,
                        config: true
                    },
                    function (state) {
                        wait(false);
                        $("input#options-sign-store_content").prop("checked", state.config.options.sign.storeContent);
                        $("input#options-sign-include_cert").prop("checked", state.config.options.sign.includeCert);
                        $("input#options-encrypt-include_cert").prop("checked", state.config.options.encrypt.includeCert);
                    },
                    commandError
                );
                if (!r)
                    execError("CryptoAutograph.getState()");
            }
        );
    }
    wait(false);
}

function showError(msg) {
    $("#dialog-error-message").text(msg);
    $("#dialog-error").dialog({
        autoOpen: true,
        closeOnEscape: true,
        modal: true,
        buttons: [{
            text: "Close",
            click: function () { $(this).dialog("close"); }
        }]
    });
}

function commandError(code) {
    wait(false);
    if (code == Crypto.codes.ERR_WRONG_SESSION_PASS)
        SessionPin = null;
    var desc = commandResultDesc(code);
    console.log("Command error: code=" + code + ", desc:" + desc);
    showError(desc + " (code=" + code + ")");
}

function execError(msg) {
    wait(false);
    console.error("Error calling function:", msg);
    showError("Error calling function " + (msg ? msg : "") + ".");
}

function wait(v) {
    v ? $("#dialog-wait").show() : $("#dialog-wait").hide();
}

function enterSessionPin(onSuccess) {
    if (SessionPin !== null) {
        onSuccess(SessionPin);
    } else {
        var dialog = $("#dialog-session").dialog({
            autoOpen: false, // height: 300, width: 500,
            modal: true,
            buttons: [{
                text: "OK",
                click: function () {
                    dialog.dialog("destroy");
                    var pin = $("#dialog-session-pin").val();
                    $("#dialog-session-pin").val("");
                    if ($("input#dialog-session-store_pin").is(":checked"))
                        SessionPin = pin;
                    onSuccess(pin);
                }
            }, {
                text: "Cancel",
                click: function () {
                    dialog.dialog("destroy");
                }
            }]
        });
        dialog.dialog("open");
    }
}

function hideEnvelopeProcessedPanel() {
    $("#verify-result").hide();
    $("#verify-result-table tbody").remove();
    $("#verify-result-success").hide();
    $("#verify-result-success-message").text("");
    $("#envelope-processed").hide();
    $("#envelope-processed-message").text("");
    //$("#sender").empty();
    //$("#sender").hide();
}

function hideEnvelopePanel() {
    hideEnvelopeProcessedPanel();
    $("#envelope").hide();
    $("#envelope-processed").hide();
    $("#envelope-title").html("");
    $("#envelope-message").text("");
    $("#verify-result").hide();
    $("#button-verify").hide();
    $("#button-decrypt").hide();
}

function base64Encode(s) {
    //return $.base64.encode(s);
    return window.btoa(unescape(encodeURIComponent(s)));
}
function base64Decode(s) {
    //return $.base64.decode(s)
    return decodeURIComponent(escape(window.atob(s)));
}

/**
 *  Сообщения об ошибках
 */
function commandResultDesc(v) {
    var scope = CryptoAutograph.codes;
    switch (v) {
        case scope.SUCCESS:
            return "ОК";
        case scope.ERR_WRONG_PARAMETER:
            return "Неверное значение обязательного поля команды.";
        case scope.ERR_WRONG_SESSION_PASS:
            return "Неверный пароль сессии.";
        case scope.ERR_USER_ISNOT_LOGGED:
            return "Пользователь не подключил ключ.";
        case scope.ERR_WRONG_ENVELOPE:
            return "Неверный формат электронного конверта.";
        case scope.ERR_SIGNATURE_INVALID:
            return "Подпись неверна";
        case scope.ERR_VERIFIED_DATA_WRONG:
            return "Переданные для проверки ЭЦП данные не совпадают с теми, что содержатся в конверте.";
        case scope.ERR_KEY_FOR_SIGN:
            return "Ключ пользователя запрещено использовать для подписи данных.";
        case scope.ERR_KEY_FOR_ENCRYPT:
            return "Ключ пользователя запрещено использовать для шифрования данных.";
        case scope.ERR_KEY_FOR_DECRYPT:
            return "Не найден ключ для расшифрования данных.";
        case scope.ERR_CERT_NOT_FOUND:
            return "Не обнаружен требуемый сертификат.";
        case scope.ERR_CERT_VALIDITY:
            return "Срок действия сертификата исчерпан или не наступил.";
        case scope.ERR_CERT_VERIF:
            return "Целосность сертификата нарушена.";
        case scope.ERR_CERT_VERIF_IMPOSSIBLE:
            return "Невозможно проверить целосность сертификата. Не найден соответствующий сертификат ЦСК.";
        case scope.ERR_CERT_REVOKED_BY_CRL:
            return "Сертификат отозван. Проверка по списку отозванных сертификатов.";
        case scope.ERR_CERT_REVOKED_BY_OCSP:
            return "Сертификат отозван. Проверка по протоколу OCSP.";
        case scope.ERR_OCSP:
            return "Ошибка протокола OCSP";
        case scope.ERR_TSP:
            return "Ошибка протокола TSP";
        case scope.ERR_TS_VERIFY:
            return "Метка времени неверна (проверка подписи)";
        case scope.ERR_CRYPTO_KERNEL:
            return "Ошибка криптографической обработки данных.";
        case scope.ERR_INTERNAL:
            return "Внутренняя ошибка системы.";
        default:
            return "???";
    }
}

function signMessage() {
    hideEnvelopePanel();
    enterSessionPin(
        function (pin) {
            wait(true);
            var r = CryptoAutograph.signData(
                {
                    pin: pin,
                    //data:base64Encode($("#src-message").val() + new Array(1024*1024*10).join('0')),
                    data: base64Encode($("#src-message").val()),
                    storeContent: $("input#options-sign-store_content").is(":checked"),
                    includeCert: $("input#options-sign-include_cert").is(":checked")
                },
                function (envelope, userKey) {
                    wait(false);
                    $("#envelope").show();
                    $("#envelope-title").html("Підписане повідомлення:");
                    $("#envelope-message").text(envelope);
                    $("#button-verify").button().show();
                    console.log(userKey);
                },
                commandError
            );
            if (!r)
                execError("CryptoAutograph.signData()");
        }
    );
}

function verifyMessage() {
    hideEnvelopeProcessedPanel();

    enterSessionPin(
        function (pin) {
            wait(true);
            var params = {
                pin: pin,
                envelope: $("#envelope-message").text()
            };
            var r = CryptoAutograph.envelopeInfo(
                params,
                function (envInfo) {
                    if (envInfo.envType == EnvelopeType.SIGNED_DATA) {
                        if (!envInfo.internalData)
                            params.data = $.base64.encode($("#src-message").val());
                        var r = CryptoAutograph.verifyData(
                            params,
                            function (info, data) {
                                wait(false);
                                $("#verify-result").show();
                                $("#verify-result-table tbody").remove();
                                $("#verify-result-table").append("<tbody></tbody>");
                                for (var i in info) {
                                    var it = info[i];
                                    var signTime = "-"
                                    if (it.time) {
                                        signTime = new Date(it.time * 1000).toLocaleString();
                                        if (it.timestamp)
                                            signTime += " (позначка часу)";
                                    }
                                    $("#verify-result-table tbody").append("<tr>" +
                                        "<td>" + it.cert.subjectCN + " " + it.cert.serial + "</td>" +
                                        "<td>" + signTime + "</td>" +
                                        "</tr>");
                                }
                                $("#verify-result-success-message").text("Підпис вірний");
                                $("#verify-result-success").show();
                                if (data) {
                                    $("#envelope-processed").show();
                                    $("#envelope-processed-message").text(base64Decode(data));
                                }
                            },
                            commandError
                        );
                        if (!r)
                            execError("CryptoAutograph.verifyData()");

                    } else {
                        showError("Конверт не містить підписаних даних");
                    }
                },
                commandError
            );
            if (!r)
                execError("CryptoAutograph.envelopeInfo()");
        }
    );
}

function encryptMessage() {
    hideEnvelopePanel();
    enterSessionPin(
        function (pin) {
            wait(true);
            var r = CryptoAutograph.getState({
                    pin: pin,
                    certs: CryptoAutograph.certsType.FOR_KEY_ARGEE
                },
                function (state) {
                    wait(false);
                    var list = state.getCertListForAgreement();
                    if (list.length) {
                        var cert = list[0];
                        var dialog = $("#dialog-cert").dialog({
                            autoOpen: false, // width: 250, resizable: false,
                            height: 200,
                            modal: true,
                            buttons: [{
                                text: "OK",
                                click: function () {
                                    dialog.dialog("destroy");
                                    wait(true);
                                    var r = CryptoAutograph.encryptData({
                                            pin: pin,
                                            recipients: [cert],
                                            data: base64Encode($("#src-message").val())
                                            //includeCert: $("input#options-encrypt-include_cert").is(":checked")
                                        },
                                        function (envelope, userKey) {
                                            wait(false);
                                            $("#envelope").show();
                                            $("#envelope-title").html("Зашифроване повідомлення:");
                                            $("#envelope-message").text(envelope);
                                            $("#button-decrypt").button().show();
                                            console.log(userKey);
                                        },
                                        commandError
                                    );
                                    if (!r)
                                        execError("CryptoAutograph.encryptData()");
                                }
                            }, {
                                text: "Cancel",
                                click: function () { dialog.dialog("destroy"); }
                            }
                            ]
                        });

                        var selectNode = $("#dialog-cert-select");
                        selectNode.empty();
                        for (var i in list) {
                            selectNode.append($("<option></option>").attr("value", i).text(list[i].subjectCN));
                        }
                        selectNode.selectmenu('destroy');
                        selectNode.selectmenu({change: function (e, d) { cert = list[d.item.value]; }});
                        dialog.dialog("open");
                    } else {
                        showError("Не знайдено сертифікатів для шифрування");
                    }
                },
                commandError
            );
            if (!r)
                execError("CryptoAutograph.getState()");
        }
    );
}

function decryptMessage() {
    hideEnvelopeProcessedPanel();
    enterSessionPin(
        function (pin) {
            wait(true);
            var r = CryptoAutograph.decryptData(
                {
                    pin: pin,
                    envelope: $("#envelope-message").text()
                },
                function (data, userKey) {
                    wait(false);
                    if (data) {
                        $("#envelope-processed").show();
                        $("#envelope-processed-message").text(base64Decode(data));
                    } else {
                        showError("No data!");
                    }
                    console.log(userKey);
                },
                commandError
            );
            if (!r)
                execError("CryptoAutograph.decryptData()");
        }
    );
}