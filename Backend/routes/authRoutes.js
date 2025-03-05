const express = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', [
    body('username').isLength({ min: 3 }).trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('department').isLength({ min: 3 }).trim().escape(),
    body('password').isLength({ min: 6 }),
], authController.register);

router.post('/login', [
    body('username').trim().escape(),
    body('password').isLength({ min: 6 }),
], authController.login);

module.exports = router;