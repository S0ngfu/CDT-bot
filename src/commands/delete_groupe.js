const { SlashCommandBuilder } = require('@discordjs/builders');
const { Group, Product } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('delete_groupe')
		.setDescription('Supprime un groupe de produit et tout les produits dans ce groupe')
		.setDefaultPermission(false)
		.addStringOption((option) =>
			option
				.setName('nom')
				.setDescription('Nom du groupe de produit à supprimer')
				.setRequired(true),
		),
	async execute(interaction) {
		const name_group = interaction.options.getString('nom');
		const group = await Group.findOne({ attributes: ['id_group'], where: { name_group: name_group } });
		if (group) {
			await Product.destroy({ where: { id_group: group.id_group } });
			const success = await Group.destroy({ where: { id_group: group.id_group } });
			if (success) {
				return await interaction.reply({ content: 'Le groupe de produit ' + name_group + ' a été supprimé avec succès', ephemeral: true });
			}
		}
		return await interaction.reply({ content: 'Échec de la suppression du groupe de produit ' + name_group, ephemeral: true });
	},
};