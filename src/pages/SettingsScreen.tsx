import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useAuth } from '../lib/auth-context';
import { useCompany, useUpdateCompany } from '../hooks/useCompany';
import { Building2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/skeleton';

const profileSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
});

const companySchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  website: z.string().optional(),
  taxId: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type CompanyFormData = z.infer<typeof companySchema>;

export function SettingsScreen() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [jobReminders, setJobReminders] = useState(true);
  const [timeEntryApprovals, setTimeEntryApprovals] = useState(true);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: company, isLoading: isLoadingCompany } = useCompany();
  const updateCompany = useUpdateCompany();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      email: user?.email || '',
      phone: '',
    },
  });

  const {
    register: registerCompany,
    handleSubmit: handleSubmitCompany,
    formState: { errors: companyErrors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company?.name || '',
      address: company?.address || '',
      phone: company?.phone || '',
      email: company?.email || '',
      website: company?.website || '',
      taxId: company?.taxId || '',
    },
    values: company ? {
      name: company.name,
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || '',
      website: company.website || '',
      taxId: company.taxId || '',
    } : undefined,
  });

  const onSubmit = async (_data: ProfileFormData) => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);

      // TODO: Implement updateProfile API call with data
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const onCompanySubmit = async (data: CompanyFormData) => {
    try {
      setIsSaving(true);
      await updateCompany.mutateAsync(data);
      toast.success('Company information updated successfully');
    } catch (error) {
      console.error('Failed to update company:', error);
      toast.error('Failed to update company information');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);

        // Update company with new logo
        try {
          await updateCompany.mutateAsync({
            branding: {
              logo: base64String,
            },
          });
          toast.success('Logo uploaded successfully');
        } catch (error) {
          console.error('Failed to upload logo:', error);
          toast.error('Failed to upload logo');
          setLogoPreview(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to process image:', error);
      toast.error('Failed to process image');
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await updateCompany.mutateAsync({
        branding: {
          logo: undefined,
        },
      });
      setLogoPreview(null);
      toast.success('Logo removed successfully');
    } catch (error) {
      console.error('Failed to remove logo:', error);
      toast.error('Failed to remove logo');
    }
  };

  const currentLogo = logoPreview || company?.branding?.logo;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-3xl">
        <div>
          <h1>Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        {/* Success Message */}
        {saveSuccess && (
          <Alert>
            <AlertDescription>Settings saved successfully!</AlertDescription>
          </Alert>
        )}

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName" required>Full Name</Label>
                <Input
                  id="displayName"
                  placeholder="John Doe"
                  error={!!errors.displayName}
                  disabled={isSaving}
                  {...register('displayName')}
                />
                {errors.displayName && (
                  <p className="text-sm text-destructive">{errors.displayName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" required>Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  error={!!errors.email}
                  disabled={true} // Email changes require verification
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Contact support to change your email address
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  error={!!errors.phone}
                  disabled={isSaving}
                  {...register('phone')}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>

              <Button type="submit" disabled={isSaving} loading={isSaving}>
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Company Settings */}
        {user?.role === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>Manage your company details and branding</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCompany ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <form onSubmit={handleSubmitCompany(onCompanySubmit)} className="space-y-4">
                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <Label>Company Logo</Label>
                    <div className="flex items-center gap-4">
                      {currentLogo ? (
                        <div className="relative">
                          <img
                            src={currentLogo}
                            alt="Company logo"
                            className="h-20 w-20 object-contain border rounded-lg p-2"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={handleRemoveLogo}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="h-20 w-20 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                          <Building2 className="h-8 w-8" />
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Logo
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG or GIF (max 2MB)
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Company Name */}
                  <div className="space-y-2">
                    <Label htmlFor="companyName" required>Company Name</Label>
                    <Input
                      id="companyName"
                      placeholder="Sierra Painting"
                      error={!!companyErrors.name}
                      disabled={isSaving}
                      {...registerCompany('name')}
                    />
                    {companyErrors.name && (
                      <p className="text-sm text-destructive">{companyErrors.name.message}</p>
                    )}
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <Label htmlFor="companyAddress">Address</Label>
                    <Input
                      id="companyAddress"
                      placeholder="123 Main St, City, State 12345"
                      error={!!companyErrors.address}
                      disabled={isSaving}
                      {...registerCompany('address')}
                    />
                  </div>

                  {/* Phone & Email */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyPhone">Phone</Label>
                      <Input
                        id="companyPhone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        error={!!companyErrors.phone}
                        disabled={isSaving}
                        {...registerCompany('phone')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyEmail">Email</Label>
                      <Input
                        id="companyEmail"
                        type="email"
                        placeholder="contact@company.com"
                        error={!!companyErrors.email}
                        disabled={isSaving}
                        {...registerCompany('email')}
                      />
                    </div>
                  </div>

                  {/* Website & Tax ID */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyWebsite">Website</Label>
                      <Input
                        id="companyWebsite"
                        placeholder="www.company.com"
                        error={!!companyErrors.website}
                        disabled={isSaving}
                        {...registerCompany('website')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyTaxId">Tax ID / EIN</Label>
                      <Input
                        id="companyTaxId"
                        placeholder="12-3456789"
                        error={!!companyErrors.taxId}
                        disabled={isSaving}
                        {...registerCompany('taxId')}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={isSaving || updateCompany.isPending} loading={isSaving || updateCompany.isPending}>
                    Save Company Information
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive email updates about your account
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Job Reminders</p>
                <p className="text-sm text-muted-foreground">
                  Get notified about upcoming jobs
                </p>
              </div>
              <Switch
                checked={jobReminders}
                onCheckedChange={setJobReminders}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Time Entry Approvals</p>
                <p className="text-sm text-muted-foreground">
                  Notifications for time entry status
                </p>
              </div>
              <Switch
                checked={timeEntryApprovals}
                onCheckedChange={setTimeEntryApprovals}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline">Change Password</Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
