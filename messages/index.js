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
const buzzedNotificationForContestant = require('./buzzedNotificationForContestant');
const buzzedNotificationForHost = require('./buzzedNotificationForHost');
const answerCorrectPointsAllocation = require('./answerCorrectPointsAllocation');

module.exports = {
    welcome,
    gameAlreadyStarted,
    buzzer,
    cancelGame,
    gameStarted,
    buzzedNotificationForContestant,
    buzzedNotificationForHost,
    answerCorrectPointsAllocation
};
