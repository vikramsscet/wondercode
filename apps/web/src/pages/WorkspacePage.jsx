import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, LoadingState, buttonClasses } from '../components/ui/index.js';
import { useChildProfiles } from '../features/child-profile/ChildProfilesContext.jsx';
import { useGuest } from '../features/guest/GuestContext.jsx';
import { draftKey } from '../features/workspace/drafts.js';
import { useProject } from '../features/workspace/useProject.js';
import Workspace from '../features/workspace/Workspace.jsx';

// /workspace and /try/workspace: sample files, for looking around.
export default function WorkspacePage() {
  return <Workspace />;
}

function ProjectWorkspace({
  projectId,
  ownerId,
  childId,
  guestToken,
  createPath,
  defaultLanguage,
}) {
  const { status, project, reload } = useProject(projectId, { childId, guestToken });
  const [highlight, setHighlight] = useState(null); // what the last experiment changed
  if (status === 'loading') return <LoadingState message="Opening your project…" />;
  if (status === 'notfound') {
    return (
      <div className="mx-auto max-w-xl text-center">
        <Alert tone="info">We couldn't find that project.</Alert>
        <Link to={createPath} className={buttonClasses({ className: 'mt-4' })}>
          Make a new project
        </Link>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="mx-auto max-w-xl text-center">
        <Alert tone="error">We couldn't open your project just now. Your files are safe.</Alert>
        <Button className="mt-4" onClick={reload}>
          Try again
        </Button>
      </div>
    );
  }
  return (
    <Workspace
      key={project.version.id}
      title={project.project.title}
      files={project.files.map(({ path, content }) => ({ path, content }))}
      version={project.version.versionNumber}
      checked={project.validated}
      draftKey={draftKey(ownerId, projectId, project.version.id)}
      explain={{ projectId, versionId: project.version.id, childId, guestToken, defaultLanguage }}
      highlight={highlight}
      onReload={reload}
      onNewVersion={(result) => {
        setHighlight({
          version: result.version.versionNumber,
          paths: result.changedFiles.map((c) => c.path),
        });
        reload();
      }}
    />
  );
}

// /workspace/:projectId (child)
export function ChildProjectPage() {
  const { projectId } = useParams();
  const { active } = useChildProfiles();
  return (
    <ProjectWorkspace
      key={`${active.id}/${projectId}`}
      projectId={projectId}
      ownerId={active.id}
      childId={active.id}
      createPath="/create"
      defaultLanguage={active.explanationLanguage ?? 'en'}
    />
  );
}

// /try/workspace/:projectId (guest)
export function GuestProjectPage() {
  const { projectId } = useParams();
  const { guest } = useGuest();
  return (
    <ProjectWorkspace
      key={projectId}
      projectId={projectId}
      ownerId="guest"
      guestToken={guest.token}
      createPath="/try/create"
    />
  );
}
