const { Enterprise, Product, Bill: BillDB, BillDetail } = require('../dbObjects.js');
const moment = require('moment');

moment.locale('fr');

module.exports = {
	Bill: class Bill {
		constructor(enterprise) {
			this.enterprise = enterprise;
			this.products = new Map();
			this.date = new Date();
			this.sum = 0;
		}

		static async initialize(id_enterprise) {
			const enterprise = id_enterprise ? await Enterprise.findByPk(id_enterprise, { attributes: ['id_enterprise', 'name_enterprise', 'color_enterprise', 'emoji_enterprise'] }) : 0;
			return new Bill(enterprise);
		}

		async addProducts(products, quantity) {
			for (const p_id of products) {
				if (quantity > 0) {
					const product = await Product.findByPk(p_id, { attributes: ['name_product', 'emoji_product', 'default_price'] });
					if (this.enterprise) {
						const product_price = await this.enterprise.getProductPrice(p_id);
						this.addProduct(p_id, { name: product.name_product, emoji: product.emoji_product, quantity: quantity, default_price: product.default_price, price: product_price, sum: quantity * product_price });
					}
					else {
						this.addProduct(p_id, { name: product.name_product, emoji: product.emoji_product, quantity: quantity, default_price: product.default_price, price: product.default_price, sum: quantity * product.default_price });
					}
				}
				else if (quantity == 0) {
					this.removeProduct(p_id);
				}
			}
		}

		async setEnterprise(id_enterprise) {
			this.enterprise = id_enterprise ? await Enterprise.findByPk(id_enterprise, { attributes: ['id_enterprise', 'name_enterprise', 'color_enterprise', 'emoji_enterprise'] }) : 0;
			if (this.enterprise) {
				for (const [key, product] of this.products) {
					const product_price = await this.enterprise.getProductPrice(key);
					this.products.set(key, { ...product, price: product_price, sum: product.quantity * product_price });
				}
			}
			else {
				for (const [key, product] of this.products) {
					this.products.set(key, { ...product, price: product.default_price, sum: product.quantity * product.default_price });
				}
			}
		}

		getEnterprise() {
			return this.enterprise;
		}

		getEnterpriseId() {
			return this.enterprise.id_enterprise;
		}

		getProducts() {
			return this.products;
		}

		removeProduct(id_product) {
			this.products.delete(id_product);
		}

		addProduct(id_product, product) {
			this.products.set(id_product, product);
		}

		async save(id, id_employe, info) {
			let sum = 0;
			for (const [, product] of this.products) {
				sum += product.sum;
			}
			await BillDB.upsert({
				id_bill: id,
				date_bill: moment().tz('Europe/Paris'),
				sum_bill: sum,
				id_enterprise: this.enterprise.id_enterprise,
				id_employe: id_employe,
				info: info,
			});
			for (const [key, product] of this.products) {
				await BillDetail.upsert({
					id_bill: id,
					id_product: key,
					quantity: product.quantity,
					sum: product.sum,
				});
			}
		}
	},
};