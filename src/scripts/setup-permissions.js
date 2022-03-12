const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const dotenv = require('dotenv');

dotenv.config();
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const direction_roleId = process.env.DIRECTION_ROLE_ID;
const employe_roleId = process.env.EMPLOYE_ROLE_ID;
const guildId = process.env.GUILD_ID;

const pushpermissions = process.argv.includes('--push') || process.argv.includes('-p');

const resetCommand = process.argv.includes('--reset') || process.argv.includes('-r');

const rest = new REST({ version: '9' }).setToken(token);

if (resetCommand) {
	//
}

if (!pushpermissions) {
	rest.get(
		Routes.applicationGuildCommands(clientId, guildId),
		// Routes.guildApplicationCommandsPermissions(clientId, guildId),
	)
		.then((data) => console.log(data.map(d => d/*.permissions*/)))
		.catch(console.error);
}
else {
	rest.put(
		Routes.guildApplicationCommandsPermissions(clientId, guildId),
		{ body: [
			{
				// name: calculo
				id: '926214969836601397',
				// id: '926214289537253399',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: employe_roleId,
					type: 1,
					permission: true,
				}],
			},
			{
				// name: grossiste
				id: '926214969836601401',
				// id: '926214289537253403',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: employe_roleId,
					type: 1,
					permission: true,
				}],
			},
			{
				// name: historique_grossiste
				id: '926214969836601402',
				// id: '926214289537253404',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: employe_roleId,
					type: 1,
					permission: true,
				}],
			},
			{
				// name: modif-delete_grossiste
				id: '926214969836601403',
				// id: '926214289537253405',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: employe_roleId,
					type: 1,
					permission: false,
				}],
			},
			{
				// name: modif-prix_entreprise
				id: '926214969895309342',
				// id: '926214289616928789',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: employe_roleId,
					type: 1,
					permission: false,
				}],
			},
			{
				// name: facture
				id: '934904966634672189',
				// id: '951232428293386270',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: employe_roleId,
					type: 1,
					permission: false,
				}],
			},
			{
				// name: ardoise
				id: '942429979818483753',
				// id: '951232428293386272',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: employe_roleId,
					type: 1,
					permission: false,
				}],
			},
			{
				// name: stocks
				id: '950149408534712321',
				// id: '951232428293386271',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: employe_roleId,
					type: 1,
					permission: false,
				}],
			},
			{
				// name: produit
				id: '951629003196862474',
				// id: '951927605454573668',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: employe_roleId,
					type: 1,
					permission: false,
				}],
			},
			{
				// name: entreprise
				id: '951987522488115231',
				// id: '951998963966410804',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: employe_roleId,
					type: 1,
					permission: false,
				}],
			},
			{
				// name: groupe
				id: '952194954350973000',
				// id: '952202785049415731',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: employe_roleId,
					type: 1,
					permission: false,
				}],
			},
		] },
	)
		.then(() => console.log('Successfully registered application commands.'))
		.catch(console.error);
}
