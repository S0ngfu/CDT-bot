const { SlashCommandBuilder, time } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, SelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageManager } = require('discord.js');
const { Enterprise, Product, Group, BillModel, Recipe, OpStock, Stock } = require('../dbObjects.js');
const { Bill } = require('../services/bill.services');
const { updateFicheEmploye } = require('./employee.js');
const dotenv = require('dotenv');
const moment = require('moment');

dotenv.config();
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});
const channelId = process.env.CHANNEL_LIVRAISON_ID;
const channelExpenseId = process.env.CHANNEL_EXPENSE_ID;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('calculo')
		.setDescription('Affiche la calculatrice du domaine')
		.setDMPermission(false)
		.setDefaultMemberPermissions('0'),
	async execute(interaction, previous_bill = 0, model_name = null, model_emoji = null, model_to_load = null) {
		const bill = await Bill.initialize(interaction, previous_bill, model_name, model_to_load);
		const selectedProducts = new Array();
		let infoPressed = false;
		let selectedGroup = (await Group.findOne({ attributes: ['id_group'], order: [['default_group', 'DESC']] })).id_group;
		if (model_to_load) {
			selectedGroup = model_to_load.data.selectedGroup;
		}
		const message = await interaction.reply({
			content: 'Don Telo!',
			embeds: [await getEmbed(interaction, bill)],
			components: [await getEnterprises(bill.getEnterpriseId()), await getProductGroups(selectedGroup), ...await getProducts(selectedGroup, selectedProducts, bill), getSendButton(bill, infoPressed)],
			ephemeral: true,
			fetchReply: true,
		});

		const messageFilter = m => {return m.author.id === interaction.user.id;};
		const messageCollector = interaction.channel.createMessageCollector({ filter: messageFilter, time: 840000 });
		const componentCollector = message.createMessageComponentCollector({ time: 840000 });
		// ----------------------------------------------------------------------- 900000 = 15 minutes ; 30000 = 30 secondes // time: 30000

		messageCollector.on('collect', async m => {
			if (!isNaN(m.content) && parseInt(Number(m.content)) == m.content) {
				if (interaction.guild.members.me.permissionsIn(m.channelId).has('ManageMessages')) {
					try {
						await m.delete();
					}
					catch (error) {
						console.error(error);
					}
				}
				await bill.addProducts(selectedProducts.splice(0, selectedProducts.length), m.content);
				await interaction.editReply({ embeds: [await getEmbed(interaction, bill)], components: componentCollector.ended ? [] : [await getEnterprises(bill.getEnterpriseId()), await getProductGroups(selectedGroup), ...await getProducts(selectedGroup, selectedProducts, bill), getSendButton(bill, infoPressed)] });
			}
			if (infoPressed) {
				if (interaction.guild.members.me.permissionsIn(m.channelId).has('ManageMessages')) {
					try {
						await m.delete();
					}
					catch (error) {
						console.error(error);
					}
				}
				bill.setInfo(m.content);
				infoPressed = false;
				await interaction.editReply({ embeds: [await getEmbed(interaction, bill)], components: componentCollector.ended ? [] : [await getEnterprises(bill.getEnterpriseId()), await getProductGroups(selectedGroup), ...await getProducts(selectedGroup, selectedProducts, bill), getSendButton(bill, infoPressed)] });
			}
		});

		componentCollector.on('collect', async i => {
			try {
				await i.deferUpdate();
			}
			catch (error) {
				console.error(error);
				messageCollector.stop();
				componentCollector.stop();
			}
			if (i.customId === 'send') {
				// maybe edit message to say : 'Message envoyé, vous pouvez maintenant 'dismiss' ce message'
				messageCollector.stop();
				componentCollector.stop();
				if (bill.isModify()) {
					const messageManager = await interaction.client.channels.fetch(channelId);
					const bill_to_update = await messageManager.messages.fetch({ message: bill.getPreviousBill().id_bill });
					await bill_to_update.edit({ embeds: [await getEmbed(interaction, bill)] });
					await bill.modify(interaction);
				}
				else if (bill.isModel()) {
					const save_bill = new Object();
					const products = new Map();

					for (const [id, product] of bill.getProducts()) {
						products.set(id, { quantity: product.quantity });
					}
					save_bill.id_enterprise = bill.getEnterpriseId() || 0;
					save_bill.on_tab = bill.getOnTab();
					save_bill.info = bill.getInfo();
					save_bill.products = Object.fromEntries(products);
					save_bill.selectedGroup = selectedGroup;

					if (model_to_load) {
						model_to_load.update({
							data: save_bill,
							name: model_name,
							emoji: model_emoji,
						});
					}
					else {
						await BillModel.create({
							id_employe: interaction.user.id,
							data: save_bill,
							name: model_name,
							emoji: model_emoji,
						});
					}

					await updateFicheEmploye(interaction.client, interaction.user.id);

					return interaction.editReply({ content: 'Votre modèle de facture a bien été sauvegardé', embeds: [] });
				}
				else {
					const messageManager = await interaction.client.channels.fetch(channelId);
					const send = await messageManager.send({ embeds: [await getEmbed(interaction, bill)] });
					await bill.save(send.id, interaction, send.url);
					if (bill.getSum() < 0 && !bill.getOnTab()) {
						const reply_frais = await interaction.followUp({ content: `Souhaitez-vous demander un remboursement de $${-bill.getSum()} suite à cet achat ?`, components: [getYesNoButtons()], fetchReply: true });
						const yesnoCollector = reply_frais.createMessageComponentCollector({ time: 120000 });

						yesnoCollector.on('collect', async yn => {
							yesnoCollector.stop();
							if (yn.customId === 'yes') {
								const messageExpenseManager = await interaction.client.channels.fetch(channelExpenseId);
								await messageExpenseManager.send({
									embeds: [await getDeclareExpenseEmbed(bill, send.url)],
									components: [getCheckButton()],
								});
							}
						});
						yesnoCollector.on('end', async () => {
							await reply_frais.delete();
						});
					}

					for (const [key, p] of bill.getProducts()) {
						if (p.quantity > 0) {
							const product = await Product.findOne({
								where: { id_product: key, calculo_check: true },
							});
							if (product) {
								const recipe = await Recipe.findOne({
									where: { id_product_made: key },
									include: [
										{ model: Product, as: 'ingredient_1' },
										{ model: Product, as: 'ingredient_2' },
										{ model: Product, as: 'ingredient_3' },
									] });
								if (recipe) {
									const nb_recipe = Math.floor(p.quantity / recipe.quantity_product_made);
									const msg = [];
									if (recipe.id_product_ingredient_1 && recipe.ingredient_1.id_message) {
										msg.push(`${nb_recipe * recipe.quantity_product_ingredient_1} ${recipe.ingredient_1.name_product}`);
									}
									if (recipe.id_product_ingredient_2 && recipe.ingredient_2.id_message) {
										msg.push(`${nb_recipe * recipe.quantity_product_ingredient_2} ${recipe.ingredient_2.name_product}`);
									}
									if (recipe.id_product_ingredient_3 && recipe.ingredient_3.id_message) {
										msg.push(`${nb_recipe * recipe.quantity_product_ingredient_3} ${recipe.ingredient_3.name_product}`);
									}

									if (msg.length > 0) {
										let string_msg = '';
										if (msg.length === 3) {
											string_msg = `${msg[0]}, ${msg[1]} et ${msg[2]}`;
										}
										else if (msg.length === 2) {
											string_msg = `${msg[0]} et ${msg[1]}`;
										}
										else {
											string_msg = `${msg[0]}`;
										}

										const reply_recipe = await interaction.followUp({ content: `Souhaitez-vous retirer du stock ${string_msg} ?`, components: [getYesNoButtons()], fetchReply: true });
										const recipe_componentCollector = reply_recipe.createMessageComponentCollector({ time: 120000 });

										recipe_componentCollector.on('collect', async r_i => {
											recipe_componentCollector.stop();
											if (r_i.customId === 'yes') {
												const mess_stocks = new Set();
												if (recipe.id_product_ingredient_1 && recipe.ingredient_1.id_message) {
													await OpStock.create({
														id_product: recipe.id_product_ingredient_1,
														qt: -(nb_recipe * recipe.quantity_product_ingredient_1),
														id_employe: r_i.user.id,
														timestamp: moment().tz('Europe/Paris'),
													});
													mess_stocks.add(recipe.ingredient_1.id_message);
													recipe.ingredient_1.decrement({ qt: nb_recipe * recipe.quantity_product_ingredient_1 });
												}
												if (recipe.id_product_ingredient_2 && recipe.ingredient_2.id_message) {
													await OpStock.create({
														id_product: recipe.id_product_ingredient_2,
														qt: -(nb_recipe * recipe.quantity_product_ingredient_2),
														id_employe: r_i.user.id,
														timestamp: moment().tz('Europe/Paris'),
													});
													mess_stocks.add(recipe.ingredient_2.id_message);
													recipe.ingredient_2.decrement({ qt: nb_recipe * recipe.quantity_product_ingredient_2 });
												}
												if (recipe.id_product_ingredient_3 && recipe.ingredient_3.id_message) {
													await OpStock.create({
														id_product: recipe.id_product_ingredient_3,
														qt: -(nb_recipe * recipe.quantity_product_ingredient_3),
														id_employe: r_i.user.id,
														timestamp: moment().tz('Europe/Paris'),
													});
													mess_stocks.add(recipe.ingredient_3.id_message);
													recipe.ingredient_3.decrement({ qt: nb_recipe * recipe.quantity_product_ingredient_3 });
												}

												for (const mess of mess_stocks) {
													const stock_update = await Stock.findOne({
														where: { id_message: mess },
													});
													const stock_messageManager = new MessageManager(await interaction.client.channels.fetch(stock_update.id_channel));
													const stock_to_update = await stock_messageManager.fetch({ message: stock_update.id_message });
													await stock_to_update.edit({
														embeds: [await getStockEmbed(stock_update)],
														components: await getStockButtons(stock_update),
													});
												}
												const reply_ingredient = await interaction.followUp({ content: `Retrait de ${string_msg}`, fetchReply: true });
												await new Promise(r => setTimeout(r, 5000));
												await reply_ingredient.delete();
											}
										});

										recipe_componentCollector.on('end', async () => {
											await reply_recipe.delete();
										});
									}
								}
							}
						}
					}
				}
			}
			else if (i.customId === 'cancel') {
				messageCollector.stop();
				componentCollector.stop();
				// maybe edit message to say : 'Canceled, vous pouvez maintenant 'dismiss' ce message'
			}
			else if (i.customId === 'info') {
				infoPressed = !infoPressed;
				await i.editReply({ embeds: [await getEmbed(interaction, bill)], components: componentCollector.ended ? [] : [await getEnterprises(bill.getEnterpriseId()), await getProductGroups(selectedGroup), ...await getProducts(selectedGroup, selectedProducts, bill), getSendButton(bill, infoPressed)] });
			}
			else if (i.customId === 'on_tab') {
				bill.switchOnTab();
				await i.editReply({ embeds: [await getEmbed(interaction, bill)], components: componentCollector.ended ? [] : [await getEnterprises(bill.getEnterpriseId()), await getProductGroups(selectedGroup), ...await getProducts(selectedGroup, selectedProducts, bill), getSendButton(bill, infoPressed)] });
			}
			else if (i.customId === 'on_tab_bis') {
				bill.switchOnTab();
				await i.editReply({ embeds: [await getEmbed(interaction, bill)], components: componentCollector.ended ? [] : [await getEnterprises(bill.getEnterpriseId()), await getProductGroups(selectedGroup), ...await getProducts(selectedGroup, selectedProducts, bill), getSendButton(bill, infoPressed)] });
			}
			else if (i.customId === 'enterprises') {
				await bill.setEnterprise(parseInt(i.values[0]));
				await i.editReply({ embeds: [await getEmbed(interaction, bill)], components: componentCollector.ended ? [] : [await getEnterprises(bill.getEnterpriseId()), await getProductGroups(selectedGroup), ...await getProducts(selectedGroup, selectedProducts, bill), getSendButton(bill, infoPressed)] });
			}
			else {
				const [componentCategory, componentId] = i.customId.split('_');
				if (componentCategory === 'product') {
					const productClicked = selectedProducts.indexOf(parseInt(componentId));
					if (productClicked !== -1) {
						selectedProducts.splice(productClicked, 1);
					}
					else {
						selectedProducts.push(parseInt(componentId));
					}
					await i.editReply({ embeds: [await getEmbed(interaction, bill)], components: componentCollector.ended ? [] : [await getEnterprises(bill.getEnterpriseId()), await getProductGroups(selectedGroup), ...await getProducts(selectedGroup, selectedProducts, bill), getSendButton(bill, infoPressed)] });
				}
				else if (componentCategory === 'group') {
					selectedGroup = parseInt(componentId);
					await i.editReply({ embeds: [await getEmbed(interaction, bill)], components: componentCollector.ended ? [] : [await getEnterprises(bill.getEnterpriseId()), await getProductGroups(selectedGroup), ...await getProducts(selectedGroup, selectedProducts, bill), getSendButton(bill, infoPressed)] });
				}
			}
		});

		componentCollector.on('end', () => {
			interaction.editReply({ components: [] });
		});
	},
	async buttonClicked(interaction) {
		const [, modelId] = interaction.customId.split('_');
		const model = await BillModel.findOne({ where: { id: modelId } });
		this.execute(interaction, 0, null, null, model);
	},
};

const getEmbed = async (interaction, bill) => {
	const ent = bill.getEnterprise();
	const embed = new EmbedBuilder()
		.setAuthor(bill.getAuthor())
		.setTimestamp(new Date());
	if (bill.isModify()) {
		embed.setDescription(`${bill.getInfo()}\nFait le ${time(bill.getDate(), 'F')}\nModifié par ${bill.getModifyAuthor().name} à ${time(bill.getModifyDate(), 'F')}`);
	}
	else {
		embed.setDescription(`${bill.getInfo()}\nFait le ${time(bill.getDate(), 'F')}`);
	}

	/*
	if (interaction.client.application.owner === null) {
		const application = await interaction.client.application.fetch();
		embed.setFooter('Développé par ' + application.owner.username, application.owner.avatarURL(false));
	}
	else {
		embed.setFooter('Développé par ' + interaction.client.application.owner.username, interaction.client.application.owner.avatarURL(false));
	} */

	if (!ent) {
		embed.setTitle('Client : Particulier');
		embed.setColor('#ac0606');
	}
	else {
		embed.setTitle('Client : ' + (ent.emoji_enterprise ? ent.name_enterprise + ' ' + ent.emoji_enterprise : ent.name_enterprise));
		embed.setColor(ent.color_enterprise);
	}

	for (const [, product] of bill.getProducts()) {
		embed.addFields({ name: product.emoji ? product.emoji + ' ' + product.name : product.name, value: product.quantity + ' x $' + product.price + ' = $' + product.sum.toLocaleString('en'), inline: true });
	}

	const max_ardoise = bill.getOnTab() && bill.getEnterprise().facture_max_ardoise ? (' / $' + bill.getEnterprise().facture_max_ardoise) : '';

	embed.addFields({ name: 'Total', value: '$' + bill.getSum().toLocaleString('en') + (bill.getOnTab() ? ' sur l\'ardoise' + max_ardoise : ''), inline: false });

	return embed;
};

const getEnterprises = async (default_enterprise = 0) => {
	const enterprises = await Enterprise.findAll({ attributes: ['id_enterprise', 'name_enterprise', 'emoji_enterprise'], where: { deleted: false }, order: [['name_enterprise', 'ASC']] });

	const formatedE = enterprises.map(e => {
		return e.emoji_enterprise ?
			{ label: e.name_enterprise, emoji: e.emoji_enterprise, value: e.id_enterprise.toString(), default: default_enterprise === e.id_enterprise }
			:
			{ label: e.name_enterprise, value: e.id_enterprise.toString(), default: default_enterprise === e.id_enterprise };
	});

	const row = new ActionRowBuilder()
		.addComponents(
			new SelectMenuBuilder()
				.setCustomId('enterprises')
				.addOptions([{ label: 'Particulier', emoji: '🤸', value: '0', default: default_enterprise === 0 ? true : false }, ...formatedE]),
		);
	return row;
};

const getProducts = async (group, selectedProducts = [], bill) => {
	const formatedP = [];
	const products = await Product.findAll({
		attributes: ['id_product', 'name_product', 'emoji_product', 'default_price'],
		order: [['name_product', 'ASC']],
		where: { id_group: group, is_available: true, deleted: false },
	});

	for (const p of products) {
		if (bill.getEnterprise() && await bill.getEnterprise().getProductPrice(p.id_product) !== 0) {
			formatedP.push(new ButtonBuilder({ customId: 'product_' + p.id_product.toString(), label: p.name_product, emoji: p.emoji_product, style: selectedProducts.includes(p.id_product) ? ButtonStyle.Success : ButtonStyle.Secondary }));
		}
		else if (!bill.getEnterprise() && p.default_price !== 0) {
			formatedP.push(new ButtonBuilder({ customId: 'product_' + p.id_product.toString(), label: p.name_product, emoji: p.emoji_product, style: selectedProducts.includes(p.id_product) ? ButtonStyle.Success : ButtonStyle.Secondary }));
		}
	}

	if (formatedP.length === 0) {
		return [];
	}

	if (formatedP.length <= 5) {
		return [new ActionRowBuilder().addComponents(...formatedP)];
	}
	else {
		let middle = Math.ceil(formatedP.length / 2);
		middle = middle > 5 ? 5 : middle;
		return [new ActionRowBuilder().addComponents(...formatedP.slice(0, middle)), new ActionRowBuilder().addComponents(...formatedP.slice(middle, 10))];
	}
};

const getProductGroups = async (group = 1) => {
	const groups = await Group.findAll({ attributes: ['id_group', 'name_group', 'emoji_group'], order: [['name_group', 'ASC']] });
	const formatedG = groups.slice(0, 5).map(g => {
		return new ButtonBuilder({ customId: 'group_' + g.id_group.toString(), label: g.name_group, emoji: g.emoji_group, style: g.id_group === group ? ButtonStyle.Primary : ButtonStyle.Secondary, disabled: g.id_group === group ? true : false });
	});

	return new ActionRowBuilder().addComponents(...formatedG);
};

const getSendButton = (bill, infoPressed) => {
	const canSend = bill.isModel() ? true : bill.getProducts().size;
	if (bill.getEnterprise()?.id_message) {
		return new ActionRowBuilder().addComponents([
			new ButtonBuilder({ customId: 'send', label: bill.isModify() ? 'Modifier' : bill.isModel() ? 'Sauvegarder' : 'Envoyer', emoji: bill.isModel() ? '💾' : '', style: bill.isModify() ? ButtonStyle.Primary : ButtonStyle.Success, disabled: !canSend }),
			new ButtonBuilder({ customId: 'cancel', label: 'Annuler', style: ButtonStyle.Danger }),
			new ButtonBuilder({ customId: 'info', label: 'Info', emoji: '🗒️', style: infoPressed ? ButtonStyle.Success : ButtonStyle.Secondary }),
			new ButtonBuilder({ customId: 'on_tab', label: 'Sur l\'ardoise', emoji: '💵', style: ButtonStyle.Primary, disabled: bill.getOnTab() }),
			new ButtonBuilder({ customId: 'on_tab_bis', label: 'Facturé', emoji: '🧾', style: ButtonStyle.Secondary, disabled: !bill.getOnTab() }),
		]);
	}
	return new ActionRowBuilder().addComponents([
		new ButtonBuilder({ customId: 'send', label: bill.isModify() ? 'Modifier' : bill.isModel() ? 'Sauvegarder' : 'Envoyer', emoji: bill.isModel() ? '💾' : '', style: bill.isModify() ? ButtonStyle.Primary : ButtonStyle.Success, disabled: !canSend }),
		new ButtonBuilder({ customId: 'cancel', label: 'Annuler', style: ButtonStyle.Danger }),
		new ButtonBuilder({ customId: 'info', label: 'Info', emoji: '🗒️', style: infoPressed ? ButtonStyle.Success : ButtonStyle.Secondary }),
	]);
};

const getDeclareExpenseEmbed = async (bill, url) => {
	const embed = new EmbedBuilder()
		.setAuthor(bill.getAuthor())
		.setTimestamp(new Date())
		.setTitle('Demande de remboursement')
		.setDescription(`Montant à rembourser : $${-bill.getSum()}\n[Voir la facture](${url})`);

	return embed;
};

const getYesNoButtons = () => {
	return new ActionRowBuilder().addComponents([
		new ButtonBuilder({ customId: 'yes', label: 'Oui', style: ButtonStyle.Success }),
		new ButtonBuilder({ customId: 'no', label: 'Non', style: ButtonStyle.Danger }),
	]);
};

const getCheckButton = () => {
	return new ActionRowBuilder().addComponents([
		new ButtonBuilder({ customId: 'fraispro', emoji: '✅', style: ButtonStyle.Secondary }),
	]);
};

const getStockEmbed = async (stock = null) => {
	const embed = new EmbedBuilder()
		.setTitle('Stocks')
		.setColor(stock ? stock.colour_stock : '000000')
		.setTimestamp(new Date());

	if (stock) {
		const products = await stock.getProducts({ order: [['order', 'ASC'], ['id_group', 'ASC'], ['name_product', 'ASC']] });
		for (const p of products) {
			const title = p.emoji_product ? (p.emoji_product + ' ' + p.name_product) : p.name_product;
			const field = (p.qt >= p.qt_wanted ? '✅' : '❌') + ' ' + (p.qt || 0) + ' / ' + (p.qt_wanted || 0);
			embed.addFields({ name: title, value: field, inline: true });
		}
	}

	return embed;
};

const getStockButtons = async (stock = null) => {
	if (stock) {
		const products = await stock.getProducts({ order: [['order', 'ASC'], ['id_group', 'ASC'], ['name_product', 'ASC']] });
		if (products && products.length > 0) {
			const formatedProducts = products.map(p => {
				return new ButtonBuilder({ customId: 'stock_' + p.id_product.toString(), label: p.name_product, emoji: p.emoji_product, style: ButtonStyle.Secondary });
			});
			if (formatedProducts.length <= 5) {
				return [new ActionRowBuilder().addComponents(...formatedProducts)];
			}
			if (formatedProducts.length <= 10) {
				return [
					new ActionRowBuilder().addComponents(...formatedProducts.slice(0, 5)),
					new ActionRowBuilder().addComponents(...formatedProducts.slice(5)),
				];
			}
			if (formatedProducts.length <= 15) {
				return [
					new ActionRowBuilder().addComponents(...formatedProducts.slice(0, 5)),
					new ActionRowBuilder().addComponents(...formatedProducts.slice(5, 10)),
					new ActionRowBuilder().addComponents(...formatedProducts.slice(10)),
				];
			}
			if (formatedProducts.length <= 20) {
				return [
					new ActionRowBuilder().addComponents(...formatedProducts.slice(0, 5)),
					new ActionRowBuilder().addComponents(...formatedProducts.slice(5, 10)),
					new ActionRowBuilder().addComponents(...formatedProducts.slice(10, 15)),
					new ActionRowBuilder().addComponents(...formatedProducts.slice(15)),
				];
			}
			if (formatedProducts.length <= 25) {
				return [
					new ActionRowBuilder().addComponents(...formatedProducts.slice(0, 5)),
					new ActionRowBuilder().addComponents(...formatedProducts.slice(5, 10)),
					new ActionRowBuilder().addComponents(...formatedProducts.slice(10, 15)),
					new ActionRowBuilder().addComponents(...formatedProducts.slice(15, 20)),
					new ActionRowBuilder().addComponents(...formatedProducts.slice(20)),
				];
			}
		}
	}

	return [];
};
