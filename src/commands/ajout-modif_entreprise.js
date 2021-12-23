const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ajout-modif_entreprise')
		.setDescription('1'),
	async execute(interaction) {
		// hello
	},
};