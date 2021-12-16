import Axios from 'axios';

export default function calendar(req, res) {
    if (req.method !== 'POST') {
        return res.status(400).send('');
    }

    // Obtain the information from the request and put it on

    // Get Access token
    GetAccessToken(res).then((accessToken) => {
        const calendarID = "cscae19m9abei8bv23e1queim8@group.calendar.google.com" // This was obtained via the Google API Explorer Calendar List: https://developers.google.com/calendar/api/v3/reference/calendarList/list
        // CalendarID is needed to get the calendar
        // If you delete and remake the calendar, you must get the ID again using API Explorer and paste it in inside of const calendarID

        // Check availability of the time
        CheckAvailability(res, calendarID, accessToken, startTime, endTime).then((available) => {
            if (available) {
                // Make the reservation
                MakeReservation(res, calendarID, accessToken, startTime, endTime, description, title);
            } else {
                res.status(409).send(''); // 409: conflict status code. There was a conflict with overlapping times. Likely not an issue with the code
            }
        });
    });
}

const GetAccessToken = async (res) => {
    try {
        // Generate new access token: https://stackoverflow.com/questions/10631042/how-to-generate-access-token-using-refresh-token-through-google-drive-api
        let res = await Axios.post("https://www.googleapis.com/oauth2/v4/token", {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
            grant_type: "refresh_token"
        });
        return res.data.access_token;
    } catch (error) {
        res.status(500).send({error: 'Failed to get Access Token'}); // 500 error. API Key might be invalid, or the refresh token expired. Debug by generating new Refresh token according to IBM instructions
    }
}

const FormatTime = (time) => {
    // Format the time in RFC3330: https://datatracker.ietf.org/doc/html/rfc3339

}

const CheckAvailability = async (res, calendarId, accessToken, startTime, endTime) => {
    try {
        // Use the freebusy API to confirm availability: https://developers.google.com/calendar/api/v3/reference/freebusy/query
        // // Axios has headers as the third argument: https://stackoverflow.com/questions/44617825/passing-headers-with-axios-post-request
        const res = await Axios.post(`https://www.googleapis.com/calendar/v3/freeBusy?key=${process.env.GOOGLE_API_KEY}`, {
            // POST request body
            "timeMin": startTime,
            "timeMax": endTime,
            "items": [
                {calendarId}
            ]
        }, {
            // Authorization header
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        // Parse response and check if there are conflicts
        // TODO: Check if not busy length is 0
        return res.data.calendars.busy.length != 0 ? false : true;
    } catch (error) {
        console.error(error);
        res.status(500).send('Unable to check availability'); // Checking availability encountered an error. Debug CheckAvailability. API Key might be invalid, or the refresh token expired. Debug by generating new Refresh token according to IBM instructions
    }
}

const MakeReservation = async (res, calendarId, accessToken, startTime, endTime, description, title) => {
    try {
        const res = await Axios.post(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${process.env.GOOGLE_API_KEY}`, {
            // Event request body
            "end": endTime,
            "start": startTime,
            "description": description, // Description of event
            "summary": title            // Title of event
        }, {
            // Authorization header
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        res.status(201).send('Reservation successfully created');
    } catch(error) {
        console.error(error);
        res.status(502); // 502 error, something went wrong when making the reservation with the post request. Debug MakeReservation, ensure that the Google API has not changed
    }
}

// TODO: Parse Axios POST responses, test Reservation, figure out if error codes send when they are supposed to, test whether API can be called via Postman
