-- Create project_collaborators table
CREATE TABLE public.project_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- Collaborators viewable by project participants
CREATE POLICY "Collaborators viewable by project participants"
ON public.project_collaborators
FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_collaborators.project_id
    AND projects.client_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.bids
    WHERE bids.project_id = project_collaborators.project_id
    AND bids.freelancer_id = auth.uid()
    AND bids.status = 'accepted'
  ) OR
  EXISTS (
    SELECT 1 FROM public.project_collaborators pc
    WHERE pc.project_id = project_collaborators.project_id
    AND pc.user_id = auth.uid()
  )
);

-- Project owners and collaborators can invite others
CREATE POLICY "Project owners can invite collaborators"
ON public.project_collaborators
FOR INSERT
WITH CHECK (
  invited_by = auth.uid() AND (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_collaborators.project_id
      AND projects.client_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.bids
      WHERE bids.project_id = project_collaborators.project_id
      AND bids.freelancer_id = auth.uid()
      AND bids.status = 'accepted'
    )
  )
);

-- Collaborators can remove themselves, project owners can remove anyone
CREATE POLICY "Collaborators can leave projects"
ON public.project_collaborators
FOR DELETE
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_collaborators.project_id
    AND projects.client_id = auth.uid()
  )
);

-- Enable realtime for project_collaborators
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_collaborators;