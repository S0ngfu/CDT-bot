module.exports = (sequelize, DataTypes) => {
	return sequelize.define('bill_detail', {
		id_bill: DataTypes.STRING,
		id_product: DataTypes.INTEGER,
		quantity: DataTypes.INTEGER,
		sum: DataTypes.INTEGER,
	}, {
		timestamps: false,
	});
};
