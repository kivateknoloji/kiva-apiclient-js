import AuthorizationFlow from "./AuthorizationFlow";
import Token from "../Token";

export default class ClientCredentials extends AuthorizationFlow {

    constructor(clientId, clientSecret) {
        super(clientId, clientSecret);
    }

    execute(){
        return this.getToken().then(token => {
            return {
                token: token
            }
        });
    }

    getToken(){
        const qs = new FormData();
        qs.append("grant_type", "client_credentials");
        qs.append("client_id", this.clientId);
        qs.append("client_secret", this.clientSecret);
        qs.append("scope", this.scope);

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

    /**
     *
     * @returns {Promise<Token>}
     */
    refreshToken(refreshToken = null) {
        return this.getToken();
    }

}
