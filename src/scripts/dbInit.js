const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	// SQLite only
	storage: './database.sqlite',
});

const initNew = process.argv.includes('-n');
const initEverything = process.argv.includes('-e');
const force = process.argv.includes('--force') || process.argv.includes('-f');

if (initNew) {
	const Recipe = require('../models/recipe.models')(sequelize, Sequelize.DataTypes);
	const Product = require('../models/product.models')(sequelize, Sequelize.DataTypes);

	Product.belongsTo(Recipe, { foreignKey: 'id_product', targetKey: 'id_product_made' });
	Recipe.hasMany(Product, { foreignKey: 'id_product', sourceKey: 'id_product_made' });
	Product.belongsTo(Recipe, { foreignKey: 'id_product', targetKey: 'id_product_ingredient_1' });
	Recipe.hasMany(Product, { foreignKey: 'id_product', sourceKey: 'id_product_ingredient_1' });
	Product.belongsTo(Recipe, { foreignKey: 'id_product', targetKey: 'id_product_ingredient_2' });
	Recipe.hasMany(Product, { foreignKey: 'id_product', sourceKey: 'id_product_ingredient_2' });
	Product.belongsTo(Recipe, { foreignKey: 'id_product', targetKey: 'id_product_ingredient_3' });
	Recipe.hasMany(Product, { foreignKey: 'id_product', sourceKey: 'id_product_ingredient_3' });

	sequelize.sync({ force }).then(async () => {
		console.log('Database synced');
		sequelize.close();
	}).catch(console.error);
}
else if (initEverything) {
	const Enterprise = require('../models/enterprise.models')(sequelize, Sequelize.DataTypes);
	const PriceEnterprise = require('../models/price_enterprise.models')(sequelize, Sequelize.DataTypes);
	const Product = require('../models/product.models')(sequelize, Sequelize.DataTypes);
	const Group = require('../models/group.models')(sequelize, Sequelize.DataTypes);
	require('../models/grossiste.models')(sequelize, Sequelize.DataTypes);

	// Gestion facture
	const Bill = require('../models/bill.models')(sequelize, Sequelize.DataTypes);
	const BillDetail = require('../models/bill_detail.models')(sequelize, Sequelize.DataTypes);
	const Tab = require('../models/tab.models')(sequelize, Sequelize.DataTypes);
	const Stock = require('../models/stock.models')(sequelize, Sequelize.DataTypes);
	const OpStock = require('../models/stock_operation.models')(sequelize, Sequelize.DataTypes);
	const Vehicle = require('../models/vehicle.models')(sequelize, Sequelize.DataTypes);
	const VehicleTaken = require('../models/vehicle_taken.models')(sequelize, Sequelize.DataTypes);
	require('../models/prise_service.models')(sequelize, Sequelize.DataTypes);
	const Recipe = require('../models/recipe.models')(sequelize, Sequelize.DataTypes);

	Recipe.belongsTo(Product, { foreignKey: 'id_product_made', targetKey: 'id_product', as: 'product_made' });
	Product.hasMany(Recipe, { foreignKey: 'id_product_made' });
	Recipe.belongsTo(Product, { foreignKey: 'id_product_ingredient_1', targetKey: 'id_product', as: 'ingredient_1' });
	Product.hasMany(Recipe, { foreignKey: 'id_product_ingredient_1' });
	Recipe.belongsTo(Product, { foreignKey: 'id_product_ingredient_2', targetKey: 'id_product', as: 'ingredient_2' });
	Product.hasMany(Recipe, { foreignKey: 'id_product_ingredient_2' });
	Recipe.belongsTo(Product, { foreignKey: 'id_product_ingredient_3', targetKey: 'id_product', as: 'ingredient_3' });
	Product.hasMany(Recipe, { foreignKey: 'id_product_ingredient_3' });


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

	BillDetail.belongsTo(Bill, { foreignKey: 'id_bill' });
	Bill.hasMany(BillDetail, { foreignKey: 'id_bill' });

	Bill.belongsTo(Enterprise, { foreignKey: 'id_enterprise' });
	Enterprise.hasMany(Bill, { foreignKey: 'id_enterprise' });

	Bill.belongsToMany(Product,
		{
			through: { model: BillDetail, unique: true },
			foreignKey: 'id_bill',
		},
	);
	Product.belongsToMany(Bill,
		{
			through: { model: BillDetail, unique: true },
			foreignKey: 'id_product',
		},
	);

	Tab.hasMany(Enterprise, { foreignKey: 'id_message' });
	Enterprise.belongsTo(Tab, { foreignKey: 'id_message' });

	Stock.hasMany(Product, { foreignKey: 'id_message' });
	Product.belongsTo(Stock, { foreignKey: 'id_message' });

	OpStock.belongsTo(Product, { foreignKey: 'id_product' });
	Product.hasMany(OpStock, { foreignKey: 'id_product' });

	VehicleTaken.belongsTo(Vehicle, { foreignKey: 'id_vehicle' });
	Vehicle.hasMany(VehicleTaken, { foreignKey: 'id_vehicle' });

	sequelize.sync({ force }).then(async () => {
		const enterprises = [
			Enterprise.upsert({ id_enterprise: 1, name_enterprise: 'ARC', color_enterprise: '000000' }),
			Enterprise.upsert({ id_enterprise: 2, name_enterprise: 'Benny\'s', color_enterprise: '0080ff' }),
			Enterprise.upsert({ id_enterprise: 3, name_enterprise: 'Blé d\'Or', color_enterprise: 'f0f957' }),
			Enterprise.upsert({ id_enterprise: 4, name_enterprise: 'Weazle News', color_enterprise: 'f51212' }),
			Enterprise.upsert({ id_enterprise: 5, name_enterprise: 'Gouvernement', color_enterprise: '4a4a4a' }),
			Enterprise.upsert({ id_enterprise: 6, name_enterprise: 'Mairie BC', color_enterprise: 'cda065' }),
			Enterprise.upsert({ id_enterprise: 7, name_enterprise: 'Mairie LS', color_enterprise: '32526f' }),
			Enterprise.upsert({ id_enterprise: 8, name_enterprise: 'M$T', color_enterprise: 'e6aa0d' }),
			Enterprise.upsert({ id_enterprise: 9, name_enterprise: 'Paradise', color_enterprise: '831ad9' }),
			Enterprise.upsert({ id_enterprise: 10, name_enterprise: 'PBSC', color_enterprise: '009933' }),
			Enterprise.upsert({ id_enterprise: 11, name_enterprise: 'PLS', color_enterprise: 'ff9f0f' }),
			Enterprise.upsert({ id_enterprise: 12, name_enterprise: 'Rapid\'Transit', color_enterprise: 'ffff00' }),
			Enterprise.upsert({ id_enterprise: 13, name_enterprise: 'Rogers', color_enterprise: '336600' }),
			Enterprise.upsert({ id_enterprise: 14, name_enterprise: 'SBC', color_enterprise: 'ffad33' }),
			Enterprise.upsert({ id_enterprise: 15, name_enterprise: 'Ryan\'s', color_enterprise: '1593a0' }),
		];

		const groups = [
			Group.upsert({ id_group: 1, name_group: 'Boissons sans alcool', emoji_group: '', default_group: true }),
			Group.upsert({ id_group: 2, name_group: 'Boissons avec alcool', emoji_group: '', default_group: false }),
			Group.upsert({ id_group: 3, name_group: 'Fruits', emoji_group: '', default_group: false }),
			Group.upsert({ id_group: 4, name_group: 'Achats', emoji_group: '', default_group: false }),
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
			Product.upsert({ id_product: 24, name_product: 'Cartons vide', emoji_product: '', default_price: -8, id_group: 4 }),
			Product.upsert({ id_product: 25, name_product: 'Sucres', emoji_product: '', default_price: -2, id_group: 4 }),
			Product.upsert({ id_product: 26, name_product: 'Bouteilles vide', emoji_product: '', default_price: -2, id_group: 4 }),
			Product.upsert({ id_product: 27, name_product: 'Pain d\'épices', emoji_product: '', default_price: -2, id_group: 4 }),
			Product.upsert({ id_product: 28, name_product: 'Verres carré', emoji_product: '', default_price: -2, id_group: 4 }),
			Product.upsert({ id_product: 29, name_product: 'Verres à vin', emoji_product: '', default_price: -2, id_group: 4 }),
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
}
else {
	console.log('You need to pass at least one argument in this list : [\'-p\', \'-g\', \'-f\']');
}
