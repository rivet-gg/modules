import { ActorBase, ActorContext } from "../module.gen.ts";

type Input = undefined;

interface State {
  tokens: number;
  lastRefillTimestamp: number;
}

export interface ThrottleRequest {
  requests: number;
  period: number;
}

export interface ThrottleResponse {
  success: boolean;
  refillAt: number;
}

export class Actor extends ActorBase<undefined, State> {
  public initialize(): State {
    // Will refill on first call of `throttle`
    return {
      tokens: 0,
      lastRefillTimestamp: 0,
    };
  }

  throttle(_ctx: ActorContext, req: ThrottleRequest): ThrottleResponse {
    // Reset bucket
    const now = Date.now();
    if (now > this.state.lastRefillTimestamp + req.period * 1000) {
      this.state.tokens = req.requests;
      this.state.lastRefillTimestamp = now;
    }

    // Attempt to consume token
    const success = this.state.tokens >= 1;
    if (success) {
      this.state.tokens -= 1;
    }

    const refillAt = Math.ceil((1 - this.state.tokens) * (req.period / req.requests));
    return { success, refillAt };
  }
}
