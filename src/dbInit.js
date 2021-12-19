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

const force = process.argv.includes('--force') || process.argv.includes('-f');

sequelize.sync({ force }).then(async () => {
	const enterprises = [
		Enterprise.upsert({ id_enterprise: 1, name_enterprise: 'ARC', emoji_enterprise: '' }),
		Enterprise.upsert({ id_enterprise: 2, name_enterprise: 'Benny\'s', emoji_enterprise: '' }),
		Enterprise.upsert({ id_enterprise: 3, name_enterprise: 'Blé d\'Or', emoji_enterprise: '' }),
		Enterprise.upsert({ id_enterprise: 4, name_enterprise: 'Weazle News', emoji_enterprise: '' }),
		Enterprise.upsert({ id_enterprise: 5, name_enterprise: 'Gouvernement', emoji_enterprise: '' }),
		Enterprise.upsert({ id_enterprise: 6, name_enterprise: 'Mairie BC', emoji_enterprise: '' }),
		Enterprise.upsert({ id_enterprise: 7, name_enterprise: 'Mairie LS', emoji_enterprise: '' }),
		Enterprise.upsert({ id_enterprise: 8, name_enterprise: 'M$T', emoji_enterprise: '' }),
		Enterprise.upsert({ id_enterprise: 9, name_enterprise: 'Paradise', emoji_enterprise: '' }),
		Enterprise.upsert({ id_enterprise: 10, name_enterprise: 'PBSC', emoji_enterprise: '' }),
		Enterprise.upsert({ id_enterprise: 11, name_enterprise: 'PLS', emoji_enterprise: '' }),
		Enterprise.upsert({ id_enterprise: 12, name_enterprise: 'Rapid\'Transit', emoji_enterprise: '' }),
		Enterprise.upsert({ id_enterprise: 13, name_enterprise: 'Rogers', emoji_enterprise: '' }),
		Enterprise.upsert({ id_enterprise: 14, name_enterprise: 'SBC', emoji_enterprise: '' }),
		Enterprise.upsert({ id_enterprise: 15, name_enterprise: 'Ryan\'s', emoji_enterprise: '' }),
	];

	const groups = [
		Group.upsert({ id_group: 1, name_group: 'Boissons sans alcool', emoji_group: '', default_group: true }),
		Group.upsert({ id_group: 2, name_group: 'Boissons avec alcool', emoji_group: '', default_group: false }),
		Group.upsert({ id_group: 3, name_group: 'Fruits', emoji_group: '', default_group: false }),
	];

	const products = [
		Product.upsert({ id_product: 1, name_product: 'Bouteille de champagne', emoji_product: '', default_price: 90, id_group: 2 }),
		Product.upsert({ id_product: 2, name_product: 'Bouteille de champagne rosé', emoji_product: '', default_price: 90, id_group: 2 }),
		Product.upsert({ id_product: 3, name_product: 'Bouteille de Cidre', emoji_product: '', default_price: 50, id_group: 2 }),
		Product.upsert({ id_product: 4, name_product: 'Bouteille de Danton Cru', emoji_product: '', default_price: 4000, id_group: 2 }),
		Product.upsert({ id_product: 5, name_product: 'Bouteille de limonade', emoji_product: '', default_price: 10, id_group: 1 }),
		Product.upsert({ id_product: 6, name_product: 'Bouteille de vin blanc', emoji_product: '', default_price: 40, id_group: 2 }),
		Product.upsert({ id_product: 7, name_product: 'Bouteille de vin Prestige', emoji_product: '', default_price: 250, id_group: 2 }),
		Product.upsert({ id_product: 8, name_product: 'Bouteille de vin rosé', emoji_product: '', default_price: 40, id_group: 2 }),
		Product.upsert({ id_product: 9, name_product: 'Bouteille de vin rouge', emoji_product: '', default_price: 40, id_group: 2 }),
		Product.upsert({ id_product: 10, name_product: 'Brique de jus d\'orange', emoji_product: '', default_price: 10, id_group: 1 }),
		Product.upsert({ id_product: 11, name_product: 'Brique de jus de pomme', emoji_product: '', default_price: 10, id_group: 1 }),
		Product.upsert({ id_product: 12, name_product: 'Brique de jus de raisin', emoji_product: '', default_price: 10, id_group: 1 }),
		Product.upsert({ id_product: 13, name_product: 'Cerise', emoji_product: '', default_price: 5, id_group: 3 }),
		Product.upsert({ id_product: 14, name_product: 'Citron', emoji_product: '', default_price: 5, id_group: 3 }),
		Product.upsert({ id_product: 15, name_product: 'Orange', emoji_product: '', default_price: 5, id_group: 3 }),
		Product.upsert({ id_product: 16, name_product: 'Pêche', emoji_product: '', default_price: 5, id_group: 3 }),
		Product.upsert({ id_product: 17, name_product: 'Pomme', emoji_product: '', default_price: 5, id_group: 3 }),
		Product.upsert({ id_product: 18, name_product: 'Raisin', emoji_product: '', default_price: 5, id_group: 3 }),
		Product.upsert({ id_product: 19, name_product: 'Raisin blanc', emoji_product: '', default_price: 5, id_group: 3 }),
		Product.upsert({ id_product: 20, name_product: 'Verre de sangria', emoji_product: '', default_price: 20, id_group: 2 }),
		Product.upsert({ id_product: 21, name_product: 'Verre de vin chaud', emoji_product: '', default_price: 12, id_group: 1 }),
		Product.upsert({ id_product: 22, name_product: 'Jus d\'orange de noël', emoji_product: '', default_price: 10, id_group: 1 }),
		Product.upsert({ id_product: 23, name_product: 'Bouteille de vin "Muertos"', emoji_product: '', default_price: 150, id_group: 2 }),
	];

	const price_enterprise = [
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 5, enterprise_price: 7 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 10, enterprise_price: 5 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 11, enterprise_price: 5 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 12, enterprise_price: 5 }),

		PriceEnterprise.upsert({ id_enterprise: 2, id_product: 5, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 2, id_product: 10, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 2, id_product: 11, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 2, id_product: 12, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 2, id_product: 22, enterprise_price: 8 }),

		PriceEnterprise.upsert({ id_enterprise: 3, id_product: 5, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 3, id_product: 10, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 3, id_product: 11, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 3, id_product: 12, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 3, id_product: 14, enterprise_price: 4 }),
		PriceEnterprise.upsert({ id_enterprise: 3, id_product: 15, enterprise_price: 4 }),
		PriceEnterprise.upsert({ id_enterprise: 3, id_product: 17, enterprise_price: 3 }),
		PriceEnterprise.upsert({ id_enterprise: 3, id_product: 18, enterprise_price: 4 }),
		PriceEnterprise.upsert({ id_enterprise: 3, id_product: 22, enterprise_price: 8 }),

		PriceEnterprise.upsert({ id_enterprise: 4, id_product: 5, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 4, id_product: 10, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 4, id_product: 11, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 4, id_product: 12, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 4, id_product: 22, enterprise_price: 8 }),

		PriceEnterprise.upsert({ id_enterprise: 5, id_product: 5, enterprise_price: 7 }),
		PriceEnterprise.upsert({ id_enterprise: 5, id_product: 10, enterprise_price: 7 }),
		PriceEnterprise.upsert({ id_enterprise: 5, id_product: 11, enterprise_price: 7 }),
		PriceEnterprise.upsert({ id_enterprise: 5, id_product: 12, enterprise_price: 7 }),
		PriceEnterprise.upsert({ id_enterprise: 5, id_product: 22, enterprise_price: 7 }),

		PriceEnterprise.upsert({ id_enterprise: 6, id_product: 5, enterprise_price: 7 }),
		PriceEnterprise.upsert({ id_enterprise: 6, id_product: 10, enterprise_price: 7 }),
		PriceEnterprise.upsert({ id_enterprise: 6, id_product: 11, enterprise_price: 7 }),
		PriceEnterprise.upsert({ id_enterprise: 6, id_product: 12, enterprise_price: 7 }),
		PriceEnterprise.upsert({ id_enterprise: 6, id_product: 22, enterprise_price: 7 }),

		PriceEnterprise.upsert({ id_enterprise: 7, id_product: 5, enterprise_price: 7 }),
		PriceEnterprise.upsert({ id_enterprise: 7, id_product: 10, enterprise_price: 7 }),
		PriceEnterprise.upsert({ id_enterprise: 7, id_product: 11, enterprise_price: 7 }),
		PriceEnterprise.upsert({ id_enterprise: 7, id_product: 12, enterprise_price: 7 }),
		PriceEnterprise.upsert({ id_enterprise: 7, id_product: 22, enterprise_price: 7 }),

		PriceEnterprise.upsert({ id_enterprise: 8, id_product: 5, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 8, id_product: 10, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 8, id_product: 11, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 8, id_product: 12, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 8, id_product: 22, enterprise_price: 8 }),

		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 1, enterprise_price: 40 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 2, enterprise_price: 40 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 3, enterprise_price: 25 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 4, enterprise_price: 2000 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 5, enterprise_price: 6 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 6, enterprise_price: 20 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 7, enterprise_price: 125 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 8, enterprise_price: 20 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 9, enterprise_price: 20 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 10, enterprise_price: 6 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 11, enterprise_price: 6 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 12, enterprise_price: 6 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 13, enterprise_price: 2 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 14, enterprise_price: 2 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 15, enterprise_price: 2 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 16, enterprise_price: 2 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 17, enterprise_price: 2 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 18, enterprise_price: 2 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 19, enterprise_price: 2 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 20, enterprise_price: 12 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 21, enterprise_price: 12 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 22, enterprise_price: 7 }),

		PriceEnterprise.upsert({ id_enterprise: 10, id_product: 5, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 10, id_product: 10, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 10, id_product: 11, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 10, id_product: 12, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 10, id_product: 22, enterprise_price: 8 }),

		PriceEnterprise.upsert({ id_enterprise: 11, id_product: 5, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 11, id_product: 10, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 11, id_product: 11, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 11, id_product: 12, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 11, id_product: 22, enterprise_price: 8 }),

		PriceEnterprise.upsert({ id_enterprise: 13, id_product: 5, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 13, id_product: 10, enterprise_price: 6 }),
		PriceEnterprise.upsert({ id_enterprise: 13, id_product: 11, enterprise_price: 6 }),
		PriceEnterprise.upsert({ id_enterprise: 13, id_product: 12, enterprise_price: 6 }),
		PriceEnterprise.upsert({ id_enterprise: 13, id_product: 22, enterprise_price: 6 }),

		PriceEnterprise.upsert({ id_enterprise: 14, id_product: 13, enterprise_price: 3 }),
		PriceEnterprise.upsert({ id_enterprise: 14, id_product: 15, enterprise_price: 2 }),
		PriceEnterprise.upsert({ id_enterprise: 14, id_product: 16, enterprise_price: 2 }),
		PriceEnterprise.upsert({ id_enterprise: 14, id_product: 18, enterprise_price: 3 }),

		PriceEnterprise.upsert({ id_enterprise: 15, id_product: 5, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 15, id_product: 10, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 15, id_product: 11, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 15, id_product: 12, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 15, id_product: 22, enterprise_price: 8 }),
	];

	await Promise.all(enterprises);
	await Promise.all(products);
	await Promise.all(groups);
	await Promise.all(price_enterprise);

	console.log('Database synced');

	sequelize.close();
}).catch(console.error);