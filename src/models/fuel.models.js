module.exports = (sequelize, DataTypes) => {
	return sequelize.define('fuel', {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
		},
		date_fuel: {
			type: DataTypes.DATE,
			defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
		},
		qt_fuel: DataTypes.INTEGER,
		sum_fuel: DataTypes.INTEGER,
		id_employe: DataTypes.INTEGER,
		id_message: DataTypes.STRING,
	}, {
		timestamps: false,
	});
};
