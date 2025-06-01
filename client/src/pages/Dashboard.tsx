import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/dashboard/StatCard';
import RecentAssetsWidget from '../../components/dashboard/RecentAssetsWidget';
import RecentVulnerabilitiesWidget from '../../components/dashboard/RecentVulnerabilitiesWidget'; // Import RecentVulnerabilitiesWidget

// Define Data Structures (assuming these are already here from previous step)
interface StatisticsData {
  totalAssets: number;
  totalVulnerabilities: number;
  totalOpenVulnerabilityInstances: number;
  openVulnerabilitiesBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
  };
}

interface RecentAsset {
  id: number;
  name: string;
  type: string;
  ipAddress: string;
  createdAt: string;
}

interface RecentVulnerabilityInstance {
  joinId: number;
  vulnerabilityName: string;
  vulnerabilitySeverity: string;
  assetName: string;
  assetIpAddress: string;
  lastSeenOrUpdatedAt: string;
}

const DashboardPage: React.FC = () => {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();

  // 2. State Management
  const [statsData, setStatsData] = useState<StatisticsData | null>(null);
  const [recentAssets, setRecentAssets] = useState<RecentAsset[]>([]);
  const [recentVulns, setRecentVulns] = useState<RecentVulnerabilityInstance[]>([]);

  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(true);
  const [isRecentAssetsLoading, setIsRecentAssetsLoading] = useState<boolean>(true);
  const [isRecentVulnsLoading, setIsRecentVulnsLoading] = useState<boolean>(true);

  const [statsError, setStatsError] = useState<string | null>(null);
  const [recentAssetsError, setRecentAssetsError] = useState<string | null>(null);
  const [recentVulnsError, setRecentVulnsError] = useState<string | null>(null);

  // 3. Data Fetching
  useEffect(() => {
    if (!isAuthenticated || authIsLoading) {
      if (!authIsLoading && !isAuthenticated) {
        // Clear data or show message if unauthenticated after auth check
        setIsStatsLoading(false);
        setIsRecentAssetsLoading(false);
        setIsRecentVulnsLoading(false);
      }
      return;
    }

    const fetchData = async (
      url: string,
      setData: React.Dispatch<React.SetStateAction<any>>,
      setLoading: React.Dispatch<React.SetStateAction<boolean>>,
      setError: React.Dispatch<React.SetStateAction<string | null>>
    ) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error fetching ${url}`);
        }
        const data = await response.json();
        setData(data);
      } catch (err: any) {
        setError(err.message || `An unexpected error occurred fetching ${url}`);
        setData(url.includes('statistics') ? null : []); // Reset to appropriate empty state
      } finally {
        setLoading(false);
      }
    };

    fetchData('/api/dashboard/statistics', setStatsData, setIsStatsLoading, setStatsError);
    fetchData('/api/dashboard/recent-assets', setRecentAssets, setIsRecentAssetsLoading, setRecentAssetsError);
    fetchData('/api/dashboard/recent-vulnerabilities', setRecentVulns, setIsRecentVulnsLoading, setRecentVulnsError);

  }, [isAuthenticated, authIsLoading]);

  // 4. Initial Display (Placeholders)
  if (authIsLoading) {
    return <div className="p-6 text-center">Loading authentication status...</div>;
  }

  if (!isAuthenticated) {
    // This should ideally be handled by ProtectedRoute redirecting to login
    return <div className="p-6 text-center">Please log in to view the dashboard.</div>;
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>

      {/* Statistics Section */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-700 mb-3">Statistics</h2>
        {isStatsLoading ? (
          <p>Loading statistics...</p>
        ) : statsError ? (
          <p className="text-red-500">Error loading statistics: {statsError}</p>
        ) : statsData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard title="Total Assets" value={statsData.totalAssets} />
            <StatCard title="Total Unique Vulnerabilities" value={statsData.totalVulnerabilities} />
            <StatCard title="Open Vulnerability Instances" value={statsData.totalOpenVulnerabilityInstances} />
          </div>
        ) : (
          <p>No statistics data available.</p>
        )}
      </section>

      {/* Open Vulnerabilities by Severity Section */}
      {!isStatsLoading && !statsError && statsData && (
        <section>
          <h2 className="text-2xl font-semibold text-gray-700 mb-3">Open Vulnerabilities by Severity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {(['critical', 'high', 'medium', 'low', 'informational'] as const).map((severity) => (
              <StatCard
                key={severity}
                title={severity.charAt(0).toUpperCase() + severity.slice(1)}
                value={statsData.openVulnerabilitiesBySeverity[severity] !== undefined ? statsData.openVulnerabilitiesBySeverity[severity] : 'N/A'}
                // Optional: Add specific styling or icons based on severity
                valueClassName={`text-2xl font-bold ${
                  severity === 'critical' ? 'text-red-600' :
                  severity === 'high' ? 'text-orange-500' :
                  severity === 'medium' ? 'text-yellow-500' :
                  severity === 'low' ? 'text-blue-500' :
                  'text-gray-700' // informational
                }`}
                titleClassName="text-sm font-medium text-gray-600"
                className="text-center" // Center text within these smaller cards
              />
            ))}
          </div>
        </section>
      )}

      {/* Container for Recent Assets and Recent Vulnerabilities Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section> {/* Recent Assets Section */}
          <RecentAssetsWidget
            assets={recentAssets}
            isLoading={isRecentAssetsLoading}
            error={recentAssetsError}
          />
        </section>

        <section> {/* Recent Vulnerabilities Section */}
          <RecentVulnerabilitiesWidget
            vulnerabilities={recentVulns}
            isLoading={isRecentVulnsLoading}
            error={recentVulnsError}
          />
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
