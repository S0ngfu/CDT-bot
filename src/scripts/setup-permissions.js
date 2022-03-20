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

const rest = new REST({ version: '9' }).setToken(token);

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
				// name: Supprimer la facture
				id: '952240183061925908',
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
				// name: impôt
				id: '954352997922635776',
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
