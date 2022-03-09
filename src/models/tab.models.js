module.exports = (sequelize, DataTypes) => {
	return sequelize.define('tab', {
		id_message: {
			type: DataTypes.STRING,
			primaryKey: true,
		},
		id_channel: DataTypes.STRING,
		colour_tab: {
			type: DataTypes.STRING(8),
			defaultValue: '000000',
		},
	}, {
		timestamps: false,
	});
};
