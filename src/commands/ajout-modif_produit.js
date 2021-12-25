const { SlashCommandBuilder } = require('@discordjs/builders');
const { Product, Group } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ajout-modif_produit')
		.setDescription('Permet l\'ajout et la modification d\'un produit')
		.setDefaultPermission(false)
		.addStringOption((option) =>
			option
				.setName('nom')
				.setDescription('nom du produit à ajouter ou modifier')
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName('emoji')
				.setDescription('emoji du produit')
				.setRequired(false),
		)
		.addBooleanOption((option) =>
			option
				.setName('disponibilite')
				.setDescription('définit si le produit est utilisable ou non')
				.setRequired(false),
		)
		.addIntegerOption((option) =>
			option
				.setName('prix')
				.setDescription('prix par défaut')
				.setRequired(false),
		)
		.addStringOption((option) =>
			option
				.setName('nom_groupe')
				.setDescription('nom du groupe auquel le produit sera rattaché')
				.setRequired(false),
		)
		.addStringOption((option) =>
			option
				.setName('nouveau_nom')
				.setDescription('nouveau nom pour le produit en cas de mise à jour')
				.setRequired(false),
		),
	async execute(interaction) {
		const name_product = interaction.options.getString('nom').trim();
		const emoji_product = interaction.options.getString('emoji');
		const default_price = interaction.options.getInteger('prix');
		const is_available = interaction.options.getBoolean('disponibilite');
		const name_group = interaction.options.getString('nom_groupe');
		const new_name_product = interaction.options.getString('nouveau_nom');

		const product = await Product.findOne({ where: { name_product: name_product } });

		const group = name_group ? await Group.findOne({ attributes: ['id_group'], where: { name_group: name_group } }) : null;

		if (product) {
			if (group) {
				const [updated_product] = await Product.upsert({
					id_product: product.id_product,
					name_product: new_name_product ? new_name_product : name_product,
					emoji_product: emoji_product ? emoji_product : product.emoji_product,
					default_price: default_price ? default_price : product.default_price,
					is_available: is_available !== null ? is_available : product.is_available,
					id_group: group.id_group,
				});
				return await interaction.reply({ content: 'Le produit a été mis à jour avec ces paramètres.\nNom : ' + updated_product.name_product
					+ '\nEmoji : ' + updated_product.emoji_product
					+ '\nPrix par défaut : $' + updated_product.default_price
					+ '\nDisponible : ' + (updated_product.is_available ? 'Oui' : 'Non')
					+ '\nLe groupe a été modifié',
				ephemeral: true });
			}
			else {
				const [updated_product] = await Product.upsert({
					id_product: product.id_product,
					name_product: new_name_product ? new_name_product : name_product,
					emoji_product: emoji_product ? emoji_product : product.emoji_product,
					default_price: default_price ? default_price : product.default_price,
					is_available: is_available !== null ? is_available : product.is_available,
				});
				return await interaction.reply({ content: 'Le produit a été mis à jour avec ces paramètres.\nNom : ' + updated_product.name_product
					+ '\nEmoji : ' + updated_product.emoji_product
					+ '\nPrix par défaut : $' + updated_product.default_price
					+ '\nDisponible : ' + (updated_product.is_available ? 'Oui' : 'Non'),
				ephemeral: true });
			}
		}
		else if (group) {
			if (default_price) {
				const [new_product] = await Product.upsert({
					name_product: name_product,
					emoji_product: emoji_product ? emoji_product : null,
					default_price: default_price,
					is_available: is_available !== null ? is_available : true,
					id_group: group.id_group,
				});
				return await interaction.reply({ content: 'Le produit a été mis à jour avec ces paramètres.\nNom : ' + new_product.name_product
					+ '\nEmoji : ' + new_product.emoji_product
					+ '\nPrix par défaut : $' + new_product.default_price
					+ '\nDisponible : ' + (new_product.is_available ? 'Oui' : 'Non'),
				ephemeral: true });
			}
			else {
				return await interaction.reply({ content: 'Le prix par défaut est requis afin ajouter un produit', ephemeral: true });
			}
		}
		else {
			return await interaction.reply({ content: 'Un groupe est requis afin ajouter un produit', ephemeral: true });
		}
	},
};