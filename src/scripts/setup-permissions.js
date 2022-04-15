const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
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
				id: '955553618487025754',
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
				id: '955186761682780234',
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
				id: '955186761682780236',
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
				id: '955186761682780238',
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
				id: '955186761682780239',
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
				id: '955186761682780232',
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
				id: '955186761733132311',
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
				id: '955186761733132310',
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
				id: '955186761733132309',
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
				id: '955186761682780231',
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
				id: '955186761682780235',
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
				id: '955186761682780233',
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
				id: '955186761682780237',
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
				id: '961013749312016414',
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
