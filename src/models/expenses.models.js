module.exports = (sequelize, DataTypes) => {
	return sequelize.define('expense', {
		id_expense: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
		},
		date_expense: {
			type: DataTypes.DATE,
			defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
		},
		sum_expense: DataTypes.INTEGER,
		libelle_expense: DataTypes.STRING,
	}, {
		timestamps: false,
	});
};
