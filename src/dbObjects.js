const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	// SQLite only
	storage: './gestion_produit.sqlite',
});

const Enterprise = require('./models/enterprise.models')(sequelize, Sequelize.DataTypes);
const PriceEnterprise = require('./models/price_enterprise.models')(sequelize, Sequelize.DataTypes);
const Product = require('./models/product.models')(sequelize, Sequelize.DataTypes);
const Group = require('./models/group.models')(sequelize, Sequelize.DataTypes);


Enterprise.belongsToMany(Product,
	{
		through: PriceEnterprise,
		foreignKey: {
			name: 'id_enterprise',
			field: 'id_enterprise',
		},
	},
);

Product.belongsToMany(Enterprise,
	{
		through: PriceEnterprise,
		foreignKey: {
			name: 'id_product',
			field: 'id_product',
		},
	},
);

Product.belongsTo(Group, { foreignKey: 'id_group' });

Group.hasMany(Product, { foreignKey: 'id_group' });

Reflect.defineProperty(Enterprise.prototype, 'getProductPrice', {
	value: async function getProductPrice(id) {
		let price = null;
		const productEnterprise = await PriceEnterprise.findOne({
			where: { id_enterprise: this.id_enterprise, id_product: id },
		});

		if (!productEnterprise) {
			const product = await Product.findOne({
				where: { id_product: id },
				attributes: ['default_price'],
			});
			price = product.default_price;
		}
		else {
			price = productEnterprise.enterprise_price;
		}
		return price;
	},
});

module.exports = { Enterprise, PriceEnterprise, Product, Group };