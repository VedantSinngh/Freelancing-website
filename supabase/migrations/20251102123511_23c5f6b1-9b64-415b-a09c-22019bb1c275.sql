-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Project participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Messages viewable by project participants" ON public.messages;
DROP POLICY IF EXISTS "Project participants can manage milestones" ON public.milestones;
DROP POLICY IF EXISTS "Milestones viewable by project participants" ON public.milestones;
DROP POLICY IF EXISTS "Project participants can upload files" ON public.files;
DROP POLICY IF EXISTS "Files viewable by project participants" ON public.files;

-- Create new policies that include collaborators for MESSAGES
CREATE POLICY "Project participants can send messages" ON public.messages
FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() AND (
    -- Project owner
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = messages.project_id 
      AND projects.client_id = auth.uid()
    )
    OR
    -- Accepted freelancer
    EXISTS (
      SELECT 1 FROM bids 
      WHERE bids.project_id = messages.project_id 
      AND bids.freelancer_id = auth.uid() 
      AND bids.status = 'accepted'
    )
    OR
    -- Project collaborator
    EXISTS (
      SELECT 1 FROM project_collaborators
      WHERE project_collaborators.project_id = messages.project_id
      AND project_collaborators.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Messages viewable by project participants" ON public.messages
FOR SELECT 
USING (
  sender_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = messages.project_id 
    AND projects.client_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM bids 
    WHERE bids.project_id = messages.project_id 
    AND bids.freelancer_id = auth.uid() 
    AND bids.status = 'accepted'
  ) OR
  EXISTS (
    SELECT 1 FROM project_collaborators
    WHERE project_collaborators.project_id = messages.project_id
    AND project_collaborators.user_id = auth.uid()
  )
);

-- Create new policies that include collaborators for MILESTONES
CREATE POLICY "Project participants can manage milestones" ON public.milestones
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = milestones.project_id 
    AND projects.client_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM bids 
    WHERE bids.project_id = milestones.project_id 
    AND bids.freelancer_id = auth.uid() 
    AND bids.status = 'accepted'
  ) OR
  EXISTS (
    SELECT 1 FROM project_collaborators
    WHERE project_collaborators.project_id = milestones.project_id
    AND project_collaborators.user_id = auth.uid()
  )
);

CREATE POLICY "Milestones viewable by project participants" ON public.milestones
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = milestones.project_id 
    AND projects.client_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM bids 
    WHERE bids.project_id = milestones.project_id 
    AND bids.freelancer_id = auth.uid() 
    AND bids.status = 'accepted'
  ) OR
  EXISTS (
    SELECT 1 FROM project_collaborators
    WHERE project_collaborators.project_id = milestones.project_id
    AND project_collaborators.user_id = auth.uid()
  )
);

-- Create new policies that include collaborators for FILES
CREATE POLICY "Project participants can upload files" ON public.files
FOR INSERT 
WITH CHECK (
  uploader_id = auth.uid() AND (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = files.project_id 
      AND projects.client_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM bids 
      WHERE bids.project_id = files.project_id 
      AND bids.freelancer_id = auth.uid() 
      AND bids.status = 'accepted'
    ) OR
    EXISTS (
      SELECT 1 FROM project_collaborators
      WHERE project_collaborators.project_id = files.project_id
      AND project_collaborators.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Files viewable by project participants" ON public.files
FOR SELECT 
USING (
  uploader_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = files.project_id 
    AND projects.client_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM bids 
    WHERE bids.project_id = files.project_id 
    AND bids.freelancer_id = auth.uid() 
    AND bids.status = 'accepted'
  ) OR
  EXISTS (
    SELECT 1 FROM project_collaborators
    WHERE project_collaborators.project_id = files.project_id
    AND project_collaborators.user_id = auth.uid()
  )
);