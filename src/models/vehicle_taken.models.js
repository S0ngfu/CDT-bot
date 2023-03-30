module.exports = (sequelize, DataTypes) => {
	return sequelize.define('vehicle_taken', {
		id_vehicle: {
			type: DataTypes.INTEGER,
		},
		id_employe: DataTypes.INTEGER,
		taken_at: {
			type: DataTypes.DATE,
			defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
		},
	}, {
		timestamps: false,
	});
};
