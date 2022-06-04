const { Expense } = require('../dbObjects.js');
const dotenv = require('dotenv');
const moment = require('moment');
const { Op } = require('sequelize');

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

		for (const embed of message.embeds) {
			for (const f of embed.fields) {
				if (f.name.includes('Argent Dépensé')) {
					if (await Expense.count({
						where: {
							libelle_expense: f.name,
							date_expense: { [Op.between]: [+moment.tz('Europe/Paris').subtract(10, 'm'), +moment.tz('Europe/Paris').add(10, 'm')] },
						},
					}) === 0) {
						await Expense.upsert({
							date_expense: moment.tz('Europe/Paris'),
							sum_expense: parseInt(f.value.match(/([0-9]+)/gs)),
							libelle_expense: f.name,
						});
					}
				}
			}
		}
	},
};
