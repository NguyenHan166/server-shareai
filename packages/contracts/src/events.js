const { randomUUID } = require("crypto");

function makeEvent(topic, data, actorUserId) {
    return {
        eventId: randomUUID(),
        topic,
        occurredAt: new Date().toISOString(),
        actorUserId: actorUserId || null,
        data,
    };
}

exports.makeEvent = makeEvent;
