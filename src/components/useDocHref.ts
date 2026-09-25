import { useCallback, useMemo } from "react";
import {
  useLatestVersion,
  useVersions,
  type GlobalDoc,
} from "@docusaurus/plugin-content-docs/client";

/** Doc ids that usually open a section, most preferred first. */
const SECTION_ENTRY_SUFFIXES = [
  "/overview",
  "/index",
  "/introduction",
  "/intro",
  "/quickstart",
];

/**
 * Where a link should go, as candidates tried in order: an exact doc id, or
 * `prefix/` for the entry doc of a section. `fallback` is used when none of
 * them exists.
 */
export interface DocTarget {
  candidates: string[];
  fallback: string;
}

function findByPrefix(docs: GlobalDoc[], prefix: string): GlobalDoc | undefined {
  const inSection = docs.filter((doc) => doc.id.startsWith(prefix));
  if (inSection.length === 0) return undefined;
  for (const suffix of SECTION_ENTRY_SUFFIXES) {
    const entry = inSection.find((doc) => doc.id.endsWith(suffix));
    if (entry) return entry;
  }
  return [...inSection].sort((a, b) => a.id.localeCompare(b.id))[0];
}

/**
 * Resolves homepage links against the docs that actually exist, so a card
 * never points at a page that was renamed or not yet published. The stable
 * version is searched first, then the unreleased one.
 */
export function useDocHref(): (target: DocTarget) => string {
  const versions = useVersions(undefined);
  const latest = useLatestVersion(undefined);

  const ordered = useMemo(() => {
    const current = versions.find((version) => version.name === "current");
    return [latest, current].filter(
      (version, index, list): version is NonNullable<typeof version> =>
        !!version && list.indexOf(version) === index,
    );
  }, [versions, latest]);

  return useCallback(
    ({ candidates, fallback }: DocTarget) => {
      for (const candidate of candidates) {
        for (const version of ordered) {
          const doc = candidate.endsWith("/")
            ? findByPrefix(version.docs, candidate)
            : version.docs.find((entry) => entry.id === candidate);
          if (doc) return doc.path;
        }
      }
      return fallback;
    },
    [ordered],
  );
}
