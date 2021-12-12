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
const {CelastrinaError, CelastrinaValidationError, Configuration, CelastrinaEvent} = require("../Core");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockContext} = require("./ContextTest");
const assert = require("assert");
const moment = require("moment");

describe("CelastrinaEvent", () => {
	describe("#constructor(context, source, data, time, rejected, cause)", () => {
		describe("Default Constructor", () => {
			it("Should set defaults", () => {
				let _context = new MockContext(new Configuration("CelastrinaEvent"));
				let _event = new CelastrinaEvent(_context);
				assert.deepStrictEqual(_event.context, _context, "Expected context.");
				assert.strictEqual(_event.source, null, "Expected null.");
				assert.strictEqual(_event.data, null, "Expected null.");
				assert.strictEqual(_event.isRejected, false, "Expected false.");
				assert.strictEqual(_event.cause, null, "Expected null.");
				assert.strictEqual(_event.time != null, true, "Expected time to not be null.");
			});
			it("Should set source", () => {
				let _context = new MockContext(new Configuration("CelastrinaEvent"));
				let _source = {name: "source"};
				let _event = new CelastrinaEvent(_context, _source);
				assert.deepStrictEqual(_event.context, _context, "Expected context.");
				assert.deepStrictEqual(_event.source, _source, "Expected _source.");
				assert.strictEqual(_event.data, null, "Expected null.");
				assert.strictEqual(_event.isRejected, false, "Expected false.");
				assert.strictEqual(_event.cause, null, "Expected null.");
				assert.strictEqual(_event.time != null, true, "Expected time to not be null.");
			});
			it("Should set data", () => {
				let _context = new MockContext(new Configuration("CelastrinaEvent"));
				let _source = {name: "source"};
				let _data = {name: "data"};
				let _event = new CelastrinaEvent(_context, _source, _data);
				assert.deepStrictEqual(_event.context, _context, "Expected context.");
				assert.deepStrictEqual(_event.source, _source, "Expected _source.");
				assert.deepStrictEqual(_event.data, _data, "Expected _data.");
				assert.strictEqual(_event.isRejected, false, "Expected false.");
				assert.strictEqual(_event.cause, null, "Expected null.");
				assert.strictEqual(_event.time != null, true, "Expected time to not be null.");
			});
			it("Should set time", () => {
				let _context = new MockContext(new Configuration("CelastrinaEvent"));
				let _source = {name: "source"};
				let _data = {name: "data"};
				let _moment = moment().add(10, "days");
				let _event = new CelastrinaEvent(_context, _source, _data, _moment);
				assert.deepStrictEqual(_event.context, _context, "Expected context.");
				assert.deepStrictEqual(_event.source, _source, "Expected _source.");
				assert.deepStrictEqual(_event.data, _data, "Expected _data.");
				assert.strictEqual(_event.time.isSame(_moment), true, "Expected time to be _moment.");
				assert.strictEqual(_event.isRejected, false, "Expected false.");
				assert.strictEqual(_event.cause, null, "Expected null.");
			});
			it("Should set rejected", () => {
				let _context = new MockContext(new Configuration("CelastrinaEvent"));
				let _source = {name: "source"};
				let _data = {name: "data"};
				let _moment = moment().add(10, "days");
				let _event = new CelastrinaEvent(_context, _source, _data, _moment, true);
				assert.deepStrictEqual(_event.context, _context, "Expected context.");
				assert.deepStrictEqual(_event.source, _source, "Expected _source.");
				assert.deepStrictEqual(_event.data, _data, "Expected _data.");
				assert.strictEqual(_event.time.isSame(_moment), true, "Expected time to be _moment.");
				assert.strictEqual(_event.isRejected, true, "Expected true.");
				assert.strictEqual(_event.cause, null, "Expected null.");
			});
			it("Should set cause", () => {
				let _context = new MockContext(new Configuration("CelastrinaEvent"));
				let _source = {name: "source"};
				let _data = {name: "data"};
				let _moment = moment().add(10, "days");
				let _cause = {name: "cause"};
				let _event = new CelastrinaEvent(_context, _source, _data, _moment, true, _cause);
				assert.deepStrictEqual(_event.context, _context, "Expected context.");
				assert.deepStrictEqual(_event.source, _source, "Expected _source.");
				assert.deepStrictEqual(_event.data, _data, "Expected _data.");
				assert.strictEqual(_event.time.isSame(_moment), true, "Expected time to be _moment.");
				assert.strictEqual(_event.isRejected, true, "Expected true.");
				assert.deepStrictEqual(_event.cause, _cause, "Expected _cause.");
			});
		});
		describe("#reject(cause)", () => {
			it("set rejected and cause null", () => {
				let _context = new MockContext(new Configuration("CelastrinaEvent"));
				let _source = {name: "source"};
				let _data = {name: "data"};
				let _event = new CelastrinaEvent(_context, _source, _data);
				assert.strictEqual(_event.isRejected, false, "Expected false.");
				_event.reject();
				assert.strictEqual(_event.isRejected, true, "Expected true.");
				assert.strictEqual(_event.cause, null, "Expected null.");
			});
			it("set rejected and cause", () => {
				let _context = new MockContext(new Configuration("CelastrinaEvent"));
				let _source = {name: "source"};
				let _data = {name: "data"};
				let _cause = {name: "cause"};
				let _event = new CelastrinaEvent(_context, _source, _data);
				assert.strictEqual(_event.isRejected, false, "Expected false.");
				assert.strictEqual(_event.cause, null, "Expected null.");
				_event.reject(_cause);
				assert.strictEqual(_event.isRejected, true, "Expected true.");
				assert.deepStrictEqual(_event.cause, _cause, "Expected _cause.");
			});
		});
	});
});
