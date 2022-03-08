module.exports = (sequelize, DataTypes) => {
	return sequelize.define('stock_operation', {
		id_product: DataTypes.INTEGER,
		qt: DataTypes.STRING,
		id_employe: DataTypes.STRING,
		timestamp: {
			type: DataTypes.DATE,
			defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
		},
	}, {
		timestamps: false,
	});
};
