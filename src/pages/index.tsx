import React, { useEffect } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  useEffect(() => {
    // when user is in home page, redirect to /intro
    if (window.location.pathname === "/") {
      window.location.href = "/intro";
    }
  }, []);

  return <></>;
}
