const { SlashCommandBuilder } = require('@discordjs/builders');
const { Employee, Grossiste, Bill, OpStock } = require('../dbObjects');
const { Op, fn, col } = require('sequelize');
const moment = require('moment');
const dotenv = require('dotenv');
const { EmbedBuilder, MessageManager, ActionRowBuilder, ButtonBuilder, ButtonStyle, DiscordAPIError } = require('discord.js');
const https = require('https');
const fs = require('fs');

dotenv.config();
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

const guildId = process.env.GUILD_ID;
const employee_section_Id = process.env.EMPLOYEE_SECTION_ID;
const archive_section_Id = process.env.ARCHIVE_SECTION_ID;

const updateFicheEmploye = async (client, id_employee, date_firing = null) => {
	const employee = await Employee.findOne({
		where: {
			id_employee: id_employee,
			date_firing: null,
		},
	});

	if (employee) {
		const embed = await employeeEmbed(
			employee,
			[
				await getGrossiste(id_employee, moment().startOf('week').hours(6), moment().startOf('week').add(7, 'd').hours(6)),
				await getGrossiste(id_employee, moment().startOf('week').hours(6).subtract('1', 'w'), moment().startOf('week').hours(6)),
				await getGrossiste(id_employee, moment().startOf('week').hours(6).subtract('2', 'w'), moment().startOf('week').subtract('1', 'w').hours(6)),
				await getGrossiste(id_employee, moment().startOf('week').hours(6).subtract('3', 'w'), moment().startOf('week').subtract('2', 'w').hours(6)),
			],
			[
				await getNbDelivery(id_employee, moment().startOf('week').hours(6), moment().startOf('week').add(7, 'd').hours(6)),
				await getNbDelivery(id_employee, moment().startOf('week').hours(6).subtract('1', 'w'), moment().startOf('week').hours(6)),
				await getNbDelivery(id_employee, moment().startOf('week').hours(6).subtract('2', 'w'), moment().startOf('week').subtract('1', 'w').hours(6)),
				await getNbDelivery(id_employee, moment().startOf('week').hours(6).subtract('3', 'w'), moment().startOf('week').subtract('2', 'w').hours(6)),
			],
			[
				await getNbStock(id_employee, moment().startOf('week').hours(6), moment().startOf('week').add(7, 'd').hours(6)),
				await getNbStock(id_employee, moment().startOf('week').hours(6).subtract('1', 'w'), moment().startOf('week').hours(6)),
				await getNbStock(id_employee, moment().startOf('week').hours(6).subtract('2', 'w'), moment().startOf('week').subtract('1', 'w').hours(6)),
				await getNbStock(id_employee, moment().startOf('week').hours(6).subtract('3', 'w'), moment().startOf('week').subtract('2', 'w').hours(6)),
			],
			date_firing,
		);

		let channel = null;

		try {
			channel = await client.channels.fetch(employee.id_channel);
		}
		catch (error) {
			if (error instanceof DiscordAPIError && error.code === 10003) {
				// Channel is unknow, we recreate it.
				console.error('Channel is unknown, recreating it...');
				const guild = await client.guilds.fetch(guildId);
				const channel_name = employee.name_employee.normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll(' ', '_').toLowerCase();

				channel = await guild.channels.create({
					name: channel_name,
					parent: employee_section_Id,
				});
				await channel.permissionOverwrites.edit(employee.id_employee, { 'ViewChannel': true });

				employee.update({
					id_channel: channel.id,
				});
			}
			else {
				console.error(error);
				return;
			}
		}

		if (!channel) {
			return;
		}

		const messageManager = new MessageManager(channel);

		try {
			const message_to_update = await messageManager.fetch(employee.id_message);

			if (employee.pp_file) {
				await message_to_update.edit({
					embeds: [embed],
					components: [getCalculoButton()],
					files: [`photos/${employee.pp_file}`],
				});
			}
			else {
				await message_to_update.edit({
					embeds: [embed],
					components: [getCalculoButton()],
					files: [],
				});
			}
		}
		catch (error) {
			// Message is unknown, we recreate it.
			if (error instanceof DiscordAPIError && error.code === 10008) {
				console.error('Message is unknown, recreating it...');
				channel = await client.channels.fetch(employee.id_channel);
				if (employee.pp_file) {
					const message = await channel.send({
						embeds: [embed],
						components: [getCalculoButton()],
						files: [`photos/${employee.pp_file}`],
					});

					employee.update({
						id_message: message.id,
					});
				}
				else {
					const message = await channel.send({
						embeds: [embed],
						components: [getCalculoButton()],
						files: [],
					});

					employee.update({
						id_message: message.id,
					});
				}
			}
			else {
				console.error(error);
			}
		}
	}
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('employés')
		.setDescription('Gestion des employés')
		.setDMPermission(false)
		.setDefaultMemberPermissions('0')
		.addSubcommand(subcommand =>
			subcommand
				.setName('recrutement')
				.setDescription('Permet d\'initialiser une fiche de paie pour un employé')
				.addUserOption((option) =>
					option
						.setName('nom')
						.setDescription('Personne sur discord')
						.setRequired(true),
				)
				.addStringOption(option =>
					option
						.setName('nom_employé')
						.setDescription('Nom de l\'employé (du panel)')
						.setRequired(true),
				).addStringOption(option =>
					option
						.setName('téléphone')
						.setDescription('Numéro de téléphone (sans le 555)')
						.setMinLength(4)
						.setMaxLength(4)
						.setRequired(false),
				).addBooleanOption(option =>
					option
						.setName('permis_conduire')
						.setDescription('Permis de conduire')
						.setRequired(false),
				).addIntegerOption(option =>
					option
						.setName('salaire')
						.setDescription('Salaire de l\'employé')
						.setMinValue(0)
						.setRequired(false),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('modifier')
				.setDescription('Permet de modifier la fiche d\'un employé')
				.addUserOption((option) =>
					option
						.setName('nom')
						.setDescription('Personne sur discord')
						.setRequired(true),
				)
				.addStringOption(option =>
					option
						.setName('nom_employé')
						.setDescription('Nom de l\'employé (du panel)')
						.setRequired(false),
				).addStringOption(option =>
					option
						.setName('téléphone')
						.setDescription('Numéro de téléphone (sans le 555)')
						.setMinLength(4)
						.setMaxLength(4)
						.setRequired(false),
				).addBooleanOption(option =>
					option
						.setName('permis_conduire')
						.setDescription('Permis de conduire')
						.setRequired(false),
				).addBooleanOption(option =>
					option
						.setName('diplôme')
						.setDescription('Diplôme')
						.setRequired(false),
				).addIntegerOption(option =>
					option
						.setName('salaire')
						.setDescription('Salaire de l\'employé')
						.setMinValue(0)
						.setRequired(false),
				).addStringOption(option =>
					option
						.setName('date_embauche')
						.setDescription('Date de l\'embauche')
						.setRequired(false),
				).addStringOption(option =>
					option
						.setName('date_cdd')
						.setDescription('Date de passage en CDD (JJ/MM/YYYY)')
						.setRequired(false),
				).addStringOption(option =>
					option
						.setName('date_cdi')
						.setDescription('Date de passage en CDI (JJ/MM/YYYY)')
						.setRequired(false),
				).addStringOption(option =>
					option
						.setName('visite_médicale')
						.setDescription('Date de passage en visite médicale (JJ/MM/YYYY)')
						.setRequired(false),
				).addAttachmentOption(option =>
					option
						.setName('photo')
						.setDescription('Permet d\'ajouter une photo de l\'employé')
						.setRequired(false),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('licenciement')
				.setDescription('Permet de licencier un employé')
				.addStringOption(option =>
					option
						.setName('nom_employé')
						.setDescription('Nom de l\'employé (du panel)')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('retirer_photo')
				.setDescription('Permet de retirer la photo d\'un employé')
				.addUserOption((option) =>
					option
						.setName('nom')
						.setDescription('Personne sur discord')
						.setRequired(true),
				),
		),
	async execute(interaction) {
		if (interaction.options.getSubcommand() === 'recrutement') {
			const employee = interaction.options.getUser('nom');
			const name_employee = interaction.options.getString('nom_employé');
			const phone_number = interaction.options.getString('téléphone');
			const driving_licence = interaction.options.getBoolean('permis_conduire');
			const wage = interaction.options.getInteger('salaire');

			const existing_employee = await Employee.findOne({
				where: {
					id_employee: employee.id,
					date_firing: null,
				},
			});

			if (existing_employee) {
				return await interaction.reply({ content: `L'employé ${employee.tag} a déjà été recruté`, ephemeral: true });
			}

			const guild = await interaction.client.guilds.fetch(guildId);
			const channel_name = name_employee.replaceAll(' ', '_').toLowerCase();

			const channel = await guild.channels.create(
				{
					name: channel_name,
					parent: employee_section_Id,
				},
			);
			await channel.permissionOverwrites.edit(employee.id, { 'ViewChannel': true });

			const member = await guild.members.fetch(employee.id);

			const new_employee = await Employee.create({
				id_employee: employee.id,
				name_employee: name_employee,
				phone_number: phone_number,
				wage: wage ? wage : 60,
				contract: member.roles.highest.name || '/',
				embed_color: member.roles.highest.color || '0',
				driving_licence: driving_licence ? true : false,
				pp_url: member.displayAvatarURL(true),
			});

			const message = await channel.send({
				embeds: [await employeeEmbed(new_employee)],
				components: [getCalculoButton()],
			});

			new_employee.update({
				id_channel: channel.id,
				id_message: message.id,
			});

			return await interaction.reply({
				content: `L'employé ${name_employee} vient d'être recruté! ${channel}\n` +
				`Contrat : ${new_employee.contract}\n` +
				`Numéro de téléphone : ${new_employee.phone_number ? '555-**' + new_employee.phone_number + '**' : 'Non renseigné'}\n` +
				`Salaire : $${new_employee.wage}\n` +
				`Permis de conduire : ${new_employee.driving_licence ? '✅' : '❌'}`,
				ephemeral: true,
			});
		}
		else if (interaction.options.getSubcommand() === 'modifier') {
			await interaction.deferReply({ ephemeral: true });
			const employee = interaction.options.getUser('nom');
			const name_employee = interaction.options.getString('nom_employé');
			const phone_number = interaction.options.getString('téléphone');
			const driving_licence = interaction.options.getBoolean('permis_conduire');
			const diploma = interaction.options.getBoolean('diplôme');
			const wage = interaction.options.getInteger('salaire');
			const embauche = interaction.options.getString('date_embauche');
			let date_hiring = null;
			const cdd = interaction.options.getString('date_cdd');
			let date_cdd = null;
			const cdi = interaction.options.getString('date_cdi');
			let date_cdi = null;
			const visite = interaction.options.getString('visite_médicale');
			let date_visite = null;
			const date_regex = '^([0-9]{1,2})/([0-9]{1,2})/([0-9]{2,4})$';
			const photo = interaction.options.getAttachment('photo');
			let local_photo = null;

			const existing_employee = await Employee.findOne({
				where: {
					id_employee: employee.id,
					date_firing: null,
				},
			});

			if (!existing_employee) {
				return await interaction.editReply({ content: `${employee.tag} n'est pas employé chez nous`, ephemeral: true });
			}

			if (photo) {
				if (!photo.contentType.startsWith('image')) {
					return await interaction.editReply({ content: `Le fichier ${photo.name} envoyé n'est pas une image`, ephemeral: true });
				}
				else {
					if (existing_employee.pp_file) {
						fs.unlink(`photos/${existing_employee.pp_file}`, (err) => {
							if (err) {
								console.error(err);
							}
						});
					}

					const promise = new Promise((resolve, reject) => {
						const file = fs.createWriteStream(`photos/${photo.name}`);
						https.get(photo.url, function(response) {
							response.pipe(file);

							file.on('finish', () => {
								file.close();
								local_photo = photo.name;
								resolve();
							});

							file.on('error', (err) => {
								fs.unlink(`photos/${photo.name}`);
								if (err) {
									console.error(err);
								}
								reject(err);
							});
						}).on('error', (err) => {
							reject(err);
						});
					});

					await promise;
				}
			}

			const guild = await interaction.client.guilds.fetch(guildId);
			const member = await guild.members.fetch({ user: existing_employee.id_employee, force: true });

			if (embauche && embauche.match(date_regex)) {
				const date = embauche.match(date_regex);
				date_hiring = moment().year(date[3]).month(date[2] - 1).date(date[1]);
			}

			if (cdd && cdd.match(date_regex)) {
				const date = cdd.match(date_regex);
				date_cdd = moment().year(date[3]).month(date[2] - 1).date(date[1]);
			}
			else if (cdd === '0') {
				date_cdd = null;
			}

			if (cdi && cdi.match(date_regex)) {
				const date = cdi.match(date_regex);
				date_cdi = moment().year(date[3]).month(date[2] - 1).date(date[1]);
			}
			else if (cdi === '0') {
				date_cdi = null;
			}

			if (visite && visite.match(date_regex)) {
				const date = visite.match(date_regex);
				date_visite = moment().year(date[3]).month(date[2] - 1).date(date[1]);
			}
			else if (visite === '0') {
				date_visite = null;
			}

			const [updated_employee] = await Employee.upsert({
				id: existing_employee.id,
				id_employee: existing_employee.id_employee,
				name_employee: name_employee ? name_employee : existing_employee.name_employee,
				phone_number: phone_number ? phone_number : existing_employee.phone_number,
				wage: wage ? wage : existing_employee.wage,
				contract: member.roles.highest.name || '/',
				date_hiring: date_hiring ? date_hiring : existing_employee.date_hiring,
				date_cdd: date_cdd ? date_cdd : existing_employee.date_cdd,
				date_cdi: date_cdi ? date_cdi : existing_employee.date_cdi,
				date_medical_checkup: date_visite ? date_visite : existing_employee.date_medical_checkup,
				driving_licence: driving_licence !== null ? driving_licence : existing_employee.driving_licence,
				diploma: diploma !== null ? diploma : existing_employee.diploma,
				pp_url: member.displayAvatarURL(true),
				pp_file: local_photo ? local_photo : employee.pp_file,
				embed_color: member.roles.highest.color || '0',
			}, { returning: true });

			await updateFicheEmploye(interaction.client, updated_employee.id_employee);

			if (name_employee && name_employee !== existing_employee.name_employee) {
				const channel_name = name_employee.replaceAll(' ', '_').toLowerCase();
				const channel = await guild.channels.fetch(existing_employee.id_channel);
				channel.edit({ name: channel_name });
			}

			return await interaction.editReply({
				content: `La fiche de l'employé ${updated_employee.name_employee} vient d'être mise à jour!\n` +
				`Numéro de téléphone : ${updated_employee.phone_number ? '555-**' + updated_employee.phone_number + '**' : 'Non renseigné'}\n` +
				`Salaire : $${updated_employee.wage}\n` +
				`Permis de conduire : ${updated_employee.driving_licence ? '✅' : '❌'}\n` +
				`Diplôme : ${updated_employee.diploma ? '✅' : '❌'}\n` +
				`Date d'embauche : ${moment(updated_employee.date_hiring).format('DD/MM/YYYY')}\n` +
				`Date de passage en CDD : ${updated_employee.date_cdd ? moment(updated_employee.date_cdd).format('DD/MM/YYYY') : 'Pas encore!'}\n` +
				`Date de passage en CDI : ${updated_employee.date_cdi ? moment(updated_employee.date_cdi).format('DD/MM/YYYY') : 'Pas encore!'}\n` +
				`Date de passage de la visite médicale : ${updated_employee.date_medical_checkup ? moment(updated_employee.date_medical_checkup).format('DD/MM/YYYY') : 'Pas encore passé'}`,
				ephemeral: true,
			});
		}
		else if (interaction.options.getSubcommand() === 'licenciement') {
			await interaction.deferReply({ ephemeral: true });
			const name_employee = interaction.options.getString('nom_employé');

			const existing_employee = await Employee.findOne({
				where: {
					name_employee: name_employee,
					date_firing: null,
				},
			});

			if (!existing_employee) {
				return await interaction.editReply({ content: `${existing_employee} n'est pas employé chez nous`, ephemeral: true });
			}

			await updateFicheEmploye(interaction.client, existing_employee.id_employee, moment());

			// Fetch employee again because channel_id / message_id may have changed
			const employee = await Employee.findOne({
				where: {
					id: existing_employee.id,
				},
			});

			employee.update({
				date_firing: moment(),
			});

			const guild = await interaction.client.guilds.fetch(guildId);
			const channel = await guild.channels.fetch(employee.id_channel);

			const parentChannel = await guild.channels.fetch(archive_section_Id);
			const archiveSectionSize = parentChannel.children.cache.size;

			if (archiveSectionSize >= 50) {
				await interaction.editReply({
					content: `L'employé ${employee.name_employee} vient d'être licencié!` +
					`\n⚠️ Impossible de déplacer le salon dans la catégorie ${parentChannel}, celle-ci contient déjà 50 salons ⚠️`,
					ephemeral: true,
				});
			}
			else {
				await interaction.editReply({
					content: `L'employé ${employee.name_employee} vient d'être licencié!`,
					ephemeral: true,
				});

				await channel.setParent(archive_section_Id);
			}

			return;
		}
		else if (interaction.options.getSubcommand() === 'retirer_photo') {
			const employee = interaction.options.getUser('nom');

			const existing_employee = await Employee.findOne({
				where: {
					id_employee: employee.id,
					date_firing: null,
				},
			});

			if (!existing_employee) {
				return await interaction.reply({ content: `${employee.tag} n'est pas employé chez nous`, ephemeral: true });
			}

			if (!existing_employee.pp_file) {
				return await interaction.reply({ content: `${employee.tag} n'a pas de photo`, ephemeral: true });
			}

			fs.unlink(`photos/${existing_employee.pp_file}`, (err) => {
				if (err) {
					console.error(err);
				}
			});

			const guild = await interaction.client.guilds.fetch(guildId);
			const member = await guild.members.fetch(employee.id);

			await Employee.upsert({
				id: existing_employee.id,
				pp_file: null,
				pp_url: member.displayAvatarURL(true),
			});

			await updateFicheEmploye(interaction.client, existing_employee.id_employee);

			return await interaction.reply({ content: `La photo de ${employee.tag} a été retiré`, ephemeral: true });
		}
	},
	updateFicheEmploye,
};

const getGrossiste = async (id, start, end) => {
	return await Grossiste.findAll({
		attributes: [
			[fn('sum', col('quantite')), 'total'],
		],
		where: {
			id_employe: id,
			timestamp: {
				[Op.between]: [+start, +end],
			},
		},
		group: ['id_employe'],
		raw: true,
	});
};

const getNbDelivery = async (id, start, end) => {
	return await Bill.findAll({
		attributes: [
			[fn('count', col('id_bill')), 'nb_livraison'],
		],
		where: {
			id_employe: id,
			date_bill: {
				[Op.between]: [+start, +end],
			},
			url: { [Op.not]: null },
		},
		group: ['id_employe'],
		raw: true,
	});
};

const getNbStock = async (id, start, end) => {
	return await OpStock.findAll({
		attributes: [
			[fn('sum', col('qt')), 'qt_stock'],
		],
		where: {
			id_employe: id,
			timestamp: {
				[Op.between]: [+start, +end],
			},
			qt: { [Op.gt]: 0 },
		},
		raw: true,
	});
};

const employeeEmbed = async (employee, grossiste = [], nb_delivery = [], nb_stock = [], date_firing = null) => {
	const embed = new EmbedBuilder()
		.setColor(employee.embed_color)
		.setTimestamp(new Date())
		.setTitle(employee.name_employee);

	if (employee.pp_file) {
		embed.setThumbnail(`attachment://${employee.pp_file}`);
	}
	else {
		embed.setThumbnail(employee.pp_url);
	}

	embed.addFields(
		{ name: 'Contrat', value: `${employee.contract}`, inline: true },
		{ name: 'Salaire', value: `$${employee.wage}`, inline: true },
		{ name: 'Numéro de téléphone', value: `${employee.phone_number ? `555-${employee.phone_number}` : 'Non renseigné'}`, inline: true },
		{ name: 'Date d\'embauche', value: `${moment(employee.date_hiring).format('DD/MM/YYYY')}`, inline: true },
		employee.date_cdd ? { name: 'Passage en CDD', value: `${moment(employee.date_cdd).format('DD/MM/YYYY')}`, inline: true } : { name: '\u200b', value: '\u200b', inline: true },
		employee.date_cdi ? { name: 'Passage en CDI', value: `${moment(employee.date_cdi).format('DD/MM/YYYY')}`, inline: true } : { name: '\u200b', value: '\u200b', inline: true },
	);
	date_firing && embed.addFields({ name: 'Licenciement', value: `${date_firing.format('DD/MM/YYYY')}`, inline: false });
	embed.addFields(
		{ name: 'Diplôme', value: `${employee.diploma ? '✅\u200b' : '❌\u200b'}`, inline: true },
		{ name: 'Permis PL', value: `${employee.driving_licence ? '✅\u200b' : '❌\u200b'}`, inline: true },
	);

	if (!employee.date_medical_checkup) {
		embed.addFields({ name: 'Visite médicale', value: '⚠️ Pas encore passé', inline: true });
	}
	else if (moment().diff(moment(employee.date_medical_checkup), 'd') > 118) {
		embed.addFields({ name: 'Visite médicale', value: `${moment(employee.date_medical_checkup).format('DD/MM/YYYY')}\n⚠️ Non valide`, inline: true });
	}
	else {
		embed.addFields({ name: 'Visite médicale', value: `${moment(employee.date_medical_checkup).format('DD/MM/YYYY')}`, inline: true });
	}

	if (grossiste.length === 4) {
		embed.addFields({
			name: 'Tournées',
			value: `S : ${grossiste[0][0]?.total ? (grossiste[0][0].total / 720).toFixed(2) : 0}\n`
				+ `S-1 : ${grossiste[1][0]?.total ? (grossiste[1][0].total / 720).toFixed(2) : 0}\n`
				+ `S-2 : ${grossiste[2][0]?.total ? (grossiste[2][0].total / 720).toFixed(2) : 0}\n`
				+ `S-3 : ${grossiste[3][0]?.total ? (grossiste[3][0].total / 720).toFixed(2) : 0}`,
			inline: true });
	}
	else {
		embed.addFields({
			name: 'Tournées',
			value: 'S : 0\n'
				+ 'S-1 : 0\n'
				+ 'S-2 : 0\n'
				+ 'S-3 : 0',
			inline: true });
	}

	if (nb_delivery.length === 4) {
		embed.addFields({
			name: 'Livraisons',
			value: `S : ${nb_delivery[0][0]?.nb_livraison ? (nb_delivery[0][0].nb_livraison) : 0}\n`
				+ `S-1 : ${nb_delivery[1][0]?.nb_livraison ? (nb_delivery[1][0].nb_livraison) : 0}\n`
				+ `S-2 : ${nb_delivery[2][0]?.nb_livraison ? (nb_delivery[2][0].nb_livraison) : 0}\n`
				+ `S-3 : ${nb_delivery[3][0]?.nb_livraison ? (nb_delivery[3][0].nb_livraison) : 0}`,
			inline: true });
	}
	else {
		embed.addFields({
			name: 'Livraisons',
			value: 'S : 0\n'
				+ 'S-1 : 0\n'
				+ 'S-2 : 0\n'
				+ 'S-3 : 0',
			inline: true });
	}

	if (nb_stock.length === 4) {
		embed.addFields({
			name: 'Mises en stock',
			value: `S : ${nb_stock[0][0]?.qt_stock ? (nb_stock[0][0].qt_stock) : 0}\n`
				+ `S-1 : ${nb_stock[1][0]?.qt_stock ? (nb_stock[1][0].qt_stock) : 0}\n`
				+ `S-2 : ${nb_stock[2][0]?.qt_stock ? (nb_stock[2][0].qt_stock) : 0}\n`
				+ `S-3 : ${nb_stock[3][0]?.qt_stock ? (nb_stock[3][0].qt_stock) : 0}`,
			inline: true });
	}
	else {
		embed.addFields({
			name: 'Mises en stock',
			value: 'S : 0\n'
				+ 'S-1 : 0\n'
				+ 'S-2 : 0\n'
				+ 'S-3 : 0',
			inline: true });
	}

	return embed;
};

const getCalculoButton = () => {
	return new ActionRowBuilder().addComponents([
		new ButtonBuilder({ customId: 'calculo', label: 'Calculo', emoji: '📱', style: ButtonStyle.Primary }),
	]);
};
