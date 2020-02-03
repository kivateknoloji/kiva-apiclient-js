import Token from "../Token";
import fetch from "node-fetch";

export default class AuthorizationFlow {

	#apiUrl;
	#authorizeUrl;
	#tokenUrl;
	#clientId;
	#clientSecret;
	#redirectUri;
	#state;
	#scope;

	constructor(clientId, clientSecret, redirectUri) {
		this.#clientId = clientId;
		this.#clientSecret = clientSecret;
		this.#redirectUri = redirectUri;
	}

	get clientId(){
		return this.#clientId;
	}

	get clientSecret(){
		return this.#clientSecret;
	}

	get redirectUri(){
		return this.#redirectUri;
	}

	get authorizeUrl(){
		return this.#authorizeUrl;
	}

	get tokenUrl(){
		return this.#tokenUrl;
	}

	get state(){
		return this.#state;
	}

	get scope(){
		return this.#scope;
	}

	setApiUrl(apiUrl){
		this.#apiUrl = apiUrl;
		this.#authorizeUrl = apiUrl + '/oauth2/authorize';
		this.#tokenUrl = apiUrl + '/oauth2/token';
	}

	setState(state){
		this.#state = state;
		return this;
	}

	setScope(scope){
		this.#scope = scope;
		return this;
	}

	execute(){
		return Promise.resolve();
	}

	/**
	 *
	 * @param refreshToken
	 * @returns {Promise<Token>}
	 */
	refreshToken(refreshToken = null){
		const qs = new URLSearchParams();
		qs.append("grant_type", "refresh_token");
		qs.append("client_id", this.clientId);
		if(this.clientSecret){
			qs.append("client_secret", this.clientSecret);
		}
		qs.append("refresh_token", refreshToken);

		return fetch(this.tokenUrl, {
			method: 'POST',
			mode: 'cors',
			body: qs
		}).then(rs => {
			return rs.json();
		}).then(data => {
			if(data.success){
				return new Token(data);
			}
			else{
				throw data;
			}
		});
	}


}
