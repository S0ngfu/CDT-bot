const { SlashCommandBuilder } = require('@discordjs/builders');
const { PriseService, Vehicle, VehicleTaken } = require('../dbObjects');
const moment = require('moment');
const { MessageEmbed, MessageButton, MessageActionRow, MessageManager } = require('discord.js');
const dotenv = require('dotenv');

dotenv.config();
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

const guildId = process.env.GUILD_ID;

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
						),
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('modifier')
						.setDescription('Permet de modifier un véhicule de la prise de service')
						.addStringOption(option =>
							option
								.setName('nom')
								.setDescription('Nom du véhicule actuel')
								.setRequired(true),
						)
						.addIntegerOption(option =>
							option
								.setName('nb_place')
								.setDescription('Nombre de place dans le véhicule')
								.setRequired(false)
								.setMinValue(1)
								.setMaxValue(8),
						)
						.addStringOption(option =>
							option
								.setName('emoji')
								.setDescription('Emoji du véhicule')
								.setRequired(false),
						)
						.addStringOption(option =>
							option
								.setName('nouveau_nom')
								.setDescription('Nouveau nom du véhicule')
								.setRequired(false),
						)
						.addBooleanOption(option =>
							option
								.setName('peut_prendre_pause')
								.setDescription('Permet de définir si le véhicule peut être mis en pause')
								.setRequired(false),
						),
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('supprimer')
						.setDescription('Permet de supprimer un véhicule de la prise de service')
						.addStringOption(option =>
							option
								.setName('nom')
								.setDescription('Nom du véhicule à supprimer')
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
				.setDescription('Réinitialise l\'état de tout les camions'),
		),
	async execute(interaction) {
		const hexa_regex = '^[A-Fa-f0-9]{6}$';
		const emoji_custom_regex = '^<?(a)?:?(\\w{2,32}):(\\d{17,19})>?$';
		const emoji_unicode_regex = '^[\u0000-\uFFFF]+$';

		if (interaction.options.getSubcommand() === 'init') {
			const colour_pds = interaction.options.getString('couleur') ? interaction.options.getString('couleur').trim() : 'RANDOM';

			if (colour_pds.match(hexa_regex) === null && colour_pds !== 'RANDOM') {
				return await interaction.reply({ content: 'La couleur ' + colour_pds + ' donné en paramètre est incorrecte.', ephemeral: true });
			}

			const existing_pds = await PriseService.findOne();

			const vehicles = await Vehicle.findAll({
				include: [{ model: VehicleTaken }],
			});

			if (existing_pds) {
				try {
					const messageManager = new MessageManager(await interaction.client.channels.fetch(existing_pds.id_channel));
					const pds_to_delete = await messageManager.fetch(existing_pds.id_message);
					await pds_to_delete.delete();
				}
				catch (error) {
					console.log('Error: ', error);
				}

				const message = await interaction.reply({
					embeds: [await getPDSEmbed(interaction, vehicles, colour_pds, existing_pds.on_break, existing_pds.break_reason)],
					components: await getPDSButtons(vehicles),
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
				return await interaction.reply({ content: 'Fin de la pause', ephemeral: true });
			}
			else {
				const standard_pause = ` fin prévue à ${moment.tz('Europe/Paris').add(1, 'h').add(30, 'm').format('h:mm')}`;
				const reason = interaction.options.getString('raison') || standard_pause;
				await pds.update({ on_break: true, break_reason: reason });
				await updatePDS(interaction, pds);
				return await interaction.reply({ content: `Début de la pause avec la raison : ${reason}`, ephemeral: true });
			}
		}
		else if (interaction.options.getSubcommand() === 'reset') {
			const pds = await PriseService.findOne();
			if (!pds) {
				return await interaction.reply({ content: 'La prise de service n\'a pas encore été initialisée', ephemeral: true });
			}

			await pds.update({ on_break: false, break_reason: null });
			await Vehicle.update({ available: true, available_reason: null });
			await updatePDS(interaction, pds);
			return await interaction.reply({ content: 'La prise de service a été réinitialisée', ephemeral: true });
		}
		else if (interaction.options.getSubcommandGroup() === 'véhicule') {
			if (interaction.options.getSubcommand() === 'ajouter') {
				const name_vehicle = interaction.options.getString('nom');
				const emoji_vehicle = interaction.options.getString('emoji');
				const nb_place_vehicle = interaction.options.getInteger('nb_place');
				const can_take_break = interaction.options.getBoolean('peut_prendre_pause');

				const vehicle = await Vehicle.findOne({
					where: { name_vehicle: name_vehicle },
				});

				if (vehicle) {
					return await interaction.reply({ content: `Un véhicule portant le nom ${name_vehicle} existe déjà`, ephemeral: true });
				}

				console.log(`Emoji param: ${emoji_vehicle.toString()}\nTest1: ${emoji_vehicle.match(emoji_custom_regex)}\nTest2: ${emoji_vehicle.match(emoji_unicode_regex)}`);

				if (!emoji_vehicle.match(emoji_custom_regex) && !emoji_vehicle.match(emoji_unicode_regex)) {
					return await interaction.reply({ content: `L'emoji ${emoji_vehicle} donné en paramètre est incorrect`, ephemeral: true });
				}

				const new_vehicle = await Vehicle.create({
					name_vehicle: name_vehicle,
					emoji_vehicle: emoji_vehicle,
					nb_place_vehicle: nb_place_vehicle,
					can_take_break: can_take_break !== null ? can_take_break : true,
				});

				await updatePDS(interaction);

				return await interaction.reply({
					content: 'Le véhicule vient d\'être créé avec ces paramètres :\n' +
					`Nom : ${new_vehicle.name_vehicle}\n` +
					`Emoji : ${new_vehicle.emoji_vehicle}\n` +
					`Nombre de place : ${new_vehicle.nb_place_vehicle}\n` +
					`Peut prendre des pauses : ${new_vehicle.can_take_break ? 'Oui' : 'non'}\n`,
					ephemeral: true,
				});
			}
			else if (interaction.options.getSubcommand() === 'supprimer') {
				const name_vehicle = interaction.options.getString('nom');

				const vehicle = await Vehicle.findOne({
					where: { name_vehicle: name_vehicle },
				});

				if (!vehicle) {
					return await interaction.reply({ content: `Aucun véhicule ne porte le nom ${name_vehicle}`, ephemeral: true });
				}

				await vehicle.destroy();
				await updatePDS(interaction);

				return interaction.reply({ content: `Le véhicule portant le nom ${name_vehicle} a été supprimé`, ephemeral: true });
			}
			else if (interaction.options.getSubcommand() === 'modifier') {
				const name_vehicle = interaction.options.getString('nom');

				const vehicle = await Vehicle.findOne({
					where: { name_vehicle: name_vehicle },
				});

				if (!vehicle) {
					return await interaction.reply({ content: `Aucun véhicule ne porte le nom ${name_vehicle}`, ephemeral: true });
				}

				const new_name_vehicle = interaction.options.getString('nouveau_nom');
				const emoji_vehicle = interaction.options.getString('emoji');
				const nb_place_vehicle = interaction.options.getInteger('nb_place');
				const can_take_break = interaction.options.getBoolean('peut_prendre_pause');

				if (emoji_vehicle && !emoji_vehicle.match(emoji_custom_regex) && !emoji_vehicle.match(emoji_unicode_regex)) {
					return await interaction.reply({ content: `L'emoji ${emoji_vehicle} donné en paramètre est incorrect`, ephemeral: true });
				}

				await vehicle.update({
					name_vehicle: new_name_vehicle ? new_name_vehicle : vehicle.name_vehicle,
					emoji_vehicle: emoji_vehicle ? emoji_vehicle : vehicle.emoji_vehicle,
					nb_place_vehicle: nb_place_vehicle ? nb_place_vehicle : vehicle.nb_place_vehicle,
					can_take_break: can_take_break !== null ? can_take_break : vehicle.can_take_break,
				});

				return await interaction.reply({
					content: 'Le véhicule vient d\'être modifié avec ces paramètres :\n' +
					`Nom : ${vehicle.name_vehicle}\n` +
					`Emoji : ${vehicle.emoji_vehicle}\n` +
					`Nombre de place : ${vehicle.nb_place_vehicle}\n` +
					`Peut prendre des pauses : ${vehicle.can_take_break ? 'Oui' : 'non'}\n`,
					ephemeral: true,
				});
			}
			else if (interaction.options.getSubcommand() === 'afficher') {
				return await interaction.reply({ embeds: await getVehicleEmbed(interaction), ephemeral: true });
			}
		}
	},
};

const getPDSEmbed = async (interaction, vehicles, colour_pds, on_break = false, break_reason = null) => {
	const colour = colour_pds === 'RANDOM' ? Math.floor(Math.random() * 16777215) : colour_pds;
	console.log(`Couleur : ${colour}`);

	const guild = await interaction.client.guilds.fetch(guildId);
	const embed = new MessageEmbed()
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
		.setTitle('Disponibilité des véhicules')
		.setColor(colour_pds === 'RANDOM' ? colour : `#${colour}`)
		.setTimestamp(new Date());

	for (const v of vehicles) {
		const title = `${v.emoji_vehicle} ${v.name_vehicle}`;
		/**
		 * Règles du statut du véhicule :
		 * taken by -> montrer employé utilisant le camion
		 * !vehicle.available -> montrer véhicle.available_reason
		 * pds.on_break -> montrer pds.break_reason
		 */
		// TODO : go through VehicleTaken for employee + timestamp
		// console.log(v);
		/*
		if (v) {
			const employees = v.taken_by.split('|');
			let field = '';
			for (const e of employees) {
				let name = e;
				try {
					const user = await guild.members.fetch(e);
					name = user ? user.nickname ? user.nickname : user.user.username : e;
				}
				catch (error) {
					console.log('ERR - historique_grossiste: ', error);
				}
				field += `${name}\n`;
			}
			field.slice(0, -2);
			embed.addField(title, field, false);
		}
		else if (!v.available) {
			embed.addField(title, v.available_reason || 'Indisponible', false);
		}
		else if (on_break) {
			embed.addField(title, break_reason, false);
		}
		else {
			embed.addField(title, 'Disponible', false);
		}
		*/
	}

	return embed;
};

const getPDSButtons = async (vehicles) => {
	const vehiclesButtons = vehicles.map(v => {
		return new MessageButton({ customId: 'pds_' + v.id_vehicle, emoji: v.emoji_vehicle, style: 'SECONDARY' });
	});
	const stopButton = new MessageButton({ customId: 'pds_stop', emoji: '✖️', style: 'DANGER' });
	const settingsButton = new MessageButton({ customId: 'pds_setting', emoji: '🪄', style: 'PRIMARY' });

	if (vehiclesButtons.length <= 3) {
		return [new MessageActionRow().addComponents(...vehiclesButtons, stopButton, settingsButton)];
	}
	if (vehicles.length <= 8) {
		return [
			new MessageActionRow().addComponents(...vehiclesButtons.slice(0, 3)),
			new MessageActionRow().addComponents(...vehiclesButtons.slice(3), stopButton, settingsButton),
		];
	}
	if (vehicles.length <= 13) {
		return [
			new MessageActionRow().addComponents(...vehiclesButtons.slice(0, 3)),
			new MessageActionRow().addComponents(...vehiclesButtons.slice(3, 8)),
			new MessageActionRow().addComponents(...vehiclesButtons.slice(8), stopButton, settingsButton),
		];
	}
	if (vehicles.length <= 18) {
		return [
			new MessageActionRow().addComponents(...vehiclesButtons.slice(0, 3)),
			new MessageActionRow().addComponents(...vehiclesButtons.slice(3, 8)),
			new MessageActionRow().addComponents(...vehiclesButtons.slice(8, 13)),
			new MessageActionRow().addComponents(...vehiclesButtons.slice(13), stopButton, settingsButton),
		];
	}
	if (vehicles.length <= 23) {
		return [
			new MessageActionRow().addComponents(...vehiclesButtons.slice(0, 3)),
			new MessageActionRow().addComponents(...vehiclesButtons.slice(3, 8)),
			new MessageActionRow().addComponents(...vehiclesButtons.slice(8, 13)),
			new MessageActionRow().addComponents(...vehiclesButtons.slice(13, 18)),
			new MessageActionRow().addComponents(...vehiclesButtons.slice(18), stopButton, settingsButton),
		];
	}

	return [];
};

const updatePDS = async (interaction, pds = null) => {
	const vehicles = await Vehicle.findAll({
		include: [{ model: VehicleTaken }],
	});

	if (!pds) {
		pds = await PriseService.findOne();
	}

	const messageManager = new MessageManager(await interaction.client.channels.fetch(pds.id_channel));
	const message = await messageManager.fetch(pds.id_message);
	await message.edit({
		embeds: [await getPDSEmbed(interaction, vehicles, pds.colour_pds, pds.on_break, pds.break_reason)],
		components: await getPDSButtons(vehicles),
	});
};

const getVehicleEmbed = async (interaction) => {
	const vehicles = await Vehicle.findAll();

	const embed = new MessageEmbed()
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
		.setTitle('Véhicules')
		.setColor('#18913E')
		.setTimestamp(new Date());

	vehicles.map(v => {
		embed.addField(
			`${v.emoji_vehicle} ${v.name_vehicle}`,
			`Nom : ${v.name_vehicle}\nEmoji : ${v.emoji_vehicle}\nNombre de place : ${v.nb_place_vehicle}\nPeut prendre des pauses : ${v.can_take_break ? 'Oui' : 'Non'}`,
			true,
		);
	});

	return [embed];
};