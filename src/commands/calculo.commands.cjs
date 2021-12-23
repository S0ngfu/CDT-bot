const { SlashCommandBuilder, time } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageSelectMenu, MessageButton } = require('discord.js');
const { Enterprise, Product, Group } = require('../dbObjects.js');
const { Bill } = require('../services/bill.services');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('calculo')
		.setDescription('Affiche la calculatrice du domaine'),
	async execute(interaction) {
		const bill = new Bill(0);
		const selectedProducts = new Array();
		let selectedGroup = '1';
		const message = await interaction.reply({
			content: 'Don Telo!',
			embeds: [await getEmbed(interaction, bill)],
			components: [await getEnterprises(), await getProductGroups(), ...await getProducts(), getSendButton(bill)],
			ephemeral: true,
			fetchReply: true,
		});

		const messageFilter = m => {return m.author.id === interaction.user.id && !isNaN(m.content) && parseInt(Number(m.content)) == m.content;};
		const messageCollector = interaction.channel.createMessageCollector({ filter: messageFilter, time: 600000 });
		const componentCollector = message.createMessageComponentCollector({ time: 600000 });
		// ----------------------------------------------------------------------- 900000 = 15 minutes ; 30000 = 30 secondes // time: 30000

		messageCollector.on('collect', async m => {
			if (interaction.guild.me.permissionsIn(m.channelId).has('MANAGE_MESSAGES')) {
				await m.delete();
			}
			bill.addProducts(selectedProducts.splice(0, selectedProducts.length), m.content);
			await interaction.editReply({ embeds: [await getEmbed(interaction, bill)], components: [await getEnterprises(bill.enterprise), await getProductGroups(selectedGroup), ...await getProducts(selectedGroup, selectedProducts), getSendButton(bill)] });
		});

		componentCollector.on('collect', async i => {
			await i.deferUpdate();
			if (i.customId === 'send') {
				// delete interaction and send embed
				// await interaction;
				await interaction.client.channels.cache.get('400914410329210898').send({ embeds: [await getEmbed(interaction, bill)] });
				// await interaction.editReply({ components: [] });
				messageCollector.stop();
				componentCollector.stop();
				// end collectors
				// maybe edit message to say : 'Message envoyé, vous pouvez maintenant 'dismiss' ce message'
			}
			else if (i.customId === 'enterprises') {
				bill.setEnterprise(i.values[0]);
				await i.editReply({ embeds: [await getEmbed(interaction, bill)], components: [await getEnterprises(bill.enterprise), await getProductGroups(selectedGroup), ...await getProducts(selectedGroup, selectedProducts), getSendButton(bill)] });
			}
			else {
				const [componentCategory, componentId] = i.customId.split('_');
				if (componentCategory === 'product') {
					const productClicked = selectedProducts.indexOf(componentId);
					if (productClicked !== -1) {
						selectedProducts.splice(productClicked, 1);
					}
					else {
						selectedProducts.push(componentId);
					}
					await i.editReply({ embeds: [await getEmbed(interaction, bill)], components: [await getEnterprises(bill.enterprise), await getProductGroups(selectedGroup), ...await getProducts(selectedGroup, selectedProducts), getSendButton(bill)] });
				}
				else if (componentCategory === 'group') {
					selectedGroup = componentId;
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
	const ent = await Enterprise.findByPk(bill.getEnterprise());
	const embed = new MessageEmbed()
		.setAuthor(interaction.member.nickname ? interaction.member.nickname : interaction.user.username, interaction.user.avatarURL(false))
		.setDescription('Fait le ' + time(bill.date), 'dddd d mmmm yyyy')
		.setTimestamp(new Date());

	if (!ent) {
		embed.setTitle('Client : Particulier');
		embed.setColor('#ac0606');
	}
	else {
		embed.setTitle('Client : ' + ent.name_enterprise);
		embed.setColor('#' + ent.color_enterprise);
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
		return { label: e.emoji_enterprise ? e.emoji_enterprise + ' ' : '' + e.name_enterprise, value: e.id_enterprise, default: default_enterprise === e.id_enterprise };
	});

	const row = new MessageActionRow()
		.addComponents(
			new MessageSelectMenu()
				.setCustomId('enterprises')
				.addOptions([{ label: 'Particulier', value: '0', default: default_enterprise ? false : true }, ...formatedE]),
		);
	return row;
};

const getProducts = async (group = '1', selectedProducts = []) => {
	const products = await Product.findAll({ attributes: ['id_product', 'name_product', 'emoji_product', 'is_available'], order: [['name_product', 'ASC']], where: { id_group: group } });
	const formatedP = products.filter(p => p.is_available).map(p => {
		return new MessageButton({ customId: 'product_' + p.id_product, label: p.name_product, emoji: p.emoji_product, style: selectedProducts.includes(p.id_product) ? 'SUCCESS' : 'SECONDARY' });
	});

	if (formatedP.length <= 5) {
		return [new MessageActionRow().addComponents(...formatedP)];
	}

	if (formatedP.length <= 10) {
		return [new MessageActionRow().addComponents(...formatedP.slice(0, 5)), new MessageActionRow().addComponents(...formatedP.slice(5))];
	}
};

const getProductGroups = async (group = '1') => {
	const groups = await Group.findAll({ attributes: ['id_group', 'name_group', 'emoji_group'], order: [['name_group', 'ASC']] });
	const formatedG = groups.map(g => {
		return new MessageButton({ customId: 'group_' + g.id_group, label: g.name_group, emoji: g.emoji_group, style: g.id_group === group ? 'PRIMARY' : 'SECONDARY', disabled: g.id_group === group ? true : false });
	});

	return new MessageActionRow().addComponents(...formatedG);
};

const getSendButton = (bill) => {
	return new MessageActionRow().addComponents(new MessageButton({ customId: 'send', label: 'Envoyer', style: 'SUCCESS', disabled: !bill.getProducts().size }));
};
