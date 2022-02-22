const { SlashCommandBuilder } = require('@discordjs/builders');
const moment = require('moment');
const { Bill, Enterprise } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('facture')
		.setDescription('Permet de faire une facture')
		.setDefaultPermission(false)
		.addSubcommand(subcommand =>
			subcommand
				.setName('débit')
				.setDescription('Permet d\'enregistrer un achat')
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
						.addChoice('Rapid\'Transit', '12')
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
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('crédit')
				.setDescription('Permet d\'enregistrer une vente')
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
						.addChoice('Rapid\'Transit', '12')
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
				).addBooleanOption((option) =>
					option
						.setName('ardoise')
						.setDescription('retire le montant sur l\'ardoise de l\'entreprise')
						.setRequired(false),
				),
		),
	async execute(interaction) {
		const client = parseInt(interaction.options.getString('client')) || null;
		const montant = interaction.options.getInteger('montant');
		const libelle = interaction.options.getString('libelle');
		const enterprise = client ? await Enterprise.findByPk(client, { attributes: ['name_enterprise', 'emoji_enterprise', 'id_tab'] }) : 'Particulier';

		if (interaction.options.getSubcommand() === 'crédit') {
			console.log('crédit');
			const onTab = interaction.options.getBoolean('ardoise') || false;
			if (enterprise === 'Particulier' && onTab) {
				return await interaction.reply({ content: 'Pas d\'ardoise pour les particuliers', ephemeral: true });
			}
			await Bill.upsert({
				date_bill: moment.tz('Europe/Paris'),
				id_enterprise: client,
				id_employe: interaction.user.id,
				sum_bill: -montant,
				info: libelle,
				onTab: onTab,
			});
			if (onTab) {
				// TODO : Update ardoise entreprise
				return await interaction.reply({ content: 'Crédit de $' + montant + ' enregistrée sur l\'ardoise de ' + enterprise.name_enterprise + ' ' + enterprise.emoji_enterprise, ephemeral: true });
			}
			return await interaction.reply({ content: 'Crédit de $' + montant + ' enregistrée pour ' + client ? enterprise.name_enterprise + ' ' + enterprise.emoji_enterprise : 'Particulier', ephemeral: true });
		}
		else {
			console.log('débit');
			await Bill.upsert({
				date_bill: moment.tz('Europe/Paris'),
				id_enterprise: client,
				id_employe: interaction.user.id,
				sum_bill: montant,
				info: libelle,
			});
			return await interaction.reply({ content: 'Débit de $' + montant + ' enregistrée pour ' + client ? enterprise.name_enterprise + ' ' + enterprise.emoji_enterprise : 'Particulier', ephemeral: true });
		}
	},
};