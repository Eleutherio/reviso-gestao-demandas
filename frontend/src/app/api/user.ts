export type UserRole = 'AGENCY_ADMIN' | 'AGENCY_USER' | 'CLIENT_USER';

export interface UserDto {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  active: boolean;
  createdAt: string;
}
