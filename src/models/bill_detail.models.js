module.exports = (sequelize, DataTypes) => {
	return sequelize.define('bill_detail', {
		id_bill: DataTypes.INTEGER,
		// Or String (see bill.models)
		id_product: DataTypes.INTEGER,
		quantity: DataTypes.INTEGER,
		sum: DataTypes.INTEGER,
	}, {
		timestamps: false,
	});
};
