import AuthorizationFlow from "./AuthorizationFlow";
import Token from "../Token";
import {randomString, urlEncode} from "../Utils";
import FormData from "form-data";
import fetch from "node-fetch";

export default class AuthCode extends AuthorizationFlow {

    constructor(clientId, clientSecret, redirectUri) {
        super(clientId, clientSecret, redirectUri);
    }

    execute(authUrl){
        let url = authUrl;
        let s = authUrl.indexOf('?');
        if(s){
            url = url.substr(0, s);
        }

        let code, state;

        if(url === this.redirectUri){
            const qs = authUrl.substr(s + 1).split("&");
            for(let q of qs){
                let [key, value] = q.split('=');
                if(key === 'code'){
                    code = value;
                }
                else if(key === 'state'){
                    state = value;
                }
            }

            if(code){
                return this.complete(code, state);
            }

            console.log("[kvapi] authorization is not possible because of missing auth code and state on uri");

            return Promise.reject({
                error: "MISSING_AUTH_CODE",
                authUrl,
                code,
                state
            });
        }
        else{
            return Promise.reject({
                error: "REDIRECT_URI_MISMATCH",
                authUrl: authUrl
            });
        }
    }

    getUri(){
        const state = this.state || randomString(16);

        const qs = urlEncode({
            response_type: "code",
            client_id: this.clientId,
            client_secret: this.clientSecret,
            redirect_uri: this.redirectUri,
            state: state,
            "scope[]": this.scope
        });

        return this.authorizeUrl + '?' + qs;
    }

    complete(code, state = null){
        if(this.state !== state){
            console.error("State mismatch", this.state, state);
            return null;
        }

        return this.getTokenWithAuthCode(code).then(token => {
            return {
                token: token
            }
        });
    }

    getTokenWithAuthCode(code){
        const qs = new FormData();
        qs.append("grant_type", "authorization_code");
        qs.append("client_id", this.clientId);
        qs.append("client_secret", this.clientSecret);
        qs.append("redirect_uri", this.redirectUri);
        qs.append("code", code);

        return fetch(this.tokenUrl, {
            method: 'POST',
            mode: 'cors',
            body: qs
        })
            .then(rs => rs.json())
            .then(data => {
                if(data.success){
                    return new Token(data);
                }
                else{
                    throw data;
                }
            });
    }

}
