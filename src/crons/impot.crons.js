const cron = require('node-cron');
const { Bill, BillDetail, Grossiste, Enterprise } = require('../dbObjects.js');
const { Op, fn, col } = require('sequelize');
const { MessageAttachment } = require('discord.js');
const dotenv = require('dotenv');
const moment = require('moment');
const pdf = require('pdf-creator-node');
const fs = require('fs');

dotenv.config();
const channelId = process.env.CHANNEL_COMPTA_ID;

module.exports = {
	initCrons(client) {
		cron.schedule('0 6 * * Monday', async function() {
			const year = moment().subtract(1, 'd').year();
			const week = moment().subtract(1, 'd').week();
			const credit = [];
			const debit = [];
			const start = moment().subtract(1, 'w').startOf('week').hours(6);
			const end = moment().startOf('week').hours(6);
			const start_date = start;
			const end_date = moment(end).subtract(1, 'd');

			const grossiste = await getGrossiste(start, end);
			const bills = await getBills(start, end);

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

			const ca_net = grossiste_civil + total_credit - total_debit;
			const taux_impot = ca_net <= 50000 ? 15 : ca_net <= 250000 ? 20 : 22;

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
					total_debit: total_debit ? total_debit.toLocaleString('en') : 0,
					ca_net: ca_net ? ca_net.toLocaleString('en') : 0,
					taux_impot: taux_impot,
					impot: ca_net ? Math.round((ca_net) / 100 * taux_impot).toLocaleString('en') : 0,
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


			pdf
				.create(document_pdf, options_pdf)
				.then(async (res) => {
					const channel = await client.channels.fetch(channelId);
					await channel.send({
						content: `Déclaration d'impôt du ${start_date.format('DD/MM/YYYY')} au ${end_date.format('DD/MM/YYYY')}. Montant à payer : $${ca_net ? Math.round((ca_net) / 100 * taux_impot).toLocaleString('en') : 0}`,
						files: [new MessageAttachment(res, `CDT-${year}-${week}_declaration_impot.pdf`)],
					});
				})
				.catch((error) => {
					console.error(error);
				});
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
