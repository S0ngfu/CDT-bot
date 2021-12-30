const Sequelize = require('sequelize');

const sequelize_produits = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	// SQLite only
	storage: './gestion_produit.sqlite',
});

const sequelize_grossiste = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	// SQLite only
	storage: './gestion_grossiste.sqlite',
});

const Enterprise = require('./models/enterprise.models')(sequelize_produits, Sequelize.DataTypes);
const PriceEnterprise = require('./models/price_enterprise.models')(sequelize_produits, Sequelize.DataTypes);
const Product = require('./models/product.models')(sequelize_produits, Sequelize.DataTypes);
const Group = require('./models/group.models')(sequelize_produits, Sequelize.DataTypes);
const Grossiste = require('./models/grossiste.models')(sequelize_grossiste, Sequelize.DataTypes);

Enterprise.belongsToMany(Product,
	{
		through: { model: PriceEnterprise, unique: false },
		foreignKey: 'id_enterprise',
	},
);

Product.belongsToMany(Enterprise,
	{
		through: { model: PriceEnterprise, unique: false },
		foreignKey: 'id_product',
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

module.exports = { Enterprise, PriceEnterprise, Product, Group, Grossiste };