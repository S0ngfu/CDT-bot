const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	// SQLite only
	storage: './database.sqlite',
});

const force = process.argv.includes('--force') || process.argv.includes('-f');

require('../models/grossiste.models')(sequelize, Sequelize.DataTypes);
const Enterprise = require('../models/enterprise.models')(sequelize, Sequelize.DataTypes);
const PriceEnterprise = require('../models/price_enterprise.models')(sequelize, Sequelize.DataTypes);
const Product = require('../models/product.models')(sequelize, Sequelize.DataTypes);
const Group = require('../models/group.models')(sequelize, Sequelize.DataTypes);

// Gestion facture
const Bill = require('../models/bill.models')(sequelize, Sequelize.DataTypes);
const BillDetail = require('../models/bill_detail.models')(sequelize, Sequelize.DataTypes);
const Tab = require('../models/tab.models')(sequelize, Sequelize.DataTypes);
const Stock = require('../models/stock.models')(sequelize, Sequelize.DataTypes);
const OpStock = require('../models/stock_operation.models')(sequelize, Sequelize.DataTypes);

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

sequelize.sync({ force }).then(async () => {
	const enterprises = [
		Enterprise.upsert({ id_enterprise: 1, name_enterprise: 'ARC', color_enterprise: '000000' }),
		Enterprise.upsert({ id_enterprise: 2, name_enterprise: 'Benny\'s', color_enterprise: '0080ff' }),
		Enterprise.upsert({ id_enterprise: 3, name_enterprise: 'Castello Don Telo', color_enterprise: 'ac0606' }),
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
		Enterprise.upsert({ id_enterprise: 16, name_enterprise: 'Vivaldi', color_enterprise: 'ffffff' }),
	];

	const groups = [
		Group.upsert({ id_group: 1, name_group: 'Boissons', emoji_group: '', default_group: false }),
		Group.upsert({ id_group: 2, name_group: 'Viennoiseries', emoji_group: '', default_group: false }),
		Group.upsert({ id_group: 3, name_group: 'Desserts', emoji_group: '', default_group: true }),
		Group.upsert({ id_group: 4, name_group: 'Matières premières', emoji_group: '', default_group: false }),
		Group.upsert({ id_group: 5, name_group: 'Achats', emoji_group: '', default_group: false }),
	];

	const products = [
		Product.upsert({ id_product: 1, name_product: 'Brownie', emoji_product: '', default_price: 15, id_group: 3 }),
		Product.upsert({ id_product: 2, name_product: 'Chausson aux pommes', emoji_product: '', default_price: 15, id_group: 2 }),
		Product.upsert({ id_product: 3, name_product: 'Chocolak', emoji_product: '', default_price: 10, id_group: 1 }),
		Product.upsert({ id_product: 4, name_product: 'Chocolat', emoji_product: '', default_price: 5, id_group: 4 }),
		Product.upsert({ id_product: 5, name_product: 'Compote de pommes', emoji_product: '', default_price: 15, id_group: 3 }),
		Product.upsert({ id_product: 6, name_product: 'Croissant', emoji_product: '', default_price: 15, id_group: 2 }),
		Product.upsert({ id_product: 7, name_product: 'Farine', emoji_product: '', default_price: 0, id_group: 4 }),
		Product.upsert({ id_product: 8, name_product: 'Fraise', emoji_product: '', default_price: 5, id_group: 4 }),
		Product.upsert({ id_product: 9, name_product: 'Fromage Blanc', emoji_product: '', default_price: 15, id_group: 3 }),
		Product.upsert({ id_product: 10, name_product: 'Lait', emoji_product: '', default_price: 10, id_group: 1 }),
		Product.upsert({ id_product: 11, name_product: 'Moelleux marrons', emoji_product: '', default_price: 15, id_group: 3 }),
		Product.upsert({ id_product: 12, name_product: 'Pain choco', emoji_product: '', default_price: 15, id_group: 2 }),
		Product.upsert({ id_product: 13, name_product: 'Pain raisin', emoji_product: '', default_price: 15, id_group: 2 }),
		Product.upsert({ id_product: 14, name_product: 'Salade de fruits', emoji_product: '', default_price: 15, id_group: 3 }),
		Product.upsert({ id_product: 15, name_product: 'Tarte aux citrons', emoji_product: '', default_price: 15, id_group: 3 }),
		Product.upsert({ id_product: 16, name_product: 'Tarte aux fraise', emoji_product: '', default_price: 15, id_group: 3 }),
		Product.upsert({ id_product: 17, name_product: 'Tarte aux pommes', emoji_product: '', default_price: 15, id_group: 3 }),

		Product.upsert({ id_product: 18, name_product: 'Pomme', emoji_product: '', default_price: 0, id_group: 5 }),
		Product.upsert({ id_product: 19, name_product: 'Citron', emoji_product: '', default_price: 0, id_group: 5 }),
		Product.upsert({ id_product: 20, name_product: 'Orange', emoji_product: '', default_price: 0, id_group: 5 }),
		Product.upsert({ id_product: 21, name_product: 'Raisin', emoji_product: '', default_price: 0, id_group: 5 }),
		Product.upsert({ id_product: 22, name_product: 'Carton', emoji_product: '', default_price: 0, id_group: 5 }),
		Product.upsert({ id_product: 23, name_product: 'Mûre', emoji_product: '', default_price: 0, id_group: 5 }),
		Product.upsert({ id_product: 24, name_product: 'Marron', emoji_product: '', default_price: 0, id_group: 5 }),
		Product.upsert({ id_product: 25, name_product: 'Noisette', emoji_product: '', default_price: 0, id_group: 5 }),
		Product.upsert({ id_product: 26, name_product: 'Sucre', emoji_product: '', default_price: 0, id_group: 5 }),

		Product.upsert({ id_product: 27, name_product: 'Fromage', emoji_product: '', default_price: 0, id_group: 4 }),
		Product.upsert({ id_product: 28, name_product: 'Patate', emoji_product: '', default_price: 0, id_group: 4 }),
		Product.upsert({ id_product: 29, name_product: 'Tomate', emoji_product: '', default_price: 0, id_group: 4 }),
		Product.upsert({ id_product: 30, name_product: 'Salade', emoji_product: '', default_price: 0, id_group: 4 }),
		Product.upsert({ id_product: 31, name_product: 'Maïs', emoji_product: '', default_price: 0, id_group: 4 }),
		Product.upsert({ id_product: 32, name_product: 'Oeuf', emoji_product: '', default_price: 0, id_group: 4 }),
		Product.upsert({ id_product: 33, name_product: 'Pain', emoji_product: '', default_price: 0, id_group: 4 }),
		Product.upsert({ id_product: 34, name_product: 'Blé', emoji_product: '', default_price: 0, id_group: 4 }),
	];

	const price_enterprise = [
		// ARC
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 1, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 2, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 4, enterprise_price: 5 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 5, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 6, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 7, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 8, enterprise_price: 5 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 9, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 27, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 10, enterprise_price: 7 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 31, enterprise_price: 5 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 11, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 32, enterprise_price: 5 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 33, enterprise_price: 12 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 12, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 13, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 28, enterprise_price: 5 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 30, enterprise_price: 5 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 14, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 15, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 16, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 17, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 1, id_product: 29, enterprise_price: 5 }),

		// PBSC
		PriceEnterprise.upsert({ id_enterprise: 10, id_product: 4, enterprise_price: 4 }),

		// Paradise
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 1, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 2, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 4, enterprise_price: 3 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 5, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 6, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 27, enterprise_price: 8 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 9, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 10, enterprise_price: 9 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 11, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 12, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 13, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 28, enterprise_price: 4 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 14, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 15, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 16, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 17, enterprise_price: 10 }),
		PriceEnterprise.upsert({ id_enterprise: 9, id_product: 26, enterprise_price: -2 }),

		// SBC
		PriceEnterprise.upsert({ id_enterprise: 14, id_product: 34, enterprise_price: 3 }),
		PriceEnterprise.upsert({ id_enterprise: 14, id_product: 8, enterprise_price: 5 }),
		PriceEnterprise.upsert({ id_enterprise: 14, id_product: 31, enterprise_price: 3 }),
		PriceEnterprise.upsert({ id_enterprise: 14, id_product: 28, enterprise_price: 2 }),
		PriceEnterprise.upsert({ id_enterprise: 14, id_product: 26, enterprise_price: -2 }),

		// CDT
		PriceEnterprise.upsert({ id_enterprise: 3, id_product: 18, enterprise_price: -3 }),
		PriceEnterprise.upsert({ id_enterprise: 3, id_product: 19, enterprise_price: -4 }),
		PriceEnterprise.upsert({ id_enterprise: 3, id_product: 20, enterprise_price: -4 }),
		PriceEnterprise.upsert({ id_enterprise: 3, id_product: 21, enterprise_price: -4 }),

		// PBSC
		PriceEnterprise.upsert({ id_enterprise: 10, id_product: 22, enterprise_price: -6 }),
		PriceEnterprise.upsert({ id_enterprise: 10, id_product: 23, enterprise_price: -5 }),
		PriceEnterprise.upsert({ id_enterprise: 10, id_product: 24, enterprise_price: -5 }),
		PriceEnterprise.upsert({ id_enterprise: 10, id_product: 25, enterprise_price: -5 }),
	];

	await Promise.all(enterprises);
	await Promise.all(products);
	await Promise.all(groups);
	await Promise.all(price_enterprise);

	console.log('Database synced');

	sequelize.close();
}).catch(console.error);
