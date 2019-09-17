'use strict';

const sinon = require('sinon');
const nock = require('nock');
const axios = require('axios');
const startPost = require('../start');
const config = require('../config');
const { welcomeMessage } = require('../messages');

const responseUrlBasePath = 'https://response.url.com';

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
        const req = {
            body: {
                token: config.verificationToken,
                response_url: `${responseUrlBasePath}/response-url`
            }
        };
        const res = mockResponse();

        beforeEach(() => {
            nock(responseUrlBasePath)
                .post('/response-url', welcomeMessage)
                .reply(200);
        });

        it('responds with a status of 200 and sets up the game', async () => {
            await startPost(req, res);

            sinon.assert.calledWith(res.status, 200);
            sinon.assert.calledOnce(res.end);
            sinon.assert.calledWith(axiosSpyPost, `${responseUrlBasePath}/response-url`, welcomeMessage);
        });
    });
});

