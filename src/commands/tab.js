const { SlashCommandBuilder, time, EmbedBuilder, MessageManager, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Tab, Enterprise, Bill, Employee } = require('../dbObjects.js');
const { Op, literal } = require('sequelize');
const moment = require('moment');
const dotenv = require('dotenv');

dotenv.config();
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

const getArdoiseEmbed = async (tab = null) => {
	const embed = new EmbedBuilder()
		.setTitle('Ardoises')
		.setColor(tab ? tab.colour_tab : '000000')
		.setTimestamp(new Date());

	if (tab) {
		const enterprises = await tab.getEnterprises();
		for (const e of enterprises) {
			let field = 'Crédit restant : $' + (e.sum_ardoise ? e.sum_ardoise.toLocaleString('en') : '0');
			field += e.facture_max_ardoise ? '\nFacture max : $' + e.facture_max_ardoise : '';
			field += e.info_ardoise ? '\n' + e.info_ardoise : '';
			embed.addFields({ name: e.emoji_enterprise ? e.emoji_enterprise + ' ' + e.name_enterprise : e.name_enterprise, value: field, inline: true });
		}
	}

	return embed;
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ardoise')
		.setDescription('Gestion des ardoises')
		.setDMPermission(false)
		.setDefaultMemberPermissions('0')
		.addSubcommand(subcommand =>
			subcommand
				.setName('init')
				.setDescription('Initialise un message permettant d\'afficher des ardoises'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('couleur')
				.setDescription('Permet de modifier la couleur du message des ardoises')
				.addStringOption((option) =>
					option
						.setName('couleur')
						.setDescription('Couleur de l\'ardoise (sous format hexadécimal)')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('historique')
				.setDescription('Montre l\'historique des opérations sur les ardoises')
				.addStringOption((option) =>
					option
						.setName('filtre')
						.setDescription('Permet de choisir le format de l\'historique')
						.setRequired(false)
						.addChoices(
							{ name: 'Détail', value: 'detail' },
							{ name: 'Journée', value: 'day' },
							{ name: 'Semaine', value: 'week' },
						),
				)
				.addStringOption((option) =>
					option
						.setName('nom_entreprise')
						.setDescription('Nom de l\'entreprise')
						.setRequired(false)
						.setAutocomplete(true),
				),
		)
		.addSubcommandGroup(subcommandgroup =>
			subcommandgroup
				.setName('entreprise')
				.setDescription('Gestion des ardoises pour les entreprises')
				.addSubcommand(subcommand =>
					subcommand
						.setName('ajout')
						.setDescription('Permet d\'ajouter une ardoise à une entreprise')
						.addStringOption(option =>
							option
								.setName('nom_entreprise')
								.setDescription('Nom de l\'entreprise')
								.setRequired(true)
								.setAutocomplete(true),
						),
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('suppression')
						.setDescription('Permet de supprimer l\'ardoise d\'une entreprise')
						.addStringOption(option =>
							option
								.setName('nom_entreprise')
								.setDescription('Nom de l\'entreprise')
								.setRequired(true)
								.setAutocomplete(true),
						),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('retrait_message')
				.setDescription('Retire le message d\'ardoise de ce salon'),
		),
	async execute(interaction) {
		const hexa_regex = '^[A-Fa-f0-9]{6}$';

		if (interaction.options.getSubcommand() === 'init') {
			const existing_tab = await Tab.findOne({
				where: { id_channel: interaction.channelId },
			});

			if (!existing_tab) {
				const message = await interaction.reply({
					embeds: [await getArdoiseEmbed(null)],
					fetchReply: true,
				});

				await Tab.upsert({
					id_message: message.id,
					id_channel: interaction.channelId,
				});
			}
			else {
				try {
					const tab_to_delete = await interaction.channel.messages.fetch(existing_tab.id_message);
					await tab_to_delete.delete();
				}
				catch (error) {
					console.error(error);
				}

				const message = await interaction.reply({
					embeds: [await getArdoiseEmbed(existing_tab)],
					fetchReply: true,
				});

				await Tab.update({
					id_message: message.id,
				}, { where: { id_channel: interaction.channelId } });
			}
		}
		else if (interaction.options.getSubcommand() === 'couleur') {
			const colour_tab = interaction.options.getString('couleur') ? interaction.options.getString('couleur').trim() : '000000';

			if (colour_tab.match(hexa_regex) === null) {
				await interaction.reply({ content: 'La couleur ' + colour_tab + ' donné en paramètre est incorrecte.', ephemeral: true });
				return;
			}

			const tab = await Tab.findOne({
				where: { id_channel: interaction.channelId },
			});

			if (tab) {
				await tab.update({
					colour_tab: colour_tab,
				});

				const message = await interaction.channel.messages.fetch(tab.id_message);
				await message.edit({
					embeds: [await getArdoiseEmbed(tab)],
				});
				await interaction.reply({ content: 'La couleur de l\'ardoise a été modifié', ephemeral: true });
			}
			else {
				await interaction.reply({ content: 'Il n\'y a aucune ardoise dans ce salon', ephemeral: true });
			}
		}
		else if (interaction.options.getSubcommand() === 'historique') {
			await interaction.deferReply({ ephemeral: true });
			const filtre = interaction.options.getString('filtre') ? interaction.options.getString('filtre') : 'detail';
			const ent_param = interaction.options.getString('nom_entreprise');
			const enterprise = ent_param ? ent_param === 'Particulier' ? 'Particulier' : await Enterprise.findOne({ attributes: ['id_enterprise', 'name_enterprise', 'emoji_enterprise', 'color_enterprise'], where: { deleted: false, name_enterprise: { [Op.like]: `%${ent_param}%` } } }) : null;
			let start, end, message = null;

			if (ent_param && !enterprise) {
				return await interaction.editReply({ content: `Aucune entreprise portant le nom ${ent_param} n'a été trouvé`, ephemeral: true });
			}

			if (filtre === 'detail') {
				start = 0;
				end = 15;
				message = await interaction.editReply({
					embeds: [await getHistoryEmbed(interaction, await getData(filtre, enterprise, start, end), filtre, enterprise, start, end)],
					components: [getButtons(filtre, start, end)],
					fetchReply: true,
					ephemeral: true,
				});
			}
			else if (filtre === 'day') {
				start = moment.tz('Europe/Paris').startOf('day');
				end = moment.tz('Europe/Paris').endOf('day');
				message = await interaction.editReply({
					embeds: [await getHistoryEmbed(interaction, await getData(filtre, enterprise, start, end), filtre, enterprise, start, end)],
					components: [getButtons(filtre, start, end)],
					fetchReply: true,
					ephemeral: true,
				});
			}
			else {
				start = moment().startOf('week');
				end = moment().endOf('week');
				message = await interaction.editReply({
					embeds: [await getHistoryEmbed(interaction, await getData(filtre, enterprise, start, end), filtre, enterprise, start, end)],
					components: [getButtons(filtre, start, end)],
					fetchReply: true,
					ephemeral: true,
				});
			}

			const componentCollector = message.createMessageComponentCollector({ time: 840000 });

			componentCollector.on('collect', async i => {
				await i.deferUpdate();
				if (i.customId === 'next') {
					if (filtre === 'detail') {
						start += 15;
					}
					else if (filtre === 'day') {
						start.add('1', 'd');
						end.add('1', 'd');
					}
					else if (filtre === 'week') {
						start.add('1', 'w');
						end.add('1', 'w');
					}
					await i.editReply({
						embeds: [await getHistoryEmbed(interaction, await getData(filtre, enterprise, start, end), filtre, enterprise, start, end)],
						components: [getButtons(filtre, start, end)],
					});
				}
				else if (i.customId === 'previous') {
					if (filtre === 'detail') {
						start -= 15;
					}
					else if (filtre === 'day') {
						start.subtract('1', 'd');
						end.subtract('1', 'd');
					}
					else if (filtre === 'week') {
						start.subtract('1', 'w');
						end.subtract('1', 'w');
					}
					await i.editReply({
						embeds: [await getHistoryEmbed(interaction, await getData(filtre, enterprise, start, end), filtre, enterprise, start, end)],
						components: [getButtons(filtre, start, end)],
					});
				}
			});

			componentCollector.on('end', () => {
				interaction.editReply({ components: [] });
			});

		}
		else if (interaction.options.getSubcommand() === 'retrait_message') {
			const tab = await Tab.findOne({
				where: { id_channel: interaction.channelId },
			});

			if (!tab) {
				return await interaction.reply({ content: 'Il n\'y a aucune ardoise dans ce salon', ephemeral: true });
			}

			const enterprises = await tab.getEnterprises();

			for (const e of enterprises) {
				if (e.sum_ardoise && e.sum_ardoise !== 0) {
					return await interaction.reply({
						content: `Impossible de retirer le message d'ardoise, l'entreprise ${e.name_enterprise} a un solde différent de 0`,
						ephemeral: true,
					});
				}
			}

			try {
				const ardoise_to_delete = await interaction.channel.messages.fetch(tab.id_message);
				await ardoise_to_delete.delete();
			}
			catch (error) {
				console.error(error);
			}
			await Enterprise.update({ id_message: null }, { where : { id_message: tab.id_message } });
			await tab.destroy();
			return await interaction.reply({ content: 'Le message des ardoises a été retiré de ce salon', ephemeral: true });
		}
		else if (interaction.options.getSubcommandGroup() === 'entreprise') {
			if (interaction.options.getSubcommand() === 'ajout') {
				const name_enterprise = interaction.options.getString('nom_entreprise');
				const enterprise = await Enterprise.findOne({ where: { deleted: false, name_enterprise: { [Op.like]: `%${name_enterprise}%` } } }) ;

				if (!enterprise) {
					return await interaction.reply({ content: `Aucune entreprise portant le nom ${name_enterprise} n'a été trouvé`, ephemeral: true });
				}

				const tab = await Tab.findOne({
					where: { id_channel: interaction.channelId },
				});

				if (!tab) {
					return await interaction.reply({ content: 'Aucune ardoise est instancié dans ce salon', ephemeral: true });
				}
				if (tab.id_message === enterprise.id_message) {
					return await interaction.reply({ content: 'L\'entreprise est déjà présente sur cette ardoise', ephemeral: true });
				}

				const previous_tab_message = enterprise.id_message;
				await enterprise.update({ id_message: tab.id_message, sum_ardoise: 0 });
				const message = await interaction.channel.messages.fetch(tab.id_message);
				await message.edit({
					embeds: [await getArdoiseEmbed(tab)],
				});

				if (previous_tab_message !== null) {
					const previous_tab = await Tab.findOne({ where: { id_message: previous_tab_message } });
					const messageManager = new MessageManager(await interaction.client.channels.fetch(previous_tab.id_channel));
					const previous_message = await messageManager.fetch({ message: previous_tab_message });
					await previous_message.edit({
						embeds: [await getArdoiseEmbed(previous_tab)],
					});
				}

				return await interaction.reply({
					content: 'L\'entreprise ' + (enterprise.emoji_enterprise ? enterprise.emoji_enterprise + ' ' + enterprise.name_enterprise : enterprise.name_enterprise)
					+ ' a désormais une ardoise',
					ephemeral: true,
				});
			}
			else if (interaction.options.getSubcommand() === 'suppression') {
				const name_enterprise = interaction.options.getString('nom_entreprise');
				const enterprise = await Enterprise.findOne({ where: { deleted: false, name_enterprise: { [Op.like]: `%${name_enterprise}%` } } }) ;

				if (!enterprise) {
					return await interaction.reply({ content: `Aucune entreprise portant le nom ${name_enterprise} n'a été trouvé`, ephemeral: true });
				}
				if (!enterprise.id_message) {
					return await interaction.reply({ content: 'L\'entreprise n\'a pas d\'ardoise', ephemeral: true });
				}
				if (enterprise.sum_ardoise) {
					return await interaction.reply({ content: 'Le solde de l\'entreprise n\'est pas à $0', ephemeral: true });
				}
				else {
					const tab = await Tab.findOne({
						where: { id_message: enterprise.id_message },
					});
					await enterprise.update({ id_message: null, sum_ardoise: null, facture_max_ardoise: null, info_ardoise: null });
					const messageManager = new MessageManager(await interaction.client.channels.fetch(tab.id_channel));
					const tab_message = await messageManager.fetch({ message: tab.id_message });
					await tab_message.edit({
						embeds: [await getArdoiseEmbed(tab)],
					});
					return await interaction.reply({ content: 'L\'ardoise de l\'entreprise a été supprimé', ephemeral: true });
				}
			}
		}
	},
	getArdoiseEmbed,
};

const getButtons = (filtre, start, end) => {
	if (filtre !== 'detail') {
		return new ActionRowBuilder().addComponents([
			new ButtonBuilder({ customId: 'previous', label: 'Précédent', style: ButtonStyle.Primary }),
			new ButtonBuilder({ customId: 'next', label: 'Suivant', style: ButtonStyle.Primary }),
		]);
	}
	return new ActionRowBuilder().addComponents([
		new ButtonBuilder({ customId: 'previous', label: 'Précédent', disabled: start === 0, style: ButtonStyle.Primary }),
		new ButtonBuilder({ customId: 'info', label: (start + 1) + ' / ' + (start + end), disabled: true, style: ButtonStyle.Primary }),
		new ButtonBuilder({ customId: 'next', label: 'Suivant', style: ButtonStyle.Primary }),
	]);
};

const getData = async (filtre, enterprise, start, end) => {
	const where = new Object();
	where.on_tab = true;
	if (enterprise) {
		where.id_enterprise = enterprise.id_enterprise;
	}

	if (filtre === 'detail') {
		return await Bill.findAll({
			attributes: [
				'id_bill',
				'date_bill',
				'sum_bill',
				'id_enterprise',
				'id_employe',
				'info',
				'ignore_transaction',
			],
			where: where,
			include: [{ model: Employee }],
			order: [['date_bill', 'DESC']],
			offset: start,
			limit: end,
			raw: true,
		});
	}
	else {
		where.date_bill = { [Op.between]: [+start, +end] };
		return await Bill.findAll({
			attributes: [
				'id_enterprise',
				literal('SUM(IIF(ignore_transaction, sum_bill, 0)) as sum_neg'),
				literal('SUM(IIF(NOT(ignore_transaction), sum_bill, 0)) as sum_pos'),
			],
			where: where,
			group: ['id_enterprise'],
			raw: true,
		});
	}
};

const getHistoryEmbed = async (interaction, data, filtre, enterprise, start, end) => {
	const embed = new EmbedBuilder()
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
		.setTitle('Opérations sur les ardoises')
		.setColor(enterprise ? enterprise.color_enterprise : '#18913E')
		.setTimestamp(new Date());

	if (filtre !== 'detail') {
		embed.setDescription('Période du ' + time(start.unix()) + ' au ' + time(end.unix()));
	}

	if (data && data.length > 0) {
		if (filtre !== 'detail') {
			for (const d of data) {
				const ent = await Enterprise.findByPk(d.id_enterprise, { attributes: ['name_enterprise', 'emoji_enterprise'] });
				const title = ent ? ent.emoji_enterprise ? ent.name_enterprise + ' ' + ent.emoji_enterprise : ent.name_enterprise : d.id_enterprise;
				embed.addFields({ name: title, value: `\`\`\`diff\n+ $${d.sum_pos.toLocaleString('en')}\`\`\` \`\`\`diff\n- $${d.sum_neg.toLocaleString('en')}\`\`\``, inline: true });
			}
		}
		else {
			for (const d of data) {
				const ent = await Enterprise.findByPk(d.id_enterprise, { attributes: ['name_enterprise', 'emoji_enterprise'] });
				const title = ent ? ent.emoji_enterprise ? ent.name_enterprise + ' ' + ent.emoji_enterprise : ent.name_enterprise : d.id_enterprise;
				embed.addFields({
					name: title,
					value: `${d.ignore_transaction && d.sum_bill > 0 ? '$-' : '$'}${d.ignore_transaction && d.sum_bill < 0 ? (-d.sum_bill).toLocaleString('en') : d.sum_bill.toLocaleString('en')} ` +
					`par ${d['employee.name_employee']} le ${time(moment(d.date_bill, 'YYYY-MM-DD hh:mm:ss.S ZZ').unix(), 'F')}` +
					`${d.info ? '\nInfo: ' + d.info : ''}`,
				});
			}
		}
	}

	return embed;
};
