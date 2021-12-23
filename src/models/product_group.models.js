module.exports = (sequelize, DataTypes) => {
	return sequelize.define('product_group', {
		id_group: {
			type: DataTypes.INTEGER,
		},
		id_product: {
			type: DataTypes.INTEGER,
		},
	}, {
		timestamps: false,
	});
};
