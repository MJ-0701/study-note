// S3b React island leaf — sidebar 뷰 순수 프레젠테이션 컴포넌트(props only, hook 0).
// hook 구독 0, useEffect-setState 0, onClick/onToggle 0 (AC4/AC5).
// <details open={isOpen}> = props-derived plain boolean, onToggle 없음(uncontrolled-style).
// data-action="sidebar-term-toggle" = document 위임(main.ts:1388) 경로 보존.
// JSX 자동 escape, dangerouslySetInnerHTML 0 (AC9 5-layer).
import type {
  SidebarViewProps,
  HomeSidebarProps,
  SubjectSidebarProps,
  SidebarGroupProps,
  SubjectNavItemProps,
  SchedulePill,
  DepthNavLink,
  AdminLinkProps,
  IntakeDetailsProps
} from "./sidebar-props";

// ─── Sub-components (pure, no hooks) ────────────────────────────────────

function DepthNavLinks({ links, ariaLabel }: { links: DepthNavLink[]; ariaLabel: string }): React.ReactElement {
  return (
    <div className="subject-sidebar-depth" aria-label={ariaLabel}>
      {links.map((link) => (
        <a
          key={link.href}
          className={`subject-sidebar-depth__link${link.active ? " active" : ""}`}
          href={link.href}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

function SubjectNavItem({
  item,
  ariaLabel
}: {
  item: SubjectNavItemProps;
  ariaLabel?: string;
}): React.ReactElement {
  return (
    <div className={`subject-sidebar-item${item.isCurrent ? " is-current" : ""}`}>
      <a
        className={`subject-sidebar-parent${item.isCurrent ? " is-current" : ""}`}
        href={item.href}
        aria-label={ariaLabel}
      >
        {item.title}
      </a>
      {item.isCurrent && item.depthNav && (
        <DepthNavLinks links={item.depthNav} ariaLabel={`${item.title} 하위 화면`} />
      )}
    </div>
  );
}

function TermGroups({
  groups
}: {
  groups: SidebarGroupProps[];
}): React.ReactElement {
  return (
    <>
      {groups.map((group) => {
        const termId = group.termId;
        return (
          <details
            key={termId}
            className="sidebar-term-group"
            open={group.isOpen}
            data-term-id={termId}
          >
            <summary
              className="sidebar-term-group__summary"
              data-action="sidebar-term-toggle"
              data-term-id={termId}
            >
              {group.label}
              <span className="sidebar-term-group__count">{group.subjects.length}</span>
            </summary>
            <div className="sidebar-term-group__body">
              {group.subjects.map((s) => (
                <SubjectNavItem key={s.id} item={s} />
              ))}
            </div>
          </details>
        );
      })}
    </>
  );
}

function ScheduleDetails({
  pills
}: {
  pills: SchedulePill[];
}): React.ReactElement {
  return (
    <details className="sidebar-details schedule-details">
      <summary>수업 일정</summary>
      <div className="schedule-list" aria-label="중간 이후 수업 일정">
        {pills.map((pill) => (
          <span
            key={pill.label}
            className={`schedule-pill${pill.kind === "final" ? " is-final" : ""}${pill.isActive ? " active" : ""}`}
          >
            <strong>{pill.label}</strong>
            <span>{pill.note}</span>
          </span>
        ))}
      </div>
    </details>
  );
}

function AdminBlock({ adminLink }: { adminLink: AdminLinkProps }): React.ReactElement | null {
  if (!adminLink.showAdminBlock) return null;
  return (
    <div className="sidebar-group sidebar-group--admin">
      <p className="group-label">🛡️ 관리자</p>
      <nav>
        {adminLink.showUserMgmt && (
          <a href="/admin.html#users" aria-label="사용자 관리">사용자 관리</a>
        )}
        <a href="/admin.html#ops" aria-label="운영 지표">운영 지표</a>
      </nav>
    </div>
  );
}

// ─── Home variant ────────────────────────────────────────────────────────

function HomeSidebarContent({ props }: { props: HomeSidebarProps }): React.ReactElement {
  const { activeRoute, termGroups, flatSubjectLinks, intakeDetails, schedulePills, adminLink } = props;

  return (
    <>
      <a className="wordmark" href="#/">study-note</a>
      <div className="sidebar-group sidebar-group--home">
        <p className="group-label">홈</p>
        <nav>
          <a className={activeRoute.name === "home" ? "active" : ""} href="#/">전체 현황</a>
        </nav>
      </div>
      <div className="sidebar-group sidebar-group--subjects">
        <p className="group-label">과목 공부</p>
        <nav aria-label="학기/과목 트리">
          {termGroups ? (
            <TermGroups groups={termGroups} />
          ) : (
            flatSubjectLinks?.map((s) => (
              <a key={s.id} href={s.href}>{s.title}</a>
            ))
          )}
        </nav>
      </div>
      <div className="sidebar-group sidebar-group--workspaces">
        <p className="group-label">PDF 작업공간</p>
        <nav>
          <a
            className={props.pdfWorkspacesActive ? "active" : ""}
            href="#/pdf-workspaces"
          >
            작업공간 목록
          </a>
        </nav>
      </div>
      <ScheduleDetails pills={schedulePills} />
      <IntakeDetailsBlock intakeDetails={intakeDetails} variant="home" />
      <AdminBlock adminLink={adminLink} />
    </>
  );
}

// ─── Subject variant ────────────────────────────────────────────────────

function SubjectSidebarContent({ props }: { props: SubjectSidebarProps }): React.ReactElement {
  const { activeRoute, termGroups, flatSubjectLinks, intakeDetails, schedulePills, adminLink } = props;

  return (
    <>
      <a className="wordmark" href="#/">study-note</a>
      <div className="sidebar-group sidebar-group--subjects">
        <p className="group-label">과목 공부</p>
        <nav aria-label="과목별 학습 화면">
          {termGroups ? (
            <TermGroups groups={termGroups} />
          ) : (
            flatSubjectLinks?.map((item) => (
              <SubjectNavItem key={item.id} item={item} />
            ))
          )}
        </nav>
      </div>
      <div className="sidebar-group sidebar-group--workspaces">
        <p className="group-label">PDF 작업공간</p>
        <nav>
          <a
            className={activeRoute.name === "pdf-workspace" ? "active" : ""}
            href={props.currentSubjectPdfWorkspaceHref}
          >
            {props.currentSubjectPdfWorkspaceTitle} 작업공간
          </a>
          <a
            className={activeRoute.name === "pdf-workspaces" ? "active" : ""}
            href="#/pdf-workspaces"
          >
            전체 작업공간
          </a>
        </nav>
      </div>
      <ScheduleDetails pills={schedulePills} />
      <IntakeDetailsBlock intakeDetails={intakeDetails} variant="subject" />
      <AdminBlock adminLink={adminLink} />
    </>
  );
}

// ─── 자료 관리 <details> ────────────────────────────────────────────────

function IntakeDetailsBlock({
  intakeDetails,
  variant
}: {
  intakeDetails: IntakeDetailsProps;
  variant: "home" | "subject";
}): React.ReactElement {
  if (variant === "home") {
    return (
      <details className="sidebar-details" open={intakeDetails.isOpen}>
        <summary>자료 관리</summary>
        <nav>
          <a className={intakeDetails.isOpen ? "active" : ""} href={intakeDetails.mainIntakeHref}>
            자료 투입 가이드
          </a>
          {intakeDetails.subjectIntakeItems.map((item) => (
            <a key={item.id} href={item.href}>{item.title} 자료 넣기</a>
          ))}
        </nav>
      </details>
    );
  }
  // subject variant
  const currentItem = intakeDetails.subjectIntakeItems.find((i) => i.isCurrentSubject);
  const otherItems = intakeDetails.subjectIntakeItems.filter((i) => !i.isCurrentSubject);
  return (
    <details className="sidebar-details" open={intakeDetails.isOpen}>
      <summary>자료 관리</summary>
      <nav>
        <a href={intakeDetails.mainIntakeHref}>자료 투입 가이드</a>
        {currentItem && (
          <a
            className={intakeDetails.isOpen ? "active" : ""}
            href={currentItem.href}
          >
            {currentItem.title} 자료 넣기
          </a>
        )}
        {intakeDetails.subjectPdfWorkspaceHref && currentItem && (
          <a
            className={intakeDetails.subjectPdfWorkspaceActive ? "active" : ""}
            href={intakeDetails.subjectPdfWorkspaceHref}
          >
            {currentItem.title} PDF 작업공간
          </a>
        )}
        {otherItems.map((item) => (
          <a key={item.id} href={item.href}>{item.title} 자료 넣기</a>
        ))}
      </nav>
    </details>
  );
}

// ─── Leaf component ──────────────────────────────────────────────────────

export function SidebarView({ props }: { props: SidebarViewProps }): React.ReactElement {
  const ariaLabel =
    props.variant === "home"
      ? "학습 내비게이션"
      : `${props.subjectTitle} 학습 내비게이션`;

  return (
    <aside className="sidebar" aria-label={ariaLabel}>
      {props.variant === "home" ? (
        <HomeSidebarContent props={props} />
      ) : (
        <SubjectSidebarContent props={props} />
      )}
    </aside>
  );
}
