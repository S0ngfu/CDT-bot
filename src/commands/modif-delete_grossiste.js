const { SlashCommandBuilder, time } = require('discord.js');
const { Grossiste, Employee } = require('../dbObjects.js');
const moment = require('moment');
const dotenv = require('dotenv');
const { updateFicheEmploye } = require('./employee.js');

dotenv.config();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('modif-delete_grossiste')
		.setDescription('Permet de modifier ou de supprimer une tournée')
		.setDMPermission(false)
		.setDefaultMemberPermissions('0')
		.addIntegerOption((option) =>
			option
				.setName('id')
				.setDescription('Id de la tournée')
				.setRequired(true)
				.setMinValue(0),
		)
		.addIntegerOption((option) =>
			option
				.setName('quantite')
				.setDescription('Nouvelle quantité (0 pour supprimer)')
				.setRequired(true)
				.setMinValue(0),
		),
	async execute(interaction) {
		const id = interaction.options.getInteger('id');
		const quantite = interaction.options.getInteger('quantite');

		const data = await Grossiste.findOne({ where: { id: id }, include: [{ model: Employee }] });
		if (!data) {
			return await interaction.reply({
				content: ':warning: Erreur: la tournée n\'a pas été retrouvée :warning:',
				ephemeral: true,
			});
		}
		if (quantite === 0) {
			await Grossiste.destroy({ where: { id: id } });
			await interaction.reply({
				content: 'La tournée de ' + data.employee.name_employee + ' pour ' + data.quantite + ' bouteilles effectuée le ' + time(moment(new Date(data.timestamp)).tz('Europe/Paris').unix(), 'F') + ' a été supprimée',
				ephemeral: true,
			});
		}
		else if (quantite > 0) {
			const [updated] = await Grossiste.upsert({
				id: id,
				quantite: quantite,
			});
			await interaction.reply({
				content: 'La tournée de ' + data.employee.name_employee + ' pour ' + updated.quantite + ' bouteilles effectuée le ' + time(moment(new Date(data.timestamp)).tz('Europe/Paris').unix(), 'F') + ' a été modifié avec succès',
				ephemeral: true,
			});
		}

		await updateFicheEmploye(interaction.client, data.employee.id_employee);
	},
};