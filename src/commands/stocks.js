const { SlashCommandBuilder, time } = require('@discordjs/builders');
const { MessageEmbed, MessageManager, MessageActionRow, MessageButton } = require('discord.js');
const { Stock, Product, OpStock } = require('../dbObjects.js');
const { Op, literal } = require('sequelize');
const moment = require('moment');
const dotenv = require('dotenv');

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
		.setName('stocks')
		.setDescription('Gestion des stocks')
		.setDefaultPermission(false)
		.addSubcommand(subcommand =>
			subcommand
				.setName('init')
				.setDescription('Initialise un message permettant de gérer des stocks'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('couleur')
				.setDescription('Permet de modifier la couleur du message des stocks')
				.addStringOption((option) =>
					option
						.setName('couleur')
						.setDescription('Couleur du stock (sous format hexadécimal)')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('historique')
				.setDescription('Montre l\'historique des opérations sur les stocks')
				.addStringOption((option) =>
					option
						.setName('filtre')
						.setDescription('Permet de choisir le format de l\'historique')
						.setRequired(false)
						.addChoice('Détail', 'detail')
						.addChoice('Journée', 'day')
						.addChoice('Semaine', 'week'),
				)
				.addStringOption((option) =>
					option
						.setName('produit')
						.setDescription('Nom du produit')
						.setRequired(false),
				)
				.addUserOption((option) =>
					option
						.setName('employe')
						.setDescription('Nom de l\'employe')
						.setRequired(false),
				),
		)
		.addSubcommandGroup(subcommandgroup =>
			subcommandgroup
				.setName('produit')
				.setDescription('Gestion des stocks pour les produits')
				.addSubcommand(subcommand =>
					subcommand
						.setName('ajout')
						.setDescription('Permet d\'ajouter un produit au stock')
						.addStringOption(option =>
							option
								.setName('produit')
								.setDescription('Nom du produit')
								.setRequired(true),
						),
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('suppression')
						.setDescription('Permet de supprimer un produit du stock')
						.addStringOption(option =>
							option
								.setName('produit')
								.setDescription('Nom du produit')
								.setRequired(true),
						),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('retrait_message')
				.setDescription('Retire le message de stock de ce salon'),
		),
	async execute(interaction) {
		const hexa_regex = '^[A-Fa-f0-9]{6}$';

		if (interaction.options.getSubcommand() === 'init') {
			const existing_stock = await Stock.findOne({
				where: { id_channel: interaction.channelId },
			});

			if (!existing_stock) {
				const message = await interaction.reply({
					embeds: [await getStockEmbed(null)],
					components: await getStockButtons(null),
					fetchReply: true,
				});

				await Stock.upsert({
					id_message: message.id,
					id_channel: interaction.channelId,
				});
			}
			else {
				try {
					const stock_to_delete = await interaction.channel.messages.fetch(existing_stock.id_message);
					await stock_to_delete.delete();
				}
				catch (error) {
					console.log('Error: ', error);
				}

				const message = await interaction.reply({
					embeds: [await getStockEmbed(existing_stock)],
					components: await getStockButtons(existing_stock),
					fetchReply: true,
				});

				await Stock.update({
					id_message: message.id,
				}, { where: { id_channel: interaction.channelId } });
			}
		}
		else if (interaction.options.getSubcommand() === 'couleur') {
			const colour_stock = interaction.options.getString('couleur') ? interaction.options.getString('couleur').trim() : '000000';

			if (colour_stock.match(hexa_regex) === null) {
				await interaction.reply({ content: 'La couleur ' + colour_stock + ' donné en paramètre est incorrecte', ephemeral: true });
				return;
			}

			const stock = await Stock.findOne({
				where: { id_channel: interaction.channelId },
			});

			if (stock) {
				await stock.update({
					colour_stock: colour_stock,
				});

				const message = await interaction.channel.messages.fetch(stock.id_message);
				await message.edit({
					embeds: [await getStockEmbed(stock)],
					components: await getStockButtons(stock),
				});
				await interaction.reply({ content: 'La couleur du stock a été modifié', ephemeral: true });
			}
			else {
				await interaction.reply({ content: 'Il n\'y a aucun stock dans ce salon', ephemeral: true });
			}
		}
		else if (interaction.options.getSubcommand() === 'retrait_message') {
			const stock = await Stock.findOne({
				where: { id_channel: interaction.channelId },
			});

			if (!stock) {
				return await interaction.reply({ content: 'Il n\'y a aucun stock dans ce salon', ephemeral: true });
			}

			try {
				const stock_to_delete = await interaction.channel.messages.fetch(stock.id_message);
				await stock_to_delete.delete();
			}
			catch (error) {
				console.log('Error: ', error);
			}
			await Product.update({ id_message: null }, { where : { id_message: stock.id_message } });
			await stock.destroy();
			return await interaction.reply({ content: 'Le message des stocks a été retiré de ce salon', ephemeral: true });
		}
		else if (interaction.options.getSubcommand() === 'historique') {
			await interaction.deferReply({ ephemeral: true });
			const filtre = interaction.options.getString('filtre') ? interaction.options.getString('filtre') : 'detail';
			const name_product = interaction.options.getString('produit') || null;
			const employee = interaction.options.getUser('employe');
			const product = name_product ? await Product.findOne({ attributes: ['id_product'], where: { name_product: name_product } }) : null;
			let start, end, message = null;

			if (name_product && !product) {
				return await interaction.editReply({ content: `Le produit ${name_product} n'existe pas`, ephemeral: true });
			}

			if (filtre === 'detail') {
				start = 0;
				end = 15;
				message = await interaction.editReply({
					embeds: [await getHistoryEmbed(interaction, await getData(filtre, product, employee, start, end), filtre, product, start, end)],
					components: [getHistoryButtons(filtre, start, end)],
					fetchReply: true,
					ephemeral: true,
				});
			}
			else if (filtre === 'day') {
				start = moment.tz('Europe/Paris').startOf('day');
				end = moment.tz('Europe/Paris').endOf('day');
				message = await interaction.editReply({
					embeds: [await getHistoryEmbed(interaction, await getData(filtre, product, employee, start, end), filtre, product, start, end)],
					components: [getHistoryButtons(filtre, start, end)],
					fetchReply: true,
					ephemeral: true,
				});
			}
			else {
				start = moment().startOf('week');
				end = moment().endOf('week');
				message = await interaction.editReply({
					embeds: [await getHistoryEmbed(interaction, await getData(filtre, product, employee, start, end), filtre, product, start, end)],
					components: [getHistoryButtons(filtre, start, end)],
					fetchReply: true,
					ephemeral: true,
				});
			}

			const componentCollector = message.createMessageComponentCollector({ time: 840000 });

			componentCollector.on('collect', async i => {
				await i.deferUpdate();
				if (i.customId === 'next') {
					if (filtre === 'detail') {
						start += 15;
					}
					else if (filtre === 'day') {
						start.add('1', 'd');
						end.add('1', 'd');
					}
					else if (filtre === 'week') {
						start.add('1', 'w');
						end.add('1', 'w');
					}
					await i.editReply({
						embeds: [await getHistoryEmbed(interaction, await getData(filtre, product, employee, start, end), filtre, product, start, end)],
						components: [getHistoryButtons(filtre, start, end)],
					});
				}
				else if (i.customId === 'previous') {
					if (filtre === 'detail') {
						start -= 15;
					}
					else if (filtre === 'day') {
						start.subtract('1', 'd');
						end.subtract('1', 'd');
					}
					else if (filtre === 'week') {
						start.subtract('1', 'w');
						end.subtract('1', 'w');
					}
					await i.editReply({
						embeds: [await getHistoryEmbed(interaction, await getData(filtre, product, employee, start, end), filtre, product, start, end)],
						components: [getHistoryButtons(filtre, start, end)],
					});
				}
			});

			componentCollector.on('end', () => {
				interaction.editReply({ components: [] });
			});

		}
		else if (interaction.options.getSubcommandGroup() === 'produit') {
			if (interaction.options.getSubcommand() === 'ajout') {
				const name_product = interaction.options.getString('produit');
				const product = await Product.findOne({ attributes: ['id_product', 'name_product', 'emoji_product', 'id_message'], where: { name_product: name_product } });

				if (!product) {
					return await interaction.reply({ content: `Aucun produit trouvé avec le nom ${name_product}`, ephemeral: true });
				}

				const stock = await Stock.findOne({
					where: { id_channel: interaction.channelId },
				});

				if (!stock) {
					return await interaction.reply({ content: 'Aucun stock est instancié dans ce salon', ephemeral: true });
				}

				if (stock.id_message === product.id_message) {
					return await interaction.reply({ content: `Le produit ${name_product} est déjà présent dans ce stock`, ephemeral: true });
				}

				const previous_stock_message = product.id_message;
				await product.update({ id_message: stock.id_message });
				const message = await interaction.channel.messages.fetch(stock.id_message);
				await message.edit({
					embeds: [await getStockEmbed(stock)],
					components: await getStockButtons(stock),
				});

				if (previous_stock_message !== null) {
					const previous_stock = await Stock.findOne({ where: { id_message: previous_stock_message } });
					const messageManager = new MessageManager(await interaction.client.channels.fetch(previous_stock.id_channel));
					const previous_message = await messageManager.fetch(previous_stock_message);
					await previous_message.edit({
						embeds: [await getStockEmbed(previous_stock)],
						components: await getStockButtons(previous_stock),
					});
				}

				return await interaction.reply({
					content: 'Le produit ' + (product.emoji_product ? product.emoji_product + ' ' + product.name_product : product.name_product)
					+ ' est désormais dans le stock',
					ephemeral: true,
				});
			}
			else if (interaction.options.getSubcommand() === 'suppression') {
				const name_product = interaction.options.getString('produit');
				const product = await Product.findOne({ attributes: ['id_product', 'name_product', 'emoji_product', 'id_message'], where: { name_product: name_product } });

				if (!product) {
					return await interaction.reply({ content: `Aucun produit trouvé avec le nom ${name_product}`, ephemeral: true });
				}

				if (!product.id_message) {
					return await interaction.reply({ content: 'Le produit n\'est pas dans un stock', ephemeral: true });
				}

				const stock = await Stock.findOne({
					where: { id_message: product.id_message },
				});
				await product.update({ id_message: null, qt: 0 });
				const messageManager = new MessageManager(await interaction.client.channels.fetch(stock.id_channel));
				const stock_message = await messageManager.fetch(stock.id_message);
				await stock_message.edit({
					embeds: [await getStockEmbed(stock)],
					components: await getStockButtons(stock),
				});
				return await interaction.reply({ content: `Le produit ${name_product} a été retiré du stock`, ephemeral: true });
			}
		}
	},
	async buttonClicked(interaction) {
		const [, productId] = interaction.customId.split('_');
		const stock = await Stock.findOne({
			where: { id_channel: interaction.channelId },
		});
		const product = await Product.findByPk(productId);
		const productMessage = product.emoji_product ? product.name_product + ' ' + product.emoji_product : product.name_product;
		const messageFilter = m => {return m.author.id === interaction.user.id && !isNaN(m.content) && parseInt(Number(m.content)) == m.content;};
		const messageCollector = interaction.channel.createMessageCollector({ filter: messageFilter, time: 120000 });

		messageCollector.on('collect', async m => {
			if (interaction.guild.me.permissionsIn(m.channelId).has('MANAGE_MESSAGES')) {
				try {
					await m.delete();
				}
				catch (error) {
					console.log('Error: ', error);
				}
			}
			if (parseInt(m.content) !== 0) {
				await OpStock.create({
					id_product: product.id_product,
					qt: parseInt(m.content),
					id_employe: interaction.user.id,
					timestamp: moment().tz('Europe/Paris'),
				});
				await Product.increment({ qt: parseInt(m.content) }, { where: { id_product: productId } });
			}
			messageCollector.stop();
		});

		const ask = await interaction.reply({
			content: `Modification du stock pour ${productMessage}\nVeuillez saisir un entier`,
			fetchReply: true,
		});

		messageCollector.on('end', async (collected) => {
			await ask.delete();
			if (collected.size === 0) {
				const reply = await interaction.followUp({ content: 'Temps d\'attente dépassé', fetchReply: true });
				await new Promise(r => setTimeout(r, 5000));
				await reply.delete();
				return;
			}
			const quantity = parseInt(collected.values().next().value.content);
			if (quantity !== 0) {
				const message = await interaction.channel.messages.fetch(stock.id_message);
				await message.edit({
					embeds: [await getStockEmbed(stock)],
					components: await getStockButtons(stock),
				});

				if (quantity > 0) {
					const reply = await interaction.followUp({ content: `Ajout de ${quantity} ${productMessage}`, fetchReply: true });
					await new Promise(r => setTimeout(r, 5000));
					await reply.delete();
				}
				else {
					const reply = await interaction.followUp({ content: `Retrait de ${Math.abs(quantity)} ${productMessage}`, fetchReply: true });
					await new Promise(r => setTimeout(r, 5000));
					await reply.delete();
				}
			}
		});
	},
};

const getStockEmbed = async (stock = null) => {
	const embed = new MessageEmbed()
		.setTitle('Stocks')
		.setColor(stock ? stock.colour_stock : '000000')
		.setTimestamp(new Date());

	if (stock) {
		const products = await stock.getProducts({ order: [['order', 'ASC'], ['id_group', 'ASC'], ['name_product', 'ASC']] });
		for (const p of products) {
			const title = p.emoji_product ? (p.emoji_product + ' ' + p.name_product) : p.name_product;
			const field = (p.qt >= p.qt_wanted ? '✅' : '❌') + ' ' + (p.qt || 0) + ' / ' + (p.qt_wanted || 0);
			embed.addField(title, field, true);
		}
	}

	return embed;
};

const getStockButtons = async (stock = null) => {
	if (stock) {
		const products = await stock.getProducts({ order: [['order', 'ASC'], ['id_group', 'ASC'], ['name_product', 'ASC']] });
		if (products && products.length > 0) {
			const formatedProducts = products.map(p => {
				return new MessageButton({ customId: 'stock_' + p.id_product.toString(), label: p.name_product, emoji: p.emoji_product, style: 'SECONDARY' });
			});
			if (formatedProducts.length <= 5) {
				return [new MessageActionRow().addComponents(...formatedProducts)];
			}
			if (formatedProducts.length <= 10) {
				return [
					new MessageActionRow().addComponents(...formatedProducts.slice(0, 5)),
					new MessageActionRow().addComponents(...formatedProducts.slice(5)),
				];
			}
			if (formatedProducts.length <= 15) {
				return [
					new MessageActionRow().addComponents(...formatedProducts.slice(0, 5)),
					new MessageActionRow().addComponents(...formatedProducts.slice(5, 10)),
					new MessageActionRow().addComponents(...formatedProducts.slice(10)),
				];
			}
			if (formatedProducts.length <= 20) {
				return [
					new MessageActionRow().addComponents(...formatedProducts.slice(0, 5)),
					new MessageActionRow().addComponents(...formatedProducts.slice(5, 10)),
					new MessageActionRow().addComponents(...formatedProducts.slice(10, 15)),
					new MessageActionRow().addComponents(...formatedProducts.slice(15)),
				];
			}
			if (formatedProducts.length <= 25) {
				return [
					new MessageActionRow().addComponents(...formatedProducts.slice(0, 5)),
					new MessageActionRow().addComponents(...formatedProducts.slice(5, 10)),
					new MessageActionRow().addComponents(...formatedProducts.slice(10, 15)),
					new MessageActionRow().addComponents(...formatedProducts.slice(15, 20)),
					new MessageActionRow().addComponents(...formatedProducts.slice(20)),
				];
			}
		}
	}

	return [];
};

const getHistoryButtons = (filtre, start, end) => {
	if (filtre !== 'detail') {
		return new MessageActionRow().addComponents([
			new MessageButton({ customId: 'previous', label: 'Précédent', disabled: start === 0, style: 'PRIMARY' }),
			new MessageButton({ customId: 'next', label: 'Suivant', style: 'PRIMARY' }),
		]);
	}
	return new MessageActionRow().addComponents([
		new MessageButton({ customId: 'previous', label: 'Précédent', disabled: start === 0, style: 'PRIMARY' }),
		new MessageButton({ customId: 'info', label: (start + 1) + ' / ' + (start + end), disabled: true, style: 'PRIMARY' }),
		new MessageButton({ customId: 'next', label: 'Suivant', style: 'PRIMARY' }),
	]);
};

const getData = async (filtre, product, employee, start, end) => {
	const where = new Object();
	if (product) {
		where.id_product = product.id_product;
	}
	if (employee) {
		where.id_employe = employee.id;
	}
	if (filtre === 'detail') {
		if (where.id_product || where.id_employe) {
			return await OpStock.findAll({
				attributes: [
					'id_product',
					'qt',
					'id_employe',
					'timestamp',
				],
				where: where,
				order: [['timestamp', 'DESC']],
				offset: start,
				limit: end,
				raw: true,
			});
		}
		return await OpStock.findAll({
			attributes: [
				'id_product',
				'qt',
				'id_employe',
				'timestamp',
			],
			order: [['timestamp', 'DESC']],
			offset: start,
			limit: end,
			raw: true,
		});
	}
	if (where.id_product || where.id_employe) {
		where.timestamp = { [Op.between]: [+start, +end] };
		return await OpStock.findAll({
			attributes: [
				'id_product',
				literal('SUM(IIF(qt > 0, qt, 0)) as sum_pos'),
				literal('SUM(IIF(qt < 0, qt, 0)) as sum_neg'),
			],
			where: where,
			group: ['id_product'],
			raw: true,
		});
	}
	return await OpStock.findAll({
		attributes: [
			'id_product',
			literal('SUM(IIF(qt > 0, qt, 0)) as sum_pos'),
			literal('SUM(IIF(qt < 0, qt, 0)) as sum_neg'),
		],
		where: {
			timestamp: {
				[Op.between]: [+start, +end],
			},
		},
		group: ['id_product'],
		raw: true,
	});
};

const getHistoryEmbed = async (interaction, data, filtre, enterprise, start, end) => {
	const guild = await interaction.client.guilds.fetch(guildId);
	const embed = new MessageEmbed()
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL(false) })
		.setTitle('Opérations sur les stocks')
		.setColor('#18913E')
		.setTimestamp(new Date());

	if (filtre !== 'detail') {
		embed.setDescription('Période du ' + time(start.unix()) + ' au ' + time(end.unix()));
	}

	if (data && data.length > 0) {
		if (filtre !== 'detail') {
			for (const d of data) {
				const prod = await Product.findByPk(d.id_product, { attributes: ['name_product', 'emoji_product'] });
				const title = prod.emoji_product ? prod.name_product + ' ' + prod.emoji_product : prod.name_product;
				embed.addField(title, `\`\`\`diff\n+${d.sum_pos.toLocaleString('en')}\`\`\` \`\`\`diff\n${d.sum_neg.toLocaleString('en')}\`\`\``, true);
			}
		}
		else {
			for (const d of data) {
				let user = null;
				try {
					user = await guild.members.fetch(d.id_employe);
				}
				catch (error) {
					console.log('ERR - historique_product: ', error);
				}
				const prod = await Product.findByPk(d.id_product, { attributes: ['name_product', 'emoji_product'] });
				const title = prod ? prod.emoji_product ? prod.name_product + ' ' + prod.emoji_product : prod.name_product : d.id_product;
				const name = user ? user.nickname ? user.nickname : user.user.username : d.id_employe;
				embed.addField(title, d.qt.toLocaleString('en') + ' par ' + name + ' le ' + time(moment(d.timestamp, 'YYYY-MM-DD hh:mm:ss.S ZZ').unix(), 'F'), false);
			}
		}
	}

	return embed;
};
