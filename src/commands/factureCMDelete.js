const { ContextMenuCommandBuilder, time, ApplicationCommandType, MessageManager } = require('discord.js');
const { Bill, Enterprise, Tab, BillDetail, OpStock, Product, Stock, Employee } = require('../dbObjects.js');
const { getStockEmbed, getStockButtons } = require ('./stocks');
const { getArdoiseEmbed } = require ('./tab');
const moment = require('moment');
const dotenv = require('dotenv');
const { Op } = require('sequelize');

dotenv.config();
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

const channelId = process.env.CHANNEL_LIVRAISON_ID;

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName('Supprimer la facture')
		.setType(ApplicationCommandType.Message)
		.setDMPermission(false)
		.setDefaultMemberPermissions('0'),

	async execute(interaction) {
		const id = interaction.targetId;
		const bill = await Bill.findByPk(id, { include: [{ model: Employee }] });

		const employee = await Employee.findOne({
			where: {
				id_employee: interaction.user.id,
				date_firing: null,
			},
		});
		if (!employee) {
			return await interaction.reply({ content: 'Erreur, il semblerait que vous ne soyez pas un employé', ephemeral: true });
		}

		if (!bill) {
			return await interaction.reply({ content: `Aucune facture trouvé ayant l'id ${id}`, ephemeral:true });
		}

		await interaction.deferReply({ ephemeral: true });

		const enterprise = bill.id_enterprise ? await Enterprise.findByPk(bill.id_enterprise) : null;

		if (bill.on_tab) {
			const tab = await Tab.findOne({
				where: { id_message: enterprise.id_message },
			});

			if (tab) {
				const messageManager = new MessageManager(await interaction.client.channels.fetch(tab.id_channel));
				const tab_to_update = await messageManager.fetch({ message: tab.id_message });

				if (bill.ignore_transaction) {
					await Enterprise.increment({ sum_ardoise: parseInt(bill.sum_bill) }, { where: { id_enterprise: bill.id_enterprise } });
				}
				else {
					await Enterprise.decrement({ sum_ardoise: parseInt(bill.sum_bill) }, { where: { id_enterprise: bill.id_enterprise } });
				}

				await tab_to_update.edit({
					embeds: [await getArdoiseEmbed(tab)],
				});
			}
		}

		if (bill.url) {
			try {
				const messageManager = new MessageManager(await interaction.client.channels.fetch(channelId));
				const message_to_delete = await messageManager.fetch({ message: bill.id_bill });
				await message_to_delete.delete();
			}
			catch (error) {
				console.error(error);
			}
		}

		const mess_stocks = new Set();
		const bill_details = await BillDetail.findAll({
			where: { id_bill: bill.id_bill },
		});

		for (const op of bill_details) {
			await OpStock.create({
				id_product: op.id_product,
				qt: op.sum > 0 ? op.quantity : -op.quantity,
				id_employe: employee.id,
				timestamp: moment().tz('Europe/Paris'),
			});

			const stock_product = await Product.findOne({
				where: { id_product: op.id_product, id_message: { [Op.not]: null } },
			});

			if (stock_product) {
				mess_stocks.add(stock_product.id_message);
				if (op.sum > 0) {
					await stock_product.increment({ qt: parseInt(op.quantity) });
				}
				else {
					await stock_product.decrement({ qt: parseInt(op.quantity) });
				}
			}
		}

		for (const mess of mess_stocks) {
			const stock = await Stock.findOne({
				where: { id_message: mess },
			});
			const messageManager = new MessageManager(await interaction.client.channels.fetch(stock.id_channel));
			const stock_to_update = await messageManager.fetch({ message: stock.id_message });
			await stock_to_update.edit({
				embeds: [await getStockEmbed(stock)],
				components: await getStockButtons(stock),
			});
		}

		await BillDetail.destroy({
			where: { id_bill: bill.id_bill },
		});

		await Bill.destroy({
			where: { id_bill: bill.id_bill },
		});

		const name_client = enterprise ? (enterprise.emoji_enterprise ? enterprise.emoji_enterprise + ' ' + enterprise.name_enterprise : enterprise.name_enterprise) : 'Particulier';

		return await interaction.editReply({
			content: `La facture ${bill.id_bill} de $${bill.sum_bill.toLocaleString('en')} ${bill.on_tab ? 'sur l\'ardoise ' : ''}` +
			`faite le ${time(moment(bill.date_bill, 'YYYY-MM-DD hh:mm:ss.S ZZ').unix(), 'F')} à ${name_client} par ${bill.employee.name_employee} a été supprimé`,
			ephemeral: true,
		});
	},
};
