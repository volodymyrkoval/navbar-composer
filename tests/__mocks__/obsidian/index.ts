/**
 * Stand-in for the `obsidian` package, which ships types only and has no
 * runtime JavaScript. Vitest aliases `obsidian` to this barrel, so modules that
 * import from 'obsidian' get these fakes at runtime. Behavioural fakes live in
 * their own files; stubs for UI classes are inert (see KD15).
 */

export * from './component';
export * from './events';
export * from './icons';
export * from './notice';
export * from './platform';
export * from './plugin';
export * from './stubs';
