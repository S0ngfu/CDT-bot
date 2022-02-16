const cron = require('node-cron');
const { Grossiste } = require('../dbObjects.js');
const { Op, fn, col } = require('sequelize');
const { MessageEmbed } = require('discord.js');
const dotenv = require('dotenv');
const moment = require('moment');

dotenv.config();
const guildId = process.env.GUILD_ID;
const channelId = process.env.CHANNEL_COMPTA_ID;

module.exports = {
	initCrons(client) {
		cron.schedule('58 5 * * *', async function() {
			const dateBegin = new Date(new Date() - 24 * 60 * 60 * 1000);
			const dateEnd = new Date();
			const data = await Grossiste.findAll({
				attributes: [
					'id_employe',
					[fn('sum', col('quantite')), 'total'],
				],
				where: {
					timestamp: {
						[Op.gt]: dateBegin,
					},
				},
				group: ['id_employe'],
				raw: true,
			});

			const channel = await client.channels.fetch(channelId);
			await channel.send({ embeds: [await getEmbed(client, data, dateBegin, dateEnd)] });
		});
	},
};

const getEmbed = async (client, data, dateBegin, dateEnd) => {
	let sum = 0;
	const embed = new MessageEmbed()
		.setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL(false) })
		.setTitle('Détail bouteilles déclarées')
		.setDescription('Période du ' + moment(dateBegin).format('DD/MM/YY H:mm') + ' au ' + moment(dateEnd).format('DD/MM/YY H:mm'))
		.setColor('#18913E')
		.setTimestamp(new Date());

	const guild = await client.guilds.fetch(guildId);


	if (data && data.length > 0) {
		await Promise.all(data.map(async d => {
			sum += d.total;
			const user = await guild.members.fetch(d.id_employe);
			const name = user ? user.nickname ? user.nickname : user.user.username : d.id_employe;
			embed.addField(name, name + ' a déclaré ' + d.total.toLocaleString('fr') + ' bouteilles', false);
		}));
		embed.addField('Total ', sum.toLocaleString('fr') + ' bouteilles vendues', false);
	}

	return embed;
};