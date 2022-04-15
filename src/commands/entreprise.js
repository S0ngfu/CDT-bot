const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageManager } = require('discord.js');
const { Enterprise, Tab } = require('../dbObjects');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const dotenv = require('dotenv');

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const tabCommandId = process.env.COMMAND_TAB_ID;
const factureCommandId = process.env.COMMAND_FACTURE_ID;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('entreprise')
		.setDescription('Gestion des entreprises')
		.setDefaultPermission(false)
		.addSubcommand(subcommand =>
			subcommand
				.setName('ajouter')
				.setDescription('Permet d\'ajouter une entreprise')
				.addStringOption((option) =>
					option
						.setName('nom')
						.setDescription('nom de l\'entreprise')
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName('emoji')
						.setDescription('emoji de l\'entreprise (mettre 0 pour retirer l\'emoji)')
						.setRequired(false),
				)
				.addStringOption((option) =>
					option
						.setName('couleur')
						.setDescription('Couleur de l\'entreprise (sous format hexadécimal)')
						.setRequired(false),
				)
				.addIntegerOption((option) =>
					option
						.setName('facture_max')
						.setDescription('Facture max lors d\'une ardoise')
						.setRequired(false)
						.setMinValue(0),
				)
				.addStringOption((option) =>
					option
						.setName('info')
						.setDescription('Information à afficher sur l\'ardoise')
						.setRequired(false),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('modifier')
				.setDescription('Permet de modifier une entreprise')
				.addStringOption((option) =>
					option
						.setName('nom_actuel')
						.setDescription('Nom de l\'entreprise à modifier')
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName('nouveau_nom')
						.setDescription('Nouveau nom de l\'entreprise')
						.setRequired(false),
				)
				.addStringOption((option) =>
					option
						.setName('emoji')
						.setDescription('Emoji de l\'entreprise (mettre 0 pour retirer l\'emoji)')
						.setRequired(false),
				)
				.addStringOption((option) =>
					option
						.setName('couleur')
						.setDescription('Couleur de l\'entreprise (sous format hexadécimal)')
						.setRequired(false),
				)
				.addIntegerOption((option) =>
					option
						.setName('facture_max')
						.setDescription('Facture max lors d\'une ardoise')
						.setRequired(false)
						.setMinValue(0),
				)
				.addStringOption((option) =>
					option
						.setName('info')
						.setDescription('Information à afficher sur l\'ardoise (mettre 0 pour retirer l\'info)')
						.setRequired(false),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('supprimer')
				.setDescription('Supprime une entreprise')
				.addStringOption((option) =>
					option
						.setName('nom')
						.setDescription('Nom de l\'entreprise à supprimer')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('afficher')
				.setDescription('Permet d\'afficher une ou plusieurs entreprises')
				.addStringOption((option) =>
					option
						.setName('nom')
						.setDescription('Nom de l\'entreprise à afficher')
						.setRequired(false),
				),
		),
	async execute(interaction) {
		if (interaction.options.getSubcommand() === 'ajouter') {
			const name_enterprise = interaction.options.getString('nom');
			const emoji_enterprise = interaction.options.getString('emoji');
			const color_enterprise = interaction.options.getString('couleur');
			const facture_max_ardoise = interaction.options.getInteger('facture_max');
			const info_ardoise = interaction.options.getString('info');
			const hexa_regex = '^[A-Fa-f0-9]{6}$';
			const emoji_custom_regex = '^<?(a)?:?(\\w{2,32}):(\\d{17,19})>?$';
			const emoji_unicode_regex = '^[\u0000-\uFFFF]+$';

			const enterprise = await Enterprise.findOne({ where: { name_enterprise: name_enterprise } });

			if (enterprise) {
				return await interaction.reply({ content: `Une entreprise portant le nom ${name_enterprise} existe déjà`, ephemeral: true });
			}

			if (color_enterprise && color_enterprise.match(hexa_regex) === null) {
				return await interaction.reply({ content: 'La couleur ' + color_enterprise + ' donné en paramètre est incorrecte.', ephemeral: true });
			}

			if (emoji_enterprise && !emoji_enterprise.match(emoji_custom_regex) && !emoji_enterprise.match(emoji_unicode_regex)) {
				return await interaction.reply({ content: `L'emoji ${emoji_enterprise} donné en paramètre est incorrect`, ephemeral: true });
			}

			const new_enterprise = await Enterprise.create({
				name_enterprise: name_enterprise,
				emoji_enterprise: emoji_enterprise,
				color_enterprise: color_enterprise ? color_enterprise : '000000',
				facture_max_ardoise: facture_max_ardoise ? facture_max_ardoise : 0,
				info_ardoise: info_ardoise,
			});

			// Update command to add the enterprise in the choices
			await updateCommands();

			return await interaction.reply({
				content: 'L\'entreprise vient d\'être créé avec ces paramètres :\n' +
				`Nom : ${new_enterprise.name_enterprise}\n` +
				`Emoji : ${new_enterprise.emoji_enterprise ? new_enterprise.emoji_enterprise : 'Aucun'}\n` +
				`Couleur : ${new_enterprise.color_enterprise}\n` +
				`Facture max sur l'ardoise : $${new_enterprise.facture_max_ardoise}\n` +
				`Information sur l'ardoise : ${new_enterprise.info_ardoise ? new_enterprise.info_ardoise : 'Aucune'}`,
				ephemeral: true,
			});
		}
		else if (interaction.options.getSubcommand() === 'modifier') {
			const name_enterprise = interaction.options.getString('nom_actuel');
			const emoji_enterprise = interaction.options.getString('emoji');
			const color_enterprise = interaction.options.getString('couleur');
			const facture_max_ardoise = interaction.options.getInteger('facture_max');
			const info_ardoise = interaction.options.getString('info');
			const new_name_enterprise = interaction.options.getString('nouveau_nom');
			const hexa_regex = '^[A-Fa-f0-9]{6}$';
			const emoji_custom_regex = '^<?(a)?:?(\\w{2,32}):(\\d{17,19})>?$';
			const emoji_unicode_regex = '^[\u0000-\uFFFF]+$';

			const enterprise = await Enterprise.findOne({ where: { name_enterprise: name_enterprise } });

			if (!enterprise) {
				return await interaction.reply({ content: `Aucune entreprise portant le nom ${name_enterprise} a été trouvé`, ephemeral: true });
			}

			if (color_enterprise && color_enterprise.match(hexa_regex) === null) {
				return await interaction.reply({ content: 'La couleur ' + color_enterprise + ' donné en paramètre est incorrecte', ephemeral: true });
			}

			if (emoji_enterprise && !emoji_enterprise.match(emoji_custom_regex) && !emoji_enterprise.match(emoji_unicode_regex) && emoji_enterprise !== '0') {
				return await interaction.reply({ content: `L'emoji ${emoji_enterprise} donné en paramètre est incorrect`, ephemeral: true });
			}

			const [updated_enterprise] = await Enterprise.upsert({
				id_enterprise: enterprise.id_enterprise,
				name_enterprise: new_name_enterprise ? new_name_enterprise : enterprise.name_enterprise,
				emoji_enterprise: emoji_enterprise ? emoji_enterprise === '0' ? null : emoji_enterprise : enterprise.emoji_enterprise,
				color_enterprise: color_enterprise ? color_enterprise : enterprise.color_enterprise,
				facture_max_ardoise: facture_max_ardoise ? facture_max_ardoise : facture_max_ardoise === 0 ? 0 : enterprise.facture_max_ardoise,
				info_ardoise: info_ardoise ? info_ardoise === '0' ? null : info_ardoise : enterprise.info_ardoise,
				id_message: enterprise.id_message,
			});

			const tab = await Tab.findOne({
				where: { id_message: updated_enterprise.id_message },
			});

			if (tab) {
				const messageManager = new MessageManager(await interaction.client.channels.fetch(tab.id_channel));
				const tab_to_update = await messageManager.fetch(updated_enterprise.id_message);
				await tab_to_update.edit({
					embeds: [await getArdoiseEmbed(tab)],
				});
			}

			// Update command to modify the enterprise in the choices
			await updateCommands();

			return await interaction.reply({
				content: 'L\'entreprise vient d\'être mise à jour avec ces paramètres :\n' +
				`Nom : ${updated_enterprise.name_enterprise}\n` +
				`Emoji : ${updated_enterprise.emoji_enterprise ? updated_enterprise.emoji_enterprise : 'Aucun'}\n` +
				`Couleur : ${updated_enterprise.color_enterprise}\n` +
				`Facture max sur l'ardoise : $${updated_enterprise.facture_max_ardoise}\n` +
				`Information sur l'ardoise : ${updated_enterprise.info_ardoise ? updated_enterprise.info_ardoise : 'Aucune'}`,
				ephemeral: true,
			});
		}
		else if (interaction.options.getSubcommand() === 'supprimer') {
			const name_enterprise = interaction.options.getString('nom');

			const enterprise = await Enterprise.findOne({ where: { name_enterprise: name_enterprise } });

			if (!enterprise) {
				return await interaction.reply({ content: `Aucune entreprise portant le nom ${name_enterprise} a été trouvé`, ephemeral: true });
			}

			if (enterprise.sum_ardoise) {
				return await interaction.reply({ content: `L'entreprise ne peut pas être supprimé car il reste de l'argent sur son ardoise : $${enterprise.sum_ardoise.toLocaleString('en')}`, ephemeral: true });
			}

			await Enterprise.destroy({ where: { name_enterprise: name_enterprise } });

			const tab = await Tab.findOne({
				where: { id_message: enterprise.id_message },
			});

			if (tab) {
				const messageManager = new MessageManager(await interaction.client.channels.fetch(tab.id_channel));
				const tab_to_update = await messageManager.fetch(enterprise.id_message);
				await tab_to_update.edit({
					embeds: [await getArdoiseEmbed(tab)],
				});
			}

			// Update command to delete the enterprise in the choices
			await updateCommands();

			return await interaction.reply({
				content: `L'entreprise ${enterprise.name_enterprise} vient d'être supprimé`,
				ephemeral: true,
			});
		}
		else if (interaction.options.getSubcommand() === 'afficher') {
			const name_enterprise = interaction.options.getString('nom');

			const enterprise = await Enterprise.findOne({ where: { name_enterprise: name_enterprise } });

			if (name_enterprise && !enterprise) {
				return await interaction.reply({ content: `Aucune entreprise portant le nom ${name_enterprise} a été trouvé`, ephemeral: true });
			}

			if (enterprise) {
				return await interaction.reply({ embeds: await getEnterpriseEmbed(interaction, enterprise), ephemeral: true });
			}

			const enterprises = await Enterprise.findAll({ order: [['name_enterprise', 'ASC']] });

			return await interaction.reply({ embeds: await getEnterpriseEmbed(interaction, enterprises), ephemeral: true });
		}
	},
};

const getArdoiseEmbed = async (tab) => {
	const embed = new MessageEmbed()
		.setTitle('Ardoises')
		.setColor(tab ? tab.colour_tab : '000000')
		.setTimestamp(new Date());

	const enterprises = await tab.getEnterprises();
	for (const e of enterprises) {
		let field = 'Crédit restant : $' + (e.sum_ardoise ? e.sum_ardoise.toLocaleString('en') : '0');
		field += e.facture_max_ardoise ? '\nFacture max : $' + e.facture_max_ardoise : '';
		field += e.info_ardoise ? '\n' + e.info_ardoise : '';
		embed.addField(e.emoji_enterprise ? e.emoji_enterprise + ' ' + e.name_enterprise : e.name_enterprise, field, true);
	}

	return embed;
};

const getEnterpriseEmbed = async (interaction, enterprises) => {
	if (enterprises.length) {
		const arrayEmbed = [];
		let embed = new MessageEmbed()
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
			.setTitle('Entreprises')
			.setColor('#18913E')
			.setTimestamp(new Date());
		for (const [i, e] of enterprises.entries()) {
			const title = e.emoji_enterprise ? e.name_enterprise + ' ' + e.emoji_enterprise : e.name_enterprise;
			const field = `Couleur : ${e.color_enterprise}\n` +
				`Facture max pour l'ardoise : $${e.facture_max_ardoise ? e.facture_max_ardoise.toLocaleString('en') : 0}\n` +
				`Info pour l'ardoise : ${e.info_ardoise || 'Aucune'}`;

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

		if (enterprises.length % 25 != 0) {
			arrayEmbed.push(embed);
		}

		return arrayEmbed;
	}
	else {
		const embed = new MessageEmbed()
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
			.setTitle('Entreprise')
			.setColor('#18913E')
			.setTimestamp(new Date());

		const title = enterprises.emoji_enterprise ? enterprises.name_enterprise + ' ' + enterprises.emoji_enterprise : enterprises.name_enterprise;
		const field = `Couleur : ${enterprises.color_enterprise}\n` +
			`Facture max pour l'ardoise : $${enterprises.facture_max_ardoise ? enterprises.facture_max_ardoise.toLocaleString('en') : 0}\n` +
			`Info pour l'ardoise : ${enterprises.info_ardoise || 'Aucune' }`;

		embed.addField(title, field, true);

		return [embed];
	}
};

const updateCommands = async () => {
	const rest = new REST({ version: '9' }).setToken(token);
	const tabCommand = require('./tab.js');
	const factureCommand = require('./facture.js');
	const tabCommandOptions = tabCommand.data.options;
	const factureCommandOptions = factureCommand.data.options;

	// Fetch all enterprises to populate command choices (facture / ardoise)
	const enterprises = await Enterprise.findAll({ attributes: ['name_enterprise', 'id_enterprise'], order: [['name_enterprise', 'ASC']] });

	const tab_enterprises = enterprises.map(e => {
		return { name:`${e.dataValues.name_enterprise}`, value:`${e.dataValues.id_enterprise}` };
	});

	tab_enterprises.sort((a, b) => {
		return a.name_enterprise < b.name_enterprise ? -1 : a.name_enterprise > b.name_enterprise ? 1 : 0;
	});

	// Add choice option 'Particulier' for facture
	enterprises.push({ dataValues: { name_enterprise: 'Particulier', id_enterprise: 'Particulier' } });

	const facture_enterprises = enterprises.map(e => {
		return { name:`${e.dataValues.name_enterprise}`, value:`${e.dataValues.id_enterprise}` };
	});

	facture_enterprises.sort((a, b) => {
		return a.name_enterprise < b.name_enterprise ? -1 : a.name_enterprise > b.name_enterprise ? 1 : 0;
	});

	// Populate choices option in both command with updated enterprises
	tabCommandOptions.forEach(data => {
		if (data.options) {
			data.options.map(d => {
				if ((d.name === 'entreprise' || d.name === 'client') && d.choices) {
					return d.choices = tab_enterprises;
				}
				else if (d.name === 'ajout' || d.name === 'suppression') {
					d.options.map(sd => {
						if ((sd.name === 'entreprise' || sd.name === 'client') && sd.choices) {
							return sd.choices = tab_enterprises;
						}
					});
				}
			});
		}
	});

	factureCommandOptions.forEach(data => {
		if (data.options) {
			data.options.map(d => {
				// console.log(d);
				if ((d.name === 'entreprise' || d.name === 'client') && d.choices) {
					return d.choices = facture_enterprises;
				}
				else if (d.name === 'ajout' || d.name === 'suppression') {
					d.options.map(sd => {
						if ((sd.name === 'entreprise' || sd.name === 'client') && sd.choices) {
							return sd.choices = facture_enterprises;
						}
					});
				}
			});
		}
	});

	// Patch command for the user
	rest.patch(
		Routes.applicationGuildCommand(clientId, guildId, tabCommandId),
		{ body: { options: tabCommandOptions } },
	)
		.then(() => console.log('Successfully updated tab options.'))
		.catch(console.error);

	rest.patch(
		Routes.applicationGuildCommand(clientId, guildId, factureCommandId),
		{ body: { options: factureCommandOptions } },
	)
		.then(() => console.log('Successfully updated facture options.'))
		.catch(console.error);
};