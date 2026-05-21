import { exchangeNpssoForCode } from "psn-api";

async function testToken() {
  try {
    const code = await exchangeNpssoForCode("Of2dIitd3NlAx5CHMFAVGKYLsYyB2POcUtx5QYRsSmjlOxKcs590wlyo1eHcZE8q");
    console.log("Success! Access Code:", code);
  } catch (error: any) {
    console.error("Failed:", error.message);
  }
}

testToken();
