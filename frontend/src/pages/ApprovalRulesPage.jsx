import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Badge from '@/components/ui/Badge';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

const ApprovalRulesPage = () => {
  const [rules, setRules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    useApproverSequence: true,
    minApprovalPercentage: '',
    hasSpecificApprover: false,
    specificApproverId: '',
    approvers: [],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRules();
    fetchUsers();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await api.get('/approvals/rules');
      setRules(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch approval rules');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (ruleId) => {
    try {
      await api.patch(`/approvals/rules/${ruleId}/default`);
      toast.success('Default rule updated');
      fetchRules();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to set default rule');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.data.filter(u => u.role === 'manager' || u.role === 'admin'));
    } catch (error) {
      console.error('Failed to fetch users');
    }
  };

  const handleOpenDialog = (rule = null) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name,
        description: rule.description || '',
        useApproverSequence: rule.use_approver_sequence,
        minApprovalPercentage: rule.min_approval_percentage || '',
        hasSpecificApprover: rule.has_specific_approver,
        specificApproverId: rule.specific_approver_id || '',
        approvers: rule.approvers || [],
      });
    } else {
      setEditingRule(null);
      setFormData({
        name: '',
        description: '',
        useApproverSequence: true,
        minApprovalPercentage: '',
        hasSpecificApprover: false,
        specificApproverId: '',
        approvers: [],
      });
    }
    setDialogOpen(true);
  };

  const addApprover = () => {
    setFormData({
      ...formData,
      approvers: [...formData.approvers, { userId: '', sequenceOrder: formData.approvers.length + 1, isRequired: false }],
    });
  };

  const removeApprover = (index) => {
    setFormData({
      ...formData,
      approvers: formData.approvers.filter((_, i) => i !== index),
    });
  };

  const updateApprover = (index, field, value) => {
    const updated = [...formData.approvers];
    updated[index][field] = value;
    setFormData({ ...formData, approvers: updated });
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Please enter a rule name');
      return;
    }

    setSubmitting(true);
    try {
      // Map to backend snake_case payload
      const payload = {
        name: formData.name,
        description: formData.description || '',
        use_approver_sequence: !!formData.useApproverSequence && !formData.hasSpecificApprover,
        has_specific_approver: !!formData.hasSpecificApprover,
        specific_approver_id: formData.hasSpecificApprover && formData.specificApproverId ? formData.specificApproverId : null,
        is_hybrid: false,
      };
      // Only include min_approval_percentage for percentage-based
      if (!formData.useApproverSequence && !formData.hasSpecificApprover && formData.minApprovalPercentage) {
        payload.min_approval_percentage = parseFloat(formData.minApprovalPercentage);
      }
      // Approvers mapping
      const mappedApprovers = (!formData.hasSpecificApprover ? formData.approvers : [])
        .filter(a => a.userId)
        .map((a, idx) => ({
          user_id: a.userId,
          sequence_order: formData.useApproverSequence ? (a.sequenceOrder || idx + 1) : (idx + 1),
          is_required: !!a.isRequired,
        }));
      if (mappedApprovers.length > 0) {
        payload.approvers = mappedApprovers;
      }

      if (editingRule) {
        await api.patch(`/approvals/rules/${editingRule.id}`, payload);
        toast.success('Approval rule updated successfully');
      } else {
        await api.post('/approvals/rules', payload);
        toast.success('Approval rule created successfully');
      }
      setDialogOpen(false);
      fetchRules();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this approval rule?')) return;

    try {
      await api.delete(`/approvals/rules/${ruleId}`);
      toast.success('Approval rule deleted successfully');
      fetchRules();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete rule');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Approval Rules</h1>
          <p className="text-gray-600 mt-1">Configure multi-level approval workflows</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Create Rule
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{rules.length}</div>
              <p className="text-sm text-gray-600 mt-1">Total Rules</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {rules.filter(r => r.is_active).length}
              </div>
              <p className="text-sm text-gray-600 mt-1">Active Rules</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{users.length}</div>
              <p className="text-sm text-gray-600 mt-1">Approvers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Approval Rules</CardTitle>
          <CardDescription>Manage your expense approval workflows</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-gray-500">No approval rules configured</p>
              <Button onClick={() => handleOpenDialog()} className="mt-4" size="sm">
                Create First Rule
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Approvers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{rule.name}</p>
                        {rule.description && (
                          <p className="text-sm text-gray-500">{rule.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {rule.use_approver_sequence ? 'Sequential' : 
                         rule.has_specific_approver ? 'Specific Approver' : 
                         'Percentage'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {rule.use_approver_sequence && (
                        <span>{rule.approvers?.length || 0} approvers</span>
                      )}
                      {!rule.use_approver_sequence && rule.min_approval_percentage && (
                        <span>{rule.min_approval_percentage}% required</span>
                      )}
                      {rule.has_specific_approver && (
                        <span>Specific approver set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.is_active ? 'default' : 'destructive'}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {rule.is_default ? (
                        <Badge variant="secondary">Default</Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end space-x-2">
                        {!rule.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(rule.id)}
                            title="Set as Default"
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(rule.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Approval Rule' : 'Create Approval Rule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label htmlFor="name">Rule Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Standard Approval Flow"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this approval rule"
              />
            </div>

            <div className="space-y-2">
              <Label>Approval Type</Label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={formData.useApproverSequence && !formData.hasSpecificApprover}
                    onChange={() => setFormData({ ...formData, useApproverSequence: true, hasSpecificApprover: false })}
                  />
                  <span>Sequential Approval</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={!formData.useApproverSequence && !formData.hasSpecificApprover}
                    onChange={() => setFormData({ ...formData, useApproverSequence: false, hasSpecificApprover: false })}
                  />
                  <span>Percentage-Based Approval</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={formData.hasSpecificApprover}
                    onChange={() => setFormData({ ...formData, hasSpecificApprover: true, useApproverSequence: false })}
                  />
                  <span>Specific Approver</span>
                </label>
              </div>
            </div>

            {!formData.hasSpecificApprover && !formData.useApproverSequence && (
              <div>
                <Label htmlFor="percentage">Minimum Approval Percentage</Label>
                <Input
                  id="percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.minApprovalPercentage}
                  onChange={(e) => setFormData({ ...formData, minApprovalPercentage: e.target.value })}
                  placeholder="e.g., 60"
                />
              </div>
            )}

            {formData.hasSpecificApprover && (
              <div>
                <Label htmlFor="specificApprover">Specific Approver</Label>
                <Select
                  id="specificApprover"
                  value={formData.specificApproverId}
                  onChange={(e) => setFormData({ ...formData, specificApproverId: e.target.value })}
                >
                  <option value="">Select Approver</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {!formData.hasSpecificApprover && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Approvers</Label>
                  <Button type="button" size="sm" onClick={addApprover}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Approver
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.approvers.map((approver, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Select
                        value={approver.userId}
                        onChange={(e) => updateApprover(index, 'userId', e.target.value)}
                        className="flex-1"
                      >
                        <option value="">Select User</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </Select>
                      {formData.useApproverSequence && (
                        <label className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            checked={approver.isRequired}
                            onChange={(e) => updateApprover(index, 'isRequired', e.target.checked)}
                          />
                          <span className="text-sm">Required</span>
                        </label>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeApprover(index)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : editingRule ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalRulesPage;
