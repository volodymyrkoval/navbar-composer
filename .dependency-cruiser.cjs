/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies make modules impossible to reason about in isolation.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      severity: "error",
      comment: "Modules nothing imports and that import nothing are dead code. The plugin entry point is exempt, and so are test-only support files that tests load implicitly.",
      from: {
        orphan: true,
        pathNot: ["^src/main\\.ts$", "^tests/setup/", "^tests/__mocks__/"],
      },
      to: {},
    },
    {
      name: "core-is-pure",
      severity: "error",
      comment: "KD1: the pure core imports neither the obsidian package nor any other src layer.",
      from: { path: "^src/core/" },
      to: { path: ["^src/(?!core/)", "(^|/)obsidian($|/)"] },
    },
    {
      name: "platform-is-leaf",
      severity: "error",
      comment: "The platform adapter is a leaf: feature and shared-DOM layers depend on it, never the reverse.",
      from: { path: "^src/platform/" },
      to: { path: "^src/(navbar|tablet|settings|dom)/" },
    },
    {
      name: "features-are-independent",
      severity: "error",
      comment: "Feature folders (navbar, tablet, settings) do not import each other; shared code goes to core, platform or dom.",
      from: { path: "^src/(navbar|tablet|settings)/" },
      to: {
        path: "^src/(navbar|tablet|settings)/",
        pathNot: "^src/$1/",
      },
    },
    {
      name: "dom-is-shared-leaf",
      severity: "error",
      comment: "src/dom holds shared DOM helpers; it must not depend on feature folders.",
      from: { path: "^src/dom/" },
      to: { path: "^src/(navbar|tablet|settings)/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      extensions: [".ts", ".js"],
    },
  },
};
