module.exports = (sequelize, DataTypes) => {
	return sequelize.define('product', {
		id_product: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
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
		id_message: DataTypes.STRING,
		qt: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		qt_wanted: DataTypes.INTEGER,
		order: DataTypes.INTEGER,
		calculo_check: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		deleted: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
	}, {
		timestamps: false,
	});
};
