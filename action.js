'use strict';

const axios = require('axios');
const { Firestore } = require('@google-cloud/firestore');
const { buzzer, cancelGame: cancelGameMessage, gameStarted } = require('./messages');
const { verificationToken, botUserAccessToken, postMessageUrl } = require('./config');

/**
 * @module action
 * @description Handler for user interaction actions from Slack.
 */

const firestore = new Firestore();

const startGame = async payload => {
    const { response_url: responseUrl, channel: { id: channel } } = payload;

    await axios.post(postMessageUrl, {
        channel,
        ...buzzer
    }, {
        headers: {
            'Authorization': `Bearer ${botUserAccessToken}`
        }
    });

    return axios.post(responseUrl, gameStarted);
};

const cancelGame = async payload => {
    const { response_url: responseUrl, team: { id: teamId } } = payload;

    try {
        await firestore.doc(`games/${teamId}`).delete();
    } catch(err) {
        console.log(err);
    }

    return axios.post(responseUrl, cancelGameMessage);
};

const actionMap = {
    startGame,
    cancelGame
};

/**
 * Handles the request from the interaction from Slack message buttons.
 * 
 * @param {Object} req - Cloud Function request context.
 * @param {Object} res - Cloud Function response context.
 */
module.exports = async (req, res) => {
    const payload = JSON.parse(req.body.payload);
    const { token, actions } = payload;
    const [{ value: actionValue }] =  actions;

    if (token !== verificationToken) {
        res.status(403).end('Forbidden');
    } else {
        res.status(200).end();

        const responseAction = actionMap[actionValue];

        if (responseAction) {
            await responseAction(payload);
        }
    }
};
