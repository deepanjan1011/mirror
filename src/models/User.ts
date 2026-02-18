export interface IUser {
  auth0Id: string;
  email: string;
  name?: string;
  picture?: string;
  credits: number;
  subscription: 'free' | 'pro' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
}