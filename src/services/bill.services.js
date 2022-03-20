const { Enterprise, Product, Bill: BillDB, BillDetail, Tab, OpStock, Stock } = require('../dbObjects.js');
const { MessageEmbed, MessageManager, MessageActionRow, MessageButton } = require('discord.js');
const { Op } = require('sequelize');
const moment = require('moment');

moment.locale('fr');

module.exports = {
	Bill: class Bill {
		constructor(enterprise) {
			this.enterprise = enterprise;
			this.products = new Map();
			this.date = new Date();
			this.sum = 0;
			this.on_tab = false;
			this.info = null;
		}

		static async initialize(id_enterprise) {
			const enterprise = id_enterprise ? await Enterprise.findByPk(id_enterprise) : 0;
			return new Bill(enterprise);
		}

		async addProducts(products, quantity) {
			for (const p_id of products) {
				if (quantity > 0) {
					const product = await Product.findByPk(p_id, { attributes: ['name_product', 'emoji_product', 'default_price'] });
					if (this.products.get(p_id)) {
						this.sum -= this.products.get(p_id).sum;
					}
					if (this.enterprise) {
						const product_price = await this.enterprise.getProductPrice(p_id);
						const product_sum = quantity * product_price;
						this.sum += product_sum;
						this.addProduct(p_id, { name: product.name_product, emoji: product.emoji_product, quantity: quantity, default_price: product.default_price, price: product_price, sum: product_sum });
					}
					else {
						const product_sum = quantity * product.default_price;
						this.sum += product_sum;
						this.addProduct(p_id, { name: product.name_product, emoji: product.emoji_product, quantity: quantity, default_price: product.default_price, price: product.default_price, sum: product_sum });
					}
				}
				else if (quantity == 0) {
					this.removeProduct(p_id);
				}
			}
		}

		async setEnterprise(id_enterprise) {
			this.enterprise = id_enterprise ? await Enterprise.findByPk(id_enterprise) : 0;
			this.sum = 0;
			if (this.enterprise) {
				this.on_tab = this.enterprise.id_message ? true : false;
				for (const [key, product] of this.products) {
					const product_price = await this.enterprise.getProductPrice(key);
					if (product_price === 0) {
						this.removeProduct(key);
					}
					else {
						const product_sum = product.quantity * product_price;
						this.sum += product_sum;
						this.products.set(key, { ...product, price: product_price, sum: product_sum });
					}
				}
			}
			else {
				this.on_tab = false;
				for (const [key, product] of this.products) {
					if (product.default_price === 0) {
						this.removeProduct(key);
					}
					else {
						const product_sum = product.quantity * product.default_price;
						this.sum += product_sum;
						this.products.set(key, { ...product, price: product.default_price, sum: product_sum });
					}
				}
			}
		}

		getEnterprise() {
			return this.enterprise;
		}

		getEnterpriseId() {
			return this.enterprise?.id_enterprise;
		}

		getProducts() {
			return this.products;
		}

		getOnTab() {
			return this.on_tab;
		}

		getSum() {
			return this.sum;
		}

		getInfo() {
			return this.info;
		}

		setInfo(info) {
			this.info = info;
		}

		removeProduct(id_product) {
			this.products.delete(id_product);
		}

		addProduct(id_product, product) {
			this.products.set(id_product, product);
		}

		switchOnTab() {
			this.on_tab = !this.on_tab;
		}

		async save(id, interaction, url) {
			let sum = 0;
			const mess_stocks = new Set();
			for (const [, product] of this.products) {
				sum += product.sum;
			}
			await BillDB.upsert({
				id_bill: id,
				date_bill: moment().tz('Europe/Paris'),
				sum_bill: sum,
				id_enterprise: this.enterprise.id_enterprise,
				id_employe: interaction.user.id,
				info: this.info,
				on_tab: this.on_tab,
				ignore_transaction: this.on_tab ? true : false,
				url: url,
			});
			for (const [key, product] of this.products) {
				await BillDetail.upsert({
					id_bill: id,
					id_product: key,
					quantity: product.quantity,
					sum: product.sum,
				});

				await OpStock.create({
					id_product: key,
					qt: product.sum > 0 ? -product.quantity : product.quantity,
					id_employe: interaction.user.id,
					timestamp: moment().tz('Europe/Paris'),
				});

				const stock_product = await Product.findOne({
					where: { id_product: key, id_message: { [Op.not]: null } },
				});

				if (stock_product) {
					mess_stocks.add(stock_product.id_message);
					await stock_product.update({ qt: product.sum > 0 ? stock_product.qt - parseInt(product.quantity) : stock_product.qt + parseInt(product.quantity) });
				}
			}

			for (const mess of mess_stocks) {
				const stock = await Stock.findOne({
					where: { id_message: mess },
				});
				const messageManager = new MessageManager(await interaction.client.channels.fetch(stock.id_channel));
				const stock_to_update = await messageManager.fetch(stock.id_message);
				await stock_to_update.edit({
					embeds: [await getStockEmbed(stock)],
					components: await getStockButtons(stock),
				});
			}

			if (this.on_tab) {
				const tab = await Tab.findOne({
					where: { id_message: this.enterprise.id_message },
				});
				const messageManager = new MessageManager(await interaction.client.channels.fetch(tab.id_channel));
				const tab_to_update = await messageManager.fetch(this.enterprise.id_message);

				await Enterprise.decrement({ sum_ardoise: sum }, { where: { id_enterprise: this.enterprise.id_enterprise } });

				await tab_to_update.edit({
					embeds: [await getArdoiseEmbed(tab)],
				});
			}
		}
	},
};

const getArdoiseEmbed = async (tab = null) => {
	const embed = new MessageEmbed()
		.setTitle('Ardoises')
		.setColor(tab ? tab.colour_tab : '000000')
		.setTimestamp(new Date());

	if (tab) {
		const enterprises = await tab.getEnterprises();
		for (const e of enterprises) {
			let field = 'Crédit restant : $' + (e.sum_ardoise ? e.sum_ardoise.toLocaleString('en') : '0');
			field += e.facture_max_ardoise ? '\nFacture max : $' + e.facture_max_ardoise : '';
			field += e.info_ardoise ? '\n' + e.info_ardoise : '';
			embed.addField(e.emoji_enterprise ? e.emoji_enterprise + ' ' + e.name_enterprise : e.name_enterprise, field, true);
		}
	}

	return embed;
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
		if (products) {
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