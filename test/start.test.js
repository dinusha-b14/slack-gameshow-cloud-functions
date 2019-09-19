'use strict';

const sinon = require('sinon');
const nock = require('nock');
const axios = require('axios');
const { expect } = require('chai');
const { Firestore } = require('@google-cloud/firestore');
const start = require('../start');
const config = require('../config');
const { welcome, gameAlreadyStarted } = require('../messages');

const firestore = new Firestore();
const responseUrlBasePath = 'https://response.url.com';
const teamId = 'my-team-id';
const channelId = 'my-channel-id';
const createdUserId = 'my-created-user-id';

const sandbox = sinon.createSandbox();

const mockResponse = () => {
    const res = {};
    res.status = sandbox.stub().returns(res);
    res.end = sandbox.stub().returns(res);
    return res;
};

describe('POST /startPost', () => {
    let axiosSpyPost;

    beforeEach(() => {
        axiosSpyPost = sandbox.spy(axios, 'post');
    });

    afterEach(() => {
        nock.cleanAll();
        sandbox.restore();
    });

    describe('when verification token is invalid', () => {
        const req = { body: { token: 'some-invalid-token' } };
        const res = mockResponse();

        it('responds with a status of 403', async () => {
            await start(req, res);

            sandbox.assert.calledWith(res.status, 403);
            sandbox.assert.calledWith(res.end, 'Forbidden');
        });
    });

    describe('when verification token is valid', () => {
        beforeEach(async () => {
            // Clean up any existing docs with the testing team ID
            try {
                await firestore.doc(`games/${teamId}`).delete();
            } catch (err) {
                // We can ignore any errors during this deletion.
            }
        });

        const req = {
            body: {
                token: config.verificationToken,
                response_url: `${responseUrlBasePath}/response-url`,
                team_id: teamId,
                channel_id: channelId,
                user_id: createdUserId
            }
        };

        describe('when game has not already been started', () => {
            beforeEach(() => {
                nock(responseUrlBasePath)
                    .post('/response-url', welcome)
                    .reply(200);
            });
            const res = mockResponse();

    
            it('responds with a status of 200 and sets up the game', async () => {
                await start(req, res);
    
                const documentRef = firestore.doc(`games/${teamId}`);
                const document = await documentRef.get();
                const documentData = document.data();

                sandbox.assert.calledWith(res.status, 200);
                sandbox.assert.calledOnce(res.end);
                sandbox.assert.calledWith(axiosSpyPost, `${responseUrlBasePath}/response-url`, welcome);

                expect(documentData.teamId).to.equal(teamId);
                expect(documentData.channelId).to.equal(channelId);
                expect(documentData.createdUserId).to.equal(createdUserId);
            });
        });
        
        describe('when game has already been started', () => {
            beforeEach(async () => {
                nock(responseUrlBasePath)
                    .post('/response-url', gameAlreadyStarted)
                    .reply(200);
                
                const documentRef = firestore.doc(`games/${teamId}`);
                await documentRef.create({
                    teamId,
                    channelId,
                    createdUserId
                });
            });
            const res = mockResponse();

            it('responds with a status of 200 and sends an already started message', async () => {
                await start(req, res);

                sandbox.assert.calledWith(res.status, 200);
                sandbox.assert.calledOnce(res.end);
                sandbox.assert.calledWith(axiosSpyPost, `${responseUrlBasePath}/response-url`, gameAlreadyStarted);
            });
        });
    });
});

