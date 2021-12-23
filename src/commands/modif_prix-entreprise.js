const { SlashCommandBuilder } = require('@discordjs/builders');
const { Enterprise, Product, PriceEnterprise } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('modif-prix_entreprise')
		.setDescription('Modifie le prix d\'un produit pour une entreprise')
		.addStringOption((option) =>
			option
				.setName('nom_entreprise')
				.setDescription('Nom de l\'entreprise')
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName('nom_produit')
				.setDescription('Nom du produit')
				.setRequired(true),
		)
		.addIntegerOption((option) =>
			option
				.setName('prix')
				.setDescription('Nouveau prix du produit pour l\'entreprise')
				.setRequired(true),
		),
	async execute(interaction) {
		const name_enterprise = interaction.options.getString('nom_entreprise');
		const name_product = interaction.options.getString('nom_produit');
		const price = interaction.options.getInteger('prix');
		const enterprise = await Enterprise.findOne({ attributes: ['id_enterprise'], where: { name_enterprise: name_enterprise } });
		const product = await Product.findOne({ attributes: ['id_product', 'default_price'], where: { name_product: name_product } });

		if (!enterprise) {
			return interaction.reply({ content: 'Aucune entreprise avec le nom ' + name_enterprise + ' existe', ephemeral: true });
		}

		if (!product) {
			return interaction.reply({ content: 'Aucun produit avec le nom ' + name_product + ' existe', ephemeral: true });
		}

		if (product.default_price === price) {
			await PriceEnterprise.destroy({ where: { id_enterprise: enterprise.id_enterprise, id_product: product.id_product } });
			interaction.reply({ content: 'Le prix par défaut du produit ' + name_product + ' de $' + price + ' sera désormais utilisé pour l\'entreprise ' + name_enterprise, ephemeral: true });
		}
		else {
			const price_enterprise = await PriceEnterprise.upsert({ id_enterprise: enterprise.id_enterprise, id_product: product.id_product, enterprise_price: price });
			if (price_enterprise) {
				interaction.reply({ content: 'Le prix du produit ' + name_product + ' est désormais de $' + price + ' pour l\'entreprise ' + name_enterprise, ephemeral: true });
			}
			else {
				interaction.reply({ content: 'Erreur lors de la mise à jour du prix du produit pour l\'entreprise', ephemeral: true });
			}
		}
	},
};