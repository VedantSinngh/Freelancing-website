-- Fix collaboration_invites RLS policy to handle case-insensitive email comparison
DROP POLICY IF EXISTS "Users can view invites they sent or received" ON collaboration_invites;

CREATE POLICY "Users can view invites they sent or received"
ON collaboration_invites
FOR SELECT
USING (
  sender_id = auth.uid() 
  OR receiver_id = auth.uid() 
  OR LOWER(receiver_email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
);