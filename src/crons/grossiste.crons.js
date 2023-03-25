const cron = require('node-cron');
const { Grossiste } = require('../dbObjects.js');
const { Op, fn, col } = require('sequelize');
const { EmbedBuilder, time, DiscordAPIError } = require('discord.js');
const dotenv = require('dotenv');

dotenv.config();
const guildId = process.env.GUILD_ID;
const channelId = process.env.CHANNEL_COMPTA_ID;

module.exports = {
	initCrons(client) {
		cron.schedule('0 6 * * *', async function() {
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
	const fetched_employees = new Map();
	let embed = new EmbedBuilder()
		.setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL(false) })
		.setTitle('Détail bouteilles déclarées')
		.setDescription('Période du ' + time(dateBegin, 'F') + ' au ' + time(dateEnd, 'F'))
		.setColor('#18913E')
		.setTimestamp(new Date());

	const guild = await client.guilds.fetch(guildId);

	if (data && data.length > 0) {
		const arrayEmbed = [];
		const employees = new Array();
		await Promise.all(data.map(async d => {
			sum += d.total;
			if (!fetched_employees.has(d.id_employe)) {
				try {
					const user = await guild.members.fetch(d.id_employe);
					fetched_employees.set(d.id_employe, user ? user.nickname ? user.nickname : user.user.username : d.id_employe);
				}
				catch (error) {
					if (error instanceof DiscordAPIError && error.code === 10007) {
						console.warn(`grossite_cron: user with id ${d.id_employe} not found`);
					}
					else {
						console.error(error);
					}
					fetched_employees.set(d.id_employe, d.id_employe);
				}
			}
			employees.push({ name: fetched_employees.get(d.id_employe), bouteilles: d.total });
		}));

		employees.sort((a, b) => {
			return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
		});

		employees.forEach((e, i) => {
			embed.addFields({ name: e.name, value: e.name + ' a déclaré ' + e.bouteilles.toLocaleString('fr') + ' bouteilles', inline: false });
			if (i % 25 === 24) {
				arrayEmbed.push(embed);
				embed = new EmbedBuilder()
					.setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL(false) })
					.setTitle('Détail bouteilles déclarées')
					.setDescription('Période du ' + time(dateBegin, 'F') + ' au ' + time(dateEnd, 'F'))
					.setColor('#18913E')
					.setTimestamp(new Date());
			}
		});

		embed.addFields({ name: 'Total ', value: sum.toLocaleString('fr') + ' bouteilles vendues ($' + (sum * 2).toLocaleString('fr') + ')', inline: false });
		arrayEmbed.push(embed);

		return arrayEmbed;
	}

	embed.addFields({ name: 'Aucune donnée', value: 'Il faut croire que personne ne bosse ici' });
	return [embed];
};