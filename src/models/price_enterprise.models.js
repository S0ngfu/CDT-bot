module.exports = (sequelize, DataTypes) => {
	return sequelize.define('price_enterprise', {
		id_enterprise: {
			type: DataTypes.STRING(10),
		},
		id_product: {
			type: DataTypes.STRING(10),
		},
		enterprise_price: {
			type: DataTypes.INTEGER,
		},
	}, {
		timestamps: false,
	});
};
