# Gap register

Generated from `src/lib/gaps.json` by `npm run gen:gaps`; do not edit. Every place the frontend cannot show or do what the owner
expects, with why and the ClickUp ticket that closes it. The code cites these ids (`notConnected(id)`, "unavailable (id)").

## Not connected (a control that shows an error until its ticket)

| Id | Screen | What | Why | Ticket |
|---|---|---|---|---|
| P-W1 | portfolio | Recording a purchase | The preview-then-record form is the writes ticket. | [86bd5z6mq](https://app.clickup.com/t/86bd5z6mq) |
| P-W2 | portfolio | Recording a sale | The preview-then-record form is the writes ticket. | [86bd5z6mq](https://app.clickup.com/t/86bd5z6mq) |
| P-W3 | portfolio | Logging or confirming a dividend | Confirming the dividends the system found is the writes ticket. | [86bd5z6mq](https://app.clickup.com/t/86bd5z6mq) |
| P-W4 | portfolio | Editing a position | The ledger never overwrites: this becomes Correct, Remove and Confirm with the broker in the writes ticket. | [86bd5z6mq](https://app.clickup.com/t/86bd5z6mq) |
| P-W5 | portfolio | Removing a position entered by mistake | The remove call is the writes ticket. | [86bd5z6mq](https://app.clickup.com/t/86bd5z6mq) |
| P-W6 | portfolio | Adding a stock to the portfolio | Looking up the ticker and recording the opening or buying entry is the writes ticket. | [86bd5z6mq](https://app.clickup.com/t/86bd5z6mq) |
| P-W7 | portfolio | Correcting a ledger entry | The correct preview and call are the writes ticket. | [86bd5z6mq](https://app.clickup.com/t/86bd5z6mq) |
| P-W8 | portfolio | Reversing a ledger entry | The reverse call is the writes ticket. | [86bd5z6mq](https://app.clickup.com/t/86bd5z6mq) |

## Missing (data or behaviour the screen needs and does not have)

| Id | Screen | What | Why | Ticket |
|---|---|---|---|---|
| E-1 | end-to-end | Mock mode cannot reproduce server-side filtering and paging, so the Transactions filter flows are not tested end to end | A recorded file is the same for every query. The seeded scratch backend and `npm run test:e2e:live` of the writes ticket close this. | [86bd5z6mq](https://app.clickup.com/t/86bd5z6mq) |
| P-A2 | portfolio | Allocation for a single account (TFSA, RRSP or Trading) | The exposure report has no account filter yet; until it has, the sector, industry and currency donuts say they cover the whole portfolio. | [86bd6r34c](https://app.clickup.com/t/86bd6r34c) |
| P-C1 | portfolio | The currency of a holding's realised gain is not stated by the API | HoldingResponse.total_realized_gain_loss has no currency in its description; it is shown in the stock's currency. | [86bd6r34c](https://app.clickup.com/t/86bd6r34c) |
| P-C2 | portfolio | A closed position's realised percent is unavailable | Holdings carry the realised amount but no percent and no CAD amount. | [86bd6r34c](https://app.clickup.com/t/86bd6r34c) |
| P-D1 | portfolio | Return against the benchmark fund is unavailable while the fund has no price history | The report says so (performance.fund.available is false with a reason); the fund's price history is a backend data job. | [86bd6r34c](https://app.clickup.com/t/86bd6r34c) |
| P-D2 | portfolio | The change at the last close may include cash the owner added or took out that day | The value history does not say how much cash moved each day; net_flow_cad is requested from the backend. Until then the figure is flagged when the cost base or cash changed between the two days. | [86bd6r34c](https://app.clickup.com/t/86bd6r34c) |
| P-F2 | portfolio | The tax-year refund block of the report is not shown | It is an untyped record in the API. | [86bd6r34c](https://app.clickup.com/t/86bd6r34c) |
| P-H5 | portfolio | A holding's note can be read but not edited | No route changes a holding's notes. | [86bd5z6mq](https://app.clickup.com/t/86bd5z6mq) |
| P-O1 | portfolio | The Optimizer tab and its Available to trade box still show the retired suggestions model | The optimizer's stored proposals replace it in the Optimizer ticket; this page does not touch that tab. | [86bd5z6n5](https://app.clickup.com/t/86bd5z6n5) |
| P-R1 | portfolio | Creating a portfolio for a user who has none | Creating a profile and a portfolio is the first-run flow of the Settings ticket. | [86bd5z6n3](https://app.clickup.com/t/86bd5z6n3) |
| P-T1 | portfolio | A transaction's "reversed by" link | The API serves reverses_transaction_id on the reversing row only, so the page marks a reversed row only when its reversing row is on the loaded page. | [86bd6r34c](https://app.clickup.com/t/86bd6r34c) |

## Documented difference (a deliberate choice)

| Id | Screen | What | Why | Ticket |
|---|---|---|---|---|
| P-A1 | portfolio | Allocation by geography is replaced by allocation by currency | The API has no country for a stock; exposure reports currency. | [86bd5z6mj](https://app.clickup.com/t/86bd5z6mj) |
| P-F1 | portfolio | The report's per-stock lines, who-and-why, breakdowns and action list are not shown | Holdings and Transactions already carry the same per-holding and per-action figures; a Reports view is a separate feature. | [86bd5z6mj](https://app.clickup.com/t/86bd5z6mj) |
| P-H1 | portfolio | The numeric Bull and Bear disagreement score is not shown | The snapshot serves the disagreement class (consensus, mild dissent, split decision, high conflict), not the score. | [86bd5z6mj](https://app.clickup.com/t/86bd5z6mj) |
| P-H2 | portfolio | The change in price over the day is derived, not served | The snapshot gives the change as a fraction; the amount is the price less price / (1 + change). | [86bd5z6mj](https://app.clickup.com/t/86bd5z6mj) |
| P-H3 | portfolio | Dividend per share is the analysis's expected income over its horizon, not the last year's payments | The snapshot serves income_per_share from the price band; the old annual_dividend_per_share has no source. | [86bd5z6mj](https://app.clickup.com/t/86bd5z6mj) |
| P-S1 | portfolio | The portfolio's optimizer settings (PortfolioResponse.settings) are not shown | They are owner rules edited in Settings, not a Portfolio page figure. | [86bd5z6n3](https://app.clickup.com/t/86bd5z6n3) |
