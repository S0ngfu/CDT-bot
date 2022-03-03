const { Enterprise, Product, Bill: BillDB, BillDetail, Tab } = require('../dbObjects.js');
const { MessageEmbed, MessageManager } = require('discord.js');
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
					const product_sum = product.quantity * product_price;
					this.sum += product_sum;
					this.products.set(key, { ...product, price: product_price, sum: product_sum });
				}
			}
			else {
				this.on_tab = false;
				for (const [key, product] of this.products) {
					const product_sum = product.quantity * product.default_price;
					this.sum += product_sum;
					this.products.set(key, { ...product, price: product.default_price, sum: product_sum });
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

		removeProduct(id_product) {
			const product = this.products.get(id_product);
			this.sum -= product.sum;
			this.products.delete(id_product);
		}

		addProduct(id_product, product) {
			this.products.set(id_product, product);
		}

		switchOnTab() {
			this.on_tab = !this.on_tab;
		}

		async save(id, interaction, info) {
			let sum = 0;
			for (const [, product] of this.products) {
				sum += product.sum;
			}
			await BillDB.upsert({
				id_bill: id,
				date_bill: moment().tz('Europe/Paris'),
				sum_bill: sum,
				id_enterprise: this.enterprise.id_enterprise,
				id_employe: interaction.user.id,
				info: info,
				on_tab: this.on_tab,
				ignore_transaction: this.on_tab ? true : false,
			});
			for (const [key, product] of this.products) {
				await BillDetail.upsert({
					id_bill: id,
					id_product: key,
					quantity: product.quantity,
					sum: product.sum,
				});
			}
			if (this.on_tab) {
				const tab = await Tab.findOne({
					where: { id_message: this.enterprise.id_message },
				});
				const messageManager = new MessageManager(await interaction.client.channels.fetch(tab.id_channel));
				const tab_to_update = await messageManager.fetch(this.enterprise.id_message);
				const sumTab = Number.isInteger(this.enterprise.sum_ardoise) ? (this.enterprise.sum_ardoise - sum) : -sum;
				await this.enterprise.update({ sum_ardoise: sumTab });
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