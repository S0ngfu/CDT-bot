const { Expense } = require('../dbObjects.js');
const dotenv = require('dotenv');
const moment = require('moment');

dotenv.config();
const channelId = process.env.CHANNEL_COMPTAFAILY_ID;

moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

module.exports = {
	name: 'messageCreate',
	async execute(message) {
		if (message.channelId !== channelId) {
			return;
		}

		const user = await message.client.users.fetch('135128082943049728');
		const dmChannel = await user.createDM();

		for (const embed of message.embeds) {
			for (const f of embed.fields) {
				dmChannel.send({ content: `f.name: ${f.name} ; f.value: ${f.value} ; f.value.match: ${parseInt(f.value.match(/([0-9]+)/gs))}` });
				if (f.name.includes('Argent Dépensé')) {
					await Expense.upsert({
						date_expense: moment.tz('Europe/Paris'),
						sum_expense: parseInt(f.value.match(/([0-9]+)/gs)),
						libelle_expense: f.name,
					});
				}
			}
		}

		const embeds = JSON.stringify(message.embeds, undefined, 2);

		for (const e of embeds.match(/(.{1,4000})/gs)) {
			dmChannel.send({ content: e });
		}
	},
};
