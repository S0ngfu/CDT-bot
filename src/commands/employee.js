const { SlashCommandBuilder } = require('@discordjs/builders');
const { Employee, Grossiste } = require('../dbObjects');
const { Op, fn, col } = require('sequelize');
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
const employee_section_Id = process.env.EMPLOYEE_SECTION_ID;

const updateFicheEmploye = async (id_employee, date_firing = null) => {
	const employee = await Employee.findOne({
		where: {
			id_employee: id_employee,
			date_firing: null,
		},
	});

	const embed = await employeeEmbed(
		employee,
		await getGrossiste(id_employee, moment().startOf('week').hours(6), moment().startOf('week').add(7, 'd').hours(6)),
		await getGrossiste(id_employee, moment().startOf('week').hours(6).subtract('1', 'w'), moment().startOf('week').hours(6)),
		await getGrossiste(id_employee, moment().startOf('week').hours(6).subtract('2', 'w'), moment().startOf('week').subtract('1', 'w').hours(6)),
		await getGrossiste(id_employee, moment().startOf('week').hours(6).subtract('3', 'w'), moment().startOf('week').subtract('2', 'w').hours(6)),
		date_firing,
	);
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
						.setName('joueur')
						.setDescription('Joueur sur discord')
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
						.setDescription('Numéro de téléphone')
						.setRequired(false),
				).addBooleanOption(option =>
					option
						.setName('permis_conduire')
						.setDescription('Permis de conduire')
						.setRequired(false),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('modifier')
				.setDescription('Permet de modifier la fiche d\'un employé')
				.addUserOption((option) =>
					option
						.setName('joueur')
						.setDescription('Joueur sur discord')
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
						.setDescription('Numéro de téléphone')
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
				),
		),
	async execute(interaction) {
		if (interaction.options.getSubcommand() === 'recrutement') {
			const employee = interaction.options.getUser('joueur');
			const name_employee = interaction.options.getString('nom_employé');
			const phone_number = interaction.options.getString('téléphone');
			const driving_licence = interaction.options.getBoolean('permis_conduire');

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

			const channel = await guild.channels.create(channel_name,
				{
					parent: employee_section_Id,
				},
			);
			await channel.permissionOverwrites.edit(employee.id, { 'VIEW_CHANNEL': true });

			const new_employee = await Employee.create({
				id_employee: employee.id,
				name_employee: name_employee,
				phone_number: phone_number,
				wage: 60,
				driving_licence: driving_licence ? true : false,
			});

			return await interaction.reply({
				content: `L'employé ${name_employee} vient d'être recruté!\n` +
				`Numéro de téléphone : ${new_employee.phone_number ? '555-**' + new_employee.phone_number + '**' : 'Non renseigné'}\n` +
				`Salaire : $${new_employee.wage}\n` +
				`Permis de conduire : ${new_employee.driving_licence ? 'Oui' : 'Non'}`,
				ephemeral: true,
			});
		}
		else if (interaction.options.getSubcommand() === 'modifier') {
			const employee = interaction.options.getUser('joueur');
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
			const visite = interaction.options.getString('visite_medicale');
			let date_visite = null;
			const date_regex = '^([0-9]{1,2})/([0-9]{1,2})/([0-9]{2,4})$';

			const existing_employee = await Employee.findOne({
				where: {
					id_employee: employee.id,
					date_firing: null,
				},
			});

			if (!existing_employee) {
				return await interaction.reply({ content: `${employee.tag} n'est pas employé chez nous`, ephemeral: true });
			}

			if (embauche && embauche.match(date_regex)) {
				const date = embauche.match(date_regex);
				date_hiring = moment().year(date[3]).month(date[2] - 1).date(date[1]);
			}

			if (cdd && cdd.match(date_regex)) {
				const date = cdd.match(date_regex);
				date_cdd = moment().year(date[3]).month(date[2] - 1).date(date[1]);
			}

			if (cdi && cdi.match(date_regex)) {
				const date = cdi.match(date_regex);
				date_cdi = moment().year(date[3]).month(date[2] - 1).date(date[1]);
			}

			if (visite && visite.match(date_regex)) {
				const date = visite.match(date_regex);
				date_visite = moment().year(date[3]).month(date[2] - 1).date(date[1]);
			}

			const [updated_employee] = await Employee.upsert({
				id_employee: existing_employee.id_employee,
				name_employee: name_employee ? name_employee : existing_employee.name_employee,
				phone_number: phone_number ? phone_number : existing_employee.phone_number,
				wage: wage ? wage : existing_employee.wage,
				date_hiring: date_hiring ? date_hiring : existing_employee.date_hiring,
				date_cdd: date_cdd ? date_cdd : existing_employee.date_cdd,
				date_cdi: date_cdi ? date_cdi : existing_employee.date_cdi,
				date_medical_checkup: date_visite ? date_visite : existing_employee.date_medical_checkup,
				driving_licence: driving_licence !== null ? driving_licence : existing_employee.driving_licence,
				diploma: diploma ? diploma !== null : existing_employee.diploma,
			});

			return await interaction.reply({
				content: `La fiche de l'employé ${updated_employee.name_employee} vient d'être mise à jour!\n` +
				`Numéro de téléphone : ${updated_employee.phone_number ? '555-**' + updated_employee.phone_number + '**' : 'Non renseigné'}\n` +
				`Salaire : $${updated_employee.wage}\n` +
				`Permis de conduire : ${updated_employee.driving_licence ? 'Oui' : 'Non'}\n` +
				`Diplôme : ${updated_employee.diploma ? 'Oui' : 'Non'}\n` +
				`Date d'embauche : ${moment(updated_employee.date_hiring).format('DD/MM/YYYY')}\n` +
				`Date de passage en CDD : ${updated_employee.date_cdd ? moment(updated_employee.date_cdd).format('DD/MM/YYYY') : 'Pas encore!'}\n` +
				`Date de passage en CDI : ${updated_employee.date_cdi ? moment(updated_employee.date_cdi).format('DD/MM/YYYY') : 'Pas encore!'}\n` +
				`Date de passage de la visite médicale : ${updated_employee.date_medical_checkup ? moment(updated_employee.date_medical_checkup).format('DD/MM/YYYY') : 'Pas encore passé'}`,
				ephemeral: true,
			});
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
			id_employee: id,
			timestamp: {
				[Op.between]: [+start, +end],
			},
		},
		group: ['id_employe'],
		raw: true,
	});
};

const employeeEmbed = async (employee, grossW, grossW1, grossW2, grossW3, date_firing) => {
	//
};