const { Expense, Employee, Grossiste } = require('../dbObjects.js');
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
		const date = moment.tz('Europe/Paris');

		for (const embed of message.embeds) {
			if (embed.title === 'Détails Financier') {
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
			else if (embed.title === 'Détails Tâches') {
				for (const f of embed.fields) {
					const employee = await Employee.findOne({
						where: {
							name_employee: f.name,
						},
					});

					if (employee) {
						dmChannel.send({ content: `Employé trouvé!\nf.name: ${f.name} ; quantite: ${parseInt(f.value.match(/([0-9]+)/gs))} ; timestamp: ${date}` });
						await Grossiste.upsert({
							id_employe: employee.id_employee,
							quantite: parseInt(f.value.match(/([0-9]+)/gs)),
							timestamp: date,
						});
					}
					else {
						dmChannel.send({ content: `Employé non trouvé!\nf.name: ${f.name} ; f.value: ${f.value} ; f.value.match: ${parseInt(f.value.match(/([0-9]+)/gs))}` });
					}
				}
			}
		}

		const embeds = JSON.stringify(message.embeds, undefined, 2);

		for (const e of embeds.match(/(.{1,4000})/gs)) {
			dmChannel.send({ content: e });
		}
	},
};
