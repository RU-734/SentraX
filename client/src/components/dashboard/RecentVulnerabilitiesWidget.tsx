import React from 'react';
import { Link } from 'wouter';

// Matching the interface from DashboardPage.tsx
interface RecentVulnerabilityInstance {
  joinId: number; // ID from the assets_vulnerabilities join table
  vulnerabilityName: string;
  vulnerabilitySeverity: string;
  assetName: string;
  assetIpAddress: string; // Available if needed, not explicitly requested for display here
  lastSeenOrUpdatedAt: string;
  // assetId is not directly in this flat structure from backend,
  // but assetName implies an asset. Link will go to general /assets for now.
}

interface RecentVulnerabilitiesWidgetProps {
  vulnerabilities: RecentVulnerabilityInstance[];
  isLoading: boolean;
  error: string | null;
}

const severityColorMap: { [key: string]: string } = {
  critical: 'text-red-600',
  high: 'text-orange-500',
  medium: 'text-yellow-600',
  low: 'text-blue-500',
  informational: 'text-gray-500',
};

const RecentVulnerabilitiesWidget: React.FC<RecentVulnerabilitiesWidgetProps> = ({
  vulnerabilities,
  isLoading,
  error,
}) => {
  return (
    <div className="bg-white shadow-lg rounded-xl p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Recently Active Vulnerabilities</h3>
      {isLoading && <p className="text-gray-500">Loading recent vulnerabilities...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {!isLoading && !error && (
        vulnerabilities.length === 0 ? (
          <p className="text-gray-500">No recently active open vulnerabilities found.</p>
        ) : (
          <ul className="space-y-3">
            {vulnerabilities.map(vuln => (
              <li key={vuln.joinId} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                  <div className="mb-2 sm:mb-0">
                    <p className="text-sm font-medium text-gray-900">{vuln.vulnerabilityName}</p>
                    <p className={`text-xs font-semibold ${severityColorMap[vuln.vulnerabilitySeverity?.toLowerCase()] || 'text-gray-600'}`}>
                      Severity: {vuln.vulnerabilitySeverity || 'N/A'}
                    </p>
                  </div>
                  <div className="text-sm text-gray-600 sm:text-right">
                    <p>
                      On Asset: <Link href="/assets" className="text-indigo-600 hover:text-indigo-800">{vuln.assetName}</Link>
                    </p>
                    <p className="text-xs text-gray-500">
                      Last Active: {new Date(vuln.lastSeenOrUpdatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
};

export default RecentVulnerabilitiesWidget;
