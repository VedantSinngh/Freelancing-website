-- Create security definer function to check if user is a project collaborator
CREATE OR REPLACE FUNCTION public.is_project_collaborator(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_collaborators
    WHERE user_id = _user_id
      AND project_id = _project_id
  )
$$;

-- Drop and recreate the problematic policy on project_collaborators
DROP POLICY IF EXISTS "Collaborators viewable by project participants" ON public.project_collaborators;

CREATE POLICY "Collaborators viewable by project participants" ON public.project_collaborators
FOR SELECT 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_collaborators.project_id 
    AND projects.client_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM bids 
    WHERE bids.project_id = project_collaborators.project_id 
    AND bids.freelancer_id = auth.uid() 
    AND bids.status = 'accepted'
  ) OR
  public.is_project_collaborator(auth.uid(), project_collaborators.project_id)
);

-- Update messages policies to use the function
DROP POLICY IF EXISTS "Project participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Messages viewable by project participants" ON public.messages;

CREATE POLICY "Project participants can send messages" ON public.messages
FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() AND (
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
    public.is_project_collaborator(auth.uid(), messages.project_id)
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
  public.is_project_collaborator(auth.uid(), messages.project_id)
);

-- Update milestones policies
DROP POLICY IF EXISTS "Project participants can manage milestones" ON public.milestones;
DROP POLICY IF EXISTS "Milestones viewable by project participants" ON public.milestones;

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
  public.is_project_collaborator(auth.uid(), milestones.project_id)
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
  public.is_project_collaborator(auth.uid(), milestones.project_id)
);

-- Update files policies
DROP POLICY IF EXISTS "Project participants can upload files" ON public.files;
DROP POLICY IF EXISTS "Files viewable by project participants" ON public.files;

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
    public.is_project_collaborator(auth.uid(), files.project_id)
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
  public.is_project_collaborator(auth.uid(), files.project_id)
);