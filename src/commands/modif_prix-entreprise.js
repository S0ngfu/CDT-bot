const { SlashCommandBuilder } = require('discord.js');
const { Enterprise, Product, PriceEnterprise } = require('../dbObjects.js');
const { Op } = require('sequelize');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('modif-prix_entreprise')
		.setDescription('Modifie le prix d\'un produit pour une entreprise')
		.setDMPermission(false)
		.setDefaultMemberPermissions('0')
		.addStringOption((option) =>
			option
				.setName('nom_entreprise')
				.setDescription('Nom de l\'entreprise')
				.setRequired(true)
				.setAutocomplete(true),
		)
		.addIntegerOption((option) =>
			option
				.setName('nom_produit')
				.setDescription('Nom du produit')
				.setRequired(true)
				.setAutocomplete(true),
		)
		.addIntegerOption((option) =>
			option
				.setName('prix')
				.setDescription('Nouveau prix du produit pour l\'entreprise')
				.setRequired(true),
		),
	async execute(interaction) {
		const name_enterprise = interaction.options.getString('nom_entreprise');
		const id_product = interaction.options.getInteger('nom_produit');
		const price = interaction.options.getInteger('prix');
		const enterprise = await Enterprise.findOne({ attributes: ['id_enterprise', 'name_enterprise'], where: { deleted: false, name_enterprise: { [Op.like]: `%${name_enterprise}%` } } }) ;
		const product = await Product.findOne({ attributes: ['id_product', 'name_product', 'default_price'], where: { deleted: false, id_product: id_product } });

		if (!enterprise) {
			return await interaction.reply({ content: `Aucune entreprise portant le nom ${name_enterprise} n'a été trouvé`, ephemeral: true });
		}

		if (!product) {
			return await interaction.reply({ content: 'Aucun produit avec le paramètre donné n\'a été trouvé', ephemeral: true });
		}

		if (product.default_price === price) {
			await PriceEnterprise.destroy({ where: { id_enterprise: enterprise.id_enterprise, id_product: product.id_product } });
			return await interaction.reply({ content: `Le prix par défaut du produit ${product.name_product} ($${price}) sera désormais utilisé pour l'entreprise ${enterprise.name_enterprise}`, ephemeral: true });
		}
		else {
			const price_enterprise = await PriceEnterprise.upsert({ id_enterprise: enterprise.id_enterprise, id_product: product.id_product, enterprise_price: price });
			if (price_enterprise) {
				return await interaction.reply({ content: `Le prix du produit ${product.name_product} est désormais de $${price} pour l'entreprise ${enterprise.name_enterprise}`, ephemeral: true });
			}
			else {
				return await interaction.reply({ content: `Erreur lors de la mise à jour du prix du produit ${product.name_product} pour l'entreprise ${enterprise.name_enterprise}`, ephemeral: true });
			}
		}
	},
};