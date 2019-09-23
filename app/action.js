'use strict';

const axios = require('axios');
const { Firestore } = require('@google-cloud/firestore');
const messages = require('../messages');
const config = require('../config');

/**
 * @module action
 * @description Handler for user interaction actions from Slack.
 */

const firestore = new Firestore();

const startGame = async payload => {
    const { response_url: responseUrl, channel: { id: channel } } = payload;

    axios.post(config.postMessageUrl, {
        channel,
        ...messages.buzzer
    }, {
        headers: {
            'Authorization': `Bearer ${config.botUserAccessToken}`
        }
    });

    return axios.post(responseUrl, messages.gameStarted);
};

const cancelGame = async payload => {
    const { response_url: responseUrl, team: { id: teamId } } = payload;

    try {
        await firestore.doc(`games/${teamId}`).delete();
    } catch(err) {
        console.log(err);
    }

    return axios.post(responseUrl, messages.cancelGame);
};

const buzz = async payload => {
    const { response_url: responseUrl, user: { id: userId }, team: { id: teamId }, channel: { id: channel } } = payload;

    const docRef = firestore.doc(`games/${teamId}`);
    const doc = await docRef.get();
    const { createdUserId, buzzedUser } = doc.data();

    if (!buzzedUser) {
        await docRef.update({
            buzzedUser: userId
        });
    
        await axios.post(config.postEphemeralMessageUrl, {
            channel,
            user: createdUserId,
            ...messages.buzzedNotificationForHost(userId)
        }, {
            headers: {
                'Authorization': `Bearer ${config.botUserAccessToken}`
            }
        });

        return axios.post(responseUrl, messages.buzzedNotificationForContestant(userId));
    }
}

const answerCorrect = async payload => {
    const { response_url: responseUrl } = payload;

    return axios.post(responseUrl, messages.answerCorrectPointsAllocation);
};

const answerWrong = async payload => {
    const { response_url: responseUrl, team: { id: teamId }, channel: { id: channel } } = payload;

    const docRef = firestore.doc(`games/${teamId}`);
    await docRef.update({
        buzzedUser: null
    });

    await axios.post(config.postMessageUrl, {
        channel,
        ...messages.buzzer
    }, {
        headers: {
            'Authorization': `Bearer ${config.botUserAccessToken}`
        }
    });

    return axios.post(responseUrl, messages.buzzerReEnabled);
};

const actionMap = {
    startGame,
    cancelGame,
    buzz,
    answerCorrect,
    answerWrong
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

    if (token !== config.verificationToken) {
        res.status(403).end('Forbidden');
    } else {
        res.status(200).end();

        const responseAction = actionMap[actionValue];

        if (responseAction) {
            try {
                await responseAction(payload);
            } catch(err) {
                console.log(err);
            }
        }
    }
};
