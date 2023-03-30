const { REST, Routes } = require('discord.js');
const dotenv = require('dotenv');

dotenv.config();
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const direction_roleId = process.env.DIRECTION_ROLE_ID;
const employe_roleId = process.env.EMPLOYE_ROLE_ID;
const gerant_roleId = process.env.GERANT_ROLE_ID;
const cadre_roleId = process.env.CADRE_ROLE_ID;
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
				// name: calcublé
				id: '964546651253530646',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: gerant_roleId,
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
				// name: export
				id: '964546651253530650',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: gerant_roleId,
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
				// name: historique_export
				id: '964546651253530652',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: gerant_roleId,
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
				// name: modif-delete_export
				id: '964546651253530654',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: gerant_roleId,
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
				id: '964546651253530655',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: gerant_roleId,
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
				id: '964546651253530648',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: gerant_roleId,
					type: 1,
					permission: true,
				},
				{
					id: cadre_roleId,
					type: 1,
					permission: true,
				},
				{
					id: gerant_roleId,
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
				id: '964546651383533641',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: gerant_roleId,
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
				id: '964546651383533640',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: gerant_roleId,
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
				id: '964546651383533639',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: gerant_roleId,
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
				id: '964546651253530647',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: gerant_roleId,
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
				id: '964546651253530651',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: gerant_roleId,
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
				id: '964546651253530649',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: gerant_roleId,
					type: 1,
					permission: true,
				},
				{
					id: cadre_roleId,
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
				id: '964546651253530653',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: gerant_roleId,
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
				// name: pds
				id: '964546651383533638',
				permissions:[{
					id: direction_roleId,
					type: 1,
					permission: true,
				},
				{
					id: gerant_roleId,
					type: 1,
					permission: true,
				},
				{
					id: cadre_roleId,
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
