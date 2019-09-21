'use strict';

module.exports = userId => (
    {
        replace_original: true,
        blocks: [
            {
                type: "section",
                text: {
                    type: "plain_text",
                    text: `<@${userId}> buzzed first!`,
                    emoji: true
                }
            }
        ]
    }
);
