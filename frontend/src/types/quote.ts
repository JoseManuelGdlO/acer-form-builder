export type QuoteStatus = 'draft' | 'registered' | 'expired';
export type QuoteServiceType = 'lodging' | 'package' | 'flight' | 'circuit';
export type QuoteOrigin = 'system' | 'uploaded';

export type QuoteTrack = {
  id?: string;
  label: string;
  date: string;
  createdAt?: string;
};

export type Quote = {
  id: string;
  companyId: string;
  clientId: string;
  clientName: string;
  folio: string;
  title: string;
  type: QuoteServiceType;
  hotel: string;
  advisorName: string;
  advisorUserId: string | null;
  totalAmount: number | null;
  advanceAmount: number | null;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  validUntil: string | null;
  status: QuoteStatus;
  origin: QuoteOrigin;
  notes: string;
  includes: string[];
  excludes: string[];
  terms: string;
  track: QuoteTrack[];
  createdAt?: string;
  updatedAt?: string;
};

export type QuoteTemplate = {
  id?: string;
  company: string;
  contact: string;
  title: string;
  footer: string;
  headerColor: string;
  accentColor: string;
  showLogo: boolean;
  includes: string;
  excludes: string;
  terms: string;
};

export type QuoteWritePayload = {
  clientId: string;
  title?: string;
  type?: QuoteServiceType;
  hotel?: string | null;
  advisorName?: string;
  advisorUserId?: string | null;
  totalAmount?: number | null;
  advanceAmount?: number | null;
  currency?: string;
  startDate?: string | null;
  endDate?: string | null;
  validUntil?: string | null;
  notes?: string | null;
  includes?: string[];
  excludes?: string[];
  terms?: string | null;
};
