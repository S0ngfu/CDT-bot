const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const dotenv = require('dotenv');

dotenv.config();
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const commands = [];
const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js') || file.endsWith('.cjs'));

for (const file of commandFiles) {
	const command = require(`../commands/${file}`);
	commands.push(command.data.toJSON());
}
/*
const test = [];
for (const c of commands) {
	const obj = { ...c };
	if (c.options) {
		c.options.forEach((o, key) => {
			if (o.maxValue || o.minValue) {
				obj.options[key] = { ...o, min_value: o.minValue, max_value: o.maxValue };
			}
		});
	}
	test.push(obj);
}

console.log('commands: ', ...test);
*/
const rest = new REST({ version: '9' }).setToken(token);

rest.put(
	Routes.applicationGuildCommands(clientId, guildId),
	// Routes.applicationCommands(clientId),
	{ body: commands },
	// { body: [] },
)
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);
