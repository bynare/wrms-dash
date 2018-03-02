var query = require('./query'),
    org_data = require('./org_data'),
    util = require('./util');

module.exports = query.prepare(
    'wrs_to_invoice',
    'wrs_to_invoice',
    function(ctx){
        return `SELECT q.request_id,
                       r.brief,
                       o.org_name AS org,
                       o.org_code AS org_id,
                       c.lookup_desc AS status,
                       q.quote_id,
                       q.quote_brief,
                       CASE WHEN q.quote_units = 'days' THEN q.quote_amount*8
                            ELSE q.quote_amount
                       END AS quote_amount,
                       CASE WHEN q.quote_units = 'days' THEN 'hours'
                            ELSE q.quote_units
                       END AS quote_units
                FROM request_quote q
                JOIN request r ON q.request_id=r.request_id
                JOIN usr u ON
                    u.user_no=r.requester_id
                JOIN organisation o ON
                    o.org_code=u.org_code
                LEFT JOIN lookup_code c ON
                    c.source_table='request' AND
                    c.source_field='status_code' AND
                    c.lookup_code=r.last_status
                WHERE
                    q.quote_cancelled_by IS NULL AND
                    q.approved_by_id IS NOT NULL AND
                    q.invoice_no IS NULL AND
                    q.request_id IN (
                        SELECT request_id
                        FROM request_tag
                        WHERE
                            tag_id IN (
                                SELECT tag_id
                                FROM organisation_tag
                                WHERE tag_description='Additional'
                            )
                    )`.replace(/\s+/, ' ');
    },
    function(data, ctx, next){
        let r = [],
            all_orgs = org_data.get_all_orgs();
        if (data && data.rows && data.rows.length > 0){
            // Only include orgs we're interested in
            r = data.rows.filter(row => { return all_orgs.indexOf(row.org_id) > -1; });
        }
        next(r);
    }
)
