import Token from "./Token";
import AuthCodePKCE from "./Authorization/AuthCodePKCE";
import AuthorizationFlow from "./Authorization/AuthorizationFlow";
import { urlEncode } from "./Utils";
import { isBrowser, isNode } from 'browser-or-node';
import FormData from "form-data";
import fetch from "node-fetch";

const encode = function(val){
    return JSON.stringify(val);
};

const middlewares = {
    beforeRequest: [],
    afterRequest: []
};

const addMiddleware = function(type, callback){
    if(type in middlewares){
        middlewares[type].push(callback);
    }
};

let tokenExpired = false;
let tokenInvalidCount = 0;

/**
 * ApiClient main class
 */
export default class ApiClient {

    #baseUrl = "https://app.kivacrm.com";
    #apiUrl;
    #version = "2";
    #authFlow;
    #token;
    #refreshToken;
    #locked = false;

    constructor(baseUrl = null, version = "2") {
        this.setUrl(baseUrl, version);
    }

    /**
     *
     * @param {string} version
     * @returns {ApiClient}
     */
    setVersion(version){
        this.#version = version || this.#version;
        return this;
    }

    /**
     * set api url
     * @param {string} baseUrl (e.g. htpps://app.kivacrm.com)
     * @param {string} version (e.g 2)
     * @returns {ApiClient}
     */
    setUrl(baseUrl, version = "2"){
        this.setVersion(version);
        this.#baseUrl = baseUrl || this.#baseUrl;
        this.#apiUrl = baseUrl + "/api/v" + this.#version;
        return this;
    }

    /**
     * get full api url
     * @returns {*}
     */
    getApiUrl(){
        return this.#apiUrl;
    }

    /**
     * @param {AuthorizationFlow} authFlow
     */
    setAuthFlow(authFlow){
        if(!(authFlow instanceof AuthorizationFlow)){
            throw new Error("Undefined authorization flow given: " + authFlow.name);
        }

        if(isBrowser){
            if(!(authFlow instanceof AuthCodePKCE)){
                console.warn("Using unsafe authorization on client app. You should use only PKCE flow on non secure clients like browsers.");
            }
        }

        this.#authFlow = authFlow;
        authFlow.setApiUrl(this.#apiUrl);

        return this;
    }

    /**
     * the authorization url returned from identity provider that contains "code" and "state" parameters
     * @param authUrl
     * @returns {Promise<Token>}
     */
    authorize(authUrl = null){
        return this.#authFlow.execute(authUrl).then(rs => {
            if(rs.token){
                this.setToken(rs.token);
            }
            return this.getToken();
        }).catch(error => {
            console.error(error);
            throw error;
        });
    }

    /**
     * get authorization request uri
     * @returns {string}
     */
    getAuthUri(){
        return this.#authFlow.getUri();
    }

    /**
     * set current token
     * @param {object|string} token
     */
    setToken(token){
        if(typeof(token) === 'string'){
            token = JSON.parse(token);
        }
        this.#refreshToken = token.refreshToken;
        this.#token = token;
        this.#token.save();
        return this;
    }

    /**
     * reset token
     */
    clearToken(){
        if(this.#token){
            this.#token.revoke();
        }
        this.#token = null;
        this.#refreshToken = null;
        return this;
    }

    /**
     * get active token
     * @returns {Promise<Token>|Promise<null>}
     */
    getToken(){
        if(!this.#token){
            this.#token = Token.fromCache();
        }

        if(this.#token){
            if(this.#token.isExpired()){
                return this.refresh();
            }
            else{
                return Promise.resolve(this.#token);
            }
        }

        return Promise.reject("TOKEN_NOT_FOUND");
    }

    /**
     * set standalone refresh token (in case there is no full token object)
     * @param refreshToken
     */
    setRefreshToken(refreshToken){
        this.#refreshToken = refreshToken;
        return this;
    }

    /**
     * refresh token
     * @param {string|null} refreshToken
     * @returns {Promise<Token>}
     */
    refresh(refreshToken = null){
        refreshToken = refreshToken || this.#refreshToken || (this.#token && this.#token.refreshToken);

        // await all requests until getting new token to prevent invalid token errors
        this.#locked = true;

        return this.#authFlow.refreshToken(refreshToken)
            .then(token => {
                this.setToken(token);
                this.#locked = false;
                return token;
            })
            .catch(error => {
                this.#locked = false;
                throw error;
            });
    }

    /**
     * revoke access using access token
     * @returns {Promise<object>}
     */
    revoke(){
        if(!this.#token){
            return Promise.reject({error: "TOKEN_NOT_FOUND"});
        }

        return this.post("/oauth2/revoke", {
            token: this.#token.accessToken
        }).then(rs => {
            this.clearToken();
            return rs.response;
        });
    }

    /**
     * revoke access using refresh token
     * @returns {Promise<object>}
     */
    revokeRefreshToken(){
        if(!this.#token){
            return Promise.reject({error: "TOKEN_NOT_FOUND"});
        }

        return this.post("/oauth2/revoke", {
            token: this.#token.refreshToken
        }).then(rs => {
            this.clearToken();
            return rs.response;
        });
    }

    /**
     * send rest api request
     * @param {string} method
     * @param {string} endpoint
     * @param {object} params
     * @param {boolean|} resent
     * @returns {Promise<object>}
     */
    apiRequest(method, endpoint, params = {}, resent){
        if(this.#locked){
            console.log("request is awaiting for refresh token lock to be released");
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    this.apiRequest.apply(this, arguments).then(resolve).catch(reject);
                }, 1000);
            });
        }

        let url = this.#apiUrl + endpoint,
            headers = {},
            data,
            baseArgs = Array.prototype.slice.call(arguments, 0),
            supportsFormData = (typeof FormData !== 'undefined');

        params = params || {};
        method = method.toUpperCase();

        // before middlewares
        let mb = middlewares.beforeRequest, limit = mb.length, i;
        for(i=0; i<limit; i++){
            if(typeof(mb[i]) === 'function'){
                if(mb[i].call(this, baseArgs) === false){
                    return Promise.reject({cancelled:true});
                }
            }
        }

        // request promise
        let request = this.getToken()
            .then(token => {
                let qs = '';
                if(method === "GET"){
                    qs = urlEncode(params);
                    if(qs){
                        qs += "&";
                    }
                    if(qs){
                        url += "?" + qs;
                    }
                }

                headers["Authorization"] = "Bearer " + token.accessToken;

                if(method !== 'GET' && method !== 'HEAD'){
                    if(supportsFormData && params instanceof FormData){
                        data = params;
                    }
                    else{
                        data = encode(params);
                        headers["Content-Type"] = "application/json";
                    }
                }

                return fetch(url, {
                    method: method,
                    body: ['GET', 'HEAD'].indexOf(method) !== -1 ? null : data,
                    headers: headers,
                    mode: 'cors',
                    cache: 'default'
                })
                .then((response) => {
                    let headers = {};
                    response.headers.forEach((v, k) => {
                        headers[k] = v;
                    });

                    const contentType = response.headers.get("content-type") || '';
                    if(response.status !== 204 && contentType.indexOf("application/json") !== -1){
                        return response.json().then((json) => {
                            return {
                                status: response.status,
                                statusText: response.statusText,
                                headers: headers,
                                response: json
                            }
                        });
                    }
                    else{
                        return Promise.resolve({
                            status: response.status,
                            statusText: response.statusText,
                            headers: headers,
                            response: {success:response.ok}
                        });
                    }
                })
                .then((result) => {
                    if(result.response.success){
                        tokenExpired = false;
                        tokenInvalidCount = 0;

                        return {
                            response: result.response,
                            headers: result.headers,
                            status: {
                                code: result.status,
                                message: result.statusText
                            }
                        };
                    }
                    else{
                        // lock api requests until a valid token is retrieved (max 3 retries)
                        if(result.response.error === "INVALID_TOKEN" && !tokenExpired && tokenInvalidCount < 3){
                            tokenExpired = true;
                            tokenInvalidCount++;

                            return this.refresh().then(() => {
                                return this.apiRequest.apply(this, [method, endpoint, params, true]);
                            });
                        }
                        else{
                            return {
                                response: result.response,
                                headers: result.headers,
                                status: {
                                    code: result.status,
                                    message: result.statusText
                                }
                            };
                        }
                    }
                });
            })
            .catch((error) => {
                return {
                    response: {
                        success: false,
                        error: error
                    },
                    status: {}
                };
        });

        // after middlewares
        let ma = middlewares.afterRequest;
        if(ma.length > 0){
            request.then(
                function(r){
                    let limit = ma.length, i;
                    for(i=0; i<limit; i++){
                        if(typeof(ma[i]) === 'function'){
                            ma[i].call(this, true, r, baseArgs);
                        }
                    }
                },
                function(e){
                    let limit = ma.length, i;
                    for(i=0; i<limit; i++){
                        if(typeof(ma[i]) === 'function'){
                            ma[i].call(this, false, e, baseArgs);
                        }
                    }
                }
            )
        }

        return request;
    }

    /**
     * before request middleware
     * @param {function} callback
     */
    beforeRequest(callback){
        addMiddleware("beforeRequest", callback);
    }

    /**
     * after request middleware
     * @param {function} callback
     */
    afterRequest(callback){
        addMiddleware("afterRequest", callback);
    }

    /**
     * TODO
     * download blob/file from given endpoint
     * @param endpoint
     * @param params
     */
    download(endpoint, params){
        this.apiRequest("GET", endpoint, params)
            .then(() => {

            });
    }

    /**
     * send http GET request
     * @param endpoint
     * @param params
     * @returns {Promise<Object>}
     */
    get(endpoint, params = {}){
        return this.apiRequest("GET", endpoint, params);
    }

    /**
     * send http POST request
     * @param endpoint
     * @param params
     * @returns {Promise<Object>}
     */
    post(endpoint, params = {}){
        return this.apiRequest("POST", endpoint, params);
    }

    /**
     * send http PUT request
     * @param endpoint
     * @param params
     * @returns {Promise<Object>}
     */
    put(endpoint, params = {}){
        return this.apiRequest("PUT", endpoint, params);
    }

    /**
     * send http PATCH request
     * @param endpoint
     * @param params
     * @returns {Promise<Object>}
     */
    patch(endpoint, params = {}){
        return this.apiRequest("PATCH", endpoint, params);
    }

    /**
     * send http DELETE request
     * @param endpoint
     * @param params
     * @returns {Promise<Object>}
     */
    delete(endpoint, params = {}){
        return this.apiRequest("DELETE", endpoint, params);
    }

    /**
     * send http HEAD request
     * @param endpoint
     * @param params
     * @returns {Promise<Object>}
     */
    head(endpoint, params = {}){
        return this.apiRequest("HEAD", endpoint, params);
    }
}
