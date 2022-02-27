const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageManager } = require('discord.js');
const { Tab, Enterprise } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ardoise')
		.setDescription('Gestion des ardoises')
		.setDefaultPermission(false)
		.addSubcommand(subcommand =>
			subcommand
				.setName('init')
				.setDescription('Initialise un message permettant d\'afficher des ardoises'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('couleur')
				.setDescription('Permet de modifier la couleur du message des ardoises')
				.addStringOption((option) =>
					option
						.setName('couleur')
						.setDescription('Couleur de l\'ardoise (sous format hexadécimal)')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('historique')
				.setDescription('Montre l\'historique des opération sur les ardoises')
				.addStringOption((option) =>
					option
						.setName('filtre')
						.setDescription('Permet de choisir le format de l\'historique')
						.setRequired(false)
						.addChoice('Détail', 'detail')
						.addChoice('Journée', 'day')
						.addChoice('Semaine', 'week'),
				)
				.addStringOption((option) =>
					option
						.setName('entreprise')
						.setDescription('Nom de l\'entreprise')
						.setRequired(false),
				),
		)
		.addSubcommandGroup(subcommandgroup =>
			subcommandgroup
				.setName('entreprise')
				.setDescription('Gestion des ardoises pour les entreprises')
				.addSubcommand(subcommand =>
					subcommand
						.setName('ajout')
						.setDescription('Permet d\'ajouter une ardoise à une entreprise')
						.addStringOption(option =>
							option
								.setName('entreprise')
								.setDescription('Nom de l\'entreprise')
								.setRequired(true)
								.addChoice('ARC', '1')
								.addChoice('Benny\'s', '2')
								.addChoice('Blé d\'Or', '3')
								.addChoice('Weazle News', '4')
								.addChoice('Gouvernement', '5')
								.addChoice('Mairie BC', '6')
								.addChoice('Mairie LS', '7')
								.addChoice('M$T', '8')
								.addChoice('Paradise', '9')
								.addChoice('PBSC', '10')
								.addChoice('PLS', '11')
								.addChoice('Rapid\'Transit', '12')
								.addChoice('Rogers', '13')
								.addChoice('SBC', '14')
								.addChoice('Ryan\'s', '15'),
						),
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('suppression')
						.setDescription('Permet de supprimer l\'ardoise d\'une entreprise')
						.addStringOption(option =>
							option
								.setName('entreprise')
								.setDescription('Nom de l\'entreprise')
								.setRequired(true)
								.addChoice('ARC', '1')
								.addChoice('Benny\'s', '2')
								.addChoice('Blé d\'Or', '3')
								.addChoice('Weazle News', '4')
								.addChoice('Gouvernement', '5')
								.addChoice('Mairie BC', '6')
								.addChoice('Mairie LS', '7')
								.addChoice('M$T', '8')
								.addChoice('Paradise', '9')
								.addChoice('PBSC', '10')
								.addChoice('PLS', '11')
								.addChoice('Rapid\'Transit', '12')
								.addChoice('Rogers', '13')
								.addChoice('SBC', '14')
								.addChoice('Ryan\'s', '15'),
						),
				),
		),
	async execute(interaction) {
		const hexa_regex = '^[A-Fa-f0-9]{6}$';

		if (interaction.options.getSubcommand() === 'init') {
			const existing_tab = await Tab.findOne({
				where: { id_channel: interaction.channelId },
			});

			if (!existing_tab) {
				const message = await interaction.reply({
					embeds: [await getArdoiseEmbed(null)],
					fetchReply: true,
				});

				await Tab.upsert({
					id_message: message.id,
					id_channel: interaction.channelId,
				});
			}
			else {
				try {
					const tab_to_delete = await interaction.channel.messages.fetch(existing_tab.id_message);
					await tab_to_delete.delete();
				}
				catch (error) {
					console.log('Error: ', error);
				}

				const message = await interaction.reply({
					embeds: [await getArdoiseEmbed(existing_tab)],
					fetchReply: true,
				});

				await Tab.update({
					id_message: message.id,
				}, { where: { id_channel: interaction.channelId } });
			}
		}
		else if (interaction.options.getSubcommand() === 'couleur') {
			const colour_tab = interaction.options.getString('couleur') ? interaction.options.getString('couleur').trim() : '000000';

			if (colour_tab.match(hexa_regex) === null) {
				await interaction.reply({ content: 'La couleur ' + colour_tab + ' donné en paramètre est incorrecte.', ephemeral: true });
				return;
			}

			const tab = await Tab.findOne({
				where: { id_channel: interaction.channelId },
			});

			if (tab) {
				await tab.update({
					colour_tab: colour_tab,
				});

				const message = await interaction.channel.messages.fetch(tab.id_message);
				await message.edit({
					embeds: [await getArdoiseEmbed(tab)],
				});
				await interaction.reply({ content: 'La couleur de l\'ardoise a été modifié', ephemeral: true });
			}
			else {
				await interaction.reply({ content: 'Il n\'y a aucune ardoise dans ce salon', ephemeral: true });
			}
		}
		else if (interaction.options.getSubcommand() === 'historique') {
			console.log('historique');
			const filtre = interaction.options.getString('filtre') ? interaction.options.getString('filtre') : 'detail';
			const enterprise = interaction.options.getString('entreprise');
			console.log(filtre);
			console.log(enterprise);
			// get historique from bills with tab true
		}
		else if (interaction.options.getSubcommandGroup() === 'entreprise') {
			if (interaction.options.getSubcommand() === 'ajout') {
				const id_enterprise = interaction.options.getString('entreprise');
				const enterprise = await Enterprise.findByPk(id_enterprise);
				const tab = await Tab.findOne({
					where: { id_channel: interaction.channelId },
				});

				if (!tab) {
					return await interaction.reply({ content: 'Aucune ardoise est instancié dans ce salon', ephemeral: true });
				}
				if (tab.id_message === enterprise.id_message) {
					return await interaction.reply({ content: 'L\'entreprise est déjà présente sur cette ardoise', ephemeral: true });
				}

				const previous_tab_message = enterprise.id_message;
				await enterprise.update({ id_message: tab.id_message });
				const message = await interaction.channel.messages.fetch(tab.id_message);
				await message.edit({
					embeds: [await getArdoiseEmbed(tab)],
				});

				if (previous_tab_message !== null) {
					const previous_tab = await Tab.findOne({ where: { id_message: previous_tab_message } });
					const messageManager = new MessageManager(await interaction.client.channels.fetch(previous_tab.id_channel));
					const previous_message = await messageManager.fetch(previous_tab_message);
					await previous_message.edit({
						embeds: [await getArdoiseEmbed(previous_tab)],
					});
				}

				return await interaction.reply({
					content: 'L\'entreprise ' + (enterprise.emoji_enterprise ? enterprise.emoji_enterprise + ' ' + enterprise.name_enterprise : enterprise.name_enterprise)
					+ ' a désormais une ardoise',
					ephemeral: true,
				});
			}
			else if (interaction.options.getSubcommand() === 'suppression') {
				console.log('suppression');
				const id_enterprise = interaction.options.getString('entreprise');
				const enterprise = await Enterprise.findByPk(id_enterprise);
				console.log(enterprise);
				if (!enterprise.id_message) {
					return await interaction.reply({ content: 'L\'entreprise n\'a pas d\'ardoise', ephemeral: true });
				}
				if (enterprise.sum_ardoise) {
					// Cannot delete
					return await interaction.reply({ content: 'Le solde de l\'entreprise n\'est pas à $0', ephemeral: true });
				}
				else {
					// Delete
					const tab = await Tab.findOne({
						where: { id_message: enterprise.id_message },
					});
					await enterprise.update({ id_message: null, sum_ardoise: null, facture_max_ardoise: null, info_ardoise: null });
					const messageManager = new MessageManager(await interaction.client.channels.fetch(tab.id_channel));
					const tab_message = await messageManager.fetch(tab.id_message);
					await tab_message.edit({
						embeds: [await getArdoiseEmbed(tab)],
					});
					return await interaction.reply({ content: 'L\'ardoise de l\'entreprise a été supprimé', ephemeral: true });
				}
			}
		}
	},
};

const getArdoiseEmbed = async (tab = null) => {
	const embed = new MessageEmbed()
		.setTitle('Ardoises')
		.setColor(tab ? tab.colour_tab : '000000')
		.setTimestamp(new Date());

	if (tab) {
		const enterprises = await tab.getEnterprises();
		for (const e of enterprises) {
			console.log(e);
			let field = 'Crédit restant : $' + (e.sum_ardoise ? e.sum_ardoise.toLocaleString('en') : '0');
			field += e.facture_max_ardoise ? '\nFacture max : $' + e.facture_max_ardoise : '';
			field += e.info_ardoise ? '\n' + e.info_ardoise : '';
			embed.addField(e.emoji_enterprise ? e.emoji_enterprise + ' ' + e.name_enterprise : e.name_enterprise, field, true);
		}
	}

	return embed;
};