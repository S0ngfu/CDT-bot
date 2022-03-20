const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const dotenv = require('dotenv');

dotenv.config();
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const commands = [];
const rest = new REST({ version: '9' }).setToken(token);

const resetCommand = process.argv.includes('--reset') || process.argv.includes('-r');

if (!resetCommand) {
	const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js') || file.endsWith('.cjs'));

	for (const file of commandFiles) {
		const command = require(`../commands/${file}`);
		commands.push(command.data.toJSON());
		console.log('commandName: ', file);
		console.log('command: ', command.data.toJSON());
	}
}

rest.put(
	Routes.applicationGuildCommands(clientId, guildId),
	// Routes.applicationCommands(clientId),
	{ body: commands },
)
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);
