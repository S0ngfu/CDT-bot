const { Enterprise, Product, Bill: BillDB, BillDetail, Tab, OpStock, Stock } = require('../dbObjects.js');
const { MessageManager } = require('discord.js');
const { getStockEmbed, getStockButtons } = require ('../commands/stocks');
const { getArdoiseEmbed } = require ('../commands/tab');
const { Op } = require('sequelize');
const moment = require('moment');
const dotenv = require('dotenv');

dotenv.config();
moment.tz.setDefault('Europe/Paris');
moment.updateLocale('fr', {
	week: {
		dow: 1,
		doy: 4,
	},
});

module.exports = {
	Bill: class Bill {
		constructor(employeeId, author, previous_bill, products = null, modifyAuthor = null, is_model = false, model_to_load = null) {
			this.employeeId = employeeId;
			this.previous_bill = previous_bill;
			this.is_model = is_model;
			this.author = author;
			this.modifyAuthor = modifyAuthor;
			if (previous_bill) {
				this.enterprise = previous_bill.enterprise || 0;
				this.products = products;
				this.date = previous_bill.date_bill;
				this.sum = 0;
				this.on_tab = previous_bill.on_tab;
				this.info = previous_bill.info;
				this.products.forEach((p) => { this.sum += p.sum; });
				this.modifyDate = new Date();
				this.url = previous_bill.url;
			}
			else if (model_to_load) {
				this.enterprise = model_to_load.enterprise;
				this.products = products;
				this.date = new Date();
				this.sum = model_to_load.sum;
				this.on_tab = model_to_load.data.on_tab;
				this.info = model_to_load.data.info;
			}
			else {
				this.enterprise = 0;
				this.products = new Map();
				this.date = new Date();
				this.sum = 0;
				this.on_tab = false;
				this.info = null;
				this.url = '';
			}
		}

		static async initialize(interaction, employeeId, previous_bill = 0, is_model = false, model_to_load = null) {
			if (previous_bill) {
				const author = {
					name: previous_bill.employee.name_employee,
					iconURL: previous_bill.employee.pp_url,
				};
				const modifyAuthor = {
					name: interaction.member.nickname ? interaction.member.nickname : interaction.user.username,
					iconURL: interaction.member.displayAvatarURL(true),
				};
				const products = new Map();
				for (const bd of previous_bill.bill_details) {
					const product = await Product.findByPk(bd.id_product, { attributes: ['name_product', 'emoji_product', 'default_price'] });
					const product_price = previous_bill.enterprise ? await previous_bill.enterprise.getProductPrice(bd.id_product) : product.default_price;
					products.set(bd.id_product, { name: product.name_product, emoji: product.emoji_product, quantity: bd.quantity, default_price: product.default_price, price: product_price, sum: bd.quantity * product_price });
				}
				return new Bill(employeeId, author, previous_bill, products, modifyAuthor);
			}
			else if (model_to_load) {
				const products = new Map();
				const products_to_load = new Map(Object.entries(model_to_load.data.products));
				model_to_load.enterprise = model_to_load.data.id_enterprise ? await Enterprise.findByPk(model_to_load.data.id_enterprise) : 0;
				if (model_to_load.enterprise.deleted) {
					model_to_load.enterprise = 0;
				}
				let sum = 0;
				for (const [key, data] of products_to_load) {
					const product = await Product.findByPk(key, { attributes: ['name_product', 'emoji_product', 'default_price', 'is_available'] });
					if (product.is_available) {
						const product_price = model_to_load.enterprise ? await model_to_load.enterprise.getProductPrice(key) : product.default_price;
						products.set(parseInt(key), { name: product.name_product, emoji: product.emoji_product, quantity: data.quantity, default_price: product.default_price, price: product_price, sum: product_price * data.quantity });
						sum += product_price * data.quantity;
					}
				}
				model_to_load.sum = sum;
				const author = {
					name: interaction.member.nickname ? interaction.member.nickname : interaction.user.username,
					iconURL: interaction.user.avatarURL(false),
				};
				return new Bill(employeeId, author, previous_bill, products, null, is_model, model_to_load);
			}
			const author = {
				name: interaction.member.nickname ? interaction.member.nickname : interaction.user.username,
				iconURL: interaction.member.displayAvatarURL(true),
			};
			return new Bill(employeeId, author, previous_bill, null, null, is_model);
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
			return this.info || '';
		}

		setInfo(info) {
			this.info = info;
		}

		getUrl() {
			return this.url;
		}

		setUrl(url) {
			this.url = url;
		}

		removeProduct(id_product) {
			if (this.products.get(id_product)) {
				this.sum -= this.products.get(id_product).sum;
			}
			this.products.delete(id_product);
		}

		addProduct(id_product, product) {
			this.products.set(id_product, product);
		}

		switchOnTab() {
			this.on_tab = !this.on_tab;
		}

		isModify() {
			return this.previous_bill ? true : false;
		}

		isModel() {
			return this.is_model;
		}

		getPreviousBill() {
			return this.previous_bill;
		}

		getAuthor() {
			return this.author;
		}

		getModifyAuthor() {
			return this.modifyAuthor;
		}

		getDate() {
			return this.date;
		}

		getModifyDate() {
			return this.modifyDate;
		}

		async save(id, interaction, url) {
			let sum = 0;
			const mess_stocks = new Set();
			for (const [, product] of this.products) {
				sum += parseInt(product.sum);
			}
			await BillDB.upsert({
				id_bill: id,
				date_bill: this.previous_bill ? this.previous_bill.date_bill : moment(),
				sum_bill: sum,
				id_enterprise: this.enterprise.id_enterprise,
				id_employe: this.previous_bill ? this.previous_bill.id_employe : this.employeeId,
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
					id_employe: this.employeeId,
					timestamp: moment().tz('Europe/Paris'),
				});

				const stock_product = await Product.findOne({
					where: { id_product: key, id_message: { [Op.not]: null } },
				});

				if (stock_product) {
					mess_stocks.add(stock_product.id_message);
					if (product.sum > 0) {
						await stock_product.decrement({ qt: parseInt(product.quantity) });
					}
					else {
						await stock_product.increment({ qt: parseInt(product.quantity) });
					}
				}
			}

			for (const mess of mess_stocks) {
				const stock = await Stock.findOne({
					where: { id_message: mess },
				});
				const messageManager = new MessageManager(await interaction.client.channels.fetch(stock.id_channel));
				const stock_to_update = await messageManager.fetch({ message: stock.id_message });
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
				const tab_to_update = await messageManager.fetch({ message: this.enterprise.id_message });

				await Enterprise.decrement({ sum_ardoise: sum }, { where: { id_enterprise: this.enterprise.id_enterprise } });

				await tab_to_update.edit({
					embeds: [await getArdoiseEmbed(tab)],
				});
			}
		}

		async modify(interaction) {
			const mess_stocks = new Set();

			await BillDetail.destroy({ where: { id_bill: this.previous_bill.id_bill } });

			for (const op of this.previous_bill.bill_details) {
				await OpStock.create({
					id_product: op.id_product,
					qt: op.sum > 0 ? op.quantity : -op.quantity,
					id_employe: this.employeeId,
					timestamp: moment().tz('Europe/Paris'),
				});

				const stock_product = await Product.findOne({
					where: { id_product: op.id_product, id_message: { [Op.not]: null } },
				});

				if (stock_product) {
					mess_stocks.add(stock_product.id_message);
					if (op.sum > 0) {
						await stock_product.increment({ qt: parseInt(op.quantity) });
					}
					else {
						await stock_product.decrement({ qt: parseInt(op.quantity) });
					}
				}
			}

			for (const mess of mess_stocks) {
				const stock = await Stock.findOne({
					where: { id_message: mess },
				});
				const messageManager = new MessageManager(await interaction.client.channels.fetch(stock.id_channel));
				const stock_to_update = await messageManager.fetch({ message: stock.id_message });
				await stock_to_update.edit({
					embeds: [await getStockEmbed(stock)],
					components: await getStockButtons(stock),
				});
			}

			if (this.previous_bill.on_tab) {
				const tab = await Tab.findOne({
					where: { id_message: this.previous_bill.enterprise.id_message },
				});
				const messageManager = new MessageManager(await interaction.client.channels.fetch(tab.id_channel));
				const tab_to_update = await messageManager.fetch({ message: this.previous_bill.enterprise.id_message });

				await Enterprise.increment({ sum_ardoise: this.previous_bill.sum_bill }, { where: { id_enterprise: this.previous_bill.enterprise.id_enterprise } });

				await tab_to_update.edit({
					embeds: [await getArdoiseEmbed(tab)],
				});
			}

			await this.save(this.previous_bill.id_bill, interaction, this.previous_bill.url);
		}
	},
};
