const { EmbedBuilder, MessageManager, ContextMenuCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { ApplicationCommandType } = require('discord-api-types/v10');

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName('Annuler remboursement')
		.setType(ApplicationCommandType.Message)
		.setDMPermission(false)
		.setDefaultMemberPermissions('0'),

	async execute(interaction) {
		let message = null;
		try {
			const messageManager = new MessageManager(await interaction.client.channels.fetch(interaction.channelId));
			message = await messageManager.fetch({ message: interaction.targetId });
		}
		catch (error) {
			return interaction.reply({ content: 'Erreur lors de la récupération du message', ephemeral: true });
		}
		if (!message || message.embeds.length !== 1) {
			return interaction.reply({ content: 'Le message n\'est pas une demande de remboursement', ephemeral: true });
		}
		const embed = EmbedBuilder.from(message.embeds[0]);
		if (embed.data.title === 'Frais remboursé ✅') {
			embed.setTitle('Demande de remboursement');
			await message.edit({ embeds: [embed], components: [getCheckButton()] });
			return interaction.reply({ content: 'La demande de remboursement a été remise en attente ', ephemeral: true });
		}
		else if (embed.data.title === 'Demande de remboursement') {
			return interaction.reply({ content: 'Le remboursement de la demande a été annulé', ephemeral: true });
		}
		else {
			return interaction.reply({ content: 'Le message n\'est pas une demande de remboursement', ephemeral: true });
		}
	},
};

const getCheckButton = () => {
	return new ActionRowBuilder().addComponents([
		new ButtonBuilder({ customId: 'fraispro', emoji: '✅', style: ButtonStyle.Secondary }),
	]);
};
