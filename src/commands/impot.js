const { SlashCommandBuilder } = require('@discordjs/builders');
const { AttachmentBuilder, time, EmbedBuilder } = require('discord.js');
const { Bill, BillDetail, Grossiste, Enterprise, Expense } = require('../dbObjects.js');
const { Op, fn, col } = require('sequelize');
const moment = require('moment');
const dotenv = require('dotenv');
const pdf = require('pdf-creator-node');
const fs = require('fs');

dotenv.config();
const channelId = process.env.CHANNEL_COMPTA_ID;
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

module.exports = {
	data: new SlashCommandBuilder()
		.setName('impôt')
		.setDescription('Permet d\'avoir la déclaration d\'impôt')
		.setDMPermission(false)
		.setDefaultMemberPermissions('0')
		.addIntegerOption((option) =>
			option
				.setName('annee')
				.setDescription('Permet de choisir l\'année de la déclaration d\'impôt')
				.setRequired(false),
		)
		.addIntegerOption((option) =>
			option
				.setName('semaine')
				.setDescription('Permet de choisir la semaine de la déclaration d\'impôt')
				.setRequired(false)
				.setMinValue(1)
				.setMaxValue(53),
		),
	async execute(interaction) {
		// Do not send impôt in an other channel than the compta channel
		if (interaction.channelId === channelId) {
			await interaction.deferReply();
		}
		else {
			await interaction.deferReply({ ephemeral: true });
		}

		const year = interaction.options.getInteger('annee') || moment().year();
		const week = interaction.options.getInteger('semaine') || moment().week();
		const start = moment();
		const end = moment();
		const credit = [];
		const debit = [];
		let sum_dirty_money = 0;

		if (year) {
			start.year(year);
			end.year(year);
		}
		if (week) {
			start.week(week);
			end.week(week);
		}

		start.startOf('week').hours(6);
		end.startOf('week').hours(6).add(1, 'w');

		const start_date = start;
		const end_date = moment(end).subtract(1, 'd');

		const grossiste = await getGrossiste(start, end);
		const bills = await getBills(start, end);
		const dirty_bills = await getDirtyMoney(start, end);

		for (const b of bills) {
			if (b.bill_details.length > 0) {
				for (const bd of b.bill_details) {
					if (b.enterprise) {
						if (bd.dataValues.sum > 0) {
							credit[b.enterprise.dataValues.name_enterprise] = (credit[b.enterprise.dataValues.name_enterprise] || 0) + bd.dataValues.sum;
						}
						else {
							debit[b.enterprise.dataValues.name_enterprise] = (debit[b.enterprise.dataValues.name_enterprise] || 0) + bd.dataValues.sum;
						}
					}
					else if (bd.dataValues.sum > 0) {
						credit['Particulier'] = (credit['Particulier'] || 0) + bd.dataValues.sum;
					}
					else {
						debit['Autre'] = (debit['Autre'] || 0) + bd.dataValues.sum;
					}
				}
			}
			else if (b.enterprise) {
				if (b.dataValues.sum_bill > 0) {
					credit[b.enterprise.dataValues.name_enterprise] = (credit[b.enterprise.dataValues.name_enterprise] || 0) + b.dataValues.sum_bill;
				}
				else {
					debit[b.enterprise.dataValues.name_enterprise] = (debit[b.enterprise.dataValues.name_enterprise] || 0) + b.dataValues.sum_bill;
				}
			}
			else if (b.dataValues.sum_bill > 0) {
				credit['Particulier'] = (credit['Particulier'] || 0) + b.dataValues.sum_bill;
			}
			else {
				debit['Autre'] = (debit['Autre'] || 0) + b.dataValues.sum_bill;
			}
		}

		for (const db of dirty_bills) {
			if (db.dataValues.sum_bill < 0) {
				sum_dirty_money = sum_dirty_money - db.dataValues.sum_bill;
			}
		}

		let grossiste_civil = grossiste.dataValues.total * 2;
		const sorted_credit = [];
		const sorted_debit = [];
		let total_credit = 0;
		let total_debit = 0;

		for (const k of Object.keys(credit).sort()) {
			if (k === 'Particulier') {
				grossiste_civil += credit[k];
			}
			else {
				sorted_credit.push({ key: k, value: credit[k].toLocaleString('en') });
				total_credit += credit[k];
			}
		}
		for (const k of Object.keys(debit).sort()) {
			sorted_debit.push({ key: k, value: (-debit[k]).toLocaleString('en') });
			total_debit += -debit[k];
		}

		const ca = grossiste_civil + total_credit;

		const max_deductible = 150000;
		const resultat = total_debit > max_deductible ? ca - max_deductible : ca - total_debit;
		const taux_impot = resultat <= 250000 ? 15 : resultat <= 500000 ? 17 : 19;

		// Création pdf
		const impot_html = fs.readFileSync('src/template/impot.html', 'utf-8');
		const logoB64Content = fs.readFileSync('src/assets/Logo_CDT.png', { encoding: 'base64' });
		const logoSrc = 'data:image/jpeg;base64,' + logoB64Content;
		const document_pdf = {
			html: impot_html,
			data: {
				start_date: start_date.format('DD/MM/YYYY'),
				end_date: end_date.format('DD/MM/YYYY'),
				logo: logoSrc,
				grossiste_civil: grossiste_civil ? grossiste_civil.toLocaleString('en') : 0,
				sorted_credit,
				sorted_debit,
				total_credit: total_credit ? total_credit.toLocaleString('en') : 0,
				total_debit: total_debit ? total_debit > max_deductible ? `${total_debit.toLocaleString('en')} (retenu ${max_deductible.toLocaleString('en')})` : total_debit.toLocaleString('en') : 0,
				sum_dirty_money: sum_dirty_money.toLocaleString('en'),
				ca_net: resultat ? resultat.toLocaleString('en') : 0,
				taux_impot: taux_impot,
				impot: resultat ? Math.round((resultat) / 100 * taux_impot).toLocaleString('en') : 0,
			},
			path:'./output.pdf',
			type: 'buffer',
			// 'buffer' or 'stream' or ''
		};
		const options_pdf = {
			format: 'A4',
			orientation: 'portrait',
			border: '10mm',
			/* header: {
				// height: '45mm',
				// contents: '<div style="text-align: center;">Déclaration d\'impôt</div>',
				// contents: '<link rel="stylesheet" type="text/css" href="../assets/impot.css" />',
			},*/
			footer: {
				height: '5mm',
				contents: {
					default: '<div style="color: #444;text-align: right;">{{page}}/{{pages}}</div>',
				},
			},
		};

		const embedExpenses = await getEmbedExpenses(interaction.client, await getExpenses(start, end), start, end);

		pdf
			.create(document_pdf, options_pdf)
			.then(async (res) => {
				if (interaction.channelId === channelId) {
					await interaction.editReply({
						content: `Déclaration d'impôt du ${time(start_date.unix(), 'D')} au ${time(end_date.unix(), 'D')}. Montant à payer : $${resultat ? Math.round((resultat) / 100 * taux_impot).toLocaleString('en') : 0}`,
						files: [new AttachmentBuilder(res, { name: `CDT-${year}-${week}_declaration_impot.pdf` })],
					});
					await interaction.followUp({ embeds: [embedExpenses] });
				}
				else {
					const channel = await interaction.client.channels.fetch(channelId);
					await channel.send({
						content: `Déclaration d'impôt du ${time(start_date.unix(), 'D')} au ${time(end_date.unix(), 'D')}. Montant à payer : $${resultat ? Math.round((resultat) / 100 * taux_impot).toLocaleString('en') : 0}`,
						files: [new AttachmentBuilder(res, { name: `CDT-${year}-${week}_declaration_impot.pdf` })],
					});
					await channel.send({
						embeds: [embedExpenses],
					});
					await interaction.editReply({ content: `Déclaration d'impôt du ${time(start_date.unix(), 'D')} au ${time(end_date.unix(), 'D')} disponible dans ${channel}` });
				}
			})
			.catch((error) => {
				console.error(error);
			});
	},
};

const getGrossiste = async (start, end) => {
	return await Grossiste.findOne({
		attributes: [
			[fn('sum', col('quantite')), 'total'],
		],
		where: {
			timestamp: {
				[Op.between]: [+start, +end],
			},
		},
	});
};

const getBills = async (start, end) => {
	return await Bill.findAll({
		where: {
			date_bill: {
				[Op.between]: [+start, +end],
			},
			ignore_transaction: false,
			nontaxable: false,
		},
		include: [
			{
				model: BillDetail,
			},
			{
				model: Enterprise,
			},
		],
	});
};

const getExpenses = async (start, end) => {
	return await Expense.findAll({
		attributes: [
			'libelle_expense',
			[fn('sum', col('sum_expense')), 'total'],
		],
		where: {
			date_expense: {
				[Op.between]: [+start, +end],
			},
		},
		group: ['libelle_expense'],
		raw: true,
	});
};

const getDirtyMoney = async (start, end) => {
	return await Bill.findAll({
		where: {
			date_bill: {
				[Op.between]: [+start, +end],
			},
			ignore_transaction: false,
			nontaxable: false,
			dirty_money:true,
		},
	});
};

const getEmbedExpenses = async (client, data, dateBegin, dateEnd) => {
	let sum = 0;
	const embed = new EmbedBuilder()
		.setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL(false) })
		.setTitle('Dépenses de la semaine')
		.setDescription('Période du ' + moment(dateBegin).format('DD/MM/YY H:mm') + ' au ' + moment(dateEnd).format('DD/MM/YY H:mm'))
		.setColor('#18913E')
		.setTimestamp(new Date());

	if (data && data.length > 0) {
		for (const d of data) {
			sum += d.total;
			embed.addFields({ name: d.libelle_expense, value: `$${d.total.toLocaleString('en')}`, inline: true });
		}
		embed.addFields({ name: 'Total', value: `$${sum.toLocaleString('en')}`, inline: false });
	}

	return embed;
};