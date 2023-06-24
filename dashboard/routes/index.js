const express = require('express');
const router = express.Router();

// router.get('/', (req, res) => res.json({
// 	user: req.session.user,
// 	success: res.locals.success,
// }));

router.get('/', (req, res) => {
	res.json({ message: 'Hello world! hello!' });
});

module.exports = router;
