import React from "react";
import { Link } from "react-router-dom";
import "./PageLayout.css";

export type Step = "design" | "dye" | "pattern";

const stepOrder: Step[] = ["design", "dye", "pattern"];
const stepLabels: Record<Step, string> = {
  design: "Design",
  dye: "Dye",
  pattern: "Pattern",
};

interface PageLayoutProps {
  /** Rendered as the page's only h1, unless showTitle is false. */
  title: string;
  /**
   * Set false when the page's own content carries the visible heading, as the
   * homepage hero does. The title is still used for the document title.
   */
  showTitle?: boolean;
  lede?: React.ReactNode;
  /** Which of the three steps this page is, if it is one of them. */
  step?: Step;
  /** Pushed to the right of the masthead when there is no step indicator. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The sheet every page is laid out on.
 *
 * The step indicator exists because the flow gave no sense of place: you went
 * from a form to a spinning hat to a grid with no idea how many stages there
 * were or where you had got to.
 */
const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  showTitle = true,
  lede,
  step,
  aside,
  children,
}) => (
  <div className="page">
    <header className="masthead screen-only">
      <Link to="/" className="masthead-title">
        Hats Which Look Like Earth
      </Link>
      {step ? (
        <nav className="steps" aria-label="Progress">
          {stepOrder.map((name, position) => {
            const current = name === step;
            const done = stepOrder.indexOf(step) > position;
            return (
              <React.Fragment key={name}>
                {position > 0 && (
                  <span className="step-line" aria-hidden="true" />
                )}
                <span
                  className={[
                    "step",
                    current ? "step-current" : "",
                    done ? "step-done" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-current={current ? "step" : undefined}
                >
                  <span className="step-dot" aria-hidden="true" />
                  {stepLabels[name]}
                </span>
              </React.Fragment>
            );
          })}
        </nav>
      ) : (
        aside
      )}
    </header>
    {showTitle && <h1 className="page-title screen-only">{title}</h1>}
    {lede && <p className="page-lede screen-only">{lede}</p>}
    {children}
  </div>
);

export default PageLayout;
