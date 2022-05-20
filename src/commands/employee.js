const { SlashCommandBuilder } = require('@discordjs/builders');
const { Employee } = require('../dbObjects');
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
						.setDescription('joueur sur discord')
						.setRequired(true),
				)
				.addStringOption(option =>
					option
						.setName('nom_employé')
						.setDescription('nom de l\'employé')
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

			await Employee.upsert({
				id_employee: employee.id,
				name_employee: name_employee,
				phone_number: phone_number,
				wage: 60,
				driving_licence: driving_licence ? true : false,
			});

			await interaction.reply({ content: 'testing', ephemeral: true });
		}
	},
};