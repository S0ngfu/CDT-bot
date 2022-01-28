const { SlashCommandBuilder } = require('@discordjs/builders');
const moment = require('moment');
const { Bill } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('facture')
		.setDescription('Permet de faire une facture')
		.setDefaultPermission(false)
		.addStringOption((option) =>
			option
				.setName('client')
				.setDescription('Permet de choisir l\'entreprise')
				.setRequired(true)
				.addChoice('ARC', '1')
				.addChoice('Benny\'s', '2')
				.addChoice('Blé d\'Or', '3')
				.addChoice('Weazle News', '4')
				.addChoice('Gouvernement', '5')
				.addChoice('Mairie BC', '6')
				.addChoice('Mairie LS', '7')
				.addChoice('M$T', '8')
				.addChoice('Paradise', '9')
				.addChoice('Particulier', 'NULL')
				.addChoice('PBSC', '10')
				.addChoice('PLS', '11')
				.addChoice('Rapid\'Transir', '12')
				.addChoice('Rogers', '13')
				.addChoice('SBC', '14')
				.addChoice('Ryan\'s', '15'),
		).addIntegerOption((option) =>
			option
				.setName('montant')
				.setDescription('Montant de la facture')
				.setRequired(true)
				.setMinValue(1),
		).addStringOption((option) =>
			option
				.setName('libelle')
				.setDescription('Libellé de la facture')
				.setRequired(true),
		),
	async execute(interaction) {
		const client = parseInt(interaction.options.getString('client')) || null;
		const montant = interaction.options.getInteger('montant');
		const libelle = interaction.options.getString('libelle');

		console.log(client);
		await Bill.upsert({
			date_bill: moment.tz('Europe/Paris'),
			id_enterprise: client,
			id_employe: interaction.user.id,
			sum_bill: montant,
			info: libelle,
		});
		return await interaction.reply({ content: 'Facture enregistré', ephemeral: true });
	},
};