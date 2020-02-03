export default class Token {

    #accessToken = null;
    #refreshToken = null;
    #expiresIn = null;
    #expiresAt = null;

    constructor(data = {}) {
        this.#accessToken = data.access_token;
        this.#refreshToken = data.refresh_token;
        this.#expiresIn = data.expires_in;
        this.#expiresAt = data.expires_at ? new Date(data.expires_at) : new Date(Date.now() + (this.#expiresIn - 5)*1000);
    }

    get accessToken(){
        return this.#accessToken;
    }

    get refreshToken(){
        return this.#refreshToken;
    }

    get expiresAt(){
        return this.#expiresAt;
    }

    isExpired(){
        return Date.now() >= this.expiresAt.getTime();
    }

    save(){
        if(typeof(localStorage) !== 'undefined'){
            localStorage.kvapiToken = this.toString();
        }
    }

    clear(){
        if(typeof(localStorage) !== 'undefined'){
            delete localStorage.kvapiToken;
        }
    }

    toJSON(){
        return {
            access_token: this.accessToken,
            refresh_token: this.refreshToken,
            expires_in: this.#expiresIn,
            expires_at: this.#expiresAt.getTime()
        };
    }

    toString(){
        return JSON.stringify(this.toJSON());
    }

    static fromCache(){
        if(typeof(localStorage) !== 'undefined'){
            const cached = localStorage.kvapiToken;
            if(cached){
                return new Token(JSON.parse(cached));
            }
        }

        return null;
    }
}
