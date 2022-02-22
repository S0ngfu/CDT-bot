const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { Enterprise, Tab } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ardoise')
		.setDescription('Gestion des ardoises')
		.setDefaultPermission(false)
		.addSubcommand(subcommand =>
			subcommand
				.setName('init')
				.setDescription('Initialise un message permettant d\'afficher des ardoises')
				.addStringOption((option) =>
					option
						.setName('couleur')
						.setDescription('Couleur de l\'ardoise (sous format hexadécimal)')
						.setRequired(false),
				),
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
								.setRequired(true),
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
								.setRequired(true),
						),
				),
		),
	async execute(interaction) {
		console.log(`tab interaction: \n Channel: ${interaction.channelId}`);
		console.log(interaction);
		if (interaction.options.getSubcommand() === 'init') {
			const colour_tab = interaction.options.getString('couleur') ? interaction.options.getString('couleur').trim() : '000000';
			// get id of ardoise with channelId
			const existing_tab = await Tab.findByPk(interaction.channelId);
			console.log(existing_tab);
			if (!existing_tab) {
				// Create the tab
				// Print the tab
				const message = await interaction.reply({
					embeds: [await getArdoiseEmbed(null, colour_tab)],
					fetchReply: true,
				});

				await Tab.upsert({
					id_message: message.id,
					id_channel: interaction.channelId,
					colour_tab: colour_tab,
				});
			}
			// get enterprise with
			// get channel from interaction
			// check if ardoise in channel already exist
			// if yes
			// 		récup les ardoises rattachés à celle-ci
			// 		update message_id de l'ardoise
			// else
			//		create new ardoise, init with channel & message
		}
		else if (interaction.options.getSubcommand() === 'couleur') {
			//
		}
		else if (interaction.options.getSubcommand() === 'historique') {
			console.log('historique');
			const filtre = interaction.options.getString('filtre') ? interaction.options.getString('filtre') : 'detail';
			const enterprise = interaction.options.getString('entreprise');
			console.log(filtre);
			console.log(enterprise);
			// get historique from operation_tab for everything
		}
		else if (interaction.options.getSubcommandGroup() === 'entreprise') {
			if (interaction.options.getSubcommand() === 'ajout') {
				console.log('ajout');
				const enterprise = interaction.options.getString('entreprise');
				console.log(enterprise);
				// get channel from interaction
				// check if tab existing in channel
				// if not -> warning user & return
				// add enterprise in the ardoise even if it is in other place
			}
			else if (interaction.options.getSubcommand() === 'suppression') {
				console.log('suppression');
				const enterprise = interaction.options.getString('entreprise');
				console.log(enterprise);
				// check if entreprise has ardoise
				// check if no money on it
				// delete ardoise
			}
		}
	},
};

const getArdoiseEmbed = async (channelId = null, colour_tab = '000000') => {
	// fetch ardoise for channel, return message
	const embed = new MessageEmbed()
		.setTitle('Ardoises')
		.setColor(colour_tab)
		.setTimestamp(new Date());

	if (channelId) {
		// fetch enterprise to print
	}

	return embed;
};