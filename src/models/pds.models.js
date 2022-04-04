module.exports = (sequelize, DataTypes) => {
	return sequelize.define('pds', {
		id_message: {
			type: DataTypes.STRING,
			primaryKey: true,
		},
		id_channel: DataTypes.STRING,
		colour_pds: {
			type: DataTypes.STRING(8),
			defaultValue: 'RANDOM',
		},
		on_break: {
			type: DataTypes.BOOLEAN,
			default: false,
		},
		break_reason: DataTypes.STRING,
	}, {
		timestamps: false,
	});
};
