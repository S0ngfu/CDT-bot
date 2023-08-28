require('dotenv').config();
// process.env.CLIENT_ID / process.env.CLIENT_SECRET / process.env.APP_PORT
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

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

const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(bodyParser.json());
app.use('/api', indexRouter);
app.use('/api/token', tokenRouter);

app.use(async (req, res, next) => {
	const jwt_token = req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/, '') : '';

	// verify token then get user_id
	if (jwt_token === '') {
		return res.status(401).send();
	}

	const userData = jwt.verify(jwt_token, JWT_SECRET);

	console.log('userData: ', userData);

	const user = await Employee.findOne({ where: { id_employee: userData.user_id, date_firing: null } });
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
