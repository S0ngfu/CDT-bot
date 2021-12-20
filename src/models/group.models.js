module.exports = (sequelize, DataTypes) => {
	return sequelize.define('group', {
		id_group: {
			type: DataTypes.STRING(10),
			primaryKey: true,
		},
		name_group: DataTypes.STRING,
		emoji_group: DataTypes.STRING,
		default_group: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
	}, {
		timestamps: false,
	});
};
