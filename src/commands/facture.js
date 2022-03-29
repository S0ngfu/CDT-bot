const { SlashCommandBuilder, time } = require('@discordjs/builders');
const { MessageEmbed, MessageManager, MessageActionRow, MessageButton } = require('discord.js');
const { Bill, Enterprise, Tab, BillDetail } = require('../dbObjects.js');
const moment = require('moment');
const dotenv = require('dotenv');

dotenv.config();
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

const guildId = process.env.GUILD_ID;
const channelId = process.env.CHANNEL_LIVRAISON_ID;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('facture')
		.setDescription('Permet de faire une facture')
		.setDefaultPermission(false)
		.addSubcommand(subcommand =>
			subcommand
				.setName('achat')
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
				.setName('vente')
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
						.setDescription('ajoute le montant sur l\'ardoise de l\'entreprise')
						.setRequired(false),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('historique')
				.setDescription('Montre l\'historique de toutes les factures')
				.addStringOption((option) =>
					option
						.setName('entreprise')
						.setDescription('Nom de l\'entreprise')
						.setRequired(false)
						.addChoice('ARC', '1')
						.addChoice('Benny\'s', '2')
						.addChoice('Blé d\'Or', '3')
						.addChoice('Weazle News', '4')
						.addChoice('Gouvernement', '5')
						.addChoice('Mairie BC', '6')
						.addChoice('Mairie LS', '7')
						.addChoice('M$T', '8')
						.addChoice('Paradise', '9')
						.addChoice('Particulier', 'Particulier')
						.addChoice('PBSC', '10')
						.addChoice('PLS', '11')
						.addChoice('Rapid\'Transit', '12')
						.addChoice('Rogers', '13')
						.addChoice('SBC', '14')
						.addChoice('Ryan\'s', '15'),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('suppression')
				.setDescription('Permet de supprimer une facture')
				.addStringOption((option) =>
					option
						.setName('id')
						.setDescription('Id de la facture à supprimer')
						.setRequired(true),
				),
		),
	async execute(interaction) {
		if (interaction.options.getSubcommand() === 'vente') {
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

			await Bill.upsert({
				id_bill: interaction.id,
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

				await Enterprise.increment({ sum_ardoise: parseInt(montant) }, { where: { id_enterprise: enterprise.id_enterprise } });

				await tab_to_update.edit({
					embeds: [await getArdoiseEmbed(tab)],
				});

				return await interaction.reply({ content: 'Vente de $' + montant.toLocaleString('en') + ' enregistrée sur l\'ardoise de ' + (enterprise.emoji_enterprise ? enterprise.emoji_enterprise + ' ' + enterprise.name_enterprise : enterprise.name_enterprise), ephemeral: true });
			}

			return await interaction.reply({ content: 'Vente de $' + montant.toLocaleString('en') + ' enregistrée pour ' + (client ? (enterprise.emoji_enterprise ? enterprise.emoji_enterprise + ' ' + enterprise.name_enterprise : enterprise.name_enterprise) : 'Particulier'), ephemeral: true });
		}
		else if (interaction.options.getSubcommand() === 'achat') {
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

			await Bill.upsert({
				id_bill: interaction.id,
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

				await Enterprise.decrement({ sum_ardoise: parseInt(montant) }, { where: { id_enterprise: enterprise.id_enterprise } });

				await tab_to_update.edit({
					embeds: [await getArdoiseEmbed(tab)],
				});
			}
			return await interaction.reply({ content: 'Achat de $' + montant.toLocaleString('en') + ' enregistrée pour ' + (client ? (enterprise.emoji_enterprise ? enterprise.emoji_enterprise + ' ' + enterprise.name_enterprise : enterprise.name_enterprise) : 'Particulier'), ephemeral: true });
		}
		else if (interaction.options.getSubcommand() === 'historique') {
			await interaction.deferReply({ ephemeral: true });
			const ent_param = interaction.options.getString('entreprise') || null;
			const enterprise = parseInt(ent_param) ? await Enterprise.findByPk(parseInt(ent_param), { attributes: ['id_enterprise', 'name_enterprise', 'emoji_enterprise', 'color_enterprise'] }) : ent_param;
			let start, message = null;
			const nb_data = 15;

			start = 0;
			message = await interaction.editReply({
				embeds: [await getHistoryEmbed(interaction, await getData(enterprise, start, nb_data), enterprise, start, nb_data)],
				components: [getButtons(start, nb_data)],
				fetchReply: true,
				ephemeral: true,
			});

			const componentCollector = message.createMessageComponentCollector({ time: 840000 });

			componentCollector.on('collect', async i => {
				await i.deferUpdate();
				if (i.customId === 'next') {
					start += 15;

					await i.editReply({
						embeds: [await getHistoryEmbed(interaction, await getData(enterprise, start, nb_data), enterprise, start, nb_data)],
						components: [getButtons(start, nb_data)],
					});
				}
				else if (i.customId === 'previous') {
					start -= 15;
					await i.editReply({
						embeds: [await getHistoryEmbed(interaction, await getData(enterprise, start, nb_data), enterprise, start, nb_data)],
						components: [getButtons(start, nb_data)],
					});
				}
			});

			componentCollector.on('end', () => {
				interaction.editReply({ components: [] });
			});

		}
		else if (interaction.options.getSubcommand() === 'suppression') {
			const id = interaction.options.getString('id');
			const bill = await Bill.findByPk(id);
			const enterprise = bill.id_enterprise ? await Enterprise.findByPk(bill.id_enterprise) : null;

			if (!bill) {
				return await interaction.reply({ content: `Aucune facture trouvé ayant l'id ${id}`, ephemeral:true });
			}

			if (bill.on_tab) {
				const tab = await Tab.findOne({
					where: { id_message: enterprise.id_message },
				});

				if (tab) {
					const messageManager = new MessageManager(await interaction.client.channels.fetch(tab.id_channel));
					const tab_to_update = await messageManager.fetch(tab.id_message);

					if (bill.ignore_transaction) {
						await Enterprise.increment({ sum_ardoise: parseInt(bill.sum_bill) }, { where: { id_enterprise: bill.id_enterprise } });
					}
					else {
						await Enterprise.decrement({ sum_ardoise: parseInt(bill.sum_bill) }, { where: { id_enterprise: bill.id_enterprise } });
					}

					await tab_to_update.edit({
						embeds: [await getArdoiseEmbed(tab)],
					});
				}
			}

			if (bill.url) {
				try {
					const messageManager = new MessageManager(await interaction.client.channels.fetch(channelId));
					const message_to_delete = await messageManager.fetch(bill.id_bill);
					await message_to_delete.delete();
				}
				catch (error) {
					console.log('Error: ', error);
				}
			}

			await BillDetail.destroy({
				where: { id_bill: bill.id_bill },
			});

			await Bill.destroy({
				where: { id_bill: bill.id_bill },
			});

			const guild = await interaction.client.guilds.fetch(guildId);
			let user = null;
			try {
				user = await guild.members.fetch(bill.id_employe);
			}
			catch (error) {
				console.log('ERR - historique_tab: ', error);
			}
			const employe = user ? user.nickname ? user.nickname : user.user.username : bill.id_employe;
			const name_client = enterprise ? (enterprise.emoji_enterprise ? enterprise.emoji_enterprise + ' ' + enterprise.name_enterprise : enterprise.name_enterprise) : 'Particulier';

			return await interaction.reply({
				content: `La facture ${bill.id_bill} de $${bill.sum_bill.toLocaleString('en')} ${bill.on_tab ? 'sur l\'ardoise ' : ''}` +
				`faite le ${time(moment(bill.date_bill, 'YYYY-MM-DD hh:mm:ss.S ZZ').unix(), 'F')} à ${name_client} par ${employe} a été supprimé`,
				ephemeral: true,
			});
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

const getButtons = (start, nb_data) => {
	return new MessageActionRow().addComponents([
		new MessageButton({ customId: 'previous', label: 'Précédent', disabled: start === 0, style: 'PRIMARY' }),
		new MessageButton({ customId: 'info', label: (start + 1) + ' / ' + (start + nb_data), disabled: true, style: 'PRIMARY' }),
		new MessageButton({ customId: 'next', label: 'Suivant', style: 'PRIMARY' }),
	]);
};

const getData = async (enterprise, start, nb_data) => {
	const where = new Object();
	if (enterprise) {
		where.id_enterprise = enterprise === 'Particulier' ? null : enterprise.id_enterprise;
	}

	return await Bill.findAll({
		attributes: [
			'id_bill',
			'date_bill',
			'sum_bill',
			'id_enterprise',
			'id_employe',
			'info',
			'ignore_transaction',
			'url',
		],
		where: where,
		order: [['date_bill', 'DESC']],
		offset: start,
		limit: nb_data,
		raw: true,
	});
};

const getHistoryEmbed = async (interaction, data, enterprise) => {
	const guild = await interaction.client.guilds.fetch(guildId);
	const embed = new MessageEmbed()
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
		.setTitle('Historique des factures')
		.setColor(enterprise && enterprise?.color_enterprise ? enterprise.color_enterprise : '#18913E')
		.setTimestamp(new Date());

	if (data && data.length > 0) {
		for (const d of data) {
			let user = null;
			try {
				user = await guild.members.fetch(d.id_employe);
			}
			catch (error) {
				console.log('ERR - historique_tab: ', error);
			}

			let title = 'Particulier';

			if (d?.id_enterprise) {
				const ent = await Enterprise.findByPk(d.id_enterprise, { attributes: ['name_enterprise', 'emoji_enterprise'] });
				title = ent ? ent.emoji_enterprise ? ent.name_enterprise + ' ' + ent.emoji_enterprise : ent.name_enterprise : d.id_enterprise;
			}

			const name = user ? user.nickname ? user.nickname : user.user.username : d.id_employe;
			embed.addField(
				title,
				`${d.ignore_transaction && d.sum_bill > 0 ? '$-' : '$'}${d.ignore_transaction && d.sum_bill < 0 ? (-d.sum_bill).toLocaleString('en') : d.sum_bill.toLocaleString('en')} ` +
				`${d.on_tab ? 'sur l\'ardoise' : ''} par ${name} le ` +
				`${time(moment(d.date_bill, 'YYYY-MM-DD hh:mm:ss.S ZZ').unix(), 'F')}\n` +
				`${d.info ? 'Info: ' + d.info + '\n' : ''}` +
				`id: ${d.id_bill}` + (d.url ? ('\n[Lien vers le message](' + d.url + ')') : ''),
				false,
			);
		}
	}

	return embed;
};
