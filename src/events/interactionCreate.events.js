module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {

		if (!interaction.isCommand()) {
			if (interaction.customId.startsWith('stock')) {
				const command = interaction.client.commands.get('stocks');
				await command.buttonClicked(interaction);
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