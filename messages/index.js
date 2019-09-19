'use strict';

/**
 * @module messages
 * @description An index of all messages used within the app.
 */

const welcome = require('./welcome');
const gameAlreadyStarted = require('./gameAlreadyStarted');
const buzzer = require('./buzzer');
const cancelGame = require('./cancelGame');
const gameStarted = require('./gameStarted');

module.exports = {
    welcome,
    gameAlreadyStarted,
    buzzer,
    cancelGame,
    gameStarted
};
