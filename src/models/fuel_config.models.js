module.exports = (sequelize, DataTypes) => {
	return sequelize.define('fuel_config', {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
		},
		qt_fuel: DataTypes.INTEGER,
		price_fuel: DataTypes.INTEGER,
	}, {
		timestamps: false,
	});
};
