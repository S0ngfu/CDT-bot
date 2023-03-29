module.exports = (sequelize, DataTypes) => {
	return sequelize.define('bill_model', {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
		},
		id_employe: DataTypes.INTEGER,
		data: DataTypes.JSONB,
		name: DataTypes.STRING,
		emoji: DataTypes.STRING,
	}, {
		timestamps: false,
	});
};
