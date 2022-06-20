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
		.setName('export')
		.setDescription('Permet d\'enregistrer les ventes de farines effectuées à l\'export')
		.setDefaultPermission(false)
		.addIntegerOption((option) =>
			option
				.setName('quantite')
				.setDescription('Nombre de farines vendues')
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

			updateFicheEmploye(interaction.client, interaction.user.id);

			return await interaction.reply({ content: 'Vos ' + quantite + ' farines ont bien été enregistrées', ephemeral: true });
		}
		else {
			return await interaction.reply({ content: 'Vous devez renseigner un nombre positif supérieur à 0', ephemeral: true });
		}
	},
};