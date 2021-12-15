import Status from 'http-status-codes';

export default (req, res) => {
    if (req.method !== 'POST') {
        return res.status(Status.BAD_REQUEST).send('');
    }

    // Obtain the information from the request and put it on
}