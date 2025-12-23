-- Drop existing policy on api_keys table
DROP POLICY IF EXISTS "Users can manage own API keys" ON public.api_keys;

-- Create new policies with explicit authentication requirement
-- Policy: Only authenticated users can view their own API keys
CREATE POLICY "Users can view own API keys" 
ON public.api_keys 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Only authenticated users can insert their own API keys
CREATE POLICY "Users can insert own API keys" 
ON public.api_keys 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Only authenticated users can update their own API keys
CREATE POLICY "Users can update own API keys" 
ON public.api_keys 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Only authenticated users can delete their own API keys
CREATE POLICY "Users can delete own API keys" 
ON public.api_keys 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);