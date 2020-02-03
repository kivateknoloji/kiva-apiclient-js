/**
 * NODEJS api usage
 * @type {*}
 */

const kvapi = require('../dist/kvapi');
const express = require('express');
const cors = require('cors');
const cryptoRandomString = require('crypto-random-string');

const app = express();
app.use(cors());

const CLIENT_ID = "demo";
const CLIENT_SECRET = "123456789";
const REDIRECT_URI = "http://localhost:3000/authorize/callback";

const state = cryptoRandomString({length: 16, type: 'url-safe'});

const $API = kvapi.client;
$API.setUrl("https://local.kivacrm.com");

const authFlow = new kvapi.auth.AuthCode(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
authFlow.setState(state);
authFlow.setScope(['data', 'user']);
$API.setAuthFlow(authFlow);

app.get('/', function (req, res) {
	res.send("Home");
});

app.get('/authorize', function (req, res) {
	console.log("authorize");
	const uri = $API.getAuthUri();
	res.redirect(uri);
});

app.get('/authorize/callback', function (req, res) {
	const fullUrl = req.protocol + '://' + req.get('Host') + req.originalUrl;

	$API.authorize(fullUrl)
		.then((token) => {
			// {access_token:'...', refresh_token:'...', expires_in:3600 ...}
			console.log(token.toJSON());

			// store token in database

			return res.redirect('/?authorized=1');
		})
		.catch(error => {
			return res.status(401).send(error);
		})
});

app.get('/tasks', async function (req, res) {
	const result = await $API.get('/data/act/task', {
		fields: ['subject', 'task_status', 'start_date'],
		limit: 5,
		sort: 'start_date',
		dir: 'DESC'
	});
	return res.send(result);
});

app.listen(3000);
