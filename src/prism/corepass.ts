import { themes, type PrismTheme } from "prism-react-renderer";

/**
 * Code themes. Light is GitHub on the dashboard's sunken surface; dark is a
 * GitHub Dark Default palette on the deep navy code surface the Connector
 * landing page uses, so code reads the same across the product family.
 */

export const corepassLight: PrismTheme = {
  ...themes.github,
  plain: {
    ...themes.github.plain,
    color: "#1f2328",
    backgroundColor: "#f6f8fa",
  },
};

export const corepassDark: PrismTheme = {
  plain: {
    color: "#e6edf3",
    backgroundColor: "#0b1222",
  },
  styles: [
    {
      types: ["comment", "prolog", "doctype", "cdata"],
      style: { color: "#8b949e", fontStyle: "italic" },
    },
    {
      types: ["punctuation"],
      style: { color: "#c9d1d9" },
    },
    {
      types: ["namespace"],
      style: { opacity: 0.7 },
    },
    {
      types: ["tag", "selector", "deleted"],
      style: { color: "#7ee787" },
    },
    {
      types: ["attr-name", "property", "constant", "number", "boolean", "symbol"],
      style: { color: "#79c0ff" },
    },
    {
      types: ["string", "char", "attr-value", "regex", "url", "inserted"],
      style: { color: "#a5d6ff" },
    },
    {
      types: ["keyword", "atrule", "important", "builtin"],
      style: { color: "#ff7b72" },
    },
    {
      types: ["function", "class-name", "maybe-class-name"],
      style: { color: "#d2a8ff" },
    },
    {
      types: ["variable", "parameter", "entity"],
      style: { color: "#ffa657" },
    },
    {
      types: ["operator"],
      style: { color: "#ff7b72" },
    },
    {
      types: ["deleted"],
      style: { color: "#ffa198" },
    },
    {
      types: ["inserted"],
      style: { color: "#7ee787" },
    },
    {
      types: ["bold"],
      style: { fontWeight: "bold" },
    },
    {
      types: ["italic"],
      style: { fontStyle: "italic" },
    },
  ],
};
