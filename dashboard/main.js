require('dotenv').config();
// process.env.CLIENT_ID / process.env.CLIENT_SECRET / process.env.APP_PORT
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');

// Load routes
const indexRouter = require('./routes/index');
const tokenRouter = require('./routes/token');
const billsRouter = require('./routes/bills');
const enterpriseRouter = require('./routes/enterprise');
const employeeRouter = require('./routes/employee');
const groupRouter = require('./routes/group');
const productRouter = require('./routes/product');
const vehicleRouter = require('./routes/vehicle');
const { Employee } = require('../src/dbObjects');

app.use(cors());
app.use(bodyParser.json());
app.use('/api', indexRouter);
app.use('/api/token', tokenRouter);

app.use(async (req, res, next) => {
	const access_id = req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/, '') : '';
	if (access_id === '') {
		return res.status(401).send();
	}

	const user = await Employee.findOne({ where: { access_id: access_id, date_firing: null } });
	if (!user) {
		return res.status(401).send();
	}
	next();
});

app.use('/api/bills', billsRouter);
app.use('/api/employee', employeeRouter);
app.use('/api/enterprise', enterpriseRouter);
app.use('/api/group', groupRouter);
app.use('/api/product', productRouter);
app.use('/api/vehicle', vehicleRouter);

app.get('*', (req, res) => {
	// res.sendFile(path.resolve(__dirname, '../../CDT-front/build', 'index.html'));
	res.sendStatus(404).end();
});

const loadDashboard = (client) => {
	app.myClient = client;
	app.listen(process.env.APP_PORT, () => {
		console.log(`Example app listening on port ${process.env.APP_PORT}`);
	});
};

module.exports = { loadDashboard };
