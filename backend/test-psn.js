"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const psn_api_1 = require("psn-api");
async function testToken() {
    try {
        const code = await (0, psn_api_1.exchangeNpssoForCode)("Of2dIitd3NlAx5CHMFAVGKYLsYyB2POcUtx5QYRsSmjlOxKcs590wlyo1eHcZE8q");
        console.log("Success! Access Code:", code);
    }
    catch (error) {
        console.error("Failed:", error.message);
    }
}
testToken();
