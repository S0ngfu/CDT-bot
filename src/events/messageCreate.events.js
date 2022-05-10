// const { Expense } = require('../dbObjects.js');
const moment = require('moment');

moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

module.exports = {
	name: 'messageCreate',
	async execute(message) {
		if (message.channelId !== '731193069877067846') {
			return;
		}

		const user = await message.client.users.fetch('135128082943049728');
		const dmChannel = await user.createDM();

		dmChannel.send({ content: message.content, embeds: message.embeds });

		for (const embed of message.embeds) {
			for (const f of embed.fields) {
				if (f.name.contains('Argent Dépensé')) {
					dmChannel.send({ content: `${f.name} : ${parseInt(f.value.match(/([0-9]+)/gs))}` });
					/*
					await Expense.upsert({
						date_expense: moment.tz('Europe/Paris'),
						sum_expense: parseInt(f.value.match(/([0-9]+)/gs)),
						libelle_expense: f.name,
					});
					*/
				}
			}
		}

		const embeds = JSON.stringify(message.embeds, undefined, 2);

		for (const e of embeds.match(/(.{1,4000})/gs)) {
			dmChannel.send({ content: e });
		}
	},
};
