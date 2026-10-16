import {
  ApiErrorDetail,
  CampaignCardDto,
  CampaignDetailDto,
  CampaignListResponse,
  CampaignQuery,
  Category,
  CampaignStatus,
  EstimateConfig,
  QuoteResult,
  AuthResponse,
  UserProfile,
  SignUpInput,
  SignInInput,
  FeedbackInput,
} from '@campaigns/shared';

export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly fields?: Record<string, string[]>;

  constructor(statusCode: number, code: string, message: string, fields?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  skipAuth?: boolean;
  retryOnNetworkError?: boolean;
}

export type {
  ApiErrorDetail,
  CampaignCardDto,
  CampaignDetailDto,
  CampaignListResponse,
  CampaignQuery,
  Category,
  CampaignStatus,
  EstimateConfig,
  QuoteResult,
  AuthResponse,
  UserProfile,
  SignUpInput,
  SignInInput,
  FeedbackInput,
};
