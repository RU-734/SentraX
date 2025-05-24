import React, { useState } from 'react';
import AssetForm, { AssetFormData } from '../../components/forms/AssetForm'; // Adjust path as needed
import { useLocation, Link } from 'wouter';

const AddAssetPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: AssetFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Assuming session cookie handles authentication
        },
        body: JSON.stringify(formData),
      });

      if (response.status === 201) {
        setLocation('/assets'); // Redirect to assets list on success
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to add asset. Please try again.');
      }
    } catch (err) {
      console.error('Error adding asset:', err);
      setError('An unexpected error occurred. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Add New Asset</h1>
        <Link href="/assets">
          <a className="text-indigo-600 hover:text-indigo-800 transition duration-150 ease-in-out">&larr; Back to Assets</a>
        </Link>
      </div>
      
      <AssetForm
        onSubmit={handleSubmit}
        isEditing={false}
        isLoading={isLoading}
        error={error}
        submitButtonText="Add Asset"
      />
    </div>
  );
};

export default AddAssetPage;
