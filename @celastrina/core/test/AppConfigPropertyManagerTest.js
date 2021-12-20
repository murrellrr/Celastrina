/*
 * Copyright (c) 2020, Robert R Murrell.
 *
 * MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
const {CelastrinaError, LOG_LEVEL, AppConfigPropertyManager, Configuration} = require("../Core");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockPropertyManager} = require("./PropertyManagerTest");
const MockAdapter = require("axios-mock-adapter");
const assert = require("assert");
const axios = require("axios");
const moment = require("moment");

/**
 * @typedef AppConfiguration
 * @property {string} key
 * @property {string} value
 * @property {("kvp"|"feature"|"vaultref")} type
 * @property {(null|string)} contentType
 */
/**
 *
 */
class MockAppConfigEndpoint {
    /**
     * @param {string} configStoreName
     * @param {string} [label="development"]
     * @param {string} [version="1.0"]
     */
    constructor(configStoreName, label = "development", version = "1.0") {
        /**@type{MockAdapter}*/this._mock = null;
        this._cs  = configStoreName;
        this._version = version;
        this._label = label;
        this._url = "https://" + configStoreName + ".azconfig.io/kv/";
        this._configurations = {};
        this._correctLabel = false;
        this._correctAuth = false;
    }
    /**
     * @param {AppConfiguration} config
     * @return {MockAppConfigEndpoint}
     */
    mockAppConfiguration(config) {
        this._configurations[config.key] = config;
        return this;
    }
    /**
     * @param {string} URL
     * @return {AppConfiguration}
     * @private
     */
    _getAppConfiguration(URL) {
        for(let _obj in this._configurations) {
            if(this._configurations.hasOwnProperty(_obj)) {
                let _config = this._configurations[_obj];
                if(URL.search(_obj))
                    return _config;
                else
                    return null;
            }
        }
    }
    reset() {
        this._correctLabel = false;
        this._correctAuth = false;
    }
    async start() {
        /**@type{MockAdapter}*/this._mock = new MockAdapter(axios);
        let _this = this;
        this._mock.onGet(new RegExp("https:\/\/demo-celastrinajs-com.vault.azure.net\/secrets\/example-secret.*")).reply((config) => {
            return [200, {
                value: "test_b",
                contentType: "text/plain; charset=utf-8",
                id: "https://demo-celastrinajs-com.vault.azure.net/secrets/example-secret/d4a13ffb0a764302b29dd22cfc464ed4",
                attributes: {
                    enabled: true,
                    created: 1588714677,
                    updated: 1588714677,
                    recoveryLevel: "Purgeable",
                    recoverableDays: 0
                }
            }];
        });
        this._mock.onGet(new RegExp("https:\/\/fake-azure-security-endpoint\/.*")).reply((config) => {
            let _now = moment();
            _now.add(30, "minutes");
            return [200, {
                resource: config.params.get("resource"),
                access_token: "celastrinajs_mock_token",
                expires_on: _now.format()
            }];
        });
        this._mock.onGet(new RegExp(this._url + "*")).reply((config) => {
            let _auth = config.headers.Authorization;
            if(typeof _auth === "undefined" || _auth === null) {
                this._correctAuth = false;
                return [401];
            }
            else if(!_auth.startsWith("Bearer")) {
                this._correctAuth = false;
                return [401];
            }
            else if(config.params.get("label") !== _this._label) {
                this._correctLabel = false;
                return [400, {
                    type: "https://azconfig.io/errors/invalid-argument",
                    title: "Unsupported API version",
                    name: "api-version",
                    detail: "The HTTP resource that matches the request URI '" + config.url + "' does not support the API version specified.",
                    status: 400
                }];
            }
            else {
                this._correctLabel = true;
                this._correctAuth = true;
                /**@type{AppConfiguration}*/let _config = _this._getAppConfiguration(config.url);
                if(_config == null)
                    return [404];
                else {
                    switch(_config.type) {
                        case "kvp":
                            return [200, {
                                etag: "yAxcsTBeBrAuL0VpwiaKqso6usB",
                                key: _config.key,
                                label: _this._label,
                                content_type: _config.contentType,
                                value: _config.value,
                                tags: {},
                                locked: false,
                                last_modified: "2021-10-29T19:38:43+00:00"
                            }];
                        case "feature":
                            return [200, {
                                    etag: "99Lg3nB6CkUBjne1mSTI2MaQGuw",
                                    key: _config.key,
                                    label: _this._label,
                                    content_type: _config.contentType,
                                    value: _config.value,
                                    tags: {},
                                    locked: false,
                                    last_modified: "2021-10-29T12:40:13+00:00"
                            }];
                        case "vaultref":
                            return [200, {
                                etag: "yTIbqkPmbrRElzndCTKFcV5MpFD",
                                key: _config.key,
                                label: _this._label,
                                content_type: _config.contentType,
                                value: _config.value,
                                tags: {},
                                locked: false,
                                last_modified: "2020-05-20T16:53:21+00:00"
                            }];
                    }
                }
            }
        });
    }
    async stop() {
        this._mock.restore();
        this._mock = null;
    }
}

describe("AppConfigPropertyManager", () => {
    describe("#_getProperty(key)", () => {
        it("gets a valid KVP", async () => {
            process.env["IDENTITY_ENDPOINT"] = "https://fake-azure-security-endpoint/";
            process.env["IDENTITY_HEADER"] = "celastrinajs";
            let _config = new Configuration("mock_configuration");
            _config.setAuthorizationOptimistic(true);
            let _appcfg = new AppConfigPropertyManager("mock-app-config");
            _config.setValue(Configuration.CONFIG_PROPERTY, _appcfg);
            let _azcontext = new MockAzureFunctionContext();
            let _mockendpoint = new MockAppConfigEndpoint("mock-app-config");
            _mockendpoint.mockAppConfiguration({key: "mock_kvp_item", type: "kvp", value: "test_a",
                                                       contentType: ""});
            await _config.initialize(_azcontext);
            await _mockendpoint.start();
            let _value = await _config.properties.getProperty("mock_kvp_item");
            await _mockendpoint.stop();
            assert.strictEqual(_value, "test_a", "expected 'test_a'.");
            assert.strictEqual(_mockendpoint._correctLabel, true, "expected correct label sent.");
            assert.strictEqual(_mockendpoint._correctAuth, true, "expected correct authorization sent.");
            delete process.env["IDENTITY_ENDPOINT"];
        });
        it("gets a valid Feature Flag", async () => {
            process.env["IDENTITY_ENDPOINT"] = "https://fake-azure-security-endpoint/";
            process.env["IDENTITY_HEADER"] = "celastrinajs";
            let _config = new Configuration("mock_configuration");
            _config.setAuthorizationOptimistic(true);
            let _appcfg = new AppConfigPropertyManager("mock-app-config");
            _config.setValue(Configuration.CONFIG_PROPERTY, _appcfg);
            let _azcontext = new MockAzureFunctionContext();
            let _mockendpoint = new MockAppConfigEndpoint("mock-app-config");
            _mockendpoint.mockAppConfiguration({key: "mock_ftr_item", type: "feature",
                value: "{\"id\":\"celastrinajs-feature-test\",\"description\":\"\",\"enabled\":true,\"conditions\":{\"client_filters\":[]}}",
                contentType: "application/vnd.microsoft.appconfig.ff+json;charset=utf-8"});
            await _config.initialize(_azcontext);
            await _mockendpoint.start();
            let _value = await _config.properties.getObject("mock_ftr_item");
            await _mockendpoint.stop();
            assert.deepStrictEqual(_value, {id:"celastrinajs-feature-test",description:"",enabled:true,conditions:{client_filters:[]}}, "expected 'test_a'.");
            assert.strictEqual(_mockendpoint._correctLabel, true, "expected correct label sent.");
            assert.strictEqual(_mockendpoint._correctAuth, true, "expected correct authorization sent.");
            delete process.env["IDENTITY_ENDPOINT"];
        });
        it("gets a valid vault reference", async () => {
            process.env["IDENTITY_ENDPOINT"] = "https://fake-azure-security-endpoint/";
            process.env["IDENTITY_HEADER"] = "celastrinajs";
            let _config = new Configuration("mock_configuration");
            _config.setAuthorizationOptimistic(true);
            let _appcfg = new AppConfigPropertyManager("mock-app-config");
            _config.setValue(Configuration.CONFIG_PROPERTY, _appcfg);
            let _azcontext = new MockAzureFunctionContext();
            let _mockendpoint = new MockAppConfigEndpoint("mock-app-config");
            _mockendpoint.mockAppConfiguration({key: "mock_vlt_item", type: "vaultref",
                value: "{\"uri\":\"https://demo-celastrinajs-com.vault.azure.net/secrets/example-secret\"}",
                contentType: "application/vnd.microsoft.appconfig.keyvaultref+json;charset=utf-8"});
            await _config.initialize(_azcontext);
            await _mockendpoint.start();
            let _value = await _config.properties.getProperty("mock_vlt_item");
            await _mockendpoint.stop();
            assert.strictEqual(_value, "test_b", "expected 'test_b'.");
            assert.strictEqual(_mockendpoint._correctLabel, true, "expected correct label sent.");
            assert.strictEqual(_mockendpoint._correctAuth, true, "expected correct authorization sent.");
            delete process.env["IDENTITY_ENDPOINT"];
        });
    });
});
