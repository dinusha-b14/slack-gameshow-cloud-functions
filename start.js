'use strict';

const { verificationToken } = require('./config');

/**
 * @module start
 * @description Slash command for Slack that starts the gameshow for contestants on a channel.
 */

/**
 * Handles the request from the Slack Gameshow Slash command.
 * 
 * @param {Object} req - Cloud Function request context.
 * @param {Object} res - Cloud Function response context.
 */
module.exports = async (req, res) => {
    const { token } = req.body;

    if (token !== verificationToken) {
        res.status(403).end('Forbidden');
    } else {
        res.status(200).end();
    }
};
