-- Create whiteboard_sessions table
CREATE TABLE public.whiteboard_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create whiteboard_objects table for storing canvas objects
CREATE TABLE public.whiteboard_objects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.whiteboard_sessions(id) ON DELETE CASCADE,
  object_id TEXT NOT NULL,
  object_data JSONB NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whiteboard_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whiteboard_objects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whiteboard_sessions
CREATE POLICY "Project participants can view whiteboard sessions"
ON public.whiteboard_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = whiteboard_sessions.project_id
    AND projects.client_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.bids
    WHERE bids.project_id = whiteboard_sessions.project_id
    AND bids.freelancer_id = auth.uid()
    AND bids.status = 'accepted'
  )
  OR is_project_collaborator(auth.uid(), project_id)
);

CREATE POLICY "Project participants can create whiteboard sessions"
ON public.whiteboard_sessions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = whiteboard_sessions.project_id
    AND projects.client_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.bids
    WHERE bids.project_id = whiteboard_sessions.project_id
    AND bids.freelancer_id = auth.uid()
    AND bids.status = 'accepted'
  )
  OR is_project_collaborator(auth.uid(), project_id)
);

-- RLS Policies for whiteboard_objects
CREATE POLICY "Session participants can view whiteboard objects"
ON public.whiteboard_objects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.whiteboard_sessions ws
    JOIN public.projects p ON ws.project_id = p.id
    WHERE ws.id = whiteboard_objects.session_id
    AND (
      p.client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.bids
        WHERE bids.project_id = p.id
        AND bids.freelancer_id = auth.uid()
        AND bids.status = 'accepted'
      )
      OR is_project_collaborator(auth.uid(), p.id)
    )
  )
);

CREATE POLICY "Session participants can create whiteboard objects"
ON public.whiteboard_objects FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.whiteboard_sessions ws
    JOIN public.projects p ON ws.project_id = p.id
    WHERE ws.id = whiteboard_objects.session_id
    AND (
      p.client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.bids
        WHERE bids.project_id = p.id
        AND bids.freelancer_id = auth.uid()
        AND bids.status = 'accepted'
      )
      OR is_project_collaborator(auth.uid(), p.id)
    )
  )
);

CREATE POLICY "Session participants can update whiteboard objects"
ON public.whiteboard_objects FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.whiteboard_sessions ws
    JOIN public.projects p ON ws.project_id = p.id
    WHERE ws.id = whiteboard_objects.session_id
    AND (
      p.client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.bids
        WHERE bids.project_id = p.id
        AND bids.freelancer_id = auth.uid()
        AND bids.status = 'accepted'
      )
      OR is_project_collaborator(auth.uid(), p.id)
    )
  )
);

CREATE POLICY "Session participants can delete whiteboard objects"
ON public.whiteboard_objects FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.whiteboard_sessions ws
    JOIN public.projects p ON ws.project_id = p.id
    WHERE ws.id = whiteboard_objects.session_id
    AND (
      p.client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.bids
        WHERE bids.project_id = p.id
        AND bids.freelancer_id = auth.uid()
        AND bids.status = 'accepted'
      )
      OR is_project_collaborator(auth.uid(), p.id)
    )
  )
);

-- Enable realtime for whiteboard_objects
ALTER PUBLICATION supabase_realtime ADD TABLE public.whiteboard_objects;

-- Trigger for updating updated_at
CREATE TRIGGER update_whiteboard_sessions_updated_at
BEFORE UPDATE ON public.whiteboard_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whiteboard_objects_updated_at
BEFORE UPDATE ON public.whiteboard_objects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();