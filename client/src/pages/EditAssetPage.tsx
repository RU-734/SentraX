import React, { useState, useEffect } from 'react';
import AssetForm, { AssetFormData, Asset } from '../../components/forms/AssetForm'; // Adjust path
import { useLocation, Link, useRoute } from 'wouter';

const EditAssetPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute<{ assetId?: string }>("/assets/edit/:assetId");
  const assetId = params?.assetId;

  const [initialData, setInitialData] = useState<Partial<Asset> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // For form submission
  const [pageLoading, setPageLoading] = useState<boolean>(true); // For fetching initial data
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assetId) {
      setError("No asset ID provided in URL.");
      setPageLoading(false);
      return;
    }

    const fetchAsset = async () => {
      setPageLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/assets/${assetId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Auth handled by session cookie
          },
        });

        if (response.ok) {
          const data: Asset = await response.json();
          setInitialData(data);
        } else if (response.status === 404) {
          setError('Asset not found.');
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to fetch asset data.');
        }
      } catch (err) {
        console.error('Error fetching asset data:', err);
        setError('An unexpected error occurred while fetching asset data.');
      } finally {
        setPageLoading(false);
      }
    };

    fetchAsset();
  }, [assetId]);

  const handleSubmit = async (formData: AssetFormData) => {
    if (!assetId) {
      setError("Cannot submit form: Asset ID is missing.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Auth handled by session cookie
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setLocation('/assets'); // Redirect to assets list on success
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update asset. Please try again.');
      }
    } catch (err) {
      console.error('Error updating asset:', err);
      setError('An unexpected error occurred. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        Loading asset data...
      </div>
    );
  }

  if (error && !initialData) { // Show error prominently if data couldn't be fetched
    return (
      <div className="container mx-auto px-4 py-8 text-center text-red-500">
        Error: {error}
        <div className="mt-4">
          <Link href="/assets">
            <a className="text-indigo-600 hover:text-indigo-800">&larr; Back to Assets</a>
          </Link>
        </div>
      </div>
    );
  }
  
  if (!initialData) {
      // This case might be redundant if error above catches it, but good for robustness
      return (
          <div className="container mx-auto px-4 py-8 text-center">
            Asset could not be loaded. It might have been deleted or the ID is incorrect.
            <div className="mt-4">
                <Link href="/assets">
                    <a className="text-indigo-600 hover:text-indigo-800">&larr; Back to Assets</a>
                </Link>
            </div>
          </div>
      );
  }


  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Edit Asset (ID: {assetId})</h1>
        <Link href="/assets">
          <a className="text-indigo-600 hover:text-indigo-800 transition duration-150 ease-in-out">&larr; Back to Assets</a>
        </Link>
      </div>
      
      <AssetForm
        initialData={initialData}
        onSubmit={handleSubmit}
        isEditing={true}
        isLoading={isLoading} // For form submission button state
        error={error} // For displaying submission errors
        submitButtonText="Save Changes"
      />
    </div>
  );
};

export default EditAssetPage;
