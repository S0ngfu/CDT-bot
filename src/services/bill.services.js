module.exports = {
	Bill: class {
		constructor(id_enterprise) {
			this.enterprise = id_enterprise;
			this.products = new Map();
			this.date = new Date();
		}

		addProducts(products, quantity) {
			products.forEach(p_id => {
				if (quantity > 0) {
					this.addProduct(p_id, quantity);
				}

				if (quantity == 0) {
					this.removeProduct(p_id);
				}
			});
		}

		setEnterprise(id_enterprise) {
			this.enterprise = id_enterprise;
		}

		getEnterprise() {
			return this.enterprise;
		}

		getProducts() {
			return this.products;
		}

		removeProduct(id_product) {
			this.products.delete(id_product);
		}

		addProduct(id_product, quantity) {
			this.products.set(id_product, quantity);
		}
	},
};