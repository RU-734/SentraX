import React, { useState, useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import { useAuth } from '../../contexts/AuthContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';

// Define types locally for now. These could be moved to a shared types file.
interface Asset {
  id: number;
  name: string;
  type: string; // Consider using the assetTypeEnum values here if available client-side
  ipAddress: string;
  macAddress?: string | null;
  operatingSystem?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LinkedVulnerability {
  joinId: number;
  assetId: number;
  status: string; // Consider using vulnerabilityStatusEnum values
  details?: string | null;
  remediationNotes?: string | null;
  lastSeenAt: string;
  updatedAt: string; // from the join table
  vulnerability: {
    id: number;
    name: string;
    description: string;
    severity: string; // Consider using vulnerabilitySeverityEnum values
    cvssScore?: string | null;
    references?: string[] | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

const AssetDetailsPage: React.FC = () => {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [match, params] = useRoute<{ assetId?: string }>("/assets/edit/:assetId"); // Also matches /assets/view/:assetId or similar if we change route
  // For a dedicated details page, the route might be /assets/:assetId.
  // Let's assume for now the route is /assets/details/:assetId or /assets/:assetId (view)
  // Adjusting to a more generic param capture for details page:
  const [detailsMatch, detailsParams] = useRoute<{ assetId?: string }>("/assets/:assetId");
  const assetId = detailsParams?.assetId;


  const [asset, setAsset] = useState<Asset | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<LinkedVulnerability[]>([]);

  const [isLoadingAsset, setIsLoadingAsset] = useState<boolean>(true);
  const [isLoadingVulnerabilities, setIsLoadingVulnerabilities] = useState<boolean>(true);

  const [errorAsset, setErrorAsset] = useState<string | null>(null);
  const [errorVulnerabilities, setErrorVulnerabilities] = useState<string | null>(null);

  // State for actions on this page
  const [unlinkLoading, setUnlinkLoading] = useState<{ [key: number]: boolean }>({}); // Keyed by joinId
  const [unlinkError, setUnlinkError] = useState<{ [key: number]: string | null }>({}); // Keyed by joinId
  const [scanLoading, setScanLoading] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);

  const severityColorMap: { [key: string]: string } = {
    critical: 'text-red-600 font-semibold',
    high: 'text-orange-500 font-semibold',
    medium: 'text-yellow-600',
    low: 'text-blue-500',
    informational: 'text-gray-500',
  };

  // Make fetchLinkedVulnerabilities callable for refresh after actions
  const fetchLinkedVulnerabilities = React.useCallback(async () => {
    if (!assetId) return;
    setIsLoadingVulnerabilities(true);
    setErrorVulnerabilities(null);
    setScanSuccessMessage(null); // Clear scan message on refresh
    setScanError(null);
    try {
      const response = await fetch(`/api/assets/${assetId}/vulnerabilities`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error fetching linked vulnerabilities (status ${response.status})`);
      }
      const data: LinkedVulnerability[] = await response.json();
      setVulnerabilities(data);
    } catch (err: any) {
      setErrorVulnerabilities(err.message || 'An unexpected error occurred fetching linked vulnerabilities.');
      setVulnerabilities([]); // Clear vulnerabilities on error
    } finally {
      setIsLoadingVulnerabilities(false);
    }
  }, [assetId]);


  useEffect(() => {
    if (!assetId || !isAuthenticated || authIsLoading) {
      if (!authIsLoading && !isAuthenticated) {
        setErrorAsset("User not authenticated.");
        // No need to set vulnerabilities error here as fetch won't happen
        setIsLoadingAsset(false);
        setIsLoadingVulnerabilities(false); // Ensure this is also false
      }
      return;
    }

    const fetchAssetDetails = async () => {
      setIsLoadingAsset(true);
      setErrorAsset(null);
      try {
        const response = await fetch(`/api/assets/${assetId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error fetching asset details (status ${response.status})`);
        }
        const data: Asset = await response.json();
        setAsset(data);
      } catch (err: any) {
        setErrorAsset(err.message || 'An unexpected error occurred fetching asset details.');
      } finally {
        setIsLoadingAsset(false);
      }
    };

    fetchAssetDetails();
    fetchLinkedVulnerabilities();

  }, [assetId, isAuthenticated, authIsLoading, fetchLinkedVulnerabilities]);


  const handleUnlink = async (joinId: number) => {
    if (!assetId) return;
    setUnlinkLoading(prev => ({ ...prev, [joinId]: true }));
    setUnlinkError(prev => ({ ...prev, [joinId]: null }));
    try {
      const response = await fetch(`/api/assets/${assetId}/vulnerabilities/${joinId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to unlink vulnerability.');
      }
      fetchLinkedVulnerabilities(); // Refresh the list
    } catch (err: any) {
      setUnlinkError(prev => ({ ...prev, [joinId]: err.message || 'An unexpected error occurred.' }));
    } finally {
      setUnlinkLoading(prev => ({ ...prev, [joinId]: false }));
    }
  };

  const handleSimulateScan = async () => {
    if (!assetId) return;
    setScanLoading(true);
    setScanError(null);
    setScanSuccessMessage(null);
    try {
      const response = await fetch(`/api/assets/${assetId}/scan`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to simulate scan.');
      }
      setScanSuccessMessage(`${data.message} Processed: ${data.vulnerabilitiesProcessed}, New: ${data.newlyLinked}, Updated: ${data.updatedLinks}`);
      fetchLinkedVulnerabilities(); // Refresh the list
    } catch (err: any) {
      setScanError(err.message || 'An unexpected error occurred during scan.');
    } finally {
      setScanLoading(false);
    }
  };

  if (authIsLoading || (isLoadingAsset && asset === null)) {
    return <div className="p-6 text-center">Loading asset details...</div>;
  }

  if (errorAsset) {
    return (
      <div className="p-6 text-center text-red-500">
        <p>Error loading asset: {errorAsset}</p>
        <Link href="/assets" className="mt-4 inline-block text-indigo-600 hover:underline">
          &larr; Back to Assets
        </Link>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="p-6 text-center">
        <p>Asset not found.</p>
        <Link href="/assets" className="mt-4 inline-block text-indigo-600 hover:underline">
          &larr; Back to Assets
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Link href="/assets" className="text-indigo-600 hover:text-indigo-800 transition duration-150 ease-in-out">
          &larr; Back to Assets List
        </Link>
        {asset && (
          <Link href={`/assets/edit/${asset.id}`}>
            <Button variant="outline" size="sm">Edit Asset</Button>
          </Link>
        )}
      </div>

      <h1 className="text-3xl font-bold text-gray-800 mb-2">{asset.name}</h1>
      <p className="text-sm text-gray-500 mb-6">Details for Asset ID: {asset.id}</p>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>General Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            <div><strong className="font-medium text-gray-600">Type:</strong> {asset.type}</div>
            <div><strong className="font-medium text-gray-600">IP Address:</strong> {asset.ipAddress}</div>
            <div><strong className="font-medium text-gray-600">MAC Address:</strong> {asset.macAddress || 'N/A'}</div>
            <div><strong className="font-medium text-gray-600">Operating System:</strong> {asset.operatingSystem || 'N/A'}</div>
          </div>
          {asset.description && ( // Only show description if it exists
            <div className="pt-2">
              <strong className="font-medium text-gray-600">Description:</strong>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{asset.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Timestamps</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
          <div><strong className="font-medium text-gray-600">Created At:</strong> {new Date(asset.createdAt).toLocaleString()}</div>
          <div><strong className="font-medium text-gray-600">Last Updated At:</strong> {new Date(asset.updatedAt).toLocaleString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Linked Vulnerabilities</CardTitle>
            {/* Optional: <CardDescription>Manage linked vulnerabilities for this asset.</CardDescription> */}
          </div>
          <Button onClick={handleSimulateScan} disabled={scanLoading} size="sm">
            {scanLoading ? 'Scanning...' : 'Simulate Scan'}
          </Button>
        </CardHeader>
        <CardContent>
          {scanSuccessMessage && <p className="text-sm text-green-600 mb-3">{scanSuccessMessage}</p>}
          {scanError && <p className="text-sm text-red-500 mb-3">Scan Error: {scanError}</p>}

          {isLoadingVulnerabilities ? (
            <p className="text-sm text-muted-foreground">Loading vulnerabilities...</p>
          ) : errorVulnerabilities ? (
            <p className="text-sm text-red-500">Error: {errorVulnerabilities}</p>
          ) : vulnerabilities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vulnerabilities linked to this asset.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status (Read-Only)</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="max-w-[200px]">Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vulnerabilities.map((link) => (
                  <TableRow key={link.joinId}>
                    <TableCell className="font-medium">{link.vulnerability?.name || 'N/A'}</TableCell>
                    <TableCell className={severityColorMap[link.vulnerability?.severity?.toLowerCase() || ''] || 'text-gray-600'}>
                      {link.vulnerability?.severity || 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{link.status}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(link.lastSeenAt).toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate hover:whitespace-normal" title={link.details || undefined}>
                      {link.details || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleUnlink(link.joinId)}
                        disabled={unlinkLoading[link.joinId]}
                      >
                        {unlinkLoading[link.joinId] ? 'Unlinking...' : 'Unlink'}
                      </Button>
                      {unlinkError[link.joinId] && (
                        <p className="text-xs text-red-500 mt-1">{unlinkError[link.joinId]}</p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {/* Placeholder for "Link Existing Vulnerability" - deferred as Select component is not available */}
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-md font-semibold text-gray-700 mb-2">Link Existing Vulnerability</h4>
            <p className="text-sm text-muted-foreground">
              (Functionality to select and link new vulnerabilities will be available once the Select component is added.)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssetDetailsPage;
