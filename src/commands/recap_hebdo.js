const { SlashCommandBuilder, time } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Bill, Grossiste, OpStock } = require('../dbObjects.js');
const { Op, literal, col, fn } = require('sequelize');
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

module.exports = {
	data: new SlashCommandBuilder()
		.setName('recap_hebdo')
		.setDescription('Permet d\'avoir le récap hebdomadaire des tâches effectuées')
		.setDMPermission(false)
		.setDefaultMemberPermissions('0'),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });
		const start = moment().startOf('week').hours(6);
		const end = moment().startOf('week').add(7, 'd').hours(6);
		let message = null;
		const employees = new Map();

		const data = await getData(start, end);

		message = await interaction.editReply({
			embeds: await getEmbed(interaction, data, start, end, employees),
			components: [getButtons()],
			fetchReply: true,
			ephemeral: true,
		});

		const componentCollector = message.createMessageComponentCollector({ time: 840000 });

		componentCollector.on('collect', async i => {
			await i.deferUpdate();
			if (i.customId === 'next') {
				start.add('1', 'w');
				end.add('1', 'w');
				await i.editReply({
					embeds: await getEmbed(interaction, await getData(start, end), start, end, employees),
					components: [getButtons()],
				});
			}
			else if (i.customId === 'previous') {
				start.subtract('1', 'w');
				end.subtract('1', 'w');
				await i.editReply({
					embeds: await getEmbed(interaction, await getData(start, end), start, end, employees),
					components: [getButtons()],
				});
			}
		});

		componentCollector.on('end', () => {
			interaction.editReply({ components: [] });
		});
	},
};

const getData = async (start, end) => {
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

const getButtons = () => {
	return new ActionRowBuilder().addComponents([
		new ButtonBuilder({ customId: 'previous', label: 'Précédent', style: ButtonStyle.Primary }),
		new ButtonBuilder({ customId: 'next', label: 'Suivant', style: ButtonStyle.Primary }),
	]);
};

const getEmbed = async (interaction, data, start, end, fetched_employees) => {
	const guild = await interaction.client.guilds.fetch(guildId);
	let embed = new EmbedBuilder()
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
		.setTitle('Récap hebdomadaire')
		.setColor('#18913E')
		.setTimestamp(new Date())
		.setDescription('Période du ' + time(start.unix(), 'F') + ' au ' + time(end.unix(), 'F'));

	if (data && Object.keys(data).length > 0) {
		const arrayEmbed = [];
		const employees = new Array();
		for (const k of Object.keys(data)) {
			if (!fetched_employees.has(k)) {
				try {
					const user = await guild.members.fetch(k);
					fetched_employees.set(k, user ? user.nickname ? user.nickname : user.user.username : k);
				}
				catch (error) {
					console.error(`recap_hebdo: user with id ${k} not found`);
					fetched_employees.set(k, k);
				}
			}
			employees.push({ name: fetched_employees.get(k), data: data[k] });
		}

		employees.sort((a, b) => {
			return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
		});

		employees.forEach((e, i) => {
			let value = '';
			value += `${e.data.total_grossiste ? e.data.total_grossiste.toLocaleString('en') : '0'} farines vendues ; `;
			value += `${e.data.nb_livraison ? e.data.nb_livraison.toLocaleString('en') : '0'} livraisons `;
			value += `(+ $${e.data.livraison_pos ? e.data.livraison_pos.toLocaleString('en') : '0'}/- $${e.data.livraison_neg ? e.data.livraison_neg.toLocaleString('en') : '0'}) ; `;
			value += `${e.data.stock ? e.data.stock.toLocaleString('en') : '0'} mise en stock`;
			embed.addFields({ name: e.name, value: value });
			if (i % 25 === 24) {
				arrayEmbed.push(embed);
				embed = new EmbedBuilder()
					.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
					.setTitle('Récap hebdomadaire')
					.setDescription('Période du ' + time(start.unix()) + ' au ' + time(end.unix()))
					.setColor('#18913E')
					.setTimestamp(new Date());
			}
		});

		if (employees.length % 25 !== 0) {
			arrayEmbed.push(embed);
		}

		return arrayEmbed;
	}

	return [embed];
};
