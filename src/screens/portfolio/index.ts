import type { ScreenFieldSet } from '@/lib/fields'
import { ENTRY_FIELDS, ENTRY_NOT_SENT } from './entry-fields'
import { EXPOSURE_FIELDS, EXPOSURE_GROUP_FIELDS, EXPOSURE_NAME_FIELDS, EXPOSURE_NOT_SHOWN, EXPOSURE_PAIR_FIELDS, EXPOSURE_RISK_FIELDS } from './exposure'
import { HOLDING_FIELDS, HOLDING_NOT_SHOWN } from './holdings'
import { TRANSACTION_FIELDS, TRANSACTION_NOT_SHOWN } from './ledger'
import { PREVIEW_FIELDS, PREVIEW_NOT_SHOWN } from './preview'
import { ACCOUNT_FIELDS, ROOM_EVENT_FIELDS, ROOM_FIELDS, SUMMARY_FIELDS, SUMMARY_NOT_SHOWN } from './summary'

/** The Portfolio page: header, Holdings, Closed positions, Transactions and Allocation. */
export const PORTFOLIO_SCREEN: ScreenFieldSet = {
  screen: 'portfolio',
  schemas: [
    'HoldingResponse', 'StockSummary', 'StockSnapshotResponse', 'AnalysisCallResponse', 'PositionLineResponse', 'ScopeValueResponse',
    'PositionsResponse', 'ConfirmationResponse', 'PortfolioAccountResponse', 'PortfolioResponse', 'ReportResponse', 'ScopeReportResponse',
    'PeriodResponse', 'ProfitLinesResponse', 'TaxEstimateResponse', 'PerformanceResponse', 'FundResultResponse', 'FlowResponse',
    'ValueHistoryResponse', 'ValuePointResponse', 'RoomResponse', 'AccountRoomResponse', 'RoomEventResponse', 'ExposureResponse',
    'ExposureNameResponse', 'ExposureGroupResponse', 'ExposureRiskResponse', 'ExposurePairResponse', 'TransactionResponse',
    // the write forms: what the owner sends, and what the server's preview and record answer
    'TransactionCreate', 'EventsCreate', 'EventPreviewResponse', 'PositionAfterResponse', 'RecordedEventsResponse',
  ],
  fields: [
    ...HOLDING_FIELDS, ...TRANSACTION_FIELDS, ...SUMMARY_FIELDS, ...ACCOUNT_FIELDS, ...ROOM_FIELDS,
    ...ROOM_EVENT_FIELDS, ...EXPOSURE_FIELDS, ...EXPOSURE_NAME_FIELDS, ...EXPOSURE_GROUP_FIELDS,
    ...EXPOSURE_PAIR_FIELDS, ...EXPOSURE_RISK_FIELDS, ...ENTRY_FIELDS, ...PREVIEW_FIELDS,
  ],
  notShown: { ...HOLDING_NOT_SHOWN, ...TRANSACTION_NOT_SHOWN, ...SUMMARY_NOT_SHOWN, ...EXPOSURE_NOT_SHOWN, ...ENTRY_NOT_SENT, ...PREVIEW_NOT_SHOWN },
  notShownSchemas: {
    HoldingListResponse: { reason: 'An envelope: the rows are mapped to Holding, the paging fetched by fetchAllPages' },
    TransactionListResponse: { reason: 'An envelope: the rows are mapped to Transaction, the paging shown by the Pager' },
    PaginationMeta: { reason: 'Paging: read by fetchAllPages and shown by the Pager (page, pages, total)' },
    WhyLineResponse: { reason: 'Part of the report breakdowns, a Reports view feature', gap: 'P-F1' },
    BreakdownResponse: { reason: 'Part of the report breakdowns, a Reports view feature', gap: 'P-F1' },
    BreakdownGroupResponse: { reason: 'Part of the report breakdowns, a Reports view feature', gap: 'P-F1' },
    ActionLineResponse: { reason: 'The Transactions tab lists the same entries', gap: 'P-F1' },
  },
}
