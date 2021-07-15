const {CelastrinaError, LOG_LEVEL, PropertyManager, CachePropertyManager, AppSettingsPropertyManager} = require("../Core");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockResourceAuthorization} = require("./ResourceAuthorizationTest");
const assert = require("assert");

"use strict";

process.env["mock_env_var_one"]   = "mock_env_val_one";
process.env["mock_env_var_two"]   = 42;
process.env["mock_env_var_three"] = true;
process.env["mock_env_var_four"]  = "{\"key\": \"mock_key\", \"value\": \"mock_value\"}";
process.env["mock_env_var_regexp"]  = "/.*/g";

class MockPropertyManager extends PropertyManager {
    constructor() {
        super();
        this._properties = {};
        this.initialized = false;
        this.readied = false;
        this.lastKey = null;
        this.getPropertyInvoked = false;
    }
    reset() {
        this.initialized = false;
        this.readied = false;
        this.lastKey = null;
        this.getPropertyInvoked = false;
    }
    get name() {return "MockPropertyManager";}
    async initialize(azcontext, config) {
        this.initialized = true;
    }
    async ready(azcontext, config) {
        this.readied = true;
    }
    mockProperty(key, value) {
        this._properties[key] = value;
    }
    async _getProperty(key) {
        this.lastKey = key;
        this.getPropertyInvoked = true;
        return this._properties[key];
    }
}
class MockObject {
    constructor(key, value) {
        this._key = key;
        this._value = value;
    }
}

function convertToNewObject(_Object) {
    return new MockObject(_Object.key, _Object.value);
}

describe("PropertyManager", () => {
    describe("#getProperty(key, defaultValue = null)", () => {
        it("Rejects with Not Implemented exception", () => {
            let _pm = new PropertyManager();
            let _err = new CelastrinaError("Not Implemented.");
            assert.rejects(_pm.getProperty("key"), _err);
        });
    });
});
describe("AppSettingsPropertyManager", () => {
    let _pm = new AppSettingsPropertyManager();
    describe("#get name()", () => {
        it("returns 'AppSettingsPropertyManager'", () => {
            assert.strictEqual(_pm.name, "AppSettingsPropertyManager");
        });
    });
    describe("#initialize(azcontext, config)", () => {
        let _azcontext = new MockAzureFunctionContext();
        it("Does not reject", () => {
            assert.doesNotReject(_pm.initialize(_azcontext, {}));
        });
    });
    describe("#ready(azcontext, config)", () => {
        let _azcontext = new MockAzureFunctionContext();
        it("Does not reject", () => {
            assert.doesNotReject(_pm.ready(_azcontext, {}));
        });
    });
    describe("#getProperty(key, defaultValue = null)", () => {
        it("Gets property", async () => {
            assert.strictEqual(await _pm.getProperty("mock_env_var_one"), "mock_env_val_one");
        });
        it("Gets number", async () => {
            assert.strictEqual(await _pm.getNumber("mock_env_var_two"), 42);
        });
        it("Gets boolean", async () => {
            assert.strictEqual(await _pm.getBoolean("mock_env_var_three"), true);
        });
        it("Gets RegExp", async () => {
            let _comp = new RegExp("/.*/g");
            let _regexp = await _pm.getRegExp("mock_env_var_regexp");
            assert.strictEqual(_regexp instanceof RegExp, true, "Instance of RegExp");
            assert.deepStrictEqual(_regexp, _comp, "Same expression.");
        });
        it("Gets object from JSON", async () => {
            assert.deepStrictEqual(await _pm.getObject("mock_env_var_four"), {key: "mock_key", value: "mock_value"});
        });
        it("Gets MockObject from JSON", async () => {
            let _object = await _pm.getObject("mock_env_var_four", null, convertToNewObject);
            assert.deepStrictEqual(_object instanceof MockObject, true, "Instanceof MockObject");
            assert.deepStrictEqual(_object, new MockObject("mock_key", "mock_value"), "Mock object has correct values.");
        });
        it("Gets string default", async () => {
            assert.strictEqual(await _pm.getProperty("mock_env_var_six", "mock_env_val_one"), "mock_env_val_one");
        });
        it("Gets number default", async () => {
            assert.strictEqual(await _pm.getNumber("mock_env_var_six", 24), 24);
        });
        it("Gets boolean default", async () => {
            assert.strictEqual(await _pm.getBoolean("mock_env_var_six", true), true);
        });
        it("Gets RegExp default", async () => {
            let _comp = new RegExp("/.*/g");
            let _regexp = await _pm.getRegExp("mock_env_var_six", new RegExp("/.*/g"));
            assert.strictEqual(_regexp instanceof RegExp, true, "Instance of RegExp");
            assert.deepStrictEqual(_regexp, _comp, "Same expression.");
        });
        it("Gets object from JSON default", async () => {
            assert.deepStrictEqual(await _pm.getObject("mock_env_var_six", {key: "mock_key", value: "mock_value"}),
                                    {key: "mock_key", value: "mock_value"});
        });
        it("Gets MockObject from JSON defaule", async () => {
            let _object = await _pm.getObject("mock_env_var_six", {key: "mock_key", value: "mock_value"}, convertToNewObject);
            assert.deepStrictEqual(_object instanceof MockObject, true, "Instanceof MockObject");
            assert.deepStrictEqual(_object, new MockObject("mock_key", "mock_value"), "Mock object has correct values.");
        });
    });
});

module.exports = {
    MockPropertyManager: MockPropertyManager
};
