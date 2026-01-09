export type CompanyType = 'AGENCY' | 'CLIENT';

export interface CompanyDto {
  id: string;
  name: string;
  type: CompanyType;
  active: boolean;
  segment: string | null;
  contactEmail: string | null;
  site: string | null;
  usefulLinks: string[] | null;
  createdAt: string;
}
