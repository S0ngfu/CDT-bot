const { SlashCommandBuilder, time } = require('@discordjs/builders');
const { MessageEmbed, MessageManager, MessageActionRow, MessageButton } = require('discord.js');
const { Bill, BillDetail, Grossiste, Enterprise } = require('../dbObjects.js');
const { Op, literal, fn, col } = require('sequelize');
const moment = require('moment');
const dotenv = require('dotenv');
const pdf = require('pdf-creator-node');
const fs = require('fs');

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
		.setName('impot')
		.setDescription('Permet d\'avoir la déclaration d\'impôt')
		.setDefaultPermission(false)
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
		const year = interaction.options.getInteger('annee');
		const week = interaction.options.getInteger('semaine');
		const start = moment();
		const end = moment();
		const credit = [];
		const debit = [];
		const impot_html = fs.readFileSync('src/template/impot.html', 'utf-8');
		const document_pdf = {
			html: impot_html,
			data: {},
			path:'./output.pdf',
			type: '',
		};
		const options_pdf = {
			format: 'A4',
			orientation: 'portrait',
			border: '10mm',
			header: {
				height: '45mm',
				contents: '<div style="text-align: center;">header</div>',
			},
			footer: {
				height: '28mm',
				contents: {
					first: 'Cover page',
					2: 'Second page',
					default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>',
					last: 'Last Page',
				},
			},
		};

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

		const grossiste = await Grossiste.findOne({
			attributes: [
				[fn('sum', col('quantite')), 'total'],
			],
			where: {
				timestamp: {
					[Op.between]: [+start, +end],
				},
			},
		});

		const bills = await Bill.findAll({
			where: {
				date_bill: {
					[Op.between]: [+start, +end],
				},
				ignore_transaction: false,
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

		console.log(grossiste.dataValues.total);

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
						debit['Particulier'] = (debit['Particulier'] || 0) + bd.dataValues.sum;
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
				debit['Particulier'] = (debit['Particulier'] || 0) + b.dataValues.sum_bill;
			}
		}

		const sorted_credit = [];
		const sorted_debit = [];
		for (const k of Object.keys(credit).sort()) {
			sorted_credit[k] = credit[k];
		}
		for (const k of Object.keys(debit).sort()) {
			sorted_debit[k] = debit[k];
		}

		pdf
			.create(document_pdf, options_pdf)
			.then((res) => {
				console.log(res);
			})
			.catch((error) => {
				console.error(error);
			});

		await interaction.reply({ content: 'Hello', ephemeral: true });
	},
};
