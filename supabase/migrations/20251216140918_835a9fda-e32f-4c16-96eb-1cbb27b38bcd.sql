SELECT auth.uid(); -- This is a placeholder, actual deletion needs to be done via admin API

-- Delete user from auth.users (requires service role)
DELETE FROM auth.users WHERE id = '92fef491-54b8-4e1b-aa5d-a673cd2867c9';