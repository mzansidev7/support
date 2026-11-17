import "./SupportPageHeader.css";

function SupportPageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  titleIcon,
  titleAs = "h1",
  className = "",
  actionsClassName = "",
}) {
  const Title = titleAs;

  return (
    <section
      className={`support-page-heading ${className}`.trim()}
      aria-label={title}
    >
      <div className="support-page-heading-copy">
        {eyebrow ? <p className="support-page-heading-kicker">{eyebrow}</p> : null}
        <div className="support-page-heading-title">
          {titleIcon ? (
            <span className="support-page-heading-icon">{titleIcon}</span>
          ) : null}
          <Title>{title}</Title>
        </div>
        {description ? <p>{description}</p> : null}
        {meta}
      </div>
      {actions ? (
        <div
          className={`support-page-heading-actions ${actionsClassName}`.trim()}
        >
          {actions}
        </div>
      ) : null}
    </section>
  );
}

export default SupportPageHeader;
