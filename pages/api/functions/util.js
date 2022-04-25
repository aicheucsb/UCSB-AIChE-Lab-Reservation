export const PrintError = (error) => {
    if (error.response) {
        console.error("Request error");
        console.error("Request error status: ", error.response.status);
        console.error("Request error data: ", error.response.data);
        console.error("Request error headers: ", error.response.headers);
    } else {
        console.error(error);
    }
}