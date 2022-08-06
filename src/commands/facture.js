const { SlashCommandBuilder, time } = require('@discordjs/builders');
const { EmbedBuilder, MessageManager, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Bill, Enterprise, Tab, BillDetail, Product } = require('../dbObjects.js');
const { Op, literal, col, fn } = require('sequelize');
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
const roleId = process.env.DIRECTION_ROLE_ID;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('facture')
		.setDescription('Permet de faire une facture')
		.setDMPermission(false)
		.setDefaultMemberPermissions('0')
		.addSubcommand(subcommand =>
			subcommand
				.setName('achat')
				.setDescription('Permet d\'enregistrer un achat')
				.addStringOption((option) =>
					option
						.setName('client')
						.setDescription('Permet de choisir l\'entreprise')
						.setRequired(true)
						.setAutocomplete(true),
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
						.setDescription('Retire le montant sur l\'ardoise de l\'entreprise')
						.setRequired(false),
				).addBooleanOption((option) =>
					option
						.setName('non_impôsable')
						.setDescription('Indique si la facture est non impôsable')
						.setRequired(false),
				).addBooleanOption((option) =>
					option
						.setName('argent_sale')
						.setDescription('À utiliser uniquement si l\'on souhaite que le montant apparaîsse sur la feuille d\'impôt')
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
						.setAutocomplete(true),
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
				).addBooleanOption((option) =>
					option
						.setName('non_impôsable')
						.setDescription('Indique si la facture n\'est pas impôsable')
						.setRequired(false),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('historique')
				.setDescription('Montre l\'historique de toutes les factures')
				.addStringOption((option) =>
					option
						.setName('nom_entreprise')
						.setDescription('Nom de l\'entreprise')
						.setRequired(false)
						.setAutocomplete(true),

				)
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
				.addBooleanOption((option) =>
					option
						.setName('detail_produit')
						.setDescription('Permet d\'avoir le détail par produit')
						.setRequired(false),
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
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('modification')
				.setDescription('Permet de modifier une facture')
				.addStringOption((option) =>
					option
						.setName('id')
						.setDescription('Id de la facture à modifier')
						.setRequired(true),
				).addStringOption((option) =>
					option
						.setName('client')
						.setDescription('À renseigner seulement si l\'on souhaite modifier l\'entreprise')
						.setRequired(false)
						.setAutocomplete(true),
				).addIntegerOption((option) =>
					option
						.setName('montant')
						.setDescription('Nouveau montant de la facture')
						.setRequired(false),
				).addStringOption((option) =>
					option
						.setName('libelle')
						.setDescription('Nouveau libellé de la facture')
						.setRequired(false),
				).addBooleanOption((option) =>
					option
						.setName('ardoise')
						.setDescription('Retire le montant sur l\'ardoise de l\'entreprise')
						.setRequired(false),
				).addBooleanOption((option) =>
					option
						.setName('non_impôsable')
						.setDescription('Indique si la facture est non impôsable')
						.setRequired(false),
				).addBooleanOption((option) =>
					option
						.setName('argent_sale')
						.setDescription('À utiliser uniquement si l\'on souhaite que le montant apparaîsse sur la feuille d\'impôt')
						.setRequired(false),
				),
		),
	async execute(interaction) {
		if (interaction.options.getSubcommand() === 'vente') {
			const client = interaction.options.getString('client') || null;
			const montant = interaction.options.getInteger('montant');
			const libelle = interaction.options.getString('libelle');
			const on_tab = interaction.options.getBoolean('ardoise') || false;
			const nontaxable = interaction.options.getBoolean('non_impôsable') === null ? false : interaction.options.getBoolean('non_impôsable');
			const enterprise = client === 'Particulier' ? 'Particulier' : await Enterprise.findOne({ attributes: ['id_enterprise', 'name_enterprise', 'emoji_enterprise', 'color_enterprise', 'id_message'], where: { deleted: false, name_enterprise: { [Op.like]: `%${client}%` } } });

			if (!enterprise) {
				return await interaction.reply({ content: `Aucun client portant le nom ${client} n'a été trouvé`, ephemeral: true });
			}

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
				id_enterprise: enterprise === 'Particulier' ? null : enterprise.id_enterprise,
				id_employe: interaction.user.id,
				sum_bill: montant,
				info: libelle,
				on_tab: on_tab,
				nontaxable: nontaxable,
			});

			if (on_tab) {
				const tab = await Tab.findOne({
					where: { id_message: enterprise.id_message },
				});
				const messageManager = new MessageManager(await interaction.client.channels.fetch(tab.id_channel));
				const tab_to_update = await messageManager.fetch({ message: enterprise.id_message });

				await Enterprise.increment({ sum_ardoise: parseInt(montant) }, { where: { id_enterprise: enterprise.id_enterprise } });

				await tab_to_update.edit({
					embeds: [await getArdoiseEmbed(tab)],
				});

				return await interaction.reply({ content: `Vente de $${montant.toLocaleString('en')} enregistrée sur l'ardoise de ${enterprise.emoji_enterprise ? enterprise.emoji_enterprise + ' ' + enterprise.name_enterprise : enterprise.name_enterprise}`, ephemeral: true });
			}

			return await interaction.reply({ content: `Vente de $${montant.toLocaleString('en')} enregistrée pour ${enterprise === 'Particulier' ? 'Particulier' : enterprise.emoji_enterprise ? enterprise.emoji_enterprise + ' ' + enterprise.name_enterprise : enterprise.name_enterprise}`, ephemeral: true });
		}
		else if (interaction.options.getSubcommand() === 'achat') {
			const client = interaction.options.getString('client');
			const montant = interaction.options.getInteger('montant');
			const libelle = interaction.options.getString('libelle');
			const on_tab = interaction.options.getBoolean('ardoise') || false;
			const nontaxable = interaction.options.getBoolean('non_impôsable') === null ? false : interaction.options.getBoolean('non_impôsable');
			const dirty_money = interaction.options.getBoolean('argent_sale') === null ? false : interaction.options.getBoolean('argent_sale');
			const enterprise = client === 'Particulier' ? 'Particulier' : await Enterprise.findOne({ attributes: ['id_enterprise', 'name_enterprise', 'emoji_enterprise', 'color_enterprise', 'id_message'], where: { deleted: false, name_enterprise: { [Op.like]: `%${client}%` } } });

			if (!enterprise) {
				return await interaction.reply({ content: `Aucun client portant le nom ${client} n'a été trouvé`, ephemeral: true });
			}

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
				id_enterprise: enterprise === 'Particulier' ? null : enterprise.id_enterprise,
				id_employe: interaction.user.id,
				sum_bill: -montant,
				info: libelle,
				on_tab: on_tab,
				dirty_money: dirty_money,
				nontaxable: nontaxable,
			});

			if (on_tab) {
				const tab = await Tab.findOne({
					where: { id_message: enterprise.id_message },
				});
				const messageManager = new MessageManager(await interaction.client.channels.fetch(tab.id_channel));
				const tab_to_update = await messageManager.fetch({ message: enterprise.id_message });

				await Enterprise.decrement({ sum_ardoise: parseInt(montant) }, { where: { id_enterprise: enterprise.id_enterprise } });

				await tab_to_update.edit({
					embeds: [await getArdoiseEmbed(tab)],
				});
				return await interaction.reply({ content: `Achat de $${montant.toLocaleString('en')} enregistrée sur l'ardoise de ${enterprise.emoji_enterprise ? enterprise.emoji_enterprise + ' ' + enterprise.name_enterprise : enterprise.name_enterprise}`, ephemeral: true });
			}

			return await interaction.reply({ content: `Achat de $${montant.toLocaleString('en')} enregistrée pour ${enterprise === 'Particulier' ? 'Particulier' : enterprise.emoji_enterprise ? enterprise.emoji_enterprise + ' ' + enterprise.name_enterprise : enterprise.name_enterprise}`, ephemeral: true });
		}
		else if (interaction.options.getSubcommand() === 'historique') {
			await interaction.deferReply({ ephemeral: true });
			const filtre = interaction.options.getString('filtre') ? interaction.options.getString('filtre') : 'detail';
			const detail_produit = interaction.options.getBoolean('detail_produit') || false;
			const name_enterprise = interaction.options.getString('nom_entreprise');
			const enterprise = name_enterprise ? name_enterprise === 'Particulier' ? 'Particulier' : await Enterprise.findOne({ attributes: ['id_enterprise', 'name_enterprise', 'emoji_enterprise', 'color_enterprise'], where: { deleted: false, name_enterprise: { [Op.like]: `%${name_enterprise}%` } } }) : null;
			let start, end, message = null;

			if (name_enterprise && !enterprise) {
				return await interaction.editReply({ content: `Aucun client portant le nom ${name_enterprise} n'a été trouvé`, ephemeral: true });
			}

			if (filtre === 'detail') {
				start = 0;
				end = 15;
				message = await interaction.editReply({
					embeds: await getHistoryEmbed(interaction, await getData(filtre, enterprise, detail_produit, start, end), filtre, enterprise, detail_produit, start, end),
					components: [getButtons(filtre, start, end)],
					fetchReply: true,
					ephemeral: true,
				});
			}
			else if (filtre === 'day') {
				start = moment.tz('Europe/Paris').startOf('day').hours(6);
				end = moment.tz('Europe/Paris').startOf('day').add(1, 'd').hours(6);
				message = await interaction.editReply({
					embeds: await getHistoryEmbed(interaction, await getData(filtre, enterprise, detail_produit, start, end), filtre, enterprise, detail_produit, start, end),
					components: [getButtons(filtre, start, end)],
					fetchReply: true,
					ephemeral: true,
				});
			}
			else {
				start = moment().startOf('week').hours(6);
				end = moment().startOf('week').add(7, 'd').hours(6);
				message = await interaction.editReply({
					embeds: await getHistoryEmbed(interaction, await getData(filtre, enterprise, detail_produit, start, end), filtre, enterprise, detail_produit, start, end),
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
						embeds: await getHistoryEmbed(interaction, await getData(filtre, enterprise, detail_produit, start, end), filtre, enterprise, detail_produit, start, end),
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
						embeds: await getHistoryEmbed(interaction, await getData(filtre, enterprise, detail_produit, start, end), filtre, enterprise, detail_produit, start, end),
						components: [getButtons(filtre, start, end)],
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

			if (!bill) {
				return await interaction.reply({ content: `Aucune facture trouvé ayant l'id ${id}`, ephemeral:true });
			}

			const enterprise = bill.id_enterprise ? await Enterprise.findByPk(bill.id_enterprise) : null;

			if (bill.on_tab) {
				const tab = await Tab.findOne({
					where: { id_message: enterprise.id_message },
				});

				if (tab) {
					const messageManager = new MessageManager(await interaction.client.channels.fetch(tab.id_channel));
					const tab_to_update = await messageManager.fetch({ message: tab.id_message });

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
					const message_to_delete = await messageManager.fetch({ message: bill.id_bill });
					await message_to_delete.delete();
				}
				catch (error) {
					console.error(error);
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
				console.error(error);
			}
			const employe = user ? user.nickname ? user.nickname : user.user.username : bill.id_employe;
			const name_client = enterprise ? (enterprise.emoji_enterprise ? enterprise.emoji_enterprise + ' ' + enterprise.name_enterprise : enterprise.name_enterprise) : 'Particulier';

			return await interaction.reply({
				content: `La facture ${bill.id_bill} de $${bill.sum_bill.toLocaleString('en')} ${bill.on_tab ? 'sur l\'ardoise ' : ''}` +
				`faite le ${time(moment(bill.date_bill, 'YYYY-MM-DD hh:mm:ss.S ZZ').unix(), 'F')} à ${name_client} par ${employe} a été supprimé`,
				ephemeral: true,
			});
		}
		else if (interaction.options.getSubcommand() === 'modification') {
			const id = interaction.options.getString('id');
			const facture = await Bill.findByPk(id, { include: [{ model: BillDetail }, { model: Enterprise }] });

			if (facture) {
				if (facture.url) {
					const command = interaction.client.commands.get('calculo');
					await command.execute(interaction, facture);
				}
				else {
					const client = interaction.options.getString('client');
					const montant = interaction.options.getInteger('montant');
					const libelle = interaction.options.getString('libelle');
					const on_tab = interaction.options.getBoolean('ardoise');
					const dirty_money = interaction.options.getBoolean('argent_sale') === null ? false : interaction.options.getBoolean('argent_sale');
					const nontaxable = interaction.options.getBoolean('non_impôsable') === null ? false : interaction.options.getBoolean('non_impôsable');
					const enterprise = client ? client === 'Particulier' ? 'Particulier' : await Enterprise.findOne({ attributes: ['id_enterprise', 'name_enterprise', 'emoji_enterprise', 'id_message', 'sum_ardoise'], where: { deleted: false, name_enterprise: { [Op.like]: `%${client}%` } } }) : null;

					if (client && !enterprise) {
						return await interaction.reply({ content: `Aucun client portant le nom ${client} n'a été trouvé`, ephemeral: true });
					}

					if (on_tab || (on_tab === null && facture.on_tab)) {
						if (enterprise === 'Particulier' || (enterprise === null && facture.enterprise === null)) {
							return await interaction.reply({
								content: 'Il n\'est pas possible de mettre cette facture sur ardoise à un particulier.\n' +
								'La facture n\'a pas été modifié : \n' +
								`Id : ${facture.id_bill}\n` +
								`Montant : $${facture.sum_bill.toLocaleString('en')}\n` +
								`Entreprise : ${facture.id_enterprise}\n` +
								`Info : ${facture.info}\n` +
								`Sur ardoise : ${facture.on_tab ? 'Oui' : 'Non'}\n` +
								`Argent sale : ${facture.dirty_money ? 'Oui' : 'Non'}\n` +
								`Non imposable : ${facture.nontaxable ? 'Oui' : 'Non'}`,
								ephemeral: true });
						}
						else if ((enterprise && !enterprise.id_message)) {
							return await interaction.reply({
								content: `Il n'est pas possible de mettre cette facture sur ardoise à ${enterprise.name_enterprise} car elle n'a pas d'ardoise.\n` +
								'La facture n\'a pas été modifié : \n' +
								`Id : ${facture.id_bill}\n` +
								`Montant : $${facture.sum_bill.toLocaleString('en')}\n` +
								`Entreprise : ${facture.id_enterprise}\n` +
								`Info : ${facture.info}\n` +
								`Sur ardoise : ${facture.on_tab ? 'Oui' : 'Non'}\n` +
								`Argent sale : ${facture.dirty_money ? 'Oui' : 'Non'}\n` +
								`Non imposable : ${facture.nontaxable ? 'Oui' : 'Non'}`,
								ephemeral: true });
						}
						else if (enterprise === null && !facture.enterprise.id_message) {
							return await interaction.reply({
								content: `Il n'est pas possible de mettre cette facture sur ardoise à ${facture.enterprise.name_enterprise} car elle n'a pas d'ardoise.\n` +
								'La facture n\'a pas été modifié : \n' +
								`Id : ${facture.id_bill}\n` +
								`Montant : $${facture.sum_bill.toLocaleString('en')}\n` +
								`Entreprise : ${facture.id_enterprise}\n` +
								`Info : ${facture.info}\n` +
								`Sur ardoise : ${facture.on_tab ? 'Oui' : 'Non'}\n` +
								`Argent sale : ${facture.dirty_money ? 'Oui' : 'Non'}\n` +
								`Non imposable : ${facture.nontaxable ? 'Oui' : 'Non'}`,
								ephemeral: true });
						}
					}

					if (facture.on_tab) {
						const tab = await Tab.findOne({
							where: { id_message: facture.enterprise.id_message },
						});
						if (tab) {
							const messageManager = new MessageManager(await interaction.client.channels.fetch(tab.id_channel));
							const tab_to_update = await messageManager.fetch({ message: tab.id_message });

							if (facture.ignore_transaction) {
								await Enterprise.increment({ sum_ardoise: parseInt(facture.sum_bill) }, { where: { id_enterprise: facture.enterprise.id_enterprise } });
							}
							else {
								await Enterprise.decrement({ sum_ardoise: parseInt(facture.sum_bill) }, { where: { id_enterprise: facture.enterprise.id_enterprise } });
							}

							await tab_to_update.edit({
								embeds: [await getArdoiseEmbed(tab)],
							});
						}
					}

					if (on_tab || (on_tab === null && facture.on_tab)) {
						if (enterprise !== null) {
							const tab = await Tab.findOne({
								where: { id_message: enterprise.id_message },
							});
							if (tab) {
								const messageManager = new MessageManager(await interaction.client.channels.fetch(tab.id_channel));
								const tab_to_update = await messageManager.fetch({ message: tab.id_message });

								if (facture.ignore_transaction) {
									await Enterprise.decrement({ sum_ardoise: montant !== null ? parseInt(montant) : facture.sum_bill }, { where: { id_enterprise: enterprise.id_enterprise } });
								}
								else {
									await Enterprise.increment({ sum_ardoise: montant !== null ? parseInt(montant) : facture.sum_bill }, { where: { id_enterprise: enterprise.id_enterprise } });
								}

								await tab_to_update.edit({
									embeds: [await getArdoiseEmbed(tab)],
								});
							}
						}
						else {
							const tab = await Tab.findOne({
								where: { id_message: facture.enterprise.id_message },
							});
							if (tab) {
								const messageManager = new MessageManager(await interaction.client.channels.fetch(tab.id_channel));
								const tab_to_update = await messageManager.fetch({ message: tab.id_message });

								if (facture.ignore_transaction) {
									await Enterprise.decrement({ sum_ardoise: montant !== null ? parseInt(montant) : facture.sum_bill }, { where: { id_enterprise: facture.enterprise.id_enterprise } });
								}
								else {
									await Enterprise.increment({ sum_ardoise: montant !== null ? parseInt(montant) : facture.sum_bill }, { where: { id_enterprise: facture.enterprise.id_enterprise } });
								}

								await tab_to_update.edit({
									embeds: [await getArdoiseEmbed(tab)],
								});
							}
						}
					}

					const [updated] = await Bill.upsert({
						id_bill: id,
						sum_bill: montant !== null ? montant : facture.sum_bill,
						id_enterprise: enterprise !== null ? enterprise === 'Particulier' ? null : enterprise.id_enterprise : facture.id_enterprise,
						info: libelle !== null ? libelle : facture.info,
						on_tab: on_tab !== null ? on_tab : facture.on_tab,
						dirty_money: dirty_money !== null ? dirty_money : facture.dirty_money,
						nontaxable: nontaxable !== null ? nontaxable : facture.nontaxable,
					});

					return await interaction.reply({
						content: `La facture ${id} a été mise à jour :\n` +
						`Montant : $${updated.sum_bill.toLocaleString('en')}\n` +
						`Entreprise : ${enterprise ? enterprise === 'Particulier' ? 'Particulier' : enterprise.name_enterprise : facture.enterprise ? facture.enterprise.name_enterprise : 'Particulier' }\n` +
						`Info : ${updated.info}\n` +
						`Sur ardoise : ${updated.on_tab ? 'Oui' : 'Non'}\n` +
						`Argent sale : ${updated.dirty_money ? 'Oui' : 'Non'}\n` +
						`Non imposable : ${updated.nontaxable ? 'Oui' : 'Non'}\n`,
						ephemeral: true,
					});
				}
			}
			else {
				return await interaction.reply({ content: `Aucune facture trouvé ayant l'id ${id}`, ephemeral:true });
			}
		}
	},
	async buttonClicked(interaction) {
		const admin = interaction.member.roles.cache.has(roleId);
		if (!admin) {
			return interaction.reply({ content: 'Vous ne pouvez pas valider une demande de remboursement', ephemeral: true });
		}

		const embed = EmbedBuilder.from(interaction.message.embeds[0]);
		embed.setTitle('Frais remboursé ✅');
		await interaction.deferUpdate();
		await interaction.editReply({ embeds: [embed], components: [] });
	},
};

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

const getButtons = (filtre, start, end) => {
	if (filtre !== 'detail') {
		return new ActionRowBuilder().addComponents([
			new ButtonBuilder({ customId: 'previous', label: 'Précédent', style: ButtonStyle.Primary }),
			new ButtonBuilder({ customId: 'next', label: 'Suivant', style: ButtonStyle.Primary }),
		]);
	}
	else {
		return new ActionRowBuilder().addComponents([
			new ButtonBuilder({ customId: 'previous', label: 'Précédent', disabled: start === 0, style: ButtonStyle.Primary }),
			new ButtonBuilder({ customId: 'info', label: (start + 1) + ' / ' + (start + end), disabled: true, style: ButtonStyle.Primary }),
			new ButtonBuilder({ customId: 'next', label: 'Suivant', style: ButtonStyle.Primary }),
		]);
	}

};

const getData = async (filtre, enterprise, detail_produit, start, end) => {
	const where = new Object();
	if (enterprise) {
		where.id_enterprise = enterprise === 'Particulier' ? null : enterprise.id_enterprise;
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
				'on_tab',
				'ignore_transaction',
				'dirty_money',
				'nontaxable',
				'url',
			],
			where: where,
			order: [['date_bill', 'DESC']],
			offset: start,
			limit: end,
			raw: true,
		});
	}
	else {
		where.date_bill = { [Op.between]: [+start, +end] };
		if (detail_produit) {
			return await BillDetail.findAll({
				attributes: [
					[col('product.name_product'), 'name_product'],
					[col('product.emoji_product'), 'emoji_product'],
					[fn('sum', col('bill_detail.quantity')), 'total_quantity'],
					[fn('sum', col('bill_detail.sum')), 'total_sum'],
				],
				group: [col('bill_detail.id_product')],
				include: [
					{
						model: Bill,
						where: where,
					},
					{
						model: Product,
					},
				],
			});
		}
		else {
			where.ignore_transaction = false;
			return await Bill.findAll({
				attributes: [
					'id_enterprise',
					literal('SUM(IIF(sum_bill < 0, sum_bill, 0)) as sum_neg'),
					literal('SUM(IIF(sum_bill > 0, sum_bill, 0)) as sum_pos'),
				],
				where: where,
				group: ['id_enterprise'],
				raw: true,
			});
		}
	}

};

const getHistoryEmbed = async (interaction, data, filtre, enterprise, detail_produit, start, end) => {
	const guild = await interaction.client.guilds.fetch(guildId);
	const arrayEmbed = [];
	let embed = new EmbedBuilder()
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
		.setTitle('Historique des factures')
		.setColor(enterprise && enterprise?.color_enterprise ? enterprise.color_enterprise : '#18913E')
		.setTimestamp(new Date());

	if (filtre !== 'detail') {
		embed.setDescription('Période du ' + time(start.unix()) + ' au ' + time(end.unix()));
	}

	if (data && data.length > 0) {
		if (filtre !== 'detail') {
			if (detail_produit) {
				let sum = 0;
				if (enterprise) {
					embed.setTitle(`Détail des produits commandés par ${enterprise !== 'Particulier' ? enterprise.emoji_enterprise ? enterprise.name_enterprise + ' ' + enterprise.emoji_enterprise : enterprise.name_enterprise : 'Particulier'}`);
				}
				else {
					embed.setTitle('Détail des produits commandés');
				}

				for (const [i, d] of data.entries()) {
					sum += d.dataValues.total_sum;
					embed.addFields({
						name: d.dataValues.emoji_product ? d.dataValues.name_product + ' ' + d.dataValues.emoji_product : d.dataValues.name_product,
						value: `${d.dataValues.total_quantity.toLocaleString('en')} pour $${d.dataValues.total_sum.toLocaleString('en')}`,
						inline: true,
					});
					if (i % 25 === 24) {
						arrayEmbed.push(embed);
						embed = new EmbedBuilder()
							.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
							.setDescription('Période du ' + time(start.unix()) + ' au ' + time(end.unix()))
							.setColor(enterprise && enterprise?.color_enterprise ? enterprise.color_enterprise : '#18913E')
							.setTimestamp(new Date());
						if (enterprise) {
							embed.setTitle(`Détail des produits commandés par ${enterprise !== 'Particulier' ? enterprise.emoji_enterprise ? enterprise.name_enterprise + ' ' + enterprise.emoji_enterprise : enterprise.name_enterprise : 'Particulier'}`);
						}
						else {
							embed.setTitle('Détail des produits commandés');
						}
					}
				}

				embed.addFields({ name: 'Total', value: `$${sum.toLocaleString('en')}` });
				arrayEmbed.push(embed);
			}
			else {
				for (const d of data) {
					const ent = await Enterprise.findByPk(d.id_enterprise, { attributes: ['name_enterprise', 'emoji_enterprise'] });
					const title = ent ? ent.emoji_enterprise ? ent.name_enterprise + ' ' + ent.emoji_enterprise : ent.name_enterprise : 'Particulier/Autre';
					embed.addFields({ name: title, value: `\`\`\`diff\n+ $${d.sum_pos.toLocaleString('en')}\`\`\` \`\`\`diff\n- $${Math.abs(d.sum_neg).toLocaleString('en')}\`\`\``, inline: true });
				}
				arrayEmbed.push(embed);
			}
		}
		else {
			for (const d of data) {
				let user = null;
				try {
					user = await guild.members.fetch(d.id_employe);
				}
				catch (error) {
					console.error(error);
				}

				let title = 'Particulier';

				if (d?.id_enterprise) {
					const ent = await Enterprise.findByPk(d.id_enterprise, { attributes: ['name_enterprise', 'emoji_enterprise'] });
					title = ent ? ent.emoji_enterprise ? ent.name_enterprise + ' ' + ent.emoji_enterprise : ent.name_enterprise : d.id_enterprise;
				}

				const name = user ? user.nickname ? user.nickname : user.user.username : d.id_employe;
				embed.addFields({
					name: title,
					value: `${d.ignore_transaction && d.sum_bill > 0 ? '$-' : '$'}${d.ignore_transaction && d.sum_bill < 0 ? (-d.sum_bill).toLocaleString('en') : d.sum_bill.toLocaleString('en')} ` +
					`${d.on_tab ? 'sur l\'ardoise' : ''} par ${name} le ` +
					`${time(moment(d.date_bill, 'YYYY-MM-DD hh:mm:ss.S ZZ').unix(), 'F')}\n` +
					`${d.info ? 'Info: ' + d.info + '\n' : ''}` +
					`${d.dirty_money ? 'Argent sale\n' : ''}` +
					`${d.nontaxable ? 'Non impôsable\n' : ''}` +
					`id: ${d.id_bill}` + (d.url ? ('\n[Lien vers le message](' + d.url + ')') : ''),
					inline: false,
				});
			}
			arrayEmbed.push(embed);
		}
	}
	else {
		arrayEmbed.push(embed);
	}

	return arrayEmbed;
};
