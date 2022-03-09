module.exports = (sequelize, DataTypes) => {
	return sequelize.define('stock', {
		id_message: {
			type: DataTypes.STRING,
			primaryKey: true,
		},
		id_channel: DataTypes.STRING,
		colour_stock: {
			type: DataTypes.STRING(8),
			defaultValue: '000000',
		},
	}, {
		timestamps: false,
	});
};
