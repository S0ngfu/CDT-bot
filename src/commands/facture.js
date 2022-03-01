const { SlashCommandBuilder } = require('@discordjs/builders');
const moment = require('moment');
const { MessageEmbed, MessageManager } = require('discord.js');
const { Bill, Enterprise, Tab } = require('../dbObjects.js');

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
				).addBooleanOption((option) =>
					option
						.setName('ardoise')
						.setDescription('retire le montant sur l\'ardoise de l\'entreprise')
						.setRequired(false),
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
		const on_tab = interaction.options.getBoolean('ardoise') || false;
		const enterprise = client ? await Enterprise.findByPk(client, { attributes: ['id_enterprise', 'name_enterprise', 'emoji_enterprise', 'id_message', 'sum_ardoise'] }) : 'Particulier';

		if (on_tab) {
			if (enterprise === 'Particulier') {
				return await interaction.reply({ content: 'Pas d\'ardoise pour les particuliers', ephemeral: true });
			}
			else if (!enterprise.id_message) {
				return await interaction.reply({ content: 'Erreur, l\'entreprise ' + (enterprise.emoji_enterprise ? enterprise.emoji_enterprise + ' ' + enterprise.name_enterprise : enterprise.name_enterprise) + ' n\'a pas d\'ardoise.', ephemeral: true });
			}
		}

		if (interaction.options.getSubcommand() === 'crédit') {
			await Bill.upsert({
				date_bill: moment.tz('Europe/Paris'),
				id_enterprise: client,
				id_employe: interaction.user.id,
				sum_bill: montant,
				info: libelle,
				on_tab: on_tab,
			});

			if (on_tab) {
				const tab = await Tab.findOne({
					where: { id_message: enterprise.id_message },
				});
				const messageManager = new MessageManager(await interaction.client.channels.fetch(tab.id_channel));
				const tab_to_update = await messageManager.fetch(enterprise.id_message);
				const sum = Number.isInteger(enterprise.sum_ardoise) ? (enterprise.sum_ardoise + montant) : montant;
				await enterprise.update({ sum_ardoise: sum });
				await tab_to_update.edit({
					embeds: [await getArdoiseEmbed(tab)],
				});

				return await interaction.reply({ content: 'Crédit de $' + montant + ' enregistrée sur l\'ardoise de ' + (enterprise.emoji_enterprise ? enterprise.emoji_enterprise + ' ' + enterprise.name_enterprise : enterprise.name_enterprise), ephemeral: true });
			}

			return await interaction.reply({ content: 'Crédit de $' + montant + ' enregistrée pour ' + (client ? (enterprise.emoji_enterprise ? enterprise.emoji_enterprise + ' ' + enterprise.name_enterprise : enterprise.name_enterprise) : 'Particulier'), ephemeral: true });
		}
		else {
			await Bill.upsert({
				date_bill: moment.tz('Europe/Paris'),
				id_enterprise: client,
				id_employe: interaction.user.id,
				sum_bill: -montant,
				info: libelle,
				on_tab: on_tab,
			});

			if (on_tab) {
				const tab = await Tab.findOne({
					where: { id_message: enterprise.id_message },
				});
				const messageManager = new MessageManager(await interaction.client.channels.fetch(tab.id_channel));
				const tab_to_update = await messageManager.fetch(enterprise.id_message);
				const sum = Number.isInteger(enterprise.sum_ardoise) ? (enterprise.sum_ardoise - montant) : (-montant);
				await enterprise.update({ sum_ardoise: sum });
				await tab_to_update.edit({
					embeds: [await getArdoiseEmbed(tab)],
				});
			}
			return await interaction.reply({ content: 'Débit de $' + montant + ' enregistrée pour ' + (client ? (enterprise.emoji_enterprise ? enterprise.emoji_enterprise + ' ' + enterprise.name_enterprise : enterprise.name_enterprise) : 'Particulier'), ephemeral: true });
		}
	},
};

const getArdoiseEmbed = async (tab = null) => {
	const embed = new MessageEmbed()
		.setTitle('Ardoises')
		.setColor(tab ? tab.colour_tab : '000000')
		.setTimestamp(new Date());

	if (tab) {
		const enterprises = await tab.getEnterprises();
		for (const e of enterprises) {
			let field = 'Crédit restant : $' + (e.sum_ardoise ? e.sum_ardoise.toLocaleString('en') : '0');
			field += e.facture_max_ardoise ? '\nFacture max : $' + e.facture_max_ardoise : '';
			field += e.info_ardoise ? '\n' + e.info_ardoise : '';
			embed.addField(e.emoji_enterprise ? e.emoji_enterprise + ' ' + e.name_enterprise : e.name_enterprise, field, true);
		}
	}

	return embed;
};