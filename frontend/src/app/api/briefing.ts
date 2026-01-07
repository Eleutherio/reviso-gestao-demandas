export interface BriefingDto {
  id: string;
  companyId: string;
  companyName: string;
  createdByUserId: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
}

export interface CreateBriefingDto {
  title: string;
  description?: string | null;
}
