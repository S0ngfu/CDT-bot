const { SlashCommandBuilder, time, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, MessageManager } = require('discord.js');
const { FuelConfig, Fuel, Employee } = require('../dbObjects.js');
const { Op, fn, col } = require('sequelize');
const moment = require('moment');
const dotenv = require('dotenv');

dotenv.config();
const channelId = process.env.CHANNEL_LIVRAISON_ID;
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

module.exports = {
	data: new SlashCommandBuilder()
		.setName('essence')
		.setDescription('Gestion des ravitaillements en essence')
		.setDMPermission(false)
		.setDefaultMemberPermissions('0')
		.addSubcommand(subcommand =>
			subcommand
				.setName('historique')
				.setDescription('Affiche l\'historique des ravitaillements effectué')
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
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('supprimer')
				.setDescription('Permet de supprimer un ravitaillement')
				.addIntegerOption(option =>
					option
						.setName('id')
						.setDescription('ID du ravitaillement à supprimer')
						.setRequired(true)
						.setMinValue(1),
				),
		)
		.addSubcommandGroup(subcommandgroup =>
			subcommandgroup
				.setName('configuration')
				.setDescription('Configuration des options de ravitaillements')
				.addSubcommand(subcommand =>
					subcommand
						.setName('ajouter')
						.setDescription('Ajoute une option de ravitaillement')
						.addIntegerOption(option =>
							option
								.setName('quantite')
								.setDescription('Quantité en L du ravitaillement')
								.setRequired(true)
								.setMinValue(1)
								.setMaxValue(2000),
						)
						.addIntegerOption(option =>
							option
								.setName('prix')
								.setDescription('Prix du ravitaillement')
								.setRequired(true)
								.setMinValue(0),
						),
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('modifier')
						.setDescription('Modifie une option de ravitaillement')
						.addIntegerOption(option =>
							option
								.setName('quantite')
								.setDescription('Quantité en L du ravitaillement à modifier')
								.setRequired(true)
								.setMinValue(1)
								.setMaxValue(2000),
						)
						.addIntegerOption(option =>
							option
								.setName('nouvelle_quantite')
								.setDescription('Nouvelle quantité en L du ravitaillement')
								.setRequired(false)
								.setMinValue(1)
								.setMaxValue(2000),
						)
						.addIntegerOption(option =>
							option
								.setName('prix')
								.setDescription('Prix du ravitaillement')
								.setRequired(false)
								.setMinValue(0),
						),
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('retirer')
						.setDescription('Retire une option de ravitaillement')
						.addIntegerOption(option =>
							option
								.setName('quantite')
								.setDescription('Quantité en L du ravitaillement à retirer')
								.setRequired(true)
								.setMinValue(1)
								.setMaxValue(2000),
						),
				),
		),
	async execute(interaction) {
		if (interaction.options.getSubcommandGroup() === 'configuration') {
			if (interaction.options.getSubcommand() === 'ajouter') {
				const quantite = interaction.options.getInteger('quantite');
				const price = interaction.options.getInteger('prix');

				const fuel = await FuelConfig.findOne({ where: { qt_fuel: quantite } });

				if (fuel) {
					return await interaction.reply({
						content: `Il existe déjà un ravitaillement pour une quantité de ${quantite}L`,
						ephemeral: true,
					});
				}

				const new_fuel = await FuelConfig.create({
					qt_fuel: quantite,
					price_fuel: price,
				});

				return await interaction.reply({
					content: 'Une nouvelle option de ravitaillement vient d\'être créée avec ces paramètres :\n' +
					`Quantité : ${new_fuel.qt_fuel}L\n` +
					`Prix : $${new_fuel.price_fuel.toLocaleString('en')}`,
					ephemeral: true,
				});
			}
			else if (interaction.options.getSubcommand() === 'modifier') {
				const quantite = interaction.options.getInteger('quantite');

				const fuel = await FuelConfig.findOne({ where: { qt_fuel: quantite } });

				if (!fuel) {
					return await interaction.reply({
						content: `Aucun ravitaillement ayant une quantité de ${quantite}L a été trouvé`,
						ephemeral: true,
					});
				}
				const new_qt_fuel = interaction.options.getInteger('nouvelle_quantite');

				const price = interaction.options.getInteger('prix');

				await fuel.update({
					qt_fuel: new_qt_fuel ? new_qt_fuel : fuel.qt_fuel,
					price_fuel: price ? price : fuel.price_fuel,
				});

				return await interaction.reply({
					content: 'L\'option de ravitaillement vient d\'être modifiée avec ces paramètres :\n' +
					`Quantité : ${fuel.qt_fuel}L\n` +
					`Prix : $${fuel.price_fuel.toLocaleString('en')}`,
					ephemeral: true,
				});
			}
			else if (interaction.options.getSubcommand() === 'retirer') {
				const quantite = interaction.options.getInteger('quantite');

				const fuel = await FuelConfig.findOne({ where: { qt_fuel: quantite } });

				if (!fuel) {
					return await interaction.reply({
						content: `Aucun ravitaillement pour une quantité de ${quantite}L a été trouvé`,
						ephemeral: true,
					});
				}

				await fuel.destroy();

				return interaction.reply({
					content: `Le ravitaillement ayant une quantité de ${quantite}L a été supprimé`,
					ephemeral: true,
				});
			}
		}
		else if (interaction.options.getSubcommand() === 'historique') {
			await interaction.deferReply({ ephemeral: true });

			const filtre = interaction.options.getString('filtre') ? interaction.options.getString('filtre') : 'detail';
			let start = null;
			let end = null;
			let message = null;

			if (filtre === 'detail') {
				start = 0;
				end = 15;
				const data = await getHistoRefuelData(filtre, start, end);
				message = await interaction.editReply({
					embeds: await getHistoRefuelEmbed(interaction, data, filtre, start, end),
					components: [getHistoRefuelButtons(filtre, start, end)],
					fetchReply: true,
					ephemeral: true,
				});
			}
			else if (filtre === 'day') {
				start = moment.tz('Europe/Paris').startOf('day').hours(6);
				end = moment.tz('Europe/Paris').startOf('day').add(1, 'd').hours(6);
				const data = await getHistoRefuelData(filtre, start, end);
				message = await interaction.editReply({
					embeds: await getHistoRefuelEmbed(interaction, data, filtre, start, end),
					components: [getHistoRefuelButtons(filtre, start, end)],
					fetchReply: true,
					ephemeral: true,
				});
			}
			else if (filtre === 'week') {
				start = moment().startOf('week').hours(6);
				end = moment().startOf('week').add(7, 'd').hours(6);
				const data = await getHistoRefuelData(filtre, start, end);
				message = await interaction.editReply({
					embeds: await getHistoRefuelEmbed(interaction, data, filtre, start, end),
					components: [getHistoRefuelButtons(filtre, start, end)],
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
						embeds: await getHistoRefuelEmbed(interaction, await getHistoRefuelData(filtre, start, end), filtre, start, end),
						components: [getHistoRefuelButtons(filtre, start, end)],
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
						embeds: await getHistoRefuelEmbed(interaction, await getHistoRefuelData(filtre, start, end), filtre, start, end),
						components: [getHistoRefuelButtons(filtre, start, end)],
					});
				}
			});

			componentCollector.on('end', () => {
				interaction.editReply({ components: [] });
			});
		}
		else if (interaction.options.getSubcommand() === 'supprimer') {
			const id_refuel = interaction.options.getInteger('id');

			const refuel = await Fuel.findByPk(id_refuel, {
				include: [{ model: Employee }],
			});

			if (!refuel) {
				return await interaction.reply({ content: `Aucun ravitaillement trouvé ayant l'id ${id_refuel}`, ephemeral:true });
			}

			try {
				const messageManager = new MessageManager(await interaction.client.channels.fetch(channelId));
				const message_to_delete = await messageManager.fetch({ message: refuel.id_message });
				await message_to_delete.delete();
			}
			catch (error) {
				console.error(error);
			}

			await Fuel.destroy({
				where: { id: refuel.id },
			});

			return await interaction.reply({
				content: `Le ravitaillement ${refuel.id} de ${refuel.qt_fuel.toLocaleString('fr')}L pour $${refuel.sum_fuel.toLocaleString('en')}` +
				` effectué le ${time(moment(refuel.date_fuel, 'YYYY-MM-DD hh:mm:ss.S ZZ').unix(), 'F')} par ${refuel.employee.name_employee} a été supprimé`,
				ephemeral: true,
			});
		}
	},
	async buttonClicked(interaction) {
		const fuel_configs = await FuelConfig.findAll({ order: [['qt_fuel', 'ASC']] });
		let ended = false;

		const employee = await Employee.findOne({
			where: {
				id_employee: interaction.user.id,
				date_firing: null,
			},
		});
		if (!employee) {
			return await interaction.reply({ content: 'Erreur, il semblerait que vous ne soyez pas un employé', ephemeral: true });
		}

		if (fuel_configs.length === 0) {
			return await interaction.reply({
				content: 'Aucune option de ravitaillement n\'est disponible',
				ephemeral: true,
			});
		}

		const fuel_options = fuel_configs.map(f => {
			return {
				label: `${f.qt_fuel}L ⛽`, value: `${f.id}`,
			};
		});

		const message = await interaction.reply({
			components: [new ActionRowBuilder().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId('ravitaillement')
					.setPlaceholder('Choisissez un ravitaillement ⛽')
					.addOptions(fuel_options),
			)],
			ephemeral: true,
			fetchReply: true,
		});

		const componentCollector = message.createMessageComponentCollector({ time: 840000 });

		componentCollector.on('collect', async i => {
			try {
				await i.deferUpdate();
			}
			catch (error) {
				console.error(error);
				componentCollector.stop();
			}

			const fuel_config = await FuelConfig.findOne({ where: { id: i.values[0] } });

			const messageManager = await interaction.client.channels.fetch(channelId);
			const send = await messageManager.send({ embeds: [getRefuelEmbed(interaction, fuel_config)] });

			await Fuel.upsert({
				date_fuel: moment().tz('Europe/Paris'),
				qt_fuel: fuel_config.qt_fuel,
				sum_fuel: fuel_config.price_fuel,
				id_employe: employee.id,
				id_message: send.id,
			});

			await interaction.editReply({ content: `Ravitaillement de ${fuel_config.qt_fuel}L effectué ⛽`, components: [] });
			ended = true;

			componentCollector.stop();
		});

		componentCollector.on('end', () => {
			if (!ended) {
				interaction.deleteReply();
			}
		});
	},
};

const getRefuelEmbed = (interaction, fuel_config) => {
	const embed = new EmbedBuilder()
		.setAuthor({
			name: interaction.member.displayName,
			iconURL: interaction.member.displayAvatarURL(true),
		})
		.setTitle('Ravitaillement de la cuve ⛽')
		.setColor('#ff9f0f')
		.setDescription(`${fuel_config.qt_fuel.toLocaleString('fr')}L`)
		.setTimestamp(new Date());

	return embed;
};

const getHistoRefuelButtons = (filtre, start, end) => {
	if (filtre !== 'detail') {
		return new ActionRowBuilder().addComponents([
			new ButtonBuilder({ customId: 'previous', label: 'Précédent', disabled: start === 0, style: ButtonStyle.Primary }),
			new ButtonBuilder({ customId: 'next', label: 'Suivant', style: ButtonStyle.Primary }),
		]);
	}
	return new ActionRowBuilder().addComponents([
		new ButtonBuilder({ customId: 'previous', label: 'Précédent', disabled: start === 0, style: ButtonStyle.Primary }),
		new ButtonBuilder({ customId: 'info', label: (start + 1) + ' / ' + (start + end), disabled: true, style: ButtonStyle.Primary }),
		new ButtonBuilder({ customId: 'next', label: 'Suivant', style: ButtonStyle.Primary }),
	]);
};

const getHistoRefuelData = async (filtre, start, end) => {
	const where = new Object();

	if (filtre === 'detail') {
		return await Fuel.findAll({
			where: where,
			include: [{ model: Employee }],
			order: [['date_fuel', 'DESC']],
			offset: start,
			limit: end,
		});
	}

	where.date_fuel = { [Op.between]: [+start, +end] };

	return await Fuel.findAll({
		attributes: [
			[fn('sum', col('qt_fuel')), 'total_qt'],
			[fn('sum', col('sum_fuel')), 'total_sum'],
		],
		where: where,
		raw: true,
	});
};

const getHistoRefuelEmbed = async (interaction, data, filtre, start, end) => {
	const embed = new EmbedBuilder()
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
		.setTitle('Ravitaillement effectués ⛽')
		.setColor('#ff9f0f')
		.setTimestamp(new Date());

	if (filtre !== 'detail') {
		embed.setDescription('Période du ' + time(start.unix(), 'F') + ' au ' + time(end.unix(), 'F'));
	}

	if (data && data.length > 0) {
		if (filtre !== 'detail') {
			if (data[0].total_qt !== null) {
				embed.addFields({ name: 'Total', value: `${data[0].total_qt.toLocaleString('fr')}L pour $${data[0].total_sum.toLocaleString('en')}` });
			}
			else {
				embed.addFields({ name: 'Total', value: 'Aucun ravitaillement n\'a été effectué sur cette période' });
			}

			return [embed];
		}
		else {
			for (const d of data) {
				embed.addFields({ name: d.employee.name_employee, value: `${d.id} : ${d.qt_fuel.toLocaleString('fr')}L pour $${d.sum_fuel.toLocaleString('en')} le ${time(d.date_fuel, 'F')}`, inline: false });
			}
		}
	}

	return [embed];
};
