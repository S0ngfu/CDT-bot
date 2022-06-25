const { SlashCommandBuilder } = require('@discordjs/builders');
const { Employee, Grossiste, BillModel } = require('../dbObjects');
const { Op, fn, col } = require('sequelize');
const moment = require('moment');
const dotenv = require('dotenv');
const { MessageEmbed, MessageManager, MessageActionRow, MessageButton } = require('discord.js');
const https = require('https');
const fs = require('fs');
const { updatePhoneBook } = require('./annuaire');

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
const trombi_channel_Id = process.env.TROMBI_CHANNEL_ID;

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
			await getGrossiste(id_employee, moment().startOf('week').hours(6), moment().startOf('week').add(7, 'd').hours(6)),
			await getGrossiste(id_employee, moment().startOf('week').hours(6).subtract('1', 'w'), moment().startOf('week').hours(6)),
			await getGrossiste(id_employee, moment().startOf('week').hours(6).subtract('2', 'w'), moment().startOf('week').subtract('1', 'w').hours(6)),
			await getGrossiste(id_employee, moment().startOf('week').hours(6).subtract('3', 'w'), moment().startOf('week').subtract('2', 'w').hours(6)),
			date_firing,
		);

		const messageManager = new MessageManager(await client.channels.fetch(employee.id_channel));
		const message_to_update = await messageManager.fetch(employee.id_message);

		if (employee.pp_file) {
			await message_to_update.edit({
				embeds: [embed],
				components: date_firing ? [] : [getButtons(), ...await getBillModels(id_employee)],
				files: [`photos/${employee.pp_file}`],
			});
		}
		else {
			await message_to_update.edit({
				embeds: [embed],
				components: date_firing ? [] : [getButtons(), ...await getBillModels(id_employee)],
				files: [],
			});
		}
	}
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('employés')
		.setDescription('Gestion des employés')
		.setDefaultPermission(false)
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
						.setName('nom_panel')
						.setDescription('Nom de l\'employé (du panel)')
						.setRequired(true),
				).addStringOption(option =>
					option
						.setName('téléphone')
						.setDescription('Numéro de téléphone (sans le 555)')
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
				.addStringOption((option) =>
					option
						.setName('nom_employé')
						.setDescription('Nom de l\'employé à qui modifier la fiche')
						.setRequired(true)
						.setAutocomplete(true),
				)
				.addStringOption(option =>
					option
						.setName('nom_panel')
						.setDescription('Nom de l\'employé (du panel)')
						.setRequired(false),
				).addStringOption(option =>
					option
						.setName('téléphone')
						.setDescription('Numéro de téléphone (sans le 555)')
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
						.setRequired(true)
						.setAutocomplete(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('retirer_photo')
				.setDescription('Permet de retirer la photo d\'un employé')
				.addStringOption((option) =>
					option
						.setName('nom_employé')
						.setDescription('Personne sur discord')
						.setRequired(true)
						.setAutocomplete(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('retirer_modèle')
				.setDescription('Permet de retirer un modèle d\'un employé')
				.addStringOption((option) =>
					option
						.setName('nom_employé')
						.setDescription('Nom de l\'employé')
						.setRequired(true)
						.setAutocomplete(true),
				)
				.addStringOption((option) =>
					option
						.setName('nom_modèle')
						.setDescription('Nom du modèle à supprimer')
						.setRequired(true)
						.setAutocomplete(true),
				),
		),
	async execute(interaction) {
		if (interaction.options.getSubcommand() === 'recrutement') {
			const employee = interaction.options.getUser('nom');
			const name_employee = interaction.options.getString('nom_panel');
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
			const channel_name = name_employee.normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll(' ', '_').toLowerCase();

			const channel = await guild.channels.create(channel_name,
				{
					parent: employee_section_Id,
				},
			);
			await channel.permissionOverwrites.edit(employee.id, { 'VIEW_CHANNEL': true });

			const member = await guild.members.fetch(employee.id);

			const new_employee = await Employee.create({
				id_employee: employee.id,
				name_employee: name_employee,
				phone_number: phone_number,
				wage: wage ? wage : 60,
				contract: member.roles.highest.name || '/',
				embed_color: member.roles.highest.color || '0',
				driving_licence: driving_licence ? true : false,
				pp_url: employee.displayAvatarURL(true),
			});

			const message = await channel.send({
				embeds: [await employeeEmbed(new_employee)],
				components: [getButtons()],
			});

			new_employee.update({
				id_channel: channel.id,
				id_message: message.id,
			});

			if (phone_number) {
				updatePhoneBook(interaction.client);
			}

			return await interaction.reply({
				content: `L'employé ${name_employee} vient d'être recruté!\n` +
				`Numéro de téléphone : ${new_employee.phone_number ? '555-**' + new_employee.phone_number + '**' : 'Non renseigné'}\n` +
				`Salaire : $${new_employee.wage}\n` +
				`Permis de conduire : ${new_employee.driving_licence ? '✅' : '❌'}`,
				ephemeral: true,
			});
		}
		else if (interaction.options.getSubcommand() === 'modifier') {
			await interaction.deferReply({ ephemeral: true });
			const employee_name = interaction.options.getString('nom_employé');
			const name_employee = interaction.options.getString('nom_panel');
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
					name_employee: { [Op.like]: `%${employee_name}%` },
					date_firing: null,
				},
			});

			if (!existing_employee) {
				return await interaction.editReply({ content: `${employee_name} n'est pas employé chez nous`, ephemeral: true });
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
						const file = fs.createWriteStream(`photos/${existing_employee.name_employee.normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll(' ', '_').toLowerCase()}-${photo.name}`);
						https.get(photo.url, function(response) {
							response.pipe(file);

							file.on('finish', () => {
								file.close();
								local_photo = `${existing_employee.name_employee.normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll(' ', '_').toLowerCase()}-${photo.name}`;
								resolve();
							});

							file.on('error', (err) => {
								fs.unlink(`photos/${existing_employee.name_employee.normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll(' ', '_').toLowerCase()}-${photo.name}`);
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
			const member = await guild.members.fetch(existing_employee.id_employee);


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
				diploma: diploma ? diploma !== null : existing_employee.diploma,
				pp_url: member.displayAvatarURL(true),
				pp_file: local_photo ? local_photo : existing_employee.pp_file,
				embed_color: member.roles.highest.color || '0',
			}, { returning: true });

			updateFicheEmploye(interaction.client, updated_employee.id_employee);

			if (phone_number || name_employee) {
				updatePhoneBook(interaction.client);
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
			const employee_name = interaction.options.getString('nom_employé');

			const existing_employee = await Employee.findOne({
				where: {
					name_employee: { [Op.like]: `%${employee_name}%` },
					date_firing: null,
				},
			});

			if (!existing_employee) {
				return await interaction.editReply({ content: `${existing_employee} n'est pas employé chez nous`, ephemeral: true });
			}

			await BillModel.destroy({ where: { id_employe: existing_employee.id_employee } });

			await updateFicheEmploye(interaction.client, existing_employee.id_employee, moment());

			if (existing_employee.pp_file) {
				fs.unlink(`photos/${existing_employee.pp_file}`, (err) => {
					if (err) {
						console.error(err);
					}
				});
			}

			if (existing_employee.trombi_file) {
				fs.unlink(`trombi/${existing_employee.trombi_file}`, (err) => {
					if (err) {
						console.error(err);
					}
				});

				const messageManager = new MessageManager(await interaction.client.channels.fetch(trombi_channel_Id));
				const message_to_delete = await messageManager.fetch(existing_employee.id_trombi_message);
				await message_to_delete.delete();
			}

			await Employee.upsert({
				id: existing_employee.id,
				id_employee: existing_employee.id_employee,
				date_firing: moment(),
				pp_file: null,
				trombi_file: null,
				id_trombi_message: null,
			}, { returning: true });

			updatePhoneBook(interaction.client);

			const guild = await interaction.client.guilds.fetch(guildId);
			const channel = await guild.channels.fetch(existing_employee.id_channel);

			await interaction.editReply({
				content: `L'employé ${existing_employee.name_employee} vient d'être licencié!`,
				ephemeral: true,
			});

			await channel.setParent(archive_section_Id);

			return;
		}
		else if (interaction.options.getSubcommand() === 'retirer_photo') {
			const name_employee = interaction.options.getString('nom_employé');

			const existing_employee = await Employee.findOne({
				where: {
					name_employee: { [Op.like]: `%${name_employee}%` },
					date_firing: null,
				},
			});

			if (!existing_employee) {
				return await interaction.reply({ content: `${name_employee} n'est pas employé chez nous`, ephemeral: true });
			}

			if (!existing_employee.pp_file) {
				return await interaction.reply({ content: `${existing_employee.name_employee} n'a pas de photo`, ephemeral: true });
			}

			fs.unlink(`photos/${existing_employee.pp_file}`, (err) => {
				if (err) {
					console.error(err);
				}
			});

			const guild = await interaction.client.guilds.fetch(guildId);
			const member = await guild.members.fetch(existing_employee.id_employee);

			await Employee.upsert({
				id: existing_employee.id,
				pp_file: null,
				pp_url: member.displayAvatarURL(true),
			});

			updateFicheEmploye(interaction.client, existing_employee.id_employee);

			return await interaction.reply({ content: `La photo de ${existing_employee.name_employee} a été retiré`, ephemeral: true });
		}
		else if (interaction.options.getSubcommand() === 'retirer_modèle') {
			const name_employee = interaction.options.getString('nom_employé');
			const model_name = interaction.options.getString('nom_modèle');

			const existing_employee = await Employee.findOne({
				where: {
					name_employee: name_employee,
					date_firing: null,
				},
			});

			if (!existing_employee) {
				return await interaction.reply({ content: `${name_employee} n'est pas employé chez nous`, ephemeral: true });
			}

			const existing_model = await BillModel.findOne({ where: { name: model_name, id_employe: existing_employee.id_employee } });

			if (existing_model) {
				await existing_model.destroy();
				await updateFicheEmploye(interaction.client, existing_employee.id_employee);
				return interaction.reply({ content: `Le modèle de facture portant le nom ${model_name} ${existing_model.emoji ? existing_model.emoji : ''} a bien été supprimé pour l'employé ${existing_employee.name_employee}`, ephemeral: true });
			}
			else {
				return interaction.reply({ content: `Aucun modèle de facture portant le nom ${model_name} a été trouvé pour l'employé ${existing_employee.name_employee}`, ephemeral: true });
			}
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

const employeeEmbed = async (employee, grossW = 0, grossW1 = 0, grossW2 = 0, grossW3 = 0, date_firing = null) => {
	const embed = new MessageEmbed()
		.setColor(employee.embed_color)
		.setTimestamp(new Date())
		.setTitle(employee.name_employee);

	if (employee.pp_file) {
		embed.setThumbnail(`attachment://${employee.pp_file}`);
	}
	else {
		embed.setThumbnail(employee.pp_url);
	}

	embed.addField('Contrat', `${employee.contract}`, true);
	embed.addField('Salaire', `$${employee.wage}`, true);
	embed.addField('Numéro de téléphone', `${employee.phone_number ? `555-${employee.phone_number}` : 'Non renseigné'}`, true);
	embed.addField('Date d\'embauche', `${moment(employee.date_hiring).format('DD/MM/YYYY')}`, true);
	employee.date_cdd ? embed.addField('Passage en CDD', `${moment(employee.date_cdd).format('DD/MM/YYYY')}`, true) : embed.addField('\u200b', '\u200b', true);
	employee.date_cdi ? embed.addField('Passage en CDI', `${moment(employee.date_cdi).format('DD/MM/YYYY')}`, true) : embed.addField('\u200b', '\u200b', true);
	// embed.addField('\u200b', '\u200b', false);
	date_firing && embed.addField('Licenciement', `${date_firing.format('DD/MM/YYYY')}`, false);
	embed.addField('Diplôme', `${employee.diploma ? '✅\u200b' : '❌\u200b'}`, true);
	embed.addField('Permis PL', `${employee.driving_licence ? '✅\u200b' : '❌\u200b'}`, true);

	if (!employee.date_medical_checkup) {
		embed.addField('Visite médicale', '⚠️ Pas encore passé', true);
	}
	else if (moment().diff(moment(employee.date_medical_checkup), 'd') > 120) {
		embed.addField('Visite médicale', `${moment(employee.date_medical_checkup).format('DD/MM/YYYY')}\n⚠️ Non valide`, true);
	}
	else {
		embed.addField('Visite médicale', `${moment(employee.date_medical_checkup).format('DD/MM/YYYY')}`, true);
	}
	// embed.addField('\u200b', '\u200b', true);
	embed.addField('Tournées', `Semaine en cours : ${grossW[0]?.total ? (grossW[0].total / 720).toFixed(2) : 0}\nS-1 : ${grossW1[0]?.total ? (grossW1[0].total / 720).toFixed(2) : 0}\nS-2 : ${grossW2[0]?.total ? (grossW2[0].total / 720).toFixed(2) : 0}\nS-3 : ${grossW3[0]?.total ? (grossW3[0].total / 720).toFixed(2) : 0}`, true);

	return embed;
};

const getButtons = () => {
	return new MessageActionRow().addComponents([
		new MessageButton({ customId: 'calculo', label: 'Calculo', emoji: '📱', style: 'PRIMARY' }),
		new MessageButton({ customId: 'suggestionBoxButton', label: 'Boîte à idées', emoji: '🗳️', style: 'PRIMARY' }),
	]);
};

const getBillModels = async (id_employee) => {
	const billModels = await BillModel.findAll({ where: { id_employe: id_employee } });

	const formatedM = [];

	for (const bm of billModels) {
		formatedM.push(new MessageButton({ customId: 'model_' + bm.id.toString(), label: bm.name, emoji: bm.emoji, style: 'SECONDARY' }));
	}

	if (formatedM.length === 0) {
		return [];
	}

	if (formatedM.length <= 5) {
		return [new MessageActionRow().addComponents(...formatedM)];
	}

	if (formatedM.length <= 10) {
		return [new MessageActionRow().addComponents(...formatedM.slice(0, 5)), new MessageActionRow().addComponents(...formatedM.slice(5))];
	}

	if (formatedM.length <= 15) {
		return [new MessageActionRow().addComponents(...formatedM.slice(0, 5)), new MessageActionRow().addComponents(...formatedM.slice(5, 10)), new MessageActionRow().addComponents(...formatedM.slice(10))];
	}
};
