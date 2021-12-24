const Op = require('sequelize').Op;
const { SlashCommandBuilder } = require('@discordjs/builders');
const { Group } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ajout-modif_groupe')
		.setDescription('Permet l\'ajout et la modification d\'un groupe')
		.setDefaultPermission(false)
		.addStringOption((option) =>
			option
				.setName('nom')
				.setDescription('nom du groupe à ajouter ou modifier')
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName('emoji')
				.setDescription('emoji du groupe')
				.setRequired(false),
		)
		.addBooleanOption((option) =>
			option
				.setName('defaut')
				.setDescription('définit le groupe affiché par défaut')
				.setRequired(false),
		)
		.addStringOption((option) =>
			option
				.setName('nouveau_nom')
				.setDescription('nouveau nom pour le groupe en cas de mise à jour')
				.setRequired(false),
		),
	async execute(interaction) {
		const name_group = interaction.options.getString('nom');
		const emoji_group = interaction.options.getString('emoji');
		const default_group = interaction.options.getBoolean('defaut');
		const new_name_group = interaction.options.getString('nouveau_nom');

		const group = await Group.findOne({ where: { name_group: name_group } });

		if (group) {
			const [update_group] = await Group.upsert({
				id_group: group.id_group,
				name_group: new_name_group ? new_name_group : name_group,
				emoji_group: emoji_group ? emoji_group : group.emoji_group,
				default_group: default_group !== null ? default_group : group.default_group,
			});

			if (default_group) {
				await Group.update({ default_group: false }, { where: { id_group: { [Op.ne]: update_group.id_group } } });
			}

			return await interaction.reply({ content: 'Le groupe a été mis à jour avec ces paramètres.'
				+ '\nNom : ' + update_group.name_group
				+ '\nEmoji : ' + update_group.emoji_group
				+ '\nAffiché par défaut : ' + (update_group.default_group ? 'Oui' : 'Non'),
			ephemeral: true });
		}
		else {
			const [new_group] = await Group.upsert({
				name_group: name_group,
				emoji_group: emoji_group ? emoji_group : null,
				default_group: default_group !== null ? default_group : false,
			});

			if (default_group) {
				await Group.update({ default_group: false }, { where: { id_group: { [Op.ne]: new_group.id_group } } });
			}

			return await interaction.reply({ content: 'Le groupe a été mis à jour avec ces paramètres.'
				+ '\nNom : ' + new_group.name_group
				+ '\nEmoji : ' + new_group.emoji_group
				+ '\nAffiché par défaut : ' + (new_group.default_group ? 'Oui' : 'Non'),
			ephemeral: true });
		}
	},
};