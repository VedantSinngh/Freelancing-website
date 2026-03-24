-- Fix project_collaborators RLS policy to allow accepting invitations
DROP POLICY IF EXISTS "Project owners can invite collaborators" ON project_collaborators;

CREATE POLICY "Project owners can invite collaborators"
ON project_collaborators
FOR INSERT
WITH CHECK (
  -- Project owner or accepted freelancer can invite
  (invited_by = auth.uid() AND (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_collaborators.project_id
      AND projects.client_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM bids
      WHERE bids.project_id = project_collaborators.project_id
      AND bids.freelancer_id = auth.uid()
      AND bids.status = 'accepted'
    )
  ))
  -- OR user is accepting their own invitation
  OR (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM collaboration_invites
      WHERE collaboration_invites.project_id = project_collaborators.project_id
      AND LOWER(collaboration_invites.receiver_email) = LOWER(auth.jwt()->>'email')
      AND collaboration_invites.status = 'pending'
    )
  )
);