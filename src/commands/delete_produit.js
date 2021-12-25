const { SlashCommandBuilder } = require('@discordjs/builders');
const { Product, PriceEnterprise } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('delete_produit')
		.setDescription('Supprime un produit')
		.setDefaultPermission(false)
		.addStringOption((option) =>
			option
				.setName('nom')
				.setDescription('Nom du produit à supprimer')
				.setRequired(true),
		),
	async execute(interaction) {
		const name_product = interaction.options.getString('nom').trim();
		const product = await Product.findOne({ attributes: ['id_product'], where: { name_product: name_product } });
		if (product) {
			await PriceEnterprise.destroy({ where: { id_product: product.id_product } });
			const success = await Product.destroy({ where: { id_product: product.id_product } });
			if (success) {
				return await interaction.reply({ content: 'Le produit ' + name_product + ' a été supprimé avec succès', ephemeral: true });
			}
		}
		return await interaction.reply({ content: 'Échec de la suppression du produit ' + name_product, ephemeral: true });
	},
};