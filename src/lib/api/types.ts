import type { components, paths } from './schema';

export type { components, paths };
export type Schemas = components['schemas'];

// Auth & User
export type SignupRequest = Schemas['SignupRequest'];
export type LoginRequest = Schemas['LoginRequest'];
export type GoogleAuthStartResponse = Schemas['GoogleAuthStartResponse'];
export type UserResponse = Schemas['UserResponse'];
export type DeleteAccountRequest = Schemas['DeleteAccountRequest'];
export type DeletionSummaryResponse = Schemas['DeletionSummaryResponse'];

// Accounts & Cards
export type AccountResponse = Schemas['AccountResponse'];
export type BankAccountResponse = Schemas['BankAccountResponse'];
export type CreditCardAccountResponse = Schemas['CreditCardAccountResponse'];
export type BrokerAccountResponse = Schemas['BrokerAccountResponse'];
export type { Account } from '@/lib/account.types';
export type CreateAccountRequest = Schemas['CreateAccountRequest'];
export type CardholderResponse = Schemas['CardholderResponse'];
export type CardResponse = Schemas['CardResponse'];
export type CreateCardholderRequest = Schemas['CreateCardholderRequest'];
export type UpdateCardholderRequest = Schemas['UpdateCardholderRequest'];
export type CreateCardRequest = Schemas['CreateCardRequest'];
export type ReplaceCardRequest = Schemas['ReplaceCardRequest'];
export type CardCycleSummaryResponse = Schemas['CardCycleSummaryResponse'];
export type CardCycleHistoryItemResponse = Schemas['CardCycleHistoryItemResponse'];

// Transactions
export type TransactionResponse = Schemas['TransactionResponse'];
export type Transaction = TransactionResponse;
export type TransactionSearchRequest = Schemas['TransactionSearchRequest'];
export type CreateTransactionRequest = Schemas['CreateTransactionRequest'];
export type UpdateTransactionRequest = Schemas['UpdateTransactionRequest'];
export type BatchReviewRequest = Schemas['BatchReviewRequest'];
export type BatchReviewResponse = Schemas['BatchReviewResponse'];
export type BatchDeleteRequest = Schemas['BatchDeleteRequest'];
export type BatchDeleteResponse = Schemas['BatchDeleteResponse'];
export type MergeTransactionsRequest = Schemas['MergeTransactionsRequest'];
export type MergeTransactionsResponse = Schemas['MergeTransactionsResponse'];
export type TransactionLinkResponse = Schemas['TransactionLinkResponse'];
export type TransactionLinkSummary = Schemas['TransactionLinkSummary'];
export type CreateTransactionLinkRequest = Schemas['CreateTransactionLinkRequest'];

// Categories & Rules
export type CategoryResponse = Schemas['CategoryResponse'];
export type Category = CategoryResponse;
export type CategoryRequest = Schemas['CategoryRequest'];
export type CategorizeRequest = Schemas['CategorizeRequest'];
export type CategorizeResponse = Schemas['CategorizeResponse'];
export type CategoryRule = Schemas['RuleResponse'];
export type CreateRuleRequest = Schemas['CreateRuleRequest'];
export type UpdateRuleRequest = Schemas['UpdateRuleRequest'];
export type ApplyRuleRequest = Schemas['ApplyRuleRequest'];
export type PreviewMatchesRequest = Schemas['PreviewMatchesRequest'];
export type RuleMatchTransactionResponse = Schemas['RuleMatchTransactionResponse'];

// Dashboards
export type DashboardResponse = Schemas['DashboardResponse'];
export type WidgetResponse = Schemas['WidgetResponse'];
export type CreateDashboardRequest = Schemas['CreateDashboardRequest'];
export type UpdateDashboardRequest = Schemas['UpdateDashboardRequest'];

// Jobs
export type JobResponse = Schemas['JobResponse'];
export type EnqueueResponse = Schemas['EnqueueResponse'];

// Lending & Obligations
export type LendingResponse = Schemas['LendingResponse'];
export type CreateLendingRequest = Schemas['CreateLendingRequest'];
export type UpdateLendingRequest = Schemas['UpdateLendingRequest'];
export type CounterpartyResponse = Schemas['CounterpartyResponse'];
export type CreateCounterpartyRequest = Schemas['CreateCounterpartyRequest'];
export type UpdateCounterpartyRequest = Schemas['UpdateCounterpartyRequest'];
export type ObligationsResponse = Schemas['ObligationsResponse'];

// Loans
export type LoanResponse = Schemas['LoanResponse'];
export type LoanDetailResponse = Schemas['LoanDetailResponse'];
export type CreateLoanRequest = Schemas['CreateLoanRequest'];
export type UpdateLoanRequest = Schemas['UpdateLoanRequest'];
export type LoanPaymentResponse = Schemas['LoanPaymentResponse'];
export type CreateLoanPaymentRequest = Schemas['CreateLoanPaymentRequest'];
export type BatchLoanPaymentRequest = Schemas['BatchLoanPaymentRequest'];
export type LoanChargeResponse = Schemas['LoanChargeResponse'];
export type CreateLoanChargeRequest = Schemas['CreateLoanChargeRequest'];
export type LoanEventResponse = Schemas['LoanEventResponse'];
export type CreateLoanEventRequest = Schemas['CreateLoanEventRequest'];
export type LoansSummaryResponse = Schemas['LoansSummaryResponse'];
export type MatchSuggestionsResponse = Schemas['MatchSuggestionsResponse'];
export type InstallmentDto = Schemas['InstallmentDto'];

// Rewards
export type RewardRule = Schemas['RewardRuleResponse'];
export type RewardRuleRequest = Schemas['RewardRuleRequest'];
export type RewardAccountConfig = Schemas['RewardAccountConfigResponse'];
export type RewardAccountConfigRequest = Schemas['RewardAccountConfigRequest'];
export type RewardCapBucket = Schemas['RewardCapBucketResponse'];
export type RewardCapBucketRequest = Schemas['RewardCapBucketRequest'];
export type RewardMilestone = Schemas['RewardMilestoneResponse'];
export type RewardMilestoneRequest = Schemas['RewardMilestoneRequest'];
export type RewardReport = Schemas['RewardReportResponse'];
export type RewardRecommendationRequest = Schemas['RewardRecommendationRequest'];
export type RewardRecommendationResponse = Schemas['RewardRecommendationResponse'];
export type ReorderRewardRulesRequest = Schemas['ReorderRewardRulesRequest'];

// Investments & Instruments
export type Instrument = Schemas['InstrumentResponse'];
export type InstrumentRequest = Schemas['InstrumentRequest'];
export type CorporateAction = Schemas['CorporateActionResponse'];
export type CreateCorporateActionRequest = Schemas['CreateCorporateActionRequest'];
export type UpdateCorporateActionRequest = Schemas['UpdateCorporateActionRequest'];
export type Dividend = Schemas['DividendResponse'];
export type CreateDividendRequest = Schemas['CreateDividendRequest'];
export type UpdateDividendRequest = Schemas['UpdateDividendRequest'];
export type DividendSummary = Schemas['DividendSummaryResponse'];
export type DividendSuggestionsResponse = Schemas['DividendSuggestionsResponse'];
export type AcceptSuggestionsRequest = Schemas['AcceptSuggestionsRequest'];
export type AcceptSuggestionsResponse = Schemas['AcceptSuggestionsResponse'];
export type FnoTradeResponse = Schemas['FnoTradeResponse'];
export type FnoTradeListResponse = Schemas['FnoTradeListResponse'];
export type CreateFnoTradeRequest = Schemas['CreateFnoTradeRequest'];
export type InvestmentPositionResponse = Schemas['PositionsResponse'];
export type PositionDto = Schemas['PositionDto'];
export type InvestmentSummary = Schemas['SummaryResponse'];
export type InvestmentTransactionResponse = Schemas['InvestmentTransactionResponse'];
export type CreateInvestmentTransactionRequest = Schemas['CreateInvestmentTransactionRequest'];
export type UpdateInvestmentTransactionRequest = Schemas['UpdateInvestmentTransactionRequest'];
export type ImportPreview = Schemas['ImportPreviewResponse'];
export type ImportCommitRequest = Schemas['ImportCommitRequest'];

// Reports
export type ReportResponse = Schemas['ReportResponse'];
export type ReportSummaryResponse = Schemas['ReportSummaryResponse'];
export type CreateReportRequest = Schemas['CreateReportRequest'];
export type UpdateReportRequest = Schemas['UpdateReportRequest'];
export type RunReportRequest = Schemas['RunReportRequest'];
// NOTE: ReportCatalog/ReportData/ReportRunOptions, the paged-list aliases, and
// several investment/gmail/job result shapes are deliberately NOT re-declared
// here. Each already has a precise hand-authored type in its owning
// `*.types.ts` file (or `@/lib/types`) — often carrying a decimal-as-string
// wire convention or richer client-side shape the generated schema doesn't
// capture — and that is the type apiClient.ts and every consumer actually
// use. Declaring placeholder `any` aliases here previously shadowed those
// real types for no benefit; see the owning files instead:
// reports.types.ts, transaction.types.ts, rules.types.ts, rewards.types.ts,
// loan.types.ts, jobs.types.ts, and `@/lib/types` (investments/gmail/ingestion).

// Gmail & Ingestion
export type GmailConnectionResponse = Schemas['GmailConnectionResponse'];
export type GmailOAuthStartResponse = Schemas['OAuthStartResponse'];
export type GmailSenderResponse = Schemas['GmailSenderResponse'];
export type GmailSenderRequest = Schemas['GmailSenderRequest'];
export type CleanupPreviewResponse = Schemas['CleanupPreviewResponse'];
export type CleanupResultResponse = Schemas['CleanupResultResponse'];

// LLM
export type LlmKeyDto = Schemas['LlmKeyDto'];
export type CreateLlmKeyRequest = Schemas['CreateLlmKeyRequest'];
export type UpdateLlmKeyPositionRequest = Schemas['UpdateLlmKeyPositionRequest'];
export type TestKeyRequest = Schemas['TestKeyRequest'];
export type TestKeyResponse = Schemas['TestKeyResponse'];
export type LlmBucketHealthDto = Schemas['LlmBucketHealthDto'];
export type LlmRoutingDto = Schemas['LlmRoutingDto'];
export type LlmRoutingGroupDto = Schemas['LlmRoutingGroupDto'];
export type LlmTaskGroupDto = Schemas['LlmTaskGroupDto'];
export type ProviderCatalogDto = Schemas['ProviderCatalogDto'];
export type RoutingOptionDto = Schemas['RoutingOptionDto'];
export type UpdateRoutingRequest = Schemas['UpdateRoutingRequest'];

// Errors
export type ErrorResponse = Schemas['ErrorResponse'];
