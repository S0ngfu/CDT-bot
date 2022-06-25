const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { Group, Product } = require('../dbObjects');
const Op = require('sequelize').Op;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('groupe')
		.setDescription('Gestion des groupes de produit')
		.setDefaultPermission(false)
		.addSubcommand(subcommand =>
			subcommand
				.setName('ajouter')
				.setDescription('Permet d\'ajouter un groupe')
				.addStringOption((option) =>
					option
						.setName('nom_groupe')
						.setDescription('nom du groupe')
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
						.setDescription('définit si le groupe est affiché par défaut sur la calculo')
						.setRequired(false),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('modifier')
				.setDescription('Permet de modifier un groupe')
				.addStringOption((option) =>
					option
						.setName('nom_groupe')
						.setDescription('Nom du groupe à modifier')
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName('nouveau_nom')
						.setDescription('Nouveau nom du groupe')
						.setRequired(false),
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
						.setDescription('définit si le groupe est affiché par défaut sur la calculo')
						.setRequired(false),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('supprimer')
				.setDescription('Supprime un groupe')
				.addStringOption((option) =>
					option
						.setName('nom_groupe')
						.setDescription('Nom du groupe à supprimer')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('afficher')
				.setDescription('Permet d\'afficher un ou plusieurs groupes')
				.addStringOption((option) =>
					option
						.setName('nom_groupe')
						.setDescription('Nom du groupe à afficher')
						.setRequired(false),
				),
		),
	async execute(interaction) {
		if (interaction.options.getSubcommand() === 'ajouter') {
			const name_group = interaction.options.getString('nom_groupe');
			const emoji_group = interaction.options.getString('emoji');
			const default_group = interaction.options.getBoolean('defaut');
			const emoji_custom_regex = '^<?(a)?:?(\\w{2,32}):(\\d{17,19})>?$';
			const emoji_unicode_regex = '^[\u1000-\uFFFF]+$';

			const group = await Group.findOne({ where: { name_group: name_group } });

			if (group) {
				return await interaction.reply({ content: `Un groupe portant le nom ${name_group} existe déjà`, ephemeral: true });
			}

			if (emoji_group && !emoji_group.match(emoji_custom_regex) && !emoji_group.match(emoji_unicode_regex)) {
				return await interaction.reply({ content: `L'emoji ${emoji_group} donné en paramètre est incorrect`, ephemeral: true });
			}

			const new_group = await Group.create({
				name_group: name_group,
				emoji_group: emoji_group,
				default_group: default_group !== null ? default_group : false,
			});

			if (default_group) {
				await Group.update({ default_group: false }, { where: { id_group: { [Op.ne]: new_group.id_group } } });
			}

			return await interaction.reply({
				content: 'Le groupe vient d\'être créé avec ces paramètres :\n' +
				`Nom : ${new_group.name_group}\n` +
				`Emoji : ${new_group.emoji_group ? new_group.emoji_group : 'Aucun'}\n` +
				`Groupe par défaut : ${new_group.default_group ? 'Oui' : 'Non'}\n`,
				ephemeral: true,
			});
		}
		else if (interaction.options.getSubcommand() === 'modifier') {
			const name_group = interaction.options.getString('nom_groupe');
			const emoji_group = interaction.options.getString('emoji');
			const default_group = interaction.options.getBoolean('defaut');
			const new_name_group = interaction.options.getString('nouveau_nom');
			const emoji_custom_regex = '^<?(a)?:?(\\w{2,32}):(\\d{17,19})>?$';
			const emoji_unicode_regex = '^[\u1000-\uFFFF]+$';

			const group = await Group.findOne({ where: { name_group: { [Op.like]: `%${name_group}%` } } });

			if (!group) {
				return await interaction.reply({ content: `Aucun groupe portant le nom ${name_group} n'a été trouvé`, ephemeral: true });
			}

			if (emoji_group && !emoji_group.match(emoji_custom_regex) && !emoji_group.match(emoji_unicode_regex) && emoji_group !== '0') {
				return await interaction.reply({ content: `L'emoji ${emoji_group} donné en paramètre est incorrect`, ephemeral: true });
			}

			const [updated_group] = await Group.upsert({
				id_group: group.id_group,
				name_group: new_name_group ? new_name_group : group.name_group,
				emoji_group: emoji_group ? emoji_group === '0' ? null : emoji_group : group.emoji_group,
				default_group: default_group !== null ? default_group : group.default_group,
			});

			if (default_group) {
				await Group.update({ default_group: false }, { where: { id_group: { [Op.ne]: updated_group.id_group } } });
			}

			return await interaction.reply({
				content: 'Le groupe vient d\'être mis à jour avec ces paramètres :\n' +
				`Nom : ${updated_group.name_group}\n` +
				`Emoji : ${updated_group.emoji_group ? updated_group.emoji_group : 'Aucun'}\n` +
				`Groupe par défaut : ${updated_group.default_group ? 'Oui' : 'Non'}\n`,
				ephemeral: true,
			});
		}
		else if (interaction.options.getSubcommand() === 'supprimer') {
			const name_group = interaction.options.getString('nom_groupe');

			const group = await Group.findOne({ where: { name_group: { [Op.like]: `%${name_group}%` } } });

			if (!group) {
				return await interaction.reply({ content: `Aucun groupe portant le nom ${name_group} n'a été trouvé`, ephemeral: true });
			}

			await Product.update({ id_group: null }, { where: { id_group: group.id_group } });
			await Group.destroy({ where: { name_group: name_group } });

			return await interaction.reply({
				content: `Le groupe ${group.name_group} vient d'être supprimé`,
				ephemeral: true,
			});
		}
		else if (interaction.options.getSubcommand() === 'afficher') {
			const name_group = interaction.options.getString('nom_groupe');

			const group = name_group ? await Group.findOne({ where: { name_group: { [Op.like]: `%${name_group}%` } } }) : null;

			if (name_group && !group) {
				return await interaction.reply({ content: `Aucun groupe portant le nom ${name_group} n'a été trouvé`, ephemeral: true });
			}

			if (group) {
				return await interaction.reply({ embeds: await getGroupEmbed(interaction, group), ephemeral: true });
			}

			const groups = await Group.findAll({ order: [['name_group', 'ASC']] });

			return await interaction.reply({ embeds: await getGroupEmbed(interaction, groups), ephemeral: true });
		}
	},
};

const getGroupEmbed = async (interaction, groups) => {
	if (groups.length) {
		const arrayEmbed = [];
		let embed = new MessageEmbed()
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
			.setTitle('Groupes')
			.setColor('#18913E')
			.setTimestamp(new Date());
		for (const [i, g] of groups.entries()) {
			const title = g.emoji_group ? g.name_group + ' ' + g.emoji_group : g.name_group;
			const field = `Groupe par défaut : ${g.default_group ? 'Oui' : 'Non'}`;

			embed.addField(title, field, true);

			if (i % 25 === 24) {
				arrayEmbed.push(embed);
				embed = new MessageEmbed()
					.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
					.setTitle('Produits')
					.setColor('#18913E')
					.setTimestamp(new Date());
			}
		}

		if (groups.length % 25 != 0) {
			arrayEmbed.push(embed);
		}

		return arrayEmbed;
	}
	else {
		const embed = new MessageEmbed()
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
			.setTitle('Groupe')
			.setColor('#18913E')
			.setTimestamp(new Date());

		const title = groups.emoji_group ? groups.name_group + ' ' + groups.emoji_group : groups.name_group;
		const field = `Groupe par défaut : ${groups.default_group ? 'Oui' : 'Non'}`;

		embed.addField(title, field, true);

		return [embed];
	}
};