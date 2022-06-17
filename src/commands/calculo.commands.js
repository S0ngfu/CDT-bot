const { SlashCommandBuilder, time } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageSelectMenu, MessageButton, MessageManager } = require('discord.js');
const { Enterprise, Product, Group } = require('../dbObjects.js');
const { Bill } = require('../services/bill.services');
const dotenv = require('dotenv');

dotenv.config();
const channelId_vente = process.env.CHANNEL_LIVRAISON_ID;
const channelId_achat = process.env.CHANNEL_ACHAT_ID;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('calcublé')
		.setDescription('Affiche la calculatrice du Blé d\'Or')
		.setDefaultPermission(false),
	async execute(interaction, previous_bill = 0) {
		const bill = await Bill.initialize(interaction, previous_bill);
		const selectedProducts = new Array();
		let infoPressed = false;
		let selectedGroup = (await Group.findOne({ attributes: ['id_group'], order: [['default_group', 'DESC']] })).id_group;
		const message = await interaction.reply({
			content: 'd\'Or!',
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
				if (interaction.guild.me.permissionsIn(m.channelId).has('MANAGE_MESSAGES')) {
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
				if (interaction.guild.me.permissionsIn(m.channelId).has('MANAGE_MESSAGES')) {
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
				messageCollector.stop();
				componentCollector.stop();
				if (bill.isModify()) {
					let new_message = null;
					if (bill.getPreviousBill().sum_bill > 0) {
						if (bill.getSum() > 0) {
							const messageManager = await interaction.client.channels.fetch(channelId_vente);
							const bill_to_update = await messageManager.messages.fetch(bill.getPreviousBill().id_bill);
							await bill_to_update.edit({ embeds: [await getEmbed(interaction, bill)] });
						}
						else {
							const messageManagerVente = new MessageManager(await interaction.client.channels.fetch(channelId_vente));
							const message_to_delete = await messageManagerVente.fetch(bill.getPreviousBill().id_bill);
							await message_to_delete.delete();

							const messageManagerAchat = bill.getSum() > 0 ? await interaction.client.channels.fetch(channelId_achat) : await interaction.client.channels.fetch(channelId_achat);
							new_message = await messageManagerAchat.send({ embeds: [await getEmbed(interaction, bill)] });
						}
					}
					else if (bill.getSum() > 0) {
						const messageManagerAchat = new MessageManager(await interaction.client.channels.fetch(channelId_achat));
						const message_to_delete = await messageManagerAchat.fetch(bill.getPreviousBill().id_bill);
						await message_to_delete.delete();

						const messageManagerVente = bill.getSum() > 0 ? await interaction.client.channels.fetch(channelId_vente) : await interaction.client.channels.fetch(channelId_achat);
						new_message = await messageManagerVente.send({ embeds: [await getEmbed(interaction, bill)] });
					}
					else {
						const messageManager = await interaction.client.channels.fetch(channelId_achat);
						const bill_to_update = await messageManager.messages.fetch(bill.getPreviousBill().id_bill);
						await bill_to_update.edit({ embeds: [await getEmbed(interaction, bill)] });
					}
					await bill.modify(interaction, new_message);
				}
				else {
					const messageManager = bill.getSum() > 0 ? await interaction.client.channels.fetch(channelId_vente) : await interaction.client.channels.fetch(channelId_achat);
					const send = await messageManager.send({ embeds: [await getEmbed(interaction, bill)] });
					await bill.save(send.id, interaction, send.url);
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
};

const getEmbed = async (interaction, bill) => {
	const ent = bill.getEnterprise();
	const embed = new MessageEmbed()
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
		embed.setColor('#faaf04');
	}
	else {
		embed.setTitle('Client : ' + (ent.emoji_enterprise ? ent.name_enterprise + ' ' + ent.emoji_enterprise : ent.name_enterprise));
		embed.setColor(ent.color_enterprise);
	}

	for (const [, product] of bill.getProducts()) {
		embed.addField(product.emoji ? product.emoji + ' ' + product.name : product.name, product.quantity + ' x $' + product.price + ' = $' + product.sum.toLocaleString('en'), true);
	}

	const max_ardoise = bill.getOnTab() && bill.getEnterprise().facture_max_ardoise ? (' / $' + bill.getEnterprise().facture_max_ardoise) : '';

	embed.addField('Total', '$' + bill.getSum().toLocaleString('en') + (bill.getOnTab() ? ' sur l\'ardoise' + max_ardoise : ''), false);

	return embed;
};

const getEnterprises = async (default_enterprise = 0) => {
	const enterprises = await Enterprise.findAll({ attributes: ['id_enterprise', 'name_enterprise', 'emoji_enterprise'], where: { deleted: false }, order: [['name_enterprise', 'ASC']] });

	const formatedE = enterprises.map(e => {
		return { label: e.name_enterprise, emoji: e.emoji_enterprise, value: e.id_enterprise.toString(), default: default_enterprise === e.id_enterprise };
	});

	const row = new MessageActionRow()
		.addComponents(
			new MessageSelectMenu()
				.setCustomId('enterprises')
				.addOptions([{ label: 'Particulier', emoji: '🤸', value: '0', default: default_enterprise !== 0 ? false : true }, ...formatedE]),
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
			formatedP.push(new MessageButton({ customId: 'product_' + p.id_product.toString(), label: p.name_product, emoji: p.emoji_product, style: selectedProducts.includes(p.id_product) ? 'SUCCESS' : 'SECONDARY' }));
		}
		else if (!bill.getEnterprise() && p.default_price !== 0) {
			formatedP.push(new MessageButton({ customId: 'product_' + p.id_product.toString(), label: p.name_product, emoji: p.emoji_product, style: selectedProducts.includes(p.id_product) ? 'SUCCESS' : 'SECONDARY' }));
		}
	}

	if (formatedP.length === 0) {
		return [];
	}

	if (formatedP.length <= 5) {
		return [new MessageActionRow().addComponents(...formatedP)];
	}
	else {
		let middle = Math.ceil(formatedP.length / 2);
		middle = middle > 5 ? 5 : middle;
		return [new MessageActionRow().addComponents(...formatedP.slice(0, middle)), new MessageActionRow().addComponents(...formatedP.slice(middle, 10))];
	}
};

const getProductGroups = async (group = 1) => {
	const groups = await Group.findAll({ attributes: ['id_group', 'name_group', 'emoji_group'], order: [['name_group', 'ASC']] });
	const formatedG = groups.slice(0, 5).map(g => {
		return new MessageButton({ customId: 'group_' + g.id_group.toString(), label: g.name_group, emoji: g.emoji_group, style: g.id_group === group ? 'PRIMARY' : 'SECONDARY', disabled: g.id_group === group ? true : false });
	});

	return new MessageActionRow().addComponents(...formatedG);
};

const getSendButton = (bill, infoPressed) => {
	const canSend = bill.getProducts().size;
	if (bill.getEnterprise()?.id_message) {
		return new MessageActionRow().addComponents([
			new MessageButton({ customId: 'send', label: bill.isModify() ? 'Modifier' : 'Envoyer', style: bill.isModify() ? 'PRIMARY' : 'SUCCESS', disabled: !canSend }),
			new MessageButton({ customId: 'cancel', label: 'Annuler', style: 'DANGER' }),
			new MessageButton({ customId: 'info', label: 'Info', emoji: '🗒️', style: infoPressed ? 'SUCCESS' : 'SECONDARY' }),
			new MessageButton({ customId: 'on_tab', label: 'Sur l\'ardoise', emoji: '💵', style: 'PRIMARY', disabled: bill.getOnTab() }),
			new MessageButton({ customId: 'on_tab_bis', label: 'Facturé', emoji: '🧾', style: 'SECONDARY', disabled: !bill.getOnTab() }),
		]);
	}
	return new MessageActionRow().addComponents([
		new MessageButton({ customId: 'send', label: bill.isModify() ? 'Modifier' : 'Envoyer', style: bill.isModify() ? 'PRIMARY' : 'SUCCESS', disabled: !canSend }),
		new MessageButton({ customId: 'cancel', label: 'Annuler', style: 'DANGER' }),
		new MessageButton({ customId: 'info', label: 'Info', emoji: '🗒️', style: infoPressed ? 'SUCCESS' : 'SECONDARY' }),
	]);
};
