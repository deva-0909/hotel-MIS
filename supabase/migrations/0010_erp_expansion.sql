-- New staff roles for the expanded department set
alter type staff_role add value if not exists 'engineering';
alter type staff_role add value if not exists 'hr';
alter type staff_role add value if not exists 'crm_marketing';
alter type staff_role add value if not exists 'banquet';
alter type staff_role add value if not exists 'spa_laundry';
alter type staff_role add value if not exists 'travel_desk';

-- Purchase requisition workflow stages (Purchase Approval Board)
alter type po_status add value if not exists 'pending_approval';
alter type po_status add value if not exists 'approved';
alter type po_status add value if not exists 'rejected';
