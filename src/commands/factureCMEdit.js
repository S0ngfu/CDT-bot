const { ContextMenuCommandBuilder } = require('@discordjs/builders');
const { Bill, BillDetail, Enterprise } = require('../dbObjects.js');
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
		.setName('Modif facture direction')
		.setType(ApplicationCommandType.Message)
		.setDMPermission(false)
		.setDefaultMemberPermissions('0'),

	async execute(interaction) {
		const id = interaction.targetId;
		const bill = await Bill.findByPk(id, { include: [{ model: BillDetail }, { model: Enterprise }] });

		if (bill && bill.url) {
			const command = interaction.client.commands.get('calcublé');
			await command.execute(interaction, bill);
		}
		else {
			return await interaction.reply({ content: `Aucune facture trouvé ayant l'id ${id}`, ephemeral:true });
		}
	},
};
