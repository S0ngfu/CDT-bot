const { SlashCommandBuilder } = require('@discordjs/builders');
const { Enterprise } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ajout-modif_entreprise')
		.setDescription('Permet l\'ajout et la modification d\'une entreprise')
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
		.addStringOption((option) =>
			option
				.setName('couleur')
				.setDescription('Couleur de l\'entreprise (sous format hexadécimal)')
				.setRequired(false),
		)
		.addStringOption((option) =>
			option
				.setName('nouveau_nom')
				.setDescription('nouveau nom pour le produit en cas de mise à jour')
				.setRequired(false),
		),
	async execute(interaction) {
		const name_enterprise = interaction.options.getString('nom');
		const emoji_enterprise = interaction.options.getString('emoji');
		const color_enterprise = interaction.options.getString('couleur') ? interaction.options.getString('couleur').trim() : null;
		const new_name_enterprise = interaction.options.getString('nouveau_nom');
		const hexa_regex = '^[A-Fa-f0-9]{6}$';

		const enterprise = await Enterprise.findOne({ where: { name_enterprise: name_enterprise } });

		if (color_enterprise && color_enterprise.match(hexa_regex) === null) {
			return await interaction.reply({ content: 'La couleur ' + color_enterprise + ' donné en paramètre est incorrecte.', ephemeral: true });
		}

		if (enterprise) {
			const [updated_enterprise] = await Enterprise.upsert({
				id_enterprise: enterprise.id_enterprise,
				name_enterprise: new_name_enterprise ? new_name_enterprise : name_enterprise,
				emoji_enterprise: emoji_enterprise ? emoji_enterprise : enterprise.emoji_enterprise,
				color_enterprise: color_enterprise ? color_enterprise : enterprise.color_enterprise,
			});
			return await interaction.reply({ content: 'L\'entreprise a été mise à jour avec ces paramètres.'
					+ '\nNom : ' + updated_enterprise.name_enterprise
					+ '\nEmoji : ' + updated_enterprise.emoji_enterprise
					+ '\nCouleur : ' + updated_enterprise.color_enterprise,
			ephemeral: true });
		}
		else {
			const [new_enterprise] = await Enterprise.upsert({
				name_enterprise: new_name_enterprise ? new_name_enterprise : name_enterprise,
				emoji_enterprise: emoji_enterprise ? emoji_enterprise : enterprise.emoji_enterprise,
				color_enterprise: color_enterprise ? color_enterprise : enterprise.color_enterprise,
			});
			return await interaction.reply({ content: 'L\'entreprise a été mise à jour avec ces paramètres.'
					+ '\nNom : ' + new_enterprise.name_enterprise
					+ '\nEmoji : ' + new_enterprise.emoji_enterprise
					+ '\nCouleur : ' + new_enterprise.color_enterprise,
			ephemeral: true });
		}
	},
};