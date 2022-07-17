const { SlashCommandBuilder } = require('@discordjs/builders');
const { PriseService, Vehicle, VehicleTaken, Employee } = require('../dbObjects');
const { MessageEmbed, MessageButton, MessageActionRow, MessageManager, MessageSelectMenu } = require('discord.js');
const { Op } = require('sequelize');
const dotenv = require('dotenv');
const moment = require('moment');

dotenv.config();
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

const guildId = process.env.GUILD_ID;
const channelLoggingId = process.env.CHANNEL_LOGGING;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pds')
		.setDescription('Gestion du système de prise de service')
		.setDefaultPermission(false)
		.addSubcommand(subcommand =>
			subcommand
				.setName('init')
				.setDescription('Affiche la prise de service')
				.addStringOption((option) =>
					option
						.setName('couleur')
						.setDescription('Couleur de la prise de service (sous format hexadécimal, \'RANDOM\' pour changement automatique)')
						.setRequired(false),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('couleur')
				.setDescription('Permet de modifier la couleur du message de la prise de service')
				.addStringOption((option) =>
					option
						.setName('couleur')
						.setDescription('Couleur de la prise de service (sous format hexadécimal, \'RANDOM\' pour changement automatique)')
						.setRequired(true),
				),
		)
		.addSubcommandGroup(subcommandgroup =>
			subcommandgroup
				.setName('véhicule')
				.setDescription('Gestion des véhicules pour la prise de service')
				.addSubcommand(subcommand =>
					subcommand
						.setName('ajouter')
						.setDescription('Permet d\'ajout un véhicule sur la prise de service')
						.addStringOption(option =>
							option
								.setName('nom')
								.setDescription('Nom du véhicule')
								.setRequired(true),
						)
						.addStringOption(option =>
							option
								.setName('emoji')
								.setDescription('Emoji du véhicule')
								.setRequired(true),
						)
						.addIntegerOption(option =>
							option
								.setName('nb_place')
								.setDescription('Nombre de place dans le véhicule')
								.setRequired(true)
								.setMinValue(1)
								.setMaxValue(8),
						)
						.addBooleanOption(option =>
							option
								.setName('peut_prendre_pause')
								.setDescription('Permet de définir si le véhicule peut être mis en pause')
								.setRequired(false),
						)
						.addIntegerOption(option =>
							option
								.setName('ordre')
								.setDescription('Permet de définir l\'ordre des véhicules (ordre ascendant)')
								.setRequired(false)
								.setMinValue(0),
						),
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('modifier')
						.setDescription('Permet de modifier un véhicule de la prise de service')
						.addIntegerOption(option =>
							option
								.setName('véhicule')
								.setDescription('Nom du véhicule actuel')
								.setAutocomplete(true)
								.setRequired(true),
						)
						.addStringOption(option =>
							option
								.setName('emoji')
								.setDescription('Emoji du véhicule')
								.setRequired(false),
						)
						.addIntegerOption(option =>
							option
								.setName('nb_place')
								.setDescription('Nombre de place dans le véhicule')
								.setRequired(false)
								.setMinValue(1)
								.setMaxValue(8),
						)
						.addBooleanOption(option =>
							option
								.setName('peut_prendre_pause')
								.setDescription('Permet de définir si le véhicule peut être mis en pause')
								.setRequired(false),
						)
						.addIntegerOption(option =>
							option
								.setName('ordre')
								.setDescription('Permet de définir l\'ordre des véhicules (ordre ascendant)')
								.setRequired(false)
								.setMinValue(0),
						)
						.addStringOption(option =>
							option
								.setName('nouveau_nom')
								.setDescription('Nouveau nom du véhicule')
								.setRequired(false),
						),
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('supprimer')
						.setDescription('Permet de supprimer un véhicule de la prise de service')
						.addIntegerOption(option =>
							option
								.setName('véhicule')
								.setDescription('Nom du véhicule à supprimer')
								.setAutocomplete(true)
								.setRequired(true),
						),
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('afficher')
						.setDescription('Permet d\'afficher tout les véhicules de la prise de service'),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('pause')
				.setDescription('Met tout les camions en pause')
				.addStringOption(option =>
					option
						.setName('raison')
						.setDescription('Optionnel, par défaut pause de 1h30')
						.setRequired(false),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('reset')
				.setDescription('Réinitialise l\'état de tout les véhicules'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('employé')
				.setDescription('Permet de faire la prise de service d\'un employé')
				.addIntegerOption(option =>
					option
						.setName('véhicule')
						.setDescription('Nom du véhicule')
						.setAutocomplete(true)
						.setRequired(true),
				).addStringOption((option) =>
					option
						.setName('nom_employé')
						.setDescription('Nom de l\'employé')
						.setAutocomplete(true)
						.setRequired(true),
				),
		),
	async execute(interaction) {
		const hexa_regex = '^[A-Fa-f0-9]{6}$';
		const emoji_custom_regex = '^<?(a)?:?(\\w{2,32}):(\\d{17,19})>?$';
		const emoji_unicode_regex = '^[\u1000-\uFFFF]+$';

		if (interaction.options.getSubcommand() === 'init') {
			const colour_pds = interaction.options.getString('couleur') ? interaction.options.getString('couleur').trim() : 'RANDOM';

			if (colour_pds.match(hexa_regex) === null && colour_pds !== 'RANDOM') {
				return await interaction.reply({ content: 'La couleur ' + colour_pds + ' donné en paramètre est incorrecte.', ephemeral: true });
			}

			const existing_pds = await PriseService.findOne();

			const vehicles = await Vehicle.findAll({
				order: [['order', 'ASC']],
				include: [{ model: VehicleTaken }],
			});

			if (existing_pds) {
				try {
					const messageManager = new MessageManager(await interaction.client.channels.fetch(existing_pds.id_channel));
					const pds_to_delete = await messageManager.fetch(existing_pds.id_message);
					await pds_to_delete.delete();
				}
				catch (error) {
					console.error(error);
				}

				const message = await interaction.reply({
					embeds: [await getPDSEmbed(interaction, vehicles, colour_pds, existing_pds.on_break, existing_pds.break_reason)],
					components: await getPDSButtons(vehicles, existing_pds.on_break),
					fetchReply: true,
				});

				await existing_pds.update({
					id_message: message.id,
					id_channel: interaction.channelId,
					colour_pds: colour_pds,
				});

			}
			else {
				const message = await interaction.reply({
					embeds: [await getPDSEmbed(interaction, vehicles, colour_pds)],
					components: await getPDSButtons(vehicles),
					fetchReply: true,
				});

				await PriseService.upsert({
					id_message: message.id,
					id_channel: interaction.channelId,
					colour_pds: colour_pds,
				});
			}
		}
		else if (interaction.options.getSubcommand() === 'couleur') {
			const colour_pds = interaction.options.getString('couleur') ? interaction.options.getString('couleur').trim() : 'RANDOM';

			if (colour_pds.match(hexa_regex) === null && colour_pds !== 'RANDOM') {
				await interaction.reply({ content: 'La couleur ' + colour_pds + ' donné en paramètre est incorrecte.', ephemeral: true });
				return;
			}

			const pds = await PriseService.findOne();

			if (pds) {
				await pds.update({ colour_pds: colour_pds });
				await updatePDS(interaction, pds);
				return await interaction.reply({ content: 'La couleur de la prise de service a été modifiée', ephemeral: true });
			}

			return await interaction.reply({ content: 'La prise de service n\'a pas encore été initialisée', ephemeral: true });
		}
		else if (interaction.options.getSubcommand() === 'pause') {
			const pds = await PriseService.findOne();

			if (!pds) {
				return await interaction.reply({ content: 'La prise de service n\'a pas encore été initialisée', ephemeral: true });
			}

			if (pds.on_break) {
				await pds.update({ on_break: false, break_reason: null });
				await updatePDS(interaction, pds);
				await sendEndBreak(interaction);
				return await interaction.reply({ content: 'Fin de la pause', ephemeral: true });
			}
			else {
				const standard_pause = `Fin prévue à ${moment.tz('Europe/Paris').add(1, 'h').add(30, 'm').format('H[h]mm')}`;
				const reason = interaction.options.getString('raison') || standard_pause;
				await pds.update({ on_break: true, break_reason: reason });
				await sendStartBreak(interaction, reason);
				await updatePDS(interaction, pds);
				return await interaction.reply({ content: `Début de la pause avec la raison : ${reason}`, ephemeral: true });
			}
		}
		else if (interaction.options.getSubcommand() === 'employé') {
			const id_vehicle = interaction.options.getInteger('véhicule');
			const employee_name = interaction.options.getString('nom_employé');

			const vehicle = await Vehicle.findOne({
				where: { id_vehicle: id_vehicle },
			});

			if (!vehicle) {
				return await interaction.reply({ content: 'Aucun véhicule n\'a été trouvé avec ces paramètres', ephemeral: true });
			}

			const employee = await Employee.findOne({
				where: {
					name_employee: { [Op.like]: `%${employee_name}%` },
					date_firing: null,
				},
			});

			if (!employee) {
				return interaction.reply({ content: `Aucun employé portant le nom ${employee_name} n'a été trouvé`, ephemeral: true });
			}

			const vehicleTaken = await VehicleTaken.findOne({ where: { id_employe: employee.id_employee } });

			if (!vehicleTaken) {
				if (!(await vehicle.hasPlace(vehicle.id_vehicle, vehicle.nb_place_vehicle))) {
					return await interaction.reply({ content: `Il n'y a plus de place disponible dans ${vehicle.name_vehicle} ${vehicle.emoji_vehicle}`, ephemeral: true });
				}
				await VehicleTaken.create({
					id_vehicle: vehicle.id_vehicle,
					id_employe: employee.id_employee,
					taken_at: moment().tz('Europe/Paris'),
				});
				await updatePDS(interaction);
				return await interaction.reply({ content: `La prise de service sur le camion ${vehicle.emoji_vehicle} ${vehicle.name_vehicle} a été effectué pour ${employee.name_employee}`, ephemeral: true });
			}
			else {
				return await interaction.reply({ content: `${employee.name_employee} est déjà en service`, ephemeral: true });
			}
		}
		else if (interaction.options.getSubcommand() === 'reset') {
			const pds = await PriseService.findOne();
			if (!pds) {
				return await interaction.reply({ content: 'La prise de service n\'a pas encore été initialisée', ephemeral: true });
			}

			if (pds.on_break) {
				await pds.update({ on_break: false, break_reason: null });
				await sendEndBreak(interaction);
			}

			const vehiclesTaken = await VehicleTaken.findAll();
			for (const vt of vehiclesTaken) {
				await sendFds(interaction, vt);
			}

			const vehiclesNotAvailable = await Vehicle.findAll({ order: [['order', 'ASC']], where: { available: false } });
			for (const v of vehiclesNotAvailable) {
				await sendIsAvailable(interaction, v);
			}

			await Vehicle.update({ available: true, available_reason: null }, { where: { } });
			await VehicleTaken.destroy({ where: { } });
			await updatePDS(interaction, pds);
			return await interaction.reply({ content: 'La prise de service a été réinitialisée', ephemeral: true });
		}
		else if (interaction.options.getSubcommandGroup() === 'véhicule') {
			if (interaction.options.getSubcommand() === 'ajouter') {
				const name_vehicle = interaction.options.getString('nom');
				const emoji_vehicle = interaction.options.getString('emoji');
				const nb_place_vehicle = interaction.options.getInteger('nb_place');
				const can_take_break = interaction.options.getBoolean('peut_prendre_pause');
				const order = interaction.options.getInteger('ordre') || 0;

				const vehicle = await Vehicle.findOne({
					where: { name_vehicle: name_vehicle },
				});

				if (vehicle) {
					return await interaction.reply({ content: `Un véhicule portant le nom ${name_vehicle} existe déjà`, ephemeral: true });
				}

				if (!emoji_vehicle.match(emoji_custom_regex) && !emoji_vehicle.match(emoji_unicode_regex)) {
					return await interaction.reply({ content: `L'emoji ${emoji_vehicle} donné en paramètre est incorrect`, ephemeral: true });
				}

				const new_vehicle = await Vehicle.create({
					name_vehicle: name_vehicle,
					emoji_vehicle: emoji_vehicle,
					nb_place_vehicle: nb_place_vehicle,
					can_take_break: can_take_break !== null ? can_take_break : true,
					order: order,
					available: true,
				});

				await updatePDS(interaction);

				return await interaction.reply({
					content: 'Le véhicule vient d\'être créé avec ces paramètres :\n' +
					`Nom : ${new_vehicle.name_vehicle}\n` +
					`Emoji : ${new_vehicle.emoji_vehicle}\n` +
					`Nombre de place : ${new_vehicle.nb_place_vehicle}\n` +
					`Peut prendre des pauses : ${new_vehicle.can_take_break ? 'Oui' : 'Non'}\n` +
					`Ordre : ${new_vehicle.order}\n`,
					ephemeral: true,
				});
			}
			else if (interaction.options.getSubcommand() === 'supprimer') {
				const id_vehicle = interaction.options.getInteger('véhicule');

				const vehicle = await Vehicle.findOne({
					where: { id_vehicle: id_vehicle },
				});

				if (!vehicle) {
					return await interaction.reply({ content: 'Aucun véhicule n\'a été trouvé avec ces paramètres', ephemeral: true });
				}

				await vehicle.destroy();
				await updatePDS(interaction);

				return interaction.reply({ content: `Le véhicule portant le nom ${vehicle.name_vehicle} a été supprimé`, ephemeral: true });
			}
			else if (interaction.options.getSubcommand() === 'modifier') {
				const id_vehicle = interaction.options.getInteger('véhicule');

				const vehicle = await Vehicle.findOne({
					where: { id_vehicle: id_vehicle },
				});

				if (!vehicle) {
					return await interaction.reply({ content: 'Aucun véhicule n\'a été trouvé avec ces paramètres', ephemeral: true });
				}

				const new_name_vehicle = interaction.options.getString('nouveau_nom');
				const emoji_vehicle = interaction.options.getString('emoji');
				const nb_place_vehicle = interaction.options.getInteger('nb_place');
				const can_take_break = interaction.options.getBoolean('peut_prendre_pause');
				const order = interaction.options.getInteger('ordre');

				if (new_name_vehicle && await Vehicle.findOne({ where: { name_vehicle: new_name_vehicle } })) {
					return await interaction.reply({ content: `Un véhicule portant le nom ${new_name_vehicle} existe déjà`, ephemeral: true });
				}

				if (emoji_vehicle && !emoji_vehicle.match(emoji_custom_regex) && !emoji_vehicle.match(emoji_unicode_regex)) {
					return await interaction.reply({ content: `L'emoji ${emoji_vehicle} donné en paramètre est incorrect`, ephemeral: true });
				}

				await vehicle.update({
					name_vehicle: new_name_vehicle ? new_name_vehicle : vehicle.name_vehicle,
					emoji_vehicle: emoji_vehicle ? emoji_vehicle : vehicle.emoji_vehicle,
					nb_place_vehicle: nb_place_vehicle ? nb_place_vehicle : vehicle.nb_place_vehicle,
					can_take_break: can_take_break !== null ? can_take_break : vehicle.can_take_break,
					order: order !== null ? order : vehicle.order,
				});

				await updatePDS(interaction);

				return await interaction.reply({
					content: 'Le véhicule vient d\'être modifié avec ces paramètres :\n' +
					`Nom : ${vehicle.name_vehicle}\n` +
					`Emoji : ${vehicle.emoji_vehicle}\n` +
					`Nombre de place : ${vehicle.nb_place_vehicle}\n` +
					`Peut prendre des pauses : ${vehicle.can_take_break ? 'Oui' : 'Non'}\n` +
					`Ordre : ${vehicle.order !== null ? vehicle.order : '/'}\n`,
					ephemeral: true,
				});
			}
			else if (interaction.options.getSubcommand() === 'afficher') {
				return await interaction.reply({ embeds: await getVehicleEmbed(interaction), ephemeral: true });
			}
		}
	},
	async buttonClicked(interaction) {
		const [, button] = interaction.customId.split('_');
		const [action, id] = button.split('|');
		if (action === 'pds') {
			const vehicleTaken = await VehicleTaken.findOne({
				where: { id_employe: interaction.user.id },
			}, { include: [{ model: Vehicle }] });
			const vehicle = await Vehicle.findOne({ where: { id_vehicle: id } });
			if (!vehicle) {
				return;
			}
			if (!vehicleTaken) {
				if (!(await vehicle.hasPlace(id, vehicle.nb_place_vehicle))) {
					return await interaction.reply({ content: `Il n'y a plus de place disponible dans ${vehicle.name_vehicle} ${vehicle.emoji_vehicle}`, ephemeral: true });
				}
				await VehicleTaken.create({
					id_vehicle: id,
					id_employe: interaction.user.id,
					taken_at: moment().tz('Europe/Paris'),
				});
				await updatePDSonReply(interaction);
			}
			else if (vehicleTaken.id_vehicle === parseInt(id)) {
				await sendFds(interaction, vehicleTaken);
				await vehicleTaken.destroy();
				await updatePDSonReply(interaction);
			}
			else {
				return await interaction.reply({ content: 'Vous ne pouvez pas faire de prise de service sur plus d\'un véhicule', ephemeral: true });
			}
		}
		else if (action === 'settings') {
			if (id === 'show') {
				let selectOptions = new MessageSelectMenu().setCustomId('options').setPlaceholder('Choisissez une action');
				let pds = await PriseService.findOne();
				selectOptions.addOptions([{ label: 'Changer la disponibilité d\'un véhicule', value: 'changeDispo' }]);

				if (pds.on_break) {
					selectOptions.addOptions([{ label: 'Mettre fin à la pause', value: 'endBreak' }]);
				}
				else {
					selectOptions.addOptions([
						{ label: 'Mettre en pause pour une durée d\'1h30', value: 'startBreak1' },
						{ label: 'Mettre en pause pour une autre raison (à préciser)', value: 'startBreak2' },
					]);
				}

				const message_options = await interaction.reply({
					components: [new MessageActionRow().addComponents(selectOptions)],
					ephemeral: true,
					fetchReply: true,
				});
				const componentCollector = message_options.createMessageComponentCollector({ time: 840000 });

				componentCollector.on('collect', async i => {
					try {
						await i.deferUpdate();
					}
					catch (error) {
						console.error(error);
						componentCollector.stop();
					}
					const value = i.values[0].split('|');
					switch (value[0]) {
					case 'startBreak1': {
						pds = await PriseService.findOne();
						if (pds.on_break) {
							await interaction.editReply({ content: 'Il y a déjà une pause en cours', components: [] });
							break;
						}
						const reason = `Fin prévue à ${moment.tz('Europe/Paris').add(1, 'h').add(30, 'm').format('H[h]mm')}`;
						await pds.update({
							on_break: true,
							break_reason: reason,
						});
						await sendStartBreak(interaction, reason);
						await updatePDS(interaction, pds);
						await interaction.editReply({ content: `Début de la pause avec la raison : ${reason}`, components: [] });
						break;
					}

					case 'startBreak2': {
						pds = await PriseService.findOne();
						if (pds.on_break) {
							await interaction.editReply({ content: 'Il y a déjà une pause en cours', components: [] });
							break;
						}
						await interaction.editReply({ content: 'Veuillez préciser la durée/raison de la pause (écrivez un message dans le salon)', components: [] });
						const messageCollector = interaction.channel.createMessageCollector({ filter:  m => {return m.author.id === interaction.user.id;}, time: 840000 });
						messageCollector.on('collect', async m => {
							if (interaction.guild.me.permissionsIn(m.channelId).has('MANAGE_MESSAGES')) {
								try {
									await m.delete();
								}
								catch (error) {
									console.error(error);
								}
							}
							pds = await PriseService.findOne();
							if (pds.on_break) {
								return await interaction.editReply({ content: 'Il y a déjà une pause en cours', components: [] });
							}
							await pds.update({
								on_break: true,
								break_reason: m.content,
							});
							await sendStartBreak(interaction, m.content);
							await updatePDS(interaction, pds);
							await interaction.editReply({ content: `Début de la pause avec la raison : ${m.content}`, components: [] });

							messageCollector.stop();
							componentCollector.stop();
						});
						break;
					}

					case 'endBreak': {
						pds = await PriseService.findOne();
						if (!pds.on_break) {
							await interaction.editReply({ content: 'Il n\'y a pas de pause en cours', components: [] });
							break;
						}
						await pds.update({ on_break: false, break_reason: null });
						await updatePDS(interaction, pds);
						await sendEndBreak(interaction);
						await interaction.editReply({ content: 'Fin de la pause', components: [] });
						break;
					}

					case 'changeDispo': {
						const vehicles = await Vehicle.findAll({ order: [['order', 'ASC']] });
						if (vehicles.length === 0) {
							await interaction.editReply({ content: 'Il n\'y a aucune véhicule à modifier', components: [] });
							break;
						}
						const formatedV = [];
						for (const v of vehicles) {
							formatedV.push({
								label: `${v.name_vehicle}`,
								emoji: `${v.emoji_vehicle}`, value: `${v.id_vehicle}`,
							});
						}
						const components = [];
						let index = 0;
						while (formatedV.length) {
							components.push(
								new MessageActionRow()
									.addComponents(
										new MessageSelectMenu()
											.setCustomId(`showFdsList${index}`)
											.addOptions(formatedV.splice(0, 25))
											.setPlaceholder('Choisissez un véhicule'),
									),
							);
							index++;
						}
						await interaction.editReply({ components: components });
						return;
					}

					case 'makeAvailable': {
						const veh = await Vehicle.findOne({ where: { id_vehicle: value[1] } });
						if (veh.available) {
							await interaction.editReply({ content: `Le véhicule ${veh.emoji_vehicle} ${veh.name_vehicle} est déjà disponible`, components: [] });
							break;
						}
						await veh.update({ available: true, available_reason: null });
						await sendIsAvailable(interaction, veh);
						await updatePDS(interaction, pds);
						await interaction.editReply({ content: `Le véhicule ${veh.emoji_vehicle} ${veh.name_vehicle} est désormais disponible`, components: [] });
						break;
					}

					case 'NotAvailable': {
						const veh = await Vehicle.findOne({ where: { id_vehicle: value[2] } });
						let reason = null;
						switch (value[1]) {
						case '1':
							reason = 'Au garage public de l\'aéroport';
							break;
						case '2':
							reason = 'En fourrière';
							break;
						case '3':
							reason = 'Détruit';
							break;
						case '4':
							reason = 'En attente de la réponse de l\'assurance';
							break;
						default:
							break;
						}
						if (!reason) {
							await interaction.editReply({ content: 'Veuillez préciser la raison de l\'indisponibilité (écrivez un message dans le salon)', components: [] });
							const messageCollector = interaction.channel.createMessageCollector({ filter:  m => {return m.author.id === interaction.user.id;}, time: 840000 });
							messageCollector.on('collect', async m => {
								if (interaction.guild.me.permissionsIn(m.channelId).has('MANAGE_MESSAGES')) {
									try {
										await m.delete();
									}
									catch (error) {
										console.error(error);
									}
								}
								const vehiclesTaken = await VehicleTaken.findAll({ where: { id_vehicle: veh.id_vehicle } });
								for (const vt of vehiclesTaken) {
									await sendFds(interaction, vt);
								}
								await VehicleTaken.destroy({ where: { id_vehicle: veh.id_vehicle } });
								await veh.update({ available: false, available_reason: m.content });
								await sendIsNotAvailable(interaction, veh);
								await updatePDS(interaction, pds);
								await interaction.editReply({ content: `Le véhicule ${veh.emoji_vehicle} ${veh.name_vehicle} est désormais indisponible`, components: [] });
								messageCollector.stop();
								componentCollector.stop();
							});
							return;
						}
						const vehiclesTaken = await VehicleTaken.findAll({ where: { id_vehicle: veh.id_vehicle } });
						for (const vt of vehiclesTaken) {
							await sendFds(interaction, vt);
						}
						await VehicleTaken.destroy({ where: { id_vehicle: veh.id_vehicle } });
						await veh.update({ available: false, available_reason: reason });
						await sendIsNotAvailable(interaction, veh);
						await updatePDS(interaction, pds);
						await interaction.editReply({ content: `Le véhicule ${veh.emoji_vehicle} ${veh.name_vehicle} est désormais indisponible`, components: [] });
						break;
					}

					default: {
						const vehicle = await Vehicle.findOne({ where: { id_vehicle: value[0] } });
						selectOptions = new MessageSelectMenu().setCustomId('disponibilite').setPlaceholder('Modifier la disponibilité');
						selectOptions.addOptions([
							{ label: 'Disponible', value: `makeAvailable|${vehicle.id_vehicle}` },
							{ label: 'Indisponible : Au garage public de l\'aéroport', value: `NotAvailable|1|${vehicle.id_vehicle}` },
							{ label: 'Indisponible : En fourrière', value: `NotAvailable|2|${vehicle.id_vehicle}` },
							{ label: 'Indisponible : Détruit', value: `NotAvailable|3|${vehicle.id_vehicle}` },
							{ label: 'Indisponible : En attente de la réponse de l\'assurance', value: `NotAvailable|4|${vehicle.id_vehicle}` },
							{ label: 'Indisponible : Autre (à préciser)', value: `NotAvailable|5|${vehicle.id_vehicle}` },
						]);

						await interaction.editReply({ components: [new MessageActionRow().addComponents(selectOptions)] });
						return;
					}
					}
					componentCollector.stop();
				});

				componentCollector.on('end', (c, reason) => {
					if (reason !== 'user') {
						interaction.editReply({ content:'Temps d\'attente dépassé', components: [] });
					}
				});
			}
		}
		else if (action === 'fds') {
			if (id === 'show') {
				const guild = await interaction.client.guilds.fetch(guildId);
				const vts = await VehicleTaken.findAll({ include: Vehicle });

				if (vts.length === 0) {
					return await interaction.reply({ content: 'Il n\'y a personne en service actuellement', ephemeral: true });
				}

				const formatedVT = [];
				for (const vt of vts) {
					const member = await guild.members.fetch(vt.id_employe);
					formatedVT.push({
						label: `${vt.vehicle.name_vehicle} - ${member.nickname ? member.nickname : member.user.username}`,
						emoji: `${vt.vehicle.emoji_vehicle}`, value: `${vt.id_employe}`,
					});
				}

				const components = [];
				let index = 0;
				while (formatedVT.length) {
					components.push(
						new MessageActionRow()
							.addComponents(
								new MessageSelectMenu()
									.setCustomId(`showFdsList${index}`)
									.addOptions(formatedVT.splice(0, 25))
									.setPlaceholder('Choisissez une personne pour faire sa fin de service'),
							),
					);
					index++;
				}

				const message_fds = await interaction.reply({
					components: components,
					ephemeral: true,
					fetchReply: true,
				});
				const componentCollector = message_fds.createMessageComponentCollector({ time: 840000 });
				componentCollector.on('collect', async i => {
					try {
						await i.deferUpdate();
					}
					catch (error) {
						console.error(error);
						componentCollector.stop();
					}
					const vt = await VehicleTaken.findOne({ where : { id_employe: i.values[0] } });
					const member = await guild.members.fetch(i.values[0]);
					if (vt) {
						await vt.destroy();
						await updatePDS(i);
						await sendFds(i, vt, interaction);
						interaction.editReply({ content:`Fin de service effectué pour ${member.nickname ? member.nickname : member.user.username}`, components: [] });
					}
					else {
						interaction.editReply({ content:`La fin de service effectué pour ${member.nickname ? member.nickname : member.user.username} a déjà été effectuée.`, components: [] });
					}
					componentCollector.stop();
				});

				componentCollector.on('end', (c, reason) => {
					if (reason !== 'user') {
						interaction.editReply({ content:'Temps d\'attente dépassé', components: [] });
					}
				});
			}
		}
	},
};

const getPDSEmbed = async (interaction, vehicles, colour_pds, on_break = false, break_reason = null) => {
	const colour = colour_pds === 'RANDOM' ? Math.floor(Math.random() * 16777215) : colour_pds;
	const guild = await interaction.client.guilds.fetch(guildId);
	const embed = new MessageEmbed()
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
		.setTitle('Disponibilité des véhicules')
		.setColor(colour_pds === 'RANDOM' ? colour : `#${colour}`)
		.setTimestamp(new Date());

	if (on_break) {
		embed.setDescription('⚠️\n**Pause en cours**');
	}

	for (const v of vehicles) {
		const title = `${v.emoji_vehicle} ${v.name_vehicle}`;
		if (v.vehicle_takens.length > 0) {
			let field = '';
			for (const vt of v.vehicle_takens) {
				let name = vt.id_employe;
				try {
					const user = await guild.members.fetch(vt.id_employe);
					name = user ? user.nickname ? user.nickname : user.user.username : vt.id_employe;
				}
				catch (error) {
					console.error(error);
				}
				field += `${moment(vt.taken_at).format('H[h]mm')} : ${name}\n`;
			}
			field.slice(0, -2);
			embed.addField(title, field, false);
		}
		else if (!v.available) {
			embed.addField(title, v.available_reason ? `Indisponible : ${v.available_reason}` : 'Indisponible', false);
		}
		else if (on_break && v.can_take_break) {
			embed.addField(title, `Pause : ${break_reason}`, false);
		}
		else {
			embed.addField(title, 'Disponible', false);
		}
	}

	return embed;
};

const getPDSButtons = async (vehicles, on_break = false) => {
	const vehiclesButtons = vehicles.map(v => {
		return new MessageButton({
			customId: 'pds_pds|' + v.id_vehicle,
			emoji: v.emoji_vehicle, style: 'SECONDARY',
			disabled: !v.available || (on_break && v.can_take_break && v.vehicle_takens.length === 0),
		});
	});
	const stopButton = new MessageButton({ customId: 'pds_fds|show', emoji: '✖️', style: 'DANGER' });
	const settingsButton = new MessageButton({ customId: 'pds_settings|show', emoji: '🪄', style: 'PRIMARY' });

	if (vehiclesButtons.length <= 3) {
		return [new MessageActionRow().addComponents(...vehiclesButtons, stopButton, settingsButton)];
	}
	if (vehicles.length <= 8) {
		return [
			new MessageActionRow().addComponents(...vehiclesButtons.slice(0, 5)),
			new MessageActionRow().addComponents(...vehiclesButtons.slice(5), stopButton, settingsButton),
		];
	}
	if (vehicles.length <= 13) {
		return [
			new MessageActionRow().addComponents(...vehiclesButtons.slice(0, 5)),
			new MessageActionRow().addComponents(...vehiclesButtons.slice(5, 10)),
			new MessageActionRow().addComponents(...vehiclesButtons.slice(10), stopButton, settingsButton),
		];
	}
	if (vehicles.length <= 18) {
		return [
			new MessageActionRow().addComponents(...vehiclesButtons.slice(0, 5)),
			new MessageActionRow().addComponents(...vehiclesButtons.slice(5, 10)),
			new MessageActionRow().addComponents(...vehiclesButtons.slice(10, 15)),
			new MessageActionRow().addComponents(...vehiclesButtons.slice(15), stopButton, settingsButton),
		];
	}
	if (vehicles.length <= 23) {
		return [
			new MessageActionRow().addComponents(...vehiclesButtons.slice(0, 5)),
			new MessageActionRow().addComponents(...vehiclesButtons.slice(5, 10)),
			new MessageActionRow().addComponents(...vehiclesButtons.slice(10, 15)),
			new MessageActionRow().addComponents(...vehiclesButtons.slice(15, 20)),
			new MessageActionRow().addComponents(...vehiclesButtons.slice(20), stopButton, settingsButton),
		];
	}

	return [];
};

const updatePDS = async (interaction, pds = null) => {
	const vehicles = await Vehicle.findAll({
		order: [['order', 'ASC'], ['vehicle_takens', 'taken_at', 'ASC']],
		include: [{ model: VehicleTaken }],
	});

	if (!pds) {
		pds = await PriseService.findOne();
		if (!pds) {
			return;
		}
	}

	const messageManager = new MessageManager(await interaction.client.channels.fetch(pds.id_channel));
	const message = await messageManager.fetch(pds.id_message);
	await message.edit({
		embeds: [await getPDSEmbed(interaction, vehicles, pds.colour_pds, pds.on_break, pds.break_reason)],
		components: await getPDSButtons(vehicles, pds.on_break),
	});
};

const updatePDSonReply = async (interaction) => {
	await interaction.deferUpdate();
	const pds = await PriseService.findOne();
	const vehicles = await Vehicle.findAll({
		order: [['order', 'ASC'], ['vehicle_takens', 'taken_at', 'ASC']],
		include: [{ model: VehicleTaken }],
	});
	await interaction.editReply({
		embeds: [await getPDSEmbed(interaction, vehicles, pds.colour_pds, pds.on_break, pds.break_reason)],
		components: await getPDSButtons(vehicles, pds.on_break),
	});
};

const getVehicleEmbed = async (interaction) => {
	const vehicles = await Vehicle.findAll({ order: [['order', 'ASC']] });

	const embed = new MessageEmbed()
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
		.setTitle('Véhicules')
		.setColor('#18913E')
		.setTimestamp(new Date());

	vehicles.map(v => {
		embed.addField(
			`${v.emoji_vehicle} ${v.name_vehicle}`,
			`Nom : ${v.name_vehicle}\nEmoji : ${v.emoji_vehicle}\nNombre de place : ${v.nb_place_vehicle}\nPeut prendre des pauses : ${v.can_take_break ? 'Oui' : 'Non'}\nOrdre : ${v.order === null ? '/' : v.order}`,
			true,
		);
	});

	return [embed];
};

const sendFds = async (interaction, vehicleTaken, fdsDoneBy = null) => {
	const guild = await interaction.client.guilds.fetch(guildId);
	const messageManager = await interaction.client.channels.fetch(channelLoggingId);
	const vehicle = await Vehicle.findOne({ where: { id_vehicle: vehicleTaken.id_vehicle } });
	const member = await guild.members.fetch(vehicleTaken.id_employe);
	const embed = new MessageEmbed()
		.setAuthor({ name: member.nickname ? member.nickname : member.user.username, iconURL: member.user.avatarURL(false) })
		.setTitle(`${vehicle.emoji_vehicle} ${vehicle.name_vehicle}`)
		.setColor(Math.floor(Math.random() * 16777215))
		.setFooter({ text: `${interaction.member.nickname ? interaction.member.nickname : interaction.user.username} - ${interaction.user.id}` });

	if (fdsDoneBy) {
		embed.setDescription(`PDS : ${moment(vehicleTaken.taken_at).format('H[h]mm')}\nFDS : ${moment().format('H[h]mm')}\nFin de service faite par ${fdsDoneBy.member.nickname ? fdsDoneBy.member.nickname : fdsDoneBy.user.username}`);
	}
	else {
		embed.setDescription(`PDS : ${moment(vehicleTaken.taken_at).format('H[h]mm')}\nFDS : ${moment().format('H[h]mm')}`);
	}

	await messageManager.send({ embeds: [embed] });
};

const sendIsNotAvailable = async (interaction, vehicle) => {
	const messageManager = await interaction.client.channels.fetch(channelLoggingId);
	const embed = new MessageEmbed()
		.setAuthor({ name: interaction.member.nickname ? interaction.member.nickname : interaction.user.username, iconURL: interaction.user.avatarURL(false) })
		.setTitle(`${vehicle.emoji_vehicle} ${vehicle.name_vehicle}`)
		.setDescription('Changement de disponibilité')
		.addField('Disponible', 'Non')
		.addField('Raison', `${vehicle.available_reason || 'Indisponible'}`)
		.setColor('#DC183E')
		.setFooter({ text: `${interaction.member.nickname ? interaction.member.nickname : interaction.user.username} - ${interaction.user.id}` });

	await messageManager.send({ embeds: [embed] });
};

const sendIsAvailable = async (interaction, vehicle) => {
	const messageManager = await interaction.client.channels.fetch(channelLoggingId);
	const embed = new MessageEmbed()
		.setAuthor({ name: interaction.member.nickname ? interaction.member.nickname : interaction.user.username, iconURL: interaction.user.avatarURL(false) })
		.setTitle(`${vehicle.emoji_vehicle} ${vehicle.name_vehicle}`)
		.setDescription('Changement de disponibilité')
		.addField('Disponible', 'Oui')
		.setColor('#18913E')
		.setFooter({ text: `${interaction.member.nickname ? interaction.member.nickname : interaction.user.username} - ${interaction.user.id}` });

	await messageManager.send({ embeds: [embed] });
};

const sendStartBreak = async (interaction, reason) => {
	const messageManager = await interaction.client.channels.fetch(channelLoggingId);
	const embed = new MessageEmbed()
		.setAuthor({ name: interaction.member.nickname ? interaction.member.nickname : interaction.user.username, iconURL: interaction.user.avatarURL(false) })
		.setTitle('Début de la pause')
		.setDescription(`${reason}`)
		.setColor(Math.floor(Math.random() * 16777215))
		.setFooter({ text: `${interaction.member.nickname ? interaction.member.nickname : interaction.user.username} - ${interaction.user.id}` });

	await messageManager.send({ embeds: [embed] });
};

const sendEndBreak = async (interaction) => {
	const messageManager = await interaction.client.channels.fetch(channelLoggingId);
	const embed = new MessageEmbed()
		.setAuthor({ name: interaction.member.nickname ? interaction.member.nickname : interaction.user.username, iconURL: interaction.user.avatarURL(false) })
		.setTitle('Fin de la pause')
		.setColor(Math.floor(Math.random() * 16777215))
		.setFooter({ text: `${interaction.member.nickname ? interaction.member.nickname : interaction.user.username} - ${interaction.user.id}` });

	await messageManager.send({ embeds: [embed] });
};