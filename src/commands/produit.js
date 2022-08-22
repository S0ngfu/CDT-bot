const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, MessageManager, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Product, Group, Stock } = require('../dbObjects');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('produit')
		.setDescription('Gestion des produits')
		.setDMPermission(false)
		.setDefaultMemberPermissions('0')
		.addSubcommand(subcommand =>
			subcommand
				.setName('ajouter')
				.setDescription('Permet d\'ajouter un produit')
				.addStringOption((option) =>
					option
						.setName('nom_produit')
						.setDescription('nom du produit')
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
				.addIntegerOption((option) =>
					option
						.setName('nom_groupe')
						.setDescription('nom du groupe auquel le produit sera rattaché')
						.setAutocomplete(true)
						.setRequired(false),
				)
				.addIntegerOption((option) =>
					option
						.setName('quantite_voulue')
						.setDescription('Quantité désirée dans le stock')
						.setRequired(false)
						.setMinValue(0),
				).addBooleanOption((option) =>
					option
						.setName('check_recette_calculo')
						.setDescription('Permet d\'indiquer si l\'on souhaite vérifier la recette du produit après l\'envoi de la calculo')
						.setRequired(false),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('modifier')
				.setDescription('Permet de modifier un produit')
				.addIntegerOption((option) =>
					option
						.setName('nom_produit')
						.setDescription('nom du produit à modifier')
						.setRequired(true)
						.setAutocomplete(true),
				)
				.addStringOption((option) =>
					option
						.setName('nouveau_nom')
						.setDescription('nouveau nom du produit')
						.setRequired(false),
				)
				.addStringOption((option) =>
					option
						.setName('emoji')
						.setDescription('emoji du produit (mettre 0 pour retirer l\'emoji)')
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
				.addIntegerOption((option) =>
					option
						.setName('nom_groupe')
						.setDescription('nom du groupe auquel le produit sera rattaché (mettre 0 pour retirer le groupe il est rattaché)')
						.setAutocomplete(true)
						.setRequired(false),
				)
				.addIntegerOption((option) =>
					option
						.setName('quantite_voulue')
						.setDescription('Quantité désirée dans le stock')
						.setRequired(false)
						.setMinValue(0),
				)
				.addBooleanOption((option) =>
					option
						.setName('check_recette_calculo')
						.setDescription('Permet d\'indiquer si l\'on souhaite vérifier la recette du produit après l\'envoi de la calculo')
						.setRequired(false),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('supprimer')
				.setDescription('Supprime un produit')
				.addIntegerOption((option) =>
					option
						.setName('nom_produit')
						.setDescription('Nom du produit à supprimer')
						.setRequired(true)
						.setAutocomplete(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('afficher')
				.setDescription('Permet d\'afficher un ou plusieurs produits')
				.addIntegerOption((option) =>
					option
						.setName('nom_produit')
						.setDescription('Nom du produit à afficher')
						.setRequired(false)
						.setAutocomplete(true),
				)
				.addIntegerOption((option) =>
					option
						.setName('nom_groupe')
						.setDescription('Afficher les produits de ce groupe uniquement')
						.setRequired(false)
						.setAutocomplete(true),
				),
		),
	async execute(interaction) {
		if (interaction.options.getSubcommand() === 'ajouter') {
			const name_product = interaction.options.getString('nom_produit');
			const emoji_product = interaction.options.getString('emoji');
			const default_price = interaction.options.getInteger('prix');
			const id_group = interaction.options.getInteger('nom_groupe');
			const is_available = interaction.options.getBoolean('disponibilite');
			const qt_wanted = interaction.options.getInteger('quantite_voulue');
			const check_recette_calculo = interaction.options.getBoolean('check_recette_calculo');
			const emoji_custom_regex = '^<?(a)?:?(\\w{2,32}):(\\d{17,19})>?$';
			const emoji_unicode_regex = '^[\u1000-\uFFFF]+$';

			const product = await Product.findOne({ where: { name_product: name_product, deleted: false } });

			if (product) {
				return await interaction.reply({ content: `Un produit portant le nom ${name_product} existe déjà`, ephemeral: true });
			}

			if (emoji_product && !emoji_product.match(emoji_custom_regex) && !emoji_product.match(emoji_unicode_regex)) {
				return await interaction.reply({ content: `L'emoji ${emoji_product} donné en paramètre est incorrect`, ephemeral: true });
			}

			const group = id_group ? await Group.findOne({ attributes: ['id_group', 'name_group'], where: { id_group: id_group } }) : null;

			if (id_group && !group) {
				return await interaction.reply({ content: 'Aucun groupe n\'a été trouvé', ephemeral: true });
			}

			const new_product = await Product.create({
				name_product: name_product,
				emoji_product: emoji_product,
				default_price: default_price ? default_price : 0,
				is_available: is_available !== null ? is_available : true,
				id_group: group ? group.id_group : null,
				calculo_check: check_recette_calculo !== null ? check_recette_calculo : true,
				qt_wanted: qt_wanted,
			});

			return await interaction.reply({
				content: 'Le produit vient d\'être créé avec ces paramètres :\n' +
				`Nom : ${new_product.name_product}\n` +
				`Emoji : ${new_product.emoji_product ? new_product.emoji_product : 'Aucun'}\n` +
				`Prix par défaut : $${new_product.default_price}\n` +
				`Disponible : ${new_product.is_available ? 'Oui' : 'Non'}\n` +
				`Groupe : ${group ? group.name_group : 'Non rattaché'}\n` +
				`Check après calculo : ${new_product.calculo_check ? 'Oui' : 'Non'}\n` +
				`Quantité voulue : ${new_product.qt_wanted ? new_product.qt_wanted : '0'}`,
				ephemeral: true,
			});
		}
		else if (interaction.options.getSubcommand() === 'modifier') {
			const id_product = interaction.options.getInteger('nom_produit');
			const emoji_product = interaction.options.getString('emoji');
			const default_price = interaction.options.getInteger('prix');
			const id_group = interaction.options.getInteger('nom_groupe');
			const is_available = interaction.options.getBoolean('disponibilite');
			const qt_wanted = interaction.options.getInteger('quantite_voulue');
			const check_recette_calculo = interaction.options.getBoolean('check_recette_calculo');
			const new_name_product = interaction.options.getString('nouveau_nom');
			const emoji_custom_regex = '^<?(a)?:?(\\w{2,32}):(\\d{17,19})>?$';
			const emoji_unicode_regex = '^[\u1000-\uFFFF]+$';

			const product = await Product.findOne({ where: { id_product: id_product, deleted: false } });

			if (!product) {
				return await interaction.reply({ content: 'Aucun produit n\'a été trouvé', ephemeral: true });
			}

			if (emoji_product && !emoji_product.match(emoji_custom_regex) && !emoji_product.match(emoji_unicode_regex) && emoji_product !== '0') {
				return await interaction.reply({ content: `L'emoji ${emoji_product} donné en paramètre est incorrect`, ephemeral: true });
			}

			const group = id_group ? await Group.findOne({ attributes: ['id_group'], where: { id_group: id_group } }) : null;

			if (id_group && !group) {
				return await interaction.reply({ content: 'Aucun groupe n\'a été trouvé', ephemeral: true });
			}

			const [updated_product] = await Product.upsert({
				id_product: product.id_product,
				name_product: new_name_product ? new_name_product : product.name_product,
				emoji_product: emoji_product ? emoji_product === '0' ? null : emoji_product : product.emoji_product,
				default_price: default_price === 0 ? 0 : default_price ? default_price : product.default_price,
				is_available: is_available !== null ? is_available : product.is_available,
				id_group: group ? group.id_group : product.id_group,
				calculo_check: check_recette_calculo !== null ? check_recette_calculo : product.calculo_check,
				qt_wanted: qt_wanted === 0 ? 0 : qt_wanted ? qt_wanted : product.qt_wanted,
				id_message: product.id_message,
			});

			const product_group = await Group.findOne({ attributes: ['id_group', 'name_group'], where: { id_group: updated_product.id_group } });

			const stock = await Stock.findOne({
				where: { id_message: updated_product.id_message },
			});

			if (stock) {
				const messageManager = new MessageManager(await interaction.client.channels.fetch(stock.id_channel));
				const stock_message = await messageManager.fetch({ message: stock.id_message });
				await stock_message.edit({
					embeds: [await getStockEmbed(stock)],
					components: await getStockButtons(stock),
				});
			}

			return await interaction.reply({
				content: 'Le produit vient d\'être mis à jour avec ces paramètres :\n' +
				`Nom : ${updated_product.name_product}\n` +
				`Emoji : ${updated_product.emoji_product ? updated_product.emoji_product : 'Aucun' }\n` +
				`Prix par défaut : $${updated_product.default_price}\n` +
				`Disponible : ${updated_product.is_available ? 'Oui' : 'Non'}\n` +
				`Groupe : ${product_group ? product_group.name_group : 'Non rattaché'}\n` +
				`Check après calculo : ${updated_product.calculo_check ? 'Oui' : 'Non'}\n` +
				`Quantité voulue : ${updated_product.qt_wanted ? updated_product.qt_wanted : '0'}`,
				ephemeral: true,
			});
		}
		else if (interaction.options.getSubcommand() === 'supprimer') {
			const id_product = interaction.options.getInteger('nom_produit');

			const product = await Product.findByPk(id_product);

			if (!product) {
				return await interaction.reply({ content: 'Aucun produit n\'a été trouvé', ephemeral: true });
			}

			const stock = await Stock.findOne({
				where: { id_message: product.id_message },
			});

			await product.update({ deleted: true, id_message: null, id_group: null });

			if (stock) {
				const messageManager = new MessageManager(await interaction.client.channels.fetch(stock.id_channel));
				const stock_message = await messageManager.fetch({ message: stock.id_message });
				await stock_message.edit({
					embeds: [await getStockEmbed(stock)],
					components: await getStockButtons(stock),
				});
			}

			return await interaction.reply({
				content: `Le produit ${product.name_product} vient d'être supprimé`,
				ephemeral: true,
			});
		}
		else if (interaction.options.getSubcommand() === 'afficher') {
			const id_product = interaction.options.getInteger('nom_produit');
			const id_group = interaction.options.getInteger('nom_groupe');

			const product = id_product ? await Product.findOne({ where: { deleted: false, id_product: id_product } }) : null;
			const group = id_group ? await Group.findOne({ where: { id_group: id_group } }) : null;

			if (id_product && !product) {
				return await interaction.reply({ content: 'Aucun produit n\'a été trouvé', ephemeral: true });
			}

			if (id_group && !group) {
				return await interaction.reply({ content: 'Aucun groupe n\'a été trouvé', ephemeral: true });
			}

			if (product) {
				return await interaction.reply({ embeds: await getProductEmbed(interaction, product), ephemeral: true });
			}

			if (group) {
				const products = await Product.findAll({ where: { id_group: group.id_group, deleted: false }, order: [['id_group', 'ASC'], ['name_product', 'ASC']] });
				return await interaction.reply({ embeds: await getProductEmbed(interaction, products), ephemeral: true });
			}

			const products = await Product.findAll({ where: { deleted: false }, order: [['id_group', 'ASC'], ['name_product', 'ASC']] });

			const embeds = await getProductEmbed(interaction, products);
			await interaction.reply({ content: 'Voici la liste des produits', ephemeral: true });
			for (const embed of embeds) {
				await interaction.followUp({ embeds: [embed], ephemeral: true });
			}
		}
	},
};

const getStockEmbed = async (stock = null) => {
	const embed = new EmbedBuilder()
		.setTitle('Stocks')
		.setColor(stock ? stock.colour_stock : '000000')
		.setTimestamp(new Date());

	if (stock) {
		const products = await stock.getProducts({ order: [['order', 'ASC'], ['id_group', 'ASC'], ['name_product', 'ASC']] });
		for (const p of products) {
			const title = p.emoji_product ? (p.emoji_product + ' ' + p.name_product) : p.name_product;
			let field = `${p.qt || 0}`;
			if (p.qt_wanted && p.qt_wanted !== 0) {
				field = (p.qt >= p.qt_wanted ? '✅' : '❌') + ' ' + (p.qt || 0) + ' / ' + (p.qt_wanted || 0);
			}
			embed.addFields({ name: title, value: field, inline: true });
		}
	}

	return embed;
};

const getStockButtons = async (stock = null) => {
	if (stock) {
		const products = await stock.getProducts({ order: [['order', 'ASC'], ['id_group', 'ASC'], ['name_product', 'ASC']] });
		if (products && products.length > 0) {
			const formatedProducts = products.map(p => {
				return new ButtonBuilder({ customId: 'stock_' + p.id_product.toString(), label: p.name_product, emoji: p.emoji_product, style: ButtonStyle.Secondary });
			});
			if (formatedProducts.length <= 5) {
				return [new ActionRowBuilder().addComponents(...formatedProducts)];
			}
			if (formatedProducts.length <= 10) {
				return [
					new ActionRowBuilder().addComponents(...formatedProducts.slice(0, 5)),
					new ActionRowBuilder().addComponents(...formatedProducts.slice(5)),
				];
			}
			if (formatedProducts.length <= 15) {
				return [
					new ActionRowBuilder().addComponents(...formatedProducts.slice(0, 5)),
					new ActionRowBuilder().addComponents(...formatedProducts.slice(5, 10)),
					new ActionRowBuilder().addComponents(...formatedProducts.slice(10)),
				];
			}
			if (formatedProducts.length <= 20) {
				return [
					new ActionRowBuilder().addComponents(...formatedProducts.slice(0, 5)),
					new ActionRowBuilder().addComponents(...formatedProducts.slice(5, 10)),
					new ActionRowBuilder().addComponents(...formatedProducts.slice(10, 15)),
					new ActionRowBuilder().addComponents(...formatedProducts.slice(15)),
				];
			}
			if (formatedProducts.length <= 25) {
				return [
					new ActionRowBuilder().addComponents(...formatedProducts.slice(0, 5)),
					new ActionRowBuilder().addComponents(...formatedProducts.slice(5, 10)),
					new ActionRowBuilder().addComponents(...formatedProducts.slice(10, 15)),
					new ActionRowBuilder().addComponents(...formatedProducts.slice(15, 20)),
					new ActionRowBuilder().addComponents(...formatedProducts.slice(20)),
				];
			}
		}
	}

	return [];
};

const getProductEmbed = async (interaction, products) => {
	if (products.length) {
		const arrayEmbed = [];
		let embed = new EmbedBuilder()
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
			.setTitle('Produits')
			.setColor('#18913E')
			.setTimestamp(new Date());
		for (const [i, p] of products.entries()) {
			const product_group = await Group.findOne({ attributes: ['id_group', 'name_group'], where: { id_group: p.id_group } });

			const title = p.emoji_product ? p.name_product + ' ' + p.emoji_product : p.name_product;
			const field = `Prix par défaut : $${p.default_price.toLocaleString('en')}\n` +
				`Disponible : ${p.is_available ? 'Oui' : 'Non'}\n` +
				`Groupe : ${product_group ? product_group.name_group : 'Non rattaché'}\n` +
				`Check après calculo : ${p.calculo_check ? 'Oui' : 'Non'}\n` +
				`Quantité voulue : ${p.qt_wanted ? p.qt_wanted : '0'}`;

			embed.addFields({ name: title, value: field, inline: true });

			if (i % 25 === 24) {
				arrayEmbed.push(embed);
				embed = new EmbedBuilder()
					.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
					.setTitle('Produits')
					.setColor('#18913E')
					.setTimestamp(new Date());
			}
		}

		if (products.length % 25 !== 0) {
			arrayEmbed.push(embed);
		}

		return arrayEmbed;
	}
	else {
		const embed = new EmbedBuilder()
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
			.setTitle('Produit')
			.setColor('#18913E')
			.setTimestamp(new Date());

		const product_group = await Group.findOne({ attributes: ['id_group', 'name_group'], where: { id_group: products.id_group } });

		const title = products.emoji_product ? products.name_product + ' ' + products.emoji_product : products.name_product;
		const field = `Prix par défaut : $${products.default_price.toLocaleString('en')}\n` +
			`Disponible : ${products.is_available ? 'Oui' : 'Non'}\n` +
			`Groupe : ${product_group ? product_group.name_group : 'Non rattaché'}\n` +
			`Quantité voulue : ${products.qt_wanted ? products.qt_wanted : '0'}`;

		embed.addFields({ name: title, value: field, inline: true });

		return [embed];
	}
};