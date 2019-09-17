'use strict';

const sinon = require('sinon');
const nock = require('nock');
const axios = require('axios');
const { expect } = require('chai');
const { Firestore } = require('@google-cloud/firestore');
const startPost = require('../start');
const config = require('../config');
const { welcome, gameAlreadyStarted } = require('../messages');

const firestore = new Firestore();
const responseUrlBasePath = 'https://response.url.com';
const teamId = 'my-team-id';
const channelId = 'my-channel-id';
const createdUserId = 'my-created-user-id';

const mockResponse = () => {
    const res = {};
    res.status = sinon.stub().returns(res);
    res.end = sinon.stub().returns(res);
    return res;
};

let axiosSpyPost;

beforeEach(() => {
    axiosSpyPost = sinon.spy(axios, 'post');
});

afterEach(() => {
    nock.cleanAll();
    sinon.restore();
});

describe('POST /start', () => {
    describe('when verification token is invalid', () => {
        const req = { body: { token: 'some-invalid-token' } };
        const res = mockResponse();

        it('responds with a status of 403', async () => {
            await startPost(req, res);

            sinon.assert.calledWith(res.status, 403);
            sinon.assert.calledWith(res.end, 'Forbidden');
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
                await startPost(req, res);
    
                const documentRef = firestore.doc(`games/${teamId}`);
                const document = await documentRef.get();
                const documentData = document.data();

                sinon.assert.calledWith(res.status, 200);
                sinon.assert.calledOnce(res.end);
                sinon.assert.calledWith(axiosSpyPost, `${responseUrlBasePath}/response-url`, welcome);

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
                await startPost(req, res);

                sinon.assert.calledWith(res.status, 200);
                sinon.assert.calledOnce(res.end);
                sinon.assert.calledWith(axiosSpyPost, `${responseUrlBasePath}/response-url`, gameAlreadyStarted);
            });
        });
    });
});

