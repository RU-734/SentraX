import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext'; // To ensure user is authenticated
import { Link } from 'wouter';
import Button from '../components/ui/Button'; // Re-using the Button component

// Define the Asset interface based on shared/schema.ts
interface Asset {
  id: number;
  name: string;
  type: 'server' | 'workstation' | 'network_device' | 'iot_device' | 'other';
  ipAddress: string;
  macAddress?: string | null;
  operatingSystem?: string | null;
  description?: string | null;
  createdAt: string; // Assuming ISO string format from backend
  updatedAt: string; // Assuming ISO string format from backend
}

const AssetsPage: React.FC = () => {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pageLoading, setPageLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssets = async () => {
      if (!isAuthenticated || authIsLoading) {
        // Don't fetch if user is not authenticated or auth status is still loading
        // ProtectedRoute should handle redirection if not authenticated after loading
        if (!authIsLoading && !isAuthenticated) {
            setPageLoading(false); // Stop loading if auth check complete and not authenticated
        }
        return;
      }

      setPageLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/assets', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Session cookie handles authentication, no explicit token needed here
          },
        });

        if (response.ok) {
          const data: Asset[] = await response.json();
          setAssets(data);
        } else if (response.status === 401 || response.status === 403) {
          setError('You are not authorized to view these assets. Please log in again.');
          // AuthContext and ProtectedRoute should ideally handle redirection
        } 
        else {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to fetch assets.');
        }
      } catch (err) {
        console.error('Error fetching assets:', err);
        setError('An unexpected error occurred while fetching assets.');
      } finally {
        setPageLoading(false);
      }
    };

    // Only attempt to fetch assets if auth loading is complete
    if (!authIsLoading) {
        fetchAssets();
    }
    
  }, [isAuthenticated, authIsLoading]); // Depend on auth status

  if (authIsLoading) {
    return <div className="text-center py-10">Checking authentication status...</div>;
  }

  if (pageLoading) {
    return <div className="text-center py-10">Loading assets...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  }
  
  // This case should be handled by ProtectedRoute, but as a fallback:
  if (!isAuthenticated) {
      return <div className="text-center py-10">Please log in to view assets.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Asset Management</h1>
        <Link href="/assets/new">
          <Button className="bg-green-500 hover:bg-green-700 text-white">
            Add New Asset
          </Button>
        </Link>
      </div>

      {assets.length === 0 ? (
        <div className="text-center py-10 bg-white shadow rounded-lg">
          <p className="text-xl text-gray-600">No assets found.</p>
          <p className="text-gray-500 mt-2">Get started by adding a new asset!</p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operating System</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{asset.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.ipAddress}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.operatingSystem || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/assets/edit/${asset.id}`} className="text-indigo-600 hover:text-indigo-900 mr-3">
                      Edit
                    </Link>
                    {/* Delete button/logic would go here, typically involves a confirmation and API call */}
                    {/* <Button className="text-red-600 hover:text-red-900" onClick={() => handleDelete(asset.id)}>Delete</Button> */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AssetsPage;
