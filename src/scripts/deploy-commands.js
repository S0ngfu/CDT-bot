const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const dotenv = require('dotenv');
const { Enterprise } = require('../dbObjects');

dotenv.config();
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const tabCommandId = process.env.COMMAND_TAB_ID;
const factureCommandId = process.env.COMMAND_FACTURE_ID;

const commands = [];
const rest = new REST({ version: '9' }).setToken(token);

const resetCommand = process.argv.includes('--reset') || process.argv.includes('-r');

if (!resetCommand) {
	const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js') || file.endsWith('.cjs'));

	for (const file of commandFiles) {
		const command = require(`../commands/${file}`);
		if (file === 'tab.js' || file === 'facture.js') {
			//
		}
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
	.then(async () => {
		await updateCommands();
		console.log('Successfully registered application commands.');
	})
	.catch(console.error);


const updateCommands = async () => {
	const tabCommand = require('./tab.js');
	const factureCommand = require('./facture.js');
	const tabCommandOptions = tabCommand.data.options;
	const factureCommandOptions = factureCommand.data.options;

	// Fetch all enterprises to populate command choices (facture / ardoise)
	const enterprises = await Enterprise.findAll({ attributes: ['name_enterprise', 'id_enterprise'], order: [['name_enterprise', 'ASC']] });

	const tab_enterprises = enterprises.map(e => {
		return { name:`${e.dataValues.name_enterprise}`, value:`${e.dataValues.id_enterprise}` };
	});

	tab_enterprises.sort((a, b) => {
		return a.name_enterprise < b.name_enterprise ? -1 : a.name_enterprise > b.name_enterprise ? 1 : 0;
	});

	// Add choice option 'Particulier' for facture
	enterprises.push({ dataValues: { name_enterprise: 'Particulier', id_enterprise: 'Particulier' } });

	const facture_enterprises = enterprises.map(e => {
		return { name:`${e.dataValues.name_enterprise}`, value:`${e.dataValues.id_enterprise}` };
	});

	facture_enterprises.sort((a, b) => {
		return a.name_enterprise < b.name_enterprise ? -1 : a.name_enterprise > b.name_enterprise ? 1 : 0;
	});

	// Populate choices option in both command with updated enterprises
	tabCommandOptions.forEach(data => {
		if (data.options) {
			data.options.map(d => {
				if ((d.name === 'entreprise' || d.name === 'client') && d.choices) {
					return d.choices = tab_enterprises;
				}
				else if (d.name === 'ajout' || d.name === 'suppression') {
					d.options.map(sd => {
						if ((sd.name === 'entreprise' || sd.name === 'client') && sd.choices) {
							return sd.choices = tab_enterprises;
						}
					});
				}
			});
		}
	});

	factureCommandOptions.forEach(data => {
		if (data.options) {
			data.options.map(d => {
				// console.log(d);
				if ((d.name === 'entreprise' || d.name === 'client') && d.choices) {
					return d.choices = facture_enterprises;
				}
				else if (d.name === 'ajout' || d.name === 'suppression') {
					d.options.map(sd => {
						if ((sd.name === 'entreprise' || sd.name === 'client') && sd.choices) {
							return sd.choices = facture_enterprises;
						}
					});
				}
			});
		}
	});

	// Patch command for the user
	rest.patch(
		Routes.applicationGuildCommand(clientId, guildId, tabCommandId),
		{ body: { options: tabCommandOptions } },
	)
		.then(() => console.log('Successfully updated tab options.'))
		.catch(console.error);

	rest.patch(
		Routes.applicationGuildCommand(clientId, guildId, factureCommandId),
		{ body: { options: factureCommandOptions } },
	)
		.then(() => console.log('Successfully updated facture options.'))
		.catch(console.error);
};