module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
		console.log('SGO-isCommand: ', interaction.isCommand());

		if (!interaction.isCommand()) {
			// Les interactions sont écoutés depuis la commande.
			// Il faudrait gérer avoir un tableau des messages sur écoutes
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