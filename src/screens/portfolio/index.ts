import type { ScreenFieldSet } from '@/lib/fields'
import { DIVIDEND_FIELDS, DIVIDEND_NOT_SHOWN } from './dividends'
import { ENTRY_FIELDS, ENTRY_NOT_SENT } from './entry-fields'
import { EXPOSURE_FIELDS, EXPOSURE_NOT_SHOWN } from './exposure'
import { HOLDING_FIELDS, HOLDING_NOT_SHOWN } from './holdings'
import { TRANSACTION_FIELDS, TRANSACTION_NOT_SHOWN } from './ledger'
import { LOOKUP_FIELDS, LOOKUP_NOT_SHOWN } from './lookup'
import { PREVIEW_FIELDS, PREVIEW_NOT_SHOWN } from './preview'
import { ROOM_FIELDS, SUMMARY_FIELDS, SUMMARY_NOT_SHOWN } from './summary'

/** The Portfolio page: header, Holdings, Closed positions, Transactions and Allocation. The stock and its call are the shared set (`../stock`). */
export const PORTFOLIO_SCREEN: ScreenFieldSet = {
  screen: 'portfolio',
  schemas: [
    'HoldingResponse', 'PositionLineResponse', 'ScopeValueResponse',
    'PositionsResponse', 'ConfirmationResponse', 'PortfolioAccountResponse', 'PortfolioResponse', 'ReportResponse', 'ScopeReportResponse',
    'PeriodResponse', 'ProfitLinesResponse', 'TaxEstimateResponse', 'PerformanceResponse', 'FundResultResponse', 'FlowResponse',
    'ValueHistoryResponse', 'ValuePointResponse', 'RoomResponse', 'AccountRoomResponse', 'RoomEventResponse', 'ExposureResponse',
    'ExposureNameResponse', 'ExposureGroupResponse', 'ExposureRiskResponse', 'ExposurePairResponse', 'TransactionResponse',
    // the write forms: what the owner sends, and what the server's preview and record answer
    'TransactionCreate', 'EventsCreate', 'EventPreviewResponse', 'PositionAfterResponse', 'RecordedEventsResponse', 'StockLookupResponse',
    // the dividends the system found (added at the owner's request)
    'DividendCorrections', 'DividendEventResponse', 'DividendConfirmedResponse',
  ],
  fields: [
    ...HOLDING_FIELDS, ...TRANSACTION_FIELDS, ...SUMMARY_FIELDS, ...ROOM_FIELDS,
    ...EXPOSURE_FIELDS, ...ENTRY_FIELDS, ...PREVIEW_FIELDS, ...LOOKUP_FIELDS, ...DIVIDEND_FIELDS,
  ],
  notShown: { ...HOLDING_NOT_SHOWN, ...TRANSACTION_NOT_SHOWN, ...SUMMARY_NOT_SHOWN, ...EXPOSURE_NOT_SHOWN, ...ENTRY_NOT_SENT, ...PREVIEW_NOT_SHOWN, ...LOOKUP_NOT_SHOWN, ...DIVIDEND_NOT_SHOWN },
  notShownSchemas: {
    HoldingListResponse: { reason: 'An envelope: the rows are mapped to Holding, the paging fetched by fetchAllPages' },
    TransactionListResponse: { reason: 'An envelope: the rows are mapped to Transaction, the paging shown by the Pager' },
    PaginationMeta: { reason: 'Paging: read by fetchAllPages and shown by the Pager (page, pages, total)' },
    WhyLineResponse: { reason: 'Part of the report breakdowns, a Reports view feature', gap: 'P-F1' },
    BreakdownResponse: { reason: 'Part of the report breakdowns, a Reports view feature', gap: 'P-F1' },
    BreakdownGroupResponse: { reason: 'Part of the report breakdowns, a Reports view feature', gap: 'P-F1' },
    ActionLineResponse: { reason: 'The Transactions tab lists the same entries', gap: 'P-F1' },
    DividendEventListResponse: { reason: 'An envelope: the rows are mapped to DividendEvent, read in one call (fetchAllPages)' },
    MoveCreate: { reason: "Not built: the original design has no such screen (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
    ReconcilePosition: { reason: "Not built: the original design has no such screen (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
    ReconcileCash: { reason: "Not built: the original design has no such screen (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
    ReconciliationResponse: { reason: "Not built: the original design has no such screen (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
    ReconciliationListResponse: { reason: "Not built: the original design has no such screen (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
    ReconciliationsResponse: { reason: "Not built: the original design has no such screen (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
    DividendDismiss: { reason: 'Dismissing a dividend sends no body: the original forms had no notes field' },
  },
}
