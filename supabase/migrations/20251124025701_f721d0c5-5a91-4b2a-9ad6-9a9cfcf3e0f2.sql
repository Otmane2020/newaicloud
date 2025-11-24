-- Add theme column to landing_page_preferences table
ALTER TABLE public.landing_page_preferences
ADD COLUMN theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark'));