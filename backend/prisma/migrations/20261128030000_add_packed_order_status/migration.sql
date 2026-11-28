-- FarmConnect: the harvest can really be packed.
--
-- The lifecycle of an order is "placed → confirmed → packed → dispatched →
-- delivered". The database knew only "placed → confirmed → dispatched →
-- delivered", so the backend silently rewrote a request for `PACKED` into
-- `CONFIRMED`.
--
-- The consequence was a lie in the interface: the dispatch dashboard of the
-- cultivator showed "packed in crates" while the shared database still said
-- "confirmed", and the step "harvest packed" of the timeline of the buyer
-- could never be reached.
--
-- The migration only adds a value to the enumeration. No row is dropped,
-- rewritten or locked, and every order that exists keeps its status.

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PACKED';
