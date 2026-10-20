// Input validation utilities
import { body, validationResult } from 'express-validator';

// Password strength validation
export const validatePassword = (password) => {
    const minLength = 8;
    const maxLength = 128;

    if (password.length < minLength) {
        return { valid: false, message: `Password must be at least ${minLength} characters long` };
    }

    if (password.length > maxLength) {
        return { valid: false, message: `Password must not exceed ${maxLength} characters` };
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }

    // Check for at least one number
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one number' };
    }

    return { valid: true };
};

// Username validation
export const validateUsername = (username) => {
    const minLength = 3;
    const maxLength = 20;
    const usernameRegex = /^[a-zA-Z0-9_]+$/;

    if (username.length < minLength || username.length > maxLength) {
        return { valid: false, message: `Username must be between ${minLength} and ${maxLength} characters` };
    }

    if (!usernameRegex.test(username)) {
        return { valid: false, message: 'Username can only contain letters, numbers, and underscores' };
    }

    return { valid: true };
};

// Express-validator rules for registration
export const registrationValidation = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 20 })
        .withMessage('Username must be between 3 and 20 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),

    body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/)
        .withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number'),
];

// Express-validator rules for login
export const loginValidation = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required'),

    body('password')
        .notEmpty()
        .withMessage('Password is required'),
];

// Validation result handler middleware
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: errors.array()[0].msg
        });
    }
    next();
};
