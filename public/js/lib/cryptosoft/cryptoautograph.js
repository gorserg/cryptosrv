/**
 * Информация о сертификате
 * @typedef {Object} CertificateInfo
 * @property {String} [serial] Cерийный номер сертификата.
 * @property {String} [subjectCN] Общее имя владельца.
 * @property {String} [issuerCN] Общее имя издателя.
 * @property {String} [subjectKeyId] Идентификатор ключа.
 * @param {Object} [keyUsage]  Разрешения на использования ключа.
 * @param {Boolean} [keyUsage.keyAgreement]  Согласование ключа (шифрование).
 * @param {Boolean} [keyUsage.dataSign]  ЭЦП
 * @param {Boolean} [keyUsage.nonRepudiation] Неотрекаемость
 */

function CertificateInfo (obj) {
	this.subjectCN = "";
	this.issuerCN = "";
	this.serial = "";
	this.subjectKeyId = "";
	this.keyUsage = {
		keyAgreement: false,
		dataSign: false,
		nonRepudiation: false
	};
	if ( obj ) {
		if ( typeof obj.subjectCN === 'string' )
			this.subjectCN = obj.subjectCN;
		if ( typeof obj.issuerCN === 'string' )
			this.issuerCN = obj.issuerCN;
		if ( typeof obj.serial === 'string' )
			this.serial = obj.serial;
		if ( typeof obj.subjectKeyId === 'string' )
			this.subjectKeyId = obj.subjectKeyId;
		if ( obj.keyUsage ) {
			if ( typeof obj.keyUsage.keyAgreement === 'boolean' )
				this.keyUsage.keyAgreement = obj.keyUsage.keyAgreement;
			if ( typeof obj.keyUsage.dataSign === 'boolean' )
				this.keyUsage.dataSign = obj.keyUsage.dataSign;
			if ( typeof obj.keyUsage.nonRepudiation === 'boolean' )
				this.keyUsage.nonRepudiation = obj.keyUsage.nonRepudiation;
		}
	}
}

/**
 * Информация о состоянии сервера
 * @typedef {Object} StateInfo
 * @property {Array.<CertificateInfo>} certs Список сертификатов.
 * @property {Boolean} userLogged  Залогинен ли пользователь.
 */
function StateInfo (obj) {

	this.certs = [];
	this.userLogged = false;
	this.config = {
		options: {
			sign: {
				includeCert: false,
				storeContent: true,
				addTimestamp: false
			},
			encrypt: {
				includeCert: false
			}
		}
	};

	if ( obj ) {
		if ( obj.certs ) {
			for(var i in obj.certs ) {
				this.certs.push(new CertificateInfo(obj.certs[i]));
			}
		}
		if ( typeof obj.userLogged === 'boolean' )
			this.userLogged = obj.userLogged;
		if ( obj.config ) {
			if ( obj.options ) {
				if ( obj.options.sign ) {
					if ( typeof obj.options.sign.includeCert === 'boolean' )
						obj.options.sign.includeCert = obj.options.sign.includeCert;
					if ( typeof obj.options.sign.storeContent === 'boolean' )
						obj.options.sign.storeContent = obj.options.sign.storeContent;
					if ( typeof obj.options.sign.addTimestamp === 'boolean' )
						obj.options.sign.addTimestamp = obj.options.sign.addTimestamp;
				}
				if ( obj.options.encrypt ) {
					if ( typeof obj.options.encrypt.includeCert === 'boolean' )
						obj.options.encrypt.includeCert = obj.options.encrypt.includeCert;
				}
			}
		}
	}


	this.getCertListForAgreement = function() {
		var res = [];
		for(var i in this.certs)  {
			if ( this.certs[i].keyUsage.keyAgreement ) {
				res.push(this.certs[i]);
			}
		}
		return res;
	}
}

/**
 * Тип ключа пользователя
 * @readonly
 * @enum {number}
 */
var UserKeyType = {
	UNDEF: 			0,	// не определен
	EFITKEY_TOKEN: 	1,	// смарт-карта EfitKey
	VIRTUAL_TOKEN: 	2,	// файловый токен
	FILE_STORAGE:	3	// файловый контейнер ключа
};
/**
 * Информация о ключе пользователя
 * @typedef {Object} UserKeyInfo
 * @property {CertificateInfo} 	cert 		Cертификат пользователя.
 * @property {UserKeyType} 		keyType 	Тип ключа.
 * @property {String} 			[serial]  	Серийный номер смарт-карты (только для смарт-карт EfitKey).
 */
function UserKeyInfo (obj) {
	this.cert = obj && obj.cert ? new CertificateInfo(obj.cert) : null;
	this.keyType = obj && obj.keyType && (obj.keyType === UserKeyType.EFITKEY_TOKEN || obj.keyType === UserKeyType.VIRTUAL_TOKEN || obj.keyType === UserKeyType.FILE_STORAGE)
		? obj.keyType : UserKeyType.UNDEF;
	this.serial = obj && obj.sn ? obj.sn : null;
}

/**
 * Информация о подписчике
 * @typedef {Object} SignerInfo
 * @property {CertificateInfo} cert Cертификат подписчика.
 * @property {Number} [time] Время подписи.
 * @property {Boolean} [timestamp] Присутствует метка времени.
 */
function SignerInfo (obj) {
	this.cert = obj && obj.cert ? new CertificateInfo(obj.cert) : null;
	this.time = obj && typeof obj.time === 'number' ? obj.time : 0;
	this.timestamp = obj && typeof obj.timestamp === 'boolean' ? obj.timestamp : false;
}

/**
 * Тип конверта (криптографическом сообщения)
 * @readonly
 * @enum {number}
 */
var EnvelopeType = {
	DATA: 			0,	// данные (тип неизвестен)
	SIGNED_DATA: 	1,	// подписанные данные
	ENVELOPED_DATA:	2	// зашифрованные данные
};
/**
 * Информация о конверте (криптографическом сообщении)
 * @typedef {Object} EnvelopeInfo
 * @property {EnvelopeType} envType 		Тип конверта.
 * @property {Boolean} 		[internalData] 	Конверт содержит данные.
 */
function EnvelopeInfo (obj) {
	this.envType = obj && obj.envType && (obj.envType === EnvelopeType.DATA || obj.envType === EnvelopeType.SIGNED_DATA || obj.envType === EnvelopeType.ENVELOPED_DATA)
		? obj.envType : EnvelopeType.DATA;
	this.internalData = obj && typeof obj.internalData === 'boolean' ? obj.internalData : false;
}

var CryptoAutograph =
{
	defPort: 11111,
	defSecureMode: true,
	secureMode: this.defSecureMode,
	debug: false,

	/**
	 * Подключение к серверу.
	 * @param {Object} params  Параметры запроса.
	 * @param {Boolean} [params.secureMode] Подключение в защищенном или открытом режиме(WSS/WS). По умолчанию - true (WSS).
	 * @param {Number} [params.secureMode]  Порт сервера. По умолчанию - 11111.
	 * @param {Function} [params.onOpen]  	Функция-обработчик события открытия соединения (Websocket.onopen).
	 * @param {Function} [params.onClose]  Функция-обработчик события закрытия соединения (Websocket.onclose).
	 * @param {Function} [params.onError]  Функция-обработчик события ошибки соединения (Websocket.onerror).
	 * */
	connect: function(params) {
		var scope = this;
		try {
			if (typeof MozWebSocket === 'function')
				WebSocket = MozWebSocket;
			if ( this.websocket && this.websocket.readyState == 1 )
				this.websocket.close();
			if ( params && typeof params.secureMode === 'boolean' )
			this.secureMode = params && typeof params.secureMode === 'boolean' ? params.secureMode : this.defSecureMode;
			this.port = params && typeof params.port === 'number' ? params.port : this.defPort;
			//this.websocket = new WebSocket(this.host + ':' + this.port);
			this.websocket = new WebSocket((this.secureMode ? "wss" : "ws") + "://localhost" + ':' + this.port);
			this.websocket.onopen = function(e) {
				if ( scope.debug )
					console.log("Websocket::onopen()");
				scope.commands = [];
				if (params && typeof params.onOpen === 'function')
					params.onOpen(e);
			};
			this.websocket.onclose = function(e) {
				if ( scope.debug )
					console.log("Websocket::onclose()");
				scope.commands = [];
				scope.websocket = null;
				if (params && typeof params.onClose === 'function')
					params.onClose(e);
			};
			this.websocket.onerror = function(e) {
				if ( scope.debug )
					console.error("Websocket::onerror()", e);
				if (params && typeof params.onError === 'function')
					params.onError(e);
			};
			this.websocket.onmessage = function(e) {
				var commands = scope.commands;
				if ( scope.debug )
					console.log("Message received : ", e.data.length < 10000 ? e.data : "Long string");

				var resp = JSON.parse(e.data);
				if ( resp.id !== undefined ) {
					var cmd = null;
					for (var i = 0; i < commands.length; i++)
						if (commands[i].data && commands[i].data.id == resp.id) {
							cmd = commands[i];
							commands.splice(i, 1);
							break;
						}
					if ( cmd ) {
						//if ( typeof cmd.callback === 'function' )
						//	cmd.callback(resp);
						if ( resp.result == scope.codes.SUCCESS ) {
							if (typeof cmd.onSuccess === 'function')
								cmd.onSuccess(resp.data);
						} else {
							if (typeof cmd.onError === 'function')
								cmd.onError(resp.result);
						}
					} else {
						if ( scope.debug )
							console.error("Unknown response!");
					}
				}
			};
		} catch (ex) {
			if ( scope.debug )
				console.error(ex);
		}
	},

	/**
	 * Отключение от сервера.
	 */
	disconnect: function() {
		if (this.websocket)
			this.websocket.close();
	},

	/**
	 * Проверка досупности соединения с сервером.
	 * @return {Boolean}
	 */
	isReady: function() {
		return this.websocket != null && this.websocket.readyState == 1;
	},

	/**
	 * Результат выполнения команды
	 * @readonly
	 * @enum {number}
	 */
	codes: {
		SUCCESS: 					0,	// Команда выполнене успешно. Для команды проверки подписи - "Подпись верна".

		ERR_WRONG_PARAMETER: 		1,	// Неверное значение обязательного поля команды.
		ERR_WRONG_SESSION_PASS: 	2,	// Неверный пароль сессии.
		ERR_USER_ISNOT_LOGGED:		3,  // Пользователь не подключил ключ
		ERR_WRONG_ENVELOPE:			4,  // Неверный формат электронного конверта.
		ERR_SIGNATURE_INVALID:		5,  // Подпись неверна
		ERR_VERIFIED_DATA_WRONG:	6,  // Переданные для проверки ЭЦП данные не совпадают с теми, что содержатся в конверте.
		ERR_KEY_FOR_SIGN:			7,  // Ключ пользователя запрещено использовать для подписи данных.
		ERR_KEY_FOR_ENCRYPT:		8,  // Ключ пользователя запрещено использовать для шифрования данных.
		ERR_KEY_FOR_DECRYPT:		9,  // Не найден ключ для расшифрования данных.
		ERR_CERT_NOT_FOUND:			10, // Не обнаружен требуемый сертификат.
		ERR_CERT_VALIDITY:			11, // Срок действия сертификата исчерпан или не наступил.
		ERR_CERT_VERIF:				12, // Целосность сертификата нарушена.
		ERR_CERT_VERIF_IMPOSSIBLE: 	13, // Невозможно проверить целосность сертификата. Не найден соответствующий сертификат ЦСК.
		ERR_CERT_REVOKED_BY_CRL:	14, // Сертификат отозван. Проверка по списку отозванных сертификатов.
		ERR_CERT_REVOKED_BY_OCSP:	15, // Сертификат отозван. Проверка по протоколу OCSP.
		ERR_OCSP:					20, // Ошибка протокола OCSP
		ERR_TSP:					21, // Ошибка протокола TSP
		ERR_TS_VERIFY:				22, // Метка времени неверна (проверка подписи)
		ERR_CRYPTO_KERNEL: 			100,// Ошибка криптографической обработки данных.
		ERR_INTERNAL: 				101	//Внутренняя ошибка сервера.
	},

	/**
	 * Используемые объекты
	 * Функции, выполняющие команды на сервере принимают следующие аргументы:
	 * 		- 	Параметры команды (опционально в зависимости от команды) - JSON-объект с определенным набором полей.
	 * 		  	Структура определяется в описании команды.
	 * 		-   Функция-обработчик успешного выполнения команды. Определяется в описании команды.
	 * 		-   Функция-обработчик ошибки выполнения команды {onCommandError}.
	 * 	Функции возвращают {Boolean} в зависимости от результата инициализации команды.
	 * 	Выполняются	проверки наличия и валидности аргументов команды, подклчения к серверу и т.п.
	 * 	В случае возврата False - запрос к серверу не выполняется.
	 *
	 * Функция-обработчик ошибки выполнения команды.
	 * @callback onCommandError
	 * @param {Number} code Код ошибки.
	 */

	/**
	 * Функция-обработчик успешного выполнения команды getState.
	 * @callback onGetStateSuccess
	 * @param {StateInfo} data
	 */
	/**
	 * Тип сертификатов, возвращаемые командой getState.
	 * @readonly
	 * @enum {number}
	 */
	certsType: {
		NO:				0,	// не возвращать
		ALL:			1, 	// все сертификаты
		FOR_KEY_ARGEE:	2, 	// только сертификаты для согласования ключей (шифрование)

		check: function(v) { return v === CryptoAutograph.certsType.NO || v === CryptoAutograph.certsType.ALL || v === CryptoAutograph.certsType.FOR_KEY_ARGEE; }
	},
	/**
	 * Получить информацию о состоянии сервера: список сертификатов, залогинен ли пользователь, конфигурация.
	 * @param {Object} params  Параметры запроса.
	 * @param {String} params.pin  Пароль сессии.
	 * @param {certsType} [params.certs]  Тип сертификатов, возвращаемых командой. По умолчанию - не возвращать (CryptoAutograph.certsType.NO).
	 * @param {Boolean} [params.config]  Вернуть информацию о конфигурации. По умолчанию - не возвращать (false).
	 * @param {onGetStateSuccess} onSuccess
	 * @param {onCommandError} onError
	 * @return {Boolean}
	 * */
	getState: function(params, onSuccess, onError) {
		if ( ! this._сheckReadyAndCallbacks(onSuccess, onError) ||
			!params || (typeof params.pin !== 'string') )
			return false;
		var cmd = {
			command: "state",
			pin: params.pin,
			certs: CryptoAutograph.certsType.check(params.certs) ? params.certs : CryptoAutograph.certsType.NO,
			config: typeof params.config === 'boolean' ? params.config : false
		};
		return this._sendCommand(cmd, function(data) { onSuccess(new StateInfo(data)); }, onError );
	},

	/**
	 * Функция-обработчик успешного выполнения команды signData.
	 * @callback onSignSuccess
	 * @param {String} data Конверт с ЭЦП в кодировке Base64.
	 * @param {UserKeyInfo} key Ключ пользователя
	 */
	/**
	 * Подписать данные
	 * @param {Object} params  Параметры запроса.
	 * @param {String} params.data  Данные для подписи в кодировке Base64.
	 * @param {String} params.pin  Пароль сессии.
	 * @param {Boolean} [params.storeContent]  Сохранять данные в конверте. По умолчанию - значение из конфигурации сервера.
	 * @param {Boolean} [params.addTimestamp]  Добавить метку времени. По умолчанию - значение из конфигурации сервера.
	 * @param {Boolean} [params.includeCert]  Добавить сертификат подписчика в конверт. По умолчанию - значение из конфигурации сервера.
	 * @param {onSignSuccess}  onSuccess
	 * @param {onCommandError}  onError
	 * @return {Boolean}
	 */
	signData: function(params, onSuccess, onError) {
		if ( ! this._сheckReadyAndCallbacks(onSuccess, onError) || !params ||
			!this._checkBase64(params.data) || (typeof params.pin !== 'string') )
			return false;
		var cmd = { command:"sign", data: params.data, pin: params.pin };
		if ( typeof params.storeContent === 'boolean' )
			cmd.storeContent = params.storeContent;
		if ( typeof params.addTimestamp === 'boolean' )
			cmd.addTimestamp = params.addTimestamp;
		if ( typeof params.includeCert === 'boolean' )
			cmd.includeCert = params.includeCert;
		return this._sendCommand(cmd, function(data) { onSuccess(data.data, new UserKeyInfo(data.key)); }, onError);
	},

	/**
	 * Функция-обработчик успешного выполнения команды verifyData.
	 * @callback onVerifySuccess
	 * @param {Array.<SignerInfo>} list Список результатов проверки подписей подписчиков (в конверте может быть больше одного подписчика).
	 * @param {String} [data] Данные, извлеченные из конверта в кодировке Base64.
	 */
	/**
	 * Проверить подпись данных
	 * @param {Object} params  Параметры запроса.
	 * @param {Boolean} params.envelope  Конверт с ЭЦП в кодировке Base64.
	 * @param {Boolean} [params.data]  Подписываемые данные (требуются проверки для конвертов не содержащих данных внутри). Кодировка Base64.
	 * @param {onVerifySuccess} onSuccess
	 * @param {onCommandError} onError
	 * @return {Boolean}
	 */
	verifyData: function(params, onSuccess, onError) {
		if ( ! this._сheckReadyAndCallbacks(onSuccess, onError) ||
			!params || !this._checkBase64(params.envelope) || (typeof params.pin !== 'string') )
			return false;
		var cmd = { command: "verify", envelope: params.envelope, pin: params.pin };
		if ( this._checkBase64(params.data) )
			cmd.data = params.data;
		return this._sendCommand(cmd, function(data) {
			var signers = [];
			if ( data && data.signers ) {
				for(var i in data.signers )
					signers.push(new SignerInfo(data.signers[i]));
			}
			onSuccess(signers, data.data);
		}, onError);
	},

	/**
	 * Функция-обработчик успешного выполнения команды encryptData.
	 * @callback onEncryptSuccess
	 * @param {String} data Конверт с зашифрованными данными в кодировке Base64.
	 * @param {UserKeyInfo} key Ключ пользователя
	 */
	 /**
	 * Зашифровать данные.
	 * @param {Object} params  Параметры запроса.
	 * @param {String}	params.data  Данные для шифрования в кодировке Base64.
	 * @param {String} params.pin  Пароль сессии.
	 * @param {Array.<Certificate>} recipients Список сертификатов.
	 * @param {Boolean} [params.includeCert]  Добавить сертификат отправителя в конверт. По умолчанию - значение из конфигурации сервера.
	 * @param {onEncryptSuccess} onSuccess
	 * @param {onCommandError} onError
	 * @return {Boolean}
	 */
	encryptData: function(params, onSuccess, onError) {
		if ( ! this._сheckReadyAndCallbacks(onSuccess, onError) || !params ||
			!this._checkBase64(params.data) || (typeof params.pin !== 'string') ||
			(Object.prototype.toString.call(params.recipients) !== '[object Array]') )
			return false;
		for (var i = 0; i < params.recipients.length; i++)
			if ( !this._checkCert(params.recipients[i]) )
				return false;
		var cmd = { command:"encrypt", data: params.data, pin: params.pin, recipients: params.recipients  };
		if ( typeof params.includeCert === 'boolean' )
			cmd.includeCert = params.includeCert;
		return this._sendCommand(cmd, function(data) { onSuccess(data.data, new UserKeyInfo(data.key)); }, onError);
	},

	/**
	 * Функция-обработчик успешного выполнения команды decryptData.
	 * @callback onDecryptSuccess
	 * @param {String} data Расшифрованные данные в кодировке Base64.
	 * @param {UserKeyInfo} key Ключ пользователя
	 * @param {Certificate} [sender] Cертификат отправителя.
	 */
	/**
	 * Расшифровать данные.
	 * @param {Object} params  Параметры запроса.
	 * @param {Boolean} params.envelope  Конверт с зашифрованными данными в кодировке Base64.
	 * @param {String} params.pin  Пароль сессии.
	 * @param {onDecryptSuccess} onSuccess
	 * @param {onCommandError} onError
	 * @return {Boolean}
	 */
	decryptData: function(params, onSuccess, onError) {
		if ( ! this._сheckReadyAndCallbacks(onSuccess, onError) || !params ||
			!this._checkBase64(params.envelope) || (typeof params.pin !== 'string') )
			return false;
		var cmd = { command:"decrypt", envelope: params.envelope, pin: params.pin  };
		return this._sendCommand(cmd, function(data) { onSuccess(data.data, new UserKeyInfo(data.key)); }, onError);
	},

	/**
	 * Функция-обработчик успешного выполнения команды envelopeInfo.
	 * @callback onEnvelopeInfoSuccess
	 * @param {EnvelopeInfo} data Информация о конверте
	 */
	/**
	 * Получить информацию о конверте.
	 * @param {Object} params  Параметры запроса.
	 * @param {Boolean} params.envelope  Конверт в кодировке Base64.
	 * @param {String} params.pin  Пароль сессии.
	 * @param {onEnvelopeInfoSuccess} onSuccess
	 * @param {onCommandError} onError
	 * @return {Boolean}
	 */
	envelopeInfo: function(params, onSuccess, onError) {
		if ( ! this._сheckReadyAndCallbacks(onSuccess, onError) || !params ||
			!this._checkBase64(params.envelope) || (typeof params.pin !== 'string') )
			return false;
		var cmd = { command:"envelopeinfo", envelope: params.envelope, pin: params.pin  };
		return this._sendCommand(cmd, function(data) { onSuccess(new EnvelopeInfo(data)); }, onError);
	},


	/**
	 * @private
	 */
	commands: [],
	websocket: null,

	_sendCommand: function(data, onSuccess, onError) {
		if ( this.isReady() ) {
			var cmd = {
				data: data,
				onSuccess: onSuccess, 	//typeof onSuccess === 'function' ? onSuccess : this.onSuccessDef,
				onError: onError 		//typeof onError === 'function' ? onError : this.onErrorDef
			};
			cmd.data.id = this.commands.length + 1;
			this.commands.push(cmd);
			var s = JSON.stringify(cmd.data);
			this.websocket.send(s);
			if ( this.debug )
				console.log("Send command: ", s.length < 10000 ? s : "Long string");
			return true;
		} else
			return false;
	},
	_сheckReadyAndCallbacks: function(onSuccess, onError) {
		var r = this.isReady() && (typeof onSuccess === 'function') && (typeof onError === 'function');
		if ( !r && this.debug )
			console.log("_сheckReadyAndCallbacks() fail!");
		return r;
	},
	_checkCert: function(cert) {
		var r = cert !== undefined &&
			(typeof cert.subjectCN === 'string' || (typeof cert.issuerCN === 'string' && typeof cert.serial === 'string') || typeof cert.subjectKeyId === 'string');
		if ( !r && this.debug )
			console.log("_checkCert() fail");
		return r;
	},
	_isString: function(s) {
		return typeof s === 'string';
	},
	_checkBase64: function(s) {
		var r =  this._isString(s) && s.match(/^[A-Za-z0-9+/]+=*$/);
		//var r =  this._isString(s) && s.match(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/);
		if ( !r && this.debug )
			console.log("_checkBase64() fail!");
		return r;
	}
};


