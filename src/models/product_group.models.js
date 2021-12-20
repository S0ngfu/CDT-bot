module.exports = (sequelize, DataTypes) => {
	return sequelize.define('product_group', {
		id_group: {
			type: DataTypes.STRING(10),
		},
		id_product: {
			type: DataTypes.STRING(10),
		},
	}, {
		timestamps: false,
	});
};
