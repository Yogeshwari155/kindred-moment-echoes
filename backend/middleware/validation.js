const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

/**
 * Middleware to handle validation results
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data',
      details: errorMessages
    });
  }
  next();
};

/**
 * Validation rules for creating a moment
 */
const validateCreateMoment = [
  body('location.name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Location name must be between 1 and 200 characters'),
  
  body('location.coordinates.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('location.coordinates.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('location.address')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Address must be less than 300 characters'),
  
  handleValidationErrors
];

/**
 * Validation rules for creating a post
 */
const validateCreatePost = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Post content must be between 1 and 500 characters'),
  
  body('mood')
    .optional()
    .isIn(['calm', 'excited', 'nostalgic', 'peaceful', 'inspired', 'happy', 'contemplative', 'grateful', 'energetic', 'cozy'])
    .withMessage('Invalid mood type'),
  
  body('type')
    .optional()
    .isIn(['text', 'image'])
    .withMessage('Post type must be either text or image'),
  
  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  
  handleValidationErrors
];

/**
 * Validation rules for mood voting
 */
const validateMoodVote = [
  body('mood')
    .isIn(['calm', 'excited', 'nostalgic', 'peaceful', 'inspired', 'happy', 'contemplative', 'grateful', 'energetic', 'cozy'])
    .withMessage('Invalid mood type'),
  
  body('intensity')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Mood intensity must be between 1 and 5'),
  
  handleValidationErrors
];

/**
 * Validation rules for MongoDB ObjectId parameters
 */
const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`),
  
  handleValidationErrors
];

/**
 * Validation rules for pagination
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

/**
 * Validation rules for location-based queries
 */
const validateLocationQuery = [
  query('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  query('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  query('radius')
    .optional()
    .isFloat({ min: 0.1, max: 50 })
    .withMessage('Radius must be between 0.1 and 50 kilometers'),
  
  handleValidationErrors
];

/**
 * Validation rules for chat messages
 */
const validateChatMessage = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Message must be between 1 and 200 characters'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateCreateMoment,
  validateCreatePost,
  validateMoodVote,
  validateObjectId,
  validatePagination,
  validateLocationQuery,
  validateChatMessage
};