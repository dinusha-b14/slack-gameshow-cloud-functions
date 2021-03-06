'use strict';

const sinon = require('sinon');
const nock = require('nock');
const axios = require('axios');
const { expect } = require('chai');
const { Firestore } = require('@google-cloud/firestore');
const action = require('../app/action');
const { verificationToken, botUserAccessToken, postEphemeralMessageUrl, postMessageUrl } = require('../config');

const firestore = new Firestore();
const responseUrlBasePath = 'https://response.url.com';
const responseUrl = `${responseUrlBasePath}/response-url`;
const teamId = 'my-team-id';
const channelId = 'my-channel-id';
const createdUserId = 'my-created-user-id';
const sandbox = sinon.createSandbox();

describe('POST /actionPost', () => {
    let axiosSpyPost, res;
    const mockResponse = () => {
        const res = {};
        res.status = sandbox.stub().returns(res);
        res.end = sandbox.stub().returns(res);
        return res;
    };

    beforeEach(async () => {
        // Clean up any existing docs with the testing team ID
        try {
            await firestore.doc(`games/${teamId}`).delete();
        } catch (err) {
            // We can ignore any errors during this deletion.
        }
        axiosSpyPost = sandbox.spy(axios, 'post');
        res = mockResponse();
    });

    afterEach(() => {
        nock.cleanAll();
        sandbox.restore();
    });

    describe('when verification token is invalid', () => {
        it('responds with a status of 403', async () => {
            const req = {
                body: {
                    payload: JSON.stringify({
                        token: 'some-other-token',
                        response_url: responseUrl,
                        team: {
                            id: teamId
                        },
                        actions: [
                            {
                                value: 'someAction'
                            }
                        ]
                    })
                }
            };

            await action(req, res);

            sandbox.assert.calledWith(res.status, 403);
            sandbox.assert.calledWith(res.end, 'Forbidden');
        });
    });

    describe('when verification token is valid', () => {
        describe('when actionValue is startGame', () => {
            beforeEach(() => {
                nock(responseUrlBasePath)
                    .post('/response-url', {
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
                    })
                    .reply(200);
                
                nock('https://slack.com/api/chat.postMessage')
                    .post('', {
                        channel: channelId,
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
                    })
                    .reply(200);
            });

            it('responds with a status of 200', async () => {
                const req = {
                    body: {
                        payload: JSON.stringify({
                            token: verificationToken,
                            response_url: responseUrl,
                            team: {
                                id: teamId
                            },
                            channel: {
                                id: channelId
                            },
                            actions: [
                                {
                                    value: 'startGame'
                                }
                            ]
                        })
                    }
                };


                await action(req, res);

                sandbox.assert.calledWith(res.status, 200);
                sandbox.assert.calledOnce(res.end);
                sandbox.assert.calledWith(axiosSpyPost, 'https://slack.com/api/chat.postMessage', {
                    channel: channelId,
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
                }, {
                    headers: {
                        'Authorization': `Bearer ${botUserAccessToken}`
                    }
                });

                sandbox.assert.calledWith(axiosSpyPost, responseUrl, {
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
                });
            });
        });

        describe('when actionValue is cancelGame', () => {
            const req = {
                body: {
                    payload: JSON.stringify({
                        token: verificationToken,
                        response_url: responseUrl,
                        team: {
                            id: teamId
                        },
                        channel: {
                            id: channelId
                        },
                        actions: [
                            {
                                value: 'cancelGame'
                            }
                        ]
                    })
                }
            };

            beforeEach(() => {
                nock(responseUrlBasePath)
                    .post('/response-url', {
                        replace_original: true,
                        blocks: [
                            {
                                type: "section",
                                text: {
                                    type: "mrkdwn",
                                    text: "Game cancelled!"
                                }
                            }
                        ]
                    })
                    .reply(200);
            });

            describe('when a record of the game exists within the database', () => {
                beforeEach(async () => {
                    const docRef = firestore.doc(`games/${teamId}`);
                    await docRef.create({
                        teamId,
                        channelId,
                        createdUserId
                    });
                });

                it('removes the existing record for the team id and responds with 200 OK', async () => {
                    await action(req, res);

                    const docRef = firestore.doc(`games/${teamId}`);
                    const doc = await docRef.get();

                    sandbox.assert.calledWith(res.status, 200);
                    sandbox.assert.calledOnce(res.end);
                    sandbox.assert.calledWith(axiosSpyPost, responseUrl, {
                        replace_original: true,
                        blocks: [
                            {
                                type: "section",
                                text: {
                                    type: "mrkdwn",
                                    text: "Game cancelled!"
                                }
                            }
                        ]
                    });
                    expect(doc.exists).to.equal(false);
                });
            });

            describe('when a record of the game does not exist within the database', () => {
                it('responds with 200 OK', async () => {
                    await action(req, res);
                    sandbox.assert.calledWith(res.status, 200);
                    sandbox.assert.calledOnce(res.end);
                    sandbox.assert.calledWith(axiosSpyPost, responseUrl, {
                        replace_original: true,
                        blocks: [
                            {
                                type: "section",
                                text: {
                                    type: "mrkdwn",
                                    text: "Game cancelled!"
                                }
                            }
                        ]
                    });
                });
            });
        });

        describe('when actionValue is buzz', () => {
            const buzzedUserId = 'U0D15K92L';

            describe('when a user has not already buzzed in', () => {
                const req = {
                    body: {
                        payload: JSON.stringify({
                            token: verificationToken,
                            response_url: responseUrl,
                            user: {
                                id: buzzedUserId
                            },
                            team: {
                                id: teamId
                            },
                            channel: {
                                id: channelId
                            },
                            actions: [
                                {
                                    value: 'buzz'
                                }
                            ]
                        })
                    }
                };

                beforeEach(async () => {
                    const documentRef = firestore.doc(`games/${teamId}`);
                    await documentRef.create({
                        teamId,
                        channelId,
                        createdUserId,
                        scores: {}
                    });

                    nock(responseUrlBasePath)
                        .post('/response-url', {
                            replace_original: true,
                            blocks: [
                                {
                                    type: "section",
                                    text: {
                                        type: "mrkdwn",
                                        text: `<@${buzzedUserId}> buzzed first!`
                                    }
                                }
                            ]
                        })
                        .reply(200);
                    
                    nock(postEphemeralMessageUrl, {
                        reqheaders: {
                            'Authorization': `Bearer ${botUserAccessToken}`
                        }
                    })
                        .post('', {
                            channel: channelId,
                            user: createdUserId,
                            blocks: [
                                {
                                    type: 'section',
                                    text: {
                                        type: 'mrkdwn',
                                        text: `<@${buzzedUserId}> buzzed first! Did they get it right?`
                                    }
                                },
                                {
                                    type: "actions",
                                    elements: [
                                        {
                                            type: "button",
                                            text: {
                                                type: "plain_text",
                                                text: "Yes"
                                            },
                                            value: "answerCorrect",
                                            style: "primary"
                                        },
                                        {
                                            type: "button",
                                            text: {
                                                type: "plain_text",
                                                text: "No"
                                            },
                                            value: "answerWrong",
                                            style: "danger"
                                        }
                                    ]
                                }
                            ]
                        })
                        .reply(200);
                });

                it('responds with 200 OK, sets the buzzed user in the DB and responds back to both the host and the buzzed user', async () => {
                    await action(req, res);

                    const docRef = firestore.doc(`games/${teamId}`);
                    const doc = await docRef.get();
                    const docData = doc.data();

                    sandbox.assert.calledWith(res.status, 200);
                    sandbox.assert.calledOnce(res.end);
                    sandbox.assert.calledWith(axiosSpyPost, responseUrl, {
                        replace_original: true,
                        blocks: [
                            {
                                type: "section",
                                text: {
                                    type: "mrkdwn",
                                    text: `<@${buzzedUserId}> buzzed first!`
                                }
                            }
                        ]
                    });
                    sandbox.assert.calledWith(axiosSpyPost, postEphemeralMessageUrl, {
                        channel: channelId,
                        user: createdUserId,
                        blocks: [
                            {
                                type: 'section',
                                text: {
                                    type: 'mrkdwn',
                                    text: `<@${buzzedUserId}> buzzed first! Did they get it right?`
                                }
                            },
                            {
                                type: "actions",
                                elements: [
                                    {
                                        type: "button",
                                        text: {
                                            type: "plain_text",
                                            text: "Yes"
                                        },
                                        value: "answerCorrect",
                                        style: "primary"
                                    },
                                    {
                                        type: "button",
                                        text: {
                                            type: "plain_text",
                                            text: "No"
                                        },
                                        value: "answerWrong",
                                        style: "danger"
                                    }
                                ]
                            }
                        ]
                    }, {
                        headers: {
                            'Authorization': `Bearer ${botUserAccessToken}`
                        }
                    });
                    expect(docData.buzzedUser).to.equal(buzzedUserId);
                });
            });

            describe('when a user has already buzzed and different user buzzes in', () => {
                const req = {
                    body: {
                        payload: JSON.stringify({
                            token: verificationToken,
                            response_url: responseUrl,
                            user: {
                                id: 'U83JK7327'
                            },
                            team: {
                                id: teamId
                            },
                            channel: {
                                id: channelId
                            },
                            actions: [
                                {
                                    value: 'buzz'
                                }
                            ]
                        })
                    }
                };

                beforeEach(async () => {
                    const documentRef = firestore.doc(`games/${teamId}`);
                    await documentRef.create({
                        teamId,
                        channelId,
                        createdUserId,
                        scores: {},
                        buzzedUser: buzzedUserId
                    });
                });

                it('responds with 200 OK and does not send any further messages', async () => {
                    await action(req, res);

                    const docRef = firestore.doc(`games/${teamId}`);
                    const doc = await docRef.get();
                    const docData = doc.data();

                    sandbox.assert.calledWith(res.status, 200);
                    sandbox.assert.calledOnce(res.end);
                    expect(docData.buzzedUser).to.equal(buzzedUserId);
                });
            });
        });

        describe('when actionValue is answerCorrect', () => {
            const req = {
                body: {
                    payload: JSON.stringify({
                        token: verificationToken,
                        response_url: responseUrl,
                        actions: [
                            {
                                value: 'answerCorrect'
                            }
                        ]
                    })
                }
            };

            beforeEach(async () => {
                nock(responseUrlBasePath)
                    .post('/response-url', {
                        replace_original: true,
                        blocks: [
                            {
                                type: 'section',
                                text: {
                                    type: 'plain_text',
                                    text: 'How many points would you like to award them?'
                                },
                                accessory: {
                                    action_id: 'addScoreForContestant',
                                    type: 'static_select',
                                    placeholder: {
                                        type: 'plain_text',
                                        text: 'Select a score'
                                    },
                                    options: [
                                        {
                                            text: {
                                                type: 'plain_text',
                                                text: '1'
                                            },
                                            value: '1'
                                        },
                                        {
                                            text: {
                                                type: 'plain_text',
                                                text: '2'
                                            },
                                            value: '2'
                                        },
                                        {
                                            text: {
                                                type: 'plain_text',
                                                text: '3'
                                            },
                                            value: '3'
                                        },
                                        {
                                            text: {
                                                type: 'plain_text',
                                                text: '4'
                                            },
                                            value: '4'
                                        },
                                        {
                                            text: {
                                                type: 'plain_text',
                                                text: '5'
                                            },
                                            value: '5'
                                        }
                                    ]
                                }
                            }
                        ]
                    })
                    .reply(200);
            });

            it('responds with 200 OK and sends a points selection message back to the host', async () => {
                await action(req, res);

                sandbox.assert.calledWith(res.status, 200);
                sandbox.assert.calledOnce(res.end);
                sandbox.assert.calledWith(axiosSpyPost, responseUrl, {
                    replace_original: true,
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'plain_text',
                                text: 'How many points would you like to award them?'
                            },
                            accessory: {
                                action_id: 'addScoreForContestant',
                                type: 'static_select',
                                placeholder: {
                                    type: 'plain_text',
                                    text: 'Select a score'
                                },
                                options: [
                                    {
                                        text: {
                                            type: 'plain_text',
                                            text: '1'
                                        },
                                        value: '1'
                                    },
                                    {
                                        text: {
                                            type: 'plain_text',
                                            text: '2'
                                        },
                                        value: '2'
                                    },
                                    {
                                        text: {
                                            type: 'plain_text',
                                            text: '3'
                                        },
                                        value: '3'
                                    },
                                    {
                                        text: {
                                            type: 'plain_text',
                                            text: '4'
                                        },
                                        value: '4'
                                    },
                                    {
                                        text: {
                                            type: 'plain_text',
                                            text: '5'
                                        },
                                        value: '5'
                                    }
                                ]
                            }
                        }
                    ]
                });
            });
        });

        describe('when actionValue is answerWrong', () => {
            const req = {
                body: {
                    payload: JSON.stringify({
                        token: verificationToken,
                        response_url: responseUrl,
                        team: {
                            id: teamId
                        },
                        channel: {
                            id: channelId
                        },
                        actions: [
                            {
                                value: 'answerWrong'
                            }
                        ]
                    })
                }
            };

            beforeEach(async () => {
                const documentRef = firestore.doc(`games/${teamId}`);
                await documentRef.create({
                    teamId,
                    channelId,
                    createdUserId,
                    scores: {},
                    buzzedUser: 'some-user-id'
                });

                nock(responseUrlBasePath)
                    .post('/response-url', {
                        replace_original: true,
                        blocks: [
                            {
                                type: "section",
                                text: {
                                    type: "mrkdwn",
                                    text: "Buzzer Re-enabled!"
                                }
                            }
                        ]
                    })
                    .reply(200);

                nock('https://slack.com/api/chat.postMessage')
                    .post('', {
                        channel: channelId,
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
                    })
                    .reply(200);
            });

            it('responds with 200 OK and resends buzzers back to all users', async () => {
                await action(req, res);

                const docRef = firestore.doc(`games/${teamId}`);
                const doc = await docRef.get();
                const docData = doc.data();

                sandbox.assert.calledWith(res.status, 200);
                sandbox.assert.calledOnce(res.end);
                sandbox.assert.calledWith(axiosSpyPost, responseUrl, {
                    replace_original: true,
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: "Buzzer Re-enabled!"
                            }
                        }
                    ]
                });
                sandbox.assert.calledWith(axiosSpyPost, postMessageUrl, {
                    channel: channelId,
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
                }, {
                    headers: {
                        'Authorization': `Bearer ${botUserAccessToken}`
                    }
                });
                expect(docData.buzzedUser).to.equal(null);
            });
        });
    });
});
