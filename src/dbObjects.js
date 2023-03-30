const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	// SQLite only
	storage: './database.sqlite',
});

const Enterprise = require('./models/enterprise.models')(sequelize, Sequelize.DataTypes);
const PriceEnterprise = require('./models/price_enterprise.models')(sequelize, Sequelize.DataTypes);
const Product = require('./models/product.models')(sequelize, Sequelize.DataTypes);
const Group = require('./models/group.models')(sequelize, Sequelize.DataTypes);
const Grossiste = require('./models/grossiste.models')(sequelize, Sequelize.DataTypes);
const Bill = require('./models/bill.models')(sequelize, Sequelize.DataTypes);
const BillDetail = require('./models/bill_detail.models')(sequelize, Sequelize.DataTypes);
const Tab = require('./models/tab.models')(sequelize, Sequelize.DataTypes);
const Stock = require('./models/stock.models')(sequelize, Sequelize.DataTypes);
const OpStock = require('./models/stock_operation.models')(sequelize, Sequelize.DataTypes);
const PriseService = require('./models/prise_service.models')(sequelize, Sequelize.DataTypes);
const Vehicle = require('./models/vehicle.models')(sequelize, Sequelize.DataTypes);
const VehicleTaken = require('./models/vehicle_taken.models')(sequelize, Sequelize.DataTypes);
const Employee = require('./models/employee.models')(sequelize, Sequelize.DataTypes);
const PhoneBook = require('./models/phone_book.models')(sequelize, Sequelize.DataTypes);
const TransfertGrossiste = require('./models/transfert_grossiste.models')(sequelize, Sequelize.DataTypes);
const Expense = require('./models/expenses.models')(sequelize, Sequelize.DataTypes);
const BillModel = require('./models/bill_model.models')(sequelize, Sequelize.DataTypes);
const Recipe = require('./models/recipe.models')(sequelize, Sequelize.DataTypes);
const ReglInt = require('./models/regl_int.models')(sequelize, Sequelize.DataTypes);
const Fuel = require('./models/fuel.models')(sequelize, Sequelize.DataTypes);
const FuelConfig = require('./models/fuel_config.models')(sequelize, Sequelize.DataTypes);

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

Bill.belongsTo(Employee, { foreignKey: 'id_employe' });
Employee.hasMany(Bill, { foreignKey: 'id_employe' });

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

OpStock.belongsTo(Employee, { foreignKey: 'id_employe' });
Employee.hasMany(OpStock, { foreignKey: 'id_employe' });

VehicleTaken.belongsTo(Vehicle, { foreignKey: 'id_vehicle' });
Vehicle.hasMany(VehicleTaken, { foreignKey: 'id_vehicle' });
VehicleTaken.belongsTo(Employee, { foreignKey: 'id_employe' });
Employee.hasMany(VehicleTaken, { foreignKey: 'id_employe' });

BillDetail.belongsTo(Product, { foreignKey: 'id_product' });
Product.hasMany(BillDetail, { foreignKey: 'id_product' });

BillModel.belongsTo(Employee, { foreignKey: 'id_employe', targetKey: 'id' });
Employee.hasMany(BillModel, { foreignKey: 'id_employe' });

Grossiste.belongsTo(Employee, { foreignKey: 'id_employe' });
Employee.hasMany(Grossiste, { foreignKey: 'id_employe' });

Fuel.belongsTo(Employee, { foreignKey: 'id_employe' });
Employee.hasMany(Fuel, { foreignKey: 'id_employe' });

TransfertGrossiste.belongsTo(Employee, { foreignKey: 'id_employe_giver', targetKey: 'id', as: 'employe_giver' });
Employee.hasMany(TransfertGrossiste, { foreignKey: 'id_employe_giver' });
TransfertGrossiste.belongsTo(Employee, { foreignKey: 'id_employe_receiver', targetKey: 'id', as: 'employe_receiver' });
Employee.hasMany(TransfertGrossiste, { foreignKey: 'id_employe_receiver' });

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

Reflect.defineProperty(Vehicle.prototype, 'hasPlace', {
	value: async function hasPlace(id, maxPlace) {
		const placeTaken = await VehicleTaken.count({ where: { id_vehicle: id } });

		return placeTaken < maxPlace;
	},
});

module.exports = {
	Bill,
	BillDetail,
	BillModel,
	Employee,
	Enterprise,
	Expense,
	Grossiste,
	Group,
	Recipe,
	ReglInt,
	OpStock,
	PhoneBook,
	PriceEnterprise,
	PriseService,
	Product,
	Stock,
	Tab,
	TransfertGrossiste,
	Vehicle,
	VehicleTaken,
	Fuel,
	FuelConfig,
};