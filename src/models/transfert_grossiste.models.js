module.exports = (sequelize, DataTypes) => {
	return sequelize.define('transfert_grossiste', {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
		},
		id_employe_giver: DataTypes.INTEGER,
		id_employe_receiver: DataTypes.INTEGER,
		quantite: DataTypes.INTEGER(8),
		done: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		error: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		timestamp: {
			type: DataTypes.DATE,
			defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
		},
	}, {
		timestamps: false,
	});
};
