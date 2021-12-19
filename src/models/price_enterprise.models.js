module.exports = (sequelize, DataTypes) => {
	return sequelize.define('price_enterprise', {
		id_enterprise: {
			type: DataTypes.INTEGER,
		},
		id_product: {
			type: DataTypes.INTEGER,
		},
		enterprise_price: {
			type: DataTypes.INTEGER,
		},
	}, {
		timestamps: false,
	});
};
