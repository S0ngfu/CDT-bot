module.exports = (sequelize, DataTypes) => {
	return sequelize.define('vehicle', {
		id_vehicle: {
			type: DataTypes.INTEGER,
			primaryKey: true,
		},
		name_vehicle: DataTypes.STRING,
		emoji_vehicle: DataTypes.STRING,
		color_vehicle: DataTypes.STRING(8),
		nb_place_vehicle: DataTypes.INTEGER,
		taken_by: DataTypes.STRING,
		available: {
			type: DataTypes.BOOLEAN,
			default: true,
		},
		available_reason: DataTypes.STRING,
		to_repair: {
			type: DataTypes.BOOLEAN,
			default: false,
		},
		can_take_break: {
			type: DataTypes.BOOLEAN,
			default: true,
		},
		order: DataTypes.INTEGER,
	}, {
		timestamps: false,
	});
};
