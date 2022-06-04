const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageManager, MessageEmbed } = require('discord.js');
const { PhoneBook, Employee } = require('../dbObjects');
const Op = require('sequelize').Op;

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
		.setDescription('Gestion du système de prise de service')
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
				console.log('Error: ', error);
			}

			const message = await interaction.reply({
				embeds: [await getPhoneBookEmbed(interaction)],
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
	const phones = await Employee.findAll({
		attributes: [
			'id_employee',
			'name_employee',
			'phone_number',
		],
		where: {
			phone_number: { [Op.ne]: null },
			date_firing: null,
		},
		order: [['name_employee', 'ASC']],
	});

	let message = '';
	phones.map(p => {
		message += `**${p.name_employee}** : 555-**${p.phone_number}**\n`;
	});

	const embed = new MessageEmbed()
		.setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL(false) })
		.setTitle('Annuaire')
		.setDescription(message)
		.setTimestamp(new Date());


	return embed;
};