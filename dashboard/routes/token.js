require('dotenv').config();
const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('node:crypto');
const { Employee } = require('../../src/dbObjects');
const moment = require('moment');

moment.tz.setDefault('Europe/Paris');
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const API_ENDPOINT = process.env.API_ENDPOINT;
const AUTHORIZATION_SERVER_TOKEN_URL = process.env.AUTHORIZATION_SERVER_TOKEN_URL;
// const AUTHORIZATION_SERVER_TOKEN_REVOKE_URL = process.env.AUTHORIZATION_SERVER_TOKEN_REVOKE_URL;
const GUILD_ID = process.env.GUILD_ID;
const DIRECTION_ROLE_ID = process.env.DIRECTION_ROLE_ID;

router.post('/', async (req, res) => {
	const { code } = req.query;
	const data = {
		'client_id': CLIENT_ID,
		'client_secret': CLIENT_SECRET,
		'grant_type': 'authorization_code',
		'code': code,
		'redirect_uri': REDIRECT_URI,
	};
	const headers = {
		'Content-Type': 'application/x-www-form-urlencoded',
	};

	const params = new URLSearchParams(data);

	try {
		const response = await axios.post(API_ENDPOINT + AUTHORIZATION_SERVER_TOKEN_URL, params, headers);
		console.log(response.data);

		if (response?.data?.access_token) {
			const member = await axios.get(API_ENDPOINT + '/users/@me/guilds/' + GUILD_ID + '/member', { headers: { 'Authorization': `Bearer ${response?.data?.access_token}` } });

			console.log(member.data);

			if (!member.data.roles.includes(DIRECTION_ROLE_ID)) {
				// await revoke_token(response.data.refresh_token);
				res.status(401).json({ error: 'You don\'t have the right to access this app' });
				return;
			}

			const user = await Employee.findOne({
				where: {
					id_employee: member.data.user.id,
					date_firing: null,
				},
			});

			if (user) {
				const id = crypto.randomBytes(15).toString('hex');
				await user.update({
					access_id: id,
					access_token: response.data.access_token,
					refresh_token: response.data.refresh_token,
					token_expires_in: moment().unix() + response.data.expires_in,
					avatar_id: member.data.user.avatar,
				});
				res.json({
					access_id: id,
					user_id: member.data.user.id,
					user_avatar: member.data.user.avatar,
					user_name: user.name_employee,
				});
				return;
			}
			else {
				// await revoke_token(response.data.access_token);
				res.status(401).json({ error: 'You don\'t have the right to access this app' });
				return;
			}
		}
		else {
			res.json({ error: 'Failed login attempt' });
		}
	}
	catch (error) {
		console.log(error);
	}
});

// async function revoke_token(token) {
// 	const data = {
// 		'client_id': CLIENT_ID,
// 		'client_secret': CLIENT_SECRET,
// 		'token': token,
// 	};
// 	const headers = {
// 		'Content-Type': 'application/x-www-form-urlencoded',
// 	};
// 	const params = new URLSearchParams(data);
// 	await axios.post(API_ENDPOINT + AUTHORIZATION_SERVER_TOKEN_REVOKE_URL, params, headers);
// }

module.exports = router;
