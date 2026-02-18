export interface IProject {
  userId: string; // Auth0 ID
  name: string;
  description?: string;
  phase1Data?: any; // Ideation results
  phase2Data?: any; // Focus group results  
  simulations: any[]; // References to Simulation documents
  createdAt: Date;
  updatedAt: Date;
}
