const { Expense, Employee, Grossiste, TransfertGrossiste } = require('../dbObjects.js');
const { updateFicheEmploye } = require('../commands/employee.js');
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

		const user = await message.client.users.fetch('135128082943049728');
		const dmChannel = await user.createDM();
		const date = moment.tz('Europe/Paris');

		for (const embed of message.embeds) {
			if (embed.title === 'Détails Financier') {
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
			else if (embed.title === 'Détails Tâches') {
				for (const f of embed.fields) {
					const employee = await Employee.findOne({
						where: {
							name_employee: f.name,
						},
					});

					if (employee) {
						let quantite = parseInt(f.value.match(/([0-9]+)/gs));

						const transferts_grossiste = await TransfertGrossiste.findAll({
							where: {
								id_employe_giver: employee.id_employee,
								done: false,
								error: false,
							},
						});

						for (const t of transferts_grossiste) {
							const employe_receiver = await Employee.findOne({ where: { id_employee: t.id_employe_receiver, date_firing: null } });
							if (!employe_receiver || t.quantite > quantite) {
								await t.update({ error: true });
							}
							else {
								await Grossiste.upsert({
									id_employe: employe_receiver.id_employee,
									quantite: t.quantite,
									timestamp: date,
								});
								quantite -= t.quantite;
								await t.update({ done: true });
							}
						}

						if (quantite > 0) {
							await Grossiste.upsert({
								id_employe: employee.id_employee,
								quantite: quantite,
								timestamp: date,
							});
						}
					}
					else {
						dmChannel.send({ content: `Employé non trouvé!\nf.name: ${f.name} ; f.value: ${f.value} ; f.value.match: ${parseInt(f.value.match(/([0-9]+)/gs))}` });
					}
				}

				// Mise en erreur de tout les souhaits de transferts qui n'ont pas été traités.
				await TransfertGrossiste.update({ error: true }, { where: { done: false, error: false } });

				// Mise à jour de toutes les fiches employés
				const employees = await Employee.findAll({
					attributes: ['id_employee'],
					where: {
						date_firing: null,
					},
				});
				for (const employee of employees) {
					try {
						await updateFicheEmploye(message.client, employee.id_employee);
					}
					catch (error) {
						console.error(error);
						dmChannel.send({ content: `Erreur: ${error}` });
					}
				}
			}
		}
	},
};
