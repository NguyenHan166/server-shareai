class AppException extends Error {
    constructor(payload) {
        super(payload.message);
        this.name = "AppException";
        this.payload = {
            ...payload,
            timestamp: payload.timestamp || new Date().toISOString(),
        };
    }
}

module.exports = {
    AppException,
};
