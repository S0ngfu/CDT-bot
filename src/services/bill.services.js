const { Enterprise, PriceEnterprise, Product, Group } = require('../dbObjects.js');

module.exports = {
	Bill: class {
		constructor(id_enterprise) {
			this.enterprise = id_enterprise;
			this.products = new Array();
			this.date = new Date();
			console.log('test');
		}

		addProduct(id_product, quantity) {
			// add a product
			if (quantity > 0) {
				// Check if product already in array, otherwise push it
			}

			if (quantity === 0) {
				_removeProduct(id_product);
			}
		}

		setEnterprise(id_enterprise) {
			this.enterprise = id_enterprise;
			_updatePrices();
		}

		getEnterprise() {
			return this.enterprise;
		}

		getSum() {
			// sum all products
			console.log('testing');
		}
	},
};

function _updatePrices() {
	console.log('TODO-updatePrices');
}

function _removeProduct(id_product) {
	console.log('TODO-removeProduct: ', id_product);
}