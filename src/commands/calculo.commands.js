const { SlashCommandBuilder, time } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageSelectMenu, MessageButton } = require('discord.js');
const { Enterprise, Product, Group } = require('../dbObjects.js');
const { Bill } = require('../services/bill.services');
const dotenv = require('dotenv');

dotenv.config();
const channelId = process.env.CHANNEL_ID;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('calculo')
		.setDescription('Affiche la calculatrice du domaine'),
	async execute(interaction) {
		const bill = new Bill(0);
		const selectedProducts = new Array();
		let selectedGroup = (await Group.findOne({ attributes: ['id_group'], order: [['default_group', 'DESC']] })).id_group;
		const message = await interaction.reply({
			content: 'Don Telo!',
			embeds: [await getEmbed(interaction, bill)],
			components: [await getEnterprises(), await getProductGroups(selectedGroup), ...await getProducts(selectedGroup, selectedProducts), getSendButton(bill)],
			ephemeral: true,
			fetchReply: true,
		});

		const messageFilter = m => {return m.author.id === interaction.user.id && !isNaN(m.content) && parseInt(Number(m.content)) == m.content;};
		const messageCollector = interaction.channel.createMessageCollector({ filter: messageFilter, time: 720000 });
		const componentCollector = message.createMessageComponentCollector({ time: 720000 });
		// ----------------------------------------------------------------------- 900000 = 15 minutes ; 30000 = 30 secondes // time: 30000

		messageCollector.on('collect', async m => {
			if (interaction.guild.me.permissionsIn(m.channelId).has('MANAGE_MESSAGES')) {
				try {
					await m.delete();
				}
				catch (error) {
					console.log('Error: ', error);
				}
			}
			bill.addProducts(selectedProducts.splice(0, selectedProducts.length), m.content);
			await interaction.editReply({ embeds: [await getEmbed(interaction, bill)], components: [await getEnterprises(bill.enterprise), await getProductGroups(selectedGroup), ...await getProducts(selectedGroup, selectedProducts), getSendButton(bill)] });
		});

		componentCollector.on('collect', async i => {
			await i.deferUpdate();
			if (i.customId === 'send') {
				await interaction.client.channels.cache.get(channelId).send({ embeds: [await getEmbed(interaction, bill)] });
				messageCollector.stop();
				componentCollector.stop();
				// maybe edit message to say : 'Message envoyé, vous pouvez maintenant 'dismiss' ce message'
			}
			else if (i.customId === 'cancel') {
				messageCollector.stop();
				componentCollector.stop();
				// maybe edit message to say : 'Canceled, vous pouvez maintenant 'dismiss' ce message'
			}
			else if (i.customId === 'enterprises') {
				bill.setEnterprise(parseInt(i.values[0]));
				await i.editReply({ embeds: [await getEmbed(interaction, bill)], components: [await getEnterprises(bill.enterprise), await getProductGroups(selectedGroup), ...await getProducts(selectedGroup, selectedProducts), getSendButton(bill)] });
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
					await i.editReply({ embeds: [await getEmbed(interaction, bill)], components: [await getEnterprises(bill.enterprise), await getProductGroups(selectedGroup), ...await getProducts(selectedGroup, selectedProducts), getSendButton(bill)] });
				}
				else if (componentCategory === 'group') {
					selectedGroup = parseInt(componentId);
					await i.editReply({ embeds: [await getEmbed(interaction, bill)], components: [await getEnterprises(bill.enterprise), await getProductGroups(selectedGroup), ...await getProducts(selectedGroup, selectedProducts), getSendButton(bill)] });
				}
			}
		});

		componentCollector.on('end', () => {
			interaction.editReply({ components: [] });
		});
	},
};

const getEmbed = async (interaction, bill) => {
	let sum = 0;
	const ent = await Enterprise.findByPk(bill.getEnterprise(), { attributes: ['id_enterprise', 'name_enterprise', 'color_enterprise', 'emoji_enterprise'] });
	const embed = new MessageEmbed()
		.setAuthor({ name: interaction.member.nickname ? interaction.member.nickname : interaction.user.username, iconURL: interaction.user.avatarURL(false) })
		.setDescription('Fait le ' + time(bill.date), 'dddd d mmmm yyyy')
		.setTimestamp(new Date());

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

	for (const [key, value] of bill.getProducts()) {
		const product = await Product.findByPk(key, { attributes: ['name_product', 'emoji_product', 'default_price'] });
		if (ent) {
			const product_price = await ent.getProductPrice(key);
			sum += value * product_price;
			embed.addField(product.emoji_product ? product.emoji_product + ' ' + product.name_product : product.name_product, value + ' x $' + product_price + ' = $' + (value * product_price).toLocaleString('en'), true);
		}
		else {
			sum += value * product.default_price;
			embed.addField(product.emoji_product ? product.emoji_product + ' ' + product.name_product : product.name_product, value + ' x $' + product.default_price + ' = $' + (value * product.default_price).toLocaleString('en'), true);
		}
	}

	if (sum !== 0) {
		embed.addField('Total', '$' + sum.toLocaleString('en'), false);
	}

	return embed;
};

const getEnterprises = async (default_enterprise = 0) => {
	const enterprises = await Enterprise.findAll({ attributes: ['id_enterprise', 'name_enterprise', 'emoji_enterprise'], order: [['name_enterprise', 'ASC']] });

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

const getProducts = async (group, selectedProducts = []) => {
	const products = await Product.findAll({ attributes: ['id_product', 'name_product', 'emoji_product', 'is_available'], order: [['name_product', 'ASC']], where: { id_group: group } });
	const formatedP = products.filter(p => p.is_available).map(p => {
		return new MessageButton({ customId: 'product_' + p.id_product.toString(), label: p.name_product, emoji: p.emoji_product, style: selectedProducts.includes(p.id_product) ? 'SUCCESS' : 'SECONDARY' });
	});

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

const getSendButton = (bill) => {
	return new MessageActionRow().addComponents([
		new MessageButton({ customId: 'send', label: 'Envoyer', style: 'SUCCESS', disabled: !bill.getProducts().size }),
		new MessageButton({ customId: 'cancel', label: 'Annuler', style: 'DANGER' }),
	]);
};
