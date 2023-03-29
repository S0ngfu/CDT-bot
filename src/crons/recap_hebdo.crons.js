const cron = require('node-cron');
const { Bill, Grossiste, OpStock, Fuel, Employee } = require('../dbObjects.js');
const { Op, literal, col, fn } = require('sequelize');
const { EmbedBuilder, time } = require('discord.js');

const moment = require('moment');
const dotenv = require('dotenv');

dotenv.config();
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

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
	const arrayEmbed = [];
	let embed = new EmbedBuilder()
		.setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL(false) })
		.setTitle('Récap hebdomadaire')
		.setColor('#18913E')
		.setTimestamp(new Date())
		.setDescription('Période du ' + time(start.unix(), 'F') + ' au ' + time(end.unix(), 'F'));

	if (employeeData && employeeData.size > 0) {
		const employees = new Array();
		for (const k of employeeData.keys()) {
			employees.push({ name: employeeData.get(k).name, data: employeeData.get(k) });
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
	const data = new Map();
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
		data.set(g.id_employe, { total_grossiste: g.total });
	}

	for (const l of livraisonData) {
		data.set(l.id_employe, { ...data.get(l.id_employe), nb_livraison: l.nb_livraison, livraison_pos: l.sum_pos, livraison_neg: l.sum_neg });
	}

	for (const o of opStockData) {
		data.set(o.id_employe, { ...data.get(o.id_employe), stock: o.qt_stock });
	}

	for (const [key, d] of data) {
		const employee = await Employee.findOne({ attributes: ['name_employee'], where: { id: key } });
		data.set(key, { ...d, name: employee.name_employee });
	}

	return data;
};
