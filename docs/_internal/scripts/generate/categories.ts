import { assert, assertExists } from "@std/assert";
import { ModuleMeta, ProjectMeta } from "../../../../packages/toolchain/build/meta.ts";

const CATEGORIES = [
  {
    name: "Multiplayer",
    description: "Engage players with live multiplayer gameplay, fostering competition and cooperation.",
    slug: "multiplayer",
  },
  {
    name: "Authentication",
    description: "Secure and manage user accounts to personalize and safeguard the player experience.",
    slug: "auth",
  },
  {
    name: "Social",
    description: "Facilitate player interaction and community-building to boost engagement and retention.",
    slug: "social",
  },
  {
    name: "Economy",
    description: "Drive player progression and monetization with virtual goods and currencies.",
    slug: "economy",
  },
  // {
  //   name: "Monetization",
  //   description: "TODO",
  //   slug: "monetization",
  // },
  {
    name: "Competitive",
    description: "Motivate and reward skilled play with rankings, tournaments, and leagues.",
    slug: "competitive",
  },
  {
    name: "Analytics",
    description: "Gain actionable insights to optimize game design, balance, and monetization.",
    slug: "analytics",
  },
  // {
  //   name: "Monitoring",
  //   description: "TODO",
  //   slug: "monitoring",
  // },
  {
    name: "Security",
    description: "Protect your game and players from cheating, hacking, and disruptive behavior.",
    slug: "security",
  },
  {
    name: "Utility",
    description: "Streamline development with foundational tools and reusable components.",
    slug: "utility",
  },
  {
    name: "Platform", 
    description: "Extend your game's reach and engage players across popular gaming platforms.",
    slug: "platform",
  },
  {
    name: "Infrastructure",
    description: "Extend and integrate your game with custom backend services and third-party APIs.",
    slug: "infra",
  },
  {
    name: "Service",
    description: "Integrate third-party services to enhance functionality and streamline operations.",
    slug: "service",
  },
];

export interface Category {
  name: string,
  slug: string,
  description: string;
  modules: { id: string, module: ModuleMeta }[],
}

export function processCategories(meta: ProjectMeta): Category[] {
  const unsortedModules = new Set(Object.keys(meta.modules));
  const allCatgories: Category[] = [];
  for (let categoryConfig of CATEGORIES) {
    const category: Category = {
      ...categoryConfig,
      modules: [],
    };
    allCatgories.push(category);

    // Find modules
    for (const moduleId of new Set(unsortedModules)) {
      const module = meta.modules[moduleId]!;

      // Validate module
      assertExists(module.config.name, `Module missing name: ${moduleId}`);

      // Check if matches category
      assertExists(module.config.tags);
      if (module.config.tags.indexOf(category.slug) == -1) continue;

      // Add to category
      unsortedModules.delete(moduleId);
      category.modules.push({ id: moduleId, module });
    }

    // Check the category has modules
    assert(category.modules.length != 0, `Category missing modules: ${categoryConfig.slug}`);

    // Sort modules
    category.modules = category.modules
      .sort((a, b) => {
        // Sink 'coming_soon' modules to the bottom
        if (a.module.config.status === 'coming_soon' && b.module.config.status !== 'coming_soon') return 1;
        if (a.module.config.status !== 'coming_soon' && b.module.config.status === 'coming_soon') return -1;
        // For modules with the same status, sort alphabetically
        return a.module.config.name!.localeCompare(b.module.config.name!);
      });
  }

  // Check for unsorted modules
  assert(unsortedModules.size == 0, `Modules do no have tag matching a category: ${[...unsortedModules].join(", ")}`)

  return allCatgories;
}
