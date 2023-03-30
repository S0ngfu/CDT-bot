const { ContextMenuCommandBuilder, time } = require('@discordjs/builders');
const { Fuel, Employee } = require('../dbObjects.js');
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

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName('Supprimer ravitaillement')
		.setType(ApplicationCommandType.Message)
		.setDMPermission(false)
		.setDefaultMemberPermissions('0'),

	async execute(interaction) {
		const id = interaction.targetId;
		const refuel = await Fuel.findOne({ where: { id_message: id }, include: [{ model: Employee }] });

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

		return await interaction.reply({
			content: `Le ravitaillement ${refuel.id} de ${refuel.qt_fuel.toLocaleString('fr')}L pour $${refuel.sum_fuel.toLocaleString('en')}` +
			` effectué le ${time(moment(refuel.date_fuel, 'YYYY-MM-DD hh:mm:ss.S ZZ').unix(), 'F')} par ${refuel.employee.name_employee} a été supprimé`,
			ephemeral: true,
		});
	},
};
