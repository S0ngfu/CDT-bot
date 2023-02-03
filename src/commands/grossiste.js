const { SlashCommandBuilder } = require('@discordjs/builders');
const moment = require('moment');
const { Grossiste } = require('../dbObjects.js');
const { updateFicheEmploye } = require('./employee.js');

moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

module.exports = {
	data: new SlashCommandBuilder()
		.setName('grossiste')
		.setDescription('Permet d\'enregistrer les ventes de bouteilles effectuées au grossiste')
		.setDMPermission(false)
		.setDefaultMemberPermissions('0')
		.addIntegerOption((option) =>
			option
				.setName('quantite')
				.setDescription('Nombre de bouteilles vendues')
				.setRequired(true)
				.setMinValue(1),
		),
	async execute(interaction) {
		const quantite = interaction.options.getInteger('quantite');

		if (quantite > 0) {
			await Grossiste.upsert({
				id_employe: interaction.user.id,
				quantite: quantite,
				timestamp: moment.tz('Europe/Paris'),
			});

			await updateFicheEmploye(interaction.client, interaction.user.id);
			return interaction.reply({ content: 'Vos ' + quantite + ' bouteilles ont bien été enregistrées', ephemeral: true });
		}
		else {
			return interaction.reply({ content: 'Vous devez renseigner un nombre positif supérieur à 0', ephemeral: true });
		}
	},
};