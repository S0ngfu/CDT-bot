module.exports = (sequelize, DataTypes) => {
	return sequelize.define('enterprise', {
		id_enterprise: {
			type: DataTypes.INTEGER,
			primaryKey: true,
		},
		name_enterprise: DataTypes.STRING,
		emoji_enterprise: DataTypes.STRING,
		color_enterprise: {
			type: DataTypes.STRING(8),
			defaultValue: '000000',
		},
	}, {
		timestamps: false,
	});
};
