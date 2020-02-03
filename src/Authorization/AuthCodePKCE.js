import SHA256 from "crypto-js/sha256";
import {randomString, base64URLEncode, urlEncode} from "../Utils";
import Token from "../Token";
import AuthCode from "./AuthCode";
import fetch from "node-fetch";

export default class AuthCodePKCE extends AuthCode {

    constructor(clientId, redirectUri) {
        super(clientId, null, redirectUri);
    }

    generateCodeVerifier(size = 64){
        return randomString(size);
    }

    generateCodeChallenge(codeVerifier){
        return base64URLEncode(SHA256(codeVerifier));
    }

    execute(authUrl = ""){
        return super.execute(authUrl || location.href);
    }

    getUri(){
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = this.generateCodeChallenge(codeVerifier);
        localStorage.kvapiCodeVerifier = codeVerifier;

        const state = this.state || randomString(16);
        localStorage.kvapiState = state;

        const qs = urlEncode({
            response_type: "code",
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
            state: state,
            "scope[]": this.scope
        });

        return this.authorizeUrl + '?' + qs;
    }

    complete(code, state){
        state = this.state || localStorage.kvapiState;
        return super.complete(code, state);
    }

    getTokenWithAuthCode(code){
        const qs = new FormData();
        qs.append("grant_type", "authorization_code");
        qs.append("client_id", this.clientId);
        qs.append("redirect_uri", this.redirectUri);
        qs.append("code_verifier", localStorage.kvapiCodeVerifier);
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
