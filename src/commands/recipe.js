const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Recipe, Product } = require('../dbObjects');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('recette')
		.setDescription('Gestion des recettes')
		.setDMPermission(false)
		.setDefaultMemberPermissions('0')
		.addSubcommand(subcommand =>
			subcommand
				.setName('ajouter')
				.setDescription('Permet d\'ajouter une recette')
				.addIntegerOption((option) =>
					option
						.setName('résultat_recette')
						.setDescription('Nom du produit fabriqué')
						.setRequired(true)
						.setAutocomplete(true),
				)
				.addIntegerOption((option) =>
					option
						.setName('quantité_résultat_recette')
						.setDescription('Quantité du produit fabriqué')
						.setMinValue(1)
						.setRequired(true),
				)
				.addIntegerOption((option) =>
					option
						.setName('ingrédient_1')
						.setDescription('Nom du produit fabriqué')
						.setRequired(true)
						.setAutocomplete(true),
				)
				.addIntegerOption((option) =>
					option
						.setName('quantité_ingrédient_1')
						.setDescription('Quantité du produit fabriqué')
						.setMinValue(1)
						.setRequired(true),
				)
				.addIntegerOption((option) =>
					option
						.setName('ingrédient_2')
						.setDescription('Nom du produit fabriqué')
						.setAutocomplete(true),
				)
				.addIntegerOption((option) =>
					option
						.setName('quantité_ingrédient_2')
						.setDescription('Quantité du produit fabriqué')
						.setMinValue(1),
				)
				.addIntegerOption((option) =>
					option
						.setName('ingrédient_3')
						.setDescription('Nom du produit fabriqué')
						.setAutocomplete(true),
				)
				.addIntegerOption((option) =>
					option
						.setName('quantité_ingrédient_3')
						.setDescription('Quantité du produit fabriqué')
						.setMinValue(1),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('modifier')
				.setDescription('Permet de modifier une recette')
				.addIntegerOption((option) =>
					option
						.setName('résultat_recette')
						.setDescription('Nom du produit fabriqué')
						.setRequired(true)
						.setAutocomplete(true),
				)
				.addIntegerOption((option) =>
					option
						.setName('quantité_résultat_recette')
						.setDescription('Quantité du produit fabriqué')
						.setMinValue(1)
						.setRequired(true),
				)
				.addIntegerOption((option) =>
					option
						.setName('ingrédient_1')
						.setDescription('Nom du produit fabriqué')
						.setRequired(true)
						.setAutocomplete(true),
				)
				.addIntegerOption((option) =>
					option
						.setName('quantité_ingrédient_1')
						.setDescription('Quantité du produit fabriqué')
						.setMinValue(1)
						.setRequired(true),
				)
				.addIntegerOption((option) =>
					option
						.setName('ingrédient_2')
						.setDescription('Nom du produit fabriqué')
						.setAutocomplete(true),
				)
				.addIntegerOption((option) =>
					option
						.setName('quantité_ingrédient_2')
						.setDescription('Quantité du produit fabriqué')
						.setMinValue(1),
				)
				.addIntegerOption((option) =>
					option
						.setName('ingrédient_3')
						.setDescription('Nom du produit fabriqué')
						.setAutocomplete(true),
				)
				.addIntegerOption((option) =>
					option
						.setName('quantité_ingrédient_3')
						.setDescription('Quantité du produit fabriqué')
						.setMinValue(1),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('supprimer')
				.setDescription('Permet de supprimer une recette')
				.addIntegerOption((option) =>
					option
						.setName('résultat_recette')
						.setDescription('Nom du produit fabriqué afin de supprimer sa recette')
						.setRequired(true)
						.setAutocomplete(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('afficher')
				.setDescription('Permet d\'afficher les recettes'),
		),
	async execute(interaction) {
		if (interaction.options.getSubcommand() === 'ajouter') {
			const result_recipe = interaction.options.getInteger('résultat_recette');
			const result_recipe_quantity = interaction.options.getInteger('quantité_résultat_recette');
			const first_ingredient_id = interaction.options.getInteger('ingrédient_1');
			const first_ingredient_quantity = interaction.options.getInteger('quantité_ingrédient_1');
			const second_ingredient_id = interaction.options.getInteger('ingrédient_2');
			const second_ingredient_quantity = interaction.options.getInteger('quantité_ingrédient_2');
			const third_ingredient_id = interaction.options.getInteger('ingrédient_3');
			const third_ingredient_quantity = interaction.options.getInteger('quantité_ingrédient_3');

			const existing_recipe = await Recipe.findOne({ where: { id_product_made: result_recipe } });

			if (existing_recipe) {
				return interaction.reply({ content:'Une recette pour ce produit existe déjà', ephemeral: true });
			}

			if (first_ingredient_id && !first_ingredient_quantity) {
				return interaction.reply({ content:'La quantité n\'a pas été renseigné pour le premier ingrédient', ephemeral: true });
			}

			if (second_ingredient_id && !second_ingredient_quantity) {
				return interaction.reply({ content:'La quantité n\'a pas été renseigné pour le second ingrédient', ephemeral: true });
			}

			if (third_ingredient_id && !third_ingredient_quantity) {
				return interaction.reply({ content:'La quantité n\'a pas été renseigné pour le troisième ingrédient', ephemeral: true });
			}

			await Recipe.create({
				id_product_made: result_recipe,
				quantity_product_made: result_recipe_quantity,
				id_product_ingredient_1: first_ingredient_id,
				quantity_product_ingredient_1: first_ingredient_quantity,
				id_product_ingredient_2: second_ingredient_id,
				quantity_product_ingredient_2: second_ingredient_quantity,
				id_product_ingredient_3: third_ingredient_id,
				quantity_product_ingredient_3: third_ingredient_quantity,
			});

			return interaction.reply({ content:'La recette a bien été créée', ephemeral: true });
		}
		else if (interaction.options.getSubcommand() === 'modifier') {
			const result_recipe = interaction.options.getInteger('résultat_recette');
			const result_recipe_quantity = interaction.options.getInteger('quantité_résultat_recette');
			const first_ingredient_id = interaction.options.getInteger('ingrédient_1');
			const first_ingredient_quantity = interaction.options.getInteger('quantité_ingrédient_1');
			const second_ingredient_id = interaction.options.getInteger('ingrédient_2');
			const second_ingredient_quantity = interaction.options.getInteger('quantité_ingrédient_2');
			const third_ingredient_id = interaction.options.getInteger('ingrédient_3');
			const third_ingredient_quantity = interaction.options.getInteger('quantité_ingrédient_3');

			const existing_recipe = await Recipe.findOne({ where: { id_product_made: result_recipe } });

			const product_recipe = await Product.findByPk(result_recipe);

			if (!existing_recipe) {
				return interaction.reply({ content:`Aucune recette existante trouvé pour le produit ${product_recipe.name_product}`, ephemeral: true });
			}

			if (first_ingredient_id && !first_ingredient_quantity) {
				return interaction.reply({ content:'La quantité n\'a pas été renseigné pour le premier ingrédient', ephemeral: true });
			}

			if (second_ingredient_id && !second_ingredient_quantity) {
				return interaction.reply({ content:'La quantité n\'a pas été renseigné pour le second ingrédient', ephemeral: true });
			}

			if (third_ingredient_id && !third_ingredient_quantity) {
				return interaction.reply({ content:'La quantité n\'a pas été renseigné pour le troisième ingrédient', ephemeral: true });
			}

			await existing_recipe.update({
				id_product_made: result_recipe,
				quantity_product_made: result_recipe_quantity,
				id_product_ingredient_1: first_ingredient_id,
				quantity_product_ingredient_1: first_ingredient_quantity,
				id_product_ingredient_2: second_ingredient_id,
				quantity_product_ingredient_2: second_ingredient_quantity,
				id_product_ingredient_3: third_ingredient_id,
				quantity_product_ingredient_3: third_ingredient_quantity,
			});

			return interaction.reply({ content:'La recette a bien été modifiée', ephemeral: true });
		}
		else if (interaction.options.getSubcommand() === 'supprimer') {
			const result_recipe = interaction.options.getInteger('résultat_recette');

			const existing_recipe = await Recipe.findOne({ where: { id_product_made: result_recipe } });

			if (!existing_recipe) {
				return interaction.reply({ content:'Aucune recette pour ce produit n\'a été trouvé', ephemeral: true });
			}

			await existing_recipe.destroy();

			return interaction.reply({ content:'La recette a bien été supprimé', ephemeral: true });
		}
		else if (interaction.options.getSubcommand() === 'afficher') {
			return interaction.reply({ embeds: await getRecipeEmbeds(interaction), ephemeral: true });
		}
	},
};

const getRecipeEmbeds = async (interaction) => {
	const arrayEmbed = [];
	let embed = new EmbedBuilder()
		.setTitle('Recettes')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
		.setTimestamp(new Date());

	const recipes = await Recipe.findAll({
		include: [
			{ model: Product, as: 'product_made' },
			{ model: Product, as: 'ingredient_1' },
			{ model: Product, as: 'ingredient_2' },
			{ model: Product, as: 'ingredient_3' },
		],
	});

	let i = 0;
	for (const r of recipes) {
		if (i % 25 === 24) {
			arrayEmbed.push(embed);
			embed = new EmbedBuilder()
				.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
				.setTitle('Recettes')
				.setTimestamp(new Date());
		}
		const title = `${r.quantity_product_made} ${r.product_made.name_product} ${r.product_made.emoji_product ? r.product_made.emoji_product : ''}`;
		let field = `${r.quantity_product_ingredient_1} ${r.ingredient_1.name_product} ${r.ingredient_1.emoji_product ? r.ingredient_1.emoji_product : ''}`;
		if (r.quantity_product_ingredient_2) {
			field += `\n${r.quantity_product_ingredient_2} ${r.ingredient_2.name_product} ${r.ingredient_2.emoji_product ? r.ingredient_2.emoji_product : ''}`;
		}
		if (r.quantity_product_ingredient_3) {
			field += `\n${r.quantity_product_ingredient_3} ${r.ingredient_3.name_product} ${r.ingredient_3.emoji_product ? r.ingredient_3.emoji_product : ''}`;
		}
		embed.addFields({ name: title, value: field, inline: true });
		i++;
	}

	arrayEmbed.push(embed);

	return arrayEmbed;
};