const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageManager, EmbedBuilder } = require('discord.js');
const { PhoneBook, Employee } = require('../dbObjects');
const Op = require('sequelize').Op;
const moment = require('moment');

moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

const emojiMonth = ['❄️', '☔', '🍀', '🌸', '☀️', '🌾', '🌩️', '🏖️', '🍃', '🍂', '🍁', '☃️'];

const updatePhoneBook = async (client) => {
	const phoneBook = await PhoneBook.findOne();

	if (phoneBook) {
		const messageManager = new MessageManager(await client.channels.fetch(phoneBook.id_channel));
		const message_to_update = await messageManager.fetch(phoneBook.id_message);

		await message_to_update.edit({
			embeds: [await getPhoneBookEmbed(client)],
		});
	}
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('annuaire')
		.setDescription('Permet d\'afficher l\'annuaire de l\'entreprise')
		.setDefaultPermission(false),
	async execute(interaction) {
		const existing_phoneBook = await PhoneBook.findOne();

		if (existing_phoneBook) {
			try {
				const messageManager = new MessageManager(await interaction.client.channels.fetch(existing_phoneBook.id_channel));
				const phoneBook_to_delete = await messageManager.fetch(existing_phoneBook.id_message);
				await phoneBook_to_delete.delete();
			}
			catch (error) {
				console.error(error);
			}

			const message = await interaction.reply({
				embeds: [await getPhoneBookEmbed(interaction.client)],
				fetchReply: true,
			});

			await existing_phoneBook.update({
				id_message: message.id,
				id_channel: interaction.channelId,
			});
		}
		else {
			const message = await interaction.reply({
				embeds: [await getPhoneBookEmbed(interaction.client)],
				fetchReply: true,
			});

			await PhoneBook.upsert({
				id_message: message.id,
				id_channel: interaction.channelId,
			});
		}
	},
	updatePhoneBook,
};

const getPhoneBookEmbed = async (client) => {
	const embed = new EmbedBuilder()
		.setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL(false) })
		.setTitle('Numéros de téléphone')
		.setTimestamp(new Date());

	const phones = await Employee.findAll({
		attributes: [
			'id_employee',
			'name_employee',
			'phone_number',
			'date_hiring',
		],
		where: {
			phone_number: { [Op.ne]: null },
			date_firing: null,
		},
		order: [['date_hiring', 'ASC'], ['name_employee', 'ASC']],
	});

	let message = '';
	let date = '';
	phones.map(p => {
		const e_date = `${emojiMonth[moment(p.date_hiring).month()]} __${moment(p.date_hiring).format('MMMM YYYY')[0].toUpperCase()}${moment(p.date_hiring).format('MMMM YYYY').slice(1)}`;
		if (e_date !== date) {
			date = e_date;
			message += `\n${date} :__\n`;
		}
		message += `> **${p.name_employee}** : 555-**${p.phone_number}**\n`;
	});
	message && embed.setDescription(message);

	return embed;
};