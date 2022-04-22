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
			await channel.send({ embeds: await getEmbed(client, data, dateBegin, dateEnd) });
		});
	},
};

const getEmbed = async (client, data, dateBegin, dateEnd) => {
	let sum = 0;
	let embed = new MessageEmbed()
		.setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL(false) })
		.setTitle('Détail farines déclarées')
		.setDescription('Période du ' + moment(dateBegin).format('DD/MM/YY H:mm') + ' au ' + moment(dateEnd).format('DD/MM/YY H:mm'))
		.setColor('#18913E')
		.setTimestamp(new Date());

	const guild = await client.guilds.fetch(guildId);

	if (data && data.length > 0) {
		const arrayEmbed = [];
		const employees = new Array();
		await Promise.all(data.map(async d => {
			sum += d.total;
			let user = null;
			try {
				user = await guild.members.fetch(d.id_employe);
			}
			catch (error) {
				console.log('ERR - historique_grossiste-cron: ', error);
			}
			const name = user ? user.nickname ? user.nickname : user.user.username : d.id_employe;
			employees.push({ name: name, farines: d.total });
		}));

		employees.sort((a, b) => {
			return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
		});

		employees.forEach((e, i) => {
			embed.addField(e.name, e.name + ' a déclaré ' + e.farines.toLocaleString('fr') + ' farines', false);
			if (i % 25 === 24) {
				arrayEmbed.push(embed);
				embed = new MessageEmbed()
					.setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL(false) })
					.setTitle('Détail farines déclarées')
					.setDescription('Période du ' + moment(dateBegin).format('DD/MM/YY H:mm') + ' au ' + moment(dateEnd).format('DD/MM/YY H:mm'))
					.setColor('#18913E')
					.setTimestamp(new Date());
			}
		});

		embed.addField('Total ', sum.toLocaleString('fr') + ' farines vendues ($' + (sum * 2).toLocaleString('fr') + ')', false);
		arrayEmbed.push(embed);

		return arrayEmbed;
	}

	embed.addField('Aucune donnée', 'Il faut croire que personne ne bosse ici');
	return [embed];
};