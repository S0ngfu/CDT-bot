const { SlashCommandBuilder } = require('@discordjs/builders');
const { PDS, Vehicle } = require('../dbObjects');
const moment = require('moment');
const { MessageEmbed } = require('discord.js');
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
		const emoji_unicode_regex = '^[\u1000-\uFFFF]+$';

		if (interaction.options.getSubcommand() === 'init') {
			const colour_pds = interaction.options.getString('couleur') ? interaction.options.getString('couleur').trim() : 'RANDOM';

			if (colour_pds.match(hexa_regex) === null && colour_pds !== 'RANDOM') {
				await interaction.reply({ content: 'La couleur ' + colour_pds + ' donné en paramètre est incorrecte.', ephemeral: true });
				return;
			}

			const existing_pds = await PDS.findOne({
				where: { id_channel: interaction.channelId },
			});

			if (existing_pds) {
				try {
					await PDS.destroy({ where: { id_channel: interaction.channelId } });
					const pds_to_delete = await interaction.channel.messages.fetch(existing_pds.id_message);
					await pds_to_delete.delete();
				}
				catch (error) {
					console.log('Error: ', error);
				}
			}

			const pds = await PDS.upsert({
				id_message: message.id,
				id_channel: interaction.channelId,
				colour_pds: colour_pds,
			});

			const vehicles = await Vehicle.findAll();
			const message = await interaction.reply({
				embeds: [await getPDSEmbed(interaction, pds, vehicles)],
				components: await getPDSButtons(),
				fetchReply: true,
			});
		}
		else if (interaction.options.getSubcommand() === 'couleur') {
			const colour_pds = interaction.options.getString('couleur') ? interaction.options.getString('couleur').trim() : 'RANDOM';

			if (colour_pds.match(hexa_regex) === null && colour_pds !== 'RANDOM') {
				await interaction.reply({ content: 'La couleur ' + colour_pds + ' donné en paramètre est incorrecte.', ephemeral: true });
				return;
			}

			const pds = await PDS.findOne();

			if (pds) {
				await pds.update({ colour_pds: colour_pds });
				await updatePDS(interaction, pds);
				return await interaction.reply({ content: 'La couleur de la prise de service a été modifiée', ephemeral: true });
			}

			return await interaction.reply({ content: 'La prise de service n\'a pas encore été initialisée', ephemeral: true });
		}
		else if (interaction.options.getSubcommand() === 'pause') {
			const pds = await PDS.findOne();

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
			const pds = await PDS.findOne();
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
				const can_take_break = interaction.options.getBoolean('peut_prendre_pause') || true;

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
					can_take_break: can_take_break,
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
			else if (interaction.options.getSubcommand() === 'retirer') {
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
				return await interaction.reply({ embeds: await getVehicleEmbed(), ephemeral: true });
			}
		}
	},
};

const getPDSEmbed = async (interaction, pds, vehicles) => {
	const guild = await interaction.client.guilds.fetch(guildId);
	const embed = new MessageEmbed()
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
		.setTitle('Entreprises')
		.setColor(pds.colour_pds === 'RANDOM' ? `${Math.floor(Math.random() * 16777215)}` : `#${pds.colour_pds}`)
		.setTimestamp(new Date());

	await Promise.all(vehicles.forEach(async v => {
		const title = `${v.emoji_vehicle} ${v.name_vehicle}`;
		/**
		 * Règles du statut du véhicule :
		 * taken by -> montrer employé utilisant le camion
		 * !vehicle.available -> montrer véhicle.available_reason
		 * pds.on_break -> montrer pds.break_reason
		 */
		if (v.taken_by) {
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
		else if (pds.on_break) {
			embed.addField(title, pds.break_reason, false);
		}
		else {
			embed.addField(title, 'Disponible', false);
		}
	}));

	return [embed];
};

const getPDSButtons = async (vehicles) => {
	// TODO
};

const updatePDS = async (interaction, pds = null) => {
	const vehicles = await Vehicle.findAll();

	if (!pds) {
		pds = await PDS.findOne();
	}
	const message = await interaction.channel.messages.fetch(pds.id_message);
	await message.edit({
		embeds: [await getPDSEmbed(interaction, pds, vehicles)],
		components: await getPDSButtons(vehicles),
	});
};

const getVehicleEmbed = async () => {
	//
};