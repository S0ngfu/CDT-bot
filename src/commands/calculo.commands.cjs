const { SlashCommandBuilder, time } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageSelectMenu, MessageButton } = require('discord.js');
const { Enterprise, PriceEnterprise, Product, Group } = require('../dbObjects.js');
const { Bill } = require('../services/bill.services');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('calculo')
		.setDescription('Affiche la calculatrice du domaine'),
	async execute(interaction) {
		const bill = new Bill(0);
		const selectedProducts = new Array();
		let selectedGroup = '1';
		console.log('SGO-init_calculo: ', bill);
		// console.log('Enterprise: ', await Enterprise.findAll());
		// console.log('PriceEnterprise: ', await PriceEnterprise.findAll());
		// console.log('Product: ', await Product.findAll());
		// console.log('Group: ', await Group.findAll());
		// console.log('test: ', interaction);
		const message = await interaction.reply({
			content: 'Don Telo!',
			embeds: [await getEmbed(interaction, bill)],
			components: [await getEnterprises(), ...await getProducts(), await getProductGroups()],
			ephemeral: true,
			fetchReply: true,
		});

		const messageFilter = m => m.user.id === interaction.user.id;
		const messageCollector = interaction.channel.createMessageCollector({ messageFilter, time: 30000 });
		const componentCollector = message.createMessageComponentCollector({ time: 30000 });
		// ----------------------------------------------------------------------- 900000 = 15 minutes ; 30000 = 30 secondes

		messageCollector.on('collect', m => {
			if (!isNaN(m.content) && parseInt(Number(m.content)) == m.content && !isNaN(parseInt(m.content, 10))) {
				console.log(m.content);
			}
		});

		messageCollector.on('end', collected => {
			console.log(`Collected ${collected.size} items.`);
		});

		componentCollector.on('collect', async i => {
			if (i.user.id === interaction.user.id) {
				i.reply(`${i.user.id} clicked on the ${i.customId} button.`);
				if (i.customId === 'enterprises') {
					bill.setEnterprise(i.values[0]);
					console.log('SGO-edit_calculo: ', bill);
					interaction.editReply({ embeds: [await getEmbed(interaction, bill)], components: [await getEnterprises(bill.enterprise), ...await getProducts(selectedGroup, selectedProducts), await getProductGroups(selectedGroup)] });
				}
				else {
					const [componentCategory, componentId] = i.customId.split('_');
					if (componentCategory === 'product') {
						selectedProducts.push(componentId);
						console.log('Clicked on a product with id: ', componentId);
						interaction.editReply({ embeds: [await getEmbed(interaction, bill)], components: [await getEnterprises(bill.enterprise), ...await getProducts(selectedGroup, selectedProducts), await getProductGroups(selectedGroup)] });
					}
					else if (componentCategory === 'group') {
						console.log('Clicked on a group with id: ', componentId);
						selectedGroup = componentId;
						interaction.editReply({ embeds: [await getEmbed(interaction, bill)], components: [await getEnterprises(bill.enterprise), ...await getProducts(selectedGroup, selectedProducts), await getProductGroups(selectedGroup)] });
					}
				}
			}
			else {
				i.reply({ content: 'These buttons aren\'t for you!', ephemeral: true });
			}
		});

		componentCollector.on('end', collected => {
			console.log(`Collected ${collected.size} interactions.`);
			interaction.editReply({ components: [] });
			// Just remove components
		});
	},
};

const getEmbed = async (interaction, bill) => {
	// console.log('interaction: ', interaction);
	// get product of default group
	// get groups
	// get user (name + emoji)
	const ent = await Enterprise.findByPk(bill.getEnterprise());
	const embed = new MessageEmbed()
		.setTitle('Client : Particulier')
		.setAuthor(interaction.member.nickname, interaction.user.avatarURL(false))
		.setDescription('Fait le ' + time(bill.date), 'dddd d mmmm yyyy')
		/* .addFields(
			{ name: 'Jus d\'orange', value: '20 x 10 = 200$', inline: true },
			{ name: 'Limonades', value: '30 x 10 = 300$', inline: true },
			{ name: ':strawberry: Fraise', value: '10 x 5 = 50$', inline: true },
			{ name: 'Total', value: '550$' },
		) */
		.setTimestamp(new Date());

	if (!ent) {
		embed.setTitle('Client : Particulier');
		embed.setColor('#ac0606');
	}
	else {
		embed.setTitle('Client : ' + ent.name_enterprise);
		embed.setColor('#' + ent.color_enterprise);
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
		return new MessageButton({ customId: 'product_' + p.id_product, label: p.name_product, emoji: p.emoji_product, style: selectedProducts.includes(p.id_product) ? 'SUCCESS' : 'SECONDARY', disabled: selectedProducts.includes(p.id_product) ? true : false });
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