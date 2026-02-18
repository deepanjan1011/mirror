export interface IPersona {
  personaId: number;
  name: string;
  title: string;
  avatar?: string;
  location: {
    city: string;
    country: string;
    coordinates: {
      type: string;
      coordinates: [number, number]; // [lng, lat] for GeoJSON
    };
  };
  demographics: {
    generation: 'Gen Z' | 'Millennial' | 'Gen X' | 'Boomer';
    gender: string;
    ageRange: string;
  };
  professional: {
    seniority: string;
    primaryIndustry: string;
    secondaryIndustry?: string;
    companySize: string;
    yearsExperience: number;
  };
  psychographics: {
    techAdoption: number; // 1-10
    riskTolerance: number; // 1-10
    priceSensitivity: number; // 1-10
    influenceScore: number; // 1-10
    brandLoyalty: number; // 1-10
  };
  interests: string[];
  personality: {
    openness: number; // 0-1
    conscientiousness: number; // 0-1
    extraversion: number; // 0-1
    agreeableness: number; // 0-1
    neuroticism: number; // 0-1
  };
  dataSources: string[];
}