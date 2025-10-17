import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth-context';

/**
 * Company branding settings
 */
export interface CompanyBranding {
  logo?: string; // Base64 image data or URL
  primaryColor?: string;
  secondaryColor?: string;
}

/**
 * Company information
 */
export interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  taxId?: string; // EIN or tax identification number
  branding?: CompanyBranding;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Update company data
 */
export interface UpdateCompanyData {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  taxId?: string;
  branding?: Partial<CompanyBranding>;
}

/**
 * Fetch company information
 */
export function useCompany() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['company', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      const companyRef = doc(db, 'companies', user.companyId);
      const snapshot = await getDoc(companyRef);

      if (!snapshot.exists()) {
        throw new Error('Company not found');
      }

      const data = snapshot.data();

      return {
        id: snapshot.id,
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        website: data.website,
        taxId: data.taxId,
        branding: data.branding,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Company;
    },
    enabled: !!user?.companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes - company data doesn't change often
  });
}

/**
 * Update company information
 */
export function useUpdateCompany() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateCompanyData) => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      const companyRef = doc(db, 'companies', user.companyId);

      // Verify company exists
      const snapshot = await getDoc(companyRef);
      if (!snapshot.exists()) {
        throw new Error('Company not found');
      }

      const updateData: any = {
        updatedAt: serverTimestamp(),
      };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.website !== undefined) updateData.website = data.website;
      if (data.taxId !== undefined) updateData.taxId = data.taxId;

      // Handle branding update
      if (data.branding !== undefined) {
        const currentBranding = snapshot.data().branding || {};
        updateData.branding = {
          ...currentBranding,
          ...data.branding,
        };
      }

      await updateDoc(companyRef, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', user?.companyId] });
    },
  });
}

/**
 * Convert Company to CompanyInfo format for PDF generation
 */
export function companyToCompanyInfo(company: Company | undefined): {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
} {
  if (!company) {
    return {
      name: 'Sierra Painting',
      address: '123 Main St, City, State 12345',
      phone: '(555) 123-4567',
      email: 'contact@sierrapainting.com',
      website: 'www.sierrapainting.com',
    };
  }

  return {
    name: company.name,
    address: company.address,
    phone: company.phone,
    email: company.email,
    website: company.website,
    logo: company.branding?.logo,
  };
}
