module.exports = (sequelize, DataTypes) => {
	return sequelize.define('product', {
		id_product: {
			type: DataTypes.INTEGER,
			primaryKey: true,
		},
		name_product: DataTypes.STRING,
		emoji_product: DataTypes.STRING,
		default_price: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		id_group: DataTypes.INTEGER,
		is_available: {
			type: DataTypes.BOOLEAN,
			defaultValue: true,
		},
	}, {
		timestamps: false,
	});
};
