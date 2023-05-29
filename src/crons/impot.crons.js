const cron = require('node-cron');
const { Bill, BillDetail, Grossiste, Enterprise, Expense } = require('../dbObjects.js');
const { Op, fn, col } = require('sequelize');
const { AttachmentBuilder, EmbedBuilder, time } = require('discord.js');
const dotenv = require('dotenv');
const moment = require('moment');
const pdf = require('pdf-creator-node');
const fs = require('fs');
const phantomjs = require('phantomjs');

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
			const max_dirty_money = 50000;
			const start = moment().subtract(1, 'w').startOf('week').hours(6);
			const end = moment().startOf('week').hours(6);
			const start_date = start;
			const end_date = moment(end).subtract(1, 'd');

			const grossiste = await getGrossiste(start, end);
			const bills = await getBills(start, end);
			const billsNonTaxable = await getBillsNonTaxable(start, end);
			const dirty_bills = await getDirtyMoney(start, end);
			const enterprises = (await Enterprise.findAll({ attributes: ['id_enterprise', 'name_enterprise', 'seuil_dedu'] })).reduce((arr, cur) => {
				arr[cur.dataValues.id_enterprise] = { name_enterprise: cur.dataValues.name_enterprise, seuil_dedu: cur.dataValues.seuil_dedu };
				return arr;
			}, {});

			let current_dirty = 0;
			for (const b of bills) {
				if (b.bill_details.length > 0) {
					for (const bd of b.bill_details) {
						if (b.enterprise) {
							if (bd.dataValues.sum > 0) {
								b.enterprise.dataValues.consider_as_particulier
									? credit['Particulier'] = (credit['Particulier'] || 0) + bd.dataValues.sum
									: credit[b.enterprise.dataValues.id_enterprise] = (credit[b.enterprise.dataValues.id_enterprise] || 0) + bd.dataValues.sum;
							}
							else {
								b.enterprise.dataValues.consider_as_particulier
									? debit['Autre'] = { total: (debit['Autre']?.total || 0) - bd.dataValues.sum }
									: debit[b.enterprise.dataValues.id_enterprise] = { total: (debit[b.enterprise.dataValues.id_enterprise]?.total || 0) - bd.dataValues.sum };
							}
						}
						else if (bd.dataValues.sum > 0) {
							credit['Particulier'] = (credit['Particulier'] || 0) + bd.dataValues.sum;
						}
						else {
							debit['Autre'] = { total: (debit['Autre']?.total || 0) - bd.dataValues.sum };
						}
					}
				}
				else if (b.enterprise) {
					if (b.dataValues.sum_bill > 0) {
						b.enterprise.dataValues.consider_as_particulier
							? credit['Particulier'] = (credit['Particulier'] || 0) + b.dataValues.sum_bill
							: credit[b.enterprise.dataValues.id_enterprise] = (credit[b.enterprise.dataValues.id_enterprise] || 0) + b.dataValues.sum_bill;
					}
					else if (b.dataValues.dirty_money) {
						const sum = -b.dataValues.sum_bill + current_dirty > max_dirty_money ? max_dirty_money - current_dirty : -b.dataValues.sum_bill;
						current_dirty -= b.dataValues.sum_bill;
						b.enterprise.dataValues.consider_as_particulier
							? debit['Autre'] = {
								total: (debit['Autre']?.total || 0) - b.dataValues.sum_bill,
								real: (debit['Autre']?.real || 0) - sum,
							}
							: debit[b.enterprise.dataValues.id_enterprise] = {
								total: (debit[b.enterprise.dataValues.id_enterprise]?.total || 0) - b.dataValues.sum_bill,
								real: (debit[b.enterprise.dataValues.id_enterprise]?.real || 0) + sum,
							};
					}
					else {
						b.enterprise.dataValues.consider_as_particulier
							? debit['Autre'] = { total: (debit['Autre']?.total || 0) - b.dataValues.sum_bill }
							: debit[b.enterprise.dataValues.id_enterprise] = { total: (debit[b.enterprise.dataValues.id_enterprise]?.total || 0) - b.dataValues.sum_bill };
					}
				}
				else if (b.dataValues.sum_bill > 0) {
					credit['Particulier'] = (credit['Particulier'] || 0) + b.dataValues.sum_bill;
				}
				else if (b.dataValues.dirty_money) {
					const sum = -b.dataValues.sum_bill + current_dirty > max_dirty_money ? max_dirty_money - current_dirty : -b.dataValues.sum_bill;
					current_dirty -= b.dataValues.sum_bill;
					debit['Autre'] = {
						total: (debit['Autre']?.total || 0) - b.dataValues.sum_bill,
						real: (debit['Autre']?.real || 0) + sum,
					};
				}
				else {
					debit['Autre'] = { total: (debit['Autre']?.total || 0) - b.dataValues.sum_bill };
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
					if (debit[k].real) {
						sorted_debit.push({ key: k, value: `${debit[k].total.toLocaleString('en')} (retenu ${debit[k].real.toLocaleString('en')})` });
						total_debit += debit[k].real;
					}
					else {
						sorted_debit.push({ key: k, value: debit[k].total.toLocaleString('en') });
						total_debit += debit[k].total;
					}
				}
				else if (enterprises[k].seuil_dedu !== 0 && debit[k].total > enterprises[k].seuil_dedu) {
					if (debit[k].real && debit[k].real > enterprises[k].seuil_dedu) {
						sorted_debit.push({ key: enterprises[k].name_enterprise, value: `${debit[k].total.toLocaleString('en')} (retenu ${enterprises[k].real.toLocaleString('en')})` });
						total_debit += enterprises[k].real;
					}
					else {
						sorted_debit.push({ key: enterprises[k].name_enterprise, value: `${debit[k].total.toLocaleString('en')} (retenu ${enterprises[k].seuil_dedu.toLocaleString('en')})` });
						total_debit += enterprises[k].seuil_dedu;
					}
				}
				else if (debit[k].real) {
					sorted_debit.push({ key: enterprises[k].name_enterprise, value: `${debit[k].total.toLocaleString('en')} (retenu ${enterprises[k].real.toLocaleString('en')})` });
					total_debit += debit[k].real;
				}
				else {
					sorted_debit.push({ key: enterprises[k].name_enterprise, value: `${debit[k].total.toLocaleString('en')}` });
					total_debit += debit[k].total;
				}
			}

			const ca = grossiste_civil + total_credit;

			// const max_deductible = 150000;
			// const resultat = total_debit > max_deductible ? ca - max_deductible : ca - total_debit;
			const resultat = ca - total_debit;
			const taux_impot = resultat < 150000 ? 11 : resultat <= 250000 ? 15 : resultat <= 500000 ? 17 : 19;
			const montant_impot = resultat > 0 ? Math.round((resultat) / 100 * taux_impot) : 0;

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
					sum_dirty_money: sum_dirty_money > max_dirty_money ? `${sum_dirty_money.toLocaleString('en')} (retenu ${max_dirty_money.toLocaleString('en')})` : sum_dirty_money.toLocaleString('en'),
					ca_net: resultat ? resultat.toLocaleString('en') : 0,
					taux_impot: taux_impot,
					impot: montant_impot.toLocaleString('en'),
				},
				path:'./output.pdf',
				type: 'buffer',
				// 'buffer' or 'stream' or ''
			};
			const options_pdf = {
				phantomPath: phantomjs.path,
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

			const embedExpenses = await getEmbedExpenses(client, await getExpenses(start, end), billsNonTaxable, resultat, start, end);

			pdf
				.create(document_pdf, options_pdf)
				.then(async (res) => {
					const channel = await client.channels.fetch(channelId);
					await channel.send({
						content: `Déclaration d'impôt du ${time(start_date.unix(), 'D')} au ${time(end_date.unix(), 'D')}. Montant à payer : $${resultat > 0 ? Math.round((resultat) / 100 * taux_impot).toLocaleString('en') : 0}`,
						files: [new AttachmentBuilder(res, { name: `CDT-${year}-${week}_declaration_impot.pdf` })],
					});
					await channel.send({
						embeds: [embedExpenses],
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

const getBillsNonTaxable = async (start, end) => {
	return await Bill.sum('sum_bill', {
		where: {
			date_bill: {
				[Op.between]: [+start, +end],
			},
			ignore_transaction: false,
			nontaxable: true,
			url: null,
		},
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

const getEmbedExpenses = async (client, expenses, billsNT, ca_net, dateBegin, dateEnd) => {
	let sum_expenses = 0;
	const embed = new EmbedBuilder()
		.setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL(false) })
		.setTitle('Rapport financier de la semaine')
		.setDescription('Période du ' + moment(dateBegin).format('DD/MM/YY H:mm') + ' au ' + moment(dateEnd).format('DD/MM/YY H:mm'))
		.setColor('#18913E')
		.setTimestamp(new Date());

	if (expenses && expenses.length > 0) {
		for (const e of expenses) {
			sum_expenses -= e.total;
			embed.addFields({ name: e.libelle_expense, value: `$-${e.total.toLocaleString('en')}`, inline: true });
		}
	}

	sum_expenses += billsNT;
	const resultat = ca_net + sum_expenses;

	embed.addFields({ name: 'Factures non impôsable', value: `$${billsNT ? billsNT.toLocaleString('en') : 0}`, inline: true });
	embed.addFields({ name: 'Total argent dépensé', value: `$${sum_expenses.toLocaleString('en')}`, inline: false });
	embed.addFields({ name: 'Chiffre d\'affaires', value: `$${ca_net.toLocaleString('en')}`, inline: false });
	embed.addFields({ name: 'Résultat', value: `$${resultat.toLocaleString('en')}`, inline: false });

	return embed;
};
