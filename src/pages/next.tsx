import { useEffect, type ReactNode } from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import { useVersions } from "@docusaurus/plugin-content-docs/client";

/**
 * `/next` is where the unreleased docs live. There is no page at the version
 * root itself, so send visitors to its first doc.
 */
export default function Next(): ReactNode {
  const versions = useVersions(undefined);
  const current =
    versions.find((version) => version.name === "current") ?? versions[0];
  const mainDoc =
    current.docs.find((doc) => doc.id === current.mainDocId) ??
    current.docs[0];
  const target = mainDoc?.path ?? current.path;

  useEffect(() => {
    if (window.location.pathname.replace(/\/$/, "") !== target.replace(/\/$/, "")) {
      window.location.replace(target);
    }
  }, [target]);

  return (
    <Layout title="Unreleased docs" noFooter>
      <main className="container margin-vert--xl">
        <Heading as="h1">Unreleased documentation</Heading>
        <p>
          Redirecting to <Link to={target}>{current.label}</Link>…
        </p>
      </main>
    </Layout>
  );
}
