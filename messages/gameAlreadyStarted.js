'use strict';

/**
 * @module gameAlreadyStarted
 * @description Message displayed to host of the gameshow when a gameshow has already been started.
 */

module.exports = {
    blocks: [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "A game has already been started for this workspace. Would you like to keep playing or cancel the game?"
            }
        },
        {
            type: "actions",
            elements: [
                {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "Continue playing"
                    },
                    value: "continueGame",
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
