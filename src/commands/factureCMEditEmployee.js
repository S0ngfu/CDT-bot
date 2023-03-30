const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
const { Bill, BillDetail, Enterprise, Employee } = require('../dbObjects.js');
const moment = require('moment');
const dotenv = require('dotenv');

dotenv.config();
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName('Modifier la facture')
		.setType(ApplicationCommandType.Message)
		.setDMPermission(false)
		.setDefaultMemberPermissions('0'),

	async execute(interaction) {
		const id = interaction.targetId;
		const bill = await Bill.findByPk(id, { include: [{ model: BillDetail }, { model: Enterprise }, { model: Employee }] });
		const employee = await Employee.findOne({
			where: {
				id_employee: interaction.user.id,
				date_firing: null,
			},
		});
		if (!employee) {
			return await interaction.reply({ content: 'Erreur, il semblerait que vous ne soyez pas un employé', ephemeral: true });
		}

		if (bill && bill.url) {
			if (bill.id_employe !== employee.id) {
				return await interaction.reply({ content: 'Vous ne pouvez pas modifier une facture que vous n\'avez pas faite', ephemeral:true });
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
