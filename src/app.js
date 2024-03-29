// Require the necessary discord.js classes
const fs = require('fs');
const { Client, Collection, GatewayIntentBits, ActivityType, DiscordAPIError } = require('discord.js');
const dotenv = require('dotenv');

dotenv.config();
// Create a new client instance
const token = process.env.DISCORD_TOKEN;
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const cronsFiles = fs.readdirSync('./src/crons').filter(file => file.endsWith('crons.js'));

client.commands = new Collection();
const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js') || file.endsWith('.cjs'));
const eventFiles = fs.readdirSync('./src/events').filter(file => file.endsWith('.js') || file.endsWith('.cjs'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	console.log('command.data.name:', command.data.name);
	// Set a new item in the Collection
	// With the key as the command name and the value as the exported module
	client.commands.set(command.data.name, command);
}

for (const file of eventFiles) {
	const event = require(`./events/${file}`);
	console.log('event.name:', event.name);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	}
	else {
		client.on(event.name, (...args) => {
			try {
				event.execute(...args);
			}
			catch (error) {
				if (error instanceof DiscordAPIError && error.code === 10062) {
					console.error('Interaction inconnue: ', error.url);
				}
				else {
					console.error(error);
				}
			}
		});
	}
}

client.login(token).then(() => {
	client.user.setActivity({ name: 'le domaine', type: ActivityType.Watching });

	for (const cronFile of cronsFiles) {
		const cron = require(`./crons/${cronFile}`);
		console.log('cronFile:', cronFile);
		cron.initCrons(client);
	}
});
