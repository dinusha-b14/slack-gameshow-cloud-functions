'use strict';

const axios = require('axios');
const { Firestore } = require('@google-cloud/firestore');
const { verificationToken } = require('../config');
const { welcome, gameAlreadyStarted } = require('../messages');

/**
 * @module start
 * @description Slash command for Slack that starts the gameshow for contestants on a channel.
 */

const firestore = new Firestore();

/**
 * Handles the request from the Slack Gameshow Slash command.
 * 
 * @param {Object} req - Cloud Function request context.
 * @param {Object} res - Cloud Function response context.
 */
module.exports = async (req, res) => {
    const { response_url: responseUrl, token, team_id: teamId, channel_id: channelId, user_id: createdUserId } = req.body;

    if (token !== verificationToken) {
        res.status(403).end('Forbidden');
    } else {
        res.status(200).end();

        const documentRef = firestore.doc(`games/${teamId}`);

        try {
            await documentRef.create({
                teamId,
                channelId,
                createdUserId,
                scores: {}
            });

            await axios.post(responseUrl, welcome);
        } catch(err) {
            await axios.post(responseUrl, gameAlreadyStarted);
        }
    }
};
