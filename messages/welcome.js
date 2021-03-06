'use strict';

/**
 * @module welcome
 * @description Message displayed to host of the gameshow when they start a new game via
 * the Slack slash command.
 */

module.exports = {
    blocks: [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "Welcome to Gameshow! The app that allows you to host your very own quiz show!"
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "Click the Start Game button below to start the game with everyone in this channel!"
            }
        },
        {
            type: "actions",
            elements: [
                {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "Start Game"
                    },
                    value: "startGame",
                    style: "primary"
                },
                {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "Cancel"
                    },
                    value: "cancelGame",
                    style: "danger"
                }
            ]
        }
    ]
};
