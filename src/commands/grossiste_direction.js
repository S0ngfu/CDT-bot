const { SlashCommandBuilder } = require('@discordjs/builders');
const moment = require('moment');
const { Op } = require('sequelize');
const { Grossiste, Employee } = require('../dbObjects.js');
const { updateFicheEmploye } = require('./employee.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('export_direction')
		.setDescription('Permet d\'enregistrer les ventes de farines effectuées à l\'export pour un employé')
		.setDMPermission(false)
		.setDefaultMemberPermissions('0')
		.addStringOption((option) =>
			option
				.setName('nom_employé')
				.setDescription('Nom de l\'employé')
				.setAutocomplete(true)
				.setRequired(true),
		)
		.addIntegerOption((option) =>
			option
				.setName('quantite')
				.setDescription('Nombre de farines vendues')
				.setRequired(true)
				.setMinValue(1),
		),
	async execute(interaction) {
		const employee_name = interaction.options.getString('nom_employé');
		const quantite = interaction.options.getInteger('quantite');

		const employee = await Employee.findOne({
			where: {
				name_employee: { [Op.like]: `%${employee_name}%` },
				date_firing: null,
			},
		});

		if (!employee) {
			return interaction.reply({ content: `Aucun employé portant le nom ${employee_name} n'a été trouvé`, ephemeral: true });
		}

		if (quantite > 0) {
			await Grossiste.upsert({
				id_employe: employee.id_employee,
				quantite: quantite,
				timestamp: moment.tz('Europe/Paris'),
			});

			await updateFicheEmploye(interaction.client, employee.id_employee);
			return interaction.reply({ content: `Les ${quantite} farines ont bien été enregistrées pour ${employee.name_employee}`, ephemeral: true });
		}
		else {
			return interaction.reply({ content: 'Vous devez renseigner un nombre positif supérieur à 0', ephemeral: true });
		}
	},
};