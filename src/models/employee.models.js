module.exports = (sequelize, DataTypes) => {
	return sequelize.define('employee', {
		id_employee: {
			type: DataTypes.STRING,
		},
		name_employee: DataTypes.STRING,
		phone_number: DataTypes.STRING,
		wage: DataTypes.INTEGER,
		contract: DataTypes.STRING,
		date_hiring: {
			type: DataTypes.DATE,
			defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
		},
		date_cdi: {
			type: DataTypes.DATE,
		},
		date_firing: {
			type: DataTypes.DATE,
		},
		driving_licence: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		diploma: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		date_medical_checkup: DataTypes.DATE,
		pp_url: DataTypes.STRING,
		pp_file: DataTypes.STRING,
		embed_color: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		id_channel: DataTypes.STRING,
		id_message: DataTypes.STRING,
	}, {
		timestamps: false,
	});
};
