const { ContextMenuCommandBuilder, time } = require('@discordjs/builders');
const { Fuel } = require('../dbObjects.js');
const moment = require('moment');
const dotenv = require('dotenv');
const { ApplicationCommandType } = require('discord-api-types/v10');

dotenv.config();
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

const guildId = process.env.GUILD_ID;

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName('Supprimer ravitaillement')
		.setType(ApplicationCommandType.Message)
		.setDMPermission(false)
		.setDefaultMemberPermissions('0'),

	async execute(interaction) {
		const id = interaction.targetId;
		const refuel = await Fuel.findOne({ where: { id_message: id } });

		if (!refuel) {
			return await interaction.reply({ content: 'Aucun ravitaillement trouvé', ephemeral:true });
		}

		try {
			await interaction.targetMessage.delete();
		}
		catch (error) {
			console.error(error);
		}

		await Fuel.destroy({
			where: { id: refuel.id },
		});

		const guild = await interaction.client.guilds.fetch(guildId);
		let user = null;
		try {
			user = await guild.members.fetch(refuel.id_employe);
		}
		catch (error) {
			console.error(error);
		}
		const employe = user ? user.nickname ? user.nickname : user.user.username : refuel.id_employe;

		return await interaction.reply({
			content: `Le ravitaillement ${refuel.id} de ${refuel.qt_fuel.toLocaleString('fr')}L pour $${refuel.sum_fuel.toLocaleString('en')}` +
			`effectué le ${time(moment(refuel.date_fuel, 'YYYY-MM-DD hh:mm:ss.S ZZ').unix(), 'F')} par ${employe} a été supprimé`,
			ephemeral: true,
		});
	},
};
