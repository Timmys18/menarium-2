-- Allow the reverse offer for the same item pair while still rejecting a
-- duplicate offer in the same direction. Terminal rows keep a NULL key.
UPDATE "SwapRequest"
SET "pendingPairKey" = CASE
  WHEN "status" = 'PENDING' THEN "senderItemId" || '->' || "receiverItemId"
  ELSE NULL
END;
