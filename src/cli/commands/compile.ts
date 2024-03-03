import { Command } from "../deps.ts";
import { GlobalOpts, initProject } from "../common.ts";
import { pipeline } from "../../compile/mod.ts";

export const compileCommand = new Command<GlobalOpts>()
  .option("--solemnly-swear", "I solemnly swear that I am up to no good")
  .action(
    async (opts) => {
      if (!opts.solemnlySwear) {
        return;
      }
      const project = await initProject(opts);

      await pipeline.prepare(project);

      await pipeline({ project }, ({ task }) => {
        const taskA = task("taskA", {}, async () => {});
        const taskB = task("taskB", {}, async () => {}, [taskA]);
        const taskC = task("taskC", {}, async () => {}, [taskA]);
        const taskD = task("taskD", {}, async () => {}, [taskB, taskC]);

        const main = task("main", {}, () => {
        }, [taskD]);

        return main;
      }).run();
    },
  );
