module.exports = (sequelize, DataTypes) => {
	return sequelize.define('product', {
		id_product: {
			type: DataTypes.STRING(10),
			primaryKey: true,
		},
		name_product: DataTypes.STRING,
		emoji_product: DataTypes.STRING,
		default_price: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		id_group: DataTypes.STRING(10),
		is_available: {
			type: DataTypes.BOOLEAN,
			defaultValue: true,
		},
	}, {
		timestamps: false,
	});
};
