import { test, TestContext } from "../module.gen.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";
import { assertEquals } from "https://deno.land/std@0.217.0/assert/assert_equals.ts";
import { assertExists } from "https://deno.land/std@0.217.0/assert/assert_exists.ts";

test("e2e", async (ctx: TestContext) => {
    const imageReq = await fetch("https://picsum.photos/200/300");
    const imageData = new Uint8Array(await imageReq.arrayBuffer());


	const { user } = await ctx.modules.users.createUser({
		username: faker.internet.userName(),
	});

	const { token } = await ctx.modules.users.createUserToken({
		userId: user.id,
	});

    const { url, uploadId } = await ctx.modules.users.prepareProfilePicture({
        mime: imageReq.headers.get("Content-Type") ?? "image/jpeg",
        contentLength: imageData.length.toString(),
        userToken: token.token,
    });

    // Upload the profile picture
    await fetch(url, {
        method: "PUT",
        body: imageData,
    });

    // Set the profile picture
    await ctx.modules.users.setProfilePicture({
        uploadId,
        userToken: token.token,
    });

    // Get PFP from URL
    const { users: [{ profilePictureUrl }] } = await ctx.modules.users.getUser({ userIds: [user.id] });
    assertExists(profilePictureUrl);

    // Get PFP from URL
    const getPfpFromUrl = await fetch(profilePictureUrl);
    const pfp = new Uint8Array(await getPfpFromUrl.arrayBuffer());
    assertEquals(pfp, imageData);
});
