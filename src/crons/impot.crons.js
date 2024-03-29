const cron = require('node-cron');
const { Bill, BillDetail, Grossiste, Enterprise } = require('../dbObjects.js');
const { Op, fn, col } = require('sequelize');
const { AttachmentBuilder, time } = require('discord.js');
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
			const credit = {};
			const debit = {};
			let sum_dirty_money = 0;
			const start = moment().subtract(1, 'w').startOf('week').hours(6);
			const end = moment().startOf('week').hours(6);
			const start_date = start;
			const end_date = moment(end).subtract(1, 'd');

			const grossiste = await getGrossiste(start, end);
			const bills = await getBills(start, end);
			const dirty_bills = await getDirtyMoney(start, end);
			const enterprises = (await Enterprise.findAll({ attributes: ['id_enterprise', 'name_enterprise', 'seuil_dedu'] })).reduce((arr, cur) => {
				arr[cur.dataValues.id_enterprise] = { name_enterprise: cur.dataValues.name_enterprise, seuil_dedu: cur.dataValues.seuil_dedu };
				return arr;
			}, {});

			for (const b of bills) {
				if (b.bill_details.length > 0) {
					for (const bd of b.bill_details) {
						if (b.enterprise) {
							if (bd.dataValues.sum > 0) {
								credit[b.enterprise.dataValues.id_enterprise] = (credit[b.enterprise.dataValues.id_enterprise] || 0) + bd.dataValues.sum;
							}
							else {
								debit[b.enterprise.dataValues.id_enterprise] = (debit[b.enterprise.dataValues.id_enterprise] || 0) + bd.dataValues.sum;
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
						credit[b.enterprise.dataValues.id_enterprise] = (credit[b.enterprise.dataValues.id_enterprise] || 0) + b.dataValues.sum_bill;
					}
					else {
						debit[b.enterprise.dataValues.id_enterprise] = (debit[b.enterprise.dataValues.id_enterprise] || 0) + b.dataValues.sum_bill;
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
					sorted_credit.push({ key: enterprises[k].name_enterprise, value: credit[k].toLocaleString('en') });
					total_credit += credit[k];
				}
			}
			for (const k of Object.keys(debit).sort()) {
				// eslint-disable-next-line no-prototype-builtins
				if (!enterprises.hasOwnProperty(k)) {
					sorted_debit.push({ key: k, value: (-debit[k]).toLocaleString('en') });
					total_debit += -debit[k];
				}
				else if (enterprises[k].seuil_dedu !== 0 && -debit[k] > enterprises[k].seuil_dedu) {
					sorted_debit.push({ key: enterprises[k].name_enterprise, value: `${(-debit[k]).toLocaleString('en')} (retenu ${enterprises[k].seuil_dedu.toLocaleString('en')}$)` });
					total_debit += enterprises[k].seuil_dedu;
				}
				else {
					sorted_debit.push({ key: enterprises[k].name_enterprise, value: `${(-debit[k]).toLocaleString('en')}` });
					total_debit += -debit[k];
				}
			}

			const ca = grossiste_civil + total_credit;

			// const max_deductible = 150000;
			// const resultat = total_debit > max_deductible ? ca - max_deductible : ca - total_debit;
			const resultat = ca - total_debit;
			const taux_impot = resultat < 200000 ? 5 : resultat <= 500000 ? 17 : 19;

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
					// total_debit: total_debit ? total_debit > max_deductible ? `${total_debit.toLocaleString('en')} (retenu ${max_deductible.toLocaleString('en')})` : total_debit.toLocaleString('en') : 0,
					total_debit: total_debit ? total_debit.toLocaleString('en') : 0,
					sum_dirty_money: sum_dirty_money.toLocaleString('en'),
					ca_net: resultat ? resultat.toLocaleString('en') : 0,
					taux_impot: taux_impot,
					impot: resultat > 0 ? Math.round((resultat) / 100 * taux_impot).toLocaleString('en') : 0,
				},
				path:'./output.pdf',
				type: 'buffer',
				// 'buffer' or 'stream' or ''
			};
			const options_pdf = {
				childProcessOptions: { env: { OPENSSL_CONF: '/dev/null' } },
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
						content: `Déclaration d'impôt du ${time(start_date.unix(), 'D')} au ${time(end_date.unix(), 'D')}. Montant à payer : $${resultat > 0 ? Math.round((resultat) / 100 * taux_impot).toLocaleString('en') : 0}`,
						files: [new AttachmentBuilder(res, { name: `CDT-${year}-${week}_declaration_impot.pdf` })],
					});
				})
				.catch(async (error) => {
					console.error(error);
					const channel = await client.channels.fetch(channelId);
					return await channel.send({ content: 'Erreur lors de la génération de la déclaration d\'impôt' });
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
