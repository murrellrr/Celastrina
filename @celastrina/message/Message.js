/*
 * Copyright (c) 2021, KRI, LLC.
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
/**
 * @author Robert R Murrell
 * @copyright Robert R Murrell
 * @license MIT
 */
"use strict";

const moment = require("moment");
const { v4: uuidv4 } = require('uuid');
const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, JsonProperty, Configuration,
      BaseContext, BaseFunction} = require("@celastrina/core");

/**
 * @typedef {_AzureFunctionContext} _AzureMessageContext
 * @property {string} message
 */

const MESSAGE_ENVIRONMENT = {
    PRODUCTION: 0,
    MONITOR: 1,
    TEST: 2,
    DEVELOPMENT: 3
};
/**
 * Header
 * @author Robert R Murrell
 */
class Header {
    /**
     * @param {null|string} resource
     * @param {null|string} action
     * @param {null|string} source
     * @param {moment.Moment} [published=moment()]
     * @param {null|moment.Moment} [expires=null]
     * @param {string} [messageId=uuidv4()]
     * @param {string} [traceId=uuidv4()]
     * @param {number} [environment=MESSAGE_ENVIRONMENT.PRODUCTION]
     */
    constructor(resource = null, action = null, source = null, published = moment(), expires = null,
                messageId = uuidv4(), traceId = uuidv4(), environment = MESSAGE_ENVIRONMENT.PRODUCTION) {
        /**@type{string}*/this._resource = resource;
        /**@type{string}*/this._action = action;
        /**@type{string}*/this._source = source;
        /**@type{moment.Moment}*/this._published = published;
        /**@type{string}*/this._messageId = messageId;
        /**@type{string}*/this._traceId = traceId;
        /**@type{number}*/this._environment = environment;
        if(expires == null)
            /**@type{moment.Moment}*/this._expires = moment(published).add(1, "year");
        else
            /**@type{moment.Moment}*/this._expires = expires;
    }
    /**@returns{string}*/get resource() {return this._resource;}
    /**@returns{string}*/get action() {return this._action;}
    /**@returns{string}*/get source() {return this._source;}
    /**@type{moment.Moment}*/get published() {return this._published;}
    /**@type{moment.Moment}*/get expires() {return this._expires;}
    /**@returns{string}*/get messageId() {return this._messageId}
    /**@returns{string}*/get traceId() {return this._traceId}
    /**@type{number}*/get environment() {return this._environment;}
    /**@type{boolean}*/get isExpired() {
        let now = moment();
        return now.isBefore(this._expires);
    }
}
/**
 * Message
 * @author Robert R Murrell
 */
class Message {
    /**
     * @param {Header} [header=null]
     * @param {*} [payload=null]
     */
    constructor(header = null, payload = null) {
        /**@type{Header}*/this._header = header;
        /**@type{*}*/this._payload = payload;
    }
    /**@returns{Header}*/get header() {return this._header;}
    /**@param{Header}header*/set header(header) {this._header = header;}
    /**@returns{*}*/get payload() {return this._payload;}
    /**@param{*}payload*/set payload(payload) {this._payload = payload;}
    /**
     * @param {Message} message
     * @returns {Promise<string>}
     */
    static async marshall(message) {
        return new Promise((resolve, reject) => {
            if(typeof message === "undefined" || message == null)
                reject(CelastrinaValidationError.newValidationError("Invalid Message.", "Message"));
            else if (typeof message._header === "undefined" || message._header == null)
                reject(CelastrinaValidationError.newValidationError("Invalid Message Header.", "Message._header"));
            else {
                message._object = {_mime: "com.celastrinajs.message"};
                message._header._object = {_mime: "com.celastrinajs.message.header"};
                resolve(JSON.stringify(message));
            }
        });
    }
    /**
     * @param {string} message
     * @returns {Promise<Message>}
     */
    static async unmarshall(message) {
        return new Promise((resolve, reject) => {
            let msg = JSON.stringify(message);
            if(typeof msg !== "object")
                reject(CelastrinaValidationError.newValidationError("Invalid message.", "Message"));
            else {
                if(!msg.hasOwnProperty("_object") || typeof msg._object !== "object")
                    reject(CelastrinaValidationError.newValidationError("Invalid Message.", "Message._object"));
                if(!msg._object.hasOwnProperty("_mime") || msg._object._mime !== "application/json; com.celastrinajs.message")
                    reject(CelastrinaValidationError.newValidationError("Invalid Message type.", "Message._object._mime"));
                if(!msg._header.hasOwnProperty("_header") || typeof msg._header !== "object")
                    reject(CelastrinaValidationError.newValidationError("Invalid Header.", "Message._header"));
                if(!msg._header.hasOwnProperty("_object") || typeof msg._header._object !== "object")
                    reject(CelastrinaValidationError.newValidationError("Invalid Header.", "Message._header._object"));
                if(!msg._header._object.hasOwnProperty("_mime") || msg._header._object._mime !== "application/json; com.celastrinajs.message.header")
                    reject(CelastrinaValidationError.newValidationError("Invalid type.", "Message._header._object._mime"));
                let _message = new Message();
                Object.assign(_message, msg);
                resolve(_message);
            }
        });
    }
}
/**
 * MessageContext
 * @extends {BaseContext}
 * @author Robert R Murrell
 */
class MessageContext extends BaseContext {
    /**
     * @param {Object} azcontext
     * @param {Configuration} config
     * @param {null|Message} message
     */
    constructor(azcontext, config, message) {
        super(azcontext, config);
        /**@type{null|Message}*/this._message = message;
    }
    /**@type{string}*/get raw() {return this._funccontext.message;}
    /**@type{null|Message}*/get message() {return this._message;}
}
/**
 * MessageFunction
 * @extends {BaseFunction}
 * @abstract
 * @author Robert R Murrell
 */
class MessageFunction extends BaseFunction {
    /**@param {Configuration} configuration*/
    constructor(configuration) {super(configuration);}
    /**
     * @param {_AzureMessageContext} azcontext
     * @param {Configuration} config
     * @returns {Promise<MessageContext>}
     */
    async createContext(azcontext, config) {
        return new Promise((resolve, reject) => {
            Message.unmarshall(azcontext.bindings.message)
                .then((message) => {
                    resolve(new MessageContext(azcontext, config, message));
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    async _onMonitor(context) {
        return new Promise((resolve, reject) => {
            context.log("Not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "MessageFunction._onMessage(context)");
            resolve();
        });
    }
    /**
     * @param {BaseContext | MessageContext} context
     * @returns {Promise<void>}
     * @private
     */
    async _onMessage(context) {
        return new Promise((resolve, reject) => {
            context.log("Not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "MessageFunction._onMessage(context)");
            reject(CelastrinaError.newError("Not Implemented.", 501));
        });
    }
    /**
     * @param {BaseContext | MessageContext} context
     * @returns {Promise<void>}
     */
    async process(context) {
        return new Promise((resolve, reject) => {
            if(context.message.header.isExpired) {
                context.log("Message " + context.message.header.messageId + " is expired, dropping.", LOG_LEVEL.LEVEL_WARN, "MessageFunction.process(context)");
                resolve();
            }
            else {
                /**@type{Promise<void>}*/let promise = null;
                if(context.message.header.environment === MESSAGE_ENVIRONMENT.MONITOR)
                    promise = this._onMonitor(context);
                else
                    promise = this._onMessage(context);
                promise
                    .then(() => {
                        resolve();
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
        });
    }
}

module.exports = {
    MESSAGE_ENVIRONMENT: MESSAGE_ENVIRONMENT, Header: Header, Message: Message, MessageContext: MessageContext,
    MessageFunction: MessageFunction
};
