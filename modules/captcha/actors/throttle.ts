import { ActorBase, ActorContext, Empty } from "../module.gen.ts";
import { ThrottleRequest, ThrottleResponse } from "../utils/types.ts";

type Input = undefined;

interface State {
	start: number;
	count: number;
}

export class Actor extends ActorBase<Input, State> {
	public initialize(_ctx: ActorContext): State {
		// Will refill on first call of `throttle`
		return {
			start: 0,
			count: 0,
		};
	}

	throttle(_ctx: ActorContext, req: ThrottleRequest): ThrottleResponse {
		const now = Date.now();

        if (now - this.state.start > req.period) {
            this.state.start = now;
            this.state.count = 1;
            return { success: true };
        }

        if (this.state.count >= req.requests) {
            return { success: false };
        }

        this.state.count += 1;

        return { success: true };
	}

	reset(_ctx: ActorContext, req: Empty): Empty {
		this.state.start = 0;
		this.state.count = 0;

		return {};
	}
}
