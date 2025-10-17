/**
 * Create Crew Template Dialog
 *
 * Dialog for creating reusable crew templates for quick job assignments
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Users, X } from 'lucide-react';
import { useCreateCrewTemplate } from '../../hooks/useScheduler';
import { useEmployees } from '../../hooks/useEmployees';
import { toast } from 'sonner';

interface CreateCrewTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCrewTemplateDialog({
  open,
  onOpenChange,
}: CreateCrewTemplateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [jobType, setJobType] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());

  const { data: employees } = useEmployees();
  const createTemplate = useCreateCrewTemplate();

  const handleToggleEmployee = (employeeId: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (selectedEmployees.size === 0) {
      toast.error('Select at least one employee for the crew');
      return;
    }

    try {
      const employeesList = employees
        ?.filter((emp) => selectedEmployees.has(emp.id))
        .map((emp) => ({
          id: emp.id,
          name: emp.name,
          role: emp.role,
        })) || [];

      await createTemplate.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        jobType: jobType.trim() || undefined,
        employeeIds: Array.from(selectedEmployees),
        employees: employeesList,
      });

      toast.success('Crew template created successfully');
      onOpenChange(false);

      // Reset form
      setName('');
      setDescription('');
      setJobType('');
      setSelectedEmployees(new Set());
    } catch (error) {
      console.error('Failed to create crew template:', error);
      toast.error('Failed to create crew template');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create Crew Template
          </DialogTitle>
          <DialogDescription>
            Save a crew configuration for quick assignment to jobs
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="name" required>
              Template Name
            </Label>
            <Input
              id="name"
              placeholder="e.g., Standard Interior Crew"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Job Type */}
          <div className="space-y-2">
            <Label htmlFor="jobType">Job Type</Label>
            <Input
              id="jobType"
              placeholder="e.g., Interior, Exterior, Commercial"
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
            />
          </div>

          {/* Employee Selection */}
          <div className="space-y-2">
            <Label>Select Crew Members</Label>
            {selectedEmployees.size > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-lg">
                {Array.from(selectedEmployees).map((empId) => {
                  const employee = employees?.find((e) => e.id === empId);
                  if (!employee) return null;
                  return (
                    <Badge key={empId} variant="secondary" className="gap-1">
                      {employee.name}
                      <button
                        type="button"
                        onClick={() => handleToggleEmployee(empId)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
            <div className="border rounded-lg max-h-[300px] overflow-y-auto">
              {employees && employees.length > 0 ? (
                <div className="divide-y">
                  {employees.map((employee) => (
                    <label
                      key={employee.id}
                      className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedEmployees.has(employee.id)}
                        onCheckedChange={() => handleToggleEmployee(employee.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {employee.role}
                        </p>
                      </div>
                      {employee.hourlyRate && (
                        <Badge variant="outline">${employee.hourlyRate}/hr</Badge>
                      )}
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No employees available
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createTemplate.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTemplate.isPending} loading={createTemplate.isPending}>
              Create Template
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
