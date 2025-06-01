import React, { useState, useEffect, FormEvent } from 'react';
import Button from '../ui/Button'; // Assuming Button.tsx is in client/src/components/ui/

// Define the Asset interface (can be moved to a shared types file later)
export interface Asset {
  id: number;
  name: string;
  type: 'server' | 'workstation' | 'network_device' | 'iot_device' | 'other';
  ipAddress: string;
  macAddress?: string | null;
  operatingSystem?: string | null;
  description?: string | null;
  createdAt?: string; // Optional in form, set by backend
  updatedAt?: string; // Optional in form, set by backend
}

// FormData will not include id, createdAt, updatedAt as these are managed by backend/DB
export type AssetFormData = Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>;

interface AssetFormProps {
  initialData?: Partial<Asset>; // For editing existing asset
  onSubmit: (formData: AssetFormData) => Promise<void>; // Function to handle form submission
  isEditing: boolean; // To differentiate between Add and Edit modes for UI elements like button text
  isLoading?: boolean; // To disable button during submission
  error?: string | null; // To display submission errors
  submitButtonText?: string; // Custom text for submit button
}

const assetTypeEnumValues: Asset['type'][] = [
  'server',
  'workstation',
  'network_device',
  'iot_device',
  'other',
];

const AssetForm: React.FC<AssetFormProps> = ({
  initialData,
  onSubmit,
  isEditing,
  isLoading = false,
  error = null,
  submitButtonText
}) => {
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<Asset['type']>(assetTypeEnumValues[0]); // Default to first type
  const [ipAddress, setIpAddress] = useState<string>('');
  const [macAddress, setMacAddress] = useState<string>('');
  const [operatingSystem, setOperatingSystem] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setType(initialData.type || assetTypeEnumValues[0]);
      setIpAddress(initialData.ipAddress || '');
      setMacAddress(initialData.macAddress || '');
      setOperatingSystem(initialData.operatingSystem || '');
      setDescription(initialData.description || '');
    }
  }, [initialData]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const formData: AssetFormData = {
      name,
      type,
      ipAddress,
      macAddress: macAddress || null, // Ensure empty strings become null if backend expects null
      operatingSystem: operatingSystem || null,
      description: description || null,
    };
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-white shadow-md rounded-lg">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">Type <span className="text-red-500">*</span></label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as Asset['type'])}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          {assetTypeEnumValues.map((enumValue) => (
            <option key={enumValue} value={enumValue}>
              {enumValue.charAt(0).toUpperCase() + enumValue.slice(1).replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="ipAddress" className="block text-sm font-medium text-gray-700">IP Address <span className="text-red-500">*</span></label>
        <input
          id="ipAddress"
          type="text"
          value={ipAddress}
          onChange={(e) => setIpAddress(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="e.g., 192.168.1.100"
        />
      </div>

      <div>
        <label htmlFor="macAddress" className="block text-sm font-medium text-gray-700">MAC Address</label>
        <input
          id="macAddress"
          type="text"
          value={macAddress}
          onChange={(e) => setMacAddress(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="e.g., 00:1A:2B:3C:4D:5E"
        />
      </div>

      <div>
        <label htmlFor="operatingSystem" className="block text-sm font-medium text-gray-700">Operating System</label>
        <input
          id="operatingSystem"
          type="text"
          value={operatingSystem}
          onChange={(e) => setOperatingSystem(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="e.g., Windows Server 2022, Ubuntu 20.04 LTS"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Any additional details about the asset"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}

      <div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading
            ? (isEditing ? 'Saving...' : 'Adding...')
            : (submitButtonText || (isEditing ? 'Save Changes' : 'Add Asset'))}
        </Button>
      </div>
    </form>
  );
};

export default AssetForm;
