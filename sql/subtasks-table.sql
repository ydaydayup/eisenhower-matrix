-- Create subtasks table
CREATE TABLE IF NOT EXISTS public.subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT fk_task FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE
);

-- Create index on task_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON public.subtasks(task_id);

-- Add row level security policies
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own subtasks
-- This requires joining with the tasks table to check user_id
CREATE POLICY "Users can view their own subtasks"
ON public.subtasks
FOR SELECT
USING (
    task_id IN (
        SELECT id FROM public.tasks 
        WHERE user_id = auth.uid()
    )
);

-- Create policy to allow users to insert their own subtasks
CREATE POLICY "Users can insert their own subtasks"
ON public.subtasks
FOR INSERT
WITH CHECK (
    task_id IN (
        SELECT id FROM public.tasks 
        WHERE user_id = auth.uid()
    )
);

-- Create policy to allow users to update their own subtasks
CREATE POLICY "Users can update their own subtasks"
ON public.subtasks
FOR UPDATE
USING (
    task_id IN (
        SELECT id FROM public.tasks 
        WHERE user_id = auth.uid()
    )
);

-- Create policy to allow users to delete their own subtasks
CREATE POLICY "Users can delete their own subtasks"
ON public.subtasks
FOR DELETE
USING (
    task_id IN (
        SELECT id FROM public.tasks 
        WHERE user_id = auth.uid()
    )
); 