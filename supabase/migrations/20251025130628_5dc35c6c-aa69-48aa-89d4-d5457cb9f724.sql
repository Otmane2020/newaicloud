-- Add UPDATE policy for subscriptions table to allow users to modify their own subscriptions
CREATE POLICY "Users can update their own subscriptions"
  ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (
    auth.uid() = seller_id AND
    -- Only allow updating cancel_at_period_end and updated_at fields
    -- Prevent changing critical fields like plan_id, status, stripe_subscription_id
    plan_id = plan_id AND
    status = status AND
    stripe_subscription_id = stripe_subscription_id
  );