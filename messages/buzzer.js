'use strict';

/**
 * @module buzzer
 * @description Buzzer message displayed to users.
 */

module.exports = {
    blocks: [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: 'Get ready to answer the next question!'
            }
        },
        {
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'Buzz!!'
                    },
                    value: 'buzz',
                    style: 'primary'
                }
            ]
        }
    ]
}
