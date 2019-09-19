'use strict';

/**
 * @module cancelGame
 * @description Message displayed when a game is cancelled.
 */

module.exports = {
    replace_original: true,
    blocks: [
        {
            type: "section",
            text: {
                type: "plain_text",
                text: "Game cancelled!",
                emoji: true
            }
        }
    ]
};
