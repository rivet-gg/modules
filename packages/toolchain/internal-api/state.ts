import { createNanoEvents } from "nanoevents";
import { Project } from "../project/mod.ts";

type State = {
    value: "idle";
} | {
    value: "building";
    project: Project;
} | {
    value: "success";
    project: Project;
} | {
    value: "failure";
    project: Project;
    error: unknown;
};

interface Events {
    changed: (state: State) => void;
}

export class InternalState {
    private emitter = createNanoEvents<Events>();

    private state: State = { value: "idle" };

    on<E extends keyof Events>(event: E, callback: Events[E]) {
        return this.emitter.on(event, callback);
    }
    once<E extends keyof Events>(event: E, callback: Events[E]) {
        const unbind = this.emitter.on(event, (...args) => {
            unbind();
            callback(...args);
        });
        return unbind;
    }

    get() {
        return this.state;
    }

    set(state: State) {
        this.state = state;
        this.emitter.emit("changed", state);
    }
}
