import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ArrowLeft, Scan } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import FileUpload from '@/components/ui/FileUpload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';

const expenseSchema = z.object({
  description: z.string().min(5, 'Description must be at least 5 characters'),
  category_id: z.string().min(1, 'Category is required'),
  amount: z.string().min(1, 'Amount is required'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  expense_date: z.string().min(1, 'Date is required'),
  paid_by: z.string().optional(),
  remarks: z.string().optional(),
});

const CreateExpensePage = () => {
  const navigate = useNavigate();
  const { company } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [categories, setCategories] = useState([]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      currency: company?.currency || 'USD',
      expense_date: new Date().toISOString().split('T')[0],
    },
  });

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/expenses/categories');
        setCategories(response.data.data || []);
      } catch (error) {
        toast.error('Failed to load categories');
      }
    };
    fetchCategories();
  }, []);

  const handleOCRScan = async (file) => {
    if (!file) return;

    setOcrLoading(true);
    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const response = await api.post('/expenses/ocr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const ocrData = response.data.data;
      
      // Auto-fill form fields from OCR
      if (ocrData.amount) setValue('amount', ocrData.amount.toString());
      if (ocrData.date) setValue('expense_date', ocrData.date);
      if (ocrData.merchant) setValue('description', ocrData.merchant);
      if (ocrData.currency) setValue('currency', ocrData.currency);

      toast.success('Receipt scanned successfully! Fields auto-filled.');
    } catch (error) {
      toast.error('OCR failed. Please enter details manually.');
    } finally {
      setOcrLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        formData.append(key, data[key]);
      });
      
      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      const response = await api.post('/expenses', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Expense created successfully!');
      navigate(`/dashboard/expenses/${response.data.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/expenses')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Expenses
        </Button>
        <h1 className="text-3xl font-bold">Create New Expense</h1>
        <p className="text-gray-600 mt-1">Submit a new expense claim for reimbursement</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Receipt Upload with OCR */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Scan className="h-5 w-5 mr-2" />
              Upload Receipt (Optional)
            </CardTitle>
            <CardDescription>
              Upload a receipt and we'll automatically extract the expense details using OCR
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              accept="image/*"
              onFileSelect={(file) => {
                setReceiptFile(file);
                if (file) handleOCRScan(file);
              }}
            />
            {ocrLoading && (
              <div className="mt-4 flex items-center space-x-2 text-sm text-purple-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                <span>Scanning receipt with OCR...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Details */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Details</CardTitle>
            <CardDescription>Provide information about your expense</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Description */}
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="e.g., Client dinner at Olive Garden"
                {...register('description')}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category_id">Category *</Label>
              <Select
                id="category_id"
                {...register('category_id')}
                className={errors.category_id ? 'border-red-500' : ''}
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              {errors.category_id && (
                <p className="text-sm text-red-500 mt-1">{errors.category_id.message}</p>
              )}
            </div>

            {/* Amount and Currency */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('amount')}
                  className={errors.amount ? 'border-red-500' : ''}
                />
                {errors.amount && (
                  <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="currency">Currency *</Label>
                <Select
                  id="currency"
                  {...register('currency')}
                  className={errors.currency ? 'border-red-500' : ''}
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                </Select>
                {errors.currency && (
                  <p className="text-sm text-red-500 mt-1">{errors.currency.message}</p>
                )}
              </div>
            </div>

            {/* Date and Paid By */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expense_date">Expense Date *</Label>
                <Input
                  id="expense_date"
                  type="date"
                  {...register('expense_date')}
                  className={errors.expense_date ? 'border-red-500' : ''}
                />
                {errors.expense_date && (
                  <p className="text-sm text-red-500 mt-1">{errors.expense_date.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="paid_by">Paid By</Label>
                <Select id="paid_by" {...register('paid_by')}>
                  <option value="">Select payment method</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Company Card">Company Card</option>
                </Select>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <Label htmlFor="remarks">Additional Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Any additional notes or context..."
                {...register('remarks')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/expenses')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Expense'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateExpensePage;
