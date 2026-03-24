-- Fix RLS policies for achievements to allow users to manage their own
DROP POLICY IF EXISTS "Admins can manage achievements" ON public.achievements;

CREATE POLICY "Users can insert their own achievements"
ON public.achievements
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own achievements"
ON public.achievements
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own achievements"
ON public.achievements
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all achievements"
ON public.achievements
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));