const { SlashCommandBuilder } = require('@discordjs/builders');
const { Enterprise, PriceEnterprise } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('delete_entreprise')
		.setDescription('Supprime une entreprise')
		.setDefaultPermission(false)
		.addStringOption((option) =>
			option
				.setName('nom')
				.setDescription('Nom de l\'entreprise à supprimer')
				.setRequired(true),
		),
	async execute(interaction) {
		const name_enterprise = interaction.options.getString('nom');
		const enterprise = await Enterprise.findOne({ attributes: ['id_enterprise'], where: { name_enterprise: name_enterprise } });
		if (enterprise) {
			await PriceEnterprise.destroy({ where: { id_enterprise: enterprise.id_enterprise } });
			const success = await Enterprise.destroy({ where: { name_enterprise: name_enterprise } });
			if (success) {
				return await interaction.reply({ content: 'L\'entreprise ' + name_enterprise + ' a été supprimé avec succès', ephemeral: true });
			}
		}
		return await interaction.reply({ content: 'Échec de la suppression de l\'entreprise ' + name_enterprise, ephemeral: true });
	},
};