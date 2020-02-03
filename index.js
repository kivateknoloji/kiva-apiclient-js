"use strict";

import ApiClient from "./src/ApiClient";
import AuthCodePKCE from "./src/Authorization/AuthCodePKCE";
import AuthCode from "./src/Authorization/AuthCode";
import ClientCredentials from "./src/Authorization/ClientCredentials";

export default {
	client: new ApiClient(),
	auth: {
		AuthCodePKCE: AuthCodePKCE,
		AuthCode: AuthCode,
		ClientCredentials: ClientCredentials
	}
};
