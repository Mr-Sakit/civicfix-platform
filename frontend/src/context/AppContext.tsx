import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Report {
  id: string;
  title: string;
  description: string;
  location: string;
  category: 'ROADS' | 'UTILITIES' | 'SANITATION' | 'GRAFFITI';
  priority: 'High' | 'Medium' | 'Low';
  status: 'Reported' | 'In Progress' | 'Resolved';
  date: string;
  image: string;
  assignedTo: string;
  reporter: string;
  lat: number;
  lng: number;
  isUrgent: boolean;
  notes?: string;
}

interface AppContextType {
  reports: Report[];
  userRole: 'citizen' | 'admin';
  activeTab: string;
  selectedReportId: string;
  addReport: (report: Omit<Report, 'id' | 'date'>) => void;
  updateReport: (id: string, updates: Partial<Report>) => void;
  setUserRole: (role: 'citizen' | 'admin') => void;
  setActiveTab: (tab: string) => void;
  setSelectedReportId: (id: string) => void;
  wizardStep: number;
  setWizardStep: (step: number) => void;
  wizardPhotos: string[];
  addWizardPhoto: (photoUrl: string) => void;
  removeWizardPhoto: (index: number) => void;
  clearWizard: () => void;
  uploadProgress: number;
  setUploadProgress: (progress: number) => void;
}

const initialReports: Report[] = [
  {
    id: '#FIX-8842',
    title: 'Severe Pothole on Oak St.',
    description: 'Large pothole developed after the recent storm. Causing significant traffic slowing and safety concerns for cyclists.',
    location: 'Oakwood Drive & 5th Ave',
    category: 'ROADS',
    priority: 'High',
    status: 'In Progress',
    date: '2 mins ago',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDdrwJJYezoqJAdSdBCTmBTgZW-fyEvwRGsMonGQtte74syuSuT6KYXjbTC5Nidw3XKWrlYLvPEB3hKTs2vUr8v38Jzt43VrJI9rQ7d420XN6Qv-7_PrS4g_4OX-6I6bVZFk39dbLl8f9-4xd37hFyW2WObOGRD_Y8ULbGJGrQqxwX4mTxLv37lWmIELj_PEeKNvqgL9fTSnTpCrV0Xt_5L_wUEcZKp_zFT0sfNStQduCoRrcHL0RXHSbclXW5gMarY0gH09a8H6tM',
    assignedTo: 'Roads Dept - North',
    reporter: 'Sarah J.',
    lat: 40.7128,
    lng: -74.0060,
    isUrgent: true,
    notes: 'Dispatch road crew immediately.'
  },
  {
    id: '#FIX-8841',
    title: 'Flickering Street Lamp',
    description: 'Main square lighting is non-functional. The streetlight outside unit 402 has been flickering all night, causing visibility issues.',
    location: 'North Park Plaza',
    category: 'UTILITIES',
    priority: 'Medium',
    status: 'Reported',
    date: '14 mins ago',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC93sPXnSFd1a60sJPHyaKrEbKrhc1KIW8-1Ywoc4UBQ5jh9yCJklriOW55nILlgVsPONLa6Hp3wup1hd4LqF8mz7AmPC2M2gHfw5XusUQyAn6EAWr0kCkD5QtWbHn3cwi_F23Ip3ogc4Hd_HnTECOXOOCrJvoyxWkoDAq5DvAQidlRsqzmaAk_Osvf-rfQriNiMhqow80bCyxdsQFg1DCSmwSsqmEOVLryaf6mqqszRXhX25gG3OhgMU4IGkQ_ZgP8yOf6aNGnLh4',
    assignedTo: 'Unassigned',
    reporter: 'Anonymous',
    lat: 40.7198,
    lng: -74.0010,
    isUrgent: false
  },
  {
    id: '#FIX-8839',
    title: 'Sanitation Overflow - Central Park',
    description: 'A wide municipal trash bin is overflowing on the busy sidewalk. Various bags and loose paper are scattered around the base.',
    location: '5th and Broadway',
    category: 'SANITATION',
    priority: 'Low',
    status: 'Reported',
    date: '42 mins ago',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAvk4XuEBDm5_SLWxOYLp9ZTgVawV3ePHBv2IbHir3e6Lou-dFt--pg-J4iRKW2rjFj4IlLwZERy24Q5usw6IPKaRQgraM2pD9Z4_p35kOGKzf43dvAAWqFa_P6kUpSb3BRv_SRa6NnYjLM_em6-uwEUsUvd5uyisiqRN14N_DRuBYJaa0sPAfxA2xFpivXujbytEpdjYt6PKBvgsWtmh3tI5UMMrVBbyAE32SnTopvXvn6MTzsmskqAz7-2xs1x_8FkVcSeD0t8y4',
    assignedTo: 'Unassigned',
    reporter: 'Officer Chen',
    lat: 40.7158,
    lng: -74.0090,
    isUrgent: false
  },
  {
    id: '#FIX-8835',
    title: 'Park Maintenance',
    description: 'Broken benches replaced and debris cleared. The central area is now fully accessible and safe for public use.',
    location: 'Sunset Memorial Park',
    category: 'SANITATION',
    priority: 'Low',
    status: 'Resolved',
    date: 'Yesterday',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAw-6CyY1F4AhrJyjlb2RTnt04xXpelVd6fux3EEJTlg76lB6BoCAOHwaDMdYUSN5RA1Ifd-cHrj7zLWTFJG4i3IAWekz4JRdGMLth-fyGRp3JWTIRGMT3saWnfwOeOOq8CntW3HrxLcGfSM-orKWKnCP9Asl8mvrId64swLy6gDeFIt53J-GONfd-u-OAtlMFO3fkYVK_MyYzJHOT_iVrxU1RzY4Y1TFFVrO5G1kEPJq2HalatVN70j7IePbB0RAu1lbesAbgvOj8',
    assignedTo: 'Sanitation Crew 2',
    reporter: 'Sarah J.',
    lat: 40.7258,
    lng: -73.9980,
    isUrgent: false
  },
  {
    id: '#FIX-8834',
    title: 'Hydrant Leakage',
    description: 'Constant leak detected at the base of hydrant #442. Reported as a significant water waste and potential freeze hazard.',
    location: 'Beacon Hill - East Wing',
    category: 'UTILITIES',
    priority: 'High',
    status: 'Reported',
    date: '5h ago',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAzmwKJY65gpFp7cHEFVKryHwq1l1hcbo8hOrBJ4M28m5yXYIOX6HDwTMPX5U4TXmWShXxO3gsZk-L-nETpbcn17ZWdpcesqVB4zSg358v8DRPWfrbrbUGXkKMdb5xYqGel8hSobEjf2UYmx_pyU4MwOzKLkeNLroUTYxOpPdm9AbfrfwfTybtBwaUpuP6yk08-Umohe-x1ad-t215eVIlAc_EOGSlJLSgZHa1uuV8kZp6JOgJX9AwKh-g-KlsIwf6lU1uKqSTCGrc',
    assignedTo: 'Unassigned',
    reporter: 'Citizen #0912',
    lat: 40.7100,
    lng: -74.0040,
    isUrgent: true
  }
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reports, setReports] = useState<Report[]>(() => {
    const saved = localStorage.getItem('civicfix_reports');
    return saved ? JSON.parse(saved) : initialReports;
  });
  const [userRole, setUserRoleState] = useState<'citizen' | 'admin'>('citizen');
  const [activeTab, setActiveTabState] = useState<string>('home');
  const [selectedReportId, setSelectedReportId] = useState<string>('#FIX-8842');

  // Wizard state for reporting an issue
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardPhotos, setWizardPhotos] = useState<string[]>([
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBxBb_jQ959K88yf-u9hx6vtUTbmwIREDZ9mn-7nFyoc1WqalwcYrbgnQy3CCsGRlooCaTylR4u0Byp3pdLsc89TawS6HBKkjFL_n9WZLDWOT8TuVNZn0nVxhNnUyaoY85Mg7WJP3ZDhsHmvk9TwRhY8UmT4bO1_nid8f1cQfgfXAiurnjsXF_RPoacbc2uXF0a2E_D-kL4qJx7f-fyXB3G9hi7UFe3E1lRQHur1P82OHGUcDCFHES0VSMhxoAw5I282FbgxuYwEL4',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAz3qsG0UjGEIpAmpdTGT3q_75mAMUGyEaRNFjrwQZVs4NgqmaCnBUUXpBfYdiZNurQDe5p2E6PqFdiEBOuS2vf1g4bK8d70nsP9gy4zqmatZB5NJvLiXTa8rYN6UGks7KQFV4jQJ-Cw0zRLwIQkNI0Gy2vWAvTw59lW_taSS23WMduwsnjGjf4-aspbEDxGdly2Yo1TBGzSniBTHgJ8LIJyY7QhDcflPhDPVmlRIhowoKuy6t4Epje6nTglkzkdPzzidDX3ycOuCU'
  ]);
  const [uploadProgress, setUploadProgress] = useState<number>(45);

  useEffect(() => {
    localStorage.setItem('civicfix_reports', JSON.stringify(reports));
  }, [reports]);

  const addReport = (reportData: Omit<Report, 'id' | 'date'>) => {
    const nextId = `#FIX-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReport: Report = {
      ...reportData,
      id: nextId,
      date: 'Just now'
    };
    setReports((prev) => [newReport, ...prev]);
    setSelectedReportId(nextId);
  };

  const updateReport = (id: string, updates: Partial<Report>) => {
    setReports((prev) =>
      prev.map((report) => (report.id === id ? { ...report, ...updates } : report))
    );
  };

  const setUserRole = (role: 'citizen' | 'admin') => {
    setUserRoleState(role);
    setActiveTabState(role === 'citizen' ? 'home' : 'dashboard');
  };

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
  };

  const addWizardPhoto = (photoUrl: string) => {
    setWizardPhotos((prev) => [...prev, photoUrl]);
  };

  const removeWizardPhoto = (index: number) => {
    setWizardPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const clearWizard = () => {
    setWizardStep(1);
    setWizardPhotos([]);
    setUploadProgress(0);
  };

  return (
    <AppContext.Provider
      value={{
        reports,
        userRole,
        activeTab,
        selectedReportId,
        addReport,
        updateReport,
        setUserRole,
        setActiveTab,
        setSelectedReportId,
        wizardStep,
        setWizardStep,
        wizardPhotos,
        addWizardPhoto,
        removeWizardPhoto,
        clearWizard,
        uploadProgress,
        setUploadProgress
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
