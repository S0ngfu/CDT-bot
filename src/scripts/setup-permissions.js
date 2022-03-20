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
		.then((data) => console.log(data.map(d => d/* .permissions*/)))
		.catch(console.error);
}
else {
	rest.put(
		Routes.guildApplicationCommandsPermissions(clientId, guildId),
		{ body: [
			{
				// name: calculo
				id: '952976365114781726',
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
				id: '952976365114781730',
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
				id: '952976365114781732',
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
				id: '952976365114781733',
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
				id: '952976365114781734',
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
				id: '952976365114781728',
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
				id: '952976365173473301',
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
				id: '952976365173473300',
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
				id: '952976365114781735',
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
				id: '952976365114781727',
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
				id: '952976365114781731',
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
				id: '952976365114781729',
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
				id: '954352808860200980',
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
