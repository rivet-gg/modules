import { Runtime } from "./engine/runtime/src/index";
import { handler as modules__users__get__handler } from './modules/users/scripts/get/index';

async function main() {
    let runtime = new Runtime({
        modules: {
            users: {
                scripts: {
                    get: {
                        handler: modules__users__get__handler,
                    },
                }
            }
        }
    });
    let response = await runtime.call('users', 'get', { userIds: ['abc', 'def'] });
    console.log('Call response', response);
    // await runtime.run();
}

main();

