const { ContextMenuCommandBuilder, time } = require('@discordjs/builders');
const { MessageEmbed, MessageManager } = require('discord.js');
const { Bill, Enterprise, Tab, BillDetail } = require('../dbObjects.js');
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

const guildId = process.env.GUILD_ID;
const channelId = process.env.CHANNEL_LIVRAISON_ID;

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName('Supprimer la facture')
		.setType(ApplicationCommandType.Message)
		.setDefaultPermission(false),

	async execute(interaction) {
		const id = interaction.targetId;
		const bill = await Bill.findByPk(id);

		if (!bill) {
			return await interaction.reply({ content: `Aucune facture trouvé ayant l'id ${id}`, ephemeral:true });
		}

		const enterprise = bill.id_enterprise ? await Enterprise.findByPk(bill.id_enterprise) : null;

		if (bill.on_tab) {
			const tab = await Tab.findOne({
				where: { id_message: enterprise.id_message },
			});

			if (tab) {
				const messageManager = new MessageManager(await interaction.client.channels.fetch(tab.id_channel));
				const tab_to_update = await messageManager.fetch(tab.id_message);

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
				const message_to_delete = await messageManager.fetch(bill.id_bill);
				await message_to_delete.delete();
			}
			catch (error) {
				console.log('Error: ', error);
			}
		}

		await BillDetail.destroy({
			where: { id_bill: bill.id_bill },
		});

		await Bill.destroy({
			where: { id_bill: bill.id_bill },
		});

		const guild = await interaction.client.guilds.fetch(guildId);
		let user = null;
		try {
			user = await guild.members.fetch(bill.id_employe);
		}
		catch (error) {
			console.log('ERR - historique_tab: ', error);
		}
		const employe = user ? user.nickname ? user.nickname : user.user.username : bill.id_employe;
		const name_client = enterprise ? (enterprise.emoji_enterprise ? enterprise.emoji_enterprise + ' ' + enterprise.name_enterprise : enterprise.name_enterprise) : 'Particulier';

		return await interaction.reply({
			content: `La facture ${bill.id_bill} de $${bill.sum_bill.toLocaleString('en')} ${bill.on_tab ? 'sur l\'ardoise ' : ''}` +
			`faite le ${time(moment(bill.date_bill, 'YYYY-MM-DD hh:mm:ss.S ZZ').unix(), 'F')} à ${name_client} par ${employe} a été supprimé`,
			ephemeral: true,
		});
	},
};

const getArdoiseEmbed = async (tab = null) => {
	const embed = new MessageEmbed()
		.setTitle('Ardoises')
		.setColor(tab ? tab.colour_tab : '000000')
		.setTimestamp(new Date());

	if (tab) {
		const enterprises = await tab.getEnterprises();
		for (const e of enterprises) {
			let field = 'Crédit restant : $' + (e.sum_ardoise ? e.sum_ardoise.toLocaleString('en') : '0');
			field += e.facture_max_ardoise ? '\nFacture max : $' + e.facture_max_ardoise : '';
			field += e.info_ardoise ? '\n' + e.info_ardoise : '';
			embed.addField(e.emoji_enterprise ? e.emoji_enterprise + ' ' + e.name_enterprise : e.name_enterprise, field, true);
		}
	}

	return embed;
};
