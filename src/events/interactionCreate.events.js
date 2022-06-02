const { Modal, TextInputComponent, MessageActionRow, MessageEmbed } = require('discord.js');
const dotenv = require('dotenv');

dotenv.config();
const channelId = process.env.CHANNEL_SUGGESION_ID;

module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
		if (!interaction.isCommand()) {
			if (interaction.isButton()) {
				if (interaction.customId.startsWith('stock')) {
					const command = interaction.client.commands.get('stocks');
					await command.buttonClicked(interaction);
				}
				else if (interaction.customId.startsWith('pds')) {
					const command = interaction.client.commands.get('pds');
					await command.buttonClicked(interaction);
				}
				else if (interaction.customId.includes('calculo')) {
					const command = interaction.client.commands.get('calculo');
					await command.execute(interaction);
				}
				else if (interaction.customId.includes('suggestionBoxButton')) {
					const modal = new Modal()
						.setCustomId('suggestionBox')
						.setTitle('Boîte à idées');
					const title = new TextInputComponent()
						.setCustomId('suggestionBoxTitle')
						.setLabel('Sujet de la demande (Idée/Soucis/Autre)')
						.setStyle('SHORT')
						.setMaxLength(250);
					const suggestion = new TextInputComponent()
						.setCustomId('suggestionBoxText')
						.setLabel('Demande')
						.setStyle('PARAGRAPH');
					const firstActionRow = new MessageActionRow().addComponents(title);
					const secondActionRow = new MessageActionRow().addComponents(suggestion);
					modal.addComponents(firstActionRow, secondActionRow);
					await interaction.showModal(modal);
				}
			}
			else if (interaction.isContextMenu()) {
				console.log(`${new Date().toLocaleString('fr-FR')} - ${interaction.user.tag} in #${interaction.channel.name} triggered ${interaction.commandName}.`);

				const command = interaction.client.commands.get(interaction.commandName);

				if (!command) return;

				try {
					await command.execute(interaction);
				}
				catch (error) {
					console.error(error);
					await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
				}
			}
			else if (interaction.isModalSubmit()) {
				const title = interaction.fields.getTextInputValue('suggestionBoxTitle');
				const suggestion = interaction.fields.getTextInputValue('suggestionBoxText');

				const embed = new MessageEmbed()
					.setTitle(title ? title : 'Vide')
					.setDescription(suggestion ? suggestion : 'Vide')
					.setTimestamp(new Date());

				const messageManager = await interaction.client.channels.fetch(channelId);
				await messageManager.send({ embeds: [embed] });

				await interaction.reply({ content: 'Votre message a bien été envoyé', ephemeral: true });

				console.log(`${interaction.user.tag} just send a suggestion`);
			}

			// Les interactions sont écoutés depuis la commande.
			return;
		}

		console.log(`${new Date().toLocaleString('fr-FR')} - ${interaction.user.tag} in #${interaction.channel.name} triggered ${interaction.commandName}.`);

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) return;

		try {
			await command.execute(interaction);
		}
		catch (error) {
			console.error(error);
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	},
};