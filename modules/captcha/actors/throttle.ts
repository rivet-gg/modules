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

		this.state.count += 1;

		if (this.state.start === 0) {
			this.reset(_ctx, {});
			return { success: false };
		}

        if (now - this.state.start > req.period) {
            this.reset(_ctx, {});
            return { success: true };
        }

        if (this.state.count > req.requests) {
            return { success: false };
        }

        return { success: true };
	}

	reset(_ctx: ActorContext, req: Empty): Empty {
		this.state.start = Date.now();
		this.state.count = 0;

		return {};
	}
}
