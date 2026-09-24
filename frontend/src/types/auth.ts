export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'CONSUMER' | 'FARMER' | 'ADMIN';
  district?: string;
  state?: string;
  taluk?: string;
  pincode?: string;
}