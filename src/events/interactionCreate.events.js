module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {

		if (!interaction.isCommand()) {
			if (interaction.isButton()) {
				if (interaction.customId.startsWith('calculo')) {
					const command = interaction.client.commands.get('calculo');
					await command.execute(interaction);
					console.log(`${new Date().toLocaleString('fr-FR')} - ${interaction.user.tag} in #${interaction.channel.name} triggered button calculo.`);
				}
				else if (interaction.customId.startsWith('pds')) {
					const command = interaction.client.commands.get('pds');
					await command.buttonClicked(interaction);
					console.log(`${new Date().toLocaleString('fr-FR')} - ${interaction.user.tag} in #${interaction.channel.name} triggered button pds.`);
				}
				else if (interaction.customId.startsWith('stock')) {
					const command = interaction.client.commands.get('stocks');
					await command.buttonClicked(interaction);
					console.log(`${new Date().toLocaleString('fr-FR')} - ${interaction.user.tag} in #${interaction.channel.name} triggered button stocks.`);
				}
			}
			else if (interaction.isContextMenu()) {
				console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered ${interaction.commandName}.`);

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

			// Les interactions sont écoutés depuis la commande.
			return;
		}

		console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered ${interaction.commandName}.`);

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