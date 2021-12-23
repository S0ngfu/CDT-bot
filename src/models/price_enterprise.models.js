module.exports = (sequelize, DataTypes) => {
	return sequelize.define('price_enterprise', {
		enterprise_price: {
			type: DataTypes.INTEGER,
			allowNull: false,
			'default': 0,
		},
	}, {
		timestamps: false,
	});
};
