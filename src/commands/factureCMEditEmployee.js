const { ContextMenuCommandBuilder } = require('@discordjs/builders');
const { Bill, BillDetail, Enterprise } = require('../dbObjects.js');
const moment = require('moment');
const dotenv = require('dotenv');
const { ApplicationCommandType } = require('discord-api-types/v9');

dotenv.config();
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName('Modifier ma facture')
		.setType(ApplicationCommandType.Message)
		.setDefaultPermission(false),

	async execute(interaction) {
		const id = interaction.targetId;
		const bill = await Bill.findByPk(id, { include: [{ model: BillDetail }, { model: Enterprise }] });

		if (bill && bill.url) {
			if (bill.id_employe !== interaction.user.id) {
				return await interaction.reply({ content: 'Vous ne pouvez pas modifier une facture qui n\'avez pas faite', ephemeral:true });
			}
			if (moment().diff(moment(bill.date_bill), 'h') > 2) {
				return await interaction.reply({ content: 'Vous ne pouvez pas modifier une facture qui a été faite il y a plus de 2 heures', ephemeral:true });
			}
			const command = interaction.client.commands.get('calculo');
			await command.execute(interaction, bill);
		}
		else {
			return await interaction.reply({ content: `Aucune facture trouvé ayant l'id ${id}`, ephemeral:true });
		}
	},
};
