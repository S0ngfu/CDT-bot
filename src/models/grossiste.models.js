module.exports = (sequelize, DataTypes) => {
	return sequelize.define('grossiste', {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
		},
		id_employe: DataTypes.INTEGER,
		quantite: DataTypes.INTEGER(8),
		timestamp: {
			type: DataTypes.DATE,
			defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
		},
	}, {
		timestamps: false,
	});
};
