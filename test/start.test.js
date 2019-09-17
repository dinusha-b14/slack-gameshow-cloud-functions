'use strict';

const sinon = require('sinon');
const startPost = require('../start');
const config = require('../config');

const mockResponse = () => {
    const res = {};
    res.status = sinon.stub().returns(res);
    res.end = sinon.stub().returns(res);
    return res;
};

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
            sinon.assert.calledOnce(res.end);
        });
    });

    describe('when verification token is valid', () => {
        const req = { body: { token: config.verificationToken } };
        const res = mockResponse();

        it('responds with a status of 200', async () => {
            await startPost(req, res);

            sinon.assert.calledWith(res.status, 200);
            sinon.assert.calledOnce(res.end);
        });
    });
});

