import React, { useState, useEffect, Fragment } from 'react'; // Added Fragment
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'wouter';
import Button from '../components/ui/Button';

// Asset interface
interface Asset {
  id: number;
  name: string;
  type: 'server' | 'workstation' | 'network_device' | 'iot_device' | 'other';
  ipAddress: string;
  macAddress?: string | null;
  operatingSystem?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Interface for vulnerabilities linked to an asset (from backend response)
interface LinkedVulnerability {
  joinId: number;
  assetId: number;
  status: string;
  details?: string | null;
  remediationNotes?: string | null;
  lastSeenAt: string;
  updatedAt: string; // from the join table
  vulnerability: { // Nested vulnerability details
    id: number;
    name: string;
    description: string;
    severity: string;
    cvssScore?: string | null;
    references?: string[] | null;
    createdAt: string; // from the vulnerabilities table
    updatedAt: string; // from the vulnerabilities table
  } | null;
}

// Interface for the global list of vulnerabilities (for the dropdown)
interface GlobalVulnerability {
  id: number;
  name: string;
  severity: string;
  // Add other fields if needed for display in dropdown, e.g. description
}


const AssetsPage: React.FC = () => {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pageLoading, setPageLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for managing expanded rows and their vulnerability data
  const [expandedAssetId, setExpandedAssetId] = useState<number | null>(null);
  const [assetVulnerabilities, setAssetVulnerabilities] = useState<{ [key: number]: LinkedVulnerability[] }>({});
  const [vulnerabilityLoading, setVulnerabilityLoading] = useState<{ [key: number]: boolean }>({}); // Loading for specific asset's vulns
  const [vulnerabilityError, setVulnerabilityError] = useState<{ [key: number]: string | null }>({}); // Error for specific asset's vulns

  // State for global list of all vulnerabilities (for dropdown)
  const [allVulnerabilities, setAllVulnerabilities] = useState<GlobalVulnerability[]>([]);
  const [allVulnerabilitiesLoading, setAllVulnerabilitiesLoading] = useState<boolean>(true);
  const [allVulnerabilitiesError, setAllVulnerabilitiesError] = useState<string | null>(null);

  // State for linking vulnerabilities
  const [selectedVulnerabilityId, setSelectedVulnerabilityId] = useState<{ [key: number]: string }>({});
  const [linkVulnerabilityLoading, setLinkVulnerabilityLoading] = useState<{ [key: number]: boolean }>({});
  const [linkVulnerabilityError, setLinkVulnerabilityError] = useState<{ [key: number]: string | null }>({});

  // State for updating linked vulnerability status
  const [updateStatusLoading, setUpdateStatusLoading] = useState<{ [key: number]: boolean }>({});
  const [updateStatusError, setUpdateStatusError] = useState<{ [key: number]: string | null }>({});

  // State for simulated scan action
  const [scanLoading, setScanLoading] = useState<{ [key: number]: boolean }>({});
  const [scanError, setScanError] = useState<{ [key: number]: string | null }>({});
  const [scanSuccessMessage, setScanSuccessMessage] = useState<{ [key: number]: string | null }>({});

const vulnerabilityStatusEnumValues: LinkedVulnerability['status'][] = [
  'open',
  'remediated',
  'ignored',
  'pending_verification',
];


  const fetchVulnerabilitiesForAsset = async (assetId: number) => {
    setVulnerabilityLoading(prev => ({ ...prev, [assetId]: true }));
    setVulnerabilityError(prev => ({ ...prev, [assetId]: null }));

    try {
      const response = await fetch(`/api/assets/${assetId}/vulnerabilities`);
      if (response.ok) {
        const data: LinkedVulnerability[] = await response.json();
        setAssetVulnerabilities(prev => ({ ...prev, [assetId]: data }));
      } else {
        const errorData = await response.json();
        setVulnerabilityError(prev => ({ ...prev, [assetId]: errorData.message || `Failed to fetch vulnerabilities for asset ${assetId}` }));
        setAssetVulnerabilities(prev => ({ ...prev, [assetId]: [] })); // Clear or keep stale data based on preference
      }
    } catch (err) {
      console.error(`Error fetching vulnerabilities for asset ${assetId}:`, err);
      setVulnerabilityError(prev => ({ ...prev, [assetId]: `An unexpected error occurred for asset ${assetId}` }));
    } finally {
      setVulnerabilityLoading(prev => ({ ...prev, [assetId]: false }));
    }
  };

  const handleToggleVulnerabilities = (assetId: number) => {
    const isCurrentlyExpanded = expandedAssetId === assetId;
    setExpandedAssetId(isCurrentlyExpanded ? null : assetId);

    if (!isCurrentlyExpanded) {
      // Fetch vulnerabilities for this asset if not already fetched/loading
      if (!assetVulnerabilities[assetId] && !vulnerabilityLoading[assetId]) {
        fetchVulnerabilitiesForAsset(assetId);
      }
      // Fetch all vulnerabilities if not already done (e.g. on first expand)
      if (allVulnerabilities.length === 0 && allVulnerabilitiesLoading) {
        fetchAllVulnerabilities();
      }
    }
  };

  const fetchAllVulnerabilities = async () => {
    setAllVulnerabilitiesLoading(true);
    setAllVulnerabilitiesError(null);
    try {
      const response = await fetch('/api/vulnerabilities');
      if (response.ok) {
        const data: GlobalVulnerability[] = await response.json();
        setAllVulnerabilities(data);
      } else {
        const errorData = await response.json();
        setAllVulnerabilitiesError(errorData.message || 'Failed to fetch list of all vulnerabilities.');
      }
    } catch (err) {
      console.error('Error fetching all vulnerabilities:', err);
      setAllVulnerabilitiesError('An unexpected error occurred while fetching all vulnerabilities.');
    } finally {
      setAllVulnerabilitiesLoading(false);
    }
  };

  const handleLinkVulnerability = async (assetId: number) => {
    const vulnIdToLink = selectedVulnerabilityId[assetId];
    if (!vulnIdToLink) {
      setLinkVulnerabilityError(prev => ({ ...prev, [assetId]: 'Please select a vulnerability to link.' }));
      return;
    }

    setLinkVulnerabilityLoading(prev => ({ ...prev, [assetId]: true }));
    setLinkVulnerabilityError(prev => ({ ...prev, [assetId]: null }));

    try {
      const response = await fetch(`/api/assets/${assetId}/vulnerabilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vulnerabilityId: parseInt(vulnIdToLink, 10) }), // Default status will be 'open' by backend
      });

      const data = await response.json();
      if (response.status === 201) {
        setSelectedVulnerabilityId(prev => ({ ...prev, [assetId]: '' })); // Clear selection
        fetchVulnerabilitiesForAsset(assetId); // Refresh the list for this asset
      } else {
        setLinkVulnerabilityError(prev => ({ ...prev, [assetId]: data.message || 'Failed to link vulnerability.' }));
      }
    } catch (err) {
      console.error(`Error linking vulnerability for asset ${assetId}:`, err);
      setLinkVulnerabilityError(prev => ({ ...prev, [assetId]: 'An unexpected error occurred.' }));
    } finally {
      setLinkVulnerabilityLoading(prev => ({ ...prev, [assetId]: false }));
    }
  };

  const handleUpdateStatus = async (assetId: number, joinId: number, newStatus: string) => {
    setUpdateStatusLoading(prev => ({ ...prev, [joinId]: true }));
    setUpdateStatusError(prev => ({ ...prev, [joinId]: null }));

    try {
      const response = await fetch(`/api/assets/${assetId}/vulnerabilities/${joinId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (response.ok) {
        // Refresh vulnerabilities for the parent asset to show updated status
        fetchVulnerabilitiesForAsset(assetId);
      } else {
        setUpdateStatusError(prev => ({ ...prev, [joinId]: data.message || 'Failed to update status.' }));
      }
    } catch (err) {
      console.error(`Error updating status for link ${joinId}:`, err);
      setUpdateStatusError(prev => ({ ...prev, [joinId]: 'An unexpected error occurred.' }));
    } finally {
      setUpdateStatusLoading(prev => ({ ...prev, [joinId]: false }));
    }
  };

  const handleSimulateScan = async (assetId: number) => {
    setScanLoading(prev => ({ ...prev, [assetId]: true }));
    setScanError(prev => ({ ...prev, [assetId]: null }));
    setScanSuccessMessage(prev => ({ ...prev, [assetId]: null }));

    try {
      const response = await fetch(`/api/assets/${assetId}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) {
        setScanSuccessMessage(prev => ({
          ...prev,
          [assetId]: `${data.message} Processed: ${data.vulnerabilitiesProcessed}, New: ${data.newlyLinked}, Updated: ${data.updatedLinks}`
        }));
        fetchVulnerabilitiesForAsset(assetId); // Refresh the list
      } else {
        setScanError(prev => ({ ...prev, [assetId]: data.message || 'Failed to simulate scan.' }));
      }
    } catch (err) {
      console.error(`Error simulating scan for asset ${assetId}:`, err);
      setScanError(prev => ({ ...prev, [assetId]: 'An unexpected error occurred during scan.' }));
    } finally {
      setScanLoading(prev => ({ ...prev, [assetId]: false }));
    }
  };


  useEffect(() => {
    const fetchAssets = async () => {
      if (!isAuthenticated || authIsLoading) {
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
        // Fetch all vulnerabilities once when the component is ready (and user authenticated)
        // Alternatively, fetch on first expand action as implemented in handleToggleVulnerabilities
        if (isAuthenticated && allVulnerabilities.length === 0 && allVulnerabilitiesLoading) {
            fetchAllVulnerabilities();
        }
    }

  }, [isAuthenticated, authIsLoading]); // Added allVulnerabilities and allVulnerabilitiesLoading to dependencies if fetched here

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
                <Fragment key={asset.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{asset.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.ipAddress}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.operatingSystem || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Button
                        onClick={() => handleToggleVulnerabilities(asset.id)}
                        className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        {expandedAssetId === asset.id ? 'Hide' : 'Show'} Vulns
                      </Button>
                      <Link href={`/assets/edit/${asset.id}`} className="text-indigo-600 hover:text-indigo-900">
                        Edit
                      </Link>
                    </td>
                  </tr>
                  {expandedAssetId === asset.id && (
                    <tr>
                      <td colSpan={5} className="p-0"> {/* Remove padding from td to allow inner div to control it */}
                        <div className="px-4 py-4 bg-gray-100">
                          {vulnerabilityLoading[asset.id] && <p className="text-sm text-gray-600">Loading vulnerabilities...</p>}
                          {vulnerabilityError[asset.id] && <p className="text-sm text-red-500">Error: {vulnerabilityError[asset.id]}</p>}
                          {!vulnerabilityLoading[asset.id] && !vulnerabilityError[asset.id] && assetVulnerabilities[asset.id] && (
                            assetVulnerabilities[asset.id].length > 0 ? (
                              <div className="overflow-x-auto">
                                <h4 className="text-md font-semibold text-gray-700 mb-2">Vulnerabilities for {asset.name}:</h4>
                                <table className="min-w-full divide-y divide-gray-300 bg-white shadow-sm rounded-md">
                                  <thead className="bg-gray-200">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Name</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Severity</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Last Seen</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {assetVulnerabilities[asset.id].map(link => (
                                      <Fragment key={link.joinId}>
                                        <tr className="hover:bg-gray-50">
                                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">{link.vulnerability?.name || 'N/A'}</td>
                                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{link.vulnerability?.severity || 'N/A'}</td>
                                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                                            <select
                                              value={link.status}
                                              onChange={(e) => handleUpdateStatus(asset.id, link.joinId, e.target.value)}
                                              disabled={updateStatusLoading[link.joinId]}
                                              className={`block w-full p-1 border rounded-md shadow-sm text-xs ${updateStatusLoading[link.joinId] ? 'bg-gray-200 cursor-not-allowed' : 'border-gray-300 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'}`}
                                            >
                                              {vulnerabilityStatusEnumValues.map(statusValue => (
                                                <option key={statusValue} value={statusValue}>
                                                  {statusValue.charAt(0).toUpperCase() + statusValue.slice(1).replace('_', ' ')}
                                                </option>
                                              ))}
                                            </select>
                                          </td>
                                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{new Date(link.lastSeenAt).toLocaleDateString()}</td>
                                        </tr>
                                        {updateStatusError[link.joinId] && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-1 text-xs text-red-600 text-center">
                                                    Error updating status: {updateStatusError[link.joinId]}
                                                </td>
                                            </tr>
                                        )}
                                      </Fragment>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600">No vulnerabilities found for this asset.</p>
                            )
                          )}

                          {/* Section to Link New Vulnerability */}
                          <div className="mt-6 pt-4 border-t border-gray-300">
                            <h5 className="text-md font-semibold text-gray-700 mb-3">Link Existing Vulnerability</h5>
                            {allVulnerabilitiesLoading && <p className="text-sm">Loading available vulnerabilities...</p>}
                            {allVulnerabilitiesError && <p className="text-sm text-red-500">Error: {allVulnerabilitiesError}</p>}
                            {!allVulnerabilitiesLoading && !allVulnerabilitiesError && (
                              <div className="flex items-center space-x-2">
                                <select
                                  value={selectedVulnerabilityId[asset.id] || ''}
                                  onChange={(e) => setSelectedVulnerabilityId(prev => ({ ...prev, [asset.id]: e.target.value }))}
                                  className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                  <option value="" disabled>Select a vulnerability</option>
                                  {allVulnerabilities.map(vuln => (
                                    <option key={vuln.id} value={vuln.id}>
                                      {vuln.name} (Severity: {vuln.severity})
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  onClick={() => handleLinkVulnerability(asset.id)}
                                  disabled={linkVulnerabilityLoading[asset.id] || !selectedVulnerabilityId[asset.id]}
                                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm"
                                >
                                  {linkVulnerabilityLoading[asset.id] ? 'Linking...' : 'Link'}
                                </Button>
                              </div>
                            )}
                            {linkVulnerabilityError[asset.id] && (
                              <p className="text-xs text-red-500 mt-1">{linkVulnerabilityError[asset.id]}</p>
                            )}
                          </div>

                          {/* Section for Simulate Scan */}
                          <div className="mt-6 pt-4 border-t border-gray-300">
                            <h5 className="text-md font-semibold text-gray-700 mb-3">Asset Actions</h5>
                            <Button
                              onClick={() => handleSimulateScan(asset.id)}
                              disabled={scanLoading[asset.id]}
                              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm"
                            >
                              {scanLoading[asset.id] ? 'Scanning...' : 'Simulate Scan'}
                            </Button>
                            {scanLoading[asset.id] && <p className="text-xs text-gray-500 mt-1">Scan in progress...</p>}
                            {scanError[asset.id] && (
                              <p className="text-xs text-red-500 mt-1">Scan Error: {scanError[asset.id]}</p>
                            )}
                            {scanSuccessMessage[asset.id] && (
                              <p className="text-xs text-green-600 mt-1">{scanSuccessMessage[asset.id]}</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AssetsPage;
