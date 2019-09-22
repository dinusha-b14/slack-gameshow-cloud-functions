'use strict';

/**
 * @module gameStarted
 * @description Message displayed when a game is started.
 */

module.exports = {
    replace_original: true,
    blocks: [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "Game started!"
            }
        }
    ]
};
