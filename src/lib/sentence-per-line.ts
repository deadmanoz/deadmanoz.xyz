/**
 * One sentence per line for post Markdown: the public entry point.
 *
 * The implementation lives in ./prose: line classification, inline masking,
 * sentence splitting, formatting and checking. Consumers (the check script and
 * the tests) import from here.
 */
export { checkMarkdown, formatViolation, formatReport } from "./prose/check";
export type { ViolationKind, SentencePerLineViolation, SentencePerLineReport } from "./prose/check";
export { formatProse, formatMarkdown } from "./prose/format";
export { maskInline } from "./prose/mask";
export { splitSentences } from "./prose/sentences";
