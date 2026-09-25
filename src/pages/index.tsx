import type { ReactNode } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

import Icon, { type IconName } from "@site/src/components/Icon";
import { useDocHref, type DocTarget } from "@site/src/components/useDocHref";
import styles from "./index.module.css";

/* -----------------------------------------------------------------------------
 * Link targets. Each is a list of doc ids (or `section/` prefixes) tried in
 * order, so a card keeps working while pages are added or renamed.
 * -------------------------------------------------------------------------- */
const TARGETS = {
  getStarted: {
    candidates: ["corepass-connector/quickstart", "intro"],
    fallback: "/intro",
  },
  connector: {
    candidates: ["corepass-connector/what-is-connector", "corepass-connector/"],
    fallback: "/intro",
  },
  login: {
    candidates: ["corepass-connector/authentication", "corepass-connector/"],
    fallback: "/intro",
  },
  kyc: {
    candidates: [
      "corepass-connector/kyc/overview",
      "corepass-connector/kyc/",
      "corepass-connector/authorization",
      "corepass-connector/what-is-connector",
    ],
    fallback: "/intro",
  },
  kyb: {
    candidates: [
      "corepass-connector/kyb/overview",
      "corepass-connector/kyb/",
      "corepass-connector/what-is-connector",
    ],
    fallback: "/intro",
  },
  dashboard: {
    candidates: ["corepass-connector/dashboard-setup", "corepass-connector/what-is-connector"],
    fallback: "/intro",
  },
  corepassProtocol: {
    candidates: ["corepass-protocol/corepass-protocol", "corepass-protocol/"],
    fallback: "/intro",
  },
  paytoProtocol: {
    candidates: ["payto-protocol/payto-protocol", "payto-protocol/"],
    fallback: "/intro",
  },
  intro: {
    candidates: ["intro"],
    fallback: "/intro",
  },
} satisfies Record<string, DocTarget>;

type TargetKey = keyof typeof TARGETS;

interface Feature {
  icon: IconName;
  title: string;
  tag: string;
  description: ReactNode;
  target: TargetKey;
  cta: string;
}

const CONNECTOR_FEATURES: Feature[] = [
  {
    icon: "login",
    title: "CorePass Login",
    tag: "OAuth 2.0 · OIDC",
    description: (
      <>
        Users sign in by scanning a QR code with the CorePass app. You get a
        standard JWT whose <code>sub</code> is the user&apos;s CoreID. No
        passwords, emails or phone numbers.
      </>
    ),
    target: "login",
    cta: "Add login",
  },
  {
    icon: "idCard",
    title: "KYC: personal identity",
    tag: "Verified data",
    description: (
      <>
        Request specific verified fields such as name, date of birth, document
        and address. The user approves on their phone and the data is
        delivered to your webhook.
      </>
    ),
    target: "kyc",
    cta: "Request KYC data",
  },
  {
    icon: "building",
    title: "KYB: business identity",
    tag: "Businesses",
    description: (
      <>
        Log in as a business, request verified company, director and UBO data
        as a signed attestation, and ask a business to sign messages or
        documents.
      </>
    ),
    target: "kyb",
    cta: "Verify businesses",
  },
];

interface Protocol {
  icon: IconName;
  title: string;
  description: string;
  sample: string;
  target: TargetKey;
}

const PROTOCOLS: Protocol[] = [
  {
    icon: "link",
    title: "CorePass Protocol",
    description:
      "The corepass: URI scheme for login, data requests, typed-data signing and access grants over QR, NFC, deep links and callbacks.",
    sample: "corepass:login/cb00…?sess=…&conn=…&type=callback",
    target: "corepassProtocol",
  },
  {
    icon: "wallet",
    title: "PayTo Protocol",
    description:
      "The payto:// URI scheme for identifying a payment recipient, with amounts, fiat equivalents, deadlines and references.",
    sample: "payto://xcb/cb00…?amount=CTN:3.14",
    target: "paytoProtocol",
  },
];

const STEPS: { icon: IconName; title: string; body: string; target: TargetKey }[] = [
  {
    icon: "shieldCheck",
    title: "Set up in the dashboard",
    body: "Register your domain, create an OAuth client and generate an API key.",
    target: "dashboard",
  },
  {
    icon: "qr",
    title: "Add “Login with CorePass”",
    body: "Redirect to the authorization endpoint and read the CoreID from the JWT.",
    target: "login",
  },
  {
    icon: "webhook",
    title: "Request verified data",
    body: "Ask for KYC or KYB data from your backend and receive it by webhook.",
    target: "kyc",
  },
];

/* -----------------------------------------------------------------------------
 * Hero
 * -------------------------------------------------------------------------- */
function HeroCode(): ReactNode {
  return (
    <figure className={styles.codePanel} aria-label="Example authorization request">
      <figcaption className={styles.codeBar}>
        <span className={styles.codeDots} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className={styles.codeTitle}>Login with CorePass</span>
      </figcaption>
      <pre className={styles.codeBody}>
        <code>
          <span className={styles.tkComment}># 1. Send the user to CorePass</span>
          {"\n"}
          <span className={styles.tkKeyword}>GET</span>{" "}
          <span className={styles.tkUrl}>https://auth.corepass.net/oauth2/auth</span>
          {"\n    "}
          <span className={styles.tkPunct}>?</span>
          <span className={styles.tkKey}>client_id</span>
          <span className={styles.tkPunct}>=</span>
          <span className={styles.tkValue}>&lt;YOUR_CLIENT_ID&gt;</span>
          {"\n    "}
          <span className={styles.tkPunct}>&amp;</span>
          <span className={styles.tkKey}>response_type</span>
          <span className={styles.tkPunct}>=</span>
          <span className={styles.tkValue}>code</span>
          {"\n    "}
          <span className={styles.tkPunct}>&amp;</span>
          <span className={styles.tkKey}>scope</span>
          <span className={styles.tkPunct}>=</span>
          <span className={styles.tkValue}>openid%20offline</span>
          {"\n    "}
          <span className={styles.tkPunct}>&amp;</span>
          <span className={styles.tkKey}>code_challenge_method</span>
          <span className={styles.tkPunct}>=</span>
          <span className={styles.tkValue}>S256</span>
          {"\n\n"}
          <span className={styles.tkComment}># 2. User scans the QR code and approves</span>
          {"\n"}
          <span className={styles.tkComment}># 3. Exchange the code, verify the JWT</span>
          {"\n"}
          <span className={styles.tkPunct}>{"{"}</span>{" "}
          <span className={styles.tkKey}>&quot;sub&quot;</span>
          <span className={styles.tkPunct}>:</span>{" "}
          <span className={styles.tkValue}>&quot;coreid:cb00…&quot;</span>{" "}
          <span className={styles.tkPunct}>{"}"}</span>
        </code>
      </pre>
    </figure>
  );
}

function Hero({ href }: { href: (target: DocTarget) => string }): ReactNode {
  return (
    <header className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={clsx("container", styles.heroInner)}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>CorePass Developer Hub</span>
          <Heading as="h1" className={styles.heroTitle}>
            Passwordless login and{" "}
            <span className={styles.gradientText}>verified identity</span> for
            your app
          </Heading>
          <p className={styles.heroLede}>
            CorePass Connector is a hosted OAuth&nbsp;2.0 / OpenID Connect
            service. Users sign in with the CorePass app, and you can request
            verified personal (KYC) and business (KYB) data. There is no
            infrastructure to run.
          </p>
          <div className={styles.heroActions}>
            <Link
              className="button button--primary button--lg"
              to={href(TARGETS.getStarted)}
            >
              Get started
              <Icon name="arrowRight" size={18} />
            </Link>
            <Link
              className="button button--secondary button--lg"
              to={href(TARGETS.connector)}
            >
              Connector docs
            </Link>
          </div>
          <ul className={styles.heroFacts}>
            <li>
              <Icon name="shieldCheck" size={16} /> OAuth 2.0 + PKCE
            </li>
            <li>
              <Icon name="smartphone" size={16} /> QR and deep-link sign-in
            </li>
            <li>
              <Icon name="webhook" size={16} /> Signed webhooks
            </li>
          </ul>
        </div>
        <div className={styles.heroVisual}>
          <HeroCode />
        </div>
      </div>
    </header>
  );
}

/* -----------------------------------------------------------------------------
 * Sections
 * -------------------------------------------------------------------------- */
function SectionHeader({
  eyebrow,
  title,
  lede,
  action,
}: {
  eyebrow: string;
  title: string;
  lede: ReactNode;
  action?: ReactNode;
}): ReactNode {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <Heading as="h2" className={styles.sectionTitle}>
          {title}
        </Heading>
        <p className={styles.sectionLede}>{lede}</p>
      </div>
      {action}
    </div>
  );
}

function FeatureCard({
  feature,
  to,
}: {
  feature: Feature;
  to: string;
}): ReactNode {
  return (
    <Link to={to} className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.cardIcon}>
          <Icon name={feature.icon} size={22} />
        </span>
        <span className={styles.tag}>{feature.tag}</span>
      </div>
      <Heading as="h3" className={styles.cardTitle}>
        {feature.title}
      </Heading>
      <p className={styles.cardBody}>{feature.description}</p>
      <span className={styles.cardCta}>
        {feature.cta}
        <Icon name="arrowRight" size={16} />
      </span>
    </Link>
  );
}

function ProtocolCard({
  protocol,
  to,
}: {
  protocol: Protocol;
  to: string;
}): ReactNode {
  return (
    <Link to={to} className={clsx(styles.card, styles.protocolCard)}>
      <div className={styles.cardTop}>
        <span className={styles.cardIcon}>
          <Icon name={protocol.icon} size={22} />
        </span>
      </div>
      <Heading as="h3" className={styles.cardTitle}>
        {protocol.title}
      </Heading>
      <p className={styles.cardBody}>{protocol.description}</p>
      <code className={styles.uriSample}>{protocol.sample}</code>
      <span className={styles.cardCta}>
        Read the specification
        <Icon name="arrowRight" size={16} />
      </span>
    </Link>
  );
}

export default function Home(): ReactNode {
  const href = useDocHref();

  return (
    <Layout
      title="Developer documentation"
      description="Integrate CorePass Login, verified KYC and KYB data, and the CorePass and PayTo URI protocols into your application."
    >
      <Hero href={href} />

      <main className={styles.main}>
        <section className={clsx("container", styles.section)}>
          <SectionHeader
            eyebrow="CorePass Connector"
            title="Identity for your application"
            lede="One hosted service for signing users and businesses in, and for requesting identity data they have already verified in CorePass."
            action={
              <Link className={styles.textLink} to={href(TARGETS.connector)}>
                Connector overview <Icon name="arrowRight" size={16} />
              </Link>
            }
          />
          <div className={styles.grid3}>
            {CONNECTOR_FEATURES.map((feature) => (
              <FeatureCard
                key={feature.title}
                feature={feature}
                to={href(TARGETS[feature.target])}
              />
            ))}
          </div>
        </section>

        <section className={clsx("container", styles.section)} aria-label="Integration steps">
          <ol className={styles.steps}>
            {STEPS.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <Link to={href(TARGETS[step.target])} className={styles.stepLink}>
                  <span className={styles.stepNumber}>{index + 1}</span>
                  <span>
                    <span className={styles.stepTitle}>{step.title}</span>
                    <span className={styles.stepBody}>{step.body}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className={clsx("container", styles.section)}>
          <SectionHeader
            eyebrow="Protocols"
            title="Open URI schemes"
            lede="The building blocks underneath CorePass: portable URIs that any app, QR code or NFC tag can carry."
          />
          <div className={styles.grid2}>
            {PROTOCOLS.map((protocol) => (
              <ProtocolCard
                key={protocol.title}
                protocol={protocol}
                to={href(TARGETS[protocol.target])}
              />
            ))}
          </div>
        </section>

        <section className={clsx("container", styles.section, styles.sectionLast)}>
          <div className={styles.appBanner}>
            <div className={styles.appBannerCopy}>
              <span className={styles.cardIcon}>
                <Icon name="smartphone" size={22} />
              </span>
              <div>
                <Heading as="h2" className={styles.appBannerTitle}>
                  New to CorePass?
                </Heading>
                <p className={styles.appBannerBody}>
                  Get the app to test sign-in and data sharing yourself, or
                  read the introduction to the ecosystem.
                </p>
              </div>
            </div>
            <div className={styles.appBannerActions}>
              <Link className="button button--secondary" to={href(TARGETS.intro)}>
                <Icon name="bookOpen" size={16} /> Introduction
              </Link>
              <Link
                className="button button--secondary"
                href="https://play.google.com/store/apps/details?id=net.corepass.app"
              >
                Google Play <Icon name="arrowUpRight" size={16} />
              </Link>
              <Link
                className="button button--secondary"
                href="https://apps.apple.com/app/corepass-id/id1644928641"
              >
                App Store <Icon name="arrowUpRight" size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
