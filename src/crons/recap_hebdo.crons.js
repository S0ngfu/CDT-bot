const cron = require('node-cron');
const { Bill, Grossiste, OpStock, Fuel } = require('../dbObjects.js');
const { Op, literal, col, fn } = require('sequelize');
const { EmbedBuilder, time, DiscordAPIError } = require('discord.js');

const moment = require('moment');
const dotenv = require('dotenv');

dotenv.config();
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

const guildId = process.env.GUILD_ID;
const channelId = process.env.CHANNEL_COMPTA_ID;

module.exports = {
	initCrons(client) {
		cron.schedule('2 6 * * Monday', async function() {
			const start = moment().subtract(1, 'w').startOf('week').hours(6);
			const end = moment().startOf('week').hours(6);

			const employeeData = await getEmployeeData(start, end);
			const refuelData = await getRefuelData(start, end);

			const channel = await client.channels.fetch(channelId);
			await channel.send({ embeds: await getEmbed(client, employeeData, refuelData, start, end) });
		});
	},
};

const getEmbed = async (client, employeeData, refuelData, start, end) => {
	const guild = await client.guilds.fetch(guildId);
	const already_fetched = new Map();
	const arrayEmbed = [];
	let embed = new EmbedBuilder()
		.setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL(false) })
		.setTitle('Récap hebdomadaire')
		.setColor('#18913E')
		.setTimestamp(new Date())
		.setDescription('Période du ' + time(start.unix(), 'F') + ' au ' + time(end.unix(), 'F'));

	if (employeeData && Object.keys(employeeData).length > 0) {
		const employees = new Array();
		for (const k of Object.keys(employeeData)) {
			if (!already_fetched.has(k)) {
				try {
					const user = await guild.members.fetch(k);
					already_fetched.set(k, user ? user.nickname ? user.nickname : user.user.username : k);
				}
				catch (error) {
					if (error instanceof DiscordAPIError && error.code === 10007) {
						console.warn(`recap_hebdo_cron: user with id ${k} not found`);
					}
					else {
						console.error(error);
					}
					already_fetched.set(k, k);
				}
			}
			employees.push({ name: already_fetched.get(k), data: employeeData[k] });
		}

		employees.sort((a, b) => {
			return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
		});

		employees.forEach((e, i) => {
			let value = '';
			value += `${e.data.total_grossiste ? e.data.total_grossiste.toLocaleString('en') : '0'} bouteilles vendues ; `;
			value += `${e.data.nb_livraison ? e.data.nb_livraison.toLocaleString('en') : '0'} livraisons `;
			value += `(+ $${e.data.livraison_pos ? e.data.livraison_pos.toLocaleString('en') : '0'}/- $${e.data.livraison_neg ? e.data.livraison_neg.toLocaleString('en') : '0'}) ; `;
			value += `${e.data.stock ? e.data.stock.toLocaleString('en') : '0'} mise en stock`;
			embed.addFields({ name: e.name, value: value });
			if (i % 25 === 24) {
				arrayEmbed.push(embed);
				embed = new EmbedBuilder()
					.setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL(false) })
					.setTitle('Récap hebdomadaire')
					.setDescription('Période du ' + time(start.unix()) + ' au ' + time(end.unix()))
					.setColor('#18913E')
					.setTimestamp(new Date());
			}
		});

		if (employees.length % 25 !== 0) {
			arrayEmbed.push(embed);
		}
	}
	else {
		arrayEmbed.push(embed);
	}

	embed = new EmbedBuilder()
		.setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL(false) })
		.setTitle('Ravitaillements effectués dans la semaine ⛽')
		.setColor('#ff9f0f')
		.setTimestamp(new Date())
		.setDescription('Période du ' + time(start.unix(), 'F') + ' au ' + time(end.unix(), 'F'));

	if (refuelData[0].total_qt !== null) {
		embed.addFields({ name: 'Total', value: `${refuelData[0].total_qt.toLocaleString('fr')}L pour $${refuelData[0].total_sum.toLocaleString('en')}` });
	}
	else {
		embed.addFields({ name: 'Total', value: 'Aucun ravitaillement n\'a été effectué sur cette période' });
	}

	arrayEmbed.push(embed);

	return arrayEmbed;
};

const getRefuelData = async (start, end) => {
	const refuelData = await Fuel.findAll({
		attributes: [
			[fn('sum', col('qt_fuel')), 'total_qt'],
			[fn('sum', col('sum_fuel')), 'total_sum'],
		],
		where: { date_fuel: { [Op.between]: [+start, +end] } },
		raw: true,
	});

	return refuelData;
};

const getEmployeeData = async (start, end) => {
	const data = [];
	const grossisteData = await Grossiste.findAll({
		attributes: [
			'id_employe',
			[fn('sum', col('quantite')), 'total'],
		],
		where: { timestamp: { [Op.between]: [+start, +end] } },
		group: ['id_employe'],
		raw: true,
	});

	const livraisonData = await Bill.findAll({
		attributes: [
			'id_employe',
			[fn('count', col('id_bill')), 'nb_livraison'],
			literal('SUM(IIF(sum_bill < 0, sum_bill, 0)) as sum_neg'),
			literal('SUM(IIF(sum_bill > 0, sum_bill, 0)) as sum_pos'),
		],
		where: { date_bill: { [Op.between]: [+start, +end] }, url: { [Op.not]: null } },
		group: ['id_employe'],
		raw: true,
	});

	const opStockData = await OpStock.findAll({
		attributes: [
			'id_employe',
			[fn('sum', col('qt')), 'qt_stock'],
		],
		where: { timestamp: { [Op.between]: [+start, +end] }, qt: { [Op.gt]: 0 } },
		group: ['id_employe'],
		raw: true,
	});

	// build array with key id_employe
	for (const g of grossisteData) {
		data[g.id_employe] = { total_grossiste: g.total };
	}

	for (const l of livraisonData) {
		data[l.id_employe] = { ...data[l.id_employe], nb_livraison: l.nb_livraison, livraison_pos: l.sum_pos, livraison_neg: l.sum_neg };
	}

	for (const o of opStockData) {
		data[o.id_employe] = { ...data[o.id_employe], stock: o.qt_stock };
	}

	return data;
};
